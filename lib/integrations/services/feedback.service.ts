import { apiClient } from '../api';

export interface FeedbackData {
    rating: number;
    category: string;
    comment: string;
    isAnonymous: boolean;
    doctorId?: string;
}

export const feedbackService = {
    createFeedback: (data: FeedbackData) =>
        apiClient('/feedback', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    getFeedbacks: (hospitalId: string, page: number = 1, limit: number = 10) =>
        apiClient(`/feedback?hospitalId=${hospitalId}&page=${page}&limit=${limit}`, {
            method: 'GET'
        }),

    updateStatus: (id: string, status: string) =>
        apiClient(`/feedback/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        }),

    deleteFeedback: (id: string) =>
        apiClient(`/feedback/${id}`, {
            method: 'DELETE'
        })
};
