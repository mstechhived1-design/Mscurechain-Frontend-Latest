import { HR_ENDPOINTS, STAFF_ENDPOINTS } from "../config";
import { apiClient } from "../api";

export interface HRStats {
  totalStaff: number;
  breakdown: { role: string; count: number }[];
  recentStaff: any[];
  pendingLeaves: number;
  todayAttendance: number;
}

export interface HRStaffMember {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  createdAt: string;
  profile?: any;
}

export interface HRLeaveRequest {
  _id: string;
  requester: {
    _id: string;
    name: string;
    role: string;
    email: string;
    mobile: string;
  };
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  leaveType: string;
}

export const hrService = {
  getStats: () => apiClient<{ data: HRStats }>(HR_ENDPOINTS.STATS),

  getAllStaff: (params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.STAFF.BASE, window.location.origin);
    if (params?.role) url.searchParams.set("role", params.role);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: HRStaffMember[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getStaffDetails: (id: string) =>
    apiClient<{ data: HRStaffMember }>(HR_ENDPOINTS.STAFF.BY_ID(id)),

  createStaff: (data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      HR_ENDPOINTS.STAFF.BASE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateStaff: (id: string, data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      HR_ENDPOINTS.STAFF.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  deactivateStaff: (id: string) =>
    hrService.updateStaff(id, { status: "inactive" }),

  activateStaff: (id: string) =>
    hrService.updateStaff(id, { status: "active" }),

  getLeaves: (params?: {
    status?: string;
    page?: number;
    limit?: number;
    all?: boolean;
  }) => {
    let url = params?.all ? "/leaves?all=true" : STAFF_ENDPOINTS.LEAVES;
    const urlObj = new URL(url, window.location.origin);
    if (params?.status) urlObj.searchParams.set("status", params.status);
    if (params?.page) urlObj.searchParams.set("page", params.page.toString());
    if (params?.limit)
      urlObj.searchParams.set("limit", params.limit.toString());

    return apiClient<{ leaves: HRLeaveRequest[]; data?: HRLeaveRequest[] }>(
      urlObj.pathname + urlObj.search,
    );
  },

  requestLeave: (data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      STAFF_ENDPOINTS.CREATE_LEAVE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateLeaveStatus: (id: string, status: "approved" | "rejected") =>
    apiClient<{ success: boolean; message: string }>(`/leaves/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getAttendance: (params?: {
    date?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.ATTENDANCE, window.location.origin);
    if (params?.date) url.searchParams.set("date", params.date);
    if (params?.month) url.searchParams.set("month", params.month);
    
    // Pass ranges using multiple common naming conventions to ensure backend compatibility
    if (params?.startDate) {
      url.searchParams.set("startDate", params.startDate);
      url.searchParams.set("fromDate", params.startDate);
      url.searchParams.set("from", params.startDate);
    }
    if (params?.endDate) {
      url.searchParams.set("endDate", params.endDate);
      url.searchParams.set("toDate", params.endDate);
      url.searchParams.set("to", params.endDate);
    }
    
    if (params?.role) url.searchParams.set("role", params.role);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    
    return apiClient<{ attendance: any[]; data: any[]; stats: any; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getPayroll: (params?: {
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.PAYROLL, window.location.origin);
    if (params?.month) url.searchParams.set("month", params.month.toString());
    if (params?.year) url.searchParams.set("year", params.year.toString());
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getRecruitment: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.RECRUITMENT, window.location.origin);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  createRecruitmentRequest: (data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      "/recruitment/request",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateRecruitmentStatus: (id: string, status: string) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      `/recruitment/status/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  reviewRecruitmentRequest: (
    id: string,
    data: { status: string; rejectionReason?: string },
  ) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      `/recruitment/review/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  getPerformance: (params?: {
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.PERFORMANCE, window.location.origin);
    if (params?.month !== undefined)
      url.searchParams.set("month", params.month.toString());
    if (params?.year !== undefined)
      url.searchParams.set("year", params.year.toString());
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<any>(url.pathname + url.search);
  },

  getPerformanceDashboard: (params?: { month?: number; year?: number }) => {
    const url = new URL(
      HR_ENDPOINTS.PERFORMANCE_DASHBOARD,
      window.location.origin,
    );
    if (params?.month !== undefined)
      url.searchParams.set("month", params.month.toString());
    if (params?.year !== undefined)
      url.searchParams.set("year", params.year.toString());
    return apiClient<any>(url.pathname + url.search);
  },

  getDoctorPerformanceDashboard: (params?: {
    month?: number;
    year?: number;
  }) => {
    const url = new URL(
      HR_ENDPOINTS.DOCTOR_PERFORMANCE_DASHBOARD,
      window.location.origin,
    );
    if (params?.month !== undefined)
      url.searchParams.set("month", params.month.toString());
    if (params?.year !== undefined)
      url.searchParams.set("year", params.year.toString());
    return apiClient<any>(url.pathname + url.search);
  },

  submitPerformance: (data: any) =>
    apiClient<any>(HR_ENDPOINTS.PERFORMANCE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDocuments: (params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.DOCUMENTS, window.location.origin);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<any>(url.pathname + url.search);
  },

  uploadDocument: (data: {
    staffId: string;
    documentType: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append("staffId", data.staffId);
    formData.append("documentType", data.documentType);
    formData.append("document", data.file);

    return apiClient<any>(`${HR_ENDPOINTS.DOCUMENTS}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  deleteDocument: (params: {
    profileId: string;
    documentKey: string;
    role: string;
  }) => {
    return apiClient<any>(HR_ENDPOINTS.DOCUMENTS, {
      method: "DELETE",
      body: JSON.stringify(params),
    });
  },

  getTraining: (params?: { page?: number; limit?: number }) => {
    const url = new URL(HR_ENDPOINTS.TRAINING, window.location.origin);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  // Payroll Management by date range (used by payroll pages)
  getPayrollByDateRange: (
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20,
  ) => {
    let url = "/hr/payroll";
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient<{ payrolls: any[]; pagination: any; hospital?: any }>(url);
  },

  getPayrollById: (id: string) => apiClient<any>(`/hr/payroll/${id}`),

  generatePayroll: (fromDate: string, toDate: string, userId?: string) =>
    apiClient<any>("/hr/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ fromDate, toDate, userId }),
    }),

  updatePayrollStatus: (
    id: string,
    status: string,
    paymentMethod?: string,
    transactionId?: string,
  ) =>
    apiClient<any>(`/hr/payroll/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod, transactionId }),
    }),

  updatePayroll: (id: string, data: any) =>
    apiClient<any>(`/hr/payroll/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePayroll: (id: string) =>
    apiClient<any>(`/hr/payroll/${id}`, {
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
    }>(`/hr/payroll/employee-stats?${params.toString()}`);
  },

  getDoctors: async () => {
    const res = await apiClient<any>("/hr/staff?role=doctor");
    return { doctors: res.data || [] };
  },
  getStaff: async () => {
    const res = await apiClient<any>("/hr/staff?role=staff");
    return { staff: res.data || [] };
  },
  getNurses: async () => {
    const res = await apiClient<any>("/hr/staff?role=nurse");
    return { nurses: res.data || [] };
  },

  getStaffById: async (id: string) => {
    const res = await apiClient<any>(`/hr/staff/${id}`, { skipCache: true });
    const userData = res.data || res;
    const profile = userData.profile || {};

    // Flatten for UI compatibility (matches hospitalAdminService pattern)
    return {
      staff: {
        ...profile,
        ...userData,
        _id: userData._id || userData.id,
      },
    };
  },

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
};

