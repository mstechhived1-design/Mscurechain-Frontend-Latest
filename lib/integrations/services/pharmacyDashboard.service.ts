import { apiClient } from "../api/apiClient";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

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
  recentInvoices: {
    _id: string;
    invoiceNumber: string;
    netPayable: number;
    status: string;
    createdAt: string;
    createdBy: {
      _id: string;
      name: string;
    };
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  leastSellingProducts: {
    name: string;
    brand?: string;
    stock: number;
    expiryDate: string;
    mrp: number;
    qtySold: number;
    revenue: number;
  }[];
}

export const PharmacyDashboardService = {
  getStats: async (
    range?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PharmacyDashboardStats> => {
    let url = PHARMACY_ENDPOINTS.BILLS.STATS;
    const params = new URLSearchParams();
    if (range) params.append("range", range);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response: any = await apiClient<any>(url);
    const data = response.data || {};
    const requestedRange = data.requestedRange || data.today || {};
    const todayRange = data.today || {};

    return {
      requestedStats: {
        revenue: requestedRange.totalRevenue || 0,
        billCount: requestedRange.totalInvoices || 0,
        avgBillValue:
          (requestedRange.totalInvoices || 0) > 0
            ? (requestedRange.totalRevenue || 0) /
            (requestedRange.totalInvoices || 0)
            : 0,
        itemsSold: requestedRange.itemsSold || 0,
      },
      todayStats: {
        revenue: todayRange.totalRevenue || 0,
        billCount: todayRange.totalInvoices || 0,
        avgBillValue:
          (todayRange.totalInvoices || 0) > 0
            ? (todayRange.totalRevenue || 0) / (todayRange.totalInvoices || 0)
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
      leastSellingProducts: (data.leastSellingWithExpiry || []).map((p: any) => ({
        name: p.name,
        brand: p.brand,
        stock: p.stock,
        expiryDate: p.expiryDate,
        mrp: p.mrp,
        qtySold: p.qtySold,
        revenue: p.revenue,
      })),
    };
  },
};

