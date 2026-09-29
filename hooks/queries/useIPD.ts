import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipdService } from '@/lib/integrations/services/ipd.service';

const IPD_QUERY_KEYS = {
    all: ['ipd'] as const,
    beds: (filters?: any) => [...IPD_QUERY_KEYS.all, 'beds', filters] as const,
    bedDetails: (id: string) => [...IPD_QUERY_KEYS.all, 'bed-details', id] as const,
    activeAdmissions: () => [...IPD_QUERY_KEYS.all, 'active-admissions'] as const,
};

export function useBeds(filters?: { status?: string; type?: string }) {
    return useQuery({
        queryKey: IPD_QUERY_KEYS.beds(filters),
        queryFn: () => ipdService.getBeds(filters),
        staleTime: 30000,
    });
}

export function useBedDetails(id: string) {
    return useQuery({
        queryKey: IPD_QUERY_KEYS.bedDetails(id),
        queryFn: () => ipdService.getBedDetails(id),
        enabled: !!id,
        staleTime: 30000,
    });
}

export function useActiveAdmissions() {
    return useQuery({
        queryKey: IPD_QUERY_KEYS.activeAdmissions(),
        queryFn: () => ipdService.getActiveAdmissions(),
        staleTime: 30000,
    });
}

export function useUpdateBedStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            ipdService.updateBedStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.all });
        },
    });
}
