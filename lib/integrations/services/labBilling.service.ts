import { apiClient } from '../api/apiClient';
import { BillPayload, BillResponse } from '../types/labBilling';
import { LAB_ENDPOINTS } from '../config/endpoints';

export const LabBillingService = {
    // Create a new bill
    createBill: async (data: BillPayload): Promise<{
        message: string; bill: {
            _id: string; invoiceId: string; createdAt: string
        }
    }> => {
        const response = await apiClient<{ message: string; order: any; bill: { invoiceId: string; createdAt: string } }>(LAB_ENDPOINTS.BILLING.BASE, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        // Return the structure that matches what the frontend expects
        return {
            message: response.message,
            bill: {
                ...response.bill,
                _id: response.order?._id || 'temp-id'
            }
        };
    },

    // Get bills history
    getBills: async (page = 1, limit = 10, all = false, startDate?: string, endDate?: string, skipCache = false): Promise<{ bills: BillResponse[]; totalPages: number; currentPage: number }> => {
        let url = `${LAB_ENDPOINTS.BILLING.BASE}?page=${page}&limit=${limit}${all ? '&all=true' : ''}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        return apiClient<{ bills: BillResponse[]; totalPages: number; currentPage: number }>(url, { skipCache });
    },

    // Delete a bill
    deleteBill: async (id: string): Promise<void> => {
        return apiClient(`${LAB_ENDPOINTS.BILLING.BASE}/${id}`, {
            method: 'DELETE',
        });
    },
};
