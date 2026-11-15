const RAILWAY_BACKEND_URL = "https://mscurechain-backend-latest-production.up.railway.app/api";
const LOCAL_BACKEND_URL = "http://localhost:5003/api";

function getResolvedApiUrl(): string {
  if (typeof window === "undefined") {
    // Server-side (Node.js / SSR) fallback
    return process.env.NEXT_PUBLIC_API_URL?.trim() || RAILWAY_BACKEND_URL;
  }

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const userAgent = navigator.userAgent || "";

  // 1. Detect Native Android APK
  const isAndroidApk = Boolean(
    (window as any).AndroidNative ||
    (window as any).AndroidBridge ||
    (window as any).AndroidPrintBridge ||
    (window as any).Capacitor !== undefined ||
    /AndroidBridge|MSCureChain|Capacitor/i.test(userAgent) ||
    (host === "localhost" && /Android/i.test(userAgent)) ||
    protocol === "asset:" ||
    protocol === "file:"
  );

  // 2. Detect Desktop .EXE (Tauri / Electron)
  const isDesktopExe = Boolean(
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    /Tauri|Electron/i.test(userAgent) ||
    protocol === "tauri:" ||
    host === "tauri.localhost"
  );

  // 3. Detect Production Web Hosting (Vercel, Cloudflare, custom domain)
  const isProductionWeb = Boolean(
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    !host.startsWith("192.168.") &&
    !host.startsWith("10.")
  );

  // In .APK, .EXE, and production frontend web hosting, STRICTLY talk straight to the hosted Railway backend
  if (isAndroidApk || isDesktopExe || isProductionWeb) {
    return RAILWAY_BACKEND_URL;
  }

  // ONLY when running in local browser on localhost/127.0.0.1, talk dynamically to the local backend on port 5003
  return `http://${host}:5003/api`;
}

export const apiUrl = getResolvedApiUrl();

// ─── WS_URL Derivation ────────────────────────────────────────────────────────
function deriveWsUrl(httpUrl: string): string {
  try {
    const url = new URL(httpUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/api\/?$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return httpUrl
      .replace(/\/api\/?$/, "")
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
  }
}

export const API_CONFIG = {
  get BASE_URL(): string {
    return getResolvedApiUrl();
  },
  get WS_URL(): string {
    return deriveWsUrl(getResolvedApiUrl());
  },
  TIMEOUT: 10000,
};
