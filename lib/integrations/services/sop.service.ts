import { SOP_ENDPOINTS, API_CONFIG } from "../config";
import { apiClient } from "../api/apiClient";

export interface SOP {
    _id: string;
    name: string;
    category: string;
    version: number;
    fileUrl: string;
    fileName: string;
    status: 'Active' | 'Archived';
    lastUpdated: string;
    uploadedBy: {
        _id: string;
        name: string;
    };
    assignedRole: 'Staff' | 'Doctor' | 'Nurse';
    createdAt: string;
    isAcknowledged?: boolean;
}

export interface SOPReport {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    hasAcknowledged: boolean;
    acknowledgedAt?: string;
}

export interface SOPReportResponse {
    success: boolean;
    sopName: string;
    assignedRole: string;
    stats: {
        total: number;
        acknowledged: number;
        pending: number;
    };
    report: SOPReport[];
}

export const sopService = {
    /**
     * Upload a new SOP or a new version
     * @param formData Should contain 'sopFile', 'name', and 'category'
     */
    uploadSOP: async (formData: FormData) => {
        return apiClient<any>(SOP_ENDPOINTS.BASE, {
            method: 'POST',
            body: formData
        });
    },

    getSOPs: async (filters?: { category?: string; status?: string; search?: string }) => {
        let url = SOP_ENDPOINTS.BASE;
        const params = new URLSearchParams();
        if (filters) {
            if (filters.category && filters.category !== 'all') params.append('category', filters.category);
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
        }
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const response = await apiClient<{ success: boolean; sops: SOP[] }>(url);
        return response.sops;
    },

    archiveSOP: async (id: string) => {
        return apiClient<any>(SOP_ENDPOINTS.ARCHIVE(id), {
            method: 'PATCH'
        });
    },

    getHistory: async (name: string) => {
        const response = await apiClient<{ success: boolean; history: SOP[] }>(SOP_ENDPOINTS.HISTORY(name));
        return response.history;
    },

    fetchSignedUrl: async (id: string, isDownload: boolean = false) => {
        let url = SOP_ENDPOINTS.DOWNLOAD(id);
        if (isDownload) url += '?download=true';
        return apiClient<{ success: boolean; downloadUrl: string }>(url);
    },

    acknowledgeSOP: async (id: string) => {
        return apiClient<{ success: boolean; message: string }>(SOP_ENDPOINTS.ACKNOWLEDGE(id), {
            method: 'POST'
        });
    },

    getSOPReport: async (id: string) => {
        return apiClient<SOPReportResponse>(SOP_ENDPOINTS.REPORT(id));
    },

    /**
     * Update an existing SOP's metadata and optionally replace the document
     * @param id SOP ID
     * @param formData Should contain optional 'sopFile', 'name', 'category', and 'assignedRole'
     */
    updateSOP: async (id: string, formData: FormData) => {
        return apiClient<any>(SOP_ENDPOINTS.UPDATE(id), {
            method: 'PUT',
            body: formData
        });
    }
};
