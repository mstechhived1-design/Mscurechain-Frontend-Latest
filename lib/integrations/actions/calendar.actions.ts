'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getDoctorCalendarStats } from '../services/calendar.service';
import { API_CONFIG } from '../config/api-config';

export async function getDoctorCalendarStatsAction(params: {
    month?: number;
    year?: number;
    view?: 'weekly';
    startDate?: string;
    doctorId?: string;
}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return { success: false, error: 'Authentication required' };
        }

        const data = await getDoctorCalendarStats(token, params);
        return { success: true, data };
    } catch (error: any) {
        console.error('getDoctorCalendarStatsAction error:', error);
        return { success: false, error: error.message || 'Failed to fetch calendar stats' };
    }
}

export async function updateDoctorAvailabilityAction(availability: any[]) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return { success: false, error: 'Authentication required' };
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/doctors/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ availability }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update availability');
        }

        const data = await response.json();
        revalidatePath('/doctor/profile');
        return { success: true, data };
    } catch (error: any) {
        console.error('updateDoctorAvailabilityAction error:', error);
        return { success: false, error: error.message || 'Failed to update availability' };
    }
}
