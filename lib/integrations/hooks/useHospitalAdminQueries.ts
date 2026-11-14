import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin.service";
import { hospitalAdminService } from "../services/hospitalAdmin.service";

export const useHospitalAdminLeaves = () => {
  return useQuery({
    queryKey: ["hospital-admin", "leaves"],
    queryFn: () => adminService.getLeavesClient(),
  });
};

export const useRequestLeaveAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminService.requestLeaveClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-admin", "leaves"] });
    },
  });
};

export const useUpdateLeaveStatusAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminService.updateLeaveStatusClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-admin", "leaves"] });
    },
  });
};

export const useDoctorPharmaAudit = (
  doctorId: string,
  params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    patientType?: string;
  },
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [
      "doctor-pharma-audit",
      doctorId,
      params?.range,
      params?.startDate,
      params?.endDate,
      params?.search,
      params?.patientType,
    ],
    queryFn: () => hospitalAdminService.getDoctorPharmaAudit(doctorId, params),
    enabled: !!doctorId && enabled,
    staleTime: 30000,
  });
};
