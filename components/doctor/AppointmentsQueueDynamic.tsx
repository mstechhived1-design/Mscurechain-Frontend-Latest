"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
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

function AppointmentsQueueDynamic({ onStatsChange, consultationDuration, visitTypeFilter, setVisitTypeFilter }: QueueProps) {
   const router = useRouter();
  const [showQueue, setShowQueue] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    pendingReports: 0,
    consultationsValue: 0
  });
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [endDateFilter, setEndDateFilter] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });

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
      console.log('[Queue] Dashboard response:', response);
      console.log('[Queue] Appointments:', response?.appointments);
      console.log('[Queue] Appointments count:', response?.appointments?.length);

      if (response?.appointments) {
        console.log('[Queue] Setting appointments:', response.appointments);
        setAppointments(response.appointments || []);
        setStats(prev => response.stats || prev);
      } else {
        console.log('[Queue] No appointments found in response');
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const todayObj = new Date();
  todayObj.setMinutes(todayObj.getMinutes() - todayObj.getTimezoneOffset());
  const todayStr = todayObj.toISOString().split('T')[0];

  // Filter: Show all appointments except completed, cancelled, and paused ones
  // Also show appointments with status "Booked", "confirmed", "scheduled", etc.
  const queueAppointments = appointments.filter(apt => {
    const status = apt.status?.toLowerCase();
    const isExcluded = status === 'completed' || status === 'cancelled' || (apt as any).isPaused === true;
    
    // Filter by Visit Type
    if (visitTypeFilter !== 'all') {
      const type = (apt.type || 'opd').toLowerCase();
      if (visitTypeFilter === 'opd') {
        if (!(type === 'opd' || type === 'consultation')) return false;
      } else if (type !== visitTypeFilter) {
        return false;
      }
    }

    // Filter by Date Range
    const effectiveStart = startDateFilter || todayStr;
    const effectiveEnd = endDateFilter || todayStr;
    
    const aptDateStr = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
    if (!aptDateStr) return false;
    
    let isValid = true;
    if (effectiveStart && aptDateStr < effectiveStart) isValid = false;
    if (effectiveEnd && aptDateStr > effectiveEnd) isValid = false;
    
    if (!isValid) return false;
    
    return !isExcluded;
  });

  console.log('[Queue] Total appointments:', appointments.length);
  console.log('[Queue] Queue appointments:', queueAppointments.length);

  // Sort appointments by creation time (queue order)
  const sortedAppointments = [...queueAppointments].sort((a, b) => {
    return new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime();
  });

  // Socket Integration
  const { user } = useAuthStore() || {}; // Corrected hook call

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      if (user?.id) {
        const socketLib = await import('@/lib/integrations/api/socket');
        const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } = socketLib;

        // Join room explicitly to ensure we receive events
        await joinSocketRoom({
          role: user.role,
          userId: user.id,
          hospitalId: user.hospitalId || (user as any).hospital
        });

        const handleUpdate = (data: any) => {
          console.log('🔔 Dashboard Update Received:', data);
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

  // Determine dynamic label inside the render so it can be used for the title
  let dynamicLabel = "Today's";
  
  // If dates are cleared, default to today
  const effectiveStart = startDateFilter || todayStr;
  const effectiveEnd = endDateFilter || todayStr;

  if (effectiveStart !== todayStr || effectiveEnd !== todayStr) {
      if (effectiveStart === effectiveEnd) {
          dynamicLabel = effectiveStart.split('-').reverse().join('-');
      } else {
          dynamicLabel = `${effectiveStart.split('-').reverse().join('-')} TO ${effectiveEnd.split('-').reverse().join('-')}`;
      }
  }

  // Notify parent of stats changes
  useEffect(() => {

    const filteredAppointments = appointments.filter(apt => {
        // Filter by Visit Type
        if (visitTypeFilter !== 'all') {
          const type = (apt.type || 'opd').toLowerCase();
          if (visitTypeFilter === 'opd') {
            if (!(type === 'opd' || type === 'consultation')) return false;
          } else if (type !== visitTypeFilter) {
            return false;
          }
        }

        // Filter by Date Range
        const aptDateStr = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
        if (!aptDateStr) return false;
        let isValid = true;
        if (effectiveStart && aptDateStr < effectiveStart) isValid = false;
        if (effectiveEnd && aptDateStr > effectiveEnd) isValid = false;
        if (!isValid) return false;

        return true;
    });

    const completedCount = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const estimatedMinutes = queueAppointments.length * (consultationDuration || 15);
    const nextAppointmentId = sortedAppointments.length > 0 ? sortedAppointments[0].id : null;

    // Find ongoing appointment (in-progress status)
    const currentAppointment = appointments.find(apt => apt.status === 'in-progress');
    const currentAppointmentId = currentAppointment ? currentAppointment.id : null;

    if (onStatsChange) {
      onStatsChange({
        queueCount: queueAppointments.length,
        totalAppointments: filteredAppointments.length,
        completedCount,
        estimatedMinutes,
        showQueue,
        nextAppointmentId,
        currentAppointmentId,
        overallStats: {
            ...stats,
            totalPendingQueue: queueAppointments.length,
            appointmentsToday: filteredAppointments.length,
            dynamicLabel: dynamicLabel
        }
      });
    }
  }, [appointments.length, queueAppointments.length, showQueue, sortedAppointments.length, appointments, onStatsChange, consultationDuration, startDateFilter, endDateFilter, stats, visitTypeFilter]);

  return (
    <div className="bg-card dark:bg-card rounded-2xl border border-border-theme dark:border-border-theme shadow-sm h-full flex flex-col">
      {/* Header with Toggle - Fixed */}
      <div className="p-4 sm:p-6 border-b border-border-theme dark:border-border-theme flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div>
            <h2 className="text-xs sm:text-sm md:text-base font-black text-foreground dark:text-foreground uppercase tracking-tight leading-tight">
              {effectiveStart === todayStr && effectiveEnd === todayStr ? "Schedule Today" : `Schedule: ${dynamicLabel}`}
            </h2>
            <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 font-bold uppercase tracking-widest opacity-70">
              {showQueue ? (
                <>
                  {queueAppointments.length} Patient{queueAppointments.length !== 1 ? 's' : ''} in list
                </>
              ) : (
                <>Queue view disabled</>
              )}
            </p>
          </div>

          {/* Moved Toggle here on Mobile - stacked on right of title */}
          <div className="flex lg:hidden items-center gap-2 bg-secondary-theme px-3 py-1.5 rounded-xl border border-border-theme">
            <button
              onClick={handleToggleQueue}
              className={`relative w-8 h-4 sm:w-10 sm:h-5 rounded-full cursor-pointer transition-colors ${showQueue ? 'bg-primary-theme' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full transition-transform ${showQueue ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[10px] font-black uppercase ${showQueue ? 'text-primary-theme' : 'text-muted'}`}>
              {showQueue ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Queue Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Date Filter */}
          <div className="flex-1 flex flex-col gap-2 bg-secondary-theme px-3 py-2 rounded-xl border border-border-theme focus-within:ring-2 focus-within:ring-primary-theme/50 transition-all w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* FROM date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase shrink-0">From</span>
                <input 
                  type="date" 
                  value={startDateFilter || ''}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    if (endDateFilter && e.target.value > endDateFilter) {
                      setEndDateFilter(e.target.value);
                    }
                  }}
                  className="bg-transparent text-[11px] font-black text-foreground outline-none uppercase tracking-widest cursor-pointer min-w-0 w-auto"
                  style={{ colorScheme: 'light' }}
                />
              </div>

              <div className="w-[1px] h-4 bg-border-theme hidden sm:block shrink-0"></div>

              {/* TO date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase shrink-0">To</span>
                <input 
                  type="date" 
                  value={endDateFilter || ''}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    if (startDateFilter && e.target.value < startDateFilter) {
                      setStartDateFilter(e.target.value);
                    }
                  }}
                  className="bg-transparent text-[11px] font-black text-foreground outline-none uppercase tracking-widest cursor-pointer min-w-0 w-auto"
                  style={{ colorScheme: 'light' }}
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {(() => {
                    return (effectiveStart !== todayStr || effectiveEnd !== todayStr);
                })() && (
                  <button 
                    onClick={() => {
                      const today = new Date();
                      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                      const todayStr = today.toISOString().split('T')[0];
                      setStartDateFilter(todayStr);
                      setEndDateFilter(todayStr);
                    }} 
                    className="text-[9px] text-primary-theme font-black uppercase bg-primary-theme/10 px-3 py-1 rounded-lg hover:bg-primary-theme/20 transition-colors whitespace-nowrap"
                  >
                    Today
                  </button>
                )}
                {(startDateFilter || endDateFilter) ? (
                  <button 
                    onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                    className="text-[9px] text-rose-500 font-black uppercase bg-rose-50 px-3 py-1 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          
          {/* Visit Type Filter (IPD/OPD/ALL) - Styled like Front Desk */}
          <div className="flex items-center p-1 bg-secondary-theme rounded-xl border border-border-theme shadow-sm overflow-hidden h-full">
            {(['all', 'opd', 'ipd'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setVisitTypeFilter(type)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${visitTypeFilter === type
                  ? 'bg-primary-theme text-primary-theme-foreground shadow-md'
                  : 'text-muted hover:text-foreground'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-secondary-theme dark:bg-secondary-theme px-4 py-2 rounded-xl border border-border-theme dark:border-border-theme">
            <span className="text-xs font-bold text-muted dark:text-muted uppercase">Queue</span>
            <button
              onClick={handleToggleQueue}
              className={`relative w-12 h-6 rounded-full cursor-pointer ${showQueue ? 'bg-primary-theme' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full cursor-pointer ${showQueue ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[10px] font-black uppercase ${showQueue ? 'text-primary-theme' : 'text-muted'}`}>
              {showQueue ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Appointments List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-theme animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading appointments...</p>
          </div>
        ) : showQueue ? (
          queueAppointments.length > 0 ? (
            <div className="space-y-3">
              {/* Desktop Table Header (Visible on sm and up) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border-theme text-[10px] font-black text-muted uppercase tracking-widest">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3 lg:col-span-4">Patient Name & Type</div>
                <div className="col-span-3 text-center">MRN Number</div>
                <div className="col-span-2 text-center">Schedule</div>
                <div className="col-span-3 lg:col-span-2 text-right pr-6">Actions</div>
              </div>

              {sortedAppointments.map((apt, idx) => {
                // Calculate estimated wait time
                const estimatedWaitMinutes = idx * (consultationDuration || 15);
                const hours = Math.floor(estimatedWaitMinutes / 60);
                const minutes = estimatedWaitMinutes % 60;
                const waitTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                return (
                  <React.Fragment key={apt.id}>
                    {/* Desktop View Card (sm and up) */}
                    <div className="hidden sm:grid grid-cols-12 items-center gap-4 p-4 bg-secondary-theme dark:bg-secondary-theme rounded-xl hover:opacity-100 transition-all border border-transparent hover:border-primary-theme/20 hover:shadow-md group">
                      <div className="col-span-1 flex justify-center">
                        <div className="shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-primary-theme rounded-full flex items-center justify-center text-primary-theme-foreground font-black text-xs">
                          {idx + 1}
                        </div>
                      </div>
                      
                      <div className="col-span-3 lg:col-span-4 min-w-0">
                        <h4 className="font-bold text-foreground dark:text-foreground text-sm truncate">
                          {apt.patientName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] md:text-[11px]">
                          <span className="text-muted uppercase font-bold text-[9px] tracking-tighter bg-muted/10 px-1.5 rounded">{apt.type}</span>
                          {apt.type?.toLowerCase() === 'follow-up' && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-md tracking-wider uppercase">Follow-up</span>
                          )}
                          <span className="text-border-theme opacity-30">•</span>
                          <span className={`font-bold ${apt.status?.toLowerCase() === 'confirmed' ? 'text-green-600' :
                            apt.status?.toLowerCase() === 'booked' ? 'text-blue-600' : 'text-muted'
                            }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-3 flex flex-col items-center justify-center">
                        <div className="px-3 py-1 bg-primary-theme/5 border border-primary-theme/10 rounded-lg">
                          <p className="text-[11px] font-black text-primary-theme tracking-wider">{apt.mrn || 'N/A'}</p>
                        </div>
                        {idx > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <Clock size={10} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-orange-600">Wait: {waitTime}</span>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center pointer-events-none">
                        <p className="text-xs font-black text-foreground">{apt.time}</p>
                        <p className="text-[9px] text-muted font-bold mt-0.5 opacity-70">
                          {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "N/A"}
                        </p>
                      </div>

                      <div className="col-span-3 lg:col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentToDelete(apt.id);
                          }}
                          className="shrink-0 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Remove Appointment"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => router.push(`/doctor/prescription?appointmentId=${apt.id}`)}
                          className="shrink-0 px-3 lg:px-4 py-2 bg-primary-theme hover:opacity-90 text-primary-theme-foreground text-[10px] lg:text-xs font-black uppercase rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <CheckCircle2 size={14} /> Start
                        </button>
                      </div>
                    </div>

                    {/* Mobile Table Row (xs only) */}
                    <div className="sm:hidden flex flex-col gap-2 p-3 bg-secondary-theme rounded-xl border border-border-theme/50 relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="shrink-0 w-8 h-8 bg-primary-theme rounded-full flex items-center justify-center text-primary-theme-foreground font-black text-[11px]">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-foreground truncate">{apt.patientName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[9px]">
                              <span className="text-primary-theme font-black bg-primary-theme/10 px-1 rounded">{apt.mrn || 'NO MRN'}</span>
                              <span className="text-border-theme">•</span>
                              <span className="text-muted font-bold truncate max-w-[60px]">{apt.type}</span>
                              {apt.type?.toLowerCase() === 'follow-up' && (
                                <span className="px-1 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-md tracking-wider uppercase">Follow-up</span>
                              )}
                              <span className="text-border-theme">•</span>
                              <span className={`font-black uppercase tracking-wider ${apt.status?.toLowerCase() === 'confirmed' ? 'text-green-600' :
                                apt.status?.toLowerCase() === 'in-progress' ? 'text-blue-600' : 'text-muted'
                                }`}>
                                {apt.status || 'Pending'}
                              </span>
                            </div>
                            {idx > 0 && (
                               <div className="text-[9px] font-bold text-orange-600 flex items-center gap-1 mt-1 border border-orange-200 bg-orange-50 px-1.5 py-0.5 rounded-full w-max">
                                 <Clock size={10} /> Wait: {waitTime}
                               </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-black text-foreground">{apt.time}</p>
                          <p className="text-[9px] text-muted font-bold mt-0.5 truncate">
                            {apt.date ? new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "N/A"}
                          </p>
                          <p className="text-[9px] text-muted font-bold mt-0.5">~{consultationDuration || 15}m</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border-theme/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentToDelete(apt.id);
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/${user?.hospitalId || user?.hospital}/doctor/prescription?appointmentId=${apt.id}`)}
                          className="px-4 py-1.5 flex flex-1 max-w-[120px] items-center justify-center bg-primary-theme text-primary-theme-foreground text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm"
                        >
                          <CheckCircle2 size={12} className="mr-1" /> Start
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Total Estimated Time Card */}
              <div className="mt-4 p-4 bg-accent-theme dark:bg-accent-theme rounded-xl border border-border-theme">
                <div className="flex items-center justify-between">
                  <span className="text-sm max-sm:text-xs font-bold text-accent-theme-foreground">
                    Total Estimated Time
                  </span>
                  <span className="text-lg max-sm:text-sm font-black text-primary-theme">
                    {Math.floor((queueAppointments.length * (consultationDuration || 15)) / 60)}h {(queueAppointments.length * (consultationDuration || 15)) % 60}m
                  </span>
                </div>
                <p className="text-xs max-sm:text-[10px] text-accent-theme-foreground mt-1 opacity-80">
                  {queueAppointments.length} appointments × {consultationDuration || 15} min each
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-muted">No appointments in queue</p>
              <p className="text-xs text-muted mt-1">All caught up!</p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-theme dark:bg-secondary-theme rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted" />
            </div>
            <p className="text-sm font-bold text-muted dark:text-muted">Queue View Disabled</p>
            <p className="text-xs text-muted mt-1">Toggle ON to see patient queue and wait times</p>
            <div className="mt-4 text-4xl font-black text-border-theme">0</div>
            <p className="text-xs text-muted mt-1">Appointments visible</p>
          </div>
        )}
      </div>

      {appointmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-[1.5rem] p-6 shadow-2xl border border-border-theme animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-foreground mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 size={16} />
              </span>
              Remove Appointment
            </h3>
            <p className="text-sm text-muted font-medium mb-6 leading-relaxed">
              Are you sure you want to remove this appointment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAppointmentToDelete(null)} 
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-foreground bg-secondary-theme border border-border-theme hover:bg-muted/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 active:scale-95 transition-all"
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
