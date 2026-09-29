// Emergency/Ambulance Types
export interface AmbulancePersonnel {
    id: string;
    name: string;
    email: string;
    mobile: string;
    employeeId: string;
    vehicleNumber: string;
    driverLicense?: string;
    status: "active" | "suspended" | "off-duty";
}

export interface EmergencyVitals {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
}

export interface HospitalRequestStatus {
    hospital: {
        _id: string;
        name: string;
        address?: string;
        phone?: string;
    };
    status: "pending" | "accepted" | "rejected";
   respondedAt?: string;
    respondedBy?: {
        _id: string;
        name: string;
    };
    rejectionReason?: string;
}

export interface EmergencyRequest {
    _id: string;
    ambulancePersonnel: {
        _id: string;
        name: string;
        employeeId: string;
        vehicleNumber: string;
        mobile?: string;
    };
    patientName: string;
    patientAge: number;
    patientGender: "male" | "female" | "other";
    patientMobile?: string;
    emergencyType: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    vitals?: EmergencyVitals;
    currentLocation: string;
    eta?: number;
    requestedHospitals: HospitalRequestStatus[];
    status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
    acceptedByHospital?: {
        _id: string;
        name: string;
        address?: string;
    };
    acceptedByHelpdesk?: {
        _id: string;
        name: string;
    };
    acceptedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEmergencyRequestData {
    patientName: string;
    patientAge: number;
    patientGender: "male" | "female" | "other";
    patientMobile?: string;
    emergencyType: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    vitals?: EmergencyVitals;
    currentLocation: string;
    eta?: number;
    targetHospitals?: string[]; // Hospital IDs, empty = send to all
}

export interface Hospital {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

export interface EmergencyLoginResponse {
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
    user: AmbulancePersonnel;
}
