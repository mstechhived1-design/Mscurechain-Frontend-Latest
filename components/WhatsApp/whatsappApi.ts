import { apiClient } from '@/lib/integrations/api';

export const getWhatsAppStatus = async (hospitalId: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/status`);
};

export const requestPairingCode = async (hospitalId: string, phone: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/pair`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
};

export const refreshQR = async (hospitalId: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/refresh`, {
    method: 'POST',
  });
};

export const logoutWhatsApp = async (hospitalId: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/logout`, {
    method: 'POST',
  });
};

export const updateWhatsAppTemplates = async (hospitalId: string, templates: any) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/templates`, {
    method: 'PUT',
    body: JSON.stringify({ templates }),
  });
};

export const sendWhatsAppMedia = async (hospitalId: string, payload: { phone: string; pdfBase64?: string; imageBase64?: string; caption?: string; fileName?: string }) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/send-media`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const sendWhatsAppMessage = async (hospitalId: string, phone: string, message: string) => {
  return await apiClient<any>(`/hospital/${hospitalId}/whatsapp/send-message`, {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
};
