import { HOSPITAL_ADMIN_ENDPOINTS } from "../config";
import { apiClient, invalidateCachePattern } from "../api";
import type {
  Hospital,
  Doctor,
  Helpdesk,
  CreateDoctorRequest,
  CreateHospitalRequest,
  CreateHospitalHelpdeskRequest,
  AttendanceRecord,
  AttendanceStats,
  HospitalAdminDashboard,
  HospitalAdminPatient,
} from "../types";

export const hospitalAdminService = {
  // Dashboard - Enhanced with fallback data fetching
  getDashboard: async (filters?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    visitType?: string;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.range) queryParams.append("range", filters.range);
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.doctorId) queryParams.append("doctorId", filters.doctorId);
      if (filters?.visitType) queryParams.append("visitType", filters.visitType);

      const url = `${HOSPITAL_ADMIN_ENDPOINTS.DASHBOARD}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      // Try main dashboard endpoint first
      const dashboardData = await apiClient<HospitalAdminDashboard>(url);

      // Return dashboard data directly - heavy fallback removed for performance
      if (!dashboardData) {
        return {
          hospital: {},
          stats: {
            totalDoctors: 0,
            totalNurses: 0,
            totalStaff: 0,
            totalHelpdesk: 0,
            totalPatients: 0,
            activeAppointments: 0,
            todayAttendance: 0,
            pendingLeaves: 0,
            monthlyRevenue: 0,
            totalLabRequests: 0,
            totalPharmaSales: 0,
            totalInpatients: 0,
            totalAdmissions: 0,
            bedOccupancy: 0,
            avgPatientWaitTime: 0,
            avgConsultationTime: 0,
          },
          liveQueue: [],
        };
      }

      return dashboardData;
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      // Return empty structure on error
      return {
        hospital: {},
        stats: {
          totalDoctors: 0,
          totalHelpdesk: 0,
          totalPatients: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          revenue: 0,
          attendance: { present: 0, late: 0, absent: 0, onLeave: 0 },
          totalLabRequests: 0,
          totalPharmaSales: 0,
          totalInpatients: 0,
          totalAdmissions: 0,
          bedOccupancy: 0,
          avgPatientWaitTime: 0,
          avgConsultationTime: 0,
        },
        liveQueue: [],
      };
    }
  },

  // Hospital
  getHospital: () =>
    apiClient<{ hospital: Hospital }>(HOSPITAL_ADMIN_ENDPOINTS.HOSPITAL),

  updateHospital: (data: Partial<CreateHospitalRequest> | FormData) => {
    console.log(
      "[hospitalAdminService.updateHospital] Updating hospital. Is FormData?",
      data instanceof FormData,
    );
    if (!(data instanceof FormData)) {
      console.log("[hospitalAdminService.updateHospital] Payload:", data);
    }
    return apiClient<Hospital>(HOSPITAL_ADMIN_ENDPOINTS.HOSPITAL, {
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  },

  getHospitalStaffCounts: async () => {
    try {
      console.log(
        "[hospitalAdminService.getHospitalStaffCounts] Fetching staff counts...",
      );
      const [doctorsRes, nursesRes] = await Promise.all([
        hospitalAdminService.getDoctors(),
        hospitalAdminService.getNurses(),
      ]);
      console.log(
        "[hospitalAdminService.getHospitalStaffCounts] Doctors raw:",
        doctorsRes,
      );
      console.log(
        "[hospitalAdminService.getHospitalStaffCounts] Nurses raw:",
        nursesRes,
      );

      const count = {
        doctors: doctorsRes.doctors?.length || 0,
        nurses: nursesRes.nurses?.length || 0,
        total:
          (doctorsRes.doctors?.length || 0) + (nursesRes.nurses?.length || 0),
      };
      console.log(
        "[hospitalAdminService.getHospitalStaffCounts] Calculated:",
        count,
      );
      return count;
    } catch (e) {
      console.error(
        "[hospitalAdminService.getHospitalStaffCounts] Failed to fetch staff counts",
        e,
      );
      return { doctors: 0, nurses: 0, total: 0 };
    }
  },

  getHospitalMetadata: (options?: { skipCache?: boolean }) =>
    apiClient<{
      success: boolean;
      data: {
        departments: Array<{ name: string; code: string; _id: string }>;
        rooms: Array<{ label: string; type: string; _id: string }>;
        unitTypes?: string[];
        wardTypes?: string[];
        billingCategories: string[];
        clinicalNoteTypes?: string[];
        clinicalNoteVisibilities?: string[];
        ipdPharmaSettings?: { enabledWards: string[] };
        minEscalationMinutes?: number;
      };
    }>("/hospitals/metadata", options),
  
  getInfrastructureReadiness: () =>
    apiClient<{
      success: boolean;
      data: {
        isReady: boolean;
        counts: {
          departments: number;
          shifts: number;
          rooms: number;
          beds: number;
          vitalsThresholds: number;
        };
      };
    }>("/hospitals/readiness"),

  updateIPDPharmaSettings: (data: { enabledWards: string[] }) =>
    apiClient<{ success: boolean; data: { enabledWards: string[] } }>(
      "/hospitals/ipd-pharma-settings",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  // Doctors
  getDoctors: () =>
    apiClient<{ doctors: Doctor[] }>(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS),

  getDoctorById: async (id: string) => {
    const profile: any = await apiClient(
      HOSPITAL_ADMIN_ENDPOINTS.DOCTOR_DETAIL(id),
    );
    const user = profile.user || {};

    // Flatten structure: profile fields first, then user fields override where needed
    const doctor = {
      ...profile, // All profile fields (specialties, department, address, permissions, etc.)
      ...user, // User fields
      _id: user._id, // User ID serves as main ID for updates
      doctorProfileId: profile._id, // Keep profile ID reference
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
      doctorId: user.doctorId,
      role: "doctor",
      user: undefined, // Remove nested user object
      hospital: profile.hospital, // Keep hospital reference from profile
    };

    return { doctor };
  },

  createDoctor: async (data: CreateDoctorRequest) => {
    let res;
    // Ensure doctor is created for the hospital admin's hospital
    try {
      const hospitalResponse = await apiClient<{ hospital: Hospital }>(
        HOSPITAL_ADMIN_ENDPOINTS.HOSPITAL,
      );
      const hospitalId = hospitalResponse.hospital._id;

      res = await apiClient<Doctor>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_DOCTOR, {
        method: "POST",
        body: JSON.stringify({ ...data, hospitalId }),
      });
    } catch (error) {
      // Fallback: try without hospitalId if we can't get the hospital
      res = await apiClient<Doctor>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_DOCTOR, {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
    return res;
  },

  updateDoctor: async (id: string, data: Partial<CreateDoctorRequest>) => {
    const res = await apiClient<Doctor>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_DOCTOR(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
    return res;
  },

  // Deactivate doctor (soft delete - sets status to inactive)
  deactivateDoctor: async (id: string) => {
    const res = await apiClient<{ doctor: Doctor }>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_DOCTOR(id),
      {
        method: "PUT",
        body: JSON.stringify({ status: "inactive" }),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
    return res;
  },

  // Activate doctor (sets status to active)
  activateDoctor: async (id: string) => {
    const res = await apiClient<{ doctor: Doctor }>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_DOCTOR(id),
      {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
    return res;
  },

  // Permanent delete (removes doctor from hospital)
  deleteDoctor: async (id: string) => {
    const res = await apiClient<{ success: boolean; message: string }>(
      HOSPITAL_ADMIN_ENDPOINTS.DELETE_DOCTOR(id),
      {
        method: "DELETE",
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
    return res;
  },

  // Helpdesk
  getHelpdesks: () =>
    apiClient<{ helpdesks: Helpdesk[] }>(HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS),

  getHelpdeskById: async (id: string) => {
    const profile: any = await apiClient(
      HOSPITAL_ADMIN_ENDPOINTS.HELPDESK_DETAIL(id),
      { skipCache: true }
    );
    
    // The backend might return:
    // 1. A StaffProfile document (with a 'user' field)
    // 2. A User document (with an 'assignedStaff' field)
    const user = (profile.user && typeof profile.user === 'object') ? profile.user : 
                 (!profile.user && profile.role) ? profile : {};
    const staff = (profile.assignedStaff && typeof profile.assignedStaff === 'object') ? profile.assignedStaff :
                  (!profile.assignedStaff && profile.user) ? profile : {};

    return {
      helpdesk: {
        ...staff,
        ...user,
        _id: user._id || staff._id || profile._id,
        loginId: user.loginId || staff.loginId || profile.loginId || `HELP-${id.slice(-4)}`
      }
    };
  },

  createHelpdesk: async (data: CreateHospitalHelpdeskRequest) => {
    const res = await apiClient<Helpdesk>(
      HOSPITAL_ADMIN_ENDPOINTS.CREATE_HELPDESK,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS);
    return res;
  },

  updateHelpdesk: async (id: string, data: any) => {
    const res = await apiClient<Helpdesk>(
      HOSPITAL_ADMIN_ENDPOINTS.HELPDESK_DETAIL(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS);
    return res;
  },

  deleteHelpdesk: async (id: string) => {
    const res = await apiClient<{ message: string }>(
      HOSPITAL_ADMIN_ENDPOINTS.HELPDESK_DETAIL(id),
      {
        method: "DELETE",
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS);
    return res;
  },

  sendHelpdeskCredentials: (data: {
    helpdeskId: string;
    loginId: string;
    password: string;
  }) =>
    apiClient<{ success: boolean; message: string; email: string }>(
      "/hospital-admin/helpdesks/send-credentials",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  // Patients
  getPatients: () =>
    apiClient<{ patients: HospitalAdminPatient[] }>(
      HOSPITAL_ADMIN_ENDPOINTS.PATIENTS,
    ),

  // Nurses
  getNurses: () =>
    apiClient<{ nurses: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.NURSES),

  // HR Management
  getHR: () => apiClient<{ hrs: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.HR),

  createHR: async (data: any) => {
    const res = await apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_HR, {
      method: "POST",
      body: JSON.stringify(data),
    });
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HR);
    return res;
  },

  updateHR: async (id: string, data: any) => {
    const res = await apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.UPDATE_HR(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HR);
    return res;
  },

  deleteHR: async (id: string) => {
    const res = await apiClient<{ message: string }>(
      HOSPITAL_ADMIN_ENDPOINTS.DELETE_HR(id),
      {
        method: "DELETE",
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HR);
    return res;
  },

  deactivateHR: async (id: string) => {
    const res = await apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.UPDATE_HR(id), {
      method: "PUT",
      body: JSON.stringify({ status: "inactive" }),
    });
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HR);
    return res;
  },

  activateHR: async (id: string) => {
    const res = await apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.UPDATE_HR(id), {
      method: "PUT",
      body: JSON.stringify({ status: "active" }),
    });
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.HR);
    return res;
  },

  getHRById: async (id: string) => {
    return hospitalAdminService.getStaffById(id);
  },

  // Placeholders
  getPharma: () => apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.PHARMA),

  getLabs: () => apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.LABS),

  getStaff: () => apiClient<{ staff: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.STAFF),

  getDischargeStaff: () =>
    apiClient<{ staff: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.DISCHARGE_STAFF),

  getStaffById: async (id: string) => {
    // FORCE FRESH FETCH: skipCache to ensure edit form has latest data
    const profile: any = await apiClient(
      HOSPITAL_ADMIN_ENDPOINTS.STAFF_DETAIL(id),
      { skipCache: true },
    );
    const user = profile.user || {};

    // Flatten structure: profile fields first, then user fields override where needed
    const staff = {
      ...profile, // All profile fields (department, designation, skills, etc.)
      ...user, // User fields override (but we'll manually set the important ones)
      _id: user._id, // User ID serves as main ID for updates
      staffProfileId: profile._id, // Keep profile ID reference
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
      role: user.role,
      user: undefined, // Remove nested user object to avoid confusion
      hospital: profile.hospital, // Keep hospital reference from profile
    };

    return { staff };
  },

  createStaff: async (data: any) => {
    const res = await apiClient<any>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_STAFF, {
      method: "POST",
      body: JSON.stringify(data),
    });
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DISCHARGE_STAFF);
    return res;
  },

  updateStaff: async (id: string, data: any) => {
    const res = await apiClient<any>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_STAFF(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DISCHARGE_STAFF);
    return res;
  },

  deleteStaff: async (id: string) => {
    const res = await apiClient<{ message: string }>(
      HOSPITAL_ADMIN_ENDPOINTS.DELETE_STAFF(id),
      {
        method: "DELETE",
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.DISCHARGE_STAFF);
    return res;
  },

  deactivateStaff: async (id: string) => {
    const res = await apiClient<any>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_STAFF(id),
      {
        method: "PUT",
        body: JSON.stringify({ status: "inactive" }),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
    return res;
  },

  activateStaff: async (id: string) => {
    const res = await apiClient<any>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_STAFF(id),
      {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      },
    );
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
    invalidateCachePattern(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
    return res;
  },

  // Attendance Management
  getAttendance: (params?: {
    date?: string;
    status?: string;
    staffId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const url = new URL(
      HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE,
      window.location.origin,
    );
    if (params?.date) url.searchParams.set("date", params.date);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.staffId) url.searchParams.set("staffId", params.staffId);
    if (params?.startDate) url.searchParams.set("startDate", params.startDate);
    if (params?.endDate) url.searchParams.set("endDate", params.endDate);
    return apiClient<{ attendance: AttendanceRecord[] }>(
      url.pathname + url.search,
    );
  },

  getAttendanceSummary: () =>
    apiClient<{ summary: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_SUMMARY),

  getAttendanceStats: async (): Promise<{ stats: AttendanceStats }> => {
    try {
      const response = await apiClient<{ stats: AttendanceStats }>(
        HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_STATS,
      );
      return response;
    } catch (error) {
      console.error("Attendance stats fetch error:", error);
      // Return empty structure on error matching AttendanceStats interface
      return {
        stats: {
          totalStaff: 0,
          today: { present: 0, late: 0, absent: 0, onLeave: 0 },
          averageAttendance: 0,
          trend: [],
        },
      };
    }
  },

  getAttendanceById: (id: string) =>
    apiClient<{ attendance: AttendanceRecord }>(
      HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_DETAIL(id),
    ),

  updateAttendance: (id: string, data: Partial<AttendanceRecord>) =>
    apiClient<AttendanceRecord>(
      HOSPITAL_ADMIN_ENDPOINTS.UPDATE_ATTENDANCE(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  deleteAttendance: (id: string) =>
    apiClient<{ message: string }>(
      HOSPITAL_ADMIN_ENDPOINTS.DELETE_ATTENDANCE(id),
      {
        method: "DELETE",
      },
    ),

  // Announcements
  getAnnouncements: () =>
    apiClient<{ announcements: any[] }>("/announcements/hospital"),

  createAnnouncement: (data: any) =>
    apiClient<any>("/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAnnouncement: (id: string, data: any) =>
    apiClient<any>(`/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAnnouncement: (id: string) =>
    apiClient<{ message: string }>(`/announcements/${id}`, {
      method: "DELETE",
    }),

  // Transactions - Centralized from unified backend transaction model
  getTransactions: async (
    range?: string,
    startDate?: string,
    endDate?: string,
    type?: string,
    page: number = 1,
    limit: number = 10,
  ) => {
    try {
      const url = new URL(
        `${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.TRANSACTIONS}`,
      );
      if (range) url.searchParams.append("range", range);
      if (startDate) url.searchParams.append("startDate", startDate);
      if (endDate) url.searchParams.append("endDate", endDate);
      if (type) url.searchParams.append("type", type);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      console.log(
        "[hospitalAdminService.getTransactions] Fetching:",
        url.pathname + url.search,
      );

      const response = await apiClient<any>(url.pathname + url.search);

      // Return full response if available (includes pagination & totalRevenue)
      if (response && !Array.isArray(response) && response.data) {
        return response;
      }

      const transactions = Array.isArray(response)
        ? response
        : response.data || [];
      return transactions;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  },

  // Shifts
  getShifts: () => apiClient<any[]>("/hospital/shifts"),

  createShift: (data: any) =>
    apiClient<any>("/hospital/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateShift: (id: string, data: any) =>
    apiClient<any>(`/hospital/shifts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteShift: (id: string) =>
    apiClient<any>(`/hospital/shifts/${id}`, {
      method: "DELETE",
    }),

  getShiftStaff: (id: string) =>
    apiClient<any[]>(`/hospital/shifts/${id}/staff`),

  assignStaffToShift: (id: string, staffIds: string[]) =>
    apiClient<any>(`/hospital/shifts/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ staffIds }),
    }),

  // Payroll
  getPayroll: (startDate?: string, endDate?: string) => {
    let url = "/hospital/payroll";
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient<{ payrolls: any[]; pagination: any; hospital?: any }>(url);
  },

  generatePayroll: (fromDate: string, toDate: string, userId?: string) =>
    apiClient<any>("/hospital/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ fromDate, toDate, userId }),
    }),

  updatePayrollStatus: (
    id: string,
    status: string,
    paymentMethod?: string,
    transactionId?: string,
  ) =>
    apiClient<any>(`/hospital/payroll/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod, transactionId }),
    }),

  updatePayroll: (id: string, data: any) =>
    apiClient<any>(`/hospital/payroll/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePayroll: (id: string) =>
    apiClient<any>(`/hospital/payroll/${id}`, {
      method: "DELETE",
    }),

  getEmployeePayrollStats: (
    userId: string,
    startDate: string,
    endDate: string,
  ) => {
    const params = new URLSearchParams({ userId, startDate, endDate });
    return apiClient<{
      employee: any;
      period: { startDate: string; endDate: string };
      attendance: {
        totalDays: number;
        workingDays: number;
        weeklyOffDays: number;
        presentDays: number;
        paidLeaveDays: number;
        absentDays: number;
        attendanceRecords: any[];
      };
      salary: {
        monthlySalary: number;
        dayRate: number;
        earnedDays: number;
        netPayable: number;
      };
      existingPayroll: any | null;
    }>(`/hospital/payroll/employee-stats?${params.toString()}`);
  },

  generatePayrollForEmployee: (
    userId: string,
    fromDate: string,
    toDate: string,
  ) =>
    apiClient<any>("/hospital/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ fromDate, toDate, userId }),
    }),

  /**
   * Centralized Salary Distribution Utility
   * Matches Institutional 50/20/30 Model
   */
  calculatePayrollResolution: (
    gross: number,
    options: { hasPf?: boolean; hasEsi?: boolean } = {},
  ) => {
    const basic = Math.floor(gross * 0.5);
    const hra = Math.floor(gross * 0.2);
    const transport = Math.floor(gross * 0.05);
    const medical = Math.floor(gross * 0.05);
    const special = Math.max(0, gross - basic - hra - transport - medical);

    // Statutory Deductions (REMOVED as per active institutional policy)
    const pf = 0;
    const esi = 0;
    const pt = 0;

    const totalDeductions = pf + esi + pt;
    const net = gross - totalDeductions;

    return {
      breakdown: {
        basic,
        hra,
        transportAllowance: transport,
        medicalAllowance: medical,
        specialAllowance: special,
        salaryArrears: 0,
        bonus: 0,
        pf,
        esi,
        professionalTax: pt,
        salaryAdvance: 0,
        tds: 0,
      },
      ctc: {
        grossEarning: gross,
        pensionFund: options.hasPf ? Math.floor(basic * 0.0833) : 0,
        providentFund: options.hasPf ? Math.floor(basic * 0.0367) : 0,
        employerEsi:
          options.hasEsi && gross < 21000 ? Math.ceil(gross * 0.0325) : 0,
        totalCTC:
          gross +
          (options.hasPf ? Math.floor(basic * 0.12) : 0) +
          (options.hasEsi && gross < 21000 ? Math.ceil(gross * 0.0325) : 0),
      },
      netSalary: Math.round(net),
      totalDeductions,
    };
  },

  // Reminder Configuration
  getReminderConfig: () => apiClient<any>("/hospitals/reminders/config"),

  /** GET /hospital/auth-logs */
  getAuthLogs: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    userId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.status) query.append("status", params.status);
    if (params?.role) query.append("role", params.role);
    if (params?.userId) query.append("userId", params.userId);
    const qs = query.toString();
    return apiClient<any>(
      `${HOSPITAL_ADMIN_ENDPOINTS.AUTH_LOGS}${qs ? `?${qs}` : ""}`,
    );
  },

  /** GET /hospital/auth-log-filters */
  getAuthLogFilters: () => 
    apiClient<{ success: boolean; data: { roles: string[] } }>(HOSPITAL_ADMIN_ENDPOINTS.AUTH_LOG_FILTERS),

  updateReminderConfig: (data: any) =>
    apiClient<any>("/hospitals/reminders/config", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateBillingCategories: (categories: string[]) =>
    apiClient<{ success: boolean; data: string[] }>(
      "/hospitals/billing-categories",
      {
        method: "PATCH",
        body: JSON.stringify({ categories }),
      },
    ),

  updateClinicalNoteMetadata: (data: {
    types?: string[];
    visibilities?: string[];
  }) =>
    apiClient<{
      success: boolean;
      data: { types: string[]; visibilities: string[] };
    }>("/hospitals/clinical-notes-metadata", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Hourly Monitoring
  getPatientHourlyRecord: (admissionId: string) =>
    apiClient<any>(`/ipd/hourly-monitoring/${admissionId}`),

  getActiveAdmissions: () => apiClient<any[]>("/ipd/admissions/active"),

  // Charges Management
  getCharges: () =>
    apiClient<{ success: boolean; data: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.CHARGES),

  createCharge: (data: { category: string; description: string; amount: number; isActive?: boolean }) =>
    apiClient<{ success: boolean; data: any }>(HOSPITAL_ADMIN_ENDPOINTS.CHARGES, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCharge: (id: string, data: Partial<{ category: string; description: string; amount: number; isActive: boolean }>) =>
    apiClient<{ success: boolean; data: any }>(HOSPITAL_ADMIN_ENDPOINTS.CHARGE_DETAIL(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCharge: (id: string) =>
    apiClient<{ success: boolean; message: string }>(HOSPITAL_ADMIN_ENDPOINTS.CHARGE_DETAIL(id), {
      method: "DELETE",
    }),

  resetCharges: () =>
    apiClient<{ success: boolean; message: string; data: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.RESET_CHARGES, {
      method: "POST",
    }),
};
