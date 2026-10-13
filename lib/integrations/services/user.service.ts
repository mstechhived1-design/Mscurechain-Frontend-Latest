import { USER_ENDPOINTS } from "../config";
import { apiClient } from "../api";
import type { User } from "../types";

export interface UserAttendance {
  _id: string;
  date: string;
  checkIn: {
    time: string;
    location?: string;
  };
  checkOut: {
    time: string;
    location?: string;
  };
  workingHours: number;
  status: "present" | "absent" | "late" | "half-day" | "on-leave";
  notes?: string;
}

export interface TodayAttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  attendance: UserAttendance;
}

export const userService = {
  // Client-side
  getAllClient: () => apiClient<User[]>(USER_ENDPOINTS.PROFILE),

  // Profile
  getProfile: () => apiClient<User>(USER_ENDPOINTS.PROFILE),

  updateProfile: (data: Partial<User> | FormData) =>
    apiClient<User>(USER_ENDPOINTS.UPDATE_PROFILE, {
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  // Attendance - Check-in/Check-out for staff/doctor
  getTodayAttendanceStatus: () =>
    apiClient<TodayAttendanceStatus>(USER_ENDPOINTS.ATTENDANCE_TODAY_STATUS),

  checkIn: async (notes?: string, coords?: { lat?: number; lng?: number }) => {
    let loc = coords;
    if ((!loc?.lat || !loc?.lng) && typeof navigator !== 'undefined' && navigator.geolocation) {
      loc = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({}),
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
        );
      });
    }
    return apiClient<TodayAttendanceStatus>(USER_ENDPOINTS.ATTENDANCE_CHECK_IN, {
      method: "POST",
      body: JSON.stringify({ notes: notes || "", lat: loc?.lat, lng: loc?.lng }),
    });
  },

  checkOut: async (notes?: string, coords?: { lat?: number; lng?: number }) => {
    let loc = coords;
    if ((!loc?.lat || !loc?.lng) && typeof navigator !== 'undefined' && navigator.geolocation) {
      loc = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({}),
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
        );
      });
    }
    return apiClient<TodayAttendanceStatus>(USER_ENDPOINTS.ATTENDANCE_CHECK_OUT, {
      method: "POST",
      body: JSON.stringify({ notes: notes || "", lat: loc?.lat, lng: loc?.lng }),
    });
  },

  // Get all attendance records for current user
  getMyAttendance: (params?: { month?: string; year?: string }) => {
    const url = new URL(USER_ENDPOINTS.ATTENDANCE, window.location.origin);
    if (params?.month) url.searchParams.set("month", params.month);
    if (params?.year) url.searchParams.set("year", params.year);
    return apiClient<{ attendance: UserAttendance[] }>(
      url.pathname + url.search,
    );
  },
};
