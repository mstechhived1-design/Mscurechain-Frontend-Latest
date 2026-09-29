import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { emergencyService } from '@/lib/integrations/services/emergency.service';
import { EmergencyRequest } from '@/lib/integrations/types/emergency';

interface MyRequestsResponse {
    requests: EmergencyRequest[];
}

export function useMyRequests(
    options?: Omit<UseQueryOptions<MyRequestsResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery<MyRequestsResponse>({
        queryKey: ['emergency', 'my-requests'],
        queryFn: async () => {
            const response = await emergencyService.getMyRequests();
            return {
                requests: response.requests || [],
            };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - requests update more frequently
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: 'always', // Refetch when component mounts
        refetchOnWindowFocus: false, // Don't refetch on focus (unnecessary)
        refetchOnReconnect: true, // Refetch on reconnect (important)
        refetchInterval: false, // Disable polling - use manual refresh instead
        retry: 1,
        ...options,
    });
}
