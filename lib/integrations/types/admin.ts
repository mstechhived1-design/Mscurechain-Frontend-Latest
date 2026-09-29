export interface Hospital {
  _id: string;
  hospitalId?: string; // Human readable ID if available
  name: string;
  email: string;
  phone: string;
  website?: string;
  establishedYear?: number;
  address: string;
  street?: string;
  landmark?: string;
  city?: string;
  area?: string;
  pincode: string;
  state?: string;
  gstNumber?: string;
  location?: {
    lat: number | string;
    lng: number | string;
  };
  totalBeds?: number;
  numDoctors?: number;
  ambulanceAvailable?: boolean;
  ambulanceAvailability?: boolean; // Compatibility
  specialties: string[];
  specialities?: string[]; // Backend alias
  services: string[];
  status: "active" | "inactive" | "pending" | "approved" | "suspended";
  operatingHours?: string;
  rating?: string;
  rooms?: Array<{
    label: string;
    type: string;
    _id?: string;
  }>;
  departments?: Array<{
    name: string;
    code?: string;
    _id?: string;
  }>;
  availableBeds?: number;
  roomCount?: number;
  departmentCount?: number;
  medicalStaffCount?: number;
  unitTypes?: string[];
  logo?: string;
  availablePortals?: string[];
  portalLicenses?: {
    masterhelpdesk?: PortalLicense;
    helpdesk?: PortalLicense;
    doctor?: PortalLicense;
    pharmacy?: PortalLicense;
    lab?: PortalLicense;
    nurse?: PortalLicense;
    hospitalAdmin?: PortalLicense;
    staff?: PortalLicense;
    hr?: PortalLicense;
    discharge?: PortalLicense;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalLicense {
  enabled: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Doctor {
  _id: string;
  doctorId?: string;
  name: string;
  email: string;
  mobile: string;
  role: "doctor";
  gender?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  hospital?: string | Hospital | any;
  specialties: string[];
  qualifications?: string[];
  qualification?: string; // Legacy field
  medicalRegistrationNumber?: string;
  registrationCouncil?: string;
  registrationYear?: number;
  registrationExpiryDate?: string;
  experienceStartDate?: string;
  experienceStart?: string; // Legacy field
  experienceYears?: number; // Calculated on backend
  department?: string;
  designation?: string;
  employeeId?: string;
  consultationFee?: number;
  consultationDuration?: number;
  maxAppointmentsPerDay?: number;
  availability?: Array<{
    days: string[];
    startTime: string;
    breakStart?: string;
    breakEnd?: string;
    endTime: string;
  }>;
  room?: string;
  bio?: string;
  profilePic?: string;
  avatar?: string;
  signature?: string;
  languages?: string[];
  awards?: string[];
  permissions?: {
    canAccessEMR?: boolean;
    canAccessBilling?: boolean;
    canAccessLabReports?: boolean;
    canPrescribe?: boolean;
    canAdmitPatients?: boolean;
    canPerformSurgery?: boolean;
  };
  status: "active" | "inactive";
  createdAt: string;
  hospitals?: Array<{
    hospital: Hospital;
    specialties: string[];
    consultationFee: number;
  }>;
}

export interface Patient {
  _id: string;
  patientProfileId?: string;
  name: string;
  email: string;
  mobile: string;
  role: "patient";
  dob?: string;
  gender?: string;
  allergies?: string;
  conditions?: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Helpdesk {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: "helpdesk";
  hospital?: string | Hospital;
  hospitalId?: string;
  hospitalName?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Admin {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: "admin";
  status: "active" | "inactive";
  createdAt: string;
}

export interface Pharma {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: "pharma";
  hospital?: string | Hospital;
  hospitalId?: string;
  hospitalName?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Labs {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: "labs";
  hospital?: string | Hospital;
  hospitalId?: string;
  hospitalName?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  name: string;
  email: string;
  role: string;
  subject: string;
  message: string;
  type: "bug" | "complaint" | "feedback" | "other";
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalHospitals: number;
  totalDoctors: number;
  totalPatients: number;
  totalAdmins: number;
  totalHelpDesks: number;
  totalHelpdesks?: number; // compat
  recentUsers?: any[];
  recentRegistrations?: any[];
  activityStats?: Array<{
    _id: string;
    count: number;
  }>;
  hospitalsByStatus?: {
    active: number;
    inactive: number;
    pending: number;
  };
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  mobile: string;
  password?: string;
}

export interface CreateDoctorRequest extends CreateAdminRequest {
  // Personal Information
  gender: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };

  // Professional & Clinical Details
  specialties: string[];
  qualifications?: string[];
  medicalRegistrationNumber: string; // NMC Registration - Mandatory
  registrationCouncil?: string;
  registrationYear?: number;
  registrationExpiryDate?: string;
  experienceStart: string;
  yearsOfExperience?: number;

  // Department & Affiliation
  department?: string;
  designation?:
    | "Consultant"
    | "Senior Consultant"
    | "Surgeon"
    | "Resident"
    | "Fellow"
    | "Professor"
    | "Other";
  employeeId?: string;

  // Scheduling & Availability
  hospitalId?: string;
  hospital?: string; // legacy
  consultationFee: number;
  consultationDuration?: number; // in minutes
  maxAppointmentsPerDay?: number;
  availability?: Array<{
    days: string[];
    startTime: string;
    breakStart?: string;
    breakEnd?: string;
    endTime: string;
  }>;
  room?: string; // Room/Chamber assignment

  // System Access & Permissions
  permissions?: {
    canAccessEMR?: boolean;
    canAccessBilling?: boolean;
    canAccessLabReports?: boolean;
    canPrescribe?: boolean;
    canAdmitPatients?: boolean;
    canPerformSurgery?: boolean;
  };

  // Profile & Additional Info
  bio: string;
  profilePic?: string;
  signature?: string;
  languages?: string[];
  awards?: string[];
  publications?: string[];

  // Payroll & Bank Details
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  panNumber?: string;
  aadharNumber?: string;
  baseSalary?: number;
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;

  // Legacy fields for backward compatibility
  qualification?: string;
  experienceStartDate?: string;
  assignHospitals?: Array<{
    hospitalId: string;
    specialties: string[];
    consultationFee: number;
  }>;
}

export interface CreateHelpdeskRequest extends CreateAdminRequest {
  hospitalId: string;
  hospital?: string; // legacy
}

export interface CreateHospitalHelpdeskRequest {
  staffId?: string;
  loginId: string;
  password: string;
  name?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  dateOfBirth?: string;
  department?: string;
  designation?: string;
  employeeId?: string;
  employmentType?: string;
  joiningDate?: string;
  baseSalary?: string | number;
  additionalNotes?: string;
  [key: string]: any;
}

export interface CreatePharmaRequest extends CreateAdminRequest {
  hospitalId: string;
  hospital?: string; // legacy
}

export interface CreateLabsRequest extends CreateAdminRequest {
  hospitalId: string;
  hospital?: string; // legacy
}

export interface CreateHospitalRequest {
  hospitalId?: string; // Manual override
  name: string;
  email: string;
  phone: string;
  website?: string;
  establishedYear?: string | number;
  address: string;
  street?: string;
  landmark?: string;
  city?: string;
  area?: string;
  pincode: string;
  state?: string;
  gstNumber?: string;
  location?: { lat: string | number; lng: string | number };
  lat?: number; // legacy
  lng?: number; // legacy
  ambulanceAvailability?: boolean;
  ambulanceAvailable?: boolean; // legacy
  specialities?: string[];
  specialties?: string[]; // frontend compatibility
  services: string[];
  operatingHours?: string;
  rating?: string;
  logo?: string;
  availablePortals?: string[];
  portalLicenses?: {
    [key: string]: PortalLicense;
  };
}

export interface AssignDoctorRequest {
  hospitalId: string;
  doctorProfileId: string;
  doctorId?: string; // legacy support
  specialties: string[];
  consultationFee: number;
}

export interface BroadcastRequest {
  title: string;
  body: string;
}
