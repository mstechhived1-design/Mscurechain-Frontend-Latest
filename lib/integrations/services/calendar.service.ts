import { API_CONFIG } from '../config/api-config';

export const getDoctorCalendarStats = async (
    token: string,
    params: {
        month?: number;
        year?: number;
        view?: 'weekly';
        startDate?: string;
        doctorId?: string;
    }
) => {
    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month.toString());
    if (params.year) queryParams.append('year', params.year.toString());
    if (params.view) queryParams.append('view', params.view);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.doctorId) queryParams.append('doctorId', params.doctorId);

    const response = await fetch(`${API_CONFIG.BASE_URL}/doctors/calendar/stats?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch calendar stats');
    }

    return response.json();
};
