import { NextRequest, NextResponse } from "next/server";

/**
 * Unified Dashboard Aggregator — Phase 2 of HMS Performance Architecture v6
 *
 * Each portal's dashboard previously made 2–5 sequential or parallel client-side
 * fetch calls, creating a waterfall plus CORS overhead.
 *
 * This route runs server-side fan-outs using Promise.allSettled so:
 *  1. All backend calls run server-to-server (no CORS, lower latency)
 *  2. A single HTTP round-trip goes from browser → Next.js → backend(s) in parallel
 *  3. Partial failures are handled gracefully — one failed slice ≠ blank dashboard
 *
 * Endpoint: GET /api/unified-dashboard/:portal
 * Portals:  doctor | hospital-admin | helpdesk | nurse | lab | pharmacy | staff | hr
 */

const BACKEND =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") ||
  "http://43.204.32.80:5002/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Forward auth + hospital headers from the incoming browser request */
function buildForwardHeaders(req: NextRequest): Headers {
  const h = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) h.set("authorization", auth);

  const hospitalId =
    req.headers.get("x-hospital-id") || req.headers.get("x-tenant-id");
  if (hospitalId) h.set("x-hospital-id", hospitalId);

  h.set("content-type", "application/json");
  return h;
}

/** Safely fetch one backend endpoint — never throws, returns null on failure */
async function safeGet<T = unknown>(
  path: string,
  headers: Headers,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const url = `${BACKEND}/${path.replace(/^\//, "")}`;
    const res = await fetch(url, {
      method: "GET",
      headers,
      next: { revalidate: 0 }, // always fresh — dashboards are real-time
    });

    if (!res.ok) {
      return { ok: false, error: `${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "fetch failed" };
  }
}

/** Unwrap allSettled results into a named map */
function collectResults(
  keys: string[],
  results: PromiseSettledResult<{ ok: boolean; data?: unknown; error?: string }>[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  keys.forEach((key, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.ok) {
      out[key] = (r.value as any).data;
    } else {
      out[key] = null; // Partial failure — section renders empty/fallback
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Portal fan-out definitions
// ---------------------------------------------------------------------------

type FanOut = Record<string, string>; // { sliceName: backendPath }

const PORTAL_FANOUT: Record<string, FanOut> = {
  doctor: {
    dashboard: "doctor/dashboard",
    calendar: "doctor/calendar/stats",
    announcements: "doctor/announcements",
    pausedAppointments: "doctor/appointments/paused",
  },

  "hospital-admin": {
    dashboard: "hospital-admin/dashboard",
    announcements: "announcements/hospital",
    attendanceStats: "hospital-admin/attendance/stats",
  },

  helpdesk: {
    dashboard: "helpdesk/dashboard",
    doctors: "helpdesk/doctors?limit=50",
    announcements: "doctor/announcements", // shared announcements endpoint
  },

  nurse: {
    stats: "nurse/dashboard/stats",
    patients: "nurse/patients?page=1&limit=10",
    tasks: "nurse/tasks?page=1&limit=10&status=Pending",
    announcements: "doctor/announcements",
  },

  lab: {
    stats: "lab/dashboard/stats?range=today",
    pendingOrders: "lab/orders?status=prescribed&limit=10",
    departments: "lab/departments",
  },

  pharmacy: {
    dashboard: "pharmacy/dashboard",
    lowStock: "pharmacy/products?limit=10&lowStock=true",
    pendingOrders: "pharmacy/orders?status=pending&limit=10",
  },

  staff: {
    dashboard: "staff/dashboard",
    schedule: "staff/schedule",
    announcements: "doctor/announcements",
  },

  hr: {
    dashboard: "hr/dashboard",
    attendanceStats: "hospital-admin/attendance/stats",
    announcements: "announcements/hospital",
  },
};

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ portal: string }> },
) {
  const { portal } = await params;
  const fanOut = PORTAL_FANOUT[portal];

  if (!fanOut) {
    return NextResponse.json(
      {
        error: `Unknown portal: "${portal}". Valid portals: ${Object.keys(PORTAL_FANOUT).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const headers = buildForwardHeaders(req);
  const keys = Object.keys(fanOut);
  const paths = Object.values(fanOut);

  // Fan-out all backend calls in parallel — server-side, no CORS
  const settled = await Promise.allSettled(
    paths.map((p) => safeGet(p, headers)),
  );

  const slices = collectResults(keys, settled);

  // Attach metadata for the frontend to understand what succeeded
  const meta = {
    portal,
    fetchedAt: new Date().toISOString(),
    slices: keys.map((k, i) => ({
      name: k,
      ok: settled[i].status === "fulfilled" && (settled[i] as any).value?.ok,
    })),
  };

  return NextResponse.json({ ...slices, _meta: meta });
}
