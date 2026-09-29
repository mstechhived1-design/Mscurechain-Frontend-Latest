export interface BillItem {
    testName: string;
    testId?: string; // Added for reference
    price: number;
    discount?: number; // ✅ optional
}

export interface PatientDetails {
    name: string;
    age: number;
    ageUnit: 'Years' | 'Months' | 'Days'; // Added Age Unit
    gender: 'Male' | 'Female' | 'Other';
    mobile: string;
    refDoctor: string; // ✅ REQUIRED
    originalPatientName?: string; // Optional field for lab-to-lab original patient name
    patientType?: 'opd' | 'ipd' | 'lab'; // Explicit billing type
}


export interface BillPayload {
    patientDetails: PatientDetails;
    patientType?: 'opd' | 'ipd' | 'lab'; // Billing tier
    items: BillItem[];
    totalAmount: number;
    discount: number;
    finalAmount: number;
    paidAmount: number;
    balance: number;
    paymentMode: 'Cash' | 'UPI' | 'Card' | 'Mixed';
    paymentDetails?: {
        cash?: number;
        upi?: number;
        card?: number;
    };
}

export interface BillResponse extends BillPayload {
    _id: string;
    invoiceId: string;
    labId: string;
    status: 'Paid' | 'Partial' | 'Due';
    createdAt: string;
}
