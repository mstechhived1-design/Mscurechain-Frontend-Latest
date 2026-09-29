import { useQuery } from '@tanstack/react-query';
import { getDoctorInpatientsAction } from '../actions/doctor.actions';

// Roles that are allowed to access doctor-specific IPD inpatient data
const DOCTOR_IPD_ROLES = ['doctor', 'hospital-admin', 'super-admin'];

export const useDoctorInpatients = (userId?: string, role?: string) => {
    const isAuthorized = !!role && DOCTOR_IPD_ROLES.includes(role);
    return useQuery({
        queryKey: ['doctor-inpatients', userId],
        queryFn: async () => {
            const res = await getDoctorInpatientsAction(userId);
            if (res.success) return res.data || [];
            throw new Error(res.error || 'Failed to fetch inpatients');
        },
        enabled: !!userId && isAuthorized, // Only fire for authorized roles (not helpdesk/nurse)
        staleTime: 0, // No stale time - always fetch fresh
        refetchInterval: 10000, // 10s auto-refresh for reactive UI
        refetchOnWindowFocus: true
    });
};
