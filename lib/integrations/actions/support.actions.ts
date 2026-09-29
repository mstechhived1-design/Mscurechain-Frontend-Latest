'use server';

import { SUPPORT_ENDPOINTS } from '../config/endpoints';
import { SupportTicket } from '../types/support';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../config';
import { apiServer } from '../api/apiServer';

export async function createSupportTicketAction(formData: FormData): Promise<{ success: boolean; data?: SupportTicket; error?: string }> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;

        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as any)['Authorization'] = `Bearer ${accessToken}`;
        }

        // We use fetch directly here because apiServer forces Content-Type: application/json
        // which breaks FormData (multipart/form-data)
        const res = await fetch(`${API_CONFIG.BASE_URL}${SUPPORT_ENDPOINTS.CREATE}`, {
            method: 'POST',
            headers,
            body: formData, // FormData automatically sets Content-Type to multipart/form-data with boundary
            cache: 'no-store'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'API Server Error' }));
            throw new Error(errorData.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        revalidatePath('/doctor/support');
        return { success: true, data: data.data || data }; // Backend returns { success: true, data: ... }
    } catch (error: any) {
        console.error("Support Create Error", error);
        return { success: false, error: error.message || 'Failed to create ticket' };
    }
}

export async function getMyTicketsAction(): Promise<{ success: boolean; data?: SupportTicket[]; error?: string }> {
    try {
        const data = await apiServer<SupportTicket[]>(SUPPORT_ENDPOINTS.MY_TICKETS);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch tickets' };
    }
}
