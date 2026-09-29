import { apiClient } from '../api/apiClient';
import { LAB_ENDPOINTS } from '../config/endpoints';
import { LabInventory, LabInventoryPayload, InventoryImportResponse } from '../types/labInventory';

const EP = LAB_ENDPOINTS.INVENTORY;

export const LabInventoryService = {
    // Get list of inventory items (supports filter, search, sorting, pagination)
    getInventory: async (params: {
        search?: string;
        category?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    } = {}): Promise<{ data: LabInventory[]; pagination: { total: number; page: number; pages: number; limit: number } }> => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.category) queryParams.append('category', params.category);
        if (params.status) queryParams.append('status', params.status);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.page) queryParams.append('page', String(params.page));
        if (params.limit) queryParams.append('limit', String(params.limit));

        const qs = queryParams.toString();
        return apiClient<{ success: boolean; data: LabInventory[]; pagination: { total: number; page: number; pages: number; limit: number } }>(
            `${EP.BASE}${qs ? `?${qs}` : ''}`,
            { skipCache: true }
        ).then(res => ({ data: res.data || [], pagination: res.pagination }));
    },

    // Get single inventory item details
    getInventoryById: async (id: string): Promise<LabInventory> => {
        return apiClient<{ success: boolean; data: LabInventory }>(EP.BY_ID(id), { skipCache: true })
            .then(res => res.data);
    },

    // Create a new inventory item
    createInventoryItem: async (data: LabInventoryPayload): Promise<{ success: boolean; message: string; data: LabInventory }> => {
        return apiClient<{ success: boolean; message: string; data: LabInventory }>(EP.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update inventory item
    updateInventoryItem: async (id: string, data: LabInventoryPayload): Promise<{ success: boolean; message: string; data: LabInventory }> => {
        return apiClient<{ success: boolean; message: string; data: LabInventory }>(EP.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Soft delete inventory item
    deleteInventoryItem: async (id: string): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BY_ID(id), {
            method: 'DELETE',
        });
    },

    // Bulk soft delete
    bulkDelete: async (ids: string[]): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BULK_DELETE, {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    // Bulk Import (Excel/CSV parse records)
    bulkImport: async (records: any[]): Promise<InventoryImportResponse> => {
        return apiClient<InventoryImportResponse>(EP.BULK_IMPORT, {
            method: 'POST',
            body: JSON.stringify({ records }),
        });
    },

    // Upload an image to Cloudinary via backend settings endpoint
    uploadImage: async (formData: FormData): Promise<{ url: string }> => {
        return apiClient<{ url: string }>('/lab/settings/upload-image', {
            method: 'POST',
            body: formData,
        });
    }
};
