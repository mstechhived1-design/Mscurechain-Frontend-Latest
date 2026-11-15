import { apiClient } from "../api";
import {
  PharmacyBill,
  PharmacyBillPayload,
  PharmacyBillsResponse,
} from "../types/pharmacyBilling";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

const mapInvoiceToBill = (b: any): PharmacyBill => ({
  _id: b._id,
  invoiceId: b.invoiceNo,
  pharmacyId: b.pharmacy,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
  patientName: b.patientName,
  honorific: b.honorific || b.patient?.honorific || b.patientDetails?.honorific || "",
  patient: b.patient,
  patientDetails: b.patientDetails,
  customerPhone: b.customerPhone || "-",
  doctorName: b.doctorName || "-",
  mrn: b.mrn,
  patientType: b.patientType || (b.isIPD ? "IPD" : "OPD"),
  isIPD: b.isIPD || b.patientType === "IPD",
  patientAddress: b.patientAddress,
  prescriptionSource: b.prescriptionSource,
  orderId: b.orderId,
  notes: b.notes,
  items: (b.items || []).map((item: any) => ({
    productId: item.drug || item.product || item._id,
    itemName: item.productName || item.itemName || item.name || item.brand || item.brandName || "",
    qty: Number(item.qty ?? item.issuedQty ?? item.quantity ?? 1),
    rate: Math.round(Number(item.unitRate ?? item.rate ?? item.mrp ?? 0) * 100) / 100,
    gst: item.gstPct || 0,
    total: Math.round(Number(item.amount ?? item.totalAmount ?? item.total ?? 0) * 100) / 100,
    hsn: item.hsnCode || item.hsn || "",
    batch: item.batchNo || item.batchNum || (item.batch?.batchNo || item.batch || ""),
    expiry: item.expiryDate || item.expDate || item.expiry || (item.batch?.expiry || undefined),
    mrp: Math.round(Number(item.mrp || item.unitRate || item.rate || 0) * 100) / 100,
    discountPct: item.discountPct || 0,
    discount: item.discountAmount || item.discount || 0,
    returnedQty: item.returnedQty || 0,
  })),
  paymentSummary: {
    subtotal: Math.round(Number(b.subTotal || 0) * 100) / 100,
    taxableAmount: Math.round(Number((b.subTotal || 0) - (b.discountTotal || 0)) * 100) / 100,
    taxGST: Math.round(Number(b.taxTotal || 0) * 100) / 100,
    discount: Math.round(Number(b.discountTotal || 0) * 100) / 100,
    grandTotal: Math.round(Number(b.netPayable || 0) * 100) / 100,
    paidAmount: Math.round(Number(b.paid || 0) * 100) / 100,
    balanceDue: Math.round(Number(b.balance || 0) * 100) / 100,
    transactionId: b.transactionId || b.paymentId,
    paymentMode: (b.mode === "MIXED"
      ? "Mixed"
      : b.mode === "UPI"
        ? "UPI"
        : b.mode === "CARD"
          ? "Card"
          : b.mode === "CREDIT"
            ? "Credit"
            : "Cash") as any,
    status:
      b.status === "PAID" ? "Paid" : b.status === "PENDING" ? "Due" : "Partial",
    paymentDetails: b.paymentDetails,
  },
});

export const PharmacyBillingService = {
  createBill: async (
    data: PharmacyBillPayload,
  ): Promise<{ message: string; bill: PharmacyBill }> => {
    const response: any = await apiClient<any>(PHARMACY_ENDPOINTS.BILLS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });

    return {
      message: "Invoice generated successfully",
      bill: mapInvoiceToBill(response.data || response),
    };
  },

  async getBills(
    page = 1,
    limit = 10,
    search?: string,
    paymentMode?: string,
    startDate?: string,
    endDate?: string,
    patientType?: string,
  ): Promise<PharmacyBillsResponse> {
    let url = `${PHARMACY_ENDPOINTS.BILLS.BASE}?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (paymentMode && paymentMode !== "All Methods") {
      url += `&mode=${paymentMode.toUpperCase()}`;
    }
    if (startDate) {
      url += `&startDate=${startDate}`;
      if (!endDate) url += `&endDate=${startDate}`;
    }
    if (endDate && endDate !== startDate) {
      url += `&endDate=${endDate}`;
    }
    if (patientType && patientType !== "all" && patientType !== "ALL") {
      url += `&patientType=${patientType.toUpperCase()}`;
    }

    const response: any = await apiClient<any>(url, {
      method: "GET",
    });

    const bills = (response.data || []).map(mapInvoiceToBill);

    return {
      bills,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      totalBills: response.total || 0,
    };
  },

  getBillById: async (id: string): Promise<PharmacyBill> => {
    const response: any = await apiClient<any>(
      PHARMACY_ENDPOINTS.BILLS.BY_ID(id),
      {
        method: "GET",
      },
    );

    return mapInvoiceToBill(response.data || response);
  },

  deleteBill: async (id: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(PHARMACY_ENDPOINTS.BILLS.BY_ID(id), {
      method: "DELETE",
    });
  },

  getHospitalOrders: async (
    hospitalId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
    skipCache: boolean = false
  ): Promise<any> => { // ✅ PERFORMANCE FIX: Reduced from limit=1000 to limit=100
    let url = `${PHARMACY_ENDPOINTS.ORDERS(hospitalId)}?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    return apiClient<any>(url, {
      method: "GET",
      skipCache,
    });
  },

  getPharmacyOrder: async (id: string): Promise<any> => {
    return apiClient<any>(`/pharmacy/orders/${id}`, {
      method: "GET",
    });
  },

  deleteOrder: async (id: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/pharmacy/orders/${id}`, {
      method: "DELETE",
    });
  },

  chargeIPDBill: async (data: {
    admissionId: string;
    orderId?: string;
    items: Array<{
      productId: string;
      productName: string;
      issuedQty: number;
      unitRate: number;
      totalAmount: number;
    }>;
    notes?: string;
  }) => {
    return apiClient<any>("/pharmacy/ipd-issuance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateInvoicePatient: async (
    id: string,
    data: {
      patientName?: string;
      customerPhone?: string;
      patientAddress?: string;
      patientType?: string;
      doctorName?: string;
      mrn?: string;
      honorific?: string;
    }
  ): Promise<{ success: boolean; message: string; data: any }> => {
    return apiClient<any>(`/pharmacy/invoices/${id}/patient`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateFullInvoice: async (
    id: string,
    data: {
      patientName?: string;
      customerPhone?: string;
      patientAddress?: string;
      patientType?: string;
      doctorName?: string;
      mrn?: string;
      honorific?: string;
      mode?: string;
      status?: string;
      paid?: number;
      balance?: number;
      items?: any[];
      subTotal?: number;
      taxTotal?: number;
      netPayable?: number;
      paymentDetails?: any;
    }
  ): Promise<{ success: boolean; message: string; data: any }> => {
    return apiClient<any>(`/pharmacy/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ✅ Check transfer eligibility & cross-portal consequences
  checkTransferEligibility: async (
    id: string
  ): Promise<{
    success: boolean;
    currentType: "OPD" | "IPD";
    patientName: string;
    customerPhone: string;
    amount: number;
    invoiceNo: string;
    admissions: Array<{
      _id: string;
      admissionId: string;
      status: string;
      paymentStatus: string;
      admissionDate: string;
      dischargeDate?: string;
      doctorName: string;
      roomNo: string;
    }>;
    hasAdmissions: boolean;
    consequences: string[];
    message?: string;
  }> => {
    return apiClient<any>(`/pharmacy/invoices/${id}/check-transfer`, {
      method: "GET",
    });
  },

  // ✅ Execute transfer between OPD and IPD
  transferInvoiceType: async (
    id: string,
    data: {
      targetType: "OPD" | "IPD";
      admissionId?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    bill?: any;
    requiresAdmission?: boolean;
  }> => {
    return apiClient<any>(`/pharmacy/invoices/${id}/transfer-type`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ✅ Query key helpers for React Query
  queryKeys: {
    all: () => ["pharmacy"] as const,
    bills: (filters?: {
      page?: number;
      limit?: number;
      search?: string;
      paymentMode?: string;
      date?: string;
    }) => ["pharmacy", "bills", filters] as const,
    billById: (id: string) => ["pharmacy", "bills", id] as const,
    orders: (filters?: {
      hospitalId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => ["pharmacy", "orders", filters] as const,
    orderById: (id: string) => ["pharmacy", "orders", id] as const,
  },
};
