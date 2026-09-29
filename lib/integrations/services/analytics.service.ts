import { apiClient } from "../api";

export const analyticsService = {
  getQualityIndicators: async (params?: { month?: number; year?: number }) => {
    try {
      const url = new URL("/hospital/quality-metrics", window.location.origin);
      if (params?.month) url.searchParams.set("month", String(params.month));
      if (params?.year) url.searchParams.set("year", String(params.year));

      return await apiClient<any>(url.pathname + url.search);
    } catch (error: any) {
      throw error;
    }
  },

  getQualityTrends: async (params?: { year?: number }) => {
    try {
      const url = new URL(
        "/hospital/quality-metrics/trends",
        window.location.origin,
      );
      if (params?.year) url.searchParams.set("year", String(params.year));

      return await apiClient<any>(url.pathname + url.search);
    } catch (error: any) {
      throw error;
    }
  },

  finalizeMetrics: async (month: number, year: number) => {
    try {
      return await apiClient<any>(`/hospital/quality-metrics/lock`, {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
    } catch (error: any) {
      throw error;
    }
  },

  getEnhancedQualityIndicators: async (params?: {
    month?: number;
    year?: number;
  }) => {
    try {
      const url = new URL(
        "/hospital/enhanced-quality-metrics",
        window.location.origin,
      );
      if (params?.month) url.searchParams.set("month", String(params.month));
      if (params?.year) url.searchParams.set("year", String(params.year));

      return await apiClient<any>(url.pathname + url.search);
    } catch (error: any) {
      throw error;
    }
  },

  getIndicatorDayWiseTrends: async (params: {
    month: number;
    year: number;
    indicatorId: string;
    category?: string;
  }) => {
    try {
      const url = new URL(
        "/hospital/quality-metrics/day-wise",
        window.location.origin,
      );
      url.searchParams.set("month", String(params.month));
      url.searchParams.set("year", String(params.year));
      url.searchParams.set("indicatorId", params.indicatorId);
      if (params.category) url.searchParams.set("category", params.category);

      return await apiClient<any>(url.pathname + url.search);
    } catch (error: any) {
      throw error;
    }
  },

  getAuditTrends: async (params: { months: number }) => {
    try {
      const url = new URL(
        "/hospital/quality-metrics/audit-trends",
        window.location.origin,
      );
      url.searchParams.set("months", String(params.months));

      return await apiClient<any>(url.pathname + url.search);
    } catch (error: any) {
      throw error;
    }
  },

  getQualityTargets: async () => {
    return await apiClient<{ success: boolean; data: any }>(
      "/hospital/quality-metrics/targets",
    );
  },

  saveQualityTargets: async (targets: {
    opdWaitingTime: number;
    bedOccupancyMin: number;
    bedOccupancyMax: number;
    alos: number;
    billingTat: number;
    incidentRateMax: number;
    incidentCountMax: number;
    readmissionRate: number;
  }) => {
    return await apiClient<{ success: boolean; data: any }>(
      "/hospital/quality-metrics/targets",
      {
        method: "PUT",
        body: JSON.stringify(targets),
      },
    );
  },
};
