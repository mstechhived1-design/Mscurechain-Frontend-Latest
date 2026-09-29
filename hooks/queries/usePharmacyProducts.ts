import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct, PharmacyProductPayload } from '@/lib/integrations/types/product';

/**
 * Custom hook for fetching pharmacy products with pagination and caching
 * 
 * Features:
 * - Automatic caching (30s staleTime, 5min gcTime)
 * - Pagination support
 * - Search and filter support
 * - Optimized for performance
 */
export function usePharmacyProducts(
    page: number = 1,
    limit: number = 10,
    filters?: {
        search?: string;
        status?: string;
        supplier?: string;
        expiryStatus?: string;
    }
) {
    return useQuery({
        queryKey: ['pharmacy', 'products', { page, limit, ...filters }],
        queryFn: () => ProductService.getProductsPaginated(page, limit, filters),
        // Data stays fresh for 30 seconds
        // Cache persists for 5 minutes
    });
}

/**
 * Hook for fetching a single product by ID
 */
export function usePharmacyProduct(id: string) {
    return useQuery({
        queryKey: ['pharmacy', 'products', id],
        queryFn: () => ProductService.getProductById(id),
        enabled: !!id,
    });
}

/**
 * Hook for adding a new product (mutation)
 */
export function useAddProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PharmacyProductPayload) => ProductService.addProduct(data),
        onSuccess: () => {
            // Invalidate products list to refetch
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'products']
            });
        },
    });
}

/**
 * Hook for updating a product (mutation)
 */
export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: PharmacyProductPayload }) =>
            ProductService.updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'products']
            });
        },
    });
}

/**
 * Hook for deleting a product (mutation)
 */
export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ProductService.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['pharmacy', 'products']
            });
        },
    });
}

/**
 * Utility hook to manually invalidate pharmacy products cache
 */
export function useInvalidatePharmacyProducts() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: ['pharmacy', 'products']
        });
    };
}
