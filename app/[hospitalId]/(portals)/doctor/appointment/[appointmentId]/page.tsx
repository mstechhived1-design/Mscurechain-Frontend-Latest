"use client";

import React, { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, FileText, Beaker, CheckCircle, Loader2, User, Pause,
  Activity, Calendar, Heart, Thermometer, Droplets, Scale, ArrowsUpFromLine,
  History, Stethoscope, ClipboardList, Send, ArrowLeft, MoreHorizontal,
  ChevronRight, AlertCircle, Phone, MapPin, Search, Building, Bed, Eye, Mic, PenLine
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { formatFrequency } from '@/lib/frequencyUtils';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useSSE } from '@/hooks/useSSE';
import ConsultationCompletionModal from './components/ConsultationCompletionModal';
import { SmartPrescriptionCard } from '../../components/prescription/SmartPrescriptionCard';
import { ClinicalNotesEditor } from '../../components/prescription/ClinicalNotesEditor';

interface ConsultationPageProps {
  params: Promise<{
    appointmentId: string;
  }>;
}

export default function ConsultationPage({ params }: ConsultationPageProps) {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const { appointmentId } = use(params);

  // State
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPrescriptionSection, setShowPrescriptionSection] = useState(true);
  const [showLabSection, setShowLabSection] = useState(true);
  const [showHistorySection, setShowHistorySection] = useState(true);
  const [activeTab, setActiveTab] = useState<'clinical-notes' | 'smart-prescription' | 'labs' | 'history'>('history');
  const [historySubTab, setHistorySubTab] = useState<'visits' | 'prescriptions' | 'labs'>('visits');
  const [patientHistory, setPatientHistory] = useState<{
    visits: any[];
    prescriptions: any[];
    reports: any[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [docViewer, setDocViewer] = useState<{ url: string; label: string } | null>(null);

  // History Filters
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyFilterHospital, setHistoryFilterHospital] = useState<string>('');

  // Clinical Notes State
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [wantsLabToken, setWantsLabToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const hasCompletedLabs = appointment?.labResults?.some((order: any) => order.status === 'completed');
  const isPrescriptionRestricted = wantsLabToken && !hasCompletedLabs;

  // Fetch appointment details
  const fetchAppointment = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await doctorService.startConsultation(appointmentId);
      setAppointment(data.appointment);

      // Update local states only on initial load or if they were empty
      if (showLoading || (!diagnosis && data.appointment.diagnosis)) setDiagnosis(data.appointment.diagnosis || '');
      if (showLoading || (!clinicalNotes && data.appointment.clinicalNotes)) setClinicalNotes(data.appointment.clinicalNotes || '');
      if (showLoading || (!plan && data.appointment.plan)) setPlan(data.appointment.plan || '');
    } catch (error: any) {
      if (showLoading) toast.error(error.message || 'Failed to load appointment');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment(true);
  }, [appointmentId]);

  // ✅ REAL-TIME: Listen to laboratory and appointment SSE events and refetch local state
  // Because this page uses local state (useState) instead of React Query, we must
  // explicitly instruct it to fetch its data when an SSE event hits the lab domain.
  useSSE('lab', (event) => {
    // A new lab result/status change just arrived
    console.log('📡 [Consultation] Live Lab SSE Update Received:', event);
    fetchAppointment(false);
  });

  useSSE('appointments', (event) => {
    // Appointment status updates
    if (event.resourceId === appointmentId) {
      fetchAppointment(false);
    }
  });

  const currentAppointmentIdRef = useRef(appointmentId);
  const currentPatientIdRef = useRef(appointment?.patient?._id);

  useEffect(() => {
    currentAppointmentIdRef.current = appointmentId;
    currentPatientIdRef.current = appointment?.patient?._id;
  }, [appointmentId, appointment?.patient?._id]);

  // Real-time Lab Updates via Socket.IO
  useEffect(() => {
    let socket: any;
    let isActive = true;

    const setupSocket = async () => {
      socket = await getSocket();
      if (!socket || !isActive) return;

      // Join doctor and hospital rooms for updates
      if (user) {
        joinSocketRoom({
          role: user.role,
          userId: user.id || (user as any)._id,
          hospitalId: user.hospitalId || (appointment as any)?.hospital?._id || (appointment as any)?.hospital
        });
      }

      // If we have a patient, subscribe to their specific room for vitals
      const patientId = currentPatientIdRef.current;
      if (patientId) {
        socket.emit('subscribe-patient', patientId);
        console.log(`📡 [Consultation] Subscribed to patient ${patientId} for live vitals`);
      }

      console.log('📡 [Consultation] Listening for live lab updates...');

      // Listen for specific order updates
      socket.on('lab_order_updated', (data: any) => {
        if (!isActive) return;
        console.log('📡 [Consultation] Lab Order Update Received:', data);

        // Refresh only if it's for this appointment or patient
        if (data.appointmentId === currentAppointmentIdRef.current || data.patientId === currentPatientIdRef.current) {
          fetchAppointment(false);
        }
      });

      // Listen for sample collection
      socket.on('sample_collected', (data: any) => {
        if (!isActive) return;
        console.log('📡 [Consultation] Sample Collected:', data);
        if (data.patientId === currentPatientIdRef.current) {
          fetchAppointment(false);
        }
      });

      // Listen for doctor-specific results ready notifications
      socket.on('lab_result_notification', (data: any) => {
        if (!isActive) return;
        console.log('📡 [Consultation] Lab Result Ready:', data);

        // Only show toast and refresh if it's for this specific patient
        if (data.patientId === currentPatientIdRef.current) {
          fetchAppointment(false);
          // Prevent multiple identical toasts in short succession
          toast.success(`Lab result ready for ${data.patientName || 'patient'}`, {
            id: `lab-notif-${data.orderId || data.patientId}` // Unique ID to deduplicate
          });
        }
      });
    };

    setupSocket();

    return () => {
      isActive = false;
      if (socket) {
        socket.off('lab_order_updated');
        socket.off('sample_collected');
        socket.off('lab_result_notification');
        const patientId = currentPatientIdRef.current;
        if (patientId) {
          socket.emit('unsubscribe-patient', patientId);
        }
      }
    };
  }, [appointmentId]);

  // Handle initial state of lab mode if results exist
  useEffect(() => {
    if (appointment?.labResults && appointment.labResults.length > 0) {
      setWantsLabToken(true);
    }
  }, [appointment]);

  // Auto-save logic
  useEffect(() => {
    if (loading) return;

    const saveDraft = async () => {
      try {
        setIsAutoSaving(true);
        await doctorService.saveConsultationDraft(appointmentId, {
          diagnosis,
          clinicalNotes,
          plan
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    };

    const timer = setTimeout(() => {
      // Check if there's actually something to save
      if (diagnosis !== appointment?.diagnosis || clinicalNotes !== appointment?.clinicalNotes || plan !== appointment?.plan) {
        saveDraft();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [diagnosis, clinicalNotes, plan, appointmentId, loading, appointment]);

  // Timer logic
  useEffect(() => {
    if (!appointment?.consultationStartTime || appointment.status !== 'in-progress' || appointment.isPaused) return;

    // Stop timer if status changed to completed/cancelled etc
    if (appointment.status !== 'in-progress') return;

    const start = new Date(appointment.consultationStartTime).getTime();
    const pausedDurationMs = (appointment.pausedDuration || 0) * 1000;

    const timer = setInterval(() => {
      const totalElapsed = Date.now() - start;
      const activeElapsed = Math.max(0, totalElapsed - pausedDurationMs);
      setElapsedTime(Math.floor(activeElapsed / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [appointment?.consultationStartTime, appointment?.pausedDuration, appointment?.status, appointment?.isPaused]);

  const fetchPatientHistory = async () => {
    if (!appointment?.patient?._id) return;
    try {
      setLoadingHistory(true);
      const data = await doctorService.getPatientHistory(
        appointment.patient._id,
        showFullHistory ? 'all' : 'hospital'
      );

      // Filter out CURRENT appointment from history
      const visits = (data.history || []).filter((v: any) => v._id !== appointmentId);

      setPatientHistory({
        visits,
        prescriptions: data.prescriptions || [],
        reports: data.reports || [],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistorySection) {
      fetchPatientHistory();
    }
  }, [showHistorySection, showFullHistory, appointment]);

  // Derived filtered history data
  const filteredHistory = React.useMemo(() => {
    if (!patientHistory) return null;

    const filterByDateAndHospital = (items: any[]) => {
      return items.filter(item => {
        // Date filter
        if (historyStartDate || historyEndDate) {
          const itemDate = new Date(item.date || item.createdAt);
          // Set to beginning of the day using UTC to avoid timezone issues when comparing just the date part, or simple string compare
          const itemDateStr = itemDate.toISOString().split('T')[0];

          if (historyStartDate && itemDateStr < historyStartDate) return false;
          if (historyEndDate && itemDateStr > historyEndDate) return false;
        }
        // Hospital filter (only applied if showFullHistory is ON)
        if (showFullHistory && historyFilterHospital) {
          const hospName = (item.hospitalName || '').toLowerCase();
          if (!hospName.includes(historyFilterHospital.toLowerCase())) return false;
        }
        return true;
      });
    };

    return {
      visits: filterByDateAndHospital(patientHistory.visits),
      prescriptions: filterByDateAndHospital(patientHistory.prescriptions),
      reports: filterByDateAndHospital(patientHistory.reports),
    };
  }, [patientHistory, historyStartDate, historyEndDate, historyFilterHospital, showFullHistory]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndConsultation = async (bypassCheck = false) => {
    if (isSubmitting) return;

    // Check if prescription or lab tests are added
    const hasPrescription = !!appointment?.prescription;
    const hasLabs = (appointment?.labResults && appointment.labResults.length > 0) || !!appointment?.labToken;

    if (!bypassCheck && (!hasPrescription || !hasLabs)) {
      setShowCompletionModal(true);
      return;
    }

    try {
      setIsSubmitting(true);
      if (showCompletionModal) setShowCompletionModal(false);
      
      await doctorService.endConsultation(appointmentId, {
        duration: elapsedTime,
        diagnosis,
        clinicalNotes,
        plan
      });
      toast.success('Consultation completed successfully!');
      router.push(getPath('/doctor'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to end consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseConsultation = async () => {
    try {
      await doctorService.pauseConsultation(appointmentId);
      toast.success('Consultation paused');
      router.push(getPath('/doctor/paused-appointments'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause consultation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin"></div>
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-theme animate-pulse" size={24} />
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">Initializing Consultation Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-border-theme py-4 mb-3 sm:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-10 h-10 bg-primary-theme/10 rounded-xl flex items-center justify-center shrink-0">
                <User className="text-primary-theme" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-bold text-foreground truncate">
                  {appointment?.patient?.name || 'In Consultation'}
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-tight sm:tracking-widest whitespace-nowrap">
                    MRN: {appointment?.patient?.mrn || appointment?.mrn || 'N/A'}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-primary-theme uppercase tracking-tight sm:tracking-widest whitespace-nowrap">
                    {appointment?.type || 'Consultation'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-border-theme">
              <Clock className="text-primary-theme animate-pulse shrink-0" size={16} />
              <span className="text-sm sm:text-lg font-black text-primary-theme tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseConsultation}
                disabled={appointment?.status !== 'in-progress' || appointment?.isPaused}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 whitespace-nowrap ${(appointment?.status !== 'in-progress' || appointment?.isPaused)
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                  : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 border-amber-200'
                  }`}
              >
                <Pause size={14} className="shrink-0" />
                <span className="hidden sm:inline">{appointment?.isPaused ? 'Paused' : 'Pause'}</span>
              </button>
              <button
                onClick={() => handleEndConsultation(false)}
                disabled={isSubmitting || appointment?.status !== 'in-progress'}
                className={`px-2 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 whitespace-nowrap ${(isSubmitting || appointment?.status !== 'in-progress')
                  ? 'bg-gray-400 cursor-not-allowed opacity-70'
                  : 'bg-primary-theme hover:bg-primary-theme/90 text-primary-theme-foreground shadow-primary-theme/20'
                  }`}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
                <span className="hidden sm:inline">Complete Session</span>
                <span className="sm:hidden">Complete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
        {/* Left Sidebar - Patient Context */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Patient Quick Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-border-theme shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 -mt-6 -mr-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <User size={120} />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-primary-theme/10 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-black text-primary-theme uppercase">
                    {(appointment?.patient?.name || 'P').charAt(0)}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${appointment?.status === 'in-progress' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                  }`}>
                  {appointment?.status || 'Active'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {(appointment?.patient?.honorific || '')} {appointment?.patient?.name}
                    </h3>
                    {appointment?.ipdDetails && (
                      <span className="bg-primary-theme/10 text-primary-theme text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-primary-theme/20 shrink-0">
                        IPD
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-2">
                    <User size={12} /> {appointment?.patient?.age || 'N/A'} yrs • {appointment?.patient?.gender || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Blood Group</p>
                    <p className="text-sm font-black text-rose-500">{appointment?.patient?.bloodGroup || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Payment Status</p>
                    <p className="text-sm font-black text-emerald-500">PAID</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">MRN Number</p>
                    <p className="text-sm font-black text-primary-theme uppercase tracking-tight">
                      {appointment?.patient?.mrn || appointment?.mrn || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-xs">
                    <Phone size={14} className="text-muted-foreground" />
                    <span className="font-medium">{appointment?.patient?.mobile || 'N/A'}</span>
                  </div>
                  {appointment?.patient?.emergencyContact && (
                    <div className="flex items-center gap-3 text-xs">
                      <Phone size={14} className="text-rose-500" />
                      <span className="font-medium text-rose-600">SOS: {appointment?.patient?.emergencyContact}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="font-medium truncate">{appointment?.patient?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* IPD Admission Context (Conditional) */}
              {appointment?.ipdDetails && (
                <div className="bg-linear-to-br from-primary-theme/10 to-transparent dark:from-primary-theme/20 rounded-4xl p-6 border border-primary-theme/20 space-y-5 shadow-sm relative overflow-hidden group/ipd">
                  <div className="absolute top-0 right-0 p-4 -mt-2 -mr-2 opacity-5 scale-150 rotate-12 group-hover/ipd:scale-[2] transition-transform duration-1000">
                    <Building size={80} />
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-theme flex items-center gap-2">
                      <Building size={14} className="animate-pulse" /> In-Patient Context
                    </h4>
                    <span className="px-3 py-1 rounded-full bg-primary-theme text-white text-[8px] font-black uppercase shadow-lg shadow-primary-theme/20">Active IPD</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 relative z-10">
                    <div className="flex items-center gap-4 p-3.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white/20 dark:border-gray-700/50 backdrop-blur-sm group-hover/ipd:bg-white dark:group-hover/ipd:bg-gray-800 transition-colors duration-500">
                      <div className="w-11 h-11 rounded-xl bg-primary-theme/10 flex items-center justify-center text-primary-theme shadow-inner shrink-0">
                        <Bed size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1.5 opacity-70">Assigned Bed</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none tracking-tight truncate">
                          Room {appointment.ipdDetails.bed?.room || '--'} <span className="mx-1.5 opacity-30">•</span> Bed {appointment.ipdDetails.bed?.bedId || '--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white/20 dark:border-gray-700/50 backdrop-blur-sm group-hover/ipd:bg-white dark:group-hover/ipd:bg-gray-800 transition-colors duration-500">
                      <div className="w-11 h-11 rounded-xl bg-primary-theme/10 flex items-center justify-center text-primary-theme shadow-inner shrink-0">
                        <Stethoscope size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1.5 opacity-70">Primary Doctor</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none tracking-tight truncate">
                          {appointment.ipdDetails.primaryDoctor ? (appointment.ipdDetails.primaryDoctor.toLowerCase().startsWith('dr') ? appointment.ipdDetails.primaryDoctor : `Dr. ${appointment.ipdDetails.primaryDoctor}`) : 'Dr. Attending Physician'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase border-t border-primary-theme/10 pt-4 px-1">
                      <span className="opacity-60">Admission ID</span>
                      <span className="text-primary-theme tracking-wider font-black">{appointment.ipdDetails.admissionId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vitals Widget */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-border-theme shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className={`${appointment?.ipdDetails ? 'text-primary-theme' : 'text-rose-500'}`} />
                {appointment?.ipdDetails ? 'IPD Ward Vitals' : 'Patient Vitals'}
              </h3>
              <span className="text-[10px] font-bold text-muted-foreground">
                {appointment?.ipdDetails?.latestVitals ? `Update: ${new Date(appointment.ipdDetails.latestVitals.timestamp).toLocaleTimeString()}` : 'Latest Update'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <VitalGridItem
                icon={<Heart className="text-rose-500" size={14} />}
                label="B.P"
                value={
                  appointment?.ipdDetails?.latestVitals
                    ? `${appointment.ipdDetails.latestVitals.systolicBP}/${appointment.ipdDetails.latestVitals.diastolicBP}`
                    : (appointment?.vitals?.bloodPressure || appointment?.vitals?.bp || '--')
                }
                unit="mmHg"
                color="rose"
              />
              <VitalGridItem
                icon={<Activity className="text-blue-500" size={14} />}
                label={appointment?.ipdDetails ? "H.R" : "Pulse"}
                value={appointment?.ipdDetails?.latestVitals?.heartRate || appointment?.vitals?.pulse || '--'}
                unit="bpm"
                color="blue"
              />
              <VitalGridItem
                icon={<Thermometer className="text-amber-500" size={14} />}
                label="Temp"
                value={appointment?.ipdDetails?.latestVitals?.temperature || appointment?.vitals?.temperature || appointment?.vitals?.temp || '--'}
                unit="°F"
                color="amber"
              />
              <VitalGridItem
                icon={<Droplets className="text-cyan-500" size={14} />}
                label="SpO2"
                value={appointment?.ipdDetails?.latestVitals?.spO2 || appointment?.vitals?.spO2 || appointment?.vitals?.spo2 || '--'}
                unit="%"
                color="cyan"
              />
              <VitalGridItem
                icon={<Scale className="text-emerald-500" size={14} />}
                label="Weight"
                value={appointment?.vitals?.weight || '--'}
                unit="kg"
                color="emerald"
              />
              <VitalGridItem
                icon={<ArrowsUpFromLine className="text-indigo-500" size={14} />}
                label="Height"
                value={appointment?.vitals?.height || '--'}
                unit="cm"
                color="indigo"
              />
            </div>
          </div>

          {/* Alerts & Notes */}
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-3xl p-6 border border-rose-100 dark:border-rose-900/20">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-2 mb-4">
              <AlertCircle size={16} /> Critical Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Allergies: {appointment?.patient?.allergies || 'None recorded'}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Last Diagnosis: Hypertension (Type II)
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Consultation Area */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 1: PRESCRIPTION */}
          {/* ═══════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* Section Header */}
            <button
              onClick={() => setShowPrescriptionSection(!showPrescriptionSection)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Stethoscope size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Prescription</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Voice or Write your prescription</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-muted-foreground transition-transform duration-300 ${showPrescriptionSection ? 'rotate-90' : ''}`} />
            </button>

            {showPrescriptionSection && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Action Cards - Voice Prescription + Write Prescription */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionCard
                    onClick={() => {
                      // Scroll down to the SmartPrescriptionCard which has voice input built-in
                      const el = document.getElementById('smart-prescription-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    icon={<Mic size={24} />}
                    title="Voice Prescription"
                    subtitle="Speak & auto-generate prescription"
                    color="purple"
                  />
                  <ActionCard
                    onClick={() => router.push(getPath(`/doctor/prescription/create?appointmentId=${appointmentId}`))}
                    icon={<PenLine size={24} />}
                    title="Write Prescription"
                    subtitle={isPrescriptionRestricted ? "Restricted until Lab Results" : "AI Powered Medicine Suggestion"}
                    color="blue"
                    disabled={isPrescriptionRestricted}
                  />
                </div>

                {/* Inline Smart Prescription Card */}
                <div id="smart-prescription-section">
                  <SmartPrescriptionCard 
                    hospitalId={(user as any)?.hospitalId || ''}
                    appointmentId={appointmentId}
                    patientId={appointment?.patient?._id || ''}
                    patientAllergies={appointment?.patient?.allergies}
                    onSuccess={() => {
                      setShowHistorySection(true);
                      setActiveTab('history');
                      setHistorySubTab('prescriptions');
                      fetchPatientHistory();
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 2: LAB TOKEN */}
          {/* ═══════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* Section Header */}
            <button
              onClick={() => setShowLabSection(!showLabSection)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Beaker size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Lab Token</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order lab tests & track results</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-muted-foreground transition-transform duration-300 ${showLabSection ? 'rotate-90' : ''}`} />
            </button>

            {showLabSection && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Lab Token Toggle */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-border-theme p-3 sm:p-4 flex items-center justify-between shadow-sm gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${wantsLabToken ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Beaker size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-foreground truncate">Issue Lab Token</h4>
                      <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase truncate">Toggle to prioritize laboratory diagnostics</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWantsLabToken(!wantsLabToken)}
                    className={`w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all relative p-1 shrink-0 ${wantsLabToken ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                  >
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-md transition-all transform ${wantsLabToken ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionCard
                    onClick={() => router.push(getPath(`/doctor/lab-token/create?appointmentId=${appointmentId}`))}
                    icon={<Beaker size={24} />}
                    title="Order Lab Tests"
                    subtitle="Blood, Imaging & Diagnostics"
                    color="purple"
                    active={wantsLabToken}
                  />
                  {wantsLabToken && (
                    <ActionCard
                      onClick={() => {
                        setShowHistorySection(true);
                        setActiveTab('history');
                        setHistorySubTab('labs');
                      }}
                      icon={<Search size={24} />}
                      title="Lab Results"
                      subtitle="View Diagnostic Findings"
                      color="emerald"
                    />
                  )}
                </div>

                {/* Real-time Lab Results Tracking */}
                {appointment?.labResults && appointment.labResults.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-5 border-b border-border-theme bg-purple-50/30 dark:bg-purple-900/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                          <Beaker size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Active Lab Orders</h4>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Diagnostic Tracking</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Updates</span>
                      </div>
                    </div>
                  <div className="p-6 space-y-6">
                    {appointment.labResults.map((order: any, idx: number) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-800/50 uppercase tracking-widest">
                              {order.tokenNumber}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.status?.toLowerCase() === 'completed' && (
                              <Link
                                href={getPath(`/doctor/lab-results/${order._id}`)}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 underline uppercase tracking-widest mr-2"
                              >
                                View Full Report
                              </Link>
                            )}
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${order.status?.toLowerCase() === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : (order.status?.toLowerCase() === 'processing' || order.status?.toLowerCase() === 'sample_collected')
                                ? 'bg-blue-50 text-blue-700 border-blue-100 px-4'
                                : 'bg-purple-50 text-purple-700 border-purple-100'
                              }`}>
                              {order.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.tests.map((test: any, tIdx: number) => (
                            <div key={tIdx} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-purple-200 dark:hover:border-purple-900/30 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${(test.status === 'completed' || order.status?.toLowerCase() === 'completed')
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                  : test.status === 'processing'
                                    ? 'bg-blue-500 animate-pulse'
                                    : 'bg-purple-300'
                                  }`} />
                                <div>
                                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {test.test?.testName || test.test?.name || 'Diagnostic Test'}
                                  </p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">
                                    {order.status?.toLowerCase() === 'completed' ? 'Finalized' : test.status}
                                  </p>
                                </div>
                              </div>

                              {(test.status === 'completed' || order.status?.toLowerCase() === 'completed') ? (
                                <div className="text-right">
                                  <p className={`text-sm font-black ${(test.isAbnormal || test.result === 'Abnormal') ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {test.result || 'Result Ready'}
                                  </p>
                                  {test.isAbnormal && (
                                    <span className="text-[8px] font-black text-rose-600 uppercase animate-pulse">Abnormal</span>
                                  )}
                                </div>
                              ) : (
                                <div className={`flex items-center gap-1.5 ${test.status === 'processing' ? 'opacity-100' : 'opacity-50'}`}>
                                  {test.status === 'processing' ? (
                                    <Loader2 size={12} className="text-blue-500 animate-spin" />
                                  ) : (
                                    <Clock size={12} className="text-muted-foreground" />
                                  )}
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${test.status === 'processing' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                    {test.status === 'processing' ? 'Processing' : 'Waiting'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* SECTION 3: MEDICAL HISTORY */}
          {/* ═══════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* Section Header */}
            <button
              onClick={() => {
                setShowHistorySection(!showHistorySection);
                if (!showHistorySection) setActiveTab('history');
              }}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <History size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Medical History</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Past visits, prescriptions & lab reports</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-muted-foreground transition-transform duration-300 ${showHistorySection ? 'rotate-90' : ''}`} />
            </button>

            {showHistorySection && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* History Scoping Toggle & Filters */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-gray-900 rounded-3xl border border-primary-theme/20 shadow-sm shadow-primary-theme/5 gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${showFullHistory ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Building size={20} className={`${showFullHistory ? 'animate-bounce' : ''} sm:hidden`} />
                      <Building size={24} className={`${showFullHistory ? 'animate-bounce' : ''} hidden sm:block`} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-foreground">View Full Patient History</h4>
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {showFullHistory ? 'Accessing complete medical records across network' : 'Showing records from current facility only'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className={`w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all relative p-1 shrink-0 ${showFullHistory ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-gray-200 dark:bg-gray-800'}`}
                  >
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-md transition-all transform ${showFullHistory ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-border-theme">
                  <div className="flex items-center gap-2 flex-col sm:flex-row w-full lg:w-auto">
                    <div className="w-full sm:w-auto relative flex-1 min-w-[140px]">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Calendar size={14} />
                      </div>
                      <input
                        type="date"
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-border-theme rounded-xl text-[10px] sm:text-xs font-bold text-foreground focus:ring-2 focus:ring-primary-theme/30 outline-none transition-all uppercase tracking-widest"
                        title="Start Date"
                      />
                    </div>
                    <span className="text-muted-foreground text-xs font-bold uppercase hidden sm:block">to</span>
                    <div className="w-full sm:w-auto relative flex-1 min-w-[140px]">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Calendar size={14} />
                      </div>
                      <input
                        type="date"
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-border-theme rounded-xl text-[10px] sm:text-xs font-bold text-foreground focus:ring-2 focus:ring-primary-theme/30 outline-none transition-all uppercase tracking-widest"
                        title="End Date"
                      />
                    </div>
                    {(historyStartDate || historyEndDate) && (
                      <button
                        onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-colors shrink-0"
                      >
                        Clear Dates
                      </button>
                    )}
                  </div>

                  {showFullHistory && (
                    <>
                      <div className="w-px h-8 bg-border-theme hidden lg:block mx-1" />
                      <div className="w-full lg:w-auto relative flex-1 min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                          <Building size={14} />
                        </div>
                        <input
                          type="text"
                          placeholder="SEARCH BY HOSPITAL..."
                          value={historyFilterHospital}
                          onChange={(e) => setHistoryFilterHospital(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-950 border border-border-theme rounded-xl text-[10px] sm:text-xs font-bold text-foreground placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary-theme/30 outline-none transition-all uppercase tracking-widest"
                        />
                        {historyFilterHospital && (
                          <button
                            onClick={() => setHistoryFilterHospital('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 text-[10px] font-bold uppercase"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* History Sub-tabs */}
              <div className="flex items-center gap-2 sm:gap-4 border-b border-border-theme pb-2 mb-6 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setHistorySubTab('visits')}
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-widest pb-2 px-1 sm:px-2 transition-all relative whitespace-nowrap ${historySubTab === 'visits' ? 'text-primary-theme' : 'text-muted-foreground'
                    }`}
                >
                  Visits {filteredHistory && `(${filteredHistory.visits.length})`}
                  {historySubTab === 'visits' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
                <button
                  onClick={() => setHistorySubTab('prescriptions')}
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-widest pb-2 px-1 sm:px-2 transition-all relative whitespace-nowrap ${historySubTab === 'prescriptions' ? 'text-primary-theme' : 'text-muted-foreground'
                    }`}
                >
                  Prescriptions {filteredHistory && `(${filteredHistory.prescriptions.length})`}
                  {historySubTab === 'prescriptions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
                <button
                  onClick={() => setHistorySubTab('labs')}
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-widest pb-2 px-1 sm:px-2 transition-all relative whitespace-nowrap ${historySubTab === 'labs' ? 'text-primary-theme' : 'text-muted-foreground'
                    }`}
                >
                  Lab Reports {filteredHistory && `(${filteredHistory.reports.length})`}
                  {historySubTab === 'labs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-theme rounded-full" />}
                </button>
              </div>

              {loadingHistory ? (
                <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary-theme animate-spin mb-4" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Retrieving Medical Records...</p>
                </div>
              ) : filteredHistory ? (
                <div className="space-y-4">
                  {/* VISITS TAB */}
                  {historySubTab === 'visits' && (
                    <div className="grid gap-4">
                      {filteredHistory.visits.length > 0 ? filteredHistory.visits.map((visit) => (
                        <div key={visit._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary-theme/10 transition-colors">
                                <Calendar className="text-muted-foreground group-hover:text-primary-theme transition-colors" size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-1">
                                  {new Date(visit.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <h4 className="text-[13px] font-black text-gray-900 dark:text-white mb-2 uppercase leading-snug">
                                  {visit.reason || visit.symptoms?.join(', ') || 'General Visit'}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                    <Clock size={12} className="text-primary-theme" />
                                    {visit.appointmentTime}
                                  </span>
                                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                    <Stethoscope size={12} className="text-primary-theme" />
                                    {visit.doctorName ? (visit.doctorName.toLowerCase().startsWith('dr') ? visit.doctorName : `Dr. ${visit.doctorName}`) : 'Dr. Attending Physician'}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 flex items-center gap-1 border border-blue-100 dark:border-blue-800/50">
                                    <Building size={10} />
                                    {visit.hospitalName} • <span className="text-[9px] lowercase font-medium opacity-70 italic">{visit.hospitalAddress}</span>
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                                  <div className="flex items-center gap-1.5 grayscale opacity-70">
                                    <span className="text-[9px] font-black uppercase tracking-widest">Fee:</span>
                                    <span className="text-[10px] font-bold">₹{visit.amount || 0}</span>
                                  </div>
                                  <div className="w-px h-2.5 bg-gray-200 dark:bg-gray-700" />
                                  <div className="flex items-center gap-1.5 grayscale opacity-70">
                                    <span className="text-[9px] font-black uppercase tracking-widest">Mode:</span>
                                    <span className="text-[10px] font-bold uppercase">{visit.paymentMethod}</span>
                                  </div>
                                  <div className="w-px h-2.5 bg-gray-200 dark:bg-gray-700" />
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Status:</span>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${visit.paymentStatus?.toLowerCase() === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                      {visit.paymentStatus}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <EmptyHistoryState
                          message={showFullHistory && historyFilterHospital ? "No hospital is found from your search" : "No previous visits found matching your criteria"}
                        />
                      )}
                    </div>
                  )}

                  {/* PRESCRIPTIONS TAB */}
                  {historySubTab === 'prescriptions' && (
                    <div className="grid gap-4">
                      {filteredHistory.prescriptions.length > 0 ? filteredHistory.prescriptions.map((pres) => (
                        <div key={pres._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-1">
                                Prescribed on {new Date(pres.date || pres.createdAt).toLocaleDateString()}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <h4 className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                  {pres.doctorName ? (pres.doctorName.toLowerCase().startsWith('dr') ? pres.doctorName : `Dr. ${pres.doctorName}`) : 'Dr. Attending Physician'}
                                </h4>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                  {pres.hospitalName} • <span className="lowercase font-medium opacity-70 italic">{pres.hospitalAddress}</span>
                                </span>
                                {pres.suggestedPrimaryDoctor && pres.suggestedPrimaryDoctor !== 'N/A' && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    Primary: {pres.suggestedPrimaryDoctor.toLowerCase().startsWith('dr') ? pres.suggestedPrimaryDoctor : `Dr. ${pres.suggestedPrimaryDoctor}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {pres.medicines?.map((med: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div>
                                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{med.name}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{med.dosage} • {med.duration}</p>
                                </div>
                                <span className="text-[10px] font-black text-primary-theme uppercase">{formatFrequency(med.frequency)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <EmptyHistoryState
                          message={showFullHistory && historyFilterHospital ? "No hospital is found from your search" : "No prescriptions found matching your criteria"}
                        />
                      )}
                    </div>
                  )}

                  {/* LABS TAB */}
                  {historySubTab === 'labs' && (
                    <div className="grid gap-4">
                      {filteredHistory.reports.length > 0 ? filteredHistory.reports.map((report) => (
                        <div key={report._id} className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-6 hover:shadow-md transition-all flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                                <Beaker className="text-purple-600" size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-primary-theme uppercase tracking-widest mb-0.5">
                                  {new Date(report.date || report.createdAt).toLocaleDateString()}
                                </p>
                                <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase">{report.name}</h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">{report.type || 'Diagnostic Report'}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {report.hospitalName} • <span className="lowercase font-medium opacity-70 italic">{report.hospitalAddress}</span>
                                  </span>
                                  {report.suggestedPrimaryDoctor && report.suggestedPrimaryDoctor !== 'N/A' && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      Primary: {report.suggestedPrimaryDoctor.toLowerCase().startsWith('dr') ? report.suggestedPrimaryDoctor : `Dr. ${report.suggestedPrimaryDoctor}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {report.url && (
                              <button
                                onClick={() => setDocViewer({ url: report.url, label: report.name })}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-primary-theme active:scale-90 border border-transparent hover:border-primary-theme/20"
                              >
                                <Eye size={20} />
                              </button>
                            )}
                          </div>

                          {/* SYSTEM GENERATED LAB RESULTS */}
                          {report.results && report.results.length > 0 && (
                            <div className="mt-2 space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                              {report.results.map((res: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">{res.testName}</p>
                                    {res.result && (
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${res.isAbnormal ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {res.result}
                                      </span>
                                    )}
                                  </div>
                                  {res.subTests && res.subTests.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                      {res.subTests.map((sub: any, sIdx: number) => (
                                        <div key={sIdx} className="flex flex-col">
                                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{sub.name}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{sub.result}</span>
                                            {sub.unit && <span className="text-[8px] font-medium text-muted-foreground">{sub.unit}</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )) : (
                        <EmptyHistoryState
                          message={showFullHistory && historyFilterHospital ? "No hospital is found from your search" : "No lab reports found matching your criteria"}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyHistoryState message="History not initialized" />
              )}
            </div>
            )}
          </div>
        </div>
      </main>

      {/* DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={!!docViewer}
        onClose={() => setDocViewer(null)}
        url={docViewer?.url || ''}
        title={docViewer?.label || ''}
      />

      {/* CONSULTATION COMPLETION MODAL */}
      <ConsultationCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onConfirm={() => handleEndConsultation(true)}
        missingPrescription={!appointment?.prescription}
        missingLabs={!((appointment?.labResults && appointment.labResults.length > 0) || !!appointment?.labToken)}
      />
    </div>
  );
}

// Helper Components
function EmptyHistoryState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-4xl border border-border-theme shadow-sm p-20 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6">
        <History className="text-muted-foreground" size={32} />
      </div>
      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Records Empty</h3>
      <p className="text-muted-foreground max-w-sm mt-2 font-medium">{message}</p>
    </div>
  );
}

// Helper Components
function VitalGridItem({ icon, label, value, unit, color }: any) {
  const colorMap: any = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20',
  };

  return (
    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-transparent transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${colorMap[color]}`}>
      <div className="flex items-center gap-1 sm:gap-1.5 opacity-80">
        {icon}
        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span className="text-sm sm:text-base font-black tabular-nums">{value}</span>
        <span className="text-[8px] sm:text-[10px] font-bold opacity-60 italic">{unit}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${active
        ? 'bg-primary-theme text-primary-theme-foreground shadow-lg shadow-primary-theme/20'
        : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
    >
      {icon} {label}
    </button>
  );
}

function ActionCard({ onClick, icon, title, subtitle, color, disabled, active }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500 shadow-blue-500/20',
    purple: 'bg-purple-500 shadow-purple-500/20',
    emerald: 'bg-emerald-500 shadow-emerald-500/20',
    disabled: 'bg-gray-400 shadow-none opacity-40 cursor-not-allowed grayscale scale-95',
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`p-4 sm:p-5 rounded-2xl sm:rounded-[1.75rem] text-left text-white flex gap-3 sm:gap-4 transition-all relative overflow-hidden ${disabled ? colorMap.disabled : colorMap[color]
        } ${!disabled && 'hover:-translate-y-1 hover:shadow-xl active:scale-95'}`}
    >
      {active && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
      )}
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18, className: 'sm:w-6 sm:h-6' })}
      </div>
      <div className="min-w-0">
        <h4 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate">{title}</h4>
        <p className="text-[9px] sm:text-[10px] font-medium opacity-80 mt-0.5 leading-snug line-clamp-2">{subtitle}</p>
      </div>
    </button>
  );
}
