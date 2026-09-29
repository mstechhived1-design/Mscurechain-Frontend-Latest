import { apiClient } from '../api';
import { QUALITY_ENDPOINTS } from '../config/endpoints';
import { IQualityAction, IQualityIndicator, QualityApiResponse } from '../types';

export const qualityService = {
    // Indicators
    getIndicators: async () => {
        return await apiClient<QualityApiResponse<{ indicators: IQualityIndicator[] }>>(
            QUALITY_ENDPOINTS.INDICATORS
        );
    },

    createIndicator: async (data: any) => {
        return await apiClient<QualityApiResponse<IQualityIndicator>>(
            QUALITY_ENDPOINTS.INDICATORS,
            {
                method: 'POST',
                body: JSON.stringify(data)
            }
        );
    },

    updateIndicator: async (id: string, data: any) => {
        return await apiClient<QualityApiResponse<IQualityIndicator>>(
            QUALITY_ENDPOINTS.INDICATOR_BY_ID(id),
            {
                method: 'PATCH',
                body: JSON.stringify(data)
            }
        );
    },

    deleteIndicator: async (id: string) => {
        return await apiClient<QualityApiResponse<null>>(
            QUALITY_ENDPOINTS.INDICATOR_BY_ID(id),
            {
                method: 'DELETE'
            }
        );
    },

    // Actions
    getActions: async () => {
        return await apiClient<QualityApiResponse<{ actions: IQualityAction[] }>>(
            QUALITY_ENDPOINTS.ACTIONS
        );
    },

    createAction: async (data: any) => {
        return await apiClient<QualityApiResponse<IQualityAction>>(
            QUALITY_ENDPOINTS.ACTIONS,
            {
                method: 'POST',
                body: JSON.stringify(data)
            }
        );
    },

    updateStatus: async (id: string, status: string) => {
        return await apiClient<QualityApiResponse<IQualityAction>>(
            QUALITY_ENDPOINTS.STATUS(id),
            {
                method: 'PATCH',
                body: JSON.stringify({ status })
            }
        );
    },

    evaluateOutcome: async (id: string, data: any) => {
        return await apiClient<QualityApiResponse<IQualityAction>>(
            QUALITY_ENDPOINTS.EVALUATE(id),
            {
                method: 'PATCH',
                body: JSON.stringify(data)
            }
        );
    }
};
