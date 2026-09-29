'use client';

/**
 * Unified Dashboard Hooks — Phase 2 & 3, HMS Performance Architecture v6
 *
 * Each hook fetches ONE aggregated endpoint that returns all dashboard
 * slices in a single round-trip. Partial failures yield null slices —
 * the UI renders graceful fallbacks per slice rather than a blank page.
 *
 * Conforms to v6 queryConfig:
 *   critical   → staleTime: 0   (emergency/vitals — no placeholder)
 *   operational → staleTime: 30s (appointments, queue, tasks)
 *   reference   → staleTime: 1h  (catalog, departments, metadata)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  unifiedDashboardService,
  unifiedDashboardKeys,
  queryConfig,
  type DoctorUnifiedDashboard,
  type HospitalAdminUnifiedDashboard,
  type HelpdeskUnifiedDashboard,
  type NurseUnifiedDashboard,
  type LabUnifiedDashboard,
  type PharmacyUnifiedDashboard,
  type StaffUnifiedDashboard,
  type HRUnifiedDashboard,
} from '../services/unifiedDashboard.service';

// ---------------------------------------------------------------------------
// Prefetch helper — call on hover/touch/focus before navigation lands
// ---------------------------------------------------------------------------

export function usePrefetchDashboard(portal: string) {
  const client = useQueryClient();
  return () => {
    const fn = unifiedDashboardService[portal as keyof typeof unifiedDashboardService];
    if (!fn) return Promise.resolve(null);
    return client.prefetchQuery({
      queryKey: unifiedDashboardKeys.portal(portal),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryFn: fn as () => Promise<any>,
      staleTime: queryConfig.operational.staleTime,
    });
  };
}

// ---------------------------------------------------------------------------
// Doctor Portal
// ---------------------------------------------------------------------------

export function useDoctorUnifiedDashboard() {
  return useQuery<DoctorUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.doctor(),
    queryFn: unifiedDashboardService.doctor,
    ...queryConfig.operational,
    // ✅ No placeholderData — always show fresh data or loader
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// ---------------------------------------------------------------------------
// Hospital Admin Portal
// ---------------------------------------------------------------------------

export function useHospitalAdminUnifiedDashboard() {
  return useQuery<HospitalAdminUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.hospitalAdmin(),
    queryFn: unifiedDashboardService.hospitalAdmin,
    ...queryConfig.operational,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// ---------------------------------------------------------------------------
// Helpdesk Portal
// ---------------------------------------------------------------------------

export function useHelpdeskUnifiedDashboard() {
  return useQuery<HelpdeskUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.helpdesk(),
    queryFn: unifiedDashboardService.helpdesk,
    ...queryConfig.operational,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// ---------------------------------------------------------------------------
// Nurse Portal  (operational — patient list refreshes every 30s)
// ---------------------------------------------------------------------------

export function useNurseUnifiedDashboard() {
  return useQuery<NurseUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.nurse(),
    queryFn: unifiedDashboardService.nurse,
    ...queryConfig.operational,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Lab Portal  (operational — pending orders change frequently)
// ---------------------------------------------------------------------------

export function useLabUnifiedDashboard() {
  return useQuery<LabUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.lab(),
    queryFn: unifiedDashboardService.lab,
    ...queryConfig.operational,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Pharmacy Portal
// ---------------------------------------------------------------------------

export function usePharmacyUnifiedDashboard() {
  return useQuery<PharmacyUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.pharmacy(),
    queryFn: unifiedDashboardService.pharmacy,
    ...queryConfig.operational,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Staff Portal
// ---------------------------------------------------------------------------

export function useStaffUnifiedDashboard() {
  return useQuery<StaffUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.staff(),
    queryFn: unifiedDashboardService.staff,
    ...queryConfig.operational,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// HR Portal
// ---------------------------------------------------------------------------

export function useHRUnifiedDashboard() {
  return useQuery<HRUnifiedDashboard>({
    queryKey: unifiedDashboardKeys.hr(),
    queryFn: unifiedDashboardService.hr,
    ...queryConfig.operational,
    retry: 2,
  });
}
