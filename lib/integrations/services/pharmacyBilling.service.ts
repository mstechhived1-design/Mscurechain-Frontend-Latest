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
  customerPhone: b.customerPhone || "-",
  doctorName: b.doctorName || "-",
  items: (b.items || []).map((item: any) => ({
    productId: item.drug,
    itemName: item.productName,
    qty: item.qty,
    rate: item.unitRate,
    gst: item.gstPct,
    total: item.amount,
    hsn: item.hsnCode || item.hsn,
    batch: item.batchNo || item.batchNum || (item.batch?.batchNo || item.batch),
    expiry: item.expiryDate || item.expDate || item.expiry || (item.batch?.expiry || undefined),
    mrp: item.mrp || item.unitRate,
    discountPct: item.discountPct,
    discount: item.discountAmount || item.discount,
    returnedQty: item.returnedQty || 0,
  })),
  paymentSummary: {
    subtotal: b.subTotal,
    taxableAmount: b.subTotal - b.discountTotal,
    taxGST: b.taxTotal,
    discount: b.discountTotal,
    grandTotal: b.netPayable,
    paidAmount: b.paid,
    balanceDue: b.balance,
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
