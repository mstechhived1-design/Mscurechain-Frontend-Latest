import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { dischargeService } from '@/lib/integrations/services/discharge.service';

export function useDischargeRecord(
    id: string | null,
    options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['discharge', 'record', id],
        queryFn: async () => {
            if (!id) return null;
            const response = await dischargeService.getRecordById(id);
            return response.data;
        },
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        ...options,
    });
}
