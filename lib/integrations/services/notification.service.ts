import { NOTIFICATION_ENDPOINTS } from '../config';
import { apiClient } from '../api';

export interface AppNotification {
  _id: string;
  recipient: string;
  sender: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export const notificationService = {
  getNotifications: (hospitalId?: string) => {
    const url = hospitalId ? `${NOTIFICATION_ENDPOINTS.BASE}?hospitalId=${hospitalId}` : NOTIFICATION_ENDPOINTS.BASE;
    return apiClient<AppNotification[]>(url);
  },

  markAsRead: (id: string) =>
    apiClient<AppNotification>(NOTIFICATION_ENDPOINTS.READ(id), {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    apiClient<{ message: string }>(NOTIFICATION_ENDPOINTS.READ_ALL, {
      method: 'PUT',
    }),

  deleteNotification: (id: string) =>
    apiClient<{ message: string }>(NOTIFICATION_ENDPOINTS.DELETE(id), {
      method: 'DELETE',
    }),

  deleteAllNotifications: () =>
    apiClient<{ message: string }>(NOTIFICATION_ENDPOINTS.CLEAR_ALL, {
      method: 'DELETE',
    }),

  getAnnouncements: () =>
    apiClient<{ announcements: any[] }>('/announcements'),
};
