import { SUPPORT_ENDPOINTS } from "../config/endpoints";
import { apiClient } from "../api/apiClient";
import { SupportTicket } from "../types/support";

const transformTicket = (ticket: any): SupportTicket => {
  return {
    ...ticket,
    requester: ticket.userId || ticket.requester,
    hospital: ticket.hospital || null,
    replies:
      ticket.replies?.map((reply: any) => ({
        ...reply,
        sender: reply.senderId || reply.sender,
      })) || [],
  };
};

export const supportService = {
  createTicket: async (formData: FormData) => {
    const res = await apiClient<any>(SUPPORT_ENDPOINTS.CREATE, {
      method: "POST",
      body: formData,
    });
    return transformTicket(res.data || res);
  },

  getMyTickets: async () => {
    const res = await apiClient<any[]>(SUPPORT_ENDPOINTS.MY_TICKETS);
    return res.map(transformTicket);
  },

  getTicketDetails: async (id: string) => {
    const res = await apiClient<any>(SUPPORT_ENDPOINTS.DETAILS(id));
    return transformTicket(res);
  },

  getAllTickets: async () => {
    const res = await apiClient<any[]>(SUPPORT_ENDPOINTS.LIST);
    console.log("Raw Tickets from API:", res);
    return res.map(transformTicket);
  },

  replyToTicket: async (id: string, formData: FormData) => {
    const res = await apiClient<any>(SUPPORT_ENDPOINTS.REPLY(id), {
      method: "POST",
      body: formData,
    });
    return transformTicket(res.data || res);
  },

  updateStatus: async (id: string, status: string) => {
    const res = await apiClient<any>(
      `${SUPPORT_ENDPOINTS.DETAILS(id)}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
    );
    return transformTicket(res.data || res);
  },

  resolveTicket: async (id: string) => {
    const res = await apiClient<any>(
      `${SUPPORT_ENDPOINTS.DETAILS(id)}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      },
    );
    return transformTicket(res.data || res);
  },
};
