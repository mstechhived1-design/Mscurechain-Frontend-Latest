import { PERFORMANCE_V2_ENDPOINTS } from "../config";
import { apiClient } from "../api";

export interface PerformanceEmployee {
    _id: string;
    name: string;
    role: "doctor" | "nurse" | "staff";
    employeeId?: string;
    image?: string;
    specialization?: string;
    attendance: {
        totalDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        onLeaveDays?: number;
        rate: number;
    };
    compositeScore: number;
    roleMetrics: {
        // Doctor
        totalAppointments?: number;
        completedAppointments?: number;
        totalPrescriptions?: number;
        avgPatientRating?: number;
        feedbackCount?: number;
        revenueGenerated?: number;
        followUpRatio?: number;
        // Nurse
        totalTasks?: number;
        completedTasks?: number;
        taskCompletionRate?: number;
        medicationTasks?: number;
        medicationAccuracy?: number;
        patientCareRating?: number;
        // Staff
        totalTickets?: number;
        resolvedTickets?: number;
        resolutionRate?: number;
        dailyThroughput?: number;
    };
    riskFlags: string[];
    improvementVsPrevMonth: number | null;
    rank?: number;
    period: string;
}

export interface PerformanceDashboardData {
    stats: {
        totalStaff: number;
        totalDoctors: number;
        totalNurses: number;
        totalStaffCount: number;
        avgAttendanceRate: number;
        avgCompositeScore: number;
        highPerformers: number;
        attendanceBelow70: number;
        burnoutRisk: number;
        lowRatingAlerts: number;
        period: string;
    };
    topPerformers: {
        doctors: PerformanceEmployee[];
        nurses: PerformanceEmployee[];
        staff: PerformanceEmployee[];
    };
    employees: PerformanceEmployee[];
    departmentStats: {
        department: string;
        role: string;
        count: number;
        avgAttendance: number;
        avgCompositeScore: number;
        highPerformers: number;
    }[];
    trends: any[];
}

export interface EmployeeTrend {
    month: number;
    year: number;
    label: string;
    attendanceRate: number;
    presentDays: number;
    totalDays: number;
    compositeScore: number;
    totalAppointments?: number;
    totalPrescriptions?: number;
    avgPatientRating?: number;
    totalTasks?: number;
    completedTasks?: number;
}

export const performanceService = {
    /** GET /api/performance/dashboard */
    getDashboard: (params?: { month?: number; year?: number }) => {
        const url = new URL(PERFORMANCE_V2_ENDPOINTS.DASHBOARD, window.location.origin);
        if (params?.month !== undefined) url.searchParams.set("month", params.month.toString());
        if (params?.year !== undefined) url.searchParams.set("year", params.year.toString());
        return apiClient<{ success: boolean; data: PerformanceDashboardData; message: string }>(
            url.pathname + url.search,
        );
    },

    /** GET /api/performance/doctors */
    getDoctors: (params?: { month?: number; year?: number }) => {
        const url = new URL(PERFORMANCE_V2_ENDPOINTS.DOCTORS, window.location.origin);
        if (params?.month !== undefined) url.searchParams.set("month", params.month.toString());
        if (params?.year !== undefined) url.searchParams.set("year", params.year.toString());
        return apiClient<{ success: boolean; data: { employees: PerformanceEmployee[]; topPerformers: PerformanceEmployee[]; stats: any } }>(
            url.pathname + url.search,
        );
    },

    /** GET /api/performance/nurses */
    getNurses: (params?: { month?: number; year?: number }) => {
        const url = new URL(PERFORMANCE_V2_ENDPOINTS.NURSES, window.location.origin);
        if (params?.month !== undefined) url.searchParams.set("month", params.month.toString());
        if (params?.year !== undefined) url.searchParams.set("year", params.year.toString());
        return apiClient<{ success: boolean; data: { employees: PerformanceEmployee[]; topPerformers: PerformanceEmployee[]; stats: any } }>(
            url.pathname + url.search,
        );
    },

    /** GET /api/performance/staff */
    getStaff: (params?: { month?: number; year?: number }) => {
        const url = new URL(PERFORMANCE_V2_ENDPOINTS.STAFF, window.location.origin);
        if (params?.month !== undefined) url.searchParams.set("month", params.month.toString());
        if (params?.year !== undefined) url.searchParams.set("year", params.year.toString());
        return apiClient<{ success: boolean; data: { employees: PerformanceEmployee[]; topPerformers: PerformanceEmployee[]; stats: any } }>(
            url.pathname + url.search,
        );
    },

    /** GET /api/performance/trends/:employeeId */
    getTrends: (employeeId: string) => {
        return apiClient<{
            success: boolean;
            data: {
                employee: Pick<PerformanceEmployee, "_id" | "name" | "role" | "employeeId" | "image">;
                trends: EmployeeTrend[];
            };
        }>(PERFORMANCE_V2_ENDPOINTS.TRENDS(employeeId));
    },

    /** GET /api/performance/weights */
    getWeights: () => {
        return apiClient<{ success: boolean; data: Record<string, any> }>(
            PERFORMANCE_V2_ENDPOINTS.WEIGHTS,
        );
    },

    /** PUT /api/performance/weights/:role */
    updateWeights: (role: string, data: { weights?: any; thresholds?: any }) => {
        return apiClient<{ success: boolean; data: any; message: string }>(
            PERFORMANCE_V2_ENDPOINTS.UPDATE_WEIGHTS(role),
            { method: "PUT", body: JSON.stringify(data) },
        );
    },
};
