export interface PatientProfile {
    _id: string;
    user: {
        _id: string;
        name: string;
        email: string;
        mobile: string;
        role: string;
    };
    hospital?: string;
    mrn?: string;
    lastVisit?: string;
    medicalHistory?: string;
    contactNumber?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    address?: string;
    conditions?: string;
    allergies?: string;
    medications?: string;
    height?: string;
    weight?: string;
    maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    bloodGroup?: 'Unknown' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    age?: number;
    createdAt: string;
    updatedAt: string;
}

export interface UpdatePatientProfileRequest {
    name?: string;
    email?: string;
    mobile?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    address?: string;
    conditions?: string;
    allergies?: string;
    medications?: string;
    height?: string;
    weight?: string;
    maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    bio?: string;
}
