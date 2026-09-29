/**
 * React Query Hooks for Helpdesk Service
 * Provides optimized data fetching with caching for <1.5s UI load
 * Aligned with backend cache TTLs for optimal performance
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { helpdeskService } from "../services/helpdesk.service";
import { HelpdeskProfile } from "../types";

/**
 * âš¡ PERFORMANCE-OPTIMIZED HELPDESK QUERIES
 *
 * Strategy: Cache-First for INSTANT Navigation
 * - Use cache aggressively (staleTime: 5min)
 * - Show cached data instantly (placeholderData)
 * - NO refetchOnMount (prevents navigation freezing!)
 * - Use manual refresh buttons when fresh data needed
 */
const HELPDESK_QUERY_DEFAULTS = {
  staleTime: 5 * 60 * 1000, // ✅ 5min - Cache stays fresh
  gcTime: 15 * 60 * 1000, // ✅ Keep in memory
  refetchOnWindowFocus: false, // ✅ Don't refetch on tab switch
  refetchOnReconnect: false, // ✅ Don't refetch on reconnect
  refetchOnMount: false, // ✅ CRITICAL: No refetch = instant navigation!
  retry: 1,
};

// ==================== Query Keys ====================

const BASE_KEY = ["helpdesk"] as const;

export const helpdeskKeys = {
  all: BASE_KEY,
  dashboard: () => [...BASE_KEY, "dashboard"] as const,
  doctors: () => [...BASE_KEY, "doctors"] as const,
  patients: (query?: string, page?: number, limit?: number, type?: string, channel?: string) =>
    [...BASE_KEY, "patients", { query, page, limit, type, channel: channel }] as const,
  patient: (id: string) => [...BASE_KEY, "patient", id] as const,
  appointments: (page?: number, limit?: number, patientId?: string, startDate?: string, endDate?: string, channel?: string) =>
    [...BASE_KEY, "appointments", { page, limit, patientId, startDate, endDate, channel: channel }] as const,
  transactions: (
    page?: number,
    limit?: number,
    range?: string,
    startDate?: string,
    endDate?: string,
    type?: string,
    isEdited?: boolean,
    search?: string
  ) =>
    [
      ...BASE_KEY,
      "transactions",
      { page, limit, range, startDate, endDate, type, isEdited, search },
    ] as const,
  transits: (params?: any) => [...BASE_KEY, "transits", params] as const,
  availability: (doctorId: string, hospitalId: string, date: string) =>
    [...BASE_KEY, "availability", { doctorId, hospitalId, date }] as const,
};

// ==================== Dashboard Hook ====================
/**
 * âš¡ FAST: Shows cached data in <200ms, refreshes in background
 */
export const useHelpdeskDashboard = () => {
  return useQuery({
    queryKey: helpdeskKeys.dashboard(),
    queryFn: helpdeskService.getDashboard,
    ...HELPDESK_QUERY_DEFAULTS,
    staleTime: 30 * 1000, // ✅ FIX: 30s - dashboard needs to be fresh
    refetchOnMount: true, // ✅ FIX: Always refetch dashboard on mount
    refetchOnWindowFocus: true, // ✅ FIX: Refetch when tab is focused
    placeholderData: (previousData) => previousData, // ✅ INSTANT cache display
  });
};

// ==================== Doctors Hooks ====================
/**
 * âš¡ FAST: Doctors list cached, instant on navigation
 */
export const useHelpdeskDoctors = () => {
  return useQuery({
    queryKey: helpdeskKeys.doctors(),
    queryFn: helpdeskService.getDoctors,
    ...HELPDESK_QUERY_DEFAULTS,
    placeholderData: (previousData) => previousData, // ✅ INSTANT cache display
    // âŒ NO POLLING
  });
};

// ==================== Patient Search Hook ====================
/**
 * âš¡ Search patients - no polling, cache search results briefly
 */
export const usePatientSearch = (
  query: string,
  page: number = 1,
  limit: number = 10,
  type?: string,
  channel?: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: helpdeskKeys.patients(query, page, limit, type, channel),
    queryFn: () => helpdeskService.searchPatients(query, page, limit, type, channel),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && query.length > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

/**
 * âš¡ Patients list hook - for use in /helpdesk/patients page
 * NO automatic refetching to prevent connection resets on large data
 */
export const useHelpdeskPatients = (
  query: string,
  page: number = 1,
  limit: number = 10,
  type?: string,
  channel?: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: helpdeskKeys.patients(query, page, limit, type, channel),
    queryFn: () =>
      helpdeskService.searchPatients(query || "", page, limit, type, channel),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// ==================== Patient Details Hook ====================
export const usePatientDetails = (
  patientId: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: helpdeskKeys.patient(patientId),
    queryFn: () => helpdeskService.getPatientById(patientId),
    staleTime: 5 * 60 * 1000, // ✅ 5min cache
    gcTime: 15 * 60 * 1000,
    enabled: enabled && !!patientId,
    placeholderData: (previousData) => previousData, // ✅ Instant display
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

/**
 * Patient registration mutation
 */
export const useRegisterPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: helpdeskService.registerPatient,
    onSuccess: () => {
      // ✅ FIX: Force immediate refetch (not just mark stale)
      queryClient.invalidateQueries({
        queryKey: helpdeskKeys.dashboard(),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: helpdeskKeys.appointments(),
        refetchType: "all",
      });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.patients() });
    },
  });
};

/**
 * Patient update mutation
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: any }) =>
      helpdeskService.updatePatient(patientId, data),
    onSuccess: (_, { patientId }) => {
      // Invalidate specific patient and list
      queryClient.invalidateQueries({
        queryKey: helpdeskKeys.patient(patientId),
      });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.patients() });
    },
  });
};

// ==================== Appointments Hook ====================
/**
 * âš¡ Appointments list - cached, no constant polling
 */
export const useAppointments = (
  page?: number,
  limit?: number,
  patientId?: string,
  startDate?: string,
  endDate?: string,
  channel?: string
) => {
  return useQuery({
    queryKey: helpdeskKeys.appointments(page, limit, patientId, startDate, endDate, channel),
    queryFn: () => helpdeskService.getAppointments(page, limit, patientId, startDate, endDate, undefined, channel),
    ...HELPDESK_QUERY_DEFAULTS,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Create appointment mutation
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: helpdeskService.createAppointment,
    onSuccess: () => {
      // ✅ FIX: Force immediate refetch (not just mark stale)
      queryClient.invalidateQueries({
        queryKey: helpdeskKeys.appointments(),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: helpdeskKeys.dashboard(),
        refetchType: "all",
      });
    },
  });
};

/**
 * Update appointment status mutation
 */
export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: string;
    }) => helpdeskService.updateAppointmentStatus(appointmentId, status),
    onSuccess: () => {
      // Invalidate appointments and dashboard
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.dashboard() });
    },
  });
};

/**
 * Cancel appointment mutation
 */
export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: helpdeskService.cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.appointments() });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.dashboard() });
    },
  });
};

// ==================== Availability Hook ====================
export const useDoctorAvailability = (
  doctorId: string,
  hospitalId: string,
  date: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: helpdeskKeys.availability(doctorId, hospitalId, date),
    queryFn: () => helpdeskService.getAvailability(doctorId, hospitalId, date),
    staleTime: 1 * 60 * 1000, // ✅ 1min - availability changes
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!doctorId && !!hospitalId && !!date,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// ==================== Transactions Hook ====================
export const useTransactions = (
  page?: number,
  limit?: number,
  range?: string,
  nopage?: boolean,
  startDate?: string,
  endDate?: string,
  type?: string,
  isEdited?: boolean,
  search?: string,
) => {
  return useQuery({
    queryKey: helpdeskKeys.transactions(
      page,
      limit,
      range,
      startDate,
      endDate,
      type,
      isEdited,
      search
    ),
    queryFn: () =>
      helpdeskService.getTransactions(
        page,
        limit,
        range,
        nopage,
        startDate,
        endDate,
        type,
        isEdited,
        search
      ),
    ...HELPDESK_QUERY_DEFAULTS,
    // â Œ NO POLLING
  });
};

export const useEditTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      helpdeskService.editTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.transactions() });
    },
  });
};

// ==================== Transits Hook ====================
export const useTransits = (params?: any) => {
  return useQuery({
    queryKey: helpdeskKeys.transits(params),
    queryFn: () => helpdeskService.getTransits(params),
    ...HELPDESK_QUERY_DEFAULTS,
    // âŒ NO POLLING
  });
};

/**
 * Collect transit mutation
 */
export const useCollectTransit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: helpdeskService.collectTransit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.transits() });
    },
  });
};

// ==================== Doctor Creation Hook ====================
/**
 * Create doctor mutation
 */
export const useCreateDoctor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: helpdeskService.createDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.doctors() });
    },
  });
};
// ==================== Profile Hooks ====================
export const useHelpdeskProfile = () => {
  return useQuery({
    queryKey: [...BASE_KEY, "me"] as const,
    queryFn: helpdeskService.getMe,
    ...HELPDESK_QUERY_DEFAULTS,
    placeholderData: (previousData) => previousData,
  });
};

export const useUpdateHelpdeskProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<HelpdeskProfile>) =>
      helpdeskService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BASE_KEY, "me"] });
    },
  });
};
