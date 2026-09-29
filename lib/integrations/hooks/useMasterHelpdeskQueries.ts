import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterHelpdeskService } from "../services/masterHelpdesk.service";

const MASTER_KEY = ["masterhelpdesk"] as const;

export const masterHelpdeskKeys = {
  all: MASTER_KEY,
  dashboard: (hospitalId?: string) => [...MASTER_KEY, "dashboard", { hospitalId }] as const,
  queue: (page: number, limit: number, status?: string, hospitalId?: string, startDate?: string, endDate?: string, doctorId?: string) => 
    [...MASTER_KEY, "queue", { page, limit, status, hospitalId, startDate, endDate, doctorId }] as const,
  transactions: (page: number, limit: number, hospitalId?: string, startDate?: string, endDate?: string, type?: string, search?: string, paymentMode?: string, doctorId?: string) => 
    [...MASTER_KEY, "transactions", { page, limit, hospitalId, startDate, endDate, type, search, paymentMode, doctorId }] as const,
  patients: (page: number, limit: number, search?: string, hospitalId?: string) => 
    [...MASTER_KEY, "patients", { page, limit, search, hospitalId }] as const,
  doctors: (hospitalId?: string) => [...MASTER_KEY, "doctors", { hospitalId }] as const,
};

export const useMasterDashboard = (hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.dashboard(hospitalId),
    queryFn: () => masterHelpdeskService.getDashboard(hospitalId),
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });
};

export const useMasterQueue = (
  page: number = 1,
  limit: number = 20,
  status?: string,
  hospitalId?: string,
  startDate?: string,
  endDate?: string,
  doctorId?: string
) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.queue(page, limit, status, hospitalId, startDate, endDate, doctorId),
    queryFn: () => masterHelpdeskService.getQueue(page, limit, status, hospitalId, startDate, endDate, doctorId),
    staleTime: 60 * 1000,
  });
};

export const useMasterTransactions = (
  page: number = 1,
  limit: number = 20,
  hospitalId?: string,
  startDate?: string,
  endDate?: string,
  type?: string,
  search?: string,
  paymentMode?: string,
  doctorId?: string
) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.transactions(page, limit, hospitalId, startDate, endDate, type, search, paymentMode, doctorId),
    queryFn: () => masterHelpdeskService.getTransactions(page, limit, hospitalId, startDate, endDate, type, search, paymentMode, doctorId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMasterPatients = (page: number = 1, limit: number = 20, search?: string, hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.patients(page, limit, search, hospitalId),
    queryFn: () => masterHelpdeskService.getPatients(page, limit, search, hospitalId),
    staleTime: 2 * 60 * 1000,
  });
};

export const useMasterDoctors = (hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.doctors(hospitalId),
    queryFn: () => masterHelpdeskService.getDoctors(hospitalId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMasterUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
      duration,
    }: {
      appointmentId: string;
      status: string;
      duration?: number;
    }) => masterHelpdeskService.updateAppointmentStatus(appointmentId, status, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterHelpdeskKeys.queue(1, 20) });
      queryClient.invalidateQueries({ queryKey: masterHelpdeskKeys.dashboard() });
    },
  });
};

export const useMasterDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => masterHelpdeskService.deleteAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterHelpdeskKeys.all });
    },
  });
};
