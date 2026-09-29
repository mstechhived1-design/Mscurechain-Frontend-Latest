import { apiClient } from "@/lib/integrations/api/apiClient";

const BASE = "/masterhelpdesk/doctor-leaves";

export interface DoctorLeave {
  _id: string;
  doctor: { _id: string; name: string; mobile?: string; email?: string };
  doctorProfile?: { _id: string; specialties?: string[]; employeeId?: string };
  hospital: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: "sick" | "casual" | "emergency" | "maternity" | "vacation" | "other";
  status: "pending" | "approved" | "rejected";
  reviewedBy?: { _id: string; name: string; role: string };
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  activeToday: number;
}

const masterDoctorLeaveService = {
  getLeaves: async (params?: { doctorId?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.doctorId) query.append("doctorId", params.doctorId);
    if (params?.status)   query.append("status", params.status);
    if (params?.page)     query.append("page", String(params.page));
    if (params?.limit)    query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiClient<{ leaves: DoctorLeave[]; pagination: { total: number; page: number; pages: number } }>(
      `${BASE}${qs ? `?${qs}` : ""}`,
    );
  },

  getLeavesByDoctor: async (doctorId: string) => {
    const data = await apiClient<{ leaves: DoctorLeave[] }>(`${BASE}/doctor/${doctorId}`);
    return data?.leaves ?? [];
  },

  getLeaveById: async (leaveId: string) => {
    return apiClient<DoctorLeave>(`${BASE}/${leaveId}`);
  },

  getSummary: async () => {
    const data = await apiClient<{ summary: LeaveSummary }>(`${BASE}/summary`);
    return data?.summary;
  },

  createLeave: async (payload: {
    doctorId: string;
    startDate: string;
    endDate: string;
    reason: string;
    leaveType: string;
  }) => {
    return apiClient<{ message: string; leave: DoctorLeave }>(BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (leaveId: string, status: "approved" | "rejected", reviewNote?: string) => {
    return apiClient<{ message: string; leave: DoctorLeave }>(`${BASE}/${leaveId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewNote }),
    });
  },

  deleteLeave: async (leaveId: string) => {
    return apiClient<{ message: string }>(`${BASE}/${leaveId}`, { method: "DELETE" });
  },
};

export default masterDoctorLeaveService;
