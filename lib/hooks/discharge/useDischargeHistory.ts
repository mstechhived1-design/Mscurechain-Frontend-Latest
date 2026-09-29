import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { dischargeService } from '@/lib/integrations/services/discharge.service';

interface DischargeHistoryParams {
    page: number;
    limit: number;
    search: string;
}

interface DischargeHistoryResponse {
    data: any[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function useDischargeHistory(
    page: number,
    limit: number,
    search: string,
    options?: Omit<UseQueryOptions<DischargeHistoryResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery<DischargeHistoryResponse>({
        queryKey: ['discharge', 'history', page, limit, search],
        queryFn: async () => {
            const response = await dischargeService.getHistory(page, limit, search);
            return {
                data: response.data || [],
                pagination: response.pagination || {
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                },
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        ...options,
    });
}
