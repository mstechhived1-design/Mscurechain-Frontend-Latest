import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample } from '@/lib/integrations/types/labSample';

/**
 * Custom hook for fetching lab samples with pagination and caching
 * 
 * Features:
 * - Automatic caching (30s staleTime, 5min gcTime)
 * - Pagination support
 * - Status filtering
 * - Optimistic updates
 */
export function useLabSamples(
    page: number = 1,
    limit: number = 10,
    status: string = 'All Samples'
) {
    return useQuery({
        queryKey: LabSampleService.queryKeys.list({ status, page, limit }),
        queryFn: () => LabSampleService.getSamplesPaginated(page, limit, status),
        // Data stays fresh for 30 seconds (inherited from queryClient config)
        // Cache persists for 5 minutes (inherited from queryClient config)
    });
}

/**
 * Hook for fetching a single lab sample by ID
 */
export function useLabSample(id: string) {
    return useQuery({
        queryKey: LabSampleService.queryKeys.detail(id),
        queryFn: () => LabSampleService.getSampleById(id),
        enabled: !!id, // Only fetch if ID is provided
    });
}

/**
 * Hook for collecting a sample (mutation)
 * Automatically invalidates the samples list cache
 */
export function useCollectSample() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => LabSampleService.collectSample(id),
        onSuccess: () => {
            // Invalidate all sample lists to refetch fresh data
            queryClient.invalidateQueries({
                queryKey: LabSampleService.queryKeys.lists()
            });
        },
    });
}

/**
 * Hook for updating sample results (mutation)
 * Automatically invalidates the samples cache
 */
export function useUpdateSampleResults() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) =>
            LabSampleService.updateResults(id, payload),
        onSuccess: (_, variables) => {
            // Invalidate the specific sample and all lists
            queryClient.invalidateQueries({
                queryKey: LabSampleService.queryKeys.detail(variables.id)
            });
            queryClient.invalidateQueries({
                queryKey: LabSampleService.queryKeys.lists()
            });
        },
    });
}

/**
 * Hook for deleting a sample (mutation)
 */
export function useDeleteSample() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => LabSampleService.deleteSample(id),
        onSuccess: () => {
            // Invalidate all sample lists
            queryClient.invalidateQueries({
                queryKey: LabSampleService.queryKeys.lists()
            });
        },
    });
}

/**
 * Utility hook to manually invalidate lab samples cache
 * Useful for WebSocket real-time updates
 */
export function useInvalidateLabSamples() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: LabSampleService.queryKeys.lists()
        });
    };
}

/**
 * Utility hook to optimistically add a new sample to the cache
 * Useful for WebSocket real-time updates
 */
export function useOptimisticLabSample() {
    const queryClient = useQueryClient();

    return (newSample: LabSample) => {
        // Get all query keys that match the samples list pattern
        queryClient.setQueriesData(
            { queryKey: LabSampleService.queryKeys.lists() },
            (old: any) => {
                if (!old) return old;

                // Check if sample already exists
                const exists = old.samples?.some((s: LabSample) => s._id === newSample._id);
                if (exists) return old;

                // Add new sample to the beginning of the list
                return {
                    ...old,
                    samples: [newSample, ...(old.samples || [])],
                    totalSamples: (old.totalSamples || 0) + 1,
                };
            }
        );
    };
}
