"use server";

import { apiServer } from '../api/apiServer';
import { endpoints } from '../config';
import type { User } from '../types';

export async function getUsersAction(): Promise<User[]> {
  return apiServer<User[]>(endpoints.users);
}

export async function updateUserPhotoAction(formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiServer('/auth/me', {
      method: "PATCH",
      body: formData
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
}
