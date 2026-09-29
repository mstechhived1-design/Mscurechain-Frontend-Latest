"use server";

import { apiServer } from "../api/apiServer";
import { PATIENT_ENDPOINTS } from "../config";
import { PatientProfile } from "../types/patient";

export async function getPatientProfileAction(): Promise<{
  success: boolean;
  data?: PatientProfile;
  error?: string;
}> {
  try {
    const data = (await apiServer(PATIENT_ENDPOINTS.PROFILE)) as PatientProfile;
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch patient profile",
    };
  }
}

export async function getPatientAppointmentsAction(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const data = (await apiServer(PATIENT_ENDPOINTS.APPOINTMENTS)) as any;
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch appointments",
    };
  }
}

export async function getPatientDashboardDataAction(
  hospitalId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = hospitalId
      ? `${PATIENT_ENDPOINTS.DASHBOARD_DATA}?hospitalId=${hospitalId}`
      : PATIENT_ENDPOINTS.DASHBOARD_DATA;
    const response = (await apiServer(url)) as any;
    // Fix: Unwrap the data property if the API returns { success: true, data: {...} }
    const data = response.data || response;
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch dashboard data",
    };
  }
}
