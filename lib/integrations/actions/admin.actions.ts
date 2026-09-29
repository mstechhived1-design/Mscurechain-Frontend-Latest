"use server";

import { apiServer } from "../api/apiServer";
import { endpoints, ADMIN_ENDPOINTS } from "../config";

// ... existing code ...

export async function getEmergencyPersonnelAction() {
  return apiServer<any[]>(ADMIN_ENDPOINTS.EMERGENCY_USERS);
}

export async function createEmergencyPersonnelAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.EMERGENCY_USERS, {
      method: "POST",
      body: JSON.stringify(data),
    });
    import("next/cache").then((m) =>
      m.revalidatePath("/admin/create-emergency"),
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed" };
  }
}

export async function deleteEmergencyPersonnelAction(id: string) {
  try {
    await apiServer<any>(`${ADMIN_ENDPOINTS.EMERGENCY_USERS}/${id}`, {
      method: "DELETE",
    });
    import("next/cache").then((m) =>
      m.revalidatePath("/admin/create-emergency"),
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
export async function updateEmergencyPersonnelAction(id: string, data: any) {
  try {
    const result = await apiServer<any>(
      `${ADMIN_ENDPOINTS.EMERGENCY_USERS}/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    import("next/cache").then((m) =>
      m.revalidatePath("/admin/create-emergency"),
    );
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
import type {
  DashboardStats,
  Hospital,
  Doctor,
  Patient,
  Helpdesk,
  SupportTicket,
} from "../types";

export async function getDashboardAction() {
  return apiServer<DashboardStats>(endpoints.admin.dashboard);
}

export async function getAnalyticsAction() {
  return apiServer<any>(endpoints.admin.analytics);
}

export async function getHospitalsAction() {
  return apiServer<Hospital[]>(endpoints.admin.hospitals);
}

export async function getDoctorsAction() {
  return apiServer<Doctor[]>(endpoints.admin.doctors);
}

export async function getPatientsAction() {
  return apiServer<Patient[]>(endpoints.admin.patients);
}

export async function getHelpdesksAction() {
  return apiServer<Helpdesk[]>(endpoints.admin.helpdesks);
}


export async function getSupportRequestsAction() {
  return apiServer<SupportTicket[]>(endpoints.admin.supportRequests);
}
export async function getUsersByRoleAction(role?: string) {
  const url = role
    ? `${endpoints.admin.users}?role=${role}`
    : endpoints.admin.users;
  return apiServer<any[]>(url);
}

// Mutations
export async function createHospitalAction(data: any) {
  const result = await apiServer<Hospital>(endpoints.admin.createHospital, {
    method: "POST",
    body: JSON.stringify(data),
  });
  import("next/cache").then((m) => m.revalidatePath("/admin/hospitals"));
  return result;
}

export async function updateHospitalStatusAction(id: string, status: string) {
  const result = await apiServer<Hospital>(
    endpoints.admin.updateHospitalStatus(id),
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  import("next/cache").then((m) => m.revalidatePath("/admin/hospitals"));
  return result;
}

export async function deleteHospitalAction(id: string) {
  const result = await apiServer<void>(endpoints.admin.deleteHospital(id), {
    method: "DELETE",
  });
  import("next/cache").then((m) => m.revalidatePath("/admin/hospitals"));
  return result;
}

// Staff Creation Actions
export async function createHospitalAdminAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify(data),
    });
    import("next/cache").then((m) =>
      m.revalidatePath("/admin/hospital-admins"),
    );
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create hospital admin",
    };
  }
}

export async function createPharmaAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "pharma-owner" }),
    });
    import("next/cache").then((m) => m.revalidatePath("/admin/users"));
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create pharma staff",
    };
  }
}

export async function createLabsAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "lab" }),
    });
    import("next/cache").then((m) => m.revalidatePath("/admin/users"));
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create labs staff",
    };
  }
}

export async function createRadiologyAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "radiology" }),
    });
    import("next/cache").then((m) => m.revalidatePath("/admin/users"));
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create radiology staff",
    };
  }
}
export async function createEmergencyAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "emergency" }),
    });
    import("next/cache").then((m) => m.revalidatePath("/admin/users"));
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create emergency staff",
    };
  }
}

export async function createHRAction(data: any) {
  try {
    const result = await apiServer<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "hr" }),
    });
    import("next/cache").then((m) => m.revalidatePath("/admin/hr"));
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create HR staff",
    };
  }
}
