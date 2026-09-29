import type { Hospital } from "./admin";

export interface HospitalAdminDashboard {
  hospital: Hospital;
  stats: {
    totalDoctors: number;
    totalHelpdesk: number;
    totalPatients: number;
    totalAppointments: number;
    todayAppointments: number;
    revenue?: number;
    monthlyRevenue?: number;
    ipdRevenue?: number;
    opdRevenue?: number;
    attendance?: {
      present: number;
      late: number;
      absent: number;
      onLeave: number;
    };
    totalLabRequests?: number;
    totalPharmaSales?: number;
    totalInpatients?: number;
    totalAdmissions?: number;
    bedOccupancy?: number;
    avgPatientWaitTime?: number;
    avgConsultationTime?: number;
  };
  liveQueue?: Array<{
    status: string;
    time: string;
    patientName: string;
    doctorName: string;
  }>;
}

export interface AttendanceSummary {
  userId: string;
  name: string;
  email: string;
  designation: string;
  employeeId: string;
  todayStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  monthlyAttendedDays: number;
  monthlyAbsentDays: number;
  monthlyLeaveDays: number;
  yearlyAttendedDays: number;
  yearlyAbsentDays: number;
  yearlyLeaveDays: number;
  monthDaysTotal: number;
  yearDaysTotal: number;
}

export interface HospitalAdminPatient {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  lastAppointment: Date;
  totalAppointments: number;
}

export interface AttendanceRecord {
  _id: string;
  staff: {
    _id?: string;
    employeeId?: string | null;
    user: {
      _id: string;
      name: string;
      email: string;
      role?: string;
    };
    designation: string;
  };
  date: string;
  checkIn?: {
    time: string;
    method?: string;
    location?: string;
  } | null;
  checkOut?: {
    time: string;
    method?: string;
    location?: string;
  } | null;
  photoIn?: string | null;
  photoOut?: string | null;
  isAutoClockOut?: boolean;
  locationIn?: { lat: number; lng: number } | null;
  locationOut?: { lat: number; lng: number } | null;
  shiftName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  workingHours: number;
  workHours?: number; // Alias for UI
  status: "present" | "absent" | "late" | "half-day" | "on-leave" | "off-duty" | "auto-clock-out";
  notes?: string;
  location?: { name: string }; // Optional location object for UI
}

export interface AttendanceStats {
  totalStaff: number;
  today: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
  averageAttendance: number;
  trend?: Array<{
    name: string;
    present: number;
    late: number;
  }>;
}
