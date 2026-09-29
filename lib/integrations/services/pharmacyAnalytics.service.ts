import { apiClient } from "../api/apiClient";
import { PHARMACY_ENDPOINTS } from "../config/endpoints";

export interface AnalyticsData {
  keyMetrics: Array<{
    label: string;
    value: string;
    subtitle: string;
    icon: string;
    color: string;
    trend?: string;
    change?: string;
  }>;
  revenueTrend: Array<{
    date: string;
    revenue: number;
  }>;
  salesVolume: Array<{
    date: string;
    count: number;
  }>;
  paymentDistribution: Array<{
    name: string;
    value: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  insights: {
    avgTransactionValue: number;
    dailyAvgTransactions: number;
    totalItemsSold: number;
  };
  hourlyPerformance: Array<{
    hour: string;
    transactions: number;
    revenue: number;
  }>;
}

export const PharmacyAnalyticsService = {
  getAnalytics: async (
    range?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AnalyticsData> => {
    let url = PHARMACY_ENDPOINTS.REPORTS.SALES;
    const params = new URLSearchParams();
    if (range) params.append("range", range);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      // Use the new analytics endpoint
      url = "/pharmacy/reports/analytics";
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response: any = await apiClient<any>(url);
      const data = response.data;

      // Format key metrics
      const keyMetrics = [
        {
          label: "Total Revenue",
          value: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(data.totalRevenue || 0),
          subtitle: "Period earnings",
          icon: "dollar",
          color: "emerald",
          trend: data.revenueTrend || "up",
          change: data.revenueChange || "+0%",
        },
        {
          label: "Total Transactions",
          value: (data.totalInvoices || 0).toString(),
          subtitle: "Bills generated",
          icon: "cart",
          color: "blue",
          trend: data.transactionTrend || "up",
          change: data.transactionChange || "+0%",
        },
        {
          label: "Products Sold",
          value: (data.totalItemsSold || 0).toString(),
          subtitle: "Units moved",
          icon: "package",
          color: "purple",
          trend: data.itemsTrend || "neutral",
          change: data.itemsChange || "0%",
        },
        {
          label: "Avg Order Value",
          value: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(data.avgBillValue || 0),
          subtitle: "Per transaction",
          icon: "users",
          color: "orange",
          trend: data.avgOrderTrend || "neutral",
          change: data.avgOrderChange || "0%",
        },
      ];

      // Format revenue trend data
      const revenueTrend = (data.dailyRevenue || []).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        revenue: item.revenue || 0,
      }));

      // Format sales volume
      const salesVolume = (data.dailyInvoices || []).map((item: any) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count: item.count || 0,
      }));

      // Format payment distribution
      const paymentBreakdown = data.paymentBreakdown || {};
      const paymentDistribution = [
        { name: "Cash", value: paymentBreakdown.CASH || 0 },
        { name: "Card", value: paymentBreakdown.CARD || 0 },
        { name: "UPI", value: paymentBreakdown.UPI || 0 },
        { name: "Credit", value: paymentBreakdown.CREDIT || 0 },
        { name: "Mixed", value: paymentBreakdown.MIXED || 0 },
      ].filter((item) => item.value > 0);

      // Format top products
      const topProducts = (data.topProducts || []).map((item: any) => ({
        name: item.productName || item.name || "Unknown",
        quantity: item.quantitySold || item.quantity || 0,
        revenue: item.revenue || 0,
      }));

      // Format hourly performance
      const hourlyPerformance = (data.hourlyStats || []).map((item: any) => ({
        hour: `${item.hour}:00`,
        transactions: item.transactions || 0,
        revenue: item.revenue || 0,
      }));

      // Insights
      const insights = {
        avgTransactionValue: data.avgBillValue || 0,
        dailyAvgTransactions: data.dailyAvgInvoices || 0,
        totalItemsSold: data.totalItemsSold || 0,
      };

      return {
        keyMetrics,
        revenueTrend,
        salesVolume,
        paymentDistribution,
        topProducts,
        insights,
        hourlyPerformance,
      };
    } catch (error) {
      console.error("Analytics fetch error:", error);
      // Return mock data for development
      return {
        keyMetrics: [
          {
            label: "Total Revenue",
            value: "₹0",
            subtitle: "Period earnings",
            icon: "dollar",
            color: "emerald",
            trend: "neutral",
            change: "0%",
          },
          {
            label: "Total Transactions",
            value: "0",
            subtitle: "Bills generated",
            icon: "cart",
            color: "blue",
            trend: "neutral",
            change: "0%",
          },
          {
            label: "Products Sold",
            value: "0",
            subtitle: "Units moved",
            icon: "package",
            color: "purple",
            trend: "neutral",
            change: "0%",
          },
          {
            label: "Avg Order Value",
            value: "₹0",
            subtitle: "Per transaction",
            icon: "users",
            color: "orange",
            trend: "neutral",
            change: "0%",
          },
        ],
        revenueTrend: [],
        salesVolume: [],
        paymentDistribution: [],
        topProducts: [],
        insights: {
          avgTransactionValue: 0,
          dailyAvgTransactions: 0,
          totalItemsSold: 0,
        },
        hourlyPerformance: [],
      };
    }
  },
  getEODItemWiseSales: async (date?: string): Promise<any> => {
    let url = "/pharmacy/reports/eod-sales";
    if (date) {
      url += `?date=${date}`;
    }
    const response = await apiClient<any>(url);
    return response.data;
  },
};
