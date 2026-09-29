import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/lib/integrations/services/patient.service';

export function usePatientDashboard() {
    return useQuery({
        queryKey: ['patient', 'dashboard'],
        queryFn: async () => {
            const response = await patientService.getDashboardData();
            if (response.success && response.data) {
                return response.data;
            }
            throw new Error(response.error || 'Failed to load dashboard data');
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
}
