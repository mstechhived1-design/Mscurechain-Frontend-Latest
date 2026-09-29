import { INCIDENT_ENDPOINTS } from "../config/endpoints";
import { apiClient } from "../api/apiClient";
import { Incident } from "../types/incident";

export const incidentService = {
    reportIncident: async (data: any) => {
        // If data is FormData, send it directly without JSON.stringify
        // FormData is used for file uploads and multipart/form-data
        const isFormData = data instanceof FormData;

        return apiClient<any>(INCIDENT_ENDPOINTS.REPORT, {
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data)
        });
    },
    getIncidents: async (filters?: { startDate?: string; endDate?: string; department?: string; status?: string }) => {
        let url = INCIDENT_ENDPOINTS.ALL;
        if (filters) {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.department) params.append('department', filters.department);
            if (filters.status) params.append('status', filters.status);
            url += `?${params.toString()}`;
        }
        const response = await apiClient<{ success: boolean; incidents: Incident[] }>(url);
        return response.incidents;
    },
    respondToIncident: async (incidentId: string, data: any) => {
        return apiClient<any>(INCIDENT_ENDPOINTS.RESPOND(incidentId), {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
