export interface DoctorStats {
  totalPatients: number;
  appointmentsToday: number;
  pendingReports: number;
  activeInpatients: number;
  consultationsValue: number;
}

export interface DoctorAppointment {
  id: string;
  patientName: string;
  patientId: string;
  mrn?: string;
  time: string;
  date?: string;
  createdAt?: string;
  type: string;
  status: string;
  hospital?: string;
}

export interface DoctorPatient {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  lastVisit: string | Date;
  // Fields used in frontend but maybe not in dashboard response
  age?: number;
  gender?: string;
  condition?: string;
  mrn?: string;
  patientType?: 'IPD' | 'OPD';
}

export interface DoctorQuickNote {
  _id: string;
  text: string;
  timestamp: string;
}

export interface DoctorDashboardData {
  stats: DoctorStats;
  appointments: DoctorAppointment[];
  recentPatients: DoctorPatient[];
}

export interface DoctorProfile {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
    doctorId?: string;
  };
  specialties?: string[];
  qualifications?: string[];
  bio?: string;
  consultationFee?: number;
  quickNotes?: DoctorQuickNote[];
  availability?: {
    days: string[];
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  }[];
  hospital?: {
    _id: string;
    name: string;
    hospitalId: string;
    address?: string;
  };
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDoctorPatients {
  data: DoctorPatient[];
  pagination: PaginationData;
}

export interface PaginatedDoctorAppointments {
  data: any[];
  pagination: PaginationData;
}
