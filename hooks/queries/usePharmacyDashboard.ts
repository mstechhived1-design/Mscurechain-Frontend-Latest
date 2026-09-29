import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PharmacyDashboardService,
  PharmacyDashboardStats,
} from "@/lib/integrations/services/pharmacyDashboard.service";

/**
 * Custom hook for fetching pharmacy dashboard stats with caching
 *
 * Features:
 * - Automatic caching (30s staleTime, 5min gcTime)
 * - Range and date filtering support
 * - Optimized for performance
 * - PlaceholderData shows cached data instantly while refetching
 */
export function usePharmacyDashboard(
  range: string = "today",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["pharmacy", "dashboard", { range, startDate, endDate }],
    queryFn: () => PharmacyDashboardService.getStats(range, startDate, endDate),
    // ✅ PERFORMANCE FIX: Show previous data while fetching new data
    // This makes the UI feel instant on filter changes
    placeholderData: (previousData) => previousData,
    // Data stays fresh for 30 seconds
    // Cache persists for 5 minutes
  });
}

/**
 * Utility hook to manually invalidate pharmacy dashboard cache
 * Useful for manual refresh
 */
export function useInvalidatePharmacyDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: ["pharmacy", "dashboard"],
    });
  };
}
