import { create } from "zustand";
import { authService, type RegisterRequest, setAccessToken, getAccessToken } from "@/lib/integrations";

// ✅ FIX #5: Module-level logout dedup guard.
// Multiple callers (BroadcastChannel, auth-logout event, user click) can all
// trigger logout simultaneously. The first call expires the CSRF cookie;
// subsequent ones have no cookie → CSRF rejected (403). This flag ensures
// only ONE logout runs at a time — others silently skip the network call.
let _isLoggingOut = false;

// ── Proactive Refresh Scheduler ───────────────────────────────────────────────
// Schedules a silent token refresh 60 seconds before the access token expires,
// preventing users from ever hitting a 401 during normal in-session usage.
let _proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleProactiveRefresh = (accessToken: string) => {
  if (typeof window === "undefined") return;
  if (_proactiveRefreshTimer) {
    clearTimeout(_proactiveRefreshTimer);
    _proactiveRefreshTimer = null;
  }
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return;
    const expiresInMs = payload.exp * 1000 - Date.now();
    const refreshInMs = Math.max(expiresInMs - 60_000, 5000); // 60s before expiry, min 5s
    console.log(`[Auth] ⏰ Proactive refresh scheduled in ${Math.round(refreshInMs / 1000)}s`);
    _proactiveRefreshTimer = setTimeout(async () => {
      try {
        // ✅ FIX #2: Use raw fetch directly — apiClient already prefixes /api/
        // so calling apiClient("/api/auth/refresh") = BASE_URL+/api/auth/refresh = /api/api/auth/refresh (404)
        // The correct path is BASE_URL+/auth/refresh → /api/auth/refresh ✓
        const { API_CONFIG } = await import("@/lib/integrations/config");
        const sessionId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : null;
        const activeHospitalId = typeof localStorage !== "undefined" ? localStorage.getItem("activeHospitalId") : null;
        const getCsrfCookie = (name: string) => {
          if (typeof document === "undefined") return null;
          const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
          return match ? decodeURIComponent(match[2].trim()) : null;
        };
        let csrfToken = getCsrfCookie("csrf_token") || (activeHospitalId ? getCsrfCookie(`csrf_token_${activeHospitalId}`) : null);
        const activeRole = typeof localStorage !== "undefined" ? localStorage.getItem("userRole") : null;
        if (!csrfToken && activeRole) {
          csrfToken = getCsrfCookie(`csrf_token_${activeRole}`);
          if (!csrfToken && activeRole === 'admin') csrfToken = getCsrfCookie(`csrf_token_super-admin`);
          if (!csrfToken && activeRole === 'super-admin') csrfToken = getCsrfCookie(`csrf_token_admin`);
        }
        const refreshHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (csrfToken) refreshHeaders["X-CSRF-Token"] = csrfToken;
        if (sessionId) refreshHeaders["X-Session-Id"] = sessionId;
        if (activeHospitalId) refreshHeaders["X-Hospital-Id"] = activeHospitalId;

        const res = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: refreshHeaders,
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.accessToken) {
            setAccessToken(data.accessToken);
            scheduleProactiveRefresh(data.accessToken); // Schedule the next rotation
            console.log("[Auth] ✅ Proactive refresh succeeded");

            // ✅ FIX: Sync new tokens to Next.js server so RSC navigations don't fail and log users out!
            try {
              const { syncSessionAction } = await import("@/lib/integrations/actions/auth.actions");
              await syncSessionAction(
                data.accessToken,
                "", // HttpOnly refresh token
                data.csrfToken || "",
                data.accessTokenExpiresIn,
                data.refreshTokenExpiresIn,
                activeRole || undefined
              );
            } catch (err) {
              console.warn("[Auth] Proactive syncSessionAction soft-error:", err);
            }

            // ✅ Update socket with fresh token
            try {
              const { updateSocketToken } = await import("@/lib/integrations/api/socket");
              updateSocketToken(data.accessToken).catch(() => {});
            } catch {}
          }
        } else {
          console.warn("[Auth] Proactive refresh response not ok:", res.status);
        }
      } catch (e) {
        console.warn("[Auth] Proactive refresh failed — interceptor will handle 401:", e);
      }
    }, refreshInMs);
  } catch (e) {
    console.warn("[Auth] Proactive refresh scheduling error:", e);
  }
};


interface User {
  id: string;
  name: string;
  role: string;
  hospitalId?: string;
  email?: string;
  mobile?: string;
  image?: string;
  avatar?: string;
  profilePic?: string;
  bio?: string;
  shopName?: string;
  gstin?: string;  licenseNo?: string;
  address?: string;
  hospital?: string;
  department?: string;
  employeeId?: string;
  vehicleNumber?: string;
  qualificationDetails?: {
    qualifications: string[];
  };
  documents?: {
    degreeCertificate?: { url: string; publicId: string };
    registrationCertificate?: { url: string; publicId: string };
  };
  pharmacyTerms?: string[];
  geofence?: {
    location?: { lat: number; lng: number };
    settings?: {
      enabled: boolean;
      radiusMeters: number;
      excludedPortals: string[];
      restrictedPortals: string[];
    };
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (identifier: string, password: string) => Promise<any>;
  register: (data: any) => Promise<void>;
  logout: (broadcast?: boolean) => void;
  initializeAuth: (force?: boolean) => Promise<void>;
  checkAuth: (force?: boolean) => Promise<void>; // Alias for initializeAuth
  initEvents: () => void;
  setUser: (user: User | null) => void;
  isTabAuthorized: boolean;
  authorizeTab: () => void;
  verifyHospitalId: (hospitalId: string) => Promise<{ valid: boolean; hospitalName?: string }>;
  licenseError: { message: string; locked: boolean } | null;
  isLicenseChecking: boolean;
  setLicenseError: (error: { message: string; locked: boolean } | null) => void;
  setIsLicenseChecking: (loading: boolean) => void;
  verifySuperAdminOtp: (otp: string, tempToken: string) => Promise<void>;
  resendSuperAdminOtp: (tempToken: string) => Promise<void>;
}

// ✅ PERFORMANCE FIX: Stable user reference to prevent cascade re-renders
let cachedUser: User | null = null;

const deepEqual = (obj1: any, obj2: any) => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  try {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  } catch (e) {
    return false;
  }
};

const stabilizeUser = (newUser: User | null): User | null => {
  if (deepEqual(cachedUser, newUser)) {
    return cachedUser; // Return same reference if data is identical
  }
  cachedUser = newUser;
  return newUser;
};

// ─── Module-scoped Cookie Helpers ────────────────────────────────────────────
const _secureFlag = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

const setCookie = (name: string, value: string, maxAge = 604800) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${_secureFlag()}`;
};

const expireCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT${_secureFlag()}`;
};

// ─── PII Scrubber ─────────────────────────────────────────────────────────────
// Strip sensitive fields before writing user to localStorage.
// Keeps only what the UI needs — never writes certs, GSTIN, etc. to JS storage.
const scrubUserForStorage = (user: any): any => {
  if (!user) return user;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { documents, qualificationDetails, password, refreshTokens, ...safe } = user;
  // Keep gstin, licenseNo, and image — they're business identifiers needed for invoice rendering
  if (safe.image?.startsWith?.('data:'))      safe.image      = undefined;
  if (safe.avatar?.startsWith?.('data:'))     safe.avatar     = undefined;
  if (safe.profilePic?.startsWith?.('data:')) safe.profilePic = undefined;
  return safe;
};

// ✅ STORAGE SAFETY: Prevent QuotaExceededErrors from crashing the app
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e: any) {
      if (
        e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED"
      ) {
        console.warn(
          "[Auth] ⚠️ LocalStorage quota exceeded. Clearing old profiles...",
        );
        try {
          // Emergency cleanup: remove all profile_ keys to make space
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("profile_")) localStorage.removeItem(k);
          });
          // Try one more time
          localStorage.setItem(key, value);
        } catch (e2) {
          console.error("[Auth] ❌ Failed to save after cleanup:", e2);
        }
      }
    }
  },
  getItem: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isTabAuthorized: true,

  authorizeTab: () => {
    set({ isTabAuthorized: true });
  },
  
  licenseError: null,
  isLicenseChecking: true,
  setLicenseError: (error) => {
    set({ licenseError: error });
    // Sync with apiClient to block outgoing requests
    import("@/lib/integrations/api/apiClient").then(m => m.setLicenseLockedStatus(!!error?.locked));
  },
  setIsLicenseChecking: (loading) => set({ isLicenseChecking: loading }),

  verifyHospitalId: async (hospitalId: string) => {
    try {
      // Import apiClient lazily to avoid circular deps
      const { apiClient } = await import("@/lib/integrations");
      const data = await apiClient<{ valid: boolean; hospitalName?: string }>(
        `/auth/verify-hospital/${hospitalId}`,
        { method: 'GET' }
      );
      return data;
    } catch (err: any) {
      // 404 = hospital not found
      if (err?.status === 404 || err?.message?.includes('404')) {
        return { valid: false };
      }
      // Network error - let caller decide
      throw err;
    }
  },

  checkAuth: async (force?: boolean) => {
    return get().initializeAuth(force);
  },

  initEvents: () => {
    if (typeof window !== "undefined") {
      // Signal from current tab's API client (e.g. 401 Unauthorized)
      window.addEventListener("auth-logout", () => {
        get().logout(false); // false = don't re-broadcast (already triggered by API)
      });

      // 📡 CROSS-TAB SYNC: Listen for broadcasts from other tabs
      try {
        const channel = new BroadcastChannel('msc_auth');
        channel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            console.log('[Auth] 📡 Cross-tab logout received — clearing this tab session');
            get().logout(false);
          } else if (event.data?.type === 'LOGIN') {
            console.log('[Auth] 📡 Cross-tab login received — syncing session');
            get().initializeAuth(true);
          }
        };
        // Note: channel is intentionally kept open for lifetime of tab
      } catch (_) { /* BroadcastChannel not available in all envs (e.g. Safari <15.4) */ }
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log("[Auth] 🔑 Attempting Secure Login:", identifier);

      // ✅ CLEANUP: Clear any stale session data before logging in as a new user
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("activeHospitalId");
      localStorage.removeItem("lastAuthCheck");
      sessionStorage.removeItem("sessionId");
      sessionStorage.removeItem("tabAuthorized");
      localStorage.removeItem("userRole"); 
      setAccessToken(null);

      let response: any;
      try {
        response = await authService.loginClient({ identifier, password });
      } catch (error: any) {
        const isAuthError = error?.status === 401 || error?.status === 404 || error?.message?.toLowerCase().includes("wrong") || error?.message?.toLowerCase().includes("invalid") || error?.message?.toLowerCase().includes("not found");
        
        // Try emergency auth fallback if normal auth fails due to invalid credentials
        // since ambulance personnel might be logging in from the main auth portal.
        if (isAuthError) {
            try {
                const { emergencyService } = await import("@/lib/integrations/services/emergency.service");
                response = await emergencyService.login(identifier, password) as any;
                // Normalize response format for authStore compat
                response.accessToken = response.accessToken || response.tokens?.accessToken;
                response.refreshToken = response.refreshToken || response.tokens?.refreshToken;
                if (response.user) {
                    response.user.role = 'ambulance';
                }
            } catch (fallbackError) {
                throw error; // Throw the original error if fallback also fails
            }
        } else {
            throw error;
        }
      }
      
      // ✅ 2FA Flow: If backend requires OTP, return early so the UI can redirect.
      if (response?.require2FA) {
        set({ isLoading: false });
        return response;
      }

      const {
        // ✅ FIX (Bug 5): Support both top-level (new) and nested tokens.{} (legacy fallback)
        accessToken:    _at,
        csrfToken:      _csrf,
        sessionId:      _sid,
        user,
        tokens,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
      } = response as any;
      const accessToken = _at || tokens?.accessToken;
      const csrfToken   = _csrf || tokens?.csrfToken;
      const sessionId   = _sid || tokens?.sessionId;
      if (!user) throw new Error("Authentication failed: No user data returned.");

      // Resolution of hospital context
      const isPatientRole = (user as any).role?.toLowerCase() === 'patient';
      const _rawHospId = !isPatientRole ? ((user as any).hospital || (user as any).hospitalId) : null;
      const userHospitalId: string | null = (_rawHospId && typeof _rawHospId === 'object')
        ? (_rawHospId._id || _rawHospId.id || _rawHospId.toString())
        : (_rawHospId ?? null);
      
      if (sessionId) console.log("[Auth] 💾 Session ID established:", sessionId);

      if (accessToken) {
        setAccessToken(accessToken);
        // Cookies are now handled exclusively by the backend as HttpOnly (deterministic)
        // ✅ FIX 3C: Schedule proactive refresh so user never hits a 401 mid-session
        scheduleProactiveRefresh(accessToken);

        // ✅ FIX #4: Reset socket with fresh token so join_room succeeds immediately
        try {
          const { resetSocket } = await import("@/lib/integrations/api/socket");
          resetSocket(accessToken);
        } catch {}
      }
      
      const userId = (user as any)._id || user.id;
      if (!userId) throw new Error("Authentication failed: Invalid MongoDB User ID.");
      
      // ✅ MongoDB ObjectId validation (24 hex chars)
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(userId);
      if (!isMongoId) {
        console.warn("[Auth] ⚠️ User ID is not a standard MongoDB ObjectId format:", userId);
      }

      // Map _id to id if necessary
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      // Store non-sensitive session cache (tab-isolated via localStorage, PII-scrubbed)
      localStorage.setItem("user", JSON.stringify(scrubUserForStorage(user)));
      localStorage.setItem("lastAuthCheck", Date.now().toString());
      if (sessionId) {
        sessionStorage.setItem("sessionId", sessionId);
      }

      if (!isPatientRole) {
        if (userHospitalId) {
          console.log("[Auth] 🏥 Setting Hospital Context:", userHospitalId);
          localStorage.setItem("activeHospitalId", userHospitalId);
          setCookie("hospitalId", userHospitalId);
        } else {
          expireCookie("hospitalId");
          localStorage.removeItem("activeHospitalId");
        }
      } else {
        console.log("[Auth] 👤 Patient login — skipping hospital context (global user, no hospital binding)");
        localStorage.removeItem("activeHospitalId");
        expireCookie("hospitalId");
      }

      // ✅ SECURITY: CSRF token (Double Submit Cookie pattern) is set by backend.
      // We no longer write redundant cookies from frontend.
      if (user.role) {
        localStorage.setItem("userRole", user.role.toLowerCase());
      }

      // PERSISTENT USER PROFILE (No sensitive data)
      const lastUserId = user.id || (user as any)._id;
      if (lastUserId) {
        const uidStr = lastUserId.toString();
        // ✅ SECURITY: Scrub PII before writing to localStorage (persists across sessions)
        safeLocalStorage.setItem(`profile_${uidStr}`, JSON.stringify(scrubUserForStorage(user)));
        
        const userRole = user.role ? user.role.toLowerCase() : "";
        if (userHospitalId && userRole) {
          safeLocalStorage.setItem(`profile_role_${userHospitalId}_${userRole}`, uidStr);
        }
        
        safeLocalStorage.setItem("lastUserId", uidStr);
      }

      try {
        const channel = new BroadcastChannel('msc_auth');
        channel.postMessage({ type: 'LOGIN' });
        channel.close();
      } catch {}

      set({
        user: stabilizeUser(user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        isTabAuthorized: true,
      });

      return response;
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  verifySuperAdminOtp: async (otp: string, tempToken: string) => {
    set({ isLoading: true });
    try {
      const { apiClient } = await import("@/lib/integrations");
      const response = await apiClient<any>("/auth/superadmin/verify-otp", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ otp, tempToken }),
      });

      const { user, accessToken, csrfToken, sessionId } = response;

      if (accessToken) {
        setAccessToken(accessToken);
        scheduleProactiveRefresh(accessToken);
      }

      if (sessionId) {
        sessionStorage.setItem("sessionId", sessionId);
      }

      localStorage.setItem("user", JSON.stringify(scrubUserForStorage(user)));
      localStorage.setItem("userRole", user.role.toLowerCase());
      localStorage.setItem("lastAuthCheck", Date.now().toString());

      set({
        user: stabilizeUser(user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        isTabAuthorized: true,
      });

      try {
        const channel = new BroadcastChannel('msc_auth');
        channel.postMessage({ type: 'LOGIN' });
        channel.close();
      } catch {}
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resendSuperAdminOtp: async (tempToken: string) => {
    try {
      const { apiClient } = await import("@/lib/integrations");
      await apiClient("/auth/superadmin/resend-otp", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ tempToken }),
      });
    } catch (error) {
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true });
    try {
      await authService.registerClient(data);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async (broadcast = true) => {
    // ✅ FIX #5: Dedup guard — only one logout at a time.
    // Concurrent callers (event listeners, BroadcastChannel, UI button) can all
    // fire at once. The first expires the CSRF cookie; later ones have no cookie → 403.
    if (_isLoggingOut) {
      console.log("[Auth] Logout already in progress, skipping duplicate call.");
      return;
    }
    _isLoggingOut = true;

    // 📡 CROSS-TAB BROADCAST: Notify other tabs to logout before we clear local state
    if (broadcast && typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('msc_auth');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      } catch (_) { /* BroadcastChannel not available in all envs */ }
    }

    // 1. Inform backend to clear HttpOnly refreshToken and CSRF
    // MUST HAPPEN FIRST before we delete the local cookies!
    try {
      await authService.logoutClient();
    } catch (e) {
      console.warn("Logout API failed, continuing local cleanup", e);
    } finally {
      // Always release the guard so the user can log in again
      _isLoggingOut = false;
    }

    const activeId = localStorage.getItem("activeHospitalId");
    const activeRole = localStorage.getItem("userRole");

    // 2. Clear local storage/session
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("activeHospitalId");
    localStorage.removeItem("lastAuthCheck");
    sessionStorage.removeItem("sessionId");
    localStorage.removeItem("userRole");
    sessionStorage.removeItem("tabAuthorized");

    // Clear user profiles and lastUserId while preserving theme & terms
    const lastUserId = localStorage.getItem("lastUserId");
    if (lastUserId) {
      localStorage.removeItem(`profile_${lastUserId}`);
    }
    // Remove role specific profile markers
    if (activeId && activeRole) {
       localStorage.removeItem(`profile_role_${activeId}_${activeRole}`);
    }
    localStorage.removeItem("lastUserId");

    // Catch any loose profile instances
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("profile_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Could not iterate localStorage for profile cleanup", e);
    }

    // 3. Clear all session-specific cookies (Global + Multi-tenant suffixed versions)
    if (typeof document !== 'undefined') {
      const allCookies = document.cookie.split(';');
      const sessionKeys = ['accessToken', 'refreshToken', 'csrf_token', 'hospitalId', 'userRole', 'sessionId'];
      
      allCookies.forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (sessionKeys.some(key => name === key || name.startsWith(`${key}_`))) {
          expireCookie(name);
        }
      });
    }
    
    // Explicitly remove legacy/deprecated cookies
    expireCookie("userRole");
    // sessionId is now tab-isolated via sessionStorage
    expireCookie("hospitalId");

    // 4. Clear in-memory access token
    setAccessToken(null);

    // 5. Clear tab authorization
    localStorage.removeItem("tabAuthorized");

    set({ 
      user: null, 
      isAuthenticated: false, 
      isTabAuthorized: false,
      licenseError: null,
      isLicenseChecking: false
    });
    // Ensure lock is released in apiClient
    import("@/lib/integrations/api/apiClient").then(m => m.setLicenseLockedStatus(false));
  },

  initializeAuth: async (force = false) => {
    console.log("[AUTH INIT] starting auth bootstrap");
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    let activeHospId = typeof window !== 'undefined' ? localStorage.getItem("activeHospitalId") : null;
    let fallbackRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
    if (typeof window !== 'undefined') {
      try {
        const { getActiveHospitalId, getActiveRoleFromUrl } = await import('@/lib/integrations/api/apiClient');
        if (!activeHospId) activeHospId = getActiveHospitalId();
        if (!fallbackRole) fallbackRole = getActiveRoleFromUrl();
      } catch {}
    }

    // ✅ SUFFIX-AWARE BOOTSTRAP: Try suffixed cookie first if context exists
    let sessionToken = null;
    if (typeof window !== 'undefined') {
        const hospId = localStorage.getItem("activeHospitalId");
        const role = localStorage.getItem("userRole");

        if (hospId) {
            sessionToken = getCookie(`accessToken_${hospId}`);
        }
        
        if (!sessionToken && role) {
            sessionToken = getCookie(`accessToken_${role}`);
            if (!sessionToken && role === 'admin') sessionToken = getCookie(`accessToken_super-admin`);
        }

        if (!sessionToken) {
            sessionToken = getCookie("accessToken");
        }
    }

    // ✅ SYNC TOKEN: Always update memory cache from storage on bootstrap, even if throttled
    if (sessionToken && typeof window !== 'undefined') {
      const { setAccessToken } = await import('@/lib/integrations');
      setAccessToken(sessionToken);
    }

    console.log("[Auth] 🔎 Current Storage Status:", {
        hasToken: !!sessionToken,
        hasUser: !!localStorage.getItem("user"),
        hasRole: !!localStorage.getItem("userRole"),
        tabAuthorized: !!localStorage.getItem("tabAuthorized")
    });

    // ✅ MULTI-TAB FIX: 1 Browser = 1 User Session, all tabs automatically inherit auth

    let sessionUser = localStorage.getItem("user");

    // Try to restore user from session cache first for immediate UI
    if (sessionUser && !get().user) {
      try {
        const user = JSON.parse(sessionUser);
        console.log("[Auth] 📂 Restored user from session cache:", user.role);
        set({ user: stabilizeUser(user), isAuthenticated: true });
      } catch {}
    }

    // ✅ SPEED FIX: Throttle network calls unless forced
    const lastCheck = localStorage.getItem("lastAuthCheck");
    if (
      !force &&
      lastCheck &&
      get().user &&
      Date.now() - parseInt(lastCheck) < 30000 // 30s throttle
    ) {
      console.log("[Auth] 🏎️ Skipping auth check - throttled");
      set({ isAuthenticated: true, isLoading: false, isInitialized: true });
      return;
    }

    if (!get().user) set({ isLoading: true });

    try {
      // ✅ TAB ISOLATION: Prioritize role from local session storage OR restored user object
      // This prevents a global 'ambulance' cookie from hijacking standard hospital admin tabs
      const localRole = localStorage.getItem("userRole");
      const restoredUserRole = get().user?.role?.toLowerCase();

      const userRole = localRole || restoredUserRole;
      
      console.log(`[AUTH INIT] calling /me (role context: ${userRole || 'none'})`);
      if (userRole === "ambulance") console.log("[Auth] 🚑 AMBULANCE BOOTSTRAP TRIGGERED");
      
      let data: any;
      if (userRole === "ambulance") {
        // Special bootstrap for ambulance personnel
        const { emergencyService } = await import("@/lib/integrations/services/emergency.service");
        data = await emergencyService.getCurrentUser();
        console.log("[Auth] 🚑 Emergency /me data received:", !!data);
      } else {
        // Standard user bootstrap
        console.log("[Auth] 🏢 Standard /me data request");
        const { authService } = await import("@/lib/integrations/services/auth.service");
        data = await authService.getMeClient(
          force ? { skipCache: true } : undefined,
        );
      }

      if (data) {
        console.log("[AUTH INIT] session restored");

        // Handle bootstrap payload (contains new tokens) or direct user object
        const user = data.user || data;
        const accessToken = data.accessToken || data.tokens?.accessToken;
        const refreshToken = data.refreshToken || data.tokens?.refreshToken;
        const sessionId = data.sessionId;

        if (accessToken) {
          // ✅ SECURITY: Token lives in memory only. Cookie already set by login() for middleware.
          // refreshToken is HttpOnly (backend-set) — never store in localStorage.
          setAccessToken(accessToken);
        }

        if (sessionId) {
          console.log("[AUTH INIT] session ID restored:", sessionId);
          sessionStorage.setItem("sessionId", sessionId);
        }

        // Standardize ID
        if ((user as any)._id && !user.id) {
          user.id = (user as any)._id;
        }

        // Persist session cache (PII-scrubbed)
        localStorage.setItem("lastAuthCheck", Date.now().toString());
        localStorage.setItem("user", JSON.stringify(scrubUserForStorage(user)));

        // Restore hospital context
        // 🚨 PATIENT EXCEPTION: Patients are global users — never bind them to a hospitalId.
        const isPatient = (user as any).role?.toLowerCase() === 'patient';
        if (!isPatient) {
          const rawId = (user as any).hospital || (user as any).hospitalId;
          const userHospitalId = (rawId && typeof rawId === 'object') ? (rawId._id || rawId.id) : rawId;
          
          if (userHospitalId && typeof document !== "undefined") {
            const hId = userHospitalId.toString();
            localStorage.setItem("activeHospitalId", hId);
            setCookie("hospitalId", hId);
          } else {
            localStorage.removeItem("activeHospitalId");
            expireCookie("hospitalId");
          }
        } else {
          // Clear any stale hospital context for patients
          localStorage.removeItem("activeHospitalId");
          expireCookie("hospitalId");
        }

        // ✅ FIX 3C: Schedule proactive refresh after session is restored
        if (accessToken) {
          scheduleProactiveRefresh(accessToken);
        }

        set({
          user: stabilizeUser(user),
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        console.log("[AUTH INIT] no valid session");
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error: any) {
      const uRole = localStorage.getItem("userRole");

      // ✅ PUBLIC PAGE GUARD: On landing pages with no session, auth bootstrap
      // failing is completely expected (visitor). Don't log it as an error.
      const _cp = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const _fp = _cp.split('/').filter(Boolean)[0] || '';
      const _isPublicPage = _cp === '/' || _cp === '' || [
        'about', 'blogs', 'features', 'pricing', 'solutions',
        'portals', 'terms', 'contact', 'support', 'coming-soon',
      ].includes(_fp);

      if (_isPublicPage) {
        console.log("[AUTH INIT] No session on public page (expected for visitors)");
      } else {
        console.error("[AUTH INIT] Auth bootstrap failure:", {
          message: error.message,
          status: error.status,
          role: uRole
        });
      }

      const isNetworkError = error?.isNetworkError || error?.message?.includes("Failed to fetch");
      const isAuthError = error?.status === 401 || error?.status === 403;

      if (isNetworkError && sessionUser) {
        console.log("[AUTH INIT] Network fallback - staying logged in with cached data");
        set({ isAuthenticated: true, isLoading: false, isInitialized: true });
        return;
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      
      if (isAuthError) {
        console.log("[AUTH INIT] Clearing session data due to auth error");
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("activeHospitalId");
        localStorage.removeItem("userRole");
        sessionStorage.removeItem("tabAuthorized");
        sessionStorage.removeItem("sessionId");

        // ✅ FIX 3A: Also clear the in-memory token.
        // Without this, the expired token stayed in cachedToken — the next API call
        // used it, got 401, the interceptor tried to refresh, but the session was
        // already cleared, so refresh failed too → logout loop.
        setAccessToken(null);

        // Clear global cookies (with Secure flag) via helper
        expireCookie("userRole");
        // sessionId is now tab-isolated via sessionStorage
      }
    }
  },
  setUser: (user: User | null) => {
    if (user) {
      // ✅ ID CONSISTENCY
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      try {
        // ✅ SECURITY: Use scrubUserForStorage to strip PII (gstin, licenseNo,
        // employeeId, documents, certs) and base64 image blobs before writing.
        const storageUser = scrubUserForStorage(user);

        localStorage.setItem("user", JSON.stringify(storageUser));
        if (user.id) {
          safeLocalStorage.setItem(`profile_${user.id}`, JSON.stringify(storageUser));
          safeLocalStorage.setItem("lastUserId", user.id);
        }
      } catch (e) {
        console.warn("[AuthStore] QuotaExceededError - Skipping persistent storage for huge user object", e);
      }
    } else {
      localStorage.removeItem("user");
    }
    set({ user: stabilizeUser(user), isAuthenticated: !!user });
  },
}));
