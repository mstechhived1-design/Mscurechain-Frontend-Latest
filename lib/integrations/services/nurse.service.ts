import { apiClient } from "../api/apiClient";
import { NURSE_ENDPOINTS } from "../config/endpoints";

// ─── Types 

export interface NursePatient {
  _id: string;
  name: string;
  age: number;
  gender: string;
  mobile?: string;
  bedNumber?: string;
  ward?: string;
  status?: string;
  admissionDate?: string;
  diagnosis?: string;
  doctor?: { _id: string; name: string };
}

export interface NurseTask {
  _id: string;
  patientId: string;
  patientName: string;
  taskType: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  dueTime?: string;
  assignedBy?: string;
  notes?: string;
}

export interface NurseDashboardStats {
  totalPatients: number;
  pendingTasks: number;
  completedTasks: number;
  criticalPatients: number;
  todayAdmissions?: number;
  todayDischarges?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  total: number;
}

export interface PaginatedTaskResponse<T> extends PaginatedResponse<T> {
  isHistorical?: boolean;
}

// ─── Service 

export const NurseService = {
  // ─── Dashboard 

  /** GET /nurse/dashboard/stats */
  getDashboardStats: async (): Promise<NurseDashboardStats> => {
    const response: any = await apiClient(NURSE_ENDPOINTS.DASHBOARD.STATS);
    return (
      response.stats ||
      response.data ||
      response || {
        totalPatients: 0,
        pendingTasks: 0,
        completedTasks: 0,
        criticalPatients: 0,
      }
    );
  },

  // ─── Patients 
  /** GET /nurse/patients?page=&limit=&ward=&status= */
  getPatients: async (
    page = 1,
    limit = 20,
    filters?: { ward?: string; status?: string },
  ): Promise<PaginatedResponse<NursePatient>> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.ward) query.append("ward", filters.ward);
    if (filters?.status) query.append("status", filters.status);

    const response: any = await apiClient(
      `${NURSE_ENDPOINTS.PATIENTS.BASE}?${query.toString()}`,
    );
    return {
      data: response.data || response.patients || [],
      currentPage: response.currentPage || page,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
    };
  },

  /** GET /nurse/patients/:id */
  getPatientById: async (id: string): Promise<NursePatient> => {
    const response: any = await apiClient(NURSE_ENDPOINTS.PATIENTS.BY_ID(id));
    return response.patient || response;
  },

  // ─── Tasks 

  /** GET /nurse/tasks?page=&limit=&status=&priority=&date= */
  getTasks: async (
    page = 1,
    limit = 20,
    filters?: { status?: string; priority?: string; date?: string },
  ): Promise<PaginatedTaskResponse<NurseTask>> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.status) query.append("status", filters.status);
    if (filters?.priority) query.append("priority", filters.priority);
    if (filters?.date) query.append("date", filters.date);

    const response: any = await apiClient(
      `${NURSE_ENDPOINTS.TASKS.BASE}?${query.toString()}`,
    );
    return {
      success: response.success,
      data: response.data || response.tasks || [],
      currentPage: response.currentPage || page,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
      isHistorical: response.isHistorical,
    } as any;
  },

  /** PUT /nurse/tasks/:id  – update task status */
  updateTaskStatus: async (
    id: string,
    status: "Pending" | "In Progress" | "Completed" | "Cancelled",
    notes?: string,
  ): Promise<{ message: string; task?: NurseTask }> => {
    return apiClient(NURSE_ENDPOINTS.TASKS.UPDATE_STATUS(id), {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
  },

  // ─── Quick Notes (Clinical Note Templates) 
  getQuickNotes: async (): Promise<any[]> => {
    return apiClient(NURSE_ENDPOINTS.QUICK_NOTES);
  },

  addQuickNote: async (data: { text: string }): Promise<any> => {
    return apiClient(NURSE_ENDPOINTS.QUICK_NOTES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteQuickNote: async (id: string): Promise<void> => {
    return apiClient(`${NURSE_ENDPOINTS.QUICK_NOTES}/${id}`, {
      method: "DELETE",
    });
  },

  // ─── React Query key helpers 
  queryKeys: {
    all: () => ["nurse"] as const,
    dashboard: () => ["nurse", "dashboard"] as const,
    patients: (filters?: {
      page?: number;
      limit?: number;
      ward?: string;
      status?: string;
    }) => ["nurse", "patients", filters] as const,
    patientById: (id: string) => ["nurse", "patients", id] as const,
    tasks: (filters?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    }) => ["nurse", "tasks", filters] as const,
    taskById: (id: string) => ["nurse", "tasks", id] as const,
  },
};
