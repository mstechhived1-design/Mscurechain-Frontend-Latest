import { apiClient } from '@/lib/integrations/api';

export const getWhatsAppStatus = async (hospitalId: string, department?: string) => {
  const query = department ? `?department=${encodeURIComponent(department)}` : '';
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/status${query}`);
};

export const requestPairingCode = async (hospitalId: string, phone: string, department?: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/pair`, {
    method: 'POST',
    body: JSON.stringify({ phone, department }),
  });
};

export const refreshQR = async (hospitalId: string, department?: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/refresh`, {
    method: 'POST',
    body: JSON.stringify({ department }),
  });
};

export const logoutWhatsApp = async (hospitalId: string, department?: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/logout`, {
    method: 'POST',
    body: JSON.stringify({ department }),
  });
};

export const updateWhatsAppTemplates = async (hospitalId: string, templates: any) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/templates`, {
    method: 'PUT',
    body: JSON.stringify({ templates }),
  });
};

export const updateDepartmentRouting = async (hospitalId: string, departmentRouting: any) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/routing`, {
    method: 'PUT',
    body: JSON.stringify({ departmentRouting }),
  });
};

export const getDepartmentDetectedNumbers = async (hospitalId: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/department-numbers`);
};

export const sendWhatsAppMedia = async (
  hospitalId: string,
  payload: {
    phone: string;
    pdfBase64?: string;
    imageBase64?: string;
    caption?: string;
    fileName?: string;
    department?: string;
  }
) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/send-media`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const sendWhatsAppMessage = async (
  hospitalId: string,
  phone: string,
  message: string,
  department?: string
) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/send-message`, {
    method: 'POST',
    body: JSON.stringify({ phone, message, department }),
  });
};
