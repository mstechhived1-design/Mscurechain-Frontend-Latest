import { create } from 'zustand';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import type { HelpdeskDoctor } from '@/lib/integrations/types/helpdesk';

export interface Patient {
  id: string; // MRN
  name: string;
  age: number | string;
  gender: string;
  contact: string;
  registeredAt: string;
  // Detailed info
  dob?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  vitals?: any;
  history?: any;
  symptoms?: string[];
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  time: string;
  date: Date | string;
  type: string;
  status: string;
  patientId?: string; // Optional if backend provides it later
  doctorId?: string; // Optional if backend provides it later
}

interface HelpdeskState {
  patients: Patient[];
  appointments: Appointment[];
  doctors: HelpdeskDoctor[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDashboardData: () => Promise<void>;
  addPatient: (patient: Patient) => void;
  addAppointment: (appointment: Appointment) => void;
  getPatient: (id: string) => Patient | undefined;
  checkPatientExists: (mobile: string) => boolean;
  hospitalDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

export const useHelpdeskStore = create<HelpdeskState>((set, get) => ({
  patients: [],
  appointments: [],
  doctors: [],
  isLoading: false,
  error: null,

  hospitalDetails: {
    name: "CureChain Medical Center",
    address: "123 Health Avenue, Medicity, NY 10001",
    phone: "+1 (555) 123-4567",
    email: "contact@curechain.health"
  },

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await helpdeskService.getDashboard();

      // Map backend data to store types if necessary
      // Note: Backend 'recentPatients' and 'appointments' match store expectations mostly
      set({
        patients: (data.recentPatients || []) as Patient[],
        appointments: (data.appointments || []) as Appointment[],
        isLoading: false
      });

      // Also fetch doctors as they might be separate in some implementations
      const doctors = await helpdeskService.getDoctors();
      set({ doctors });

    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch dashboard data', isLoading: false });
    }
  },

  addPatient: (patient) => set((state) => ({
    patients: [patient, ...state.patients]
  })),

  addAppointment: (appointment) => set((state) => ({
    appointments: [...state.appointments, appointment]
  })),

  getPatient: (id) => get().patients.find(p => p.id === id),

  checkPatientExists: (mobile) => {
    return get().patients.some(p => p.contact === mobile);
  },
}));
