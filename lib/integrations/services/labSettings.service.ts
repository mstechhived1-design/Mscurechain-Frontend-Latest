import { apiClient } from '../api/apiClient';

export interface LabSettings {
    _id?: string;
    name: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    gstin?: string;
    website?: string;
    footerText?: string;
    labTerms?: string[];
}

export const LabSettingsService = {
    getSettings: async (): Promise<LabSettings> => {
        return apiClient<LabSettings>('/lab/settings');
    },
    updateSettings: async (settings: LabSettings): Promise<LabSettings> => {
        const response: any = await apiClient('/lab/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        return response.data;
    },

    uploadLogo: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('logo', file);

        const response: any = await apiClient('/lab/settings/logo', {
            method: 'POST',
            body: formData,
            // Header for multipart/form-data is set automatically by browser with boundary
        });
        return response.data || response; // Handle both wrapper or direct response
    }
};
