import { qualityService } from '../services/quality.service';

export const getQualityIndicatorsAction = async () => {
    return await qualityService.getIndicators();
};

export const createQualityIndicatorAction = async (data: any) => {
    return await qualityService.createIndicator(data);
};

export const getQualityActionsAction = async () => {
    return await qualityService.getActions();
};

export const createQualityActionAction = async (data: any) => {
    return await qualityService.createAction(data);
};

export const updateQualityActionStatusAction = async ({ id, status }: { id: string, status: string }) => {
    return await qualityService.updateStatus(id, status);
};

export const evaluateQualityOutcomeAction = async ({ id, data }: { id: string, data: any }) => {
    return await qualityService.evaluateOutcome(id, data);
};
export const updateQualityIndicatorAction = async ({ id, data }: { id: string, data: any }) => {
    return await qualityService.updateIndicator(id, data);
};

export const deleteQualityIndicatorAction = async (id: string) => {
    return await qualityService.deleteIndicator(id);
};
