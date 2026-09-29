import { ADMIN_ENDPOINTS } from "../config";
import { apiClient } from "../api";
import type {
  DashboardStats,
  Hospital,
  Doctor,
  Patient,
  Helpdesk,
  Pharma,
  Labs,
  SupportTicket,
  CreateAdminRequest,
  CreateDoctorRequest,
  CreateHelpdeskRequest,
  CreatePharmaRequest,
  CreateLabsRequest,
  CreateHospitalRequest,
  AssignDoctorRequest,
  BroadcastRequest,
} from "../types";

export const adminService = {
  // Expose for custom/emergency calls
  apiClient,

  // ─── Dashboard & Analytics 
  /** GET /super-admin/stats */
  getDashboardClient: () =>
    apiClient<DashboardStats>(ADMIN_ENDPOINTS.DASHBOARD),

  /** GET /super-admin/analytics */
  getAnalyticsClient: (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.append("range", params.range);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    return apiClient<any>(`${ADMIN_ENDPOINTS.ANALYTICS}${qs ? `?${qs}` : ""}`);
  },

  /** GET /super-admin/auth-logs */
  getAuthLogsClient: (params?: {
    page?: number;
    limit?: number;
    hospital?: string;
    role?: string;
    status?: string;
    grouped?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.hospital) query.append("hospital", params.hospital);
    if (params?.role) query.append("role", params.role);
    if (params?.status) query.append("status", params.status);
    if (params?.grouped) query.append("grouped", "true");
    const qs = query.toString();
    return apiClient<any>(`${ADMIN_ENDPOINTS.AUTH_LOGS}${qs ? `?${qs}` : ""}`);
  },

  /** GET /super-admin/auth-log-filters */
  getAuthLogFiltersClient: () =>
    apiClient<{ success: boolean; data: { roles: string[]; hospitals: Array<{ _id: string; name: string }> } }>(ADMIN_ENDPOINTS.AUTH_LOG_FILTERS),

  // ─── Profile 
  /** GET /super-admin/profile */
  getAdminProfileClient: () => apiClient<any>(ADMIN_ENDPOINTS.PROFILE),

  /** PUT /super-admin/profile */
  updateAdminProfileClient: (data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.PROFILE, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // ─── Broadcast 
  /** POST /super-admin/broadcast */
  broadcastClient: (data: BroadcastRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.BROADCAST, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─── User Management 
  /** GET /super-admin/users?role= */
  getUsersClient: (params?: {
    role?: string;
    page?: number;
    limit?: number;
    search?: string;
    hospitalId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.role) query.append("role", params.role);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.hospitalId) query.append("hospitalId", params.hospitalId);
    const qs = query.toString();
    return apiClient<any>(`${ADMIN_ENDPOINTS.USERS}${qs ? `?${qs}` : ""}`);
  },

  /** POST /super-admin/users */
  createUserClient: (data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_USER, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** PUT /super-admin/users/:id */
  updateUserClient: (id: string, data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.UPDATE_USER(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /** DELETE /super-admin/users/:id */
  deleteUserClient: (id: string) =>
    apiClient<void>(ADMIN_ENDPOINTS.DELETE_USER(id), { method: "DELETE" }),

  // ─── HR Management 

  /** GET /super-admin/hr-users */
  getHRUsersClient: () => apiClient<any[]>(ADMIN_ENDPOINTS.HR_USERS),

  /** POST /super-admin/seed-hr */
  seedHRUsersClient: () =>
    apiClient<any>(ADMIN_ENDPOINTS.SEED_HR, {
      method: "POST",
    }),

  // ─── Role-specific user shortcuts 

  getDoctorsClient: () => apiClient<Doctor[]>(ADMIN_ENDPOINTS.DOCTORS),
  getPatientsClient: () => apiClient<Patient[]>(ADMIN_ENDPOINTS.PATIENTS),
  getHelpdesksClient: () => apiClient<Helpdesk[]>(ADMIN_ENDPOINTS.HELPDESKS),

  // ─── Hospital Admin Creation 

  /** POST /super-admin/create-hospital-admin */
  createAdminClient: (data: CreateAdminRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_ADMIN, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createHospitalAdminClient: (
    data: CreateAdminRequest & { hospitalId: string },
  ) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "hospital-admin" }),
    }),

  createDoctorClient: (data: CreateDoctorRequest) =>
    apiClient<Doctor>(ADMIN_ENDPOINTS.CREATE_DOCTOR, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "doctor" }),
    }),

  createHelpdeskClient: (data: CreateHelpdeskRequest) =>
    apiClient<Helpdesk>(ADMIN_ENDPOINTS.ASSIGN_HELPDESK, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "helpdesk" }),
    }),

  createPharmaClient: (data: CreatePharmaRequest) =>
    apiClient<Pharma>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "pharma-owner" }),
    }),

  createLabsClient: (data: CreateLabsRequest) =>
    apiClient<Labs>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "lab" }),
    }),

  // ─── Hospital Management

  /** GET /super-admin/hospitals */
  getHospitalsClient: () => apiClient<Hospital[]>(ADMIN_ENDPOINTS.HOSPITALS),

  /** POST /super-admin/create-hospital */
  createHospitalClient: (data: CreateHospitalRequest) => {
    const cleanData: any = { ...data };
    delete cleanData.hospitalId; // backend generates this

    // Normalise specialities field
    if (!cleanData.specialities?.length && cleanData.specialties?.length) {
      cleanData.specialities = cleanData.specialties;
      delete cleanData.specialties;
    }

    if (cleanData.ambulanceAvailability !== undefined) {
      cleanData.ambulanceAvailability = Boolean(
        cleanData.ambulanceAvailability,
      );
    }

    // Strip undefined values
    Object.keys(cleanData).forEach((key) => {
      if (cleanData[key] === undefined) delete cleanData[key];
    });

    return apiClient<Hospital>(ADMIN_ENDPOINTS.CREATE_HOSPITAL, {
      method: "POST",
      body: JSON.stringify(cleanData),
    });
  },

  /** PATCH /super-admin/hospitals/:id/status */
  updateHospitalStatusClient: (id: string, status: string, licenseStartDate?: string, licenseEndDate?: string, portalLicenses?: any) =>
    apiClient<Hospital>(ADMIN_ENDPOINTS.UPDATE_HOSPITAL_STATUS(id), {
      method: "PATCH",
      body: JSON.stringify({ status, licenseStartDate, licenseEndDate, portalLicenses }),
    }),

  /** GET /super-admin/hospitals/:id/personnel */
  getHospitalPersonnelClient: (id: string) =>
    apiClient<any>(ADMIN_ENDPOINTS.HOSPITAL_PERSONNEL(id)),

  /** POST /super-admin/hospitals/upload – Bulk hospital CSV/Excel upload */
  bulkHospitalsClient: (formData: FormData) =>
    apiClient<any>(ADMIN_ENDPOINTS.BULK_HOSPITALS, {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set multipart boundary
    }),

  // Legacy hospital update/delete (hospital-admin routes)
  updateHospitalClient: (id: string, data: Partial<CreateHospitalRequest>) =>
    apiClient<Hospital>("/hospital/hospital", {
      method: "PUT",
      body: JSON.stringify({ ...data, hospitalId: id }),
      headers: { "x-hospital-id": id },
    }),

  deleteHospitalClient: (id: string) =>
    apiClient<void>(ADMIN_ENDPOINTS.DELETE_HOSPITAL(id), { method: "DELETE" }),

  // ─── Ambulance Personnel 

  /** GET /super-admin/emergency-users */
  getEmergencyUsersClient: () =>
    apiClient<any[]>(ADMIN_ENDPOINTS.EMERGENCY_USERS),

  /** POST /super-admin/emergency-users */
  createEmergencyUserClient: (data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_EMERGENCY_USER, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** PUT /super-admin/emergency-users/:id */
  updateEmergencyUserClient: (id: string, data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.UPDATE_EMERGENCY_USER(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /** DELETE /super-admin/emergency-users/:id */
  deleteEmergencyUserClient: (id: string) =>
    apiClient<void>(ADMIN_ENDPOINTS.DELETE_EMERGENCY_USER(id), {
      method: "DELETE",
    }),

  // ─── Legacy / Misc 

  assignDoctorClient: (data: AssignDoctorRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.ASSIGN_DOCTOR, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        doctorId: data.doctorProfileId || data.doctorId,
        doctorProfileId: data.doctorProfileId || data.doctorId,
      }),
    }),

  getHospitalWithDoctorsClient: (id: string) =>
    apiClient<Hospital>(ADMIN_ENDPOINTS.HOSPITAL_DETAILS(id)),

  getDoctorsByHospitalClient: (id: string) =>
    apiClient<any[]>(ADMIN_ENDPOINTS.HOSPITAL_DOCTORS(id)),

  getSupportRequestsClient: () =>
    apiClient<SupportTicket[]>(ADMIN_ENDPOINTS.SUPPORT_REQUESTS),

  // ─── Leave Management 

  requestLeaveClient: (data: any) =>
    apiClient<any>("/leaves/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getLeavesClient: () => apiClient<{ leaves: any[] }>("/leaves?all=true"),

  updateLeaveStatusClient: (id: string, data: any) =>
    apiClient<any>(`/leaves/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getLeaveByIdClient: (id: string) =>
    apiClient<{ leave: any }>(`/leaves/${id}`),

  getMyLeavesClient: () => apiClient<{ leaves: any[] }>("/leaves/my"),
};

