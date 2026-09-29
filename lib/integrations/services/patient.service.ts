import { PATIENT_ENDPOINTS } from "../config";
import { apiClient } from "../api";
import type {
  PatientProfile,
  UpdatePatientProfileRequest,
} from "../types/patient";

export const patientService = {
  // Profile
  getProfile: () => apiClient<PatientProfile>(PATIENT_ENDPOINTS.PROFILE),

  getProfileById: (id: string) =>
    apiClient<PatientProfile>(PATIENT_ENDPOINTS.PROFILE_BY_ID(id)),

  updateProfile: (data: UpdatePatientProfileRequest) =>
    apiClient<PatientProfile>(PATIENT_ENDPOINTS.UPDATE_PROFILE, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Patient Dashboard Data
  getAppointments: () => apiClient<any>(PATIENT_ENDPOINTS.APPOINTMENTS),

  getPrescriptions: () => apiClient<any>(PATIENT_ENDPOINTS.PRESCRIPTIONS),

  getLabRecords: () => apiClient<any>(PATIENT_ENDPOINTS.LAB_RECORDS),

  getHelpdeskPrescriptions: () =>
    apiClient<any>(PATIENT_ENDPOINTS.HELPDESK_PRESCRIPTIONS),

  getDashboardData: (hospitalId?: string) => {
    const url = hospitalId
      ? `${PATIENT_ENDPOINTS.DASHBOARD_DATA}?hospitalId=${hospitalId}`
      : PATIENT_ENDPOINTS.DASHBOARD_DATA;
    return apiClient<any>(url);
  },

  getHospitals: () => apiClient<any>("/patients/hospitals"),

  // Patient search for incident forms
  searchPatients: (query: string, hospital?: string) => {
    const params = new URLSearchParams({ query });
    if (hospital) params.append("hospital", hospital);
    return apiClient<{
      patients: Array<{ _id: string; name: string; mobile: string; email?: string; age?: number; ageUnit?: string; gender?: string }>;
    }>(`/patients/search?${params.toString()}`);
  },

  // Get patient with bed/room info
  getPatientBedInfo: (patientId: string) =>
    apiClient<{
      patient: { _id: string; name: string };
      mrnNumber: string;
      bedNumber: string;
      roomNumber: string;
      message?: string;
    }>(`/patients/${patientId}/bed-info`),
};
