'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '../api/apiServer';
import { DOCTOR_ENDPOINTS, COMMON_ENDPOINTS, BOOKING_ENDPOINTS, IPD_ENDPOINTS, AUTH_ENDPOINTS } from '../config';
import { DoctorDashboardData, DoctorQuickNote, DoctorPatient, PaginationData } from '../types/doctor';

export async function getDoctorDashboardAction(): Promise<{ success: boolean; data?: DoctorDashboardData; error?: string }> {
  try {
    const data = await apiServer<DoctorDashboardData>(DOCTOR_ENDPOINTS.DASHBOARD);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch dashboard data' };
  }
}

export async function getMyAnnouncementsAction(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer(COMMON_ENDPOINTS.MY_ANNOUNCEMENTS);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch announcements' };
  }
}

export async function getQuickNotesAction(): Promise<{ success: boolean; data?: DoctorQuickNote[]; error?: string }> {
  try {
    const data = await apiServer<DoctorQuickNote[]>(DOCTOR_ENDPOINTS.QUICK_NOTES);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch notes' };
  }
}

export async function addQuickNoteAction(text: string): Promise<{ success: boolean; data?: DoctorQuickNote; error?: string }> {
  try {
    const data = await apiServer<DoctorQuickNote>(DOCTOR_ENDPOINTS.QUICK_NOTES, {
      method: "POST",
      body: JSON.stringify({ text })
    });
    revalidatePath('/doctor');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add note' };
  }
}

export async function deleteQuickNoteAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiServer(`${DOCTOR_ENDPOINTS.QUICK_NOTES}/${id}`, {
      method: "DELETE"
    });
    revalidatePath('/doctor');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete note' };
  }
}

export async function getDoctorWeeklyStatsAction(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const today = new Date();
    // Default to last 7 days or start of current week for better visualization of flow
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days including today
    const data = await apiServer(`${DOCTOR_ENDPOINTS.CALENDAR_STATS}?view=weekly&startDate=${startOfWeek.toISOString()}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch weekly stats' };
  }
}

export async function getDoctorAnalyticsAction(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer(DOCTOR_ENDPOINTS.ANALYTICS);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch analytics' };
  }
}

export async function getDoctorProfileAction(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer(DOCTOR_ENDPOINTS.PROFILE);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch profile' };
  }
}

export async function getAllAppointmentsAction(params?: {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}): Promise<{ success: boolean; data?: any[]; pagination?: PaginationData; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.date) queryParams.append('date', params.date);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.type) queryParams.append('type', params.type);
    }

    const res = await apiServer<any>(`${BOOKING_ENDPOINTS.MY_APPOINTMENTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);

    // Support both old and new response formats
    const rawData = res.data || res;
    const pagination = res.pagination;

    const data = Array.isArray(rawData) ? rawData : [];

    // Normalize data for UI
    const normalizedData = (Array.isArray(data) ? data : []).map(item => {
      // Logic to extract only time if it includes a date
      const formatTimeOnly = (t: string) => {
        if (!t) return null;
        if (t.includes('T')) {
          return t.split('T')[1]?.substring(0, 5) || t;
        }
        // If it looks like a date (contains / or - and is long), it's probably not just a time
        if ((t.includes('/') || t.includes('-')) && t.length > 8) {
          return null;
        }
        return t;
      };

      const tSlot = formatTimeOnly(item.timeSlot);
      const apptTime = formatTimeOnly(item.appointmentTime);
      const sTime = formatTimeOnly(item.startTime);
      const eTime = formatTimeOnly(item.endTime);

      const rawTime = tSlot || apptTime || (sTime && eTime ? `${sTime} - ${eTime}` : sTime) || 'N/A';

      return {
        ...item,
        id: item._id,
        patientName: item.patient?.name || item.patientDetails?.name || 'Unknown Patient',
        patientId: item.patient?.mrn || item.mrn || 'N/A',
        time: rawTime,
        symptoms: item.symptoms || [],
        prescription: item.prescription,
        status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'
      };
    });

    return {
      success: true,
      data: normalizedData,
      pagination
    };
  } catch (error: any) {
    console.error('getAllAppointmentsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch appointments' };
  }
}

export async function getRecentPatientsAction(): Promise<{ success: boolean; data?: DoctorPatient[]; error?: string }> {
  try {
    const dashboard = await apiServer<DoctorDashboardData>(DOCTOR_ENDPOINTS.DASHBOARD);
    return { success: true, data: dashboard.recentPatients || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch patients' };
  }
}

export async function getDoctorReportsAction(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    // Placeholder as endpoint might not exist or be separate
    return { success: true, data: [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch reports' };
  }
}

export async function getDoctorPatientsAction(params?: { page?: number; limit?: number; sort?: string; search?: string; type?: string }): Promise<{ success: boolean; data?: DoctorPatient[]; pagination?: PaginationData; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.search) queryParams.append('search', params.search);
      if (params.type) queryParams.append('type', params.type);
    }

    const res = await apiServer<any>(`${DOCTOR_ENDPOINTS.MY_PATIENTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);

    // Backend returns { data, pagination }
    if (res && res.data) {
      return {
        success: true,
        data: res.data,
        pagination: res.pagination
      };
    }

    // Fallback for legacy or unexpected response
    return { success: true, data: Array.isArray(res) ? res : [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch patients' };
  }
}

export async function getDoctorPatientDetailsAction(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const patient = await apiServer<any>(DOCTOR_ENDPOINTS.PATIENT_DETAILS(id));
    return { success: true, data: patient };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch patient details' };
  }
}

export async function getAppointmentDetailsAction(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer<any>(BOOKING_ENDPOINTS.DETAILS(id));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch appointment details' };
  }
}

export async function updateDoctorProfileAction(profileData: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const isFormData = profileData instanceof FormData;
    const body = isFormData ? profileData : JSON.stringify(profileData);

    const data = await apiServer(DOCTOR_ENDPOINTS.PROFILE, {
      method: "PUT",
      body,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

export async function uploadDoctorPhotoAction(formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer(`${DOCTOR_ENDPOINTS.PROFILE}/photo`, {
      method: "PATCH",
      body: formData,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
}

export async function getDoctorInpatientsAction(doctorId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const query = doctorId ? `?doctorId=${doctorId}` : '';
    // Rely on backend role-based security. The backend automatically 
    // filters admissions by the requesting doctor's profile.
    const admissions = await apiServer<any[]>(`${IPD_ENDPOINTS.ADMISSIONS}/active${query}`);

    return {
      success: true,
      data: Array.isArray(admissions) ? admissions : []
    };
  } catch (error: any) {
    console.error(`[getDoctorInpatientsAction] Error:`, error);
    return { success: false, error: error.message || 'Failed to fetch inpatient records' };
  }
}
export async function getPatientHistoryAction(id: string, scope: 'hospital' | 'all' = 'hospital'): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const history = await apiServer<any>(`${DOCTOR_ENDPOINTS.PATIENT_HISTORY(id)}?scope=${scope}`);
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch patient history' };
  }
}
