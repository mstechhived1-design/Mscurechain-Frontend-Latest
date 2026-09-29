"use server";

import { revalidatePath } from "next/cache";
import { apiServer } from "../api/apiServer";
import { TRAINING_ENDPOINTS } from "../config";

export async function getAllTrainingsAction(): Promise<any> {
    return apiServer<any>(TRAINING_ENDPOINTS.BASE);
}

export async function createTrainingAction(data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const result = await apiServer<any>(TRAINING_ENDPOINTS.BASE, {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
    });
    revalidatePath("/hospital-admin/training");
    revalidatePath("/staff/profile");
    revalidatePath("/nurse/profile");
    return result;
}

export async function updateTrainingAction(id: string, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    const result = await apiServer<any>(TRAINING_ENDPOINTS.BY_ID(id), {
        method: "PATCH",
        body: isFormData ? data : JSON.stringify(data),
    });
    revalidatePath("/hospital-admin/training");
    revalidatePath("/staff/profile");
    revalidatePath("/nurse/profile");
    return result;
}

export async function deleteTrainingAction(id: string): Promise<any> {
    const result = await apiServer<any>(TRAINING_ENDPOINTS.BY_ID(id), {
        method: "DELETE",
    });
    revalidatePath("/hospital-admin/training");
    return result;
}

export async function getMyTrainingHistoryAction(): Promise<any> {
    return apiServer<any>(TRAINING_ENDPOINTS.STAFF_HISTORY);
}

export async function getStaffTrainingHistoryAction(staffId: string): Promise<any> {
    return apiServer<any>(TRAINING_ENDPOINTS.STAFF_DETAIL(staffId));
}
