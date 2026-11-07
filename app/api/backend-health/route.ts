import { NextResponse } from "next/server";

const RAILWAY_BACKEND_DEFAULT = "https://mscurechain-backend-latest-production.up.railway.app/api";

function getBackendBase(): string {
  let raw = process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/+$/, "") || RAILWAY_BACKEND_DEFAULT;
  if (!raw || raw.startsWith("/")) {
    raw = RAILWAY_BACKEND_DEFAULT;
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = raw.includes("localhost") || raw.includes("127.0.0.1") ? `http://${raw}` : `https://${raw}`;
  }
  return raw;
}

export async function GET() {
  const backendBase = getBackendBase();
  const healthUrl = `${backendBase}/health`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    if (res.ok) {
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = { status: "ok" };
      }
      return NextResponse.json({
        connected: true,
        status: res.status,
        latency,
        backendUrl: backendBase,
        data,
      });
    } else {
      return NextResponse.json(
        {
          connected: false,
          status: res.status,
          latency,
          backendUrl: backendBase,
          error: `HTTP ${res.status}: ${res.statusText}`,
        },
        { status: 503 }
      );
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return NextResponse.json(
      {
        connected: false,
        latency,
        backendUrl: backendBase,
        error: err.name === "AbortError" ? "Backend connection timed out" : (err.message || "Unable to reach backend"),
      },
      { status: 503 }
    );
  }
}
