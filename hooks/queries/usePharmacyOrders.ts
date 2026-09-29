import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';

/**
 * Custom hook for fetching pharmacy orders with pagination and caching
 * 
 * Features:
 * - Automatic caching (30s staleTime, 5min gcTime)
 * - Pagination support
 * - Status filtering
 * - Hospital filtering
 */
export function usePharmacyOrders(
    hospitalId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
) {
    return useQuery({
        queryKey: PharmacyBillingService.queryKeys.orders({ hospitalId, status, page, limit }),
        queryFn: () => PharmacyBillingService.getHospitalOrders(hospitalId, status, page, limit),
        enabled: !!hospitalId, // Only fetch if hospitalId is provided
    });
}

/**
 * Hook for fetching a single pharmacy order by ID
 */
export function usePharmacyOrder(id: string) {
    return useQuery({
        queryKey: PharmacyBillingService.queryKeys.orderById(id),
        queryFn: () => PharmacyBillingService.getPharmacyOrder(id),
        enabled: !!id,
    });
}

/**
 * Hook for fetching pharmacy bills with pagination
 */
export function usePharmacyBills(
    page: number = 1,
    limit: number = 10,
    search?: string,
    paymentMode?: string,
    date?: string
) {
    return useQuery({
        queryKey: PharmacyBillingService.queryKeys.bills({ page, limit, search, paymentMode, date }),
        queryFn: () => PharmacyBillingService.getBills(page, limit, search, paymentMode, date),
    });
}

/**
 * Hook for fetching a single bill by ID
 */
export function usePharmacyBill(id: string) {
    return useQuery({
        queryKey: PharmacyBillingService.queryKeys.billById(id),
        queryFn: () => PharmacyBillingService.getBillById(id),
        enabled: !!id,
    });
}

/**
 * Hook for creating a new pharmacy bill (mutation)
 */
export function useCreatePharmacyBill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => PharmacyBillingService.createBill(data),
        onSuccess: () => {
            // Invalidate bills list to refetch
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'bills']
            });
            // Also invalidate orders if the bill was created from an order
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'orders']
            });
        },
    });
}

/**
 * Hook for deleting a pharmacy bill (mutation)
 */
export function useDeletePharmacyBill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => PharmacyBillingService.deleteBill(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'bills']
            });
        },
    });
}

/**
 * Utility hook to manually invalidate pharmacy orders cache
 * Useful for WebSocket real-time updates
 */
export function useInvalidatePharmacyOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: ['pharmacy', 'orders']
        });
    };
}

/**
 * Utility hook to optimistically add a new order to the cache
 * Useful for WebSocket real-time updates
 */
export function useOptimisticPharmacyOrder() {
    const queryClient = useQueryClient();

    return (newOrder: any) => {
        // Update all queries that match the orders pattern
        queryClient.setQueriesData(
            { queryKey: ['pharmacy', 'orders'] },
            (old: any) => {
                if (!old) return old;

                // Check if order already exists
                const orders = old.pharmacyOrders || old.data || [];
                const exists = orders.some((o: any) => o._id === newOrder._id);
                if (exists) return old;

                // Add new order to the beginning
                const updatedOrders = [newOrder, ...orders];

                return {
                    ...old,
                    pharmacyOrders: updatedOrders,
                    data: updatedOrders,
                };
            }
        );
    };
}
