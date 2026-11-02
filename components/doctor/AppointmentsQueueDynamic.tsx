"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Globe, 
  Smartphone,
  Stethoscope 
} from 'lucide-react';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { formatLocalTime } from '@/lib/utils/date-utils';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: string;
  isPaused?: boolean;
  createdAt?: string;
  date?: string;
  mrn?: string;
  isMobile?: boolean;
  bookingChannel?: string;
  source?: string;
  token_number?: any;
}

interface QueueProps {
  onStatsChange?: (stats: {
    queueCount: number;
    totalAppointments: number;
    completedCount: number;
    estimatedMinutes: number;
    showQueue: boolean;
    nextAppointmentId: string | null;
    currentAppointmentId?: string | null;
    overallStats?: any;
  }) => void;
  consultationDuration?: number;
  visitTypeFilter: 'all' | 'opd' | 'ipd';
  setVisitTypeFilter: (type: 'all' | 'opd' | 'ipd') => void;
}

const getLocalDateStr = (dInput: any) => {
  if (!dInput) return '';
  const d = new Date(dInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function AppointmentsQueueDynamic({ onStatsChange, consultationDuration, visitTypeFilter, setVisitTypeFilter }: QueueProps) {
  const router = useRouter();
  const params = useParams() as any;
  const hospitalId = params?.hospitalId || '';

  const [showQueue, setShowQueue] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'history'>('waiting');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'online' | 'app' | 'offline'>('all');

  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    pendingReports: 0,
    consultationsValue: 0
  });
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string>(() => getLocalDateStr(new Date()));
  const [endDateFilter, setEndDateFilter] = useState<string>(() => getLocalDateStr(new Date()));

  const fetchDoctorProfile = useCallback(async () => {
    try {
      const profile = await doctorService.getProfile();
      if (profile && typeof profile.isOnline === 'boolean') {
        setShowQueue(profile.isOnline);
      }
    } catch (err) {
      console.error('Failed to fetch doctor profile status:', err);
    }
  }, []);

  const handleToggleQueue = async () => {
    const nextState = !showQueue;
    setShowQueue(nextState);
    try {
      await doctorService.updateOnlineStatus(nextState);
      toast.success(`Queue is now ${nextState ? 'ON (Online)' : 'OFF (Offline)'}`);
    } catch (err: any) {
      setShowQueue(!nextState);
      toast.error(err.message || 'Failed to update queue status');
    }
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      await doctorService.updateAppointmentStatus(appointmentToDelete, 'cancelled');
      toast.success('Appointment removed');
      fetchAppointments();
    } catch (err: any) {
      toast.error('Failed to remove');
      console.error(err);
    } finally {
      setAppointmentToDelete(null);
    }
  };

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response: any = await doctorService.getDashboard();
      if (response?.appointments) {
        setAppointments(response.appointments || []);
        setStats(prev => response.stats || prev);
      }
    } catch (error: any) {
      console.error('[Queue] Failed to fetch appointments:', error);
      toast.error(error.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
    fetchDoctorProfile();
  }, [fetchAppointments, fetchDoctorProfile]);

  // Auto-refresh on focus, visibility change, and real-time socket events
  useEffect(() => {
    const handleFocus = () => {
      fetchAppointments();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchAppointments();
    });

    let activeSocket: any = null;
    import('@/lib/integrations/api/socket').then(({ getSocket }) => {
      getSocket().then(socket => {
        if (!socket) return;
        activeSocket = socket;
        socket.on('dashboard:update', handleFocus);
        socket.on('appointment_status_changed', handleFocus);
        socket.on('queue_update', handleFocus);
      });
    }).catch(err => console.warn('Socket connect err in queue:', err));

    const interval = setInterval(fetchAppointments, 15000); // 15 second fallback poll

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      if (activeSocket) {
        activeSocket.off('dashboard:update', handleFocus);
        activeSocket.off('appointment_status_changed', handleFocus);
        activeSocket.off('queue_update', handleFocus);
      }
    };
  }, [fetchAppointments]);

  const todayObj = new Date();
  const todayStr = getLocalDateStr(todayObj);

  // Compute Source Counts (All / Website / App / Offline)
  const sourceCounts = useMemo(() => {
    const counts = { all: 0, online: 0, app: 0, offline: 0 };
    appointments.forEach((apt: any) => {
      const status = apt.status?.toLowerCase();
      const isWaiting = status !== 'completed' && status !== 'cancelled' && !(apt as any).isPaused;
      if (activeTab === 'waiting' && !isWaiting) return;
      if (activeTab === 'history' && status !== 'completed') return;

      // Filter by Visit Type
      if (visitTypeFilter !== 'all') {
        const type = (apt.type || 'opd').toLowerCase();
        if (visitTypeFilter === 'opd') {
          if (!(type === 'opd' || type === 'consultation' || type === 'app' || type === 'routine')) return;
        } else if (type !== visitTypeFilter) {
          return;
        }
      }

      // Filter strictly by Date Range
      const aptDateStr = getLocalDateStr(apt.date || apt.createdAt);
      if (startDateFilter && aptDateStr && aptDateStr < startDateFilter) return;
      if (endDateFilter && aptDateStr && aptDateStr > endDateFilter) return;

      const isApp = Boolean(apt.isMobile || apt.bookingChannel === 'app' || apt.source === 'app');
      const isOnline = Boolean(!isApp && (apt.type?.toLowerCase() === 'online' || apt.bookingChannel === 'online' || apt.bookingChannel === 'website' || apt.source === 'online' || apt.source === 'website'));

      counts.all++;
      if (isApp) {
        counts.app++;
      } else if (isOnline) {
        counts.online++;
      } else {
        counts.offline++;
      }
    });
    return counts;
  }, [appointments, activeTab, visitTypeFilter, startDateFilter, endDateFilter]);

  // Filter: Show matching appointments according to activeTab, sourceFilter, visitTypeFilter, and date range
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const status = apt.status?.toLowerCase();
      
      if (activeTab === 'waiting') {
        const isExcluded = status === 'completed' || status === 'cancelled' || (apt as any).isPaused === true;
        if (isExcluded) return false;
      } else {
        // History tab: completed consultations
        if (status !== 'completed') return false;
      }

      // Filter by Visit Type
      if (visitTypeFilter !== 'all') {
        const type = (apt.type || 'opd').toLowerCase();
        if (visitTypeFilter === 'opd') {
          if (!(type === 'opd' || type === 'consultation' || type === 'app' || type === 'routine' || type === 'online')) return false;
        } else if (type !== visitTypeFilter) {
          return false;
        }
      }

      // Filter by Source Channel
      const isApp = Boolean((apt as any).isMobile || (apt as any).bookingChannel === 'app' || (apt as any).source === 'app');
      const isOnline = Boolean(!isApp && ((apt as any).type?.toLowerCase() === 'online' || (apt as any).bookingChannel === 'online' || (apt as any).bookingChannel === 'website' || (apt as any).source === 'online' || (apt as any).source === 'website'));

      if (sourceFilter !== 'all') {
        if (sourceFilter === 'app' && !isApp) return false;
        if (sourceFilter === 'online' && !isOnline) return false;
        if (sourceFilter === 'offline' && (isApp || isOnline)) return false;
      }

      // Filter strictly by Date Range
      const aptDateStr = getLocalDateStr(apt.date || apt.createdAt);
      if (startDateFilter && aptDateStr && aptDateStr < startDateFilter) return false;
      if (endDateFilter && aptDateStr && aptDateStr > endDateFilter) return false;

      return true;
    });
  }, [appointments, activeTab, sourceFilter, visitTypeFilter, startDateFilter, endDateFilter]);

  // Sort appointments by creation time (queue order)
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      return new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime();
    });
  }, [filteredAppointments]);

  const formatTokenNumber = (token: any, fallbackIdx: number) => {
    if (token !== undefined && token !== null && token !== '') {
      const str = String(token).trim();
      if (!str.toUpperCase().startsWith('HH') && str.length <= 4) {
        const num = parseInt(str, 10);
        if (!isNaN(num)) {
          return `#${String(num).padStart(2, '0')}`;
        }
        return str.startsWith('#') ? str : `#${str}`;
      }
    }
    return `#${String(fallbackIdx + 1).padStart(2, '0')}`;
  };

  // Socket Integration
  const { user } = useAuthStore() || {};

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      if (user?.id) {
        const socketLib = await import('@/lib/integrations/api/socket');
        const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } = socketLib;

        await joinSocketRoom({
          role: user.role,
          userId: user.id,
          hospitalId: user.hospitalId || (user as any).hospital
        });

        const handleUpdate = (data: any) => {
          if (mounted) fetchAppointments();
        };

        await subscribeToSocket('dashboard:update', handleUpdate);
        await subscribeToSocket('notification:new', handleUpdate);
        await subscribeToSocket('appointment_request', handleUpdate);

        return () => {
          unsubscribeFromSocket('dashboard:update', handleUpdate);
          unsubscribeFromSocket('notification:new', handleUpdate);
          unsubscribeFromSocket('appointment_request', handleUpdate);
        };
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [user]);

  let dynamicLabel = "Today";
  if (startDateFilter || endDateFilter) {
    if (startDateFilter === endDateFilter) {
      dynamicLabel = startDateFilter === todayStr ? "Today" : startDateFilter.split('-').reverse().join('-');
    } else {
      const s = startDateFilter ? startDateFilter.split('-').reverse().join('-') : 'Earliest';
      const e = endDateFilter ? endDateFilter.split('-').reverse().join('-') : 'Latest';
      dynamicLabel = `${s} to ${e}`;
    }
  } else {
    dynamicLabel = "All Time";
  }

  // Notify parent of stats changes
  useEffect(() => {
    const completedCount = appointments.filter(apt => apt.status === 'completed').length;
    const estimatedMinutes = sortedAppointments.length * (consultationDuration || 15);
    const nextAppointmentId = sortedAppointments.length > 0 ? sortedAppointments[0].id : null;

    const currentAppointment = appointments.find(apt => apt.status === 'in-progress');
    const currentAppointmentId = currentAppointment ? currentAppointment.id : null;

    if (onStatsChange) {
      onStatsChange({
        queueCount: sortedAppointments.length,
        totalAppointments: appointments.length,
        completedCount,
        estimatedMinutes,
        showQueue,
        nextAppointmentId,
        currentAppointmentId,
        overallStats: {
          ...stats,
          totalPendingQueue: sortedAppointments.length,
          appointmentsToday: appointments.length,
          dynamicLabel: dynamicLabel
        }
      });
    }
  }, [appointments, sortedAppointments, showQueue, onStatsChange, consultationDuration, dynamicLabel, stats]);

  const handleStartConsultation = (appointmentId: string) => {
    const targetHospital = hospitalId || user?.hospitalId || (user as any)?.hospital;
    if (targetHospital) {
      router.push(`/${targetHospital}/doctor/prescription?appointmentId=${appointmentId}`);
    } else {
      router.push(`/doctor/prescription?appointmentId=${appointmentId}`);
    }
  };

  return (
    <div className="bg-card dark:bg-card rounded-2xl border border-border-theme dark:border-border-theme shadow-sm h-full flex flex-col">
      {/* Header with Filters */}
      <div className="p-4 sm:p-5 border-b border-border-theme dark:border-border-theme flex flex-col gap-3.5 shrink-0 bg-slate-50/50">
        
        {/* Top Header Row: Title + Waiting/History Tabs + Queue Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-black text-foreground uppercase tracking-tight leading-tight">
                {startDateFilter === todayStr && endDateFilter === todayStr 
                  ? "Schedule Today" 
                  : !startDateFilter && !endDateFilter 
                    ? "All Appointments" 
                    : `Schedule: ${dynamicLabel}`}
              </h2>
              <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 font-bold uppercase tracking-widest opacity-70">
                {showQueue ? (
                  <>
                    {sortedAppointments.length} Patient{sortedAppointments.length !== 1 ? 's' : ''} in list
                  </>
                ) : (
                  <>Queue view disabled</>
                )}
              </p>
            </div>

            {/* WAITING vs HISTORY Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs ml-2">
              <button
                type="button"
                onClick={() => setActiveTab('waiting')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'waiting'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Waiting
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Right Controls: Queue Toggle */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Queue</span>
              <button
                onClick={handleToggleQueue}
                className={`relative w-10 h-5 sm:w-11 sm:h-5.5 rounded-full cursor-pointer transition-colors ${showQueue ? 'bg-teal-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showQueue ? 'translate-x-5 sm:translate-x-5.5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-[10px] font-black uppercase ${showQueue ? 'text-teal-600' : 'text-slate-400'}`}>
                {showQueue ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Second Filter Row: Source Filters + Date Range + Visit Type */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Channel Filters (All / Website / App / Offline) */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({sourceCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('online')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                sourceFilter === 'online'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-cyan-700 bg-cyan-50/70 hover:bg-cyan-100/70'
              }`}
              title="View appointments booked via Hospital Website"
            >
              <Globe size={11} className={sourceFilter === 'online' ? 'animate-spin' : ''} />
              Website ({sourceCounts.online})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('app')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                sourceFilter === 'app'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70'
              }`}
              title="View appointments booked via Mobile Patient App"
            >
              <Smartphone size={11} />
              App ({sourceCounts.app})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('offline')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                sourceFilter === 'offline'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="View counter walk-in appointments"
            >
              Offline ({sourceCounts.offline})
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-xs focus-within:ring-2 focus-within:ring-teal-500/50 transition-all flex-wrap gap-x-2.5 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">From</span>
              <input
                type="date"
                value={startDateFilter || ''}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  if (endDateFilter && e.target.value > endDateFilter) {
                    setEndDateFilter(e.target.value);
                  }
                }}
                className="bg-transparent text-[10.5px] font-black text-slate-700 outline-none uppercase tracking-widest cursor-pointer"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div className="w-[1px] h-3.5 bg-slate-200"></div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase">To</span>
              <input
                type="date"
                value={endDateFilter || ''}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  if (startDateFilter && e.target.value < startDateFilter) {
                    setStartDateFilter(e.target.value);
                  }
                }}
                className="bg-transparent text-[10.5px] font-black text-slate-700 outline-none uppercase tracking-widest cursor-pointer"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {(startDateFilter !== todayStr || endDateFilter !== todayStr) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter(todayStr);
                    setEndDateFilter(todayStr);
                  }}
                  className="text-[9px] text-teal-600 font-black uppercase bg-teal-50 px-2 py-0.5 rounded hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
              )}
              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                  className="text-[9px] text-rose-500 font-black uppercase bg-rose-50 px-2 py-0.5 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Visit Type (ALL / OPD / IPD) */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            {(['all', 'opd', 'ipd'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setVisitTypeFilter(type)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  visitTypeFilter === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Appointments List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-theme animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading appointments...</p>
          </div>
        ) : showQueue ? (
          sortedAppointments.length > 0 ? (
            <div className="space-y-2.5">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 border-b border-border-theme text-[10px] font-black text-muted uppercase tracking-widest bg-slate-50/50 rounded-lg">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4">Patient Details</div>
                <div className="col-span-2 text-center">Schedule</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-right pr-2">Actions</div>
              </div>

              {sortedAppointments.map((apt, idx) => {
                const estimatedWaitMinutes = idx * (consultationDuration || 15);
                const hours = Math.floor(estimatedWaitMinutes / 60);
                const minutes = estimatedWaitMinutes % 60;
                const waitTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                return (
                  <React.Fragment key={apt.id}>
                    {/* Desktop View Row */}
                    <div className="hidden sm:grid grid-cols-12 items-center gap-3 p-3 bg-white dark:bg-secondary-theme rounded-xl border border-slate-200/80 hover:border-teal-400 hover:shadow-xs transition-all group">
                      
                      {/* Column 1: Token */}
                      <div className="col-span-1 flex flex-col items-center justify-center">
                        <div className="shrink-0 w-8 h-8 lg:w-9 lg:h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs">
                          {formatTokenNumber((apt as any).token_number, idx)}
                        </div>
                        <span className="text-[7.5px] font-black uppercase tracking-tight text-slate-400 mt-0.5">TOKEN</span>
                      </div>
                      
                      {/* Column 2: Patient Details (Initials Avatar + Name + MRN) */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          apt.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white'
                        }`}>
                          {(apt.patientName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-foreground text-xs uppercase truncate tracking-tight">
                            {apt.patientName}
                          </h4>
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            MRN: {apt.mrn || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Column 3: Schedule Date & Time */}
                      <div className="col-span-2 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[8.5px] font-black uppercase text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/60">
                          {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Today"}
                        </span>
                        <span className="text-[10px] font-black text-slate-700">
                          {apt.time || 'N/A'}
                        </span>
                        {idx > 0 && activeTab === 'waiting' && (
                          <span className="text-[8.5px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <Clock size={9} /> Wait: {waitTime}
                          </span>
                        )}
                      </div>

                      {/* Column 4: Type / Source Channel Badge */}
                      <div className="col-span-2 flex justify-center">
                        {(apt as any).isMobile || (apt as any).bookingChannel === 'app' || (apt as any).source === 'app' ? (
                          <span className="text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                            <Smartphone size={9.5} className="text-indigo-600 shrink-0" />
                            App
                          </span>
                        ) : (apt as any).type?.toLowerCase() === 'online' || (apt as any).bookingChannel === 'online' || (apt as any).bookingChannel === 'website' || (apt as any).source === 'online' || (apt as any).source === 'website' ? (
                          <span className="text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                            <Globe size={9.5} className="text-cyan-600 shrink-0" />
                            Website
                          </span>
                        ) : (apt as any).type === 'EMERGENCY' ? (
                          <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest inline-block bg-rose-50 text-rose-600 border border-rose-100">
                            Emergency
                          </span>
                        ) : (apt as any).type === 'IPD' ? (
                          <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest inline-block bg-purple-50 text-purple-600 border border-purple-100">
                            IPD
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest inline-block bg-slate-100 text-slate-600 border border-slate-200">
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Column 5: Status */}
                      <div className="col-span-1 text-center">
                        <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                          apt.status?.toLowerCase() === 'arrived' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          apt.status?.toLowerCase() === 'in-progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          apt.status?.toLowerCase() === 'completed' ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {apt.status || 'Booked'}
                        </span>
                      </div>

                      {/* Column 6: Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5 pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentToDelete(apt.id);
                          }}
                          className="shrink-0 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Remove Appointment"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          onClick={() => handleStartConsultation(apt.id)}
                          className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <CheckCircle2 size={12} /> Start
                        </button>
                      </div>
                    </div>

                    {/* Mobile View Card (xs only) */}
                    <div className="sm:hidden flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="shrink-0 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-[11px] shadow-xs">
                            {formatTokenNumber((apt as any).token_number, idx)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-slate-900 truncate">{apt.patientName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[9px]">
                              <span className="text-blue-700 font-black bg-blue-50 px-1 rounded">MRN: {apt.mrn || 'N/A'}</span>
                              <span className="text-slate-300">•</span>
                              {(apt as any).isMobile || (apt as any).bookingChannel === 'app' || (apt as any).source === 'app' ? (
                                <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">App</span>
                              ) : (apt as any).type?.toLowerCase() === 'online' || (apt as any).bookingChannel === 'online' || (apt as any).bookingChannel === 'website' || (apt as any).source === 'online' || (apt as any).source === 'website' ? (
                                <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700">Website</span>
                              ) : (
                                <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">Offline</span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="font-black uppercase text-emerald-600">{apt.status || 'Pending'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-slate-800">{apt.time}</p>
                          <p className="text-[8.5px] text-slate-400 font-bold mt-0.5">
                            {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Today"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentToDelete(apt.id);
                          }}
                          className="p-1.5 bg-red-50 text-red-600 rounded-lg"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          onClick={() => handleStartConsultation(apt.id)}
                          className="px-3.5 py-1.5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg shadow-xs"
                        >
                          <CheckCircle2 size={12} className="mr-1" /> Start
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Total Estimated Time Card */}
              {activeTab === 'waiting' && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Total Estimated Time
                    </span>
                    <span className="text-sm font-black text-blue-600">
                      {Math.floor((sortedAppointments.length * (consultationDuration || 15)) / 60)}h {(sortedAppointments.length * (consultationDuration || 15)) % 60}m
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {sortedAppointments.length} appointments × {consultationDuration || 15} min each
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-muted">No appointments found</p>
              <p className="text-[10px] text-muted mt-0.5">Try adjusting your date or channel filters</p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-secondary-theme rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7 text-muted" />
            </div>
            <p className="text-xs font-bold text-muted">Queue View Disabled</p>
            <p className="text-[10px] text-muted mt-0.5">Toggle ON to see patient queue and wait times</p>
          </div>
        )}
      </div>

      {appointmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-[1.5rem] p-6 shadow-2xl border border-border-theme">
            <h3 className="text-base font-black text-foreground mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 size={16} />
              </span>
              Remove Appointment
            </h3>
            <p className="text-xs text-muted font-medium mb-6 leading-relaxed">
              Are you sure you want to remove this appointment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAppointmentToDelete(null)} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-foreground bg-secondary-theme border border-border-theme hover:bg-muted/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 active:scale-95 transition-all"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(AppointmentsQueueDynamic);
