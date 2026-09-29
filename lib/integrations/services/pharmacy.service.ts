/**
 * Pharmacy Service – Unified API layer
 * Mirrors: /api/pharmacy/* routes (pharmacyRoutes.ts)
 *
 * Consolidates: product, supplier, pharmacyBilling, pharmacyDashboard,
 *               pharmacyAnalytics services
 */
import { apiClient } from "../api/apiClient";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

// ─── Types ────────────────────────────────────────────────────────────

export interface PharmacyProduct {
  _id: string;
  name: string;
  genericName?: string;
  category?: string;
  manufacturer?: string;
  supplier?: string | PharmacySupplier;
  batchNumber?: string;
  expiryDate?: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  minStock?: number;
  hsnCode?: string;
  gstPct?: number;
  unit?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface PharmacySupplier {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  createdAt?: string;
}

export interface PharmacyInvoice {
  _id: string;
  invoiceNo?: string;
  patientName?: string;
  customerPhone?: string;
  items: Array<{
    drug?: string;
    productName: string;
    qty: number;
    unitRate: number;
    gstPct?: number;
    amount: number;
    hsnCode?: string;
  }>;
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  netPayable: number;
  paid: number;
  balance: number;
  mode: "CASH" | "CARD" | "UPI" | "CREDIT" | "MIXED";
  status: "PAID" | "PENDING" | "PARTIAL";
  createdAt: string;
}

export interface PharmacyOrder {
  _id: string;
  orderId?: string;
  patient?: { _id: string; name: string };
  items: Array<{ product: string; qty: number; price: number }>;
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount?: number;
  createdAt: string;
}

export interface PharmacyDashboardStats {
  requestedStats: {
    revenue: number;
    billCount: number;
    avgBillValue: number;
    itemsSold: number;
  };
  todayStats: {
    revenue: number;
    billCount: number;
    avgBillValue: number;
    itemsSold: number;
  };
  inventoryStats: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
  };
  paymentBreakdown: {
    Cash: number;
    Card: number;
    UPI: number;
    Credit: number;
    Mixed: number;
  };
  recentInvoices: any[];
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const normalizeDashboardResponse = (response: any): PharmacyDashboardStats => {
  const data = response.data || {};
  const requestedRange = data.requestedRange || data.today || {};
  const todayRange = data.today || {};
  return {
    requestedStats: {
      revenue: requestedRange.totalRevenue || 0,
      billCount: requestedRange.totalInvoices || 0,
      avgBillValue:
        requestedRange.totalInvoices > 0
          ? requestedRange.totalRevenue / requestedRange.totalInvoices
          : 0,
      itemsSold: requestedRange.itemsSold || 0,
    },
    todayStats: {
      revenue: todayRange.totalRevenue || 0,
      billCount: todayRange.totalInvoices || 0,
      avgBillValue:
        todayRange.totalInvoices > 0
          ? todayRange.totalRevenue / todayRange.totalInvoices
          : 0,
      itemsSold: todayRange.itemsSold || 0,
    },
    inventoryStats: {
      totalProducts: data.totalProducts || 0,
      lowStockCount: data.lowStockCount || 0,
      outOfStockCount: data.outOfStockCount || 0,
      expiringSoonCount: data.expiringSoonCount || 0,
    },
    paymentBreakdown: {
      Cash: data.paymentBreakdown?.CASH || 0,
      Card: data.paymentBreakdown?.CARD || 0,
      UPI: data.paymentBreakdown?.UPI || 0,
      Credit: data.paymentBreakdown?.CREDIT || 0,
      Mixed: data.paymentBreakdown?.MIXED || 0,
    },
    recentInvoices: (data.recentInvoices || []).map((inv: any) => ({
      ...inv,
      invoiceNumber: inv.invoiceNo || inv.invoiceNumber,
    })),
    topProducts: data.topProducts || [],
  };
};

// ─── Service ────────────────────────────────────────────────────────────

export const pharmacyService = {
  // ─── Profile & Auth ─────────────────────────────────────────────────────────

  /** GET /pharmacy/reports/dashboard - used as lightweight check */
  getMe: () => apiClient(PHARMACY_ENDPOINTS.REPORTS.DASHBOARD),

  // ─── Dashboard & Reports ─────────────────────────────────────────────────────

  /** GET /pharmacy/reports/dashboard */
  getDashboardStats: async (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PharmacyDashboardStats> => {
    const query = new URLSearchParams();
    if (params?.range) query.append("range", params.range);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.REPORTS.DASHBOARD}${qs ? `?${qs}` : ""}`,
    );
    return normalizeDashboardResponse(response);
  },

  /** GET /pharmacy/reports/sales */
  getSalesReport: async (params?: {
    startDate?: string;
    endDate?: string;
    range?: string;
  }): Promise<any> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.range) query.append("range", params.range);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.REPORTS.SALES}${qs ? `?${qs}` : ""}`,
    );
    return response.data || response;
  },

  /** GET /pharmacy/reports/inventory */
  getInventoryReport: async (): Promise<any> => {
    const response: any = await apiClient(PHARMACY_ENDPOINTS.REPORTS.INVENTORY);
    return response.data || response;
  },

  /** GET /pharmacy/reports/analytics */
  getAnalyticsData: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.REPORTS.ANALYTICS}${qs ? `?${qs}` : ""}`,
    );
    return response.data || response;
  },

  /** GET /pharmacy/reports/eod-sales */
  getEODItemWiseSales: async (date?: string): Promise<any> => {
    let url = "/pharmacy/reports/eod-sales";
    if (date) {
      url += `?date=${date}`;
    }
    const response: any = await apiClient(url);
    return response.data || response;
  },

  /** GET /pharmacy/transactions */
  getTransactions: async (): Promise<any[]> => {
    const response: any = await apiClient("/pharmacy/transactions");
    return response.data || response || [];
  },

  /** GET /pharmacy/audit-logs */
  getAuditLogs: async (
    page?: number,
    limit?: number,
    action?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> => {
    const query = new URLSearchParams();
    if (page) query.append("page", String(page));
    if (limit) query.append("limit", String(limit));
    if (action && action !== 'All Actions') query.append("action", action);
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.AUDITS}${qs ? `?${qs}` : ""}`,
    );
    return response.data || response || [];
  },

  // ─── Products (Inventory) ────────────────────────────────────────────────────

  /** GET /pharmacy/products?page=&limit=&search= */
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    hospitalId?: string;
  }): Promise<{
    data: PharmacyProduct[];
    currentPage: number;
    totalPages: number;
    total: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.category) query.append("category", params.category);
    if (params?.hospitalId) query.append("hospitalId", params.hospitalId);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.PRODUCTS.BASE}${qs ? `?${qs}` : ""}`,
    );
    return {
      data: response.data || response.products || [],
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
    };
  },

  /** GET /pharmacy/products/:id */
  getProductById: async (id: string): Promise<PharmacyProduct> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id),
    );
    return response.product || response;
  },

  /** GET /pharmacy/products/:id/substitutes */
  getGenericSubstitutes: async (id: string): Promise<PharmacyProduct[]> => {
    const response: any = await apiClient(`/pharmacy/products/${id}/substitutes`);
    return response.data || [];
  },

  /** POST /pharmacy/products */
  createProduct: async (
    data: Omit<PharmacyProduct, "_id" | "createdAt">,
  ): Promise<{ message: string; product: PharmacyProduct }> => {
    return apiClient(PHARMACY_ENDPOINTS.PRODUCTS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PUT /pharmacy/products/:id */
  updateProduct: async (
    id: string,
    data: Partial<PharmacyProduct>,
  ): Promise<{ message: string; product: PharmacyProduct }> => {
    return apiClient(PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /pharmacy/products/:id */
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    return apiClient(PHARMACY_ENDPOINTS.PRODUCTS.BY_ID(id), {
      method: "DELETE",
    });
  },

  /** POST /pharmacy/products/bulk – Bulk create products */
  bulkCreateProducts: async (
    products: Omit<PharmacyProduct, "_id" | "createdAt">[],
  ): Promise<{ message: string; count: number }> => {
    return apiClient(PHARMACY_ENDPOINTS.PRODUCTS.BULK, {
      method: "POST",
      body: JSON.stringify({ products }),
    });
  },

  /** POST /pharmacy/products/import – Import from Excel */
  importProducts: async (
    file: File,
  ): Promise<{ message: string; count: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient("/pharmacy/products/import", {
      method: "POST",
      body: formData,
    });
  },

  /** GET /pharmacy/products/export – Export to Excel */
  exportProducts: async (): Promise<Blob> => {
    return apiClient("/pharmacy/products/export");
  },

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  /** GET /pharmacy/suppliers */
  getSuppliers: async (): Promise<PharmacySupplier[]> => {
    const response: any = await apiClient(PHARMACY_ENDPOINTS.SUPPLIERS.BASE);
    return response.suppliers || response.data || response || [];
  },

  /** GET /pharmacy/suppliers/:id */
  getSupplierById: async (id: string): Promise<PharmacySupplier> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id),
    );
    return response.supplier || response;
  },

  /** GET /pharmacy/suppliers/:id/products */
  getProductsBySupplier: async (id: string): Promise<PharmacyProduct[]> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.SUPPLIERS.PRODUCTS(id),
    );
    return response.products || response.data || response || [];
  },

  /** POST /pharmacy/suppliers */
  createSupplier: async (
    data: Omit<PharmacySupplier, "_id" | "createdAt">,
  ): Promise<{ message: string; supplier: PharmacySupplier }> => {
    return apiClient(PHARMACY_ENDPOINTS.SUPPLIERS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PUT /pharmacy/suppliers/:id */
  updateSupplier: async (
    id: string,
    data: Partial<PharmacySupplier>,
  ): Promise<{ message: string; supplier: PharmacySupplier }> => {
    return apiClient(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /pharmacy/suppliers/:id */
  deleteSupplier: async (id: string): Promise<{ message: string }> => {
    return apiClient(PHARMACY_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: "DELETE",
    });
  },

  // ─── Billing / Invoices ───────────────────────────────────────────────────────

  /** GET /pharmacy/invoices?page=&limit= */
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    paymentMode?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    bills: PharmacyInvoice[];
    currentPage: number;
    totalPages: number;
    totalBills: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.paymentMode && params.paymentMode !== "All Methods")
      query.append("mode", params.paymentMode.toUpperCase());
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.BILLS.BASE}${qs ? `?${qs}` : ""}`,
    );
    return {
      bills: response.data || response.invoices || [],
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      totalBills: response.total || 0,
    };
  },

  /** GET /pharmacy/invoices/:id */
  getInvoiceById: async (id: string): Promise<PharmacyInvoice> => {
    const response: any = await apiClient(PHARMACY_ENDPOINTS.BILLS.BY_ID(id));
    return response.data || response.invoice || response;
  },

  /** POST /pharmacy/invoices */
  createInvoice: async (
    data: any,
  ): Promise<{ message: string; invoice: PharmacyInvoice }> => {
    return apiClient(PHARMACY_ENDPOINTS.BILLS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** DELETE /pharmacy/invoices/:id */
  deleteInvoice: async (id: string): Promise<{ message: string }> => {
    return apiClient(PHARMACY_ENDPOINTS.BILLS.BY_ID(id), { method: "DELETE" });
  },

  /** GET /pharmacy/invoices/export */
  exportInvoices: async (): Promise<Blob> => {
    return apiClient("/pharmacy/invoices/export");
  },

  // ─── Orders ──────────────────────────────────────────────────────────────

  /** GET /pharmacy/orders/hospital/:hospitalId?page=&limit=&status= */
  getHospitalOrders: async (
    hospitalId: string,
    params?: { status?: string; page?: number; limit?: number },
  ): Promise<any> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit || 20));
    if (params?.status) query.append("status", params.status);
    const qs = query.toString();
    return apiClient(
      `${PHARMACY_ENDPOINTS.ORDERS(hospitalId)}${qs ? `?${qs}` : ""}`,
    );
  },

  /** GET /pharmacy/orders/hospital/:hospitalId/count */
  getActiveOrdersCount: async (
    hospitalId: string,
  ): Promise<{ count: number }> => {
    return apiClient(`/pharmacy/orders/hospital/${hospitalId}/count`);
  },

  /** GET /pharmacy/orders/:id */
  getOrderById: async (id: string): Promise<PharmacyOrder> => {
    const response: any = await apiClient(`/pharmacy/orders/${id}`);
    return response.order || response;
  },

  /** DELETE /pharmacy/orders/:id */
  deleteOrder: async (id: string): Promise<{ message: string }> => {
    return apiClient(`/pharmacy/orders/${id}`, { method: "DELETE" });
  },

  // ─── Documents ─────────────────────────────────────────────────────────────

  /** POST /pharmacy/upload-document */
  uploadDocument: async (
    file: File,
    type?: string,
  ): Promise<{ url: string; success?: boolean; publicId?: string }> => {
    const formData = new FormData();
    formData.append("document", file);
    if (type) formData.append("type", type);
    const response: any = await apiClient(PHARMACY_ENDPOINTS.UPLOAD_DOCUMENT, {
      method: "POST",
      body: formData,
    });
    return response.data || response;
  },

  // ─── React Query key helpers ──────────────────────────────────────────────────
  queryKeys: {
    all: () => ["pharmacy"] as const,
    dashboard: (params?: any) => ["pharmacy", "dashboard", params] as const,
    products: (filters?: any) => ["pharmacy", "products", filters] as const,
    productById: (id: string) => ["pharmacy", "products", id] as const,
    suppliers: () => ["pharmacy", "suppliers"] as const,
    supplierById: (id: string) => ["pharmacy", "suppliers", id] as const,
    invoices: (filters?: any) => ["pharmacy", "invoices", filters] as const,
    invoiceById: (id: string) => ["pharmacy", "invoices", id] as const,
    orders: (filters?: any) => ["pharmacy", "orders", filters] as const,
    orderById: (id: string) => ["pharmacy", "orders", id] as const,
    reports: {
      sales: (params?: any) =>
        ["pharmacy", "reports", "sales", params] as const,
      inventory: () => ["pharmacy", "reports", "inventory"] as const,
      analytics: (params?: any) =>
        ["pharmacy", "reports", "analytics", params] as const,
      eodSales: (date?: string) =>
        ["pharmacy", "reports", "eod-sales", date] as const,
    },
    transactions: () => ["pharmacy", "transactions"] as const,
    substitutes: (productId: string) => ["pharmacy", "products", productId, "substitutes"] as const,
    auditLogs: () => ["pharmacy", "audit-logs"] as const,
    // IPD Reconciliation keys
    ipdIssuance: (admissionId: string) => ["pharmacy", "ipd-issuance", admissionId] as const,
    ipdIssuanceSummary: (admissionId: string) => ["pharmacy", "ipd-issuance-summary", admissionId] as const,
    medicineReturns: (admissionId: string) => ["pharmacy", "medicine-returns", admissionId] as const,
    allMedicineReturns: (filters?: any) => ["pharmacy", "medicine-returns", "all", filters] as const,
  },
};

// ─── IPD Medicine Issuance Service ───────────────────────────────────────────
export const ipdIssuanceService = {
  /** POST /pharmacy/ipd-issuance — Pharmacist issues medicines to IPD patient */
  issueForIPD: async (data: {
    admissionId: string;
    orderId?: string;
    requestedBy?: string;
    items: Array<{
      productId: string;
      batchId?: string;
      productName: string;
      issuedQty: number;
    }>;
    notes?: string;
    receivedByNurse?: string;
    nurseNote?: string;
  }): Promise<any> => {
    return apiClient(PHARMACY_ENDPOINTS.IPD_ISSUANCE.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** GET /pharmacy/ipd-issuance/nurse-patients/active — Gets list of admissions tied exclusively to the logged-in nurse */
  getNurseActiveAdmissions: async (): Promise<any[]> => {
    const response: any = await apiClient(
      "/pharmacy/ipd-issuance/nurse-patients/active",
    );
    return response || [];
  },

  /** GET /pharmacy/ipd-issuance/:admissionId — All issuances for an admission */
  getIssuancesByAdmission: async (admissionId: string): Promise<any[]> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.IPD_ISSUANCE.BY_ADMISSION(admissionId),
    );
    return response.data || [];
  },

  /** GET /pharmacy/ipd-issuance/:admissionId/summary — Balance summary */
  getIssuanceSummary: async (admissionId: string): Promise<{
    totalIssued: number;
    totalReturned: number;
    totalConsumed: number;
    totalIssuedAmount: number;
    totalReturnedAmount: number;
    netBillableAmount: number;
    pendingReturnRequests: number;
    pharmacyClearanceStatus: "NOT_REQUIRED" | "PENDING" | "CLEARED";
    issuanceCount: number;
  }> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.IPD_ISSUANCE.SUMMARY(admissionId),
    );
    return response.data || {};
  },

  /** POST /pharmacy/medicine-return — Nurse/Pharmacist submits return request */
  submitReturn: async (data: {
    admissionId: string;
    items: Array<{
      issuanceId: string;
      productId: string;
      batchId?: string;
      returnedQty: number;
      reason?: string;
    }>;
    notes?: string;
  }): Promise<any> => {
    return apiClient(PHARMACY_ENDPOINTS.MEDICINE_RETURN.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** GET /pharmacy/medicine-return/:admissionId — Returns for an admission */
  getReturnsByAdmission: async (admissionId: string): Promise<any[]> => {
    const response: any = await apiClient(
      PHARMACY_ENDPOINTS.MEDICINE_RETURN.BY_ADMISSION(admissionId),
    );
    return response.data || [];
  },

  /** GET /pharmacy/medicine-return/all — All returns for the hospital */
  getAllReturns: async (params?: { status?: string; admissionId?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.admissionId) query.append("admissionId", params.admissionId);
    const qs = query.toString();
    const response: any = await apiClient(
      `${PHARMACY_ENDPOINTS.MEDICINE_RETURN.BASE}/all${qs ? `?${qs}` : ""}`,
    );
    return response.data || [];
  },

  /** PATCH /pharmacy/medicine-return/:id/approve — Pharmacist approves */
  approveReturn: async (returnId: string): Promise<any> => {
    return apiClient(PHARMACY_ENDPOINTS.MEDICINE_RETURN.APPROVE(returnId), {
      method: "PATCH",
    });
  },

  /** PATCH /pharmacy/medicine-return/:id/reject — Pharmacist rejects */
  rejectReturn: async (returnId: string, rejectionReason?: string): Promise<any> => {
    return apiClient(PHARMACY_ENDPOINTS.MEDICINE_RETURN.REJECT(returnId), {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
    });
  },

  /** POST /pharmacy/signoff/:admissionId — Pharmacist manually clears */
  signoffPharmacy: async ({ admissionId, forceOverride, overrideReason }: { admissionId: string, forceOverride?: boolean, overrideReason?: string }): Promise<any> => {
    return apiClient(PHARMACY_ENDPOINTS.PHARMACY_SIGNOFF(admissionId), {
      method: "POST",
      body: JSON.stringify({ forceOverride, overrideReason })
    });
  },
};
