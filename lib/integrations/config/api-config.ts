let apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== "undefined") {
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  
  // 🌐 DYNAMIC NETWORK ADAPTER:
  // Automatically rewrite the API_URL to match the current host.
  // If hitting the internal Next.js proxy (/api/proxy), we also sync the port.
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        let modified = false;
        if (url.hostname !== currentHost) {
          url.hostname = currentHost;
          modified = true;
        }
        // If it's hitting the Next.js proxy, the port must match the frontend
        if (url.pathname.startsWith('/api/proxy')) {
          if (url.port !== currentPort) {
            url.port = currentPort || "";
            modified = true;
          }
        }
        
        if (modified) {
          console.warn(`[Config] 📶 Dynamically switching API from ${url.host} to ${url.hostname}:${url.port}`);
          apiUrl = url.toString();
        }
      }
    } catch (e) {
      if (apiUrl.includes("localhost")) {
        apiUrl = apiUrl.replace("localhost", currentHost);
      }
    }
  }
}

if (!apiUrl && typeof window !== "undefined") {
  console.error(
    "[Config] NEXT_PUBLIC_API_URL is not set! API calls will fail. " +
      "Set this env var and rebuild the app.",
  );
}

// ─── WS_URL Derivation ────────────────────────────────────────────────────────
// Converts  https://host/api  →  wss://host
//           http://host/api   →  ws://host
// Using a proper protocol swap and stripping only a trailing /api segment.
function deriveWsUrl(httpUrl: string): string {
  try {
    const url = new URL(httpUrl);
    // Swap protocol: https → wss, http → ws
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    // Remove trailing /api path segment only
    url.pathname = url.pathname.replace(/\/api\/?$/, "") || "/";
    return url.toString().replace(/\/$/, ""); // strip trailing slash
  } catch {
    // Fallback for non-URL strings (should not happen)
    return httpUrl
      .replace(/\/api\/?$/, "")
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
  }
}

export const API_CONFIG = {
  // NEXT_PUBLIC_* vars are baked in at build time — set them on the SERVER before building.
  BASE_URL: apiUrl || "",
  WS_URL: apiUrl ? deriveWsUrl(apiUrl) : "",
  TIMEOUT: 10000,
};
