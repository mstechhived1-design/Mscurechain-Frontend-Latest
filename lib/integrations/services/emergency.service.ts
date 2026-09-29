import { emergencyApiClient } from "../api/emergencyApiClient";
import { apiClient } from "../api/apiClient";
import {
  EmergencyLoginResponse,
  EmergencyRequest,
  CreateEmergencyRequestData,
  Hospital,
} from "../types/emergency";

// ─── Endpoint Map (mirrors backend emergencyAuthRoutes + emergencyRequestRoutes) ───
const EMERGENCY_ENDPOINTS = {
  // Auth  â†’  /api/emergency/auth/*
  LOGIN: "/emergency/auth/login",
  LOGOUT: "/emergency/auth/logout",
  REFRESH: "/emergency/auth/refresh",
  ME: "/emergency/auth/me",

  // Requests  â†’  /api/emergency/requests/*
  CREATE_REQUEST: "/emergency/requests",
  CREATE_PATIENT_REQUEST: "/emergency/requests/patient",
  GET_PATIENT_REQUESTS: "/emergency/requests/patient/my-requests",
  MY_REQUESTS: "/emergency/requests/my-requests",
  HOSPITAL_REQUESTS: "/emergency/requests/hospital",
  HOSPITAL_STATS: "/emergency/requests/hospital/stats",
  GET_REQUEST_BY_ID: (id: string) => `/emergency/requests/${id}`,
  ACCEPT_REQUEST: (id: string) => `/emergency/requests/${id}/accept`,
  REJECT_REQUEST: (id: string) => `/emergency/requests/${id}/reject`,
  AVAILABLE_HOSPITALS: "/emergency/requests/hospitals",
} as const;

class EmergencyService {
  // ─── Auth 
  async login(
    identifier: string,
    password: string,
  ): Promise<EmergencyLoginResponse> {
    return emergencyApiClient<EmergencyLoginResponse>(
      EMERGENCY_ENDPOINTS.LOGIN,
      {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      },
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await emergencyApiClient(EMERGENCY_ENDPOINTS.LOGOUT, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return emergencyApiClient(EMERGENCY_ENDPOINTS.REFRESH, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(): Promise<{ user: any }> {
    return emergencyApiClient(EMERGENCY_ENDPOINTS.ME);
  }

  // ─── Emergency Requests (Ambulance Personnel) 

  /** Create an emergency request (ambulance personnel) */
  async createEmergencyRequest(data: CreateEmergencyRequestData): Promise<{
    message: string;
    request: EmergencyRequest;
  }> {
    return emergencyApiClient(EMERGENCY_ENDPOINTS.CREATE_REQUEST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Get all requests created by the current ambulance personnel */
  async getMyRequests(): Promise<{ requests: EmergencyRequest[] }> {
    return emergencyApiClient(EMERGENCY_ENDPOINTS.MY_REQUESTS);
  }

  /** Get all available hospitals (ambulance personnel) */
  async getAvailableHospitals(): Promise<{ hospitals: Hospital[] }> {
    return emergencyApiClient(EMERGENCY_ENDPOINTS.AVAILABLE_HOSPITALS);
  }

  // ─── Emergency Requests (Patient) 

  /** Create an emergency request as a patient (uses standard auth token) */
  async createPatientEmergencyRequest(data: {
    emergencyType: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    currentLocation: string;
    hospitalId?: string;
    hospitalIds?: string[];
    patientName?: string;
    patientAge?: number;
    patientGender?: string;
  }): Promise<{ message: string; request: EmergencyRequest }> {
    return apiClient(EMERGENCY_ENDPOINTS.CREATE_PATIENT_REQUEST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Get all emergency requests for the current patient */
  async getPatientEmergencyRequests(): Promise<{
    requests: EmergencyRequest[];
  }> {
    return apiClient(EMERGENCY_ENDPOINTS.GET_PATIENT_REQUESTS);
  }

  /** Get a single emergency request by ID */
  async getEmergencyRequestById(
    requestId: string,
  ): Promise<{ request: EmergencyRequest }> {
    return apiClient(EMERGENCY_ENDPOINTS.GET_REQUEST_BY_ID(requestId));
  }

  // ─── Emergency Requests (Helpdesk / Hospital) 

  /** Get all emergency requests for the hospital (helpdesk view) */
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
      `${EMERGENCY_ENDPOINTS.HOSPITAL_REQUESTS}${qs ? `?${qs}` : ""}`,
    );
  }

  /** Get dashboard stats for the hospital emergency view */
  async getEmergencyStats(): Promise<any> {
    return apiClient(EMERGENCY_ENDPOINTS.HOSPITAL_STATS);
  }

  /** Accept an emergency request (helpdesk) */
  async acceptRequest(
    requestId: string,
    notes?: string,
  ): Promise<{ message: string; request: EmergencyRequest }> {
    return apiClient(EMERGENCY_ENDPOINTS.ACCEPT_REQUEST(requestId), {
      method: "PUT",
      body: JSON.stringify({ notes }),
    });
  }

  /** Reject an emergency request (helpdesk) */
  async rejectRequest(
    requestId: string,
    rejectionReason?: string,
  ): Promise<{ message: string; request: EmergencyRequest }> {
    return apiClient(EMERGENCY_ENDPOINTS.REJECT_REQUEST(requestId), {
      method: "PUT",
      body: JSON.stringify({ rejectionReason }),
    });
  }
}

export const emergencyService = new EmergencyService();
