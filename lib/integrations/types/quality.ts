export interface IQualityIndicator {
    _id: string;
    name: string;
    department: 'OPD' | 'IPD' | 'ICU' | 'Hospital-wide';
    problemIdentified?: string;
    baselineValue?: number;
    targetValue?: number;
    currentValue?: number;
    actionTaken?: string;
    status: 'Pending' | 'In Progress' | 'Improved' | 'Closed';
    unit?: string;
    hospitalId: string;
    createdAt: string;
    updatedAt: string;
}

export interface IQualityAction {
    _id: string;
    indicatorId: IQualityIndicator;
    problemDescription: string;
    period: {
        from: string;
        to: string;
    };
    actionDescription: string;
    responsibleDepartment: string;
    startDate: string;
    reviewDate: string;
    status: 'Open' | 'In Progress' | 'Completed';
    statusHistory: {
        status: string;
        timestamp: string;
        updatedBy: string;
    }[];
    measurableResultBefore?: number;
    measurableResultAfter?: number;
    outcomeSummary?: string;
    isClosed: boolean;
    hospitalId: string;
    createdAt: string;
    updatedAt: string;
}

export interface QualityApiResponse<T> {
    status: string;
    results?: number;
    data: T;
}
