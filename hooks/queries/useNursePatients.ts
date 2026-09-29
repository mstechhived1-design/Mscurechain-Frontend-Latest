import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NurseService, NursePatient, NurseTask } from '@/lib/integrations/services/nurse.service';

/**
 * Custom hook for fetching nurse patients with pagination and caching
 * 
 * Features:
 * - Automatic caching (30s staleTime, 5min gcTime)
 * - Pagination support
 * - Ward and status filtering
 */
export function useNursePatients(
    page: number = 1,
    limit: number = 20,
    filters?: { ward?: string; status?: string }
) {
    return useQuery({
        queryKey: NurseService.queryKeys.patients({ page, limit, ...filters }),
        queryFn: () => NurseService.getPatients(page, limit, filters),
    });
}

/**
 * Hook for fetching a single patient by ID
 */
export function useNursePatient(id: string) {
    return useQuery({
        queryKey: NurseService.queryKeys.patientById(id),
        queryFn: () => NurseService.getPatientById(id),
        enabled: !!id,
    });
}

/**
 * Hook for fetching nurse tasks with pagination
 */
export function useNurseTasks(
    page: number = 1,
    limit: number = 20,
    filters?: { status?: string; priority?: string }
) {
    return useQuery({
        queryKey: NurseService.queryKeys.tasks({ page, limit, ...filters }),
        queryFn: () => NurseService.getTasks(page, limit, filters),
    });
}

/**
 * Hook for updating task status (mutation)
 */
export function useUpdateTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            NurseService.updateTaskStatus(id, status as "Pending" | "Completed" | "In Progress" | "Cancelled"),
        onSuccess: () => {
            // Invalidate tasks list to refetch
            queryClient.invalidateQueries({
                queryKey: ['nurse', 'tasks']
            });
        },
    });
}

/**
 * Hook for fetching nurse dashboard stats
 */
export function useNurseDashboard() {
    return useQuery({
        queryKey: NurseService.queryKeys.dashboard(),
        queryFn: () => NurseService.getDashboardStats(),
    });
}

/**
 * Utility hook to manually invalidate nurse patients cache
 * Useful for real-time updates
 */
export function useInvalidateNursePatients() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: ['nurse', 'patients']
        });
    };
}

/**
 * Utility hook to manually invalidate nurse tasks cache
 */
export function useInvalidateNurseTasks() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: ['nurse', 'tasks']
        });
    };
}
