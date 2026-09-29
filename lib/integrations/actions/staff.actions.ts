"use server";

import { revalidatePath } from "next/cache";
import { apiServer } from "../api/apiServer";
import { STAFF_ENDPOINTS } from "../config";
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
} from "../types";

// Dashboard
export async function getStaffDashboardAction(): Promise<StaffDashboard> {
  return apiServer(STAFF_ENDPOINTS.DASHBOARD);
}

export async function getStaffProfileAction(): Promise<{ staff: StaffProfile }> {
  return apiServer(STAFF_ENDPOINTS.PROFILE);
}

// Attendance Management
export async function getStaffAttendanceAction(params?: {
  startDate?: string;
  endDate?: string
}): Promise<{ attendance: AttendanceHistory[] }> {
  const url = new URL(STAFF_ENDPOINTS.ATTENDANCE, "http://localhost");
  if (params?.startDate) url.searchParams.set("startDate", params.startDate);
  if (params?.endDate) url.searchParams.set("endDate", params.endDate);
  return apiServer(url.pathname + url.search);
}

export async function getStaffAttendanceHistoryAction(params?: {
  limit?: number;
  page?: number
}): Promise<{
  attendance: AttendanceHistory[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const url = new URL(STAFF_ENDPOINTS.ATTENDANCE_HISTORY, "http://localhost");
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.page) url.searchParams.set("page", params.page.toString());
  return apiServer(url.pathname + url.search);
}

export async function getTodayStatusAction(): Promise<{ attendance: TodayAttendance | null }> {
  return apiServer(STAFF_ENDPOINTS.TODAY_STATUS);
}

export async function checkInAction(data?: CheckInRequest): Promise<{ attendance: TodayAttendance }> {
  const result = await apiServer<{ attendance: TodayAttendance }>(STAFF_ENDPOINTS.CHECK_IN, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
  revalidatePath("/staff");
  revalidatePath("/staff/attendance");
  return result;
}

export async function checkOutAction(data?: CheckOutRequest): Promise<{ attendance: TodayAttendance }> {
  const result = await apiServer<{ attendance: TodayAttendance }>(STAFF_ENDPOINTS.CHECK_OUT, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
  revalidatePath("/staff");
  revalidatePath("/staff/attendance");
  return result;
}

// Leave Management
export async function getStaffLeavesAction(params?: {
  status?: string;
  year?: number
}): Promise<{ leaves: LeaveRequest[] }> {
  const url = new URL(STAFF_ENDPOINTS.LEAVES, "http://localhost");
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.year) url.searchParams.set("year", params.year.toString());
  return apiServer(url.pathname + url.search);
}

export async function getLeaveByIdAction(id: string): Promise<{ leave: LeaveRequest }> {
  return apiServer(STAFF_ENDPOINTS.LEAVE_DETAIL(id));
}

export async function createLeaveAction(data: CreateLeaveRequest): Promise<{ leave: LeaveRequest }> {
  const result = await apiServer<{ leave: LeaveRequest }>(STAFF_ENDPOINTS.CREATE_LEAVE, {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/staff/leaves");
  revalidatePath("/staff/leave");
  return result;
}

export async function updateLeaveAction(
  id: string,
  data: Partial<CreateLeaveRequest>
): Promise<{ leave: LeaveRequest }> {
  const result = await apiServer<{ leave: LeaveRequest }>(STAFF_ENDPOINTS.UPDATE_LEAVE(id), {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidatePath("/staff/leaves");
  revalidatePath(`/staff/leaves/${id}`);
  return result;
}

export async function deleteLeaveAction(id: string): Promise<{ message: string }> {
  const result = await apiServer<{ message: string }>(STAFF_ENDPOINTS.DELETE_LEAVE(id), {
    method: "DELETE",
  });
  revalidatePath("/staff/leaves");
  return result;
}

export async function getLeaveBalanceAction(): Promise<{ balance: LeaveBalance }> {
  return apiServer(STAFF_ENDPOINTS.LEAVE_BALANCE);
}

export async function updateStaffProfileAction(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await apiServer(STAFF_ENDPOINTS.PROFILE, {
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update profile" };
  }
}
