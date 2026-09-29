import { apiClient } from "../api";
import { Supplier, SupplierPayload } from "../types/supplier";
import { PharmacyProduct } from "../types/product";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

export const SupplierService = {
  getSuppliers: async (): Promise<Supplier[]> => {
    const response: any = await apiClient<any>(
      PHARMACY_ENDPOINTS.SUPPLIERS.BASE,
      {
        method: "GET",
      },
    );
    const suppliers = response.data || [];
    return suppliers.map((s: any) => ({
      ...s,
      address:
        s.address && typeof s.address === "object"
          ? `${s.address.street || ""}${s.address.landmark ? `, ${s.address.landmark}` : ""}, ${s.address.city || ""}, ${s.address.state || ""} - ${s.address.pincode || ""}`
              .replace(/^, |, , /g, "")
              .trim()
          : s.address,
    }));
  },

  getSuppliersPaginated: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    suppliers: Supplier[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.append("search", search);
    const url = `${PHARMACY_ENDPOINTS.SUPPLIERS.BASE}?${params.toString()}`;
    const response: any = await apiClient<any>(url, { method: "GET" });
    const mapAddress = (s: any) => ({
      ...s,
      address:
        s.address && typeof s.address === "object"
          ? `${s.address.street || ""}${s.address.landmark ? `, ${s.address.landmark}` : ""}, ${s.address.city || ""}, ${s.address.state || ""} - ${s.address.pincode || ""}`
              .replace(/^, |, , /g, "")
              .trim()
          : s.address,
    });
    return {
      suppliers: (response.data || []).map(mapAddress),
      total: response.total || 0,
      totalPages: response.totalPages || 1,
      currentPage: response.currentPage || page,
    };
  },

  getSupplierById: async (id: string): Promise<Supplier> => {
    return apiClient<Supplier>(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: "GET",
    });
  },

  createSupplier: async (
    data: SupplierPayload,
  ): Promise<{ message: string; supplier: Supplier }> => {
    return apiClient<{ message: string; supplier: Supplier }>(
      PHARMACY_ENDPOINTS.SUPPLIERS.BASE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  updateSupplier: async (
    id: string,
    data: Partial<SupplierPayload>,
  ): Promise<{ message: string; supplier: Supplier }> => {
    return apiClient<{ message: string; supplier: Supplier }>(
      PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },

  deleteSupplier: async (id: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(
      PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id),
      {
        method: "DELETE",
      },
    );
  },

  getSupplierProducts: async (id: string): Promise<PharmacyProduct[]> => {
    const response: any = await apiClient<any>(
      PHARMACY_ENDPOINTS.SUPPLIERS.PRODUCTS(id),
      {
        method: "GET",
      },
    );
    const products = response.data || [];
    return products.map((p: any) => ({
      ...p,
      brandName: p.brand,
      genericName: p.generic,
      currentStock: p.stock,
      minStockLevel: p.minStock,
    }));
  },

  getSupplierPurchases: async (filters?: {
    supplier?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (filters?.supplier && filters.supplier !== "all")
      queryParams.append("supplier", filters.supplier);
    if (filters?.search) queryParams.append("search", filters.search);
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);
    if (filters?.page) queryParams.append("page", filters.page.toString());
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());

    const url = `${PHARMACY_ENDPOINTS.SUPPLIERS.PURCHASES}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: any = await apiClient<any>(url, { method: "GET" });

    return {
      data: response.data || [],
      total: response.total || 0,
      totalPages: response.totalPages || 1,
      currentPage: response.currentPage || 1,
    };
  },
};
