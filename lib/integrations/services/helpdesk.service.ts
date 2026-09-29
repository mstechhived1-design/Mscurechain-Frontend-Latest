import {
  HELPDESK_ENDPOINTS,
  MASTER_HELPDESK_ENDPOINTS,
  DOCTOR_ENDPOINTS,
  TRANSIT_ENDPOINTS,
} from "../config";
import { apiClient } from "../api";
import { calculateEffectiveSlot } from "../../utils/time-slots";
import type {
  HelpdeskDashboard,
  HelpdeskProfile,
  HelpdeskDoctor,
  PatientRegistrationRequest,
  PatientRegistrationResponse,
} from "../types/helpdesk";

/**
 * Helpdesk Service
 * Client-side service for helpdesk operations
 * Used in client components for interactive features
 */
export const helpdeskService = {
  // ==================== Dashboard ====================
  /**
   * Get helpdesk dashboard with stats and recent data
   * @returns Dashboard data including stats, recent patients, and appointments
   */
  getDashboard: () =>
    apiClient<HelpdeskDashboard>(HELPDESK_ENDPOINTS.DASHBOARD),

  // ==================== Profile ====================
  /**
   * Get helpdesk profile information
   * @returns Profile data including hospital assignment
   */
  getMe: () => apiClient<HelpdeskProfile>(HELPDESK_ENDPOINTS.ME),

  /**
   * Get master helpdesk profile information
   * @returns Profile data 
   */
  getMasterMe: () => apiClient<HelpdeskProfile>(MASTER_HELPDESK_ENDPOINTS.ME),

  /**
   * Update helpdesk profile
   * @param data Updated profile information
   */
  updateProfile: (data: Partial<HelpdeskProfile>) =>
    apiClient<HelpdeskProfile>(HELPDESK_ENDPOINTS.ME, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Update master helpdesk profile
   * @param data Updated profile information
   */
  updateMasterProfile: (data: Partial<HelpdeskProfile>) =>
    apiClient<HelpdeskProfile>(MASTER_HELPDESK_ENDPOINTS.ME, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // ==================== Doctors ====================
  /**
   * Get all doctors in the helpdesk's hospital
   * @returns List of doctors
   */
  getDoctors: () =>
    apiClient<any>(
      `${HELPDESK_ENDPOINTS.DOCTORS}?limit=100&_t=${Date.now()}`,
    ),

  /**
   * Create a new doctor and assign to hospital
   * @param data Doctor information
   */
  createDoctor: (data: any) =>
    apiClient<{ message: string; doctor: HelpdeskDoctor }>(
      HELPDESK_ENDPOINTS.CREATE_DOCTOR,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  // ==================== Patients ====================
  /**
   * Register a new patient
   * @param data Patient registration data
   */
  registerPatient: (data: PatientRegistrationRequest) =>
    apiClient<PatientRegistrationResponse>(
      HELPDESK_ENDPOINTS.REGISTER_PATIENT,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Search for patients by name or mobile
   * @param query Search query
   */
  searchPatients: (
    query: string = "",
    page: number = 1,
    limit: number = 10,
    type?: string,
    channel?: string
  ) => {
    const q = encodeURIComponent(query);
    const typeQuery = type && type !== "all" ? `&type=${type}` : "";
    const channelQuery = channel && channel !== "all" ? `&channel=${channel}` : "";
    return apiClient<any>(
      `${HELPDESK_ENDPOINTS.PATIENTS_SEARCH}?q=${q}&page=${page}&limit=${limit}${typeQuery}${channelQuery}`,
    );
  },

  /**
   * Get patient details by ID
   * @param patientId Patient ID
   */
  getPatientById: (patientId: string) =>
    apiClient<any>(HELPDESK_ENDPOINTS.PATIENT_DETAILS(patientId)),

  /**
   * Get IPD admissions for a specific patient
   * @param patientId Patient ID
   */
  getPatientIPDAdmissions: (patientId: string) =>
    apiClient<any>(HELPDESK_ENDPOINTS.IPD_ADMISSIONS(patientId)),

  /**
   * Get OPD visit history (appointments) for a specific patient — HELPDESK portal
   * @param patientId Patient ID
   */
  getPatientVisitHistory: (patientId: string) =>
    apiClient<any>(`/helpdesk/patients/${patientId}/visit-history`),

  /**
   * Get OPD visit history (appointments) for a specific patient — MASTERHELPDESK portal
   * @param patientId Patient ID
   */
  getMasterPatientVisitHistory: (patientId: string) =>
    apiClient<any>(`/masterhelpdesk/visits/history/${patientId}`),

  /**
   * Update patient information
   * @param patientId Patient ID
   * @param data Updated patient data
   */
  updatePatient: (patientId: string, data: any) =>
    apiClient<any>(HELPDESK_ENDPOINTS.UPDATE_PATIENT(patientId), {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Lookup guardian details by mobile number (hospital scoped)
   */
  lookupGuardianByMobile: (mobile: string) =>
    apiClient<any>(`/helpdesk/guardians/lookup?mobile=${encodeURIComponent(mobile)}`),

  // ==================== Appointments ====================
  /**
   * Create a new appointment
   * @param data Appointment data
   */
  createAppointment: (data: any) =>
    apiClient<any>(HELPDESK_ENDPOINTS.APPOINTMENTS, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update appointment status
   * @param appointmentId Appointment ID
   * @param status New status
   */
  updateAppointmentStatus: (appointmentId: string, statusOrData: string | any) => {
    const body = typeof statusOrData === 'string' ? { status: statusOrData } : statusOrData;
    return apiClient<any>(HELPDESK_ENDPOINTS.APPOINTMENT_STATUS(appointmentId), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },


  /**
   * Cancel appointment
   * @param appointmentId Appointment ID
   */
  cancelAppointment: (appointmentId: string) =>
    apiClient<any>(HELPDESK_ENDPOINTS.APPOINTMENT_STATUS(appointmentId), {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    }),

  /**
   * Get appointment details by ID
   * @param appointmentId Appointment ID
   */
  getAppointmentById: (appointmentId: string) =>
    apiClient<any>(`${HELPDESK_ENDPOINTS.APPOINTMENTS}/${appointmentId}`),

  /**
   * Get doctor availability for a specific hospital and date
   * @param doctorId Doctor ID
   * @param hospitalId Hospital ID
   * @param date Date string (YYYY-MM-DD)
   */
  getAvailability: async (
    doctorId: string,
    hospitalId: string,
    date: string,
  ) => {
    // Reusing the centralized calendar stats endpoint as per requirements
    // Fetch weekly view to get slot details for the specific date
    const response = await apiClient<any>(
      `${DOCTOR_ENDPOINTS.CALENDAR_STATS}?view=weekly&startDate=${date}&doctorId=${doctorId}`,
    );

    // Transform response to match Helpdesk UI expectations
    // Response format: { timeSlots: [], days: [{ date, slots: {} }] }
    // Expected format: { slots: [{ timeSlot, isFull, availableCount, totalCapacity, effectiveStart, effectiveEnd }] }

    const targetDateStr = new Date(date).toDateString();
    const dayData = response.days?.find(
      (d: any) => new Date(d.date).toDateString() === targetDateStr,
    );

    const slots =
      response.timeSlots?.map((slot: string) => {
        const slotInfo = dayData?.slots?.[slot] || { count: 0, isFull: false };
        const HOURLY_LIMIT = 12; // Matching backend constant
        const count = slotInfo.count || 0;

        // Calculate the specific 5-minute increment for the NEXT booking
        const { startTime, endTime } = calculateEffectiveSlot(slot, count, 5);

        return {
          timeSlot: slot, // Display Label (e.g., "9:00 AM - 10:00 AM")
          isFull: slotInfo.isFull || count >= HOURLY_LIMIT,
          availableCount: Math.max(0, HOURLY_LIMIT - count),
          totalCapacity: HOURLY_LIMIT,
          effectiveStart: startTime, // Specific 5-min start (e.g., "9:10 AM")
          effectiveEnd: endTime, // Specific 5-min end (e.g., "9:15 AM")
        };
      }) || [];

    return { slots };
  },

  /**
   * Get all appointments for the helpdesk
   * @returns List of appointments
   */
  getAppointments: (
    page: number = 1,
    limit: number = 10,
    patientId?: string,
    startDate?: string,
    endDate?: string,
    date?: string,
    channel?: string,
    hospitalId?: string
  ) => {
    let query = `${HELPDESK_ENDPOINTS.APPOINTMENTS}?page=${page}&limit=${limit}`;
    if (patientId) query += `&patientId=${patientId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (date) query += `&date=${date}`;
    if (channel && channel !== 'all') query += `&channel=${channel}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  checkFollowUpEligibility: (patientId: string, doctorId?: string, type?: string, date?: string) => {
    let url = `/bookings/check-follow-up?patientId=${patientId}`;
    if (doctorId) url += `&doctorId=${doctorId}`;
    if (type) url += `&type=${type}`;
    if (date) url += `&date=${date}`;
    return apiClient<any>(url);
  },

  /**
   * Get global master queue for the helpdesk (includes offline + online)
   * @returns List of appointments
   */
  getMasterQueue: (
    page: number = 1,
    limit: number = 10,
    hospitalId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    doctorId?: string
  ) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.QUEUE}?page=${page}&limit=${limit}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (status) query += `&status=${status}`;
    if (doctorId) query += `&doctorId=${doctorId}`;
    return apiClient<any>(query);
  },

  /**
   * Get all transactions/payments
   * @returns List of transactions
   */
  getTransactions: (
    page: number = 1,
    limit: number = 10,
    range?: string,
    nopage?: boolean,
    startDate?: string,
    endDate?: string,
    type?: string,
    isEdited?: boolean,
    search?: string,
  ) => {
    let query = `${HELPDESK_ENDPOINTS.TRANSACTIONS}?page=${page}&limit=${limit}`;
    if (range) query += `&range=${range}`;
    if (nopage) query += `&nopage=true`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (type) query += `&type=${type}`;
    if (isEdited) query += `&isEdited=true`;
    if (search && search.trim() !== "") query += `&search=${encodeURIComponent(search.trim())}`;
    return apiClient<any>(query);
  },

  editTransaction: (id: string, payload: any) => {
    return apiClient<any>(`${HELPDESK_ENDPOINTS.TRANSACTIONS}/${id}/edit`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // ==================== Transits ====================
  /**
   * Get all clinical transits for the hospital
   * @returns List of transits
   */
  getTransits: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.type && params.type !== "all")
      query.append("type", params.type);

    return apiClient<{ success: boolean; transits: any[]; pagination: any }>(
      `${TRANSIT_ENDPOINTS.LIST}?${query.toString()}`,
    );
  },

  /**
   * Mark transit documents as collected
   * @param appointmentId Appointment ID
   */
  collectTransit: (appointmentId: string) =>
    apiClient<any>(TRANSIT_ENDPOINTS.COLLECT(appointmentId), {
      method: "PATCH",
    }),

  // ==================== Announcements ====================
  /**
   * Get all hospital announcements
   * @returns List of announcements
   */
  getAnnouncements: () =>
    apiClient<{ announcements: any[] }>(DOCTOR_ENDPOINTS.ANNOUNCEMENTS),

  /**
   * Save a transaction report (JSON summary)
   * @param data Report data including charges and totals
   */
  saveTransactionReport: (data: {
    patientId: string;
    reportData: any;
    totals: {
      grandTotal: number;
      totalPaid: number;
      balance: number;
    };
    generatedBy?: string;
  }) =>
    apiClient<any>("/reports/transaction-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Get all saved transaction reports for a patient
   * @param patientId Patient ID
   */
  getPatientTransactionReports: (patientId: string) =>
    apiClient<any[]>(`/reports/transaction-reports/patient/${patientId}`),

  /**
   * Get the dynamically generated IPD Final Bill (Interim Bill) for a patient
   * @param patientId Patient ID
   */
  getIPDFinalBill: (patientId: string) =>
    apiClient<any[]>(`/reports/transaction-reports/patient/${patientId}/ipd-final-bill`, { skipCache: true }),

  /**
   * Get the dynamically generated OPD Final Bill for a patient
   * @param patientId Patient ID
   */
  getOPDFinalBill: (patientId: string, latestOnly: boolean = false) =>
    apiClient<any[]>(`/reports/transaction-reports/patient/${patientId}/opd-final-bill${latestOnly ? '?latestOnly=true' : ''}`, { skipCache: true }),

  /**
   * Get all saved transaction reports for the hospital
   */
  getAllTransactionReports: () =>
    apiClient<any[]>("/reports/transaction-reports"),

  /**
   * Update an existing transaction report
   * @param id Report ID
   * @param data Updated report data
   */
  updateTransactionReport: (id: string, data: any) =>
    apiClient<any>(`/reports/transaction-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete an existing transaction report
   * @param id Report ID
   */
  deleteTransactionReport: (id: string) =>
    apiClient<any>(`/reports/transaction-reports/${id}`, {
      method: "DELETE",
    }),
};
