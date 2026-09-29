import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { emergencyService } from '@/lib/integrations/services/emergency.service';
import { CreateEmergencyRequestData } from '@/lib/integrations/types/emergency';

export function useCreateRequest(
    options?: Omit<UseMutationOptions<any, Error, CreateEmergencyRequestData>, 'mutationFn'>
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateEmergencyRequestData) => {
            return await emergencyService.createEmergencyRequest(data);
        },
        onSuccess: () => {
            // Invalidate and refetch requests after successful creation
            queryClient.invalidateQueries({ queryKey: ['emergency', 'my-requests'] });
        },
        ...options,
    });
}
