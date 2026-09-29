export interface SubTestResult {
    name: string;
    result?: string;
    unit?: string;
    range?: string;
    normalRanges?: any;
}

export interface SampleTestResult {
    _id: string;
    testName: string;
    departmentName?: string;
    price: number;
    resultValue?: string;
    unit?: string;
    method?: string; // Added
    testCode?: string; // Added
    shortName?: string; // Added
    normalRange?: string;
    normalRanges?: {
        male?: { min?: number; max?: number };
        female?: { min?: number; max?: number };
        child?: { min?: number; max?: number };
    };
    remarks?: string;
    isAbnormal: boolean;
    status: 'Pending' | 'Completed';
    subTests?: SubTestResult[];
    resultParameters?: any[];
}

export interface LabSample {
    _id: string;
    isWalkIn?: boolean;
    billId: string;
    sampleId: string;
    priority?: string;
    clinicalAnnotations?: string;
    patientDetails: {
        name: string;
        age: number;
        gender: string;
        mobile: string;
        refDoctor: string;
        patientId?: string;
        originalPatientName?: string; // Optional field for lab-to-lab original patient name
        patientType?: 'opd' | 'ipd' | 'lab'; // Explicit billing type
        bedInfo?: {
            bedId: string;
            room: string;
            type: string;
        };
    };
    sampleType: string;
    tests: SampleTestResult[];
    status: 'Pending' | 'In Processing' | 'Completed';
    invoiceId?: string;
    paymentStatus?: 'pending' | 'paid';
    collectionDate?: string;
    reportDate?: string;
    referredBy?: string;
    createdAt: string;
}

export interface UpdateSamplePayload {
    tests?: SampleTestResult[];
    status?: string;
    collectionDate?: string;
    reportDate?: string;
}
