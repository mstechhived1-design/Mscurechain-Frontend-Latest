"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Clock, User, AlertCircle, Loader2, Timer, Pause, Activity, ArrowLeft, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { useTenantLink } from '@/hooks/useTenantLink';

export default function PausedAppointmentsPage() {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const [loading, setLoading] = useState(true);
  const [pausedAppointments, setPausedAppointments] = useState<any[]>([]);
  const [resuming, setResuming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchPausedAppointments();
  }, []);

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPausedAppointments = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPausedAppointments();
      setPausedAppointments(data.appointments || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load paused appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeConsultation = async (appointmentId: string) => {
    try {
      setResuming(appointmentId);
      await doctorService.resumeConsultation(appointmentId);
      toast.success('Consultation resumed successfully!');
      router.push(getPath(`/doctor/prescription?appointmentId=${appointmentId}`));
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume consultation');
      setResuming(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(appointmentId);
      await doctorService.deleteAppointment(appointmentId);
      toast.success('Appointment deleted successfully');
      setPausedAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete appointment');
    } finally {
      setDeleting(null);
    }
  };

  const formatPausedDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formatElapsedTime = (pausedAt: string, consultationStartTime: string) => {
    const paused = new Date(pausedAt).getTime();
    const started = new Date(consultationStartTime).getTime();
    const elapsed = Math.floor((paused - started) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter Logic
  const filteredAppointments = pausedAppointments.filter(apt => {
    const pName = (apt.patient?.name || '').toLowerCase();
    const pMrn = (apt.patient?.mrn || apt.mrn || '').toLowerCase();
    const search = debouncedSearch.toLowerCase();
    return pName.includes(search) || pMrn.includes(search);
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedData = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin"></div>
            <Pause className="absolute inset-0 m-auto text-primary-theme animate-pulse" size={24} />
          </div>
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] animate-pulse">Syncing Paused Sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4 pb-10">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden mb-4">
         <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
         
         {/* Top Row: Title, Action Button, Pagination */}
         <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
            <div className="flex items-center gap-3 shrink-0">
               <button onClick={() => router.back()} className="p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700 shrink-0">
                  <ArrowLeft size={16} />
               </button>
               <div className="p-1.5 md:p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                  <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                     Paused Sessions
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                     {pausedAppointments.length} Clinically Pended Node{pausedAppointments.length !== 1 ? 's' : ''}
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
               {/* Pagination Controls */}
               {totalPages > 0 && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                     <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block px-1">
                        <span className="text-gray-900 dark:text-white">Page {currentPage}</span> / {totalPages}
                     </div>
                     <div className="flex items-center gap-1">
                        <button
                           onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                           disabled={currentPage === 1}
                           className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-amber-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                        >
                           <ChevronLeft size={12} />
                        </button>
                        <button
                           onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                           disabled={currentPage === totalPages}
                           className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-amber-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                        >
                           <ChevronRight size={12} />
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Bottom Row: Control Center (Search, Filters) */}
         <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3 relative z-10">
            {/* Search Bar */}
            <div className="relative flex-1 w-full min-w-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
               <input
                  type="text"
                  placeholder="Search Patient or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
               />
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">

        {/* Desktop View: Enhanced Table */}
        <div className="bg-white border border-border-theme rounded-xl overflow-hidden shadow-sm mx-1 sm:mx-0">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-border-theme/60">
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest w-12 italic">Idx</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Patient Node</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-center">Duration</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-center">Pended At</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/30">
                {paginatedData.length > 0 ? (
                  paginatedData.map((appointment, index) => (
                    <tr key={appointment._id} className="hover:bg-slate-50 transition-colors group text-[11px] sm:text-xs">
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black text-muted/40 italic">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center border border-border-theme shadow-sm">
                            <User size={16} className="text-primary-theme" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground uppercase tracking-tight group-hover:text-primary-theme">
                              {appointment.patient?.name || 'Unknown'}
                            </p>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] mt-0.5 opacity-60">
                              MRN: {appointment.patient?.mrn || appointment.mrn || 'N/A'}
                            </p>
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                              Appt: {appointment.date ? new Date(appointment.date).toLocaleDateString('en-GB') : 'N/A'} at {appointment.appointmentTime || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                          <Timer size={12} className="text-blue-600" />
                          <span className="text-[11px] font-bold text-blue-600 tabular-nums">
                            {appointment.consultationStartTime && appointment.pausedAt
                              ? formatElapsedTime(appointment.pausedAt, appointment.consultationStartTime)
                              : '0:00'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                          <Clock size={12} className="text-amber-600" />
                          <span className="text-[11px] font-bold text-amber-600">
                            {formatPausedDuration(Math.floor((Date.now() - new Date(appointment.pausedAt).getTime()) / 1000))}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResumeConsultation(appointment._id)}
                            disabled={resuming === appointment._id || deleting === appointment._id}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-600/10"
                          >
                            {resuming === appointment._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} fill="currentColor" />
                            )}
                            Resume
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(appointment._id)}
                            disabled={resuming === appointment._id || deleting === appointment._id}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                            title="Abort"
                          >
                            {deleting === appointment._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <div className="w-20 h-20 bg-secondary-theme rounded-[2.5rem] flex items-center justify-center mb-6 opacity-40">
                          <Activity size={32} className="text-muted" />
                        </div>
                        <p className="text-sm font-black text-foreground uppercase tracking-[0.2em] mb-2 italic">Null Session State</p>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">No clinically pended nodes match your query.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
