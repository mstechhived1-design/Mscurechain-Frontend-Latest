import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { SupplierPayload } from '@/lib/integrations/types/supplier';

/**
 * Custom hook for fetching pharmacy suppliers with caching
 */
export function usePharmacySuppliers() {
    return useQuery({
        queryKey: ['pharmacy', 'suppliers'],
        queryFn: () => SupplierService.getSuppliers(),
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Custom hook for adding a supplier
 */
export function useAddSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SupplierPayload) => SupplierService.createSupplier(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
        }
    });
}

/**
 * Custom hook for updating a supplier
 */
export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SupplierPayload> }) =>
            SupplierService.updateSupplier(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
        }
    });
}

/**
 * Custom hook for deleting a supplier
 */
export function useDeleteSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => SupplierService.deleteSupplier(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
        }
    });
}

/**
 * Helper hook to manually invalidate suppliers cache
 */
export function useInvalidatePharmacySuppliers() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
}
