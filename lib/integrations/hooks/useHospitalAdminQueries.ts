import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin.service";

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
