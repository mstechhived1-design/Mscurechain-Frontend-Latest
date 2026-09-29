import { NextRequest, NextResponse } from "next/server";

/**
 * MULTI-TENANT MIDDLEWARE
 *
 * Handles two scenarios:
 * 1. Legacy portal paths (/doctor, /hospital-admin, etc.) → redirect to /{hospitalId}/doctor
 * 2. Tenant-prefixed paths (/{hospitalId}/doctor) → validate and pass through
 *
 * SuperAdmin paths (/admin) are NOT tenant-prefixed — they have global access.
 */

// Portal paths that require tenant context
const PORTAL_PATHS = [
  "/doctor",
  "/hospital-admin",
  "/helpdesk",
  "/lab",
  "/pharmacy",
  "/nurse",
  "/staff",
  "/hr",
  "/emergency",
  "/ambulance",
  "/radiology",
];

// Paths that are completely public / don't need tenant context
const PUBLIC_PATHS = [
  "/auth",
  "/about",
  "/blogs",
  "/features",
  "/pricing",
  "/solutions",
  "/coming-soon",
  "/portals",
  "/support",
  "/emergency-login",
  "/nurse/login",
  "/pharmacy/login",
  "/lab/login",
  "/hr/login",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/delete-account",
  "/radiology/login",
  "/display",
];

const ROUTE_MAP: Record<string, string> = {
  staff: "/staff",
  doctor: "/doctor",
  "hospital-admin": "/hospital-admin",
  lab: "/lab/dashboard",
  pharma: "/pharmacy/dashboard",
  "pharma-owner": "/pharmacy/dashboard",
  pharmacist: "/pharmacy/dashboard",
  "super-admin": "/admin",
  admin: "/admin",
  helpdesk: "/helpdesk",
  nurse: "/nurse",
  frontdesk: "/frontdesk",
  hr: "/hr",
  emergency: "/ambulance",
  ambulance: "/ambulance",
  discharge: "/discharge",
  radiology: "/radiology",
};

/**
 * Robust JWT payload decoding for Edge Runtime
 */
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let payload = parts[1];
    // Replace URL-safe characters
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if missing
    const pad = payload.length % 4;
    if (pad) {
      if (pad === 1) return null;
      payload += new Array(5 - pad).join("=");
    }

    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

/**
 * Check if a JWT is expired or missing
 */
function isTokenExpired(token: string | undefined): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  // Buffer of 10 seconds to avoid edge-case expiry during request
  return Date.now() >= payload.exp * 1000 - 10000;
}

// Global cache to pool concurrent refreshes for the same session across all parallel middleware executions
const refreshPool = new Map<
  string,
  Promise<{
    accessToken: string;
    csrfToken: string;
    setCookies: string[] | string | null;
  } | null>
>();

/**
 * Perform a silent refresh call to the backend.
 * Uses a promise pool to ensure parallel requests for the same session don't trigger concurrent rotations.
 */
async function silentRefresh(
  refreshToken: string,
  hospitalId?: string,
  csrfToken?: string,
  sessionId?: string,
  role?: string,
) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003/api";
  const poolKey = sessionId || refreshToken.slice(-20); // Fallback to token suffix if sessionId missing

  // 1. Check if a refresh for this session is already in flight
  if (refreshPool.has(poolKey)) {
    console.log(
      `[Middleware] 🤝 Joining existing refresh pool for session: ${poolKey}`,
    );
    return refreshPool.get(poolKey);
  }

  // 2. Start a new refresh and add it to the pool
  const refreshPromise = (async () => {
    try {
      const rtRoleSuffix = (role || "").toLowerCase().replace("-", "_");
      const rtCookieName = rtRoleSuffix
        ? `refreshToken_${rtRoleSuffix}`
        : "refreshToken";

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Cookie: `${rtCookieName}=${refreshToken}${csrfToken ? `; csrf_token=${csrfToken}` : ""}`,
      };

      if (csrfToken) (headers as any)["X-CSRF-Token"] = csrfToken;
      if (hospitalId) (headers as any)["X-Hospital-Id"] = hospitalId;
      if (sessionId) (headers as any)["X-Session-Id"] = sessionId;

      const endpoint =
        role === "ambulance" ? "/emergency/auth/refresh" : "/auth/refresh";

      console.log(
        `[Middleware] 🚀 Triggering actual refresh call for ${poolKey} to ${endpoint}`,
      );
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        // MODERN API: getSetCookie() returns string[] natively.
        // FALLBACK: get('set-cookie') returns aggregated string (comma separated).
        const setCookieHeader = res.headers.get("set-cookie");
        const rawCookies = (res.headers as any).getSetCookie
          ? (res.headers as any).getSetCookie()
          : setCookieHeader
            ? [setCookieHeader]
            : [];

        return {
          accessToken: data.accessToken,
          csrfToken: data.csrfToken,
          setCookies: rawCookies,
        };
      } else if (res.status === 409) {
        // Backend retry logic
        console.log(
          `[Middleware] ⏳ Backend busy (409) — waiting and retrying once for ${poolKey}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const retryRes = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers,
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          const sch = retryRes.headers.get("set-cookie");
          const rawCookies = (retryRes.headers as any).getSetCookie
            ? (retryRes.headers as any).getSetCookie()
            : sch
              ? [sch]
              : [];
          return {
            accessToken: data.accessToken,
            csrfToken: data.csrfToken,
            setCookies: rawCookies,
          };
        }
      }
      return null;
    } catch (e) {
      console.error("[Middleware] ❌ Silent Refresh Critical Error:", e);
      return null;
    } finally {
      // Clean up the pool after a short delay to allow all concurrent microtasks to finish
      setTimeout(() => refreshPool.delete(poolKey), 5000);
    }
  })();

  refreshPool.set(poolKey, refreshPromise);
  return refreshPromise;
}

/**
 * Validate if a string looks like a MongoDB ObjectId (24 hex chars)
 * or a hospital slug (alphanumeric with hyphens, 3-60 chars)
 */
function isValidHospitalId(segment: string): boolean {
  if (!segment) return false;

  // EXCLUDE RESERVED ROOT PATHS
  const reserved = [
    "patient",
    "auth",
    "admin",
    "ambulance",
    "about",
    "blogs",
    "features",
    "pricing",
    "solutions",
    "coming-soon",
    "portals",
    "support",
    "api",
    "ambulance",
    "favicon",
    "doctor",
    "lab",
    "pharmacy",
    "staff",
    "nurse",
    "helpdesk",
    "hr",
    "hospital-admin",
    "super-admin",
    "global",
    "radiology",
    "display",
  ];
  if (reserved.includes(segment.toLowerCase())) return false;

  // MongoDB ObjectId: exactly 24 hex characters
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;
  // Hospital slug: alphanumeric with hyphens
  if (/^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment)) return true;
  return false;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. SANITIZE MALFORMED URLS (e.g. 'hospital admin' -> 'hospital-admin')
  if (pathname.includes("%20") || pathname.includes(" ")) {
    const cleanPath = pathname.replace(/%20| /g, "-");
    const redirectUrl = new URL(cleanPath, request.url);
    redirectUrl.search = request.nextUrl.search;
    console.log(
      `[Middleware] 🧹 Sanitizing malformed path: ${pathname} -> ${cleanPath}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // 0.5 SANITIZE "GLOBAL" PREFIX (TASK: FIX 404 LOOPS)
  if (pathname.startsWith("/global/")) {
    const cleanPath = pathname.replace(/^\/global/, "");
    const redirectUrl = new URL(cleanPath || "/", request.url);
    redirectUrl.search = request.nextUrl.search;
    console.log(
      `[Middleware] 🧹 Stripping global prefix: ${pathname} -> ${cleanPath}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // 0.7 REDIRECT SHORT LEGAL PATHS
  if (pathname === "/privacy") {
    return NextResponse.redirect(new URL("/privacy-policy", request.url));
  }
  if (pathname === "/terms") {
    return NextResponse.redirect(new URL("/terms-of-service", request.url));
  }

  // 1. SKIP STATIC FILES & API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // 1.5 IDENTIFY TENANT FROM PATH OR COOKIE
  const pathParts = pathname.split("/").filter(Boolean);
  const pathHospitalId =
    pathParts.length >= 1 && isValidHospitalId(pathParts[0])
      ? pathParts[0]
      : "";
  const cookieHospitalId = request.cookies.get("hospitalId")?.value || "";

  // Use path context first, fallback to cookie for discovery on global routes (like /ambulance)
  const effectiveId = pathHospitalId || cookieHospitalId;

  // 2. RESOLVE ACCESS TOKEN (Priority: Tenant-suffixed > Global)
  let accessToken = request.cookies.get("accessToken")?.value || "";
  if (pathHospitalId) {
    const tenantToken = request.cookies.get(
      `accessToken_${pathHospitalId}`,
    )?.value;
    if (tenantToken) accessToken = tenantToken;
  }

  // ✅ FIX (Bug 3): Resolve Refresh Token with role-suffix priority.
  // Backend sets refreshToken_hospital_admin, refreshToken_doctor, etc. NOT the plain refreshToken.
  // Without this, hasRefreshToken is always false → silent refresh never fires → session dies.
  let refreshToken = "";

  // Priority 1: suffixed by hospitalId (most specific)
  if (pathHospitalId) {
    refreshToken =
      request.cookies.get(`refreshToken_${pathHospitalId}`)?.value || "";
  }

  // Priority 2: suffixed by role (decode access token to get the role first)
  const _rtPayloadPre = accessToken ? decodeJwt(accessToken) : null;
  const _rtRolePre = _rtPayloadPre?.role?.toLowerCase() || "";
  if (!refreshToken && _rtRolePre) {
    const _rNorm = _rtRolePre.replace(/-/g, "_");
    const _rHyph = _rtRolePre.replace(/_/g, "-");
    refreshToken =
      request.cookies.get(`refreshToken_${_rNorm}`)?.value ||
      request.cookies.get(`refreshToken_${_rHyph}`)?.value ||
      "";
  }

  // Priority 3: plain global refreshToken (super-admin / ambulance / fallback)
  if (!refreshToken) {
    refreshToken = request.cookies.get("refreshToken")?.value || "";
  }

  // 2.6 METADATA RESOLUTION (Required for CSRF check below)
  const payloadBeforeRefresh =
    (accessToken ? decodeJwt(accessToken) : null) ||
    (refreshToken ? decodeJwt(refreshToken) : null);
  const userRoleInitial =
    payloadBeforeRefresh?.role?.toLowerCase() || _rtRolePre || "";

  // 2.5 PROACTIVE SILENT REFRESH Variables
  let isRefreshed = false;
  let newAccessToken = "";
  let refreshResponseCookies: string | string[] | null = null;
  let refreshData: any = null;

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // ✅ REFRESH TRIGGER: If token expired OR CSRF is missing (important for POST/PUT)
  const hasRefreshToken = !!refreshToken;
  const isCsrfMissing =
    !request.cookies.get("csrf_token")?.value &&
    !request.cookies.get(`csrf_token_${effectiveId}`)?.value &&
    !request.cookies.get(`csrf_token_${userRoleInitial.replace("-", "_")}`)
      ?.value &&
    !request.cookies.get(`csrf_token_${userRoleInitial.replace("_", "-")}`)
      ?.value;

  if (
    (isTokenExpired(accessToken) || (hasRefreshToken && isCsrfMissing)) &&
    hasRefreshToken &&
    !isPublicPage
  ) {
    // ✅ FIX: Extract sessionId from refreshToken so we can pass X-Session-Id
    // to the backend — enabling the Redis mutex to serialize this middleware
    // silentRefresh with any concurrent proactive refresh from the browser.
    const rtPayload = decodeJwt(refreshToken);
    const rtSessionId = rtPayload?.sessionId || "";
    const rtRole = rtPayload?.role?.toLowerCase() || userRoleInitial;

    // ✅ FIX: For super-admin (no hospitalId), also check csrf_token_super-admin.
    // The login/refresh flow generates BOTH csrf_token AND csrf_token_super-admin
    // for global roles; without this the CSRF header won't match the suffixed cookie.
    // ✅ Robust CSRF Resolution for Refresh
    let csrfForRefresh = request.cookies.get("csrf_token")?.value;
    if (!csrfForRefresh) {
      const r = rtRole.replace(/-/g, "_");
      const rh = rtRole.replace(/_/g, "-");
      csrfForRefresh =
        request.cookies.get(`csrf_token_${r}`)?.value ||
        request.cookies.get(`csrf_token_${rh}`)?.value ||
        request.cookies.get("csrf_token_super_admin")?.value ||
        request.cookies.get("csrf_token_admin")?.value ||
        request.cookies.get("csrf_token_super-admin")?.value;
    }

    console.log(
      `[Middleware] 🔄 Token expired/missing. Attempting silent refresh for ${pathname}...`,
    );
    refreshData = await silentRefresh(
      refreshToken,
      effectiveId || undefined,
      csrfForRefresh,
      rtSessionId,
      rtRole,
    );
    if (refreshData) {
      accessToken = refreshData.accessToken;
      newAccessToken = refreshData.accessToken;
      refreshResponseCookies = refreshData.setCookies;
      isRefreshed = true;
      console.log(`[Middleware] ✅ Silent refresh successful.`);
    }
  }

  let currentSessionId = "";

  if (accessToken) {
    const payload = decodeJwt(accessToken);
    currentSessionId = payload?.sessionId || "";
  } else if (refreshToken) {
    const payload = decodeJwt(refreshToken);
    currentSessionId = payload?.sessionId || "";
  }

  // Fallback metadata resolution (Prefer accessToken payload, fallback to refreshToken)
  const payload =
    (accessToken ? decodeJwt(accessToken) : null) ||
    (refreshToken ? decodeJwt(refreshToken) : null);
  const userRole = payload?.role?.toLowerCase() || "";
  const userHospitalIdRaw = payload?.hospitalId || payload?.hospital;
  const userHospitalId =
    userHospitalIdRaw === "global" ? null : userHospitalIdRaw;

  // ✅ DEBUG LOGGING
  if (
    pathname.includes("/admin") ||
    pathname.includes("/doctor") ||
    pathname.includes("/hospital-admin") ||
    pathname.includes("/auth")
  ) {
    console.log(
      `[Middleware] 📋 Path: ${pathname} | Token: ${!!accessToken}${isRefreshed ? " (REFRESHED)" : ""} | Session: ${currentSessionId} | Role: ${userRole} | Hosp: ${userHospitalId}`,
    );
  }

  // 3. ENFORCE PATIENT PORTAL RESTRICTIONS
  // Patients should ONLY be on /patient paths. Others should be redirected AWAY.
  if (pathname.startsWith("/patient")) {
    if (!accessToken && !currentSessionId) {
      console.log(
        `[Middleware] 🔐 Redirect to Login (Patient Path): No Token/Session`,
      );
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole && userRole !== "patient" && userRole !== "super-admin") {
      console.log(
        `[Middleware] Non-patient user (${userRole}) on patient path. Redirecting...`,
      );
      const targetPortal = ROUTE_MAP[userRole] || "/auth/login";
      return NextResponse.redirect(new URL(targetPortal, request.url));
    }
  }

  // 4. PUBLIC PATHS BYPASS
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 5. LEGACY PORTAL REDIRECTION
  const isLegacyPortalPath = PORTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isLegacyPortalPath) {
    if (userHospitalId && accessToken && userRole !== "patient") {
      const redirectUrl = new URL(`/${userHospitalId}${pathname}`, request.url);
      redirectUrl.search = request.nextUrl.search;
      console.log(
        `[Middleware] 🔄 Legacy Redirect: ${pathname} -> ${redirectUrl.pathname}`,
      );
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 6. TENANT-PREFIXED VALIDATION
  if (pathParts.length >= 1) {
    const firstSegment = pathParts[0];

    if (isValidHospitalId(firstSegment)) {
      // 🚨 PORTAL REDIRECT: If user visits /[hospitalId]/dashboard or /[hospitalId]/portals,
      // redirect them specifically to their role's portal.
      if (
        (pathParts.length === 2 &&
          (pathParts[1] === "dashboard" || pathParts[1] === "portals")) ||
        pathParts.length === 1
      ) {
        if (userRole && userRole !== "patient") {
          const portalBase = ROUTE_MAP[userRole] || "/hospital-admin";
          const target = portalBase.startsWith("/")
            ? portalBase
            : `/${portalBase}`;

          // If the target is already absolute (like /admin), don't prefix with hospitalId
          const isGlobalPortal = [
            "/admin",
            "/patient/dashboard",
            "/ambulance",
          ].includes(target);
          const finalRedirect = isGlobalPortal
            ? target
            : `/${firstSegment}${target}`;

          console.log(
            `[Middleware] 🧭 Routing user ${userRole} from ${pathname} to ${finalRedirect}`,
          );
          return NextResponse.redirect(new URL(finalRedirect, request.url));
        }
      }

      if (!accessToken && !currentSessionId) {
        console.log(
          `[Middleware] 🔐 Redirect to Login (Tenant Path): No Token/Session`,
        );
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 🚨 FAST PATH: Global roles (Patient, SuperAdmin) should ALWAYS be on their global dashboards. No tenant prefix allowed.
      if (userRole === "patient" || userRole === "super-admin" || userRole === "admin") {
        const globalPortal = userRole === "patient" ? "/patient/dashboard" : "/admin";
        if (pathname.startsWith(`/${firstSegment}${globalPortal}`)) {
          console.log(`[Middleware] ${userRole} on tenant path ${pathname}. Redirecting to global...`);
          return NextResponse.redirect(new URL(globalPortal, request.url));
        }
      }

      // 🚨 TENANT MISMATCH PROTECTION
      const userHospitalId = payload?.hospitalId || payload?.hospital;

      if (
        userHospitalId &&
        userHospitalId !== firstSegment &&
        userRole !== "super-admin" &&
        userRole !== "masterhelpdesk"
      ) {
        console.warn(
          `[Middleware] Tenant mismatch: path=${firstSegment}, token=${userHospitalId}. Redirecting...`,
        );
        const remainingPath = "/" + pathParts.slice(1).join("/");
        return NextResponse.redirect(
          new URL(`/${userHospitalId}${remainingPath}`, request.url),
        );
      }
      // Simplified response to avoid header-related 404s in Next.js 16/Turbopack
      // (The actual response is handled in Section 7 below)
    }
  }

  // 7. FINAL RESPONSE ASSEMBLY
  // If we refreshed the token, we MUST forward it to the server and set it in the browser
  const requestHeaders = new Headers(request.headers);

  // ✅ ALWAYS Propagate current state to headers for apiServer (Server Components)
  if (accessToken) {
    requestHeaders.set("X-Access-Token", accessToken);
  }
  if (effectiveId) {
    requestHeaders.set("X-Hospital-Id", effectiveId);
  }
  // If we have a fresh CSRF from refresh, use it. Otherwise use existing.
  // Resolve with multi-tenant context (suffixed cookies support)
  let currentCsrf =
    refreshData?.csrfToken || request.cookies.get("csrf_token")?.value;

  if (!currentCsrf) {
    if (effectiveId && effectiveId !== "global") {
      currentCsrf = request.cookies.get(`csrf_token_${effectiveId}`)?.value;
    }
    if (!currentCsrf && userRole) {
      const r = userRole.replace(/-/g, "_");
      const rh = userRole.replace(/_/g, "-");
      currentCsrf =
        request.cookies.get(`csrf_token_${r}`)?.value ||
        request.cookies.get(`csrf_token_${rh}`)?.value ||
        request.cookies.get("csrf_token_super_admin")?.value ||
        request.cookies.get("csrf_token_admin")?.value ||
        request.cookies.get("csrf_token_super-admin")?.value ||
        request.cookies.get("csrf_token_hospital-admin")?.value;
    }
  }

  if (currentCsrf) {
    requestHeaders.set("X-CSRF-Token", currentCsrf);
  }

  // ✅ PROXIED CONTEXT: Pass user role to apiServer/Server Components
  if (userRole) {
    requestHeaders.set("X-User-Role", userRole);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (isRefreshed && newAccessToken) {
    // Also set it in the response for the browser for subsequent client-side usage
    response.headers.set("X-Access-Token", newAccessToken);

    // ✅ SYNC CSRF: Also set X-CSRF-Token header for apiServer downstream
    if (refreshData?.csrfToken) {
      response.headers.set("X-CSRF-Token", refreshData.csrfToken);
    }

    // Set cookies for the browser (Access Token matches its JWT expiry or defaults to 15m)
    const payload = decodeJwt(newAccessToken);
    const maxAge = payload?.exp
      ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
      : 1800;

    const cookieOptions = {
      path: "/",
      maxAge: maxAge,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };
    response.cookies.set("accessToken", newAccessToken, cookieOptions);

    // ✅ SYNC TENANT TOKEN: Ensure the suffixed cookie is updated alongside global
    // to prevent apiClient from picking up a stale/expired tenant cookie.
    if (effectiveId) {
      response.cookies.set(
        `accessToken_${effectiveId}`,
        newAccessToken,
        cookieOptions,
      );
    }

    // Also forward any other cookies the backend sent (like rotated CSRF and REFRESH token)
    if (refreshResponseCookies) {
      // ✅ FIX 5: Robust Cookie Parsing for Next.js 15 / Node 20
      // We process each string in the array. If a string contains multiple cookies
      // (comma-aggregated), we split them using a regex that avoids splitting on
      // commas inside date strings (Expires).
      const rawCookieList = Array.isArray(refreshResponseCookies)
        ? refreshResponseCookies
        : [refreshResponseCookies as string];

      const processedCookies: string[] = [];
      rawCookieList.forEach((cStr) => {
        // Split by comma followed by a space and then a key=value pattern (avoids Expires commas)
        const parts = cStr.split(/, (?=[a-zA-Z0-9_-]+=)/);
        processedCookies.push(...parts);
      });

      processedCookies.forEach((c) => {
        if (!c || !c.includes("=")) return;

        const parts = c.split(";").map((p) => p.trim());
        const [nameValue, ...directives] = parts;
        const eqIdx = nameValue.indexOf("=");
        if (eqIdx === -1) return;

        const name = nameValue.slice(0, eqIdx).trim();
        const value = nameValue.slice(eqIdx + 1).trim();
        if (!name) return;

        const host = request.headers.get("host") || "";
        const isLocal =
          host.includes("localhost") || host.includes("127.0.0.1");
        const secureFlag = process.env.NODE_ENV === "production" && !isLocal;

        const options: any = {
          path: "/",
          secure: secureFlag,
          sameSite: "lax" as const,
        };

        directives.forEach((dir) => {
          const ei = dir.indexOf("=");
          const dName = (ei > -1 ? dir.slice(0, ei) : dir).trim().toLowerCase();
          const dVal = ei > -1 ? dir.slice(ei + 1).trim() : "";
          if (dName === "max-age" && dVal) options.maxAge = parseInt(dVal, 10);
          if (dName === "httponly") options.httpOnly = true;
          if (dName === "samesite" && dVal)
            options.sameSite = dVal.toLowerCase() as any;
          if (dName === "secure") options.secure = true;
          if (dName === "path" && dVal) options.path = dVal;
        });

        // Enforce correct security attributes per cookie type if omitted by backend
        if (name === "refreshToken" || name.startsWith("refreshToken_")) {
          options.httpOnly = true;
          if (!options.sameSite) options.sameSite = "lax"; // Changed from strict for port compatibility
          if (!options.maxAge) options.maxAge = 7 * 24 * 60 * 60;
        } else if (name.startsWith("csrf_token")) {
          options.httpOnly = false;
          if (!options.maxAge) options.maxAge = 7 * 24 * 60 * 60;
        } else if (name === "accessToken" || name.startsWith("accessToken_")) {
          options.httpOnly = false;
          if (!options.maxAge) options.maxAge = 30 * 60;
        }

        response.cookies.set(name, value, options);
      });
    }
  }

  return response;
}

export const config = {
  // Phase 4: Strict UI Matcher
  // Bypasses middleware execution entirely for static assets, eliminating Next.js server overhead
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|icons|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv|docx|xlsx|zip|mac|pdf)$).*)",
  ],
};
