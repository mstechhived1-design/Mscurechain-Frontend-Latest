import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route Proxy — eliminates CORS for every backend call.
 *
 * Browser  → localhost:3000/api/proxy/<anything>
 * This route forwards the request server-side to the real backend,
 * then streams the response back. Server-to-server calls have no CORS.
 *
 * NEXT_PUBLIC_API_URL should be set to:  http://localhost:3000/api/proxy
 * BACKEND_INTERNAL_URL should be set to: http://43.204.32.80:5002/api
 */

const BACKEND_BASE =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") ||
  "http://43.204.32.80:5002/api";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendPath = path.join("/");

  // Reconstruct query string
  const search = req.nextUrl.search || "";
  const targetUrl = `${BACKEND_BASE}/${backendPath}${search}`;

  // Forward only safe headers — strip host to avoid upstream rejection
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "transfer-encoding"
    ) {
      return; // Skip these
    }
    forwardHeaders.set(key, value);
  });

  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined;

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
      cache: "no-store", // Prevents Next.js from caching GET requests aggressively
      // @ts-expect-error — Node.js fetch supports this
      duplex: "half",
    });

    // Forward response headers (exclude ones Next.js manages)
    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "content-encoding" ||
        lower === "transfer-encoding" ||
        lower === "connection" ||
        lower === "set-cookie"
      ) {
        return;
      }
      resHeaders.set(key, value);
    });

    // Phase 4: Direct Streaming
    // Bypass the server-side memory buffer. Stream the response directly to the browser.
    // This dramatically improves Time-To-First-Byte (TTFB) and reduces Next.js memory usage.
    const response = new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });

    if (backendRes.headers.has("set-cookie")) {
      const cookies = backendRes.headers.getSetCookie();
      cookies.forEach((cookie) => {
        response.headers.append("set-cookie", cookie);
      });
    }

    return response;
  } catch (err: any) {
    console.error(
      `[Proxy] Failed to reach backend at ${targetUrl}:`,
      err.message,
    );
    return NextResponse.json(
      {
        message: `Proxy error: Cannot reach backend at ${BACKEND_BASE}`,
        detail: err.message,
      },
      { status: 502 },
    );
  }
}

// Export all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
