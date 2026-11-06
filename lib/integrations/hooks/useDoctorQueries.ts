import { useQuery } from '@tanstack/react-query';
import { getDoctorInpatientsAction } from '../actions/doctor.actions';

// Roles that are allowed to access doctor-specific IPD inpatient data
const DOCTOR_IPD_ROLES = ['doctor', 'hospital-admin', 'super-admin'];

export const useDoctorInpatients = (userId?: string, role?: string) => {
    const isAuthorized = !!role && DOCTOR_IPD_ROLES.includes(role);
    return useQuery({
        queryKey: ['doctor-inpatients', userId],
        queryFn: async () => {
            if (!isAuthorized) return [];
            const res = await getDoctorInpatientsAction(userId);
            if (res.success) return res.data || [];
            throw new Error(res.error || 'Failed to fetch inpatients');
        },
        enabled: Boolean(userId && isAuthorized),
        staleTime: 30000,
        refetchInterval: isAuthorized ? 10000 : false,
        refetchOnWindowFocus: isAuthorized,
        retry: false
    });
};
