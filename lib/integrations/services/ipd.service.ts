import { IPD_ENDPOINTS } from "../config";
import { apiClient } from "../api";
import type { Bed, IPDAdmission, BedDetailsResponse } from "../types/ipd";

/**
 * IPD Service
 * Client-side service for In-Patient Department operations
 */
export const ipdService = {
  // ==================== Bed Management ====================

  /**
   * List all beds with optional filtering
   */
  getBeds: (params?: {
    status?: string;
    type?: string;
    department?: string;
    room?: string;
  }, skipCache?: boolean) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.type) query.append("type", params.type);
    if (params?.department) query.append("department", params.department);
    if (params?.room) query.append("room", params.room);
    return apiClient<Bed[]>(`${IPD_ENDPOINTS.BEDS}?${query.toString()}`, { skipCache });
  },

  /**
   * Get specific bed details with occupancy data
   */
  getBedDetails: (id: string, skipCache: boolean = false) =>
    apiClient<BedDetailsResponse>(IPD_ENDPOINTS.BED_DETAILS(id), { skipCache }),

  /**
   * Create a single bed
   */
  createBed: (data: Partial<Bed>) =>
    apiClient<Bed>(IPD_ENDPOINTS.BEDS, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update bed status
   */
  updateBedStatus: (id: string, status: string) =>
    apiClient<Bed>(IPD_ENDPOINTS.BED_STATUS(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /**
   * Bulk import beds via CSV
   */
  importBeds: (formData: FormData) =>
    apiClient<{ message: string; errors?: any[] }>(IPD_ENDPOINTS.BED_IMPORT, {
      method: "POST",
      body: formData,
      // Note: apiClient should handle FormData correctly by not setting JSON header if body is FormData
    }),

  // ==================== Admissions Workflow ====================

  /**
   * Initiate IPD Admission
   */
  initiateAdmission: (data: {
    patientId: string;
    doctorId: string;
    bedId: string;
    admissionType: string;
    diet?: string;
    clinicalNotes?: string;
    reason?: string;
    vitals?: any;
    amount?: number;
    discount?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentDetails?: any;
  }) =>
    apiClient<{ admission: IPDAdmission; occupancy: any }>(
      IPD_ENDPOINTS.ADMISSIONS,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Transfer patient to a different bed
   */
  transferBed: (admissionId: string, newBedId: string) =>
    apiClient<{ message: string; newOccupancy: any }>(
      IPD_ENDPOINTS.TRANSFER_BED(admissionId),
      {
        method: "POST",
        body: JSON.stringify({ newBedId }),
      },
    ),

  /**
   * Get all active IPD admissions (for Monitoring)
   */
  getActiveAdmissions: (department?: string, skipCache?: boolean) => {
    const query = department
      ? `?department=${encodeURIComponent(department)}`
      : "";
    return apiClient<any[]>(`${IPD_ENDPOINTS.ADMISSIONS}/active${query}`, { skipCache });
  },

  /**
   * Get all discharged IPD admissions
   */
  getDischargedAdmissions: (skipCache?: boolean) => {
    return apiClient<any[]>(`${IPD_ENDPOINTS.ADMISSIONS}/discharged`, { skipCache });
  },

  /**
   * Get full admission details for manifest/receipt printing or discharge
   */
  getAdmissionDetails: (id: string) =>
    apiClient<any>(IPD_ENDPOINTS.ADMISSION_DETAILS(id)),

  /**
   * Discharge patient
   */
  dischargePatient: (admissionId: string) =>
    apiClient<{ message: string; admission: IPDAdmission }>(
      IPD_ENDPOINTS.DISCHARGE(admissionId),
      {
        method: "POST",
      },
    ),

  /**
   * Confirm discharge and send notifications
   */
  confirmDischarge: (admissionId: string) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      IPD_ENDPOINTS.CONFIRM_DISCHARGE(admissionId),
      {
        method: "POST",
      },
    ),

  /**
   * Update admission details
   */
  updateAdmissionDetails: (id: string, data: { reason?: string; clinicalNotes?: string }) =>
    apiClient<{ message: string; admission: IPDAdmission }>(
      `${IPD_ENDPOINTS.ADMISSIONS}/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  /**
   * Quick update bed status (Cleaning -> Vacant)
   */
  quickUpdateBedStatus: (bedId: string, status: string) =>
    apiClient<{ message: string; bed: Bed }>(
      IPD_ENDPOINTS.BED_STATUS(bedId), // Reusing status endpoint for quick status
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  /**
   * Request Patient Discharge (Doctor Initiated)
   */
  requestDischarge: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.REQUEST_DISCHARGE(admissionId), {
      method: "POST",
    }),

  /**
   * Request Patient Transfer (Doctor Initiated)
   */
  requestTransfer: (
    admissionId: string,
    instructions?: {
      ward?: string;
      room?: string;
      bed?: string;
      notes?: string;
    },
  ) =>
    apiClient<any>(IPD_ENDPOINTS.REQUEST_TRANSFER(admissionId), {
      method: "POST",
      body: JSON.stringify(instructions),
    }),

  /**
   * Get all pending discharge/transfer requests
   */
  getPendingRequests: (skipCache: boolean = false) =>
    apiClient<any[]>(IPD_ENDPOINTS.PENDING_REQUESTS, { skipCache }),

  /**
   * Cancel Patient Discharge Request
   */
  cancelDischargeRequest: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.CANCEL_DISCHARGE(admissionId), {
      method: "POST",
    }),

  /**
   * Cancel Patient Transfer Request
   */
  cancelTransferRequest: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.CANCEL_TRANSFER(admissionId), {
      method: "POST",
    }),

  // ==================== Room Management ====================

  getRooms: () => apiClient<any[]>(`${IPD_ENDPOINTS.BEDS}/rooms`),
  createRoom: (data: any) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/rooms`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteRoom: (id: string) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/rooms/${id}`, {
      method: "DELETE",
    }),
  updateRoom: (id: string, data: any) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/rooms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getUnitTypes: () => apiClient<string[]>(`${IPD_ENDPOINTS.BEDS}/unit-types`),
  addUnitType: (type: string) =>
    apiClient<string[]>(`${IPD_ENDPOINTS.BEDS}/unit-types`, {
      method: "POST",
      body: JSON.stringify({ type }),
    }),
  updateUnitType: (oldType: string, newType: string) =>
    apiClient<string[]>(`${IPD_ENDPOINTS.BEDS}/unit-types`, {
      method: "PATCH",
      body: JSON.stringify({ oldType, newType }),
    }),
  deleteUnitType: (type: string) =>
    apiClient<string[]>(
      `${IPD_ENDPOINTS.BEDS}/unit-types/${encodeURIComponent(type)}`,
      {
        method: "DELETE",
      },
    ),

  // ==================== Department Management ====================

  getIPDDepartments: () =>
    apiClient<any[]>(`${IPD_ENDPOINTS.BEDS}/departments`),
  createIPDDepartment: (data: any) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/departments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteIPDDepartment: (id: string) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/departments/${id}`, {
      method: "DELETE",
    }),
  updateIPDDepartment: (id: string, data: any) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // ==================== Bed Deletion/Editing ====================
  deleteBed: (id: string) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/${id}`, {
      method: "DELETE",
    }),
  updateBed: (id: string, data: any) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // ==================== Clinical Logging ====================

  logVitals: (data: {
    admissionId: string;
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    spO2: number;
    temperature: number;
    respiratoryRate?: number;
    glucose?: number;
    glucoseType?: "Fasting" | "After Meal" | "Random";
    condition?: string;
    notes?: string;
  }) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/log-vitals`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addClinicalNote: (data: {
    admissionId: string;
    type: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    visibility?: string;
  }) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/add-note`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  administerMedication: (data: {
    admissionId: string;
    prescriptionId: string;
    medicineId: string;
    drugName: string;
    dose: string;
    route: string;
    status?: string;
    timeSlot: string;
    notes?: string;
  }) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/administer-med`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteMedicationRecord: (recordId: string) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/administer-med/${recordId}`, {
      method: "DELETE",
    }),

  logDiet: (data: {
    admissionId: string;
    items: { name: string; quantity?: string; calories?: string | number }[];
    category: string;
    recordedDate: string;
    recordedTime: string;
    notes?: string;
  }) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/log-diet`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteDietRecord: (recordId: string) =>
    apiClient<any>(`${IPD_ENDPOINTS.ADMISSIONS}/delete-diet/${recordId}`, {
      method: "DELETE",
    }),

  getPrescriptions: (admissionId: string) =>
    apiClient<any[]>(IPD_ENDPOINTS.PRESCRIPTIONS(admissionId)),

  getLabReports: (admissionId: string) =>
    apiClient<any[]>(IPD_ENDPOINTS.LAB_REPORTS(admissionId)),

  getClinicalHistory: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.CLINICAL_HISTORY(admissionId)),

  // ==================== Vitals Threshold Management ====================
  getHospitalThresholds: (hospitalId: string) =>
    apiClient<any[]>(`${IPD_ENDPOINTS.THRESHOLDS.BASE}/${hospitalId}`),

  saveThresholds: (data: any) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.BASE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getWardThresholds: (hospitalId: string, wardType: string) =>
    apiClient<any>(
      `${IPD_ENDPOINTS.THRESHOLDS.BASE}/${hospitalId}/${wardType}`,
    ),

  // ==================== Vitals Threshold Templates (New System) ====================
  getVitalsTemplates: () => apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.TEMPLATES),

  createVitalsTemplate: (data: { templateName: string; wardType: string }) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.TEMPLATES, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTemplateThresholds: (templateId: string) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.TEMPLATE_DETAIL(templateId)),

  saveTemplateThresholds: (templateId: string, thresholds: any[]) =>
    apiClient<any>(
      `${IPD_ENDPOINTS.THRESHOLDS.TEMPLATE_DETAIL(templateId)}/save`,
      {
        method: "POST",
        body: JSON.stringify({ thresholds }),
      },
    ),

  copyVitalsTemplate: (
    templateId: string,
    data: { newTemplateName: string; newWardType?: string },
  ) =>
    apiClient<any>(
      `${IPD_ENDPOINTS.THRESHOLDS.TEMPLATE_DETAIL(templateId)}/copy`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateVitalsTemplate: (
    templateId: string,
    data: { templateName: string; wardType: string },
  ) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.TEMPLATE_DETAIL(templateId), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteVitalsTemplate: (templateId: string) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.TEMPLATE_DETAIL(templateId), {
      method: "DELETE",
    }),

  getAdmissionThresholds: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.THRESHOLDS.ADMISSION(admissionId)),

  importVitalsThresholds: (formData: FormData) =>
    apiClient<{ success: boolean; message: string }>(
      `${IPD_ENDPOINTS.THRESHOLDS.BASE}/import`,
      {
        method: "POST",
        body: formData,
      },
    ),

  // ==================== Vitals Alert Management ====================
  getActiveAlerts: (params: { hospitalId?: string; doctorId?: string }) => {
    const query = new URLSearchParams();
    if (params.hospitalId) query.append("hospitalId", params.hospitalId);
    if (params.doctorId) query.append("doctorId", params.doctorId);
    return apiClient<any[]>(`${IPD_ENDPOINTS.ALERTS.BASE}?${query.toString()}`);
  },

  updateAlertStatus: (
    alertId: string,
    data: { status: string; notes?: string; userId: string },
  ) =>
    apiClient<any>(IPD_ENDPOINTS.ALERTS.DETAIL(alertId), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getPatientAlertHistory: (patientId: string) =>
    apiClient<any[]>(IPD_ENDPOINTS.ALERTS.HISTORY(patientId)),

  // ==================== Bulk Import ====================

  importAssets: (type: "beds" | "rooms" | "departments", formData: FormData) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/import/${type}`, {
      method: "POST",
      body: formData,
    }),

  importIPDAssetsJSON: (type: string, data: any[]) =>
    apiClient<any>(`${IPD_ENDPOINTS.BEDS}/import-json/${type}`, {
      method: "POST",
      body: JSON.stringify({ data }),
    }),

  importVitalsThresholdsJSON: (data: any[]) =>
    apiClient<any>(`${IPD_ENDPOINTS.THRESHOLDS.BASE}/import-json`, {
      method: "POST",
      body: JSON.stringify({ data }),
    }),

  // ==================== IPD Billing ====================

  getBillSummary: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.SUMMARY(admissionId)),

  addExtraCharge: (data: {
    admissionId: string;
    category: string;
    description: string;
    amount: number;
    date?: string | Date;
  }) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CHARGE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExtraCharge: (
    chargeId: string,
    data: { category?: string; description?: string; amount?: number; date?: string },
  ) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CHARGE_DETAIL(chargeId), {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateBedOccupancyCharge: (occupancyId: string, dailyRate: number) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.BED_CHARGE(occupancyId), {
      method: "PUT",
      body: JSON.stringify({ dailyRate }),
    }),

  removeExtraCharge: (chargeId: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CHARGE_DETAIL(chargeId), {
      method: "DELETE",
    }),

  addAdvancePayment: (data: {
    admissionId: string;
    amount: number;
    mode: string;
    reference?: string;
    transactionType: "Advance" | "Refund" | "Settlement";
    date?: string | Date;
    paymentDetails?: {
        cash?: number;
        upi?: number;
        card?: number;
        bankTransfer?: number;
    };
  }) => {
    const lowerMode = (data.mode || "").toLowerCase();
    let mappedMode = data.mode;
    if (lowerMode === "cash") mappedMode = "Cash";
    else if (lowerMode === "card") mappedMode = "Card";
    else if (lowerMode === "upi") mappedMode = "UPI";
    else if (lowerMode === "insurance" || lowerMode === "insure") mappedMode = "Insurance";
    else if (lowerMode === "bank" || lowerMode === "bank transfer" || lowerMode === "bank_transfer") mappedMode = "Bank Transfer";
    else if (lowerMode === "mixed") mappedMode = "Mixed";

    return apiClient<any>(IPD_ENDPOINTS.BILLING.ADVANCE, {
      method: "POST",
      body: JSON.stringify({ ...data, mode: mappedMode }),
    });
  },

  applyDiscount: (data: {
    admissionId: string;
    amount: number;
    reason: string;
  }) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.DISCOUNT, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  lockBill: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.LOCK(admissionId), {
      method: "PATCH",
    }),

  unlockBill: (admissionId: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.UNLOCK(admissionId), {
      method: "PATCH",
    }),

  // ==================== Custom Categories ====================

  getChargeCategories: () =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CATEGORIES),

  addChargeCategory: (name: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CATEGORIES, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  updateChargeCategory: (id: string, name: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CATEGORY_DETAIL(id), {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),

  deleteChargeCategory: (id: string) =>
    apiClient<any>(IPD_ENDPOINTS.BILLING.CATEGORY_DETAIL(id), {
      method: "DELETE",
    }),
};
