import { MASTER_HELPDESK_ENDPOINTS, DOCTOR_ENDPOINTS } from "../config";
import { apiClient } from "../api";

/**
 * Master Helpdesk Service
 * Global operations for institutional oversight
 */
export const masterHelpdeskService = {
  // ==================== Dashboard ====================
  getDashboard: (hospitalId?: string) => {
    let query = MASTER_HELPDESK_ENDPOINTS.DASHBOARD;
    if (hospitalId) query += `?hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  getMe: () => apiClient<any>(MASTER_HELPDESK_ENDPOINTS.ME),

  getDoctors: (hospitalId?: string) => {
    let query = `/helpdesk/doctors`;
    if (hospitalId) query += `?hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  // ==================== Queue/Appointments ====================
  getQueue: (page: number = 1, limit: number = 20, status?: string, hospitalId?: string, startDate?: string, endDate?: string, doctorId?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.QUEUE}?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (doctorId && doctorId !== 'all') query += `&doctorId=${doctorId}`;
    return apiClient<any>(query);
  },

  // ==================== Transactions ====================
  getTransactions: (
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
    let query = `${MASTER_HELPDESK_ENDPOINTS.TRANSACTIONS}?page=${page}&limit=${limit}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (type) query += `&type=${type}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (paymentMode) query += `&paymentMode=${paymentMode}`;
    if (doctorId && doctorId !== 'all') query += `&doctorId=${doctorId}`;
    return apiClient<any>(query);
  },

  // ==================== Patients ====================
  getPatients: (page: number = 1, limit: number = 20, search?: string, hospitalId?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.PATIENTS}?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  getPatientById: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.PATIENT_DETAILS(id)),

  getVisitHistory: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.VISIT_HISTORY(id)),

  getIPDAdmissions: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.IPD_ADMISSIONS(id)),

  // ==================== Registration ====================
  registerPatient: (data: any) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.REGISTER_PATIENT, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAppointmentStatus: (appointmentId: string, statusOrData: string | any, duration?: number) => {
    const body = typeof statusOrData === 'string' ? { status: statusOrData, duration } : statusOrData;
    return apiClient<any>(MASTER_HELPDESK_ENDPOINTS.APPOINTMENT_STATUS(appointmentId), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  
  deleteAppointment: (appointmentId: string) =>
    apiClient<any>(`/masterhelpdesk/appointments/${appointmentId}`, {
      method: "DELETE",
    }),

  getAvailability: async (doctorId: string, hospitalId: string, date: string) => {
    const response = await apiClient<any>(
      `${DOCTOR_ENDPOINTS.CALENDAR_STATS}?view=weekly&startDate=${date}&doctorId=${doctorId}`
    );

    const targetDateStr = date; // "YYYY-MM-DD"
    const dayData = response.days?.find((d: any) => {
      const dDate = new Date(d.date);
      const dStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
      return dStr === targetDateStr;
    });

    const isHoliday = dayData?.isNotAvailable || dayData?.isLeave || !dayData;

    const slots =
      response.timeSlots?.map((slot: string) => {
        const slotInfo = dayData?.slots?.[slot] || { count: 0, isFull: isHoliday };
        const HOURLY_LIMIT = 12;
        const count = slotInfo.count || 0;

        return {
          timeSlot: slot,
          isFull: slotInfo.isFull || count >= HOURLY_LIMIT || isHoliday,
          availableCount: Math.max(0, HOURLY_LIMIT - count),
          totalCapacity: HOURLY_LIMIT,
        };
      }) || [];

    return {
      slots,
      isHoliday,
      isLeave: dayData?.isLeave || false,
      isNotAvailable: dayData?.isNotAvailable || false,
    };
  },
};
