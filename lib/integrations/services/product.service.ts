import { apiClient, clearApiCache } from "../api/apiClient";
import { PharmacyProduct, PharmacyProductPayload } from "../types/product";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

export const ProductService = {
  // Add a new product
  addProduct: async (
    data: PharmacyProductPayload,
  ): Promise<PharmacyProduct> => {
    const payload = {
      ...data,
      brand: data.brandName,
      generic: data.genericName,
      stock: data.currentStock,
      minStock: data.minStockLevel,
      gstPercent: data.gst,
      unitCost: data.unitCost,
      name: data.name,
    };
    const res = await apiClient<PharmacyProduct>(
      PHARMACY_ENDPOINTS.PRODUCTS.BASE,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    clearApiCache(); // Clear cache to update dashboard stats
    return res;
  },

  // Get all products with optional filters
  getProducts: async (filters?: {
    search?: string;
    status?: string;
    supplier?: string;
    expiryStatus?: string;
    limit?: number;
  }): Promise<PharmacyProduct[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append("search", filters.search);
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.supplier) queryParams.append("supplier", filters.supplier);
    if (filters?.expiryStatus)
      queryParams.append("expiryStatus", filters.expiryStatus);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    // By default fetch all (high limit) for backward compatibility if needed, or stick to current behavior
    // The current implementation seemed to fetch all, effectively.
    // We'll keep this but note it might only get defaults.
    // Actually, let's keep this as 'all' or default limit if backend enforces one.

    const url = `${PHARMACY_ENDPOINTS.PRODUCTS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: any = await apiClient<any>(url);

    // Backend returns { success: true, data: [...] }
    const products = response.data || [];

    return products.map((p: any) => ({
      ...p,
      brandName: p.brand,
      genericName: p.generic,
      currentStock: p.stock,
      minStockLevel: p.minStock,
      gst: p.gstPercent,
      hsnCode: p.hsnCode,
      batchNumber: p.batchNumber,
      status:
        p.stock === 0
          ? "Out of Stock"
          : p.stock <= p.minStock
            ? "Low Stock"
            : "In Stock",
    }));
  },

  // Paginated version
  getProductsPaginated: async (
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      status?: string;
      supplier?: string;
      expiryStatus?: string;
    },
  ): Promise<{
    products: PharmacyProduct[];
    totalPages: number;
    currentPage: number;
    totalProducts: number;
  }> => {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (filters?.search) queryParams.append("search", filters.search);
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.supplier) queryParams.append("supplier", filters.supplier);
    if (filters?.expiryStatus)
      queryParams.append("expiryStatus", filters.expiryStatus);

    const url = `${PHARMACY_ENDPOINTS.PRODUCTS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: any = await apiClient<any>(url);

    const products = (response.data || []).map((p: any) => ({
      ...p,
      brandName: p.brand,
      genericName: p.generic,
      currentStock: p.stock,
      minStockLevel: p.minStock,
      gst: p.gstPercent,
      hsnCode: p.hsnCode,
      batchNumber: p.batchNumber,
      status:
        p.stock === 0
          ? "Out of Stock"
          : p.stock <= p.minStock
            ? "Low Stock"
            : "In Stock",
    }));

    return {
      products,
      totalPages: response.totalPages || 1,
      currentPage: response.currentPage || 1,
      totalProducts: response.total || 0,
    };
  },

  // Get single product
  getProductById: async (id: string): Promise<PharmacyProduct> => {
    return apiClient<PharmacyProduct>(PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id));
  },

  // Update a product
  updateProduct: async (
    id: string,
    data: Partial<PharmacyProductPayload>,
  ): Promise<PharmacyProduct> => {
    const payload = {
      ...data,
      brand: data.brandName,
      generic: data.genericName,
      stock: data.currentStock,
      minStock: data.minStockLevel,
      gstPercent: data.gst,
      unitCost: data.unitCost,
      name: data.name,
    };
    const res = await apiClient<PharmacyProduct>(
      PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    clearApiCache(); // Clear cache to update dashboard stats
    return res;
  },

  // Delete a product
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient<{ message: string }>(
      PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id),
      {
        method: "DELETE",
      },
    );
    clearApiCache(); // Clear cache to update dashboard stats
    return res;
  },

  // Delete all products
  deleteAllProducts: async (): Promise<{ message: string }> => {
    const res = await apiClient<{ message: string }>(
      PHARMACY_ENDPOINTS.PRODUCTS.BASE,
      {
        method: "DELETE",
      },
    );
    clearApiCache(); // Clear cache to update dashboard stats
    return res;
  },

  // Bulk add products
  bulkAddProducts: async (
    data: PharmacyProductPayload[],
  ): Promise<{ addedCount: number; errorCount: number; errors: any[] }> => {
    const res = await apiClient<{
      addedCount: number;
      errorCount: number;
      errors: any[];
    }>(PHARMACY_ENDPOINTS.PRODUCTS.BULK, {
      method: "POST",
      body: JSON.stringify(data),
    });
    clearApiCache(); // Clear cache to update dashboard stats
    return res;
  },
};
