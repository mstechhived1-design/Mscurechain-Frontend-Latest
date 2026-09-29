"use server";

import { revalidatePath } from "next/cache";
import { apiServer } from "../api/apiServer";
import { HOSPITAL_ADMIN_ENDPOINTS } from "../config";
import type {
  Hospital,
  Doctor,
  Helpdesk,
  CreateDoctorRequest,
  CreateHelpdeskRequest,
  CreateHospitalRequest,
  CreateHospitalHelpdeskRequest,
  AttendanceRecord,
  AttendanceStats,
} from "../types";

// Dashboard
export async function getHospitalAdminDashboardAction(): Promise<any> {
  return apiServer<any>(HOSPITAL_ADMIN_ENDPOINTS.DASHBOARD);
}

// Training (Moved to training.actions.ts)

// Hospital
export async function getHospitalAction(): Promise<{ hospital: Hospital }> {
  return apiServer<{ hospital: Hospital }>(HOSPITAL_ADMIN_ENDPOINTS.HOSPITAL);
}

export async function getHospitalMetadataAction(): Promise<any> {
  return apiServer<any>(HOSPITAL_ADMIN_ENDPOINTS.METADATA);
}

export async function updateHospitalAction(
  data: Partial<CreateHospitalRequest>,
): Promise<Hospital> {
  const result = await apiServer<Hospital>(HOSPITAL_ADMIN_ENDPOINTS.HOSPITAL, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidatePath("/hospital-admin/hospital");
  return result;
}

// Doctors
export async function getHospitalDoctorsAction(): Promise<{
  doctors: Doctor[];
}> {
  return apiServer<{ doctors: Doctor[] }>(HOSPITAL_ADMIN_ENDPOINTS.DOCTORS);
}

export async function getHospitalDoctorByIdAction(
  id: string,
): Promise<{ doctor: Doctor }> {
  return apiServer<{ doctor: Doctor }>(
    HOSPITAL_ADMIN_ENDPOINTS.DOCTOR_DETAIL(id),
  );
}

export async function createHospitalDoctorAction(
  data: CreateDoctorRequest,
): Promise<Doctor> {
  const result = await apiServer<Doctor>(
    HOSPITAL_ADMIN_ENDPOINTS.CREATE_DOCTOR,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/doctors");
  return result;
}

export async function updateHospitalDoctorAction(
  id: string,
  data: Partial<CreateDoctorRequest>,
): Promise<Doctor> {
  const result = await apiServer<Doctor>(
    HOSPITAL_ADMIN_ENDPOINTS.UPDATE_DOCTOR(id),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/doctors");
  revalidatePath(`/hospital-admin/doctors/${id}`);
  return result;
}

export async function deleteHospitalDoctorAction(
  id: string,
): Promise<{ message: string }> {
  const result = await apiServer<{ message: string }>(
    HOSPITAL_ADMIN_ENDPOINTS.DELETE_DOCTOR(id),
    {
      method: "DELETE",
    },
  );
  revalidatePath("/hospital-admin/doctors");
  return result;
}

// Helpdesk
export async function getHospitalHelpdesksAction(): Promise<{
  helpdesks: Helpdesk[];
}> {
  return apiServer<{ helpdesks: Helpdesk[] }>(
    HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS,
  );
}

export async function createHospitalHelpdeskAction(
  data: CreateHospitalHelpdeskRequest,
): Promise<Helpdesk> {
  const result = await apiServer<Helpdesk>(
    HOSPITAL_ADMIN_ENDPOINTS.CREATE_HELPDESK,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/helpdesks");
  return result;
}

export async function updateHospitalHelpdeskAction(
  id: string,
  data: any,
): Promise<Helpdesk> {
  const result = await apiServer<Helpdesk>(
    HOSPITAL_ADMIN_ENDPOINTS.HELPDESK_DETAIL(id),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/helpdesks");
  revalidatePath(`/hospital-admin/helpdesks/${id}`);
  return result;
}

export async function deleteHospitalHelpdeskAction(
  id: string,
): Promise<{ message: string }> {
  const result = await apiServer<{ message: string }>(
    HOSPITAL_ADMIN_ENDPOINTS.HELPDESK_DETAIL(id),
    {
      method: "DELETE",
    },
  );
  revalidatePath("/hospital-admin/helpdesks");
  return result;
}

// Patients
export async function getHospitalPatientsAction(): Promise<{
  patients: any[];
}> {
  return apiServer<{ patients: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.PATIENTS);
}

// Pharma
export async function getHospitalPharmaAction(): Promise<any> {
  return apiServer<any>(HOSPITAL_ADMIN_ENDPOINTS.PHARMA);
}

// Labs
export async function getHospitalLabsAction(): Promise<any> {
  return apiServer<any>(HOSPITAL_ADMIN_ENDPOINTS.LABS);
}

// Staff
export async function getHospitalStaffAction(): Promise<{ staff: any[] }> {
  return apiServer<{ staff: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.STAFF);
}

export async function getHospitalNursesAction(): Promise<{ staff: any[] }> {
  return apiServer<{ staff: any[] }>(HOSPITAL_ADMIN_ENDPOINTS.NURSES);
}

export async function getHospitalStaffByIdAction(
  id: string,
): Promise<{ staff: any }> {
  return apiServer<{ staff: any }>(HOSPITAL_ADMIN_ENDPOINTS.STAFF_DETAIL(id));
}

export async function createHospitalStaffAction(data: any): Promise<any> {
  const result = await apiServer<any>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_STAFF, {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/hospital-admin/staff");
  return result;
}

export async function updateHospitalStaffAction(
  id: string,
  data: any,
): Promise<any> {
  const result = await apiServer<any>(
    HOSPITAL_ADMIN_ENDPOINTS.UPDATE_STAFF(id),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/staff");
  revalidatePath(`/hospital-admin/staff/${id}`);
  return result;
}

export async function deleteHospitalStaffAction(
  id: string,
): Promise<{ message: string }> {
  const result = await apiServer<{ message: string }>(
    HOSPITAL_ADMIN_ENDPOINTS.DELETE_STAFF(id),
    {
      method: "DELETE",
    },
  );
  revalidatePath("/hospital-admin/staff");
  return result;
}

// Attendance Management
export async function getAttendanceAction(params?: {
  date?: string;
  status?: string;
  staffId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ attendance: AttendanceRecord[] }> {
  const url = new URL(HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE, "http://localhost");
  if (params?.date) url.searchParams.set("date", params.date);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.staffId) url.searchParams.set("staffId", params.staffId);
  if (params?.startDate) url.searchParams.set("startDate", params.startDate);
  if (params?.endDate) url.searchParams.set("endDate", params.endDate);
  return apiServer<{ attendance: AttendanceRecord[] }>(
    url.pathname + url.search,
  );
}

export async function getAttendanceSummaryAction(): Promise<{
  summary: any[];
}> {
  return apiServer<{ summary: any[] }>(
    HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_SUMMARY,
  );
}

export async function getAttendanceStatsAction(): Promise<{
  stats: AttendanceStats;
}> {
  return apiServer<{ stats: AttendanceStats }>(
    HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_STATS,
  );
}

export async function getAttendanceByIdAction(
  id: string,
): Promise<{ attendance: AttendanceRecord }> {
  return apiServer<{ attendance: AttendanceRecord }>(
    HOSPITAL_ADMIN_ENDPOINTS.ATTENDANCE_DETAIL(id),
  );
}

export async function updateAttendanceAction(
  id: string,
  data: Partial<AttendanceRecord>,
): Promise<AttendanceRecord> {
  const result = await apiServer<AttendanceRecord>(
    HOSPITAL_ADMIN_ENDPOINTS.UPDATE_ATTENDANCE(id),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  revalidatePath("/hospital-admin/attendance");
  return result;
}

export async function deleteAttendanceAction(
  id: string,
): Promise<{ message: string }> {
  const result = await apiServer<{ message: string }>(
    HOSPITAL_ADMIN_ENDPOINTS.DELETE_ATTENDANCE(id),
    {
      method: "DELETE",
    },
  );
  revalidatePath("/hospital-admin/attendance");
  return result;
}
