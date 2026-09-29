/**
 * Lab Service – Unified API layer
 * Mirrors: /api/lab/* routes (labRoutes.ts)
 *
 * Consolidates: labTest, labSample, labBilling, labDashboard, labSettings services
 */
import { apiClient } from "../api/apiClient";
import { LAB_ENDPOINTS } from "../config/endpoints";

// ─── Types
export interface LabTest {
  _id: string;
  name: string;
  code?: string;
  category?: string;
  department?: string;
  price: number;
  turnaroundTime?: string;
  description?: string;
  parameters?: TestParameter[];
  isActive?: boolean;
  createdAt?: string;
}

export interface TestParameter {
  _id?: string;
  name: string;
  unit?: string;
  normalRange?: string;
  type?: "numeric" | "text" | "boolean";
}

export interface LabOrder {
  _id: string;
  orderId?: string;
  patient?: { _id: string; name: string; mobile?: string };
  doctor?: { _id: string; name: string };
  tests: Array<{
    test: string | LabTest;
    status: string;
    result?: string;
    remarks?: string;
  }>;
  status:
    | "pending"
    | "sample_collected"
    | "processing"
    | "completed"
    | "cancelled";
  totalAmount?: number;
  paymentStatus?: "pending" | "paid";
  createdAt: string;
  sampleCollectedAt?: string;
  completedAt?: string;
}

export interface LabDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  todayOrders: number;
  revenue?: number;
  todayRevenue?: number;
}

export interface LabSettings {
  _id?: string;
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  gstin?: string;
  website?: string;
  footerText?: string;
}

export interface LabDepartment {
  _id: string;
  name: string;
  code?: string;
  description?: string;
}

// ─── Service 

export const labService = {
  // ─── Dashboard 

  /** GET /lab/dashboard-stats */
  getDashboardStats: async (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LabDashboardStats> => {
    const query = new URLSearchParams();
    if (params?.range) query.append("range", params.range);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    const response: any = await apiClient(
      `${LAB_ENDPOINTS.DASHBOARD.STATS}${qs ? `?${qs}` : ""}`,
    );
    return response.stats || response.data || response;
  },

  // ─── Tests (Catalog) 

  /** GET /lab/tests */
  getTests: async (params?: {
    department?: string;
    search?: string;
  }): Promise<LabTest[]> => {
    const query = new URLSearchParams();
    if (params?.department) query.append("department", params.department);
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    const response: any = await apiClient(
      `${LAB_ENDPOINTS.TESTS.BASE}${qs ? `?${qs}` : ""}`,
    );
    return response.tests || response.data || response || [];
  },

  /** GET /lab/tests/:id */
  getTestById: async (id: string): Promise<LabTest> => {
    const response: any = await apiClient(LAB_ENDPOINTS.TESTS.BY_ID(id));
    return response.test || response;
  },

  /** GET /lab/tests/:id/parameters */
  getTestParameters: async (id: string): Promise<TestParameter[]> => {
    const response: any = await apiClient(LAB_ENDPOINTS.TESTS.PARAMETERS(id));
    return response.parameters || response || [];
  },

  /** POST /lab/tests */
  createTest: async (
    data: Omit<LabTest, "_id" | "createdAt">,
  ): Promise<{ message: string; test: LabTest }> => {
    return apiClient(LAB_ENDPOINTS.TESTS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PUT /lab/tests/:id */
  updateTest: async (
    id: string,
    data: Partial<LabTest>,
  ): Promise<{ message: string; test: LabTest }> => {
    return apiClient(LAB_ENDPOINTS.TESTS.BY_ID(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /lab/tests/:id */
  deleteTest: async (id: string): Promise<{ message: string }> => {
    return apiClient(LAB_ENDPOINTS.TESTS.BY_ID(id), { method: "DELETE" });
  },

  /** DELETE /lab/tests/destroy/all */
  deleteAllTests: async (): Promise<{ message: string }> => {
    return apiClient(LAB_ENDPOINTS.TESTS.DESTROY_ALL, { method: "DELETE" });
  },

  // ─── Orders (Workflow) 

  /** GET /lab/orders?status=&page=&limit= */
  getOrders: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    skipCache?: boolean;
    isEdited?: boolean;
  }): Promise<{
    data: LabOrder[];
    currentPage: number;
    totalPages: number;
    total: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All Samples")
      query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit || 20));
    if (params?.isEdited) query.append("isEdited", "true");
    const qs = query.toString();
    const response: any = await apiClient(
      `${LAB_ENDPOINTS.SAMPLES.BASE}${qs ? `?${qs}` : ""}`,
      { skipCache: params?.skipCache },
    );
    return {
      data: response.data || response.orders || [],
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
    };
  },

  /** GET /lab/orders/:id */
  getOrderById: async (id: string, skipCache = false): Promise<LabOrder> => {
    const response: any = await apiClient(LAB_ENDPOINTS.SAMPLES.BY_ID(id), {
      skipCache,
    });
    return response.order || response;
  },

  /** POST /lab/orders – Create order (lab role) */
  createOrder: async (data: {
    patientId: string;
    doctorId?: string;
    tests: string[];
    notes?: string;
  }): Promise<{ message: string; order: LabOrder }> => {
    return apiClient(LAB_ENDPOINTS.SAMPLES.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PUT /lab/orders/:id/collect – Collect sample */
  collectSample: async (
    id: string,
  ): Promise<{ message: string; order: LabOrder }> => {
    return apiClient(LAB_ENDPOINTS.SAMPLES.STATUS(id), { method: "PUT" });
  },

  /** PUT /lab/orders/:id/results – Enter results */
  enterResults: async (
    id: string,
    payload: {
      results: Array<{ testId: string; result: string; remarks?: string }>;
    },
  ): Promise<{ message: string; order: LabOrder }> => {
    return apiClient(LAB_ENDPOINTS.SAMPLES.RESULTS(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** POST /lab/orders/:id/notify-doctor */
  notifyDoctor: async (id: string): Promise<{ message: string }> => {
    return apiClient(`/lab/orders/${id}/notify-doctor`, { method: "POST" });
  },

  /** PUT /lab/orders/:id/finalize */
  finalizeOrder: async (
    id: string,
    payload: { totalAmount: number; items?: any[]; patientDetails?: any },
  ): Promise<{ message: string; order: LabOrder; transaction: any }> => {
    return apiClient(`/lab/orders/${id}/finalize`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** POST /lab/orders/:id/pay */
  payOrder: async (
    id: string,
    payload: { paymentMode: string; paymentDetails?: any; paidAmount?: number; balance?: number },
  ): Promise<{ message: string; order: LabOrder }> => {
    return apiClient(`/lab/orders/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** DELETE /lab/orders/:id */
  deleteOrder: async (id: string): Promise<{ message: string }> => {
    return apiClient(LAB_ENDPOINTS.SAMPLES.BY_ID(id), { method: "DELETE" });
  },

  // ─── Invoices / Billing 

  /** GET /lab/invoices?page=&limit= */
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    skipCache?: boolean;
  }): Promise<{ bills: any[]; totalPages: number; currentPage: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    return apiClient(`${LAB_ENDPOINTS.BILLING.BASE}${qs ? `?${qs}` : ""}`, {
      skipCache: params?.skipCache,
    });
  },

  /** GET /lab/orders/:id/invoice */
  generateInvoice: async (orderId: string): Promise<any> => {
    return apiClient(LAB_ENDPOINTS.BILLING.BY_ID(orderId));
  },

  /** DELETE /lab/invoices/:id */
  deleteInvoice: async (id: string): Promise<{ message: string }> => {
    return apiClient(`/lab/invoices/${id}`, { method: "DELETE" });
  },

  // ─── Reports 

  /** GET /lab/reports/:sampleId */
  generateReport: async (sampleId: string): Promise<any> => {
    return apiClient(`/lab/reports/${sampleId}`);
  },

  /** GET /lab/reports/:sampleId/with-billing */
  generateReportWithBilling: async (sampleId: string): Promise<any> => {
    return apiClient(`/lab/reports/${sampleId}/with-billing`);
  },

  // ─── Departments 

  /** GET /lab/departments */
  getDepartments: async (): Promise<LabDepartment[]> => {
    const response: any = await apiClient(LAB_ENDPOINTS.DEPARTMENTS.BASE);
    return response.departments || response || [];
  },

  /** POST /lab/departments */
  createDepartment: async (data: {
    name: string;
    code?: string;
    description?: string;
  }): Promise<{ message: string; department: LabDepartment }> => {
    return apiClient(LAB_ENDPOINTS.DEPARTMENTS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PUT /lab/departments/:id */
  updateDepartment: async (
    id: string,
    data: Partial<LabDepartment>,
  ): Promise<{ message: string; department: LabDepartment }> => {
    return apiClient(LAB_ENDPOINTS.DEPARTMENTS.BY_ID(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /lab/departments/:id */
  deleteDepartment: async (id: string): Promise<{ message: string }> => {
    return apiClient(LAB_ENDPOINTS.DEPARTMENTS.BY_ID(id), {
      method: "DELETE",
    });
  },

  // ─── Meta 

  /** GET /lab/meta */
  getMetaOptions: async (): Promise<any> => {
    return apiClient(LAB_ENDPOINTS.META);
  },

  // ─── Settings 

  /** GET /lab/settings */
  getSettings: async (): Promise<LabSettings> => {
    const response: any = await apiClient("/lab/settings");
    return response.data || response;
  },

  /** PUT /lab/settings */
  updateSettings: async (
    settings: Partial<LabSettings>,
  ): Promise<LabSettings> => {
    const response: any = await apiClient("/lab/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    return response.data || response;
  },

  /** POST /lab/settings/logo */
  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("logo", file);
    const response: any = await apiClient("/lab/settings/logo", {
      method: "POST",
      body: formData,
    });
    return response.data || response;
  },

  // ─── React Query key helpers 
  queryKeys: {
    all: () => ["lab"] as const,
    dashboard: () => ["lab", "dashboard"] as const,
    tests: (filters?: { department?: string; search?: string }) =>
      ["lab", "tests", filters] as const,
    testById: (id: string) => ["lab", "tests", id] as const,
    orders: (filters?: { status?: string; page?: number; limit?: number }) =>
      ["lab", "orders", filters] as const,
    orderById: (id: string) => ["lab", "orders", id] as const,
    invoices: (filters?: { page?: number; limit?: number }) =>
      ["lab", "invoices", filters] as const,
    departments: () => ["lab", "departments"] as const,
    settings: () => ["lab", "settings"] as const,
    meta: () => ["lab", "meta"] as const,
  },
};
