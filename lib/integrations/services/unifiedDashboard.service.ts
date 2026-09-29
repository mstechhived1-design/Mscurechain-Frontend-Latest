/**
 * Unified Dashboard Service — Phase 2, HMS Performance Architecture v6
 *
 * Clients call ONE endpoint per portal; the Next.js aggregator fans-out
 * to multiple backend endpoints server-side and returns a merged blob.
 *
 * Usage:
 *   const { data } = useDoctorUnifiedDashboard();
 *   data.dashboard   // from /doctor/dashboard
 *   data.calendar    // from /doctor/calendar/stats
 *   data.announcements
 */

// ---------------------------------------------------------------------------
// Query Config (from v6 spec)
// ---------------------------------------------------------------------------

export const queryConfig = {
  /** Real-time data: vitals, emergency queue — never stale */
  critical: { staleTime: 0, gcTime: 10 * 1000 },
  /** Operational data: today's appointments, staff attendance — 30s stale */
  operational: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  /** Reference data: departments, test catalog, hospital metadata — 1h stale */
  reference: { staleTime: 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000 },
} as const;

// ---------------------------------------------------------------------------
// Raw fetcher
// ---------------------------------------------------------------------------

async function fetchUnifiedDashboard(portal: string): Promise<any> {
  const res = await fetch(`/api/unified-dashboard/${portal}`, {
    method: "GET",
    credentials: "include", // forward cookies (session auth)
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Unified dashboard fetch failed for portal "${portal}": ${res.status}`,
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Per-portal typed fetchers
// ---------------------------------------------------------------------------

export interface DoctorUnifiedDashboard {
  dashboard: any | null;
  calendar: any | null;
  announcements: any | null;
  pausedAppointments: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface HospitalAdminUnifiedDashboard {
  dashboard: any | null;
  announcements: any | null;
  attendanceStats: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface HelpdeskUnifiedDashboard {
  dashboard: any | null;
  doctors: any | null;
  announcements: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface NurseUnifiedDashboard {
  stats: any | null;
  patients: any | null;
  tasks: any | null;
  announcements: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface LabUnifiedDashboard {
  stats: any | null;
  pendingOrders: any | null;
  departments: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface PharmacyUnifiedDashboard {
  dashboard: any | null;
  lowStock: any | null;
  pendingOrders: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface StaffUnifiedDashboard {
  dashboard: any | null;
  schedule: any | null;
  announcements: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

export interface HRUnifiedDashboard {
  dashboard: any | null;
  attendanceStats: any | null;
  announcements: any | null;
  _meta: { portal: string; fetchedAt: string; slices: { name: string; ok: boolean }[] };
}

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const unifiedDashboardKeys = {
  all: () => ["unified-dashboard"] as const,
  portal: (portal: string) => ["unified-dashboard", portal] as const,
  doctor: () => ["unified-dashboard", "doctor"] as const,
  hospitalAdmin: () => ["unified-dashboard", "hospital-admin"] as const,
  helpdesk: () => ["unified-dashboard", "helpdesk"] as const,
  nurse: () => ["unified-dashboard", "nurse"] as const,
  lab: () => ["unified-dashboard", "lab"] as const,
  pharmacy: () => ["unified-dashboard", "pharmacy"] as const,
  staff: () => ["unified-dashboard", "staff"] as const,
  hr: () => ["unified-dashboard", "hr"] as const,
};

// ---------------------------------------------------------------------------
// Service object — use directly in useQuery's queryFn
// ---------------------------------------------------------------------------

export const unifiedDashboardService = {
  doctor: (): Promise<DoctorUnifiedDashboard> =>
    fetchUnifiedDashboard("doctor"),

  hospitalAdmin: (): Promise<HospitalAdminUnifiedDashboard> =>
    fetchUnifiedDashboard("hospital-admin"),

  helpdesk: (): Promise<HelpdeskUnifiedDashboard> =>
    fetchUnifiedDashboard("helpdesk"),

  nurse: (): Promise<NurseUnifiedDashboard> =>
    fetchUnifiedDashboard("nurse"),

  lab: (): Promise<LabUnifiedDashboard> =>
    fetchUnifiedDashboard("lab"),

  pharmacy: (): Promise<PharmacyUnifiedDashboard> =>
    fetchUnifiedDashboard("pharmacy"),

  staff: (): Promise<StaffUnifiedDashboard> =>
    fetchUnifiedDashboard("staff"),

  hr: (): Promise<HRUnifiedDashboard> =>
    fetchUnifiedDashboard("hr"),
};
