import { apiClient } from '../api/apiClient';
import { LAB_ENDPOINTS } from '../config/endpoints';
import { LabEquipment, LabEquipmentPayload, ImportResponse } from '../types/labEquipment';

const EP = LAB_ENDPOINTS.EQUIPMENT;

export const LabEquipmentService = {
    // Get list of equipment (supports filter, search, sorting, pagination)
    getEquipment: async (params: {
        search?: string;
        category?: string;
        department?: string;
        status?: string;
        brand?: string;
        showDeleted?: 'true' | 'only';
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    } = {}): Promise<{ data: LabEquipment[]; pagination: { total: number; page: number; pages: number; limit: number } }> => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.category) queryParams.append('category', params.category);
        if (params.department) queryParams.append('department', params.department);
        if (params.status) queryParams.append('status', params.status);
        if (params.brand) queryParams.append('brand', params.brand);
        if (params.showDeleted) queryParams.append('showDeleted', params.showDeleted);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.page) queryParams.append('page', String(params.page));
        if (params.limit) queryParams.append('limit', String(params.limit));

        const qs = queryParams.toString();
        return apiClient<{ success: boolean; data: LabEquipment[]; pagination: { total: number; page: number; pages: number; limit: number } }>(
            `${EP.BASE}${qs ? `?${qs}` : ''}`,
            { skipCache: true }
        ).then(res => ({ data: res.data || [], pagination: res.pagination }));
    },

    // Get single equipment details
    getEquipmentById: async (id: string): Promise<LabEquipment> => {
        return apiClient<{ success: boolean; data: LabEquipment }>(EP.BY_ID(id), { skipCache: true })
            .then(res => res.data);
    },

    // Create a new equipment
    createEquipment: async (data: LabEquipmentPayload): Promise<{ success: boolean; message: string; data: LabEquipment }> => {
        return apiClient<{ success: boolean; message: string; data: LabEquipment }>(EP.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update equipment
    updateEquipment: async (id: string, data: LabEquipmentPayload): Promise<{ success: boolean; message: string; data: LabEquipment }> => {
        return apiClient<{ success: boolean; message: string; data: LabEquipment }>(EP.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Soft delete equipment
    deleteEquipment: async (id: string): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BY_ID(id), {
            method: 'DELETE',
        });
    },

    // Restore soft deleted equipment (Admin Only)
    restoreEquipment: async (id: string): Promise<{ success: boolean; message: string; data: LabEquipment }> => {
        return apiClient<{ success: boolean; message: string; data: LabEquipment }>(EP.RESTORE(id), {
            method: 'POST',
        });
    },

    // Bulk soft delete
    bulkDelete: async (ids: string[]): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BULK_DELETE, {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    // Bulk restore (Admin Only)
    bulkRestore: async (ids: string[]): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BULK_RESTORE, {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    // Bulk status update
    bulkStatusUpdate: async (ids: string[], status: string): Promise<{ success: boolean; message: string }> => {
        return apiClient<{ success: boolean; message: string }>(EP.BULK_STATUS, {
            method: 'POST',
            body: JSON.stringify({ ids, status }),
        });
    },

    // Bulk Import (parsed records from Excel/CSV)
    bulkImport: async (records: any[]): Promise<ImportResponse> => {
        return apiClient<ImportResponse>(EP.BULK_IMPORT, {
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
