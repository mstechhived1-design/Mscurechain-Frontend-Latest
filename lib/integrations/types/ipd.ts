export interface Bed {
    _id: string;
    bedId: string;
    type: string;
    floor: string;
    room: string;
    department?: string;
    ward?: string;
    status: 'Vacant' | 'Occupied' | 'Cleaning' | 'Blocked';
    pricePerDay?: number;
    pricePerHalfDay?: number;
    pricePerHour?: number;
    currentOccupancy?: {
        patientName: string;
        admissionId: string;
        admissionDate?: string | Date;
        condition?: string;
        lastVitalsRecordedAt?: string | Date;
        reasonForAdmission?: string;
        chiefComplaints?: string;
        symptoms?: string;
        reason?: string;
        notes?: string;
        clinicalNotes?: string;
    };
    hospital: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IPDAdmission {
    _id: string;
    admissionId: string;
    patient: any;
    primaryDoctor: any;
    admissionDate: string;
    admissionType: 'ICU' | 'Ward' | 'Emergency';
    status: 'Active' | 'Discharged';
    diet?: string;
    clinicalNotes?: string;
    isBillLocked?: boolean;
    billLockedAt?: string | Date;
    hospital: string;
}

export interface BedOccupancy {
    _id: string;
    bed: string | Bed;
    admission: string | IPDAdmission;
    startDate: string;
    endDate?: string;
    hospital: string;
}

export interface BedDetailsResponse {
    bed: Bed;
    occupancyDetails?: {
        admissionId: string;
        patient: { _id: string; name: string; mobile: string };
        doctor: { _id: string; user: { name: string } };
        admissionDate: string;
        isBillLocked?: boolean;
        billLockedAt?: string | Date;
        vitals: any;
        medications?: string;
        diet?: string;
        reasonForAdmission?: string;
        chiefComplaints?: string;
        symptoms?: string;
        reason?: string;
        notes?: string;
        clinicalNotes?: string;
        condition?: string;
        lastVitalsRecordedAt?: string | Date;
        billing?: { 
            daysOccupied?: number;
            bedCharge?: number;
            totalAmount: number; 
            advancePaid?: number;
            balance?: number;
            status: string;
            isBillLocked?: boolean;
            billLockedAt?: string | Date;
        };
        bedHistory?: any[];
    };
}
