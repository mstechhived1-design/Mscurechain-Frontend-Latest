import { STAFF_ENDPOINTS, USER_ENDPOINTS } from '../config';
import { apiClient } from '../api';
import type {
  StaffDashboard,
  StaffProfile,
  TodayAttendance,
  AttendanceHistory,
  CheckInRequest,
  CheckOutRequest,
  LeaveRequest,
  CreateLeaveRequest,
  LeaveBalance
} from '../types';

export const staffService = {
  // Dashboard
  getDashboard: () =>
    apiClient<StaffDashboard>(STAFF_ENDPOINTS.DASHBOARD),

  getProfile: (options?: { skipCache?: boolean }) =>
    apiClient<{ staff: StaffProfile }>(STAFF_ENDPOINTS.PROFILE, options),

  // Attendance Management
  getAttendance: (params?: { startDate?: string; endDate?: string }) => {
    const url = new URL(STAFF_ENDPOINTS.ATTENDANCE, window.location.origin);
    if (params?.startDate) url.searchParams.set('startDate', params.startDate);
    if (params?.endDate) url.searchParams.set('endDate', params.endDate);
    return apiClient<{ attendance: AttendanceHistory[] }>(url.pathname + url.search);
  },

  getAttendanceHistory: (params?: { limit?: number; page?: number }) => {
    const url = new URL(STAFF_ENDPOINTS.ATTENDANCE_HISTORY, window.location.origin);
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.page) url.searchParams.set('page', params.page.toString());
    return apiClient<{
      attendance: AttendanceHistory[];
      total: number;
      page: number;
      totalPages: number;
    }>(url.pathname + url.search);
  },

  getTodayStatus: () =>
    apiClient<{ attendance: TodayAttendance | null }>(STAFF_ENDPOINTS.TODAY_STATUS),

  checkIn: (data?: CheckInRequest) =>
    apiClient<{ attendance: TodayAttendance }>(STAFF_ENDPOINTS.CHECK_IN, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  checkOut: (data?: CheckOutRequest) =>
    apiClient<{ attendance: TodayAttendance }>(STAFF_ENDPOINTS.CHECK_OUT, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // Leave Management
  getLeaves: (params?: { status?: string; year?: number }) => {
    const url = new URL(STAFF_ENDPOINTS.LEAVES, window.location.origin);
    if (params?.status) url.searchParams.set('status', params.status);
    if (params?.year) url.searchParams.set('year', params.year.toString());
    return apiClient<{ leaves: LeaveRequest[] }>(url.pathname + url.search);
  },

  getLeaveById: (id: string) =>
    apiClient<{ leave: LeaveRequest }>(STAFF_ENDPOINTS.LEAVE_DETAIL(id)),

  createLeave: (data: CreateLeaveRequest) =>
    apiClient<{ leave: LeaveRequest }>(STAFF_ENDPOINTS.CREATE_LEAVE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLeave: (id: string, data: Partial<CreateLeaveRequest>) =>
    apiClient<{ leave: LeaveRequest }>(STAFF_ENDPOINTS.UPDATE_LEAVE(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLeave: (id: string) =>
    apiClient<{ message: string }>(STAFF_ENDPOINTS.DELETE_LEAVE(id), {
      method: 'DELETE',
    }),

  getLeaveBalance: () =>
    apiClient<{ balance: LeaveBalance }>(STAFF_ENDPOINTS.LEAVE_BALANCE),

  // Schedule
  getSchedule: () =>
    apiClient<{ schedule: any; approvedLeaves: any[] }>(STAFF_ENDPOINTS.SCHEDULE),

  // Payroll
  getPayroll: () =>
    apiClient<{ payroll: any[] }>(STAFF_ENDPOINTS.PAYROLL),

  // Announcements
  getAnnouncements: () =>
    apiClient<{ announcements: any[] }>(STAFF_ENDPOINTS.ANNOUNCEMENTS),

  updateProfile: (data: any) =>
    apiClient<{ staff: StaffProfile }>(USER_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStaffProfile: (data: FormData) =>
    apiClient<{ success: boolean; data?: any; error?: string }>(STAFF_ENDPOINTS.PROFILE, {
      method: 'PATCH',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  uploadDocument: (file: File | Blob, fileName: string) => {
    const formData = new FormData();
    formData.append('document', file, fileName);
    return apiClient<{ success: boolean; url: string; publicId: string; format?: string; resource_type?: string; }>(
      STAFF_ENDPOINTS.UPLOAD_DOCUMENT,
      {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      }
    );
  },
};

