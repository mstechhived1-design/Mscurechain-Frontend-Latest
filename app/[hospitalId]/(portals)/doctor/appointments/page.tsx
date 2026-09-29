'use client';

import React, { useState, useEffect } from 'react';
import {
   Calendar as CalendarIcon, Clock, Filter, Search,
   MoreVertical, X, ChevronLeft, ChevronRight, Activity, RefreshCw
} from 'lucide-react';
import { getAllAppointmentsAction } from '@/lib/integrations/actions/doctor.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch';
import { useAppointmentStore } from '@/stores/domainStores';

function DoctorAppointmentsPage() {
   const router = useRouter();
   const { getPath } = useTenantLink();
   const [appointments, setAppointments] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Filter States
   const [searchQuery, setSearchQuery] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [typeFilter, setTypeFilter] = useState('all');
   const [sortBy, setSortBy] = useState('newest');

   // Pagination State
   const [currentPage, setCurrentPage] = useState(1);
   const [pagination, setPagination] = useState({
      total: 0,
      totalPages: 0,
      limit: 10
   });

   // Details Modal State
   const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

   // Debounce search query
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedSearch(searchQuery);
         setCurrentPage(1); // Reset to first page on search
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);


   useEffect(() => {
      fetchAppointments();
   }, [currentPage, debouncedSearch, statusFilter, startDate, endDate, sortBy, typeFilter]);

   const fetchAppointments = async () => {
      setLoading(true);
      try {
         const res = await getAllAppointmentsAction({
            page: currentPage,
            limit: 10,
            search: debouncedSearch,
            status: statusFilter,
            startDate: startDate,
            endDate: endDate,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            sort: sortBy
         });

         if (res.success && res.data) {
            setAppointments(res.data);
            if (res.pagination) {
               setPagination({
                  total: res.pagination.total,
                  totalPages: res.pagination.totalPages,
                  limit: res.pagination.limit
               });
            }
         } else {
            toast.error('Failed to load appointments');
         }
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

   // ✅ REAL-TIME: Auto-refetch whenever an appointment SSE event arrives
   useRealtimeRefetch(useAppointmentStore, fetchAppointments);

   const startIndex = (currentPage - 1) * pagination.limit + 1;
   const endIndex = Math.min(currentPage * pagination.limit, pagination.total);

   const clearFilters = () => {
      setSearchQuery('');
      setStatusFilter('');
      setStartDate('');
      setEndDate('');
      setTypeFilter('all');
      setCurrentPage(1);
      setSortBy('newest');
   };

   return (
      <div className="space-y-2 sm:space-y-6">
         {/* Dynamic Header */}
         <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0">
            {/* Top Row: Title, Action Button, Pagination */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                     <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                        Appointments
                     </h1>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                        {pagination.total} Total Consultations
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                  {/* Refresh Button */}
                  <button
                     onClick={fetchAppointments}
                     className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0"
                     title="Refresh Data"
                  >
                     <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                  </button>

                  {/* Pagination */}
                  {pagination.total > 0 && (
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">
                           <span className="text-gray-900 dark:text-white">{startIndex}-{endIndex}</span> / {pagination.total}
                        </div>
                        <div className="flex items-center gap-1">
                           <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronLeft size={12} />
                           </button>
                           <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                              disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronRight size={12} />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Bottom Row: Control Center (Search, Filters) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3">
               
               {/* Search Bar */}
               <div className="relative flex-1 w-full min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search Patient or MRN..."
                     className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
               </div>

               {/* Filters Group */}
               <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
                  {/* Status Filter */}
                  <div className="relative shrink-0 w-full sm:w-auto">
                     <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                     <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto pl-7 pr-7 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                     >
                        <option value="">All Status</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="No Show">No Show</option>
                     </select>
                  </div>

                  {/* Date Range */}
                  <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                     <div className="relative flex-1 sm:w-32">
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <input
                           type="date"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           className="w-full pl-7 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-wider border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                           title="Start Date"
                        />
                     </div>
                     <span className="text-gray-400 font-bold text-[9px]">-</span>
                     <div className="relative flex-1 sm:w-32">
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <input
                           type="date"
                           value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           className="w-full pl-7 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-wider border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                           title="End Date"
                        />
                     </div>
                  </div>

                  {/* Type Filter */}
                  <div className="relative shrink-0 w-full sm:w-auto">
                     <Activity className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                     <select
                        value={typeFilter}
                        onChange={(e) => {
                           setTypeFilter(e.target.value);
                           setCurrentPage(1);
                        }}
                        className={`w-full sm:w-auto pl-7 pr-7 py-1.5 font-bold rounded-lg text-[9px] uppercase tracking-widest border outline-none focus:ring-1 appearance-none cursor-pointer transition-all ${typeFilter === 'all'
                           ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                           : typeFilter === 'IPD'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800 focus:ring-rose-500'
                              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 focus:ring-emerald-500'
                           }`}
                     >
                        <option value="all">All Dept</option>
                        <option value="OPD">OPD</option>
                        <option value="IPD">IPD</option>
                     </select>
                  </div>

                  {/* Clear Button */}
                  {(searchQuery || statusFilter || startDate || endDate || sortBy !== 'newest') && (
                     <button
                        onClick={clearFilters}
                        className="px-2 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 border border-red-100 dark:border-red-900/20 transition-all shrink-0"
                     >
                        <X size={12} /> Clear
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* Appointments List */}
         <div className="bg-white dark:bg-[#111] rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[400px] shadow-sm mx-1 sm:mx-0">
            {loading ? (
               <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : appointments.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-4 text-center">
                  <CalendarIcon size={40} className="mb-4 opacity-20" />
                  <p className="text-base font-bold text-gray-900 dark:text-white">No appointments found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                           <tr>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Time</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Patient Details</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Symptoms</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                              <th className="px-1.5 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                           {appointments.map((apt: any) => (
                              <tr key={apt.id || apt._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 group transition-colors">
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                       {!['completed', 'cancelled', 'no show', 'no-show', 'finished', 'rejected', 'in session', 'in-progress'].includes(apt.status?.toLowerCase()) ? (
                                          (() => {
                                             let targetTime = null;

                                             if (apt.date && apt.time) {
                                                try {
                                                   const d = new Date(apt.date);
                                                   const t = apt.time.match(/(\d+):(\d+) (AM|PM)/i);
                                                   if (t) {
                                                      let hours = parseInt(t[1]);
                                                      const mins = parseInt(t[2]);
                                                      const ampm = t[3].toUpperCase();
                                                      if (ampm === 'PM' && hours < 12) hours += 12;
                                                      if (ampm === 'AM' && hours === 12) hours = 0;
                                                      d.setHours(hours, mins, 0, 0);
                                                      targetTime = d;
                                                   }
                                                } catch (e) { }
                                             }

                                             if (!targetTime || isNaN(targetTime.getTime())) {
                                                return (
                                                   <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold text-xs">
                                                      <Clock size={14} className="text-gray-400" />
                                                      {apt.time}
                                                   </div>
                                                );
                                             }

                                             const diff = Math.floor((targetTime.getTime() - new Date().getTime()) / 60000);

                                             let label = '';
                                             let colorClass = '';

                                             if (diff > 0) {
                                                const timeStr = diff < 60 ? diff + 'm' : Math.floor(diff / 60) + 'h ' + (diff % 60) + 'm';
                                                label = `${timeStr}`;
                                                colorClass = 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
                                             } else {
                                                const absDiff = Math.abs(diff);
                                                const timeStr = absDiff < 60 ? absDiff + 'm' : Math.floor(absDiff / 60) + 'h ' + (absDiff % 60) + 'm';
                                                label = `-${timeStr}`;
                                                colorClass = 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
                                             }

                                             return (
                                                <span className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
                                                   <Clock size={10} /> {label}
                                                </span>
                                             );
                                          })()
                                       ) : (
                                          <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold text-xs">
                                             <Clock size={14} className="text-gray-400" />
                                             {apt.time}
                                          </div>
                                       )}
                                       {apt.date && (
                                          <span className="text-[9px] text-gray-400 font-medium sm:ml-5">
                                             {new Date(apt.date).toLocaleDateString()}
                                          </span>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-[10px] capitalize">
                                          {(apt.patientName || '?').charAt(0)}
                                       </div>
                                       <div>
                                          <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600">{apt.patientName}</p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                             <p className="text-[10px] text-gray-500 font-medium">{apt.patientId || apt.mrn}</p>
                                             <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${apt.patientType === 'IPD' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                                                {apt.patientType || 'OPD'}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                                    <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[150px] truncate block font-medium">
                                       {Array.isArray(apt.symptoms) && apt.symptoms.length > 0 ? apt.symptoms.join(', ') : (apt.symptoms || '-')}
                                    </span>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${apt.status?.toLowerCase() === 'scheduled' || apt.status?.toLowerCase() === 'booked' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800' :
                                       apt.status?.toLowerCase() === 'completed' || apt.status?.toLowerCase() === 'finished' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800' :
                                          apt.status?.toLowerCase() === 'cancelled' || apt.status?.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800' :
                                             'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                                       }`}>
                                       {apt.status}
                                    </span>
                                 </td>
                                 <td className="px-1.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                       <button
                                          onClick={() => {
                                             setSelectedAppointment(apt);
                                             setIsDetailsModalOpen(true);
                                          }}
                                          className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-black rounded-lg flex items-center gap-1 uppercase transition-colors"
                                          title="View Details"
                                       >
                                          <MoreVertical size={14} className="sm:hidden" />
                                          <span className="hidden sm:inline">Details</span>
                                       </button>

                                       {!['completed', 'cancelled', 'no show', 'finished', 'rejected'].includes(apt.status?.toLowerCase()) && (
                                          <button
                                             onClick={() => router.push(getPath(`/doctor/prescription?appointmentId=${apt.id || apt._id}`))}
                                             className="px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-black rounded-lg shadow-md shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
                                          >
                                             Start
                                          </button>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Pagination logic removed from bottom */}
               </>
            )}
         </div>

         {/* Appointment Details Modal */}
         {isDetailsModalOpen && selectedAppointment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsDetailsModalOpen(false)}
               ></div>
               <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>

                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appointment Details</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Summary of the completed consultation.</p>
                     </div>
                     <button
                        onClick={() => setIsDetailsModalOpen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="space-y-6">
                     {/* Patient Info Card */}
                     <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-lg">
                              {(selectedAppointment.patientName || '?').charAt(0)}
                           </div>
                           <div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{selectedAppointment.patientName}</div>
                              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">MRN: {selectedAppointment.patient?.mrn || selectedAppointment.mrn || 'N/A'}</div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                           <div className="space-y-1">
                              <div className="text-gray-500">Age</div>
                              <div className="font-semibold text-gray-900 dark:text-white">{selectedAppointment.patient?.age || 'N/A'} Years</div>
                           </div>
                           <div className="space-y-1">
                              <div className="text-gray-500">Gender</div>
                              <div className="font-semibold text-gray-900 dark:text-white capitalize">{selectedAppointment.patient?.gender || 'Unknown'}</div>
                           </div>
                        </div>
                     </div>

                     {/* Vital Signs (if available) */}
                     {selectedAppointment.vitals && (
                        <div className="space-y-3">
                           <div className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                              <Activity size={14} className="text-rose-500" /> Patient Vitals
                           </div>
                           <div className="grid grid-cols-4 gap-2">
                              <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-xl border border-rose-100 dark:border-rose-900/20 text-center">
                                 <div className="text-[8px] font-bold text-rose-600 uppercase">BP</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.bloodPressure || selectedAppointment.vitals.bp || '--'}</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-blue-900/20 text-center">
                                 <div className="text-[8px] font-bold text-blue-600 uppercase">Pulse</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.pulse || '--'}</div>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20 text-center">
                                 <div className="text-[8px] font-bold text-amber-600 uppercase">Temp</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.temperature || '--'}°F</div>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                                 <div className="text-[8px] font-bold text-emerald-600 uppercase">SpO2</div>
                                 <div className="text-xs font-black text-gray-900 dark:text-white">{selectedAppointment.vitals.spO2 || selectedAppointment.vitals.spo2 || '--'}%</div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Consultation Time Info */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                           <div className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-bold mb-1">Scheduled At</div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <Clock size={14} className="text-green-500" />
                              {selectedAppointment.time || 'N/A'}
                           </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                           <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Appointment Date</div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <CalendarIcon size={14} className="text-gray-400" />
                              {selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString() : 'N/A'}
                           </div>
                        </div>
                     </div>

                     {/* Symptoms & Diagnosis Summary */}
                     <div className="space-y-4">
                        <div>
                           <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Activity size={16} className="text-blue-500" /> Symptoms
                           </div>
                           <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 max-h-24 overflow-y-auto">
                              {Array.isArray(selectedAppointment.symptoms) && selectedAppointment.symptoms.length > 0
                                 ? selectedAppointment.symptoms.join(', ')
                                 : (selectedAppointment.symptoms || 'No symptoms recorded.')}
                           </div>
                        </div>

                        {selectedAppointment.diagnosis && (
                           <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 border-l-2 border-green-500 pl-2">Diagnosis</div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic pr-2">
                                 {selectedAppointment.diagnosis}
                              </p>
                           </div>
                        )}
                     </div>

                     <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <button
                           onClick={() => setIsDetailsModalOpen(false)}
                           className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl text-sm active:scale-95 shadow-lg shadow-gray-900/10"
                        >
                           Close Details
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

export default React.memo(DoctorAppointmentsPage);
