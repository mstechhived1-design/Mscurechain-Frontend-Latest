import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';

/**
 * Custom hook for fetching pharmacy bills (transactions) with caching
 */
export function usePharmacyBills(
    page: number = 1,
    limit: number = 10,
    search?: string,
    paymentMode?: string,
    date?: string
) {
    return useQuery({
        queryKey: ['pharmacy', 'bills', { page, limit, search, paymentMode, date }],
        queryFn: () => PharmacyBillingService.getBills(page, limit, search, paymentMode, date),
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        placeholderData: (previousData) => previousData, // Instant UI transition
    });
}

/**
 * Custom hook for deleting a bill
 */
export function useDeleteBill() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => PharmacyBillingService.deleteBill(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacy', 'bills'] });
        }
    });
}

/**
 * Helper hook to manually invalidate bills cache
 */
export function useInvalidatePharmacyBills() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ['pharmacy', 'bills'] });
}
