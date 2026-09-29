import { DOCTOR_ENDPOINTS } from "../config";
import { apiClient } from "../api";
import type {
  DoctorStats,
  DoctorAppointment,
  DoctorPatient,
} from "../types/doctor";

export interface DoctorDashboard {
  stats: {
    totalPatients: number;
    appointmentsToday: number;
    pendingReports: number;
    consultationsValue: number;
  };
  appointments: Array<{
    id: string;
    patientName: string;
    patientId: string;
    mrn?: string;
    time: string;
    type: string;
    status: string;
    hospital: string;
  }>;
  recentPatients: Array<{
    id: string;
    name: string;
    mobile?: string;
    email?: string;
    lastVisit: Date;
  }>;
}

export const doctorService = {
  // Dashboard
  getDashboard: () => apiClient<DoctorDashboard>(DOCTOR_ENDPOINTS.DASHBOARD),

  // Profile
  getMe: () => apiClient<any>(DOCTOR_ENDPOINTS.PROFILE),
  getProfile: () => apiClient<any>(DOCTOR_ENDPOINTS.PROFILE),

  // Patients
  getMyPatients: () => apiClient<DoctorPatient[]>(DOCTOR_ENDPOINTS.MY_PATIENTS),

  getIncomeStats: (startDate?: string, endDate?: string) => {
    let url = DOCTOR_ENDPOINTS.INCOME_STATS;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient<any>(url);
  },

  getPatientDetails: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.PATIENT_DETAILS(id)),

  getAppointmentDetails: (id: string) =>
    apiClient<any>(`/doctor/appointments/${id}`),

  // Calendar
  getCalendarStats: (params?: {
    month?: number;
    year?: number;
    view?: string;
    startDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month.toString());
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.view) queryParams.append("view", params.view);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    const query = queryParams.toString();
    return apiClient<any>(
      `${DOCTOR_ENDPOINTS.CALENDAR_STATS}${query ? `?${query}` : ""}`,
    );
  },

  getCalendarAppointments: (params?: { date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append("date", params.date);
    const query = queryParams.toString();
    return apiClient<DoctorAppointment[]>(
      `${DOCTOR_ENDPOINTS.CALENDAR_APPOINTMENTS}${query ? `?${query}` : ""}`,
    );
  },

  // Quick Notes
  getQuickNotes: () => apiClient<any[]>(DOCTOR_ENDPOINTS.QUICK_NOTES),

  addQuickNote: (data: { text: string }) =>
    apiClient<any>(DOCTOR_ENDPOINTS.QUICK_NOTES, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteQuickNote: (id: string) =>
    apiClient<void>(`${DOCTOR_ENDPOINTS.QUICK_NOTES}/${id}`, {
      method: "DELETE",
    }),

  // Appointments
  startNextAppointment: () =>
    apiClient<any>(DOCTOR_ENDPOINTS.START_NEXT, {
      method: "POST",
    }),

  // Consultation Workflow
  startConsultation: (appointmentId: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.START_CONSULTATION(appointmentId), {
      method: "POST",
    }),

  endConsultation: (appointmentId: string, data?: any) =>
    apiClient<any>(DOCTOR_ENDPOINTS.END_CONSULTATION(appointmentId), {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  saveConsultationDraft: (appointmentId: string, data: any) =>
    apiClient<any>(`/doctor/appointments/${appointmentId}/draft`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConsultationSummary: (appointmentId: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.CONSULTATION_SUMMARY(appointmentId)),

  createPrescription: (data: any) =>
    apiClient<any>(DOCTOR_ENDPOINTS.CREATE_PRESCRIPTION, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createLabToken: (data: any) =>
    apiClient<any>(DOCTOR_ENDPOINTS.CREATE_LAB_TOKEN, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createPharmacyToken: (data: any) =>
    apiClient<any>(DOCTOR_ENDPOINTS.CREATE_PHARMACY_TOKEN, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPrescriptionById: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_PRESCRIPTION(id)),

  getDermatologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_DERMATOLOGY(id)),

  getCardiologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_CARDIOLOGY(id)),

  getENTByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_ENT(id)),

  getPedsByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_PEDIATRICS(id)),

  getGynecologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_GYNECOLOGY(id)),

  getNeurologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_NEUROLOGY(id)),

  getGastroByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_GASTRO(id)),

  getNephrologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_NEPHROLOGY(id)),

  getUrologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_UROLOGY(id)),

  getRadiologyByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_RADIOLOGY(id)),

  getOrthopedicByPrescriptionId: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_ORTHOPEDICS(id)),

  getOncologyByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/oncology`),

  getPulmonologyByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/pulmonology`),

  getEndocrinologyByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/endocrinology`),

  getPsychiatryByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/psychiatry`),

  getHematologyByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/hematology`),

  getOphthalmologyByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/ophthalmology`),

  getDentistryByPrescriptionId: (id: string) =>
    apiClient<any>(`/doctor/prescriptions/${id}/dentistry`),

  getLabTokenById: (id: string) =>
    apiClient<any>(DOCTOR_ENDPOINTS.GET_LAB_TOKEN(id)),

  sendToHelpdesk: (data: {
    appointmentId: string;
    cloudinaryDocumentUrl?: string;
    cloudinaryLabTokenUrl?: string;
  }) =>
    apiClient<any>(DOCTOR_ENDPOINTS.SEND_TO_HELPDESK, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadDocument: (file: File | Blob, fileName: string) => {
    const formData = new FormData();
    formData.append("photo", file, fileName);
    return apiClient<any>(DOCTOR_ENDPOINTS.UPLOAD_PHOTO, {
      method: "POST",
      body: formData,
      // Note: apiClient needs to NOT set Content-Type if body is FormData
      headers: {},
    });
  },

  searchMedicines: (query: string) => {
    return apiClient<any>(
      `${DOCTOR_ENDPOINTS.SEARCH_MEDICINES}?query=${encodeURIComponent(query)}`,
    );
  },

  getLabTests: () => apiClient<any[]>("/lab/tests"),

  // Announcements
  getAnnouncements: () =>
    apiClient<{ announcements: any[] }>(DOCTOR_ENDPOINTS.ANNOUNCEMENTS),

  updateAppointmentStatus: (id: string, status: string) =>
    apiClient<any>(`/doctor/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Pause/Resume Consultation
  getPausedAppointments: () =>
    apiClient<any>(`/doctor/appointments/paused`),

  pauseConsultation: (appointmentId: string) =>
    apiClient<any>(`/doctor/appointments/${appointmentId}/pause`, {
      method: "POST",
    }),

  resumeConsultation: (appointmentId: string) =>
    apiClient<any>(`/doctor/appointments/${appointmentId}/resume`, {
      method: "POST",
    }),

  deleteAppointment: (appointmentId: string) =>
    apiClient<any>(`/doctor/appointments/${appointmentId}`, {
      method: "DELETE",
    }),

  searchPatients: (query: string) => {
    return apiClient<any>(
      `/helpdesk/patients/search?search=${encodeURIComponent(query)}`,
    );
  },

  getPatientHistory: (id: string, scope: 'hospital' | 'all' = 'hospital') =>
    apiClient<any>(`${DOCTOR_ENDPOINTS.PATIENT_HISTORY(id)}?scope=${scope}`),

  // ✅ New Profile Update (Client-side)
  updateProfile: (data: any) =>
    apiClient<any>(DOCTOR_ENDPOINTS.PROFILE, {
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  updateOnlineStatus: (isOnline: boolean) =>
    apiClient<any>(DOCTOR_ENDPOINTS.STATUS, {
      method: "PATCH",
      body: JSON.stringify({ isOnline }),
    }),
};
