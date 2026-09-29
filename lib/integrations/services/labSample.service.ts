import { apiClient } from '../api/apiClient';
import { LabSample, UpdateSamplePayload } from '../types/labSample';
import { LAB_ENDPOINTS } from '../config/endpoints';

export const LabSampleService = {
    getSamples: async (status: string = 'All Samples', skipCache: boolean = false): Promise<LabSample[]> => {
        // ✅ PERFORMANCE FIX: Reduced from limit=1000 to limit=100
        // This prevents massive payloads that block rendering
        // Use getSamplesPaginated() for proper pagination
        const response: any = await apiClient(`${LAB_ENDPOINTS.SAMPLES.BASE}?status=${status}&limit=100`, { skipCache });
        return response.data || [];
    },

    getEditedSamples: async (skipCache: boolean = false): Promise<LabSample[]> => {
        const response: any = await apiClient(`${LAB_ENDPOINTS.SAMPLES.BASE}?isEdited=true&limit=100`, { skipCache });
        return response.data || [];
    },

    // ✅ Lightweight count-only fetcher — always bypasses cache for accurate real-time counts
    getPendingCount: async (): Promise<number> => {
        const response: any = await apiClient(
            `${LAB_ENDPOINTS.SAMPLES.BASE}?status=Pending&page=1&limit=500`,
            { skipCache: true }
        );
        // Use server's total field if available, else count the returned array
        if (typeof response?.total === 'number') return response.total;
        return Array.isArray(response?.data) ? response.data.length : 0;
    },

    getSamplesPaginated: async (page: number = 1, limit: number = 10, status: string = 'All Samples'): Promise<{ samples: LabSample[], totalPages: number, currentPage: number, totalSamples: number }> => {
        const response: any = await apiClient(`${LAB_ENDPOINTS.SAMPLES.BASE}?status=${status}&page=${page}&limit=${limit}`);
        return {
            samples: response.data || [],
            totalPages: response.totalPages || 1,
            currentPage: response.currentPage || 1,
            totalSamples: response.total || 0
        };
    },

    getSampleById: async (id: string, skipCache: boolean = false): Promise<LabSample> => {
        return apiClient<LabSample>(LAB_ENDPOINTS.SAMPLES.BY_ID(id), { skipCache });
    },

    updateResults: async (id: string, payload: UpdateSamplePayload): Promise<{ message: string; sample: LabSample }> => {
        return apiClient<{ message: string; sample: LabSample }>(LAB_ENDPOINTS.SAMPLES.RESULTS(id), {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    collectSample: async (id: string): Promise<{ message: string; sample: LabSample }> => {
        return apiClient<{ message: string; sample: LabSample }>(LAB_ENDPOINTS.SAMPLES.STATUS(id), {
            method: 'PUT'
        });
    },

    finalizeOrder: async (id: string, payload: { totalAmount: number; items?: any[]; patientDetails?: any }): Promise<{ message: string; order: any; transaction: any }> => {
        return apiClient<{ message: string; order: any; transaction: any }>(`/lab/orders/${id}/finalize`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    payOrder: async (id: string, payload: { paymentMode: string; paymentDetails?: any; paidAmount?: number; balance?: number }): Promise<{ message: string; order: any }> => {
        return apiClient<{ message: string; order: any }>(`/lab/orders/${id}/pay`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    deleteSample: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(LAB_ENDPOINTS.SAMPLES.BY_ID(id), {
            method: 'DELETE'
        });
    },

    notifyDoctor: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(`/lab/orders/${id}/notify-doctor`, {
            method: 'POST'
        });
    },

    // ✅ Query key helpers for React Query
    queryKeys: {
        all: () => ['lab', 'samples'] as const,
        lists: () => ['lab', 'samples', 'list'] as const,
        list: (filters: { status?: string; page?: number; limit?: number }) =>
            ['lab', 'samples', 'list', filters] as const,
        details: () => ['lab', 'samples', 'detail'] as const,
        detail: (id: string) => ['lab', 'samples', 'detail', id] as const,
    }
};

