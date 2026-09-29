// Helpdesk Dashboard Types
export interface HelpdeskDashboardStats {
  totalDoctors: number;
  totalPatients: number;
  todayPatients: number;
  pendingAppointments: number;
  activeTransits: number;
  emergencyCases: number;
  revenueToday?: number;
}

export interface RecentPatient {
  id: string;
  name: string;
  gender: string;
  age: string | number;
  contact: string;
  registeredAt: Date | string;
}

export interface HelpdeskAppointment {
  id: string;
  _id?: string;
  patientName: string;
  doctorName: string;
  time: string;
  appointmentTime?: string;
  date: Date | string;
  createdAt?: string;
  type: string;
  status: string;
  mrn?: string;
  patientId?: string;
  isOnline?: boolean;
  bookingSource?: string;
  startTime?: string;
  endTime?: string;
  age?: string | number;
  gender?: string;
  patientDetails?: any;
  patient?: {
    _id: string;
    name: string;
    mrn?: string;
    age?: string | number;
    gender?: string;
  };
}

export type Appointment = HelpdeskAppointment;

export interface HelpdeskDashboard {
  stats: HelpdeskDashboardStats;
  recentPatients: RecentPatient[];
  appointments: HelpdeskAppointment[];
}

// Helpdesk Profile
export interface HelpdeskProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  hospital: {
    _id: string;
    name: string;
    address?: string;
    mobile?: string;
    email?: string;
    rooms?: { _id: string; label: string; type: string }[];
    departments?: { _id: string; name: string; code: string }[];
    opdFollowUpDays?: number;
    ipdFollowUpDays?: number;
    enableFollowUpExpiry?: boolean;
  };
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
  };
  panNumber?: string;
  aadharNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;
  baseSalary?: number | string;
  designation?: string;
  experienceYears?: number | string;
  dateOfBirth?: string | Date;
  address?: string;
  gender?: string;
  image?: string;
}

// Doctor for helpdesk view
export interface HelpdeskDoctor {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  specialties: string[];
  qualifications: string[];
  avatar?: string;
  availability?: any[];
  specialty?: string;
  consultationFee?: number;
  maxAppointmentsPerDay?: number;
  consultationDuration?: number;
  experienceStart?: string | Date;
  experienceYears?: number;
  hospital?: string | { _id: string; name?: string; [key: string]: any };
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    mobile?: string;
    status?: string;
  };
  isOnline?: boolean;
}

// Patient Registration
export interface PatientRegistrationRequest {
  honorific?: 'Mr' | 'Mrs';
  name: string;
  mobile: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dob: string;
  address: string;
  emergencyContact: string;
  emergencyContactEmail?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  symptoms?: string[];
  vitals?: {
    height?: string;
    weight?: string;
    bp?: string;
    pulse?: string;
    sugar?: string;
    spo2?: string;
    temperature?: string;
  };
}

export interface PatientRegistrationResponse {
  success: boolean;
  message: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
}
