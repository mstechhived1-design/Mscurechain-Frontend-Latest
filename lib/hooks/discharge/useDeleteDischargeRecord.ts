import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import toast from 'react-hot-toast';

export function useDeleteDischargeRecord() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await dischargeService.deleteRecord(id);
        },
        onSuccess: () => {
            // Invalidate and refetch history queries
            queryClient.invalidateQueries({ queryKey: ['discharge', 'history'] });

            toast.success('Record deleted successfully', {
                icon: '🗑️',
                duration: 4000,
            });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete record');
        },
    });
}
