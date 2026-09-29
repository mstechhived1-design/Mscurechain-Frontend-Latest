import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { emergencyService } from '@/lib/integrations/services/emergency.service';

interface HospitalsResponse {
    hospitals: any[];
}

export function useHospitals(
    options?: Omit<UseQueryOptions<HospitalsResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery<HospitalsResponse>({
        queryKey: ['emergency', 'hospitals'],
        queryFn: async () => {
            const response = await emergencyService.getAvailableHospitals();
            return {
                hospitals: response.hospitals || [],
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - hospitals don't change often
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        ...options,
    });
}
