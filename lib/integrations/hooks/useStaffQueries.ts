/**
 * React Query Hooks for Staff Service
 * Provides optimized data fetching with caching for <1.5s UI load
 * Aligned with backend cache TTLs for optimal performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../services/staff.service';
import type { CheckInRequest, CheckOutRequest, CreateLeaveRequest } from '../types';

/**
 * âš¡ PERFORMANCE-OPTIMIZED STAFF QUERIES
 * 
 * Strategy: Cache-First for INSTANT Navigation
 * - Use cache aggressively (staleTime: 5min)
 * - Show cached data instantly (placeholderData)
 * - NO refetchOnMount (prevents navigation freezing!)
 * - Use manual refresh buttons when fresh data needed
 */
const STAFF_DASHBOARD_QUERY_DEFAULTS = {
    staleTime: 5 * 1000,      // ✅ 5 seconds - Keep it fresh
    gcTime: 1 * 60 * 1000,    // ✅ 1 minute memory
    refetchOnWindowFocus: true, // ✅ Refetch on tab switch for visibility
    refetchOnReconnect: true,   
    refetchOnMount: true,       // ✅ Check on mount
    retry: 1,
};

// ==================== Query Keys ====================
export const staffKeys = {
    all: ['staff'] as const,
    dashboard: () => [...staffKeys.all, 'dashboard'] as const,
    profile: () => [...staffKeys.all, 'profile'] as const,
    attendance: (params?: { startDate?: string; endDate?: string }) =>
        [...staffKeys.all, 'attendance', params] as const,
    attendanceHistory: (params?: { limit?: number; page?: number }) =>
        [...staffKeys.all, 'attendance-history', params] as const,
    todayStatus: () => [...staffKeys.all, 'today-status'] as const,
    leaves: (params?: { status?: string; year?: number }) =>
        [...staffKeys.all, 'leaves', params] as const,
    leave: (id: string) => [...staffKeys.all, 'leave', id] as const,
    leaveBalance: () => [...staffKeys.all, 'leave-balance'] as const,
    schedule: () => [...staffKeys.all, 'schedule'] as const,
    payroll: () => [...staffKeys.all, 'payroll'] as const,
    announcements: () => [...staffKeys.all, 'announcements'] as const,
};

// ==================== Dashboard Hook ====================
/**
 * âš¡ FAST: Shows cached data in <200ms, refreshes in background
 */
export const useStaffDashboard = () => {
    return useQuery({
        queryKey: staffKeys.dashboard(),
        queryFn: staffService.getDashboard,
        ...STAFF_DASHBOARD_QUERY_DEFAULTS,
        placeholderData: (previousData) => previousData, // ✅ INSTANT cache display
    });
};

// ==================== Profile Hook ====================
/**
 * Fetches staff profile information
 * 10-minute cache as profile rarely changes
 */
export const useStaffProfile = () => {
    return useQuery({
        queryKey: staffKeys.profile(),
        queryFn: () => staffService.getProfile(),
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
    });
};

// ==================== Attendance Hooks ====================
/**
 * Fetches attendance records for a date range
 */
export const useAttendance = (params?: { startDate?: string; endDate?: string }) => {
    return useQuery({
        queryKey: staffKeys.attendance(params),
        queryFn: () => staffService.getAttendance(params),
        staleTime: 10 * 1000, // 10 seconds
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
    });
};

/**
 * Fetches paginated attendance history
 */
export const useAttendanceHistory = (params?: { limit?: number; page?: number }) => {
    return useQuery({
        queryKey: staffKeys.attendanceHistory(params),
        queryFn: () => staffService.getAttendanceHistory(params || {}),
        ...STAFF_DASHBOARD_QUERY_DEFAULTS,
        placeholderData: (previousData) => previousData, // ✅ INSTANT display
    });
};

/**
 * Fetches today's attendance status
 * Shorter cache as status changes during the day
 */
export const useTodayStatus = () => {
    return useQuery({
        queryKey: staffKeys.todayStatus(),
        queryFn: staffService.getTodayStatus,
        staleTime: 5 * 1000, // ✅ 5 seconds
        gcTime: 1 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
    });
};

/**
 * Check-in mutation with optimistic dashboard update
 */
export const useCheckIn = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data?: CheckInRequest) => staffService.checkIn(data),
        onSuccess: (result) => {
            // ✅ OPTIMISTIC UPDATE: IMMEDIATELY update both dashboard and status
            if (result?.attendance) {
                // Update Dashboard Cache
                queryClient.setQueryData(staffKeys.dashboard(), (old: any) => {
                    if (!old) return old;
                    return { ...old, todayAttendance: result.attendance };
                });

                // Update Today Status Cache (Navbar Sync)
                queryClient.setQueryData(staffKeys.todayStatus(), {
                    attendance: result.attendance
                });
            }
            // Invalidate to ensure background sync handles stats calculation
            queryClient.invalidateQueries({ queryKey: staffKeys.todayStatus() });
            queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
            queryClient.invalidateQueries({ queryKey: staffKeys.attendanceHistory() });
            queryClient.invalidateQueries({ queryKey: staffKeys.dashboard() });
        },
    });
};

/**
 * Check-out mutation with optimistic dashboard update
 */
export const useCheckOut = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data?: CheckOutRequest) => staffService.checkOut(data),
        onSuccess: (result) => {
            // ✅ OPTIMISTIC UPDATE: IMMEDIATELY update both dashboard and status
            if (result?.attendance) {
                // Update Dashboard Cache
                queryClient.setQueryData(staffKeys.dashboard(), (old: any) => {
                    if (!old) return old;
                    return { ...old, todayAttendance: result.attendance };
                });

                // Update Today Status Cache (Navbar Sync)
                queryClient.setQueryData(staffKeys.todayStatus(), {
                    attendance: result.attendance
                });
            }
            queryClient.invalidateQueries({ queryKey: staffKeys.todayStatus() });
            queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
            queryClient.invalidateQueries({ queryKey: staffKeys.attendanceHistory() });
            queryClient.invalidateQueries({ queryKey: staffKeys.dashboard() });
        },
    });
};

// ==================== Leave Hooks ====================
/**
 * Fetches leave requests
 */
export const useLeaves = (params?: { status?: string; year?: number }) => {
    return useQuery({
        queryKey: staffKeys.leaves(params),
        queryFn: () => staffService.getLeaves(params),
        staleTime: 5 * 1000, // 5 seconds
        gcTime: 1 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
    });
};

/**
 * Fetches single leave request details
 */
export const useLeaveDetails = (id: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: staffKeys.leave(id),
        queryFn: () => staffService.getLeaveById(id),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        enabled: enabled && !!id,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
    });
};

/**
 * Fetches leave balance
 */
export const useLeaveBalance = () => {
    return useQuery({
        queryKey: staffKeys.leaveBalance(),
        queryFn: staffService.getLeaveBalance,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
    });
};

/**
 * Create leave request mutation
 */
export const useCreateLeave = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLeaveRequest) => staffService.createLeave(data),
        onSuccess: () => {
            // Invalidate leaves list, balance, and dashboard
            queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
            queryClient.invalidateQueries({ queryKey: staffKeys.leaveBalance() });
            queryClient.invalidateQueries({ queryKey: staffKeys.dashboard() });
        },
    });
};

/**
 * Update leave request mutation
 */
export const useUpdateLeave = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeaveRequest> }) =>
            staffService.updateLeave(id, data),
        onSuccess: (_, { id }) => {
            // Invalidate specific leave, leaves list, and dashboard
            queryClient.invalidateQueries({ queryKey: staffKeys.leave(id) });
            queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
            queryClient.invalidateQueries({ queryKey: staffKeys.dashboard() });
        },
    });
};

/**
 * Delete leave request mutation
 */
export const useDeleteLeave = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => staffService.deleteLeave(id),
        onSuccess: () => {
            // Invalidate leaves list, balance, and dashboard
            queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
            queryClient.invalidateQueries({ queryKey: staffKeys.leaveBalance() });
            queryClient.invalidateQueries({ queryKey: staffKeys.dashboard() });
        },
    });
};

// ==================== Schedule Hook ====================
/**
 * Fetches staff schedule
 */
export const useSchedule = () => {
    return useQuery({
        queryKey: staffKeys.schedule(),
        queryFn: staffService.getSchedule,
        staleTime: 15 * 1000,    // ✅ 15 seconds - Keep it fresh
        gcTime: 1 * 60 * 1000,   // ✅ 1 minute memory
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        retry: 1,
        placeholderData: (previousData) => previousData, // ✅ INSTANT navigation
    });
};

// ==================== Payroll Hook ====================
/**
 * Fetches staff payroll information
 */
export const usePayroll = () => {
    return useQuery({
        queryKey: staffKeys.payroll(),
        queryFn: staffService.getPayroll,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
    });
};

// ==================== Announcements Hook ====================
/**
 * Fetches staff announcements
 */
export const useAnnouncements = () => {
    return useQuery({
        queryKey: staffKeys.announcements(),
        queryFn: staffService.getAnnouncements,
        staleTime: 10 * 60 * 1000, // ✅ 10min - announcements change slowly
        gcTime: 30 * 60 * 1000,
        placeholderData: (previousData) => previousData,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
    });
};
