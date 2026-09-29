import { API_CONFIG } from "../config";
import { useOnlineStore } from "@/stores/onlineStore";

// Memory cache for GET requests
const apiCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 3000; // 3sec cache — prevents redundant hits on rapid navigation/refresh

/**
 * MULTI-TENANCY: Get the active hospital ID for the current request.
 *
 * Priority order:
 * 1. URL path first segment (e.g. /abc123.../doctor' abc123...)
 * 2. localStorage 'activeHospitalId'
 * 3. null (SuperAdmin global access or unauthenticated)
 */
export const isValidHospitalId = (segment: string): boolean => {
  if (!segment) return false;

  // 1. Strictly validate MongoDB ObjectId (24 hex characters)
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;

  // 2. Reserved system segments that are NOT hospital IDs
  const reserved = [
    // Auth & system
    "auth",
    "api",
    "dashboard",
    "login",
    "admin",
    "super-admin",
    // Portal roles
    "pharmacy",
    "pharma",
    "pharma-owner",
    "lab",
    "nurse",
    "hr",
    "emergency",
    "discharge",
    "helpdesk",
    "doctor",
    "staff",
    "masterhelpdesk",
    // Public landing pages — must NOT be treated as hospital slugs
    "about",
    "blogs",
    "features",
    "pricing",
    "solutions",
    "portals",
    "support",
    "coming-soon",
    "ambulance",
    "patient",
  ];
  if (reserved.includes(segment.toLowerCase())) return false;

  // 3. Hospital slug fallback: alphanumeric with hyphens, at least 3 chars
  // We keep this but make it more secondary to reserved words
  return /^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment);
};

/**
 * Robust cookie parser with multi-tab consistency.
 * Efficiently matches the named cookie using regex and handles URI encoding.
 */
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2].trim()) : null;
};

export const getActiveRoleFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const roles = ["admin", "super-admin", "hospital-admin", "pharmacy", "pharma", "pharma-owner", "lab", "nurse", "hr", "emergency", "discharge", "helpdesk", "doctor", "staff", "ambulance", "patient"];
  for (const part of pathParts) {
    if (roles.includes(part.toLowerCase())) {
      return part.toLowerCase();
    }
  }
  return null;
};

export const getActiveHospitalId = (): string | null => {
  if (typeof window === "undefined") return null;

  // 1. Check URL path — first segment is the hospitalId in tenant routes
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length > 0 && isValidHospitalId(pathParts[0])) {
    return pathParts[0];
  }

  // 2. Fallback to localStorage (set by useTenantContext hook / initializeAuth)
  const stored = localStorage.getItem("activeHospitalId");
  if (stored && isValidHospitalId(stored)) {
    return stored;
  }

  // 3. MULTI-TAB FIX: Fallback to cookie if we are perfectly in a new tab situation.
  const cookieHospId = getCookie("hospitalId");
  if (cookieHospId && isValidHospitalId(cookieHospId)) {
    return cookieHospId;
  }

  return null;
};

const existingRequests = new Map<string, Promise<any>>();
let _isLicenseLocked = false;
export const setLicenseLockedStatus = (locked: boolean) => {
    _isLicenseLocked = locked;
};
// 🚀 SECURITY: Access Token is ONLY in memory
let cachedToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: { resolve: (token: string, csrfToken?: string) => void; reject: (err: any) => void }[] = [];

// ✅ CROSS-TAB SYNC: Listen for refresh success from other tabs globally
if (typeof window !== "undefined") {
  try {
    const authChannel = new BroadcastChannel('msc_auth');
    authChannel.onmessage = (event) => {
      if (event.data?.type === 'REFRESH_SUCCESS') {
        const { accessToken, csrfToken } = event.data;
        console.log("[apiClient] 📡 Broadcast received: Token updated by another tab.");
        
        // Update local state
        cachedToken = accessToken;
        isRefreshing = false;
        
        // Resolve all local subscribers waiting for a refresh
        onTokenRefreshed(accessToken, csrfToken);
      } else if (event.data?.type === 'REFRESH_FAILURE') {
        console.error("[apiClient] 🚨 Broadcast received: Refresh failed in another tab.");
        isRefreshing = false;
        cachedToken = null;
        onTokenRefreshFailed(new Error("Session expired in another tab."));
      }
    };
  } catch (e) {
    console.warn("[apiClient] BroadcastChannel not supported or failed:", e);
  }
}

// Unified getCookie implementation above is now hoisted and used globally in this file.

// Export clear cache utility (useful for logout or manual refresh)
export const clearApiCache = () => {
  apiCache.clear();
  existingRequests.clear();
};

export const invalidateCachePattern = (pattern: string) => {
  if (typeof pattern !== "string") return;
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

const subscribeTokenRefresh = (resolve: (token: string, csrfToken?: string) => void, reject: (err: any) => void) => {
  refreshSubscribers.push({ resolve, reject });
};

const onTokenRefreshed = (token: string, csrfToken?: string) => {
  cachedToken = token; // Update cached token on refresh
  refreshSubscribers.forEach((sub) => sub.resolve(token, csrfToken));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = (error: any) => {
  refreshSubscribers.forEach((sub) => sub.reject(error));
  refreshSubscribers = [];
};

/**
 * Update the in-memory access token (used after login or manual refresh)
 */
export const setAccessToken = (token: string | null) => {
  cachedToken = token;
};

export const getAccessToken = (): string | null => cachedToken;

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipCache?: boolean; suppressErrorLog?: boolean },
): Promise<T> {
  const isClient = typeof window !== "undefined";

  // 🚫 LICENSE LOCK: Block non-essential calls if portal is locked
  if (isClient && _isLicenseLocked) {
    const pathLower = path.toLowerCase();
    const isVerificationCall = 
        pathLower.includes("/auth/me") || 
        pathLower.includes("/auth/refresh") ||
        pathLower.includes("/license") ||
        pathLower.includes("/me") ||              // doctor, helpdesk, masterhelpdesk, pharma
        pathLower.includes("/dashboard") ||       // hospital-admin
        pathLower.includes("/dashboard-stats") || // lab/pharmacy
        pathLower.includes("/settings") ||        // lab/pharmacy
        pathLower.includes("/pending") ||         // lab/discharge
        pathLower.includes("/today-status") ||    // staff
        pathLower.includes("/stats");             // hr
    
    if (!isVerificationCall) {
        console.warn(`[apiClient] 🛑 Request blocked (License Expired): ${path}`);
        // Return a promise that rejects with a specific error
        return Promise.reject({ 
            status: 403, 
            message: "LICENSE_EXPIRED",
            error: { locked: true, message: "Your license has expired. Please renew to continue." }
        }) as any;
    }
  }

  // 🚀 SECURITY: No more localStorage reliance for tokens
  let token = cachedToken;

  // MULTI-TENANCY: Identify the hospital & role context for cookie retrieval
  const activeHospitalId = getActiveHospitalId();

  // If memory token is missing, try cookie (global keys only) as a final fallback (Client-side sync)
  if (!token && isClient) {
    const activeRole = getActiveRoleFromUrl();
    
    // Priority: 
    // 1. Suffixed cookie for tenant isolation (Hospital)
    // 2. Suffixed cookie for role isolation (e.g. SuperAdmin)
    // 3. Global cookie
    if (activeHospitalId) {
       token = getCookie(`accessToken_${activeHospitalId}`);
    }
    
    if (!token && activeRole) {
       // Support both exact role and common aliases
       token = getCookie(`accessToken_${activeRole}`);
       if (!token && activeRole === 'admin') token = getCookie(`accessToken_super-admin`);
       if (!token && activeRole === 'super-admin') token = getCookie(`accessToken_admin`);
    }

    if (!token) {
       token = getCookie("accessToken");
    }
  }

  // Construct headers more robustly
  const headers = new Headers();
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Merge existing headers if any
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(options.headers).forEach(([key, value]) =>
        headers.set(key, value),
      );
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ ENFORCE SESSION ISOLATION (Tab-isolated)
  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;
  if (sessionId) {
    headers.set("X-Session-Id", sessionId);
  }

  /**
   * Resolve CSRF token with multi-tenant context (suffixed cookies support)
   */
  const getCsrfToken = () => {
    let csrf = getCookie("csrf_token");
    if (csrf) return csrf;
    
    // Sub-segment fallback for tenant portals
    const activeRole = getActiveRoleFromUrl();
    if (activeHospitalId) {
      csrf = getCookie(`csrf_token_${activeHospitalId}`);
    }
    
    if (!csrf && activeRole) {
      // 🔄 NORMALIZE ROLE: Try both underscore and hyphen suffixes
      const underscored = activeRole.replace(/-/g, "_");
      const hyphenated = activeRole.replace(/_/g, "-");

      csrf = getCookie(`csrf_token_${underscored}`) 
          || getCookie(`csrf_token_${hyphenated}`);
          
      // SuperAdmin and HospitalAdmin aliases
      if (!csrf) {
        if (underscored === 'admin' || underscored === 'super_admin') {
          csrf = getCookie('csrf_token_admin') 
              || getCookie('csrf_token_super_admin')
              || getCookie('csrf_token_super-admin');
        } else if (underscored === 'hospital_admin') {
          csrf = getCookie('csrf_token_hospital-admin');
        }
      }
    }

    // 4. LAST RESORT: Search for ANY available CSRF token cookie
    if (!csrf && typeof document !== "undefined") {
      const match = document.cookie.match(/csrf_token[a-zA-Z0-9_-]*=([^;]*)/);
      if (match) {
        csrf = decodeURIComponent(match[1].trim());
        console.warn(`[apiClient] 🛡️ Using fallback CSRF token found in cookie`);
      }
    }

    return csrf;
  };

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  // ✅ MULTI-TENANCY: Inject X-Hospital-Id header for backend tenant isolation
  if (activeHospitalId) {
    headers.set("X-Hospital-Id", activeHospitalId);
  }

  const url = `${API_CONFIG.BASE_URL}${path}`;
  const method = options?.method || "GET";
  const cacheKey = `${method}:${url}`;

  // Global event listener for logout
  if (isClient && !(window as any).hasAuthLogoutListener) {
    window.addEventListener("auth-logout", clearApiCache);
    (window as any).hasAuthLogoutListener = true;
  }

  // 1. Check Memory Cache for GET requests
  if (method === "GET" && !options?.skipCache && isClient) {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  // 2. Deduplication: If a GET request is already in flight, return the existing promise
  if (method === "GET" && existingRequests.has(cacheKey)) {
    return existingRequests.get(cacheKey) as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // ✅ CRITICAL: Send HttpOnly cookies for Auth
        cache: "no-store",
      }).catch((fetchError) => {
        if (isClient && fetchError.message === "Failed to fetch") {
          useOnlineStore.getState().setOnline(false);
        }

        const networkError = new Error(
          fetchError.message === "Failed to fetch"
            ? `Cannot connect to server. Please ensure the backend is running at ${API_CONFIG.BASE_URL}`
            : `Network error: ${fetchError.message}`,
        );
        (networkError as any).isNetworkError = true;
        throw networkError;
      });

      // Handle 401 Unauthorized
      const pathLower = path.toLowerCase();
      const isLoginRequest =
        pathLower.includes("/login") ||
        pathLower.includes("/sign-in") ||
        pathLower.includes("/signin") ||
        pathLower.includes("/verify-otp") ||
        pathLower.includes("/resend-otp");
      const isRefreshRequest = pathLower.includes("/refresh");

      // Also check if we are physically on a login page to be doubly safe
      const currentPath = isClient
        ? window.location.pathname.toLowerCase()
        : "";
      const isOnLoginPage =
        currentPath.includes("login") ||
        currentPath.includes("sign-in") ||
        currentPath.includes("signin") ||
        currentPath.includes("verify-otp") ||
        currentPath.includes("resend-otp");

      // ✅ PUBLIC PAGE GUARD
      const _pathParts = currentPath.split("/").filter(Boolean);
      const _firstSeg = _pathParts[0] || "";
      const isOnPublicPage =
        currentPath === "/" ||
        currentPath === "" ||
        [
          "auth", "about", "blogs", "features", "pricing", "solutions",
          "portals", "terms", "contact", "support", "coming-soon",
        ].includes(_firstSeg);

      if (res.status === 401) {
        if (isOnPublicPage && method === "GET") return null as any;

        if (isClient && !isLoginRequest && !isRefreshRequest && !isOnLoginPage) {
          // ✅ FIX 1: Register the subscriber BEFORE the isRefreshing check.
          // Previously subscribeTokenRefresh was called inside the Promise constructor
          // AFTER the isRefreshing block — if the refresh completed synchronously,
          // onTokenRefreshed() fired before the subscriber was registered, so the
          // retry callback was never invoked and the original 401 propagated to the user.
          const retryPromise = new Promise<T>((resolve, reject) => {
            // ✅ Listen for cross-tab REFRESH_SUCCESS broadcasts first
            const mscAuth = new BroadcastChannel('msc_auth');
            const timeout = setTimeout(() => {
              mscAuth.close();
            }, 10000);

            mscAuth.onmessage = (event) => {
              if (event.data?.type === 'REFRESH_SUCCESS') {
                clearTimeout(timeout);
                mscAuth.close();
                
                // ✅ UPDATE GLOBAL CACHE SO SUBSEQUENT CALLS DON'T RE-REFRESH
                const newToken = event.data.accessToken;
                const newCsrfToken = event.data.csrfToken;
                cachedToken = newToken;
                isRefreshing = false;

                const latestCsrf = getCsrfToken() || newCsrfToken;
                const retryHeaders = new Headers(headers);
                retryHeaders.set("Authorization", `Bearer ${newToken}`);
                if (latestCsrf) retryHeaders.set("X-CSRF-Token", latestCsrf);

                fetch(url, { ...options, headers: retryHeaders, credentials: "include" })
                  .then(async (resp) => {
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
                      throw new Error(err.message || `HTTP ${resp.status}`);
                    }
                    return resp.json();
                  })
                  .then(resolve)
                  .catch(reject);
              } else if (event.data?.type === 'REFRESH_FAILURE') {
                clearTimeout(timeout);
                mscAuth.close();
                reject(new Error("Session expired in another tab."));
              }
            };

            // Subscribe to this tab's own refresh cycle
            subscribeTokenRefresh((newToken, newCsrfToken) => {
              clearTimeout(timeout);
              mscAuth.close();
              const latestCsrf = getCsrfToken() || newCsrfToken;
              const retryHeaders = new Headers(headers);
              retryHeaders.set("Authorization", `Bearer ${newToken}`);
              if (latestCsrf) retryHeaders.set("X-CSRF-Token", latestCsrf);

              fetch(url, { ...options, headers: retryHeaders, credentials: "include" })
                .then(async (resp) => {
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
                    throw new Error(err.message || `HTTP ${resp.status}`);
                  }
                  return resp.json();
                })
                .then(resolve)
                .catch(reject);
            }, (err) => {
              clearTimeout(timeout);
              mscAuth.close();
              reject(err);
            });
          });

          // ✅ TAB-ISOLATED REFRESH LOCK: Only one refresh per tab at a time
          if (!isRefreshing) {
            isRefreshing = true;
            (async () => {
              try {
                // ✅ Use getCsrfToken to correctly handle role-based suffixes like super-admin
                const csrfTk = getCsrfToken();
                const refreshHeaders: HeadersInit = { "Content-Type": "application/json" };
                if (csrfTk) (refreshHeaders as any)["X-CSRF-Token"] = csrfTk;
                if (sessionId) (refreshHeaders as any)["X-Session-Id"] = sessionId;
                if (activeHospitalId) (refreshHeaders as any)["X-Hospital-Id"] = activeHospitalId;

                console.warn(`[apiClient] 🔄 Starting session refresh for path: ${path}`);

                const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                  method: "POST",
                  headers: refreshHeaders,
                  credentials: "include"
                });

                if (refreshRes.ok) {
                  const data = await refreshRes.json();
                  const newToken = data.accessToken;
                  const newCsrfToken = data.csrfToken;
                  cachedToken = newToken;

                  console.log(`[apiClient] ✅ Refresh successful.`);

                  try {
                    const { syncSessionAction } = await import("@/lib/integrations/actions/auth.actions");
                    await syncSessionAction(
                      newToken,
                      "",
                      newCsrfToken || "",
                      data.accessTokenExpiresIn,
                      data.refreshTokenExpiresIn,
                      getActiveRoleFromUrl() || undefined
                    );
                  } catch (syncErr) {
                    console.warn("[apiClient] syncSessionAction soft-error:", syncErr);
                  }

                  try {
                    const channel = new BroadcastChannel('msc_auth');
                    channel.postMessage({ type: 'REFRESH_SUCCESS', accessToken: newToken, csrfToken: newCsrfToken });
                    channel.close();
                  } catch {}

                  try {
                    const { updateSocketToken } = await import("@/lib/integrations/api/socket");
                    updateSocketToken(newToken).catch(() => {});
                  } catch {}

                  onTokenRefreshed(newToken, newCsrfToken);
                } else if (refreshRes.status === 409) {
                  // ✅ CONCURRENT REFRESH: Another tab/process is already rotating this session.
                  // We do NOT logout. We wait for the 'REFRESH_SUCCESS' broadcast from the winner.
                  console.warn(`[apiClient] ⏳ Concurrent refresh (409) from server. Waiting for winning tab...`);
                  
                  // Poll for cachedToken update (which happens via BroadcastChannel listener above)
                  // or wait for the full 5s timeout.
                  for (let i = 0; i < 25; i++) { // 25 * 200ms = 5 seconds
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (cachedToken) {
                      console.log("[apiClient] ✅ Concurrent wait resolved early via broadcast.");
                      break;
                    }
                  }
                  
                  // If after 5s we are still 'isRefreshing', it means no broadcast was received.
                  if (!cachedToken) {
                    console.error("[apiClient] 🚨 Concurrent refresh wait timed out.");
                    throw new Error("Session rotation wait timed out.");
                  }
                } else {
                  const errText = await refreshRes.text();
                  console.error(`[apiClient] ❌ Refresh failed ${refreshRes.status}:`, errText);
                  throw new Error("Refresh failed");
                }
              } catch (error: any) {
                // If the error was just a timeout from a 409, we might not want to logout
                // if the retryPromise eventually resolves. But for real failures, we logout.
                console.error("[apiClient] 🚨 Refresh cycle failure:", error.message);
                cachedToken = null;
                window.dispatchEvent(new Event("auth-logout"));

                // 📡 BROADCAST FAILURE: Force all tabs to logout
                try {
                  const channel = new BroadcastChannel('msc_auth');
                  channel.postMessage({ type: 'REFRESH_FAILURE' });
                  channel.close();
                } catch {}

                const sessionError = new Error("Your session has expired. Please login again.");
                (sessionError as any).isSessionExpired = true;

                onTokenRefreshFailed(sessionError);

                const currentPath = window.location.pathname.toLowerCase();
                const pathParts = currentPath.split("/").filter(Boolean);
                const firstSegment = pathParts[0] || "";

                const isLoginPage = currentPath.includes("/login") || currentPath.includes("sign-in") || currentPath.includes("signin");
                const isLandingPage = currentPath === "/" || currentPath === "" || [
                  "about", "blogs", "features", "pricing", "solutions", "portals", "terms", "contact", "support"
                ].includes(firstSegment);

                if (!isLoginPage && !isLandingPage) {
                  const secondSegment = pathParts[1] || "";
                  const portalSegment = pathParts.length >= 2 ? secondSegment : firstSegment;

                  // ROLE-SPECIFIC LOGIN TARGETS
                  const roleLoginMap: Record<string, string> = {
                    doctor: "/auth/login",
                    lab: "/lab/login",
                    nurse: "/nurse/login",
                    pharmacy: "/pharmacy/login",
                    pharma: "/pharmacy/login",
                    hr: "/hr/login",
                    emergency: "/emergency/login",
                    ambulance: "/emergency/login",
                    discharge: "/auth/login",
                  };

                  const target = roleLoginMap[portalSegment.toLowerCase()] || "/auth/login";
                  console.warn(`[apiClient] 🔐 Redirecting to ${target} due to session failure.`);

                  // Clear tab-specific session state
                  sessionStorage.removeItem("sessionId");

                  window.location.href = target;
                }
              } finally {
                isRefreshing = false;
              }
            })();
          } else {
            // Safety timeout: if it's still refreshing after 10s, something went wrong, force reset
            setTimeout(() => {
              if (isRefreshing) {
                console.warn("[apiClient] 🚨 Safety timeout triggered, resetting isRefreshing state");
                isRefreshing = false;
              }
            }, 10000);
          }

          return retryPromise;
        }
      }

      if (!res.ok) {
        // ✅ CLONE BEFORE CONSUMING: res.json() or res.text() can only be called once.
        // We clone here so status-specific logic (like 403 or 401 retry) can use the body, 
        // and we can still log it or throw a generic error if those don't handle it.
        const resClone = res.clone();

        if (res.status === 403) {
          const errorData = await res.json().catch(() => ({}));
          const securityCodes = [
            "FINGERPRINT_MISMATCH",
            "REAUTH_REQUIRED",
            "TOKEN_REUSE_DETECTED",
            "SESSION_REVOKED",
            "CSRF_ERROR"
          ];
          
          if (errorData.code && securityCodes.includes(errorData.code)) {
            console.error(`[apiClient] 🔐 Security violation: ${errorData.code}. Triggering logout.`);
            if (isClient) {
              cachedToken = null;
              window.dispatchEvent(new Event("auth-logout"));
              
              const currentPath = window.location.pathname.toLowerCase();
              if (!currentPath.includes("/login")) {
                window.location.href = "/auth/login?reason=" + errorData.code;
              }
            }
            const error = new Error(errorData.message || "Security session violation");
            (error as any).status = 403;
            (error as any).code = errorData.code;
            (error as any).isSessionExpired = true;
            throw error;
          }
        }

        // ✅ LOGGING: Use the clone to safely inspect the body without affecting the original 'res'
        // (if 'res' was already consumed by 403 logic, this would fail if we didn't clone at the top)
        const rawRes = await resClone.text();
        
        // ✅ SUPPRESS NOISY AUTH/LICENSE LOGS: 401 on /me or 403 License Lock is handled by layout
        const isAuthStatusCheck = res.status === 401 && (path.includes("/auth/me") || path.includes("/auth/refresh"));
        const isLicenseLock = res.status === 403 && rawRes.includes('"locked":true');
        
        if (!isAuthStatusCheck && !isLicenseLock && !options?.suppressErrorLog) {
          console.error(`[API ERROR] ${path}: status=${res.status}, body=${rawRes.slice(0, 500)}`);
        }

        if (isAuthStatusCheck) return null as any;

        // Try to parse error message from the logged body text
        let finalMessage = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(rawRes);
          finalMessage = parsed.message || parsed.error || finalMessage;
        } catch {
          if (rawRes && rawRes.length < 100) finalMessage = rawRes;
        }

        const error = new Error(finalMessage);
        (error as any).status = res.status;
        try {
          const parsed = JSON.parse(rawRes);
          (error as any).error = parsed; // Standard for our UI catch blocks
          (error as any).data = parsed;  // Fallback
        } catch {}
        throw error;
      }

      const hasBody = res.status !== 204 && res.status !== 205 && res.headers.get("content-type")?.includes("application/json");
      const data = hasBody ? await res.json() : null;

      if (method !== "GET" && isClient) clearApiCache();
      if (method === "GET" && !options?.skipCache && isClient) {
        apiCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  })();

  if (method === "GET") {
    existingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => existingRequests.delete(cacheKey));
  }

  return requestPromise;
}