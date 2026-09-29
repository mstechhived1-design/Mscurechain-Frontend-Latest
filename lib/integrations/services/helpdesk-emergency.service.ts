import { apiClient } from "../api/apiClient";
import { EmergencyRequest } from "../types/emergency";

// ─── Endpoint Map (mirrors backend emergencyRequestRoutes – hospital side) ───
const HELPDESK_EMERGENCY_ENDPOINTS = {
  GET_REQUESTS: "/emergency/requests/hospital",
  HOSPITAL_STATS: "/emergency/requests/hospital/stats",
  ACCEPT_REQUEST: (requestId: string) =>
    `/emergency/requests/${requestId}/accept`,
  REJECT_REQUEST: (requestId: string) =>
    `/emergency/requests/${requestId}/reject`,
} as const;

class HelpdeskEmergencyService {
  /** Get all emergency requests for the hospital */
  async getHospitalEmergencyRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ requests: EmergencyRequest[]; total?: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiClient(
      `${HELPDESK_EMERGENCY_ENDPOINTS.GET_REQUESTS}${qs ? `?${qs}` : ""}`,
    );
  }

  /** Get dashboard stats for the hospital emergency view */
  async getEmergencyStats(): Promise<any> {
    return apiClient(HELPDESK_EMERGENCY_ENDPOINTS.HOSPITAL_STATS);
  }

  /** Accept an emergency request */
  async acceptRequest(
    requestId: string,
    notes?: string,
  ): Promise<{ message: string; request: EmergencyRequest }> {
    return apiClient(HELPDESK_EMERGENCY_ENDPOINTS.ACCEPT_REQUEST(requestId), {
      method: "PUT",
      body: JSON.stringify({ notes }),
    });
  }

  /** Reject an emergency request */
  async rejectRequest(
    requestId: string,
    rejectionReason?: string,
  ): Promise<{ message: string; request: EmergencyRequest }> {
    return apiClient(HELPDESK_EMERGENCY_ENDPOINTS.REJECT_REQUEST(requestId), {
      method: "PUT",
      body: JSON.stringify({ rejectionReason }),
    });
  }
}

export const helpdeskEmergencyService = new HelpdeskEmergencyService();
