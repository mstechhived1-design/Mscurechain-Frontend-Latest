export type IncidentType = 'Patient Fall' | 'Medication Error' | 'Equipment Failure' | 'Delay in Treatment' | 'Violence' | 'Near Miss' | 'Adverse Drug Reaction' | 'Other';
export type IncidentSeverity = 'Low' | 'Medium' | 'High';
export type IncidentStatus = 'OPEN' | 'IN REVIEW' | 'CLOSED';
export type Department = 'OPD' | 'IPD' | 'ICU' | 'OT' | 'Pharmacy' | 'Lab';

export interface Incident {
    _id: string;
    incidentId: string;
    incidentDate: string;
    department: Department;
    incidentType: IncidentType;
    severity: IncidentSeverity;
    description: string;
    reportedBy: {
        _id: string;
        name: string;
        role: string;
        mobile?: string;
    };
    patientFallDetails?: {
        patientName: string;
        mrnNumber: string;
        bedNumber: string;
        roomNumber: string;
    };
    equipmentFailureDetails?: {
        equipmentName: string;
        causeOfFailure: string;
    };
    medicationErrorDetails?: {
        prescriptionOrDrugName: string;
    };
    attachments?: Array<{
        _id?: string;
        url: string;
        publicId: string;
        fileName?: string;
    }>;
    status: IncidentStatus;
    adminResponse?: {
        adminId: {
            _id: string;
            name: string;
        };
        message: string;
        actionTaken: string;
        respondedAt: string;
    };
    createdAt: string;
    updatedAt: string;
}
