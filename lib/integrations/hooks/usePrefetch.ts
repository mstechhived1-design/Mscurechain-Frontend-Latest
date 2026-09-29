/**
 * Prefetch Hook - Preload data on hover for instant navigation
 * Reduces perceived latency by fetching data BEFORE user clicks
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { helpdeskKeys } from './useHelpdeskQueries';
import { staffKeys } from './useStaffQueries';
import { helpdeskService } from '../services/helpdesk.service';
import { staffService } from '../services/staff.service';

/**
 * âš¡ PREFETCH HOOK - Zero-latency navigation
 * 
 * Usage: Call prefetch functions on link hover (onMouseEnter)
 * When user clicks, data is already in cache = instant load!
 */
export const usePrefetch = () => {
    const queryClient = useQueryClient();

    // ==================== Helpdesk Prefetch ====================

    const prefetchHelpdeskDashboard = useCallback(() => {
        queryClient.prefetchQuery({
            queryKey: helpdeskKeys.dashboard(),
            queryFn: helpdeskService.getDashboard,
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchHelpdeskDoctors = useCallback(() => {
        queryClient.prefetchQuery({
            queryKey: helpdeskKeys.doctors(),
            queryFn: helpdeskService.getDoctors,
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchHelpdeskPatients = useCallback((query = '', page = 1, limit = 10) => {
        queryClient.prefetchQuery({
            queryKey: helpdeskKeys.patients(query, page, limit),
            queryFn: () => helpdeskService.searchPatients(query, page, limit),
            staleTime: 2 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchHelpdeskAppointments = useCallback((page?: number, limit?: number) => {
        queryClient.prefetchQuery({
            queryKey: helpdeskKeys.appointments(page, limit),
            queryFn: () => helpdeskService.getAppointments(page, limit),
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchHelpdeskTransactions = useCallback((page?: number, limit?: number, range?: string) => {
        queryClient.prefetchQuery({
            queryKey: helpdeskKeys.transactions(page, limit, range),
            queryFn: () => helpdeskService.getTransactions(page, limit, range),
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    // ==================== Staff Prefetch ====================

    const prefetchStaffDashboard = useCallback(() => {
        queryClient.prefetchQuery({
            queryKey: staffKeys.dashboard(),
            queryFn: staffService.getDashboard,
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchStaffAttendance = useCallback((params?: { startDate?: string; endDate?: string }) => {
        queryClient.prefetchQuery({
            queryKey: staffKeys.attendance(params),
            queryFn: () => staffService.getAttendance(params),
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchStaffLeaves = useCallback((params?: { status?: string; year?: number }) => {
        queryClient.prefetchQuery({
            queryKey: staffKeys.leaves(params),
            queryFn: () => staffService.getLeaves(params),
            staleTime: 5 * 60 * 1000,
        });
    }, [queryClient]);

    const prefetchStaffSchedule = useCallback(() => {
        queryClient.prefetchQuery({
            queryKey: staffKeys.schedule(),
            queryFn: staffService.getSchedule,
            staleTime: 10 * 60 * 1000,
        });
    }, [queryClient]);

    return {
        // Helpdesk prefetch functions
        prefetchHelpdeskDashboard,
        prefetchHelpdeskDoctors,
        prefetchHelpdeskPatients,
        prefetchHelpdeskAppointments,
        prefetchHelpdeskTransactions,

        // Staff prefetch functions
        prefetchStaffDashboard,
        prefetchStaffAttendance,
        prefetchStaffLeaves,
        prefetchStaffSchedule,
    };
};
