import { apiClient } from "../api/apiClient";
import { LAB_ENDPOINTS } from "../config/endpoints";

export interface LabDashboardStats {
  revenue: number;
  collections: number;
  patients: number;
  totalTests: number;
  totalTestMaster?: number;
  totalDepartments?: number;
  pendingSamples: number;
  paymentBreakdown: {
    Cash: number;
    UPI: number;
    Card: number;
  };
  topTests: {
    name: string;
    revenue: number;
    count: number;
  }[];
}

export const LabDashboardService = {
  getStats: async (
    range: string = "today",
    skipCache: boolean = false,
    startDate?: string,
    endDate?: string,
  ): Promise<LabDashboardStats> => {
    let url = `${LAB_ENDPOINTS.DASHBOARD.STATS}?range=${range}&skipCache=${skipCache}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return apiClient<LabDashboardStats>(
      url,
      { skipCache },
    );
  },
};