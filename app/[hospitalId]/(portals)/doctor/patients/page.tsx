'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Users, Filter, ArrowRight, Activity, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getDoctorPatientsAction } from '@/lib/integrations/actions/doctor.actions';
import { DoctorPatient } from '@/lib/integrations/types/doctor';
import { useTenantLink } from '@/hooks/useTenantLink';
import toast from 'react-hot-toast';

function PatientsPage() {
   const { getPath } = useTenantLink();
   const [patients, setPatients] = useState<DoctorPatient[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [sortBy, setSortBy] = useState('newest');
   const [patientTypeFilter, setPatientTypeFilter] = useState('all');
   const [pagination, setPagination] = useState({
      total: 0,
      totalPages: 0,
      limit: 10
   });

   // Debounce search query
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedSearch(searchQuery);
         setCurrentPage(1); // Reset to first page on search
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);

   const loadPatients = async () => {
      setIsLoading(true);
      const { success, data, pagination: pagData, error } = await getDoctorPatientsAction({
         page: currentPage,
         limit: 10,
         sort: sortBy,
         search: debouncedSearch,
         type: patientTypeFilter !== 'all' ? patientTypeFilter : undefined
      });

      if (success && data) {
         setPatients(data);
         if (pagData) {
            setPagination({
               total: pagData.total,
               totalPages: pagData.totalPages,
               limit: pagData.limit
            });
         }
      } else {
         toast.error(error || "Failed to load patients");
      }
      setIsLoading(false);
   };

   useEffect(() => {
      loadPatients();
   }, [currentPage, sortBy, debouncedSearch, patientTypeFilter]);

   const startIndex = (currentPage - 1) * pagination.limit + 1;
   const endIndex = Math.min(currentPage * pagination.limit, pagination.total);

   return (
      <div className="space-y-4 pt-2 pb-16">
         {/* Dynamic Header */}
         <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            
            {/* Top Row: Title, Pagination */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-1.5 md:p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                     <Users className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                        My Patients
                     </h1>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        Clinical Registry & Archives
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                  {/* Pagination Controls */}
                  {patients.length > 0 && (
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block px-1">
                           <span className="text-gray-900 dark:text-white">{startIndex}-{endIndex}</span> / {pagination.total}
                        </div>
                        <div className="flex items-center gap-1">
                           <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-indigo-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronLeft size={12} />
                           </button>
                           <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                              disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-indigo-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
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
                     placeholder="Search ID, Name or Mobile..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
               </div>

               {/* Filters Group */}
               <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <div className="relative w-full sm:w-32 group">
                     <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                     <select
                        className="w-full pl-7 pr-6 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                        value={sortBy}
                        onChange={(e) => {
                           setSortBy(e.target.value);
                           setCurrentPage(1);
                        }}
                     >
                        <option value="newest">Recent</option>
                        <option value="oldest">Historical</option>
                     </select>
                     <ChevronRight size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>

                  <div className="relative w-full sm:w-36 group">
                     <Activity size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                     <select
                        className="w-full pl-7 pr-6 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                        value={patientTypeFilter}
                        onChange={(e) => {
                           setPatientTypeFilter(e.target.value);
                           setCurrentPage(1);
                        }}
                     >
                        <option value="all">Global</option>
                        <option value="OPD">Outpatient</option>
                        <option value="IPD">Inpatient</option>
                     </select>
                     <ChevronRight size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>
               </div>
            </div>
         </div>

         {/* Patients List */}
         <div className="bg-card rounded-2xl sm:rounded-3xl shadow-sm border border-border-theme overflow-hidden min-h-[400px] transition-all">
            {isLoading ? (
               <div className="flex h-[400px] items-center justify-center bg-secondary-theme/10">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-10 h-10 border-2 border-primary-theme border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Syncing Clinical Data...</p>
                  </div>
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full text-left">
                        <thead className="bg-secondary-theme/50 border-b border-border-theme/50">
                           <tr>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Subject Identity</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap hidden sm:table-cell">Profiling</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Timeline</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] whitespace-nowrap">Flux Case</th>
                              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] text-right whitespace-nowrap">Navigate</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border-theme/30">
                           {patients.length > 0 ? (
                              patients.map((patient, idx) => (
                                 <tr key={`${patient.id}-${idx}`} className="hover:bg-secondary-theme/40 group transition-all duration-300">
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap">
                                       <div className="flex items-center gap-3 sm:gap-4">
                                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-base transition-all group-hover:scale-110 shadow-sm ${patient.patientType === 'IPD'
                                             ? 'bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30'
                                             : 'bg-emerald-50 text-emerald-500 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30'
                                             }`}>
                                             {patient.name.charAt(0)}
                                          </div>
                                          <div>
                                             <p className="font-black text-foreground text-xs sm:text-sm group-hover:text-primary-theme uppercase tracking-tight">{patient.name}</p>
                                             <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                                                <span className="text-[10px] text-muted font-bold uppercase tracking-tight px-1.5 py-0.5 bg-secondary-theme rounded-md">{patient.mrn || '---'}</span>
                                             </div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap hidden sm:table-cell">
                                       <div className="text-xs sm:text-sm text-foreground">
                                          <p className="font-black">{patient.age ? `${patient.age}Y` : '---'}</p>
                                          <p className="text-[10px] text-muted font-black uppercase tracking-widest">{patient.gender || '---'}</p>
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap text-[10px] sm:text-xs">
                                       <div className="flex items-center gap-2 text-muted font-black uppercase tracking-tight">
                                          <Calendar size={12} className="text-primary-theme/40" />
                                          {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A'}
                                       </div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 whitespace-nowrap">
                                       {(
                                          patient.patientType === 'IPD' ||
                                          (patient as any).isIPD === true ||
                                          (patient as any).isIpd === true
                                       ) ? (
                                          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 w-fit">
                                             <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> IP-CASE
                                          </span>
                                       ) : (
                                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2 w-fit">
                                             <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> OP-CASE
                                          </span>
                                       )}
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right whitespace-nowrap">
                                       <Link href={getPath(`/doctor/patients/${patient.id}`)} prefetch={true} className="inline-flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-secondary-theme text-foreground hover:bg-primary-theme hover:text-white transition-all transform group-hover:rotate-[-45deg] active:scale-90 border border-border-theme shadow-sm group-hover:shadow-lg group-hover:shadow-primary-theme/20">
                                          <ArrowRight size={16} className="sm:size-[18px]" />
                                       </Link>
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={5} className="px-6 py-20 text-center text-muted">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                       <div className="w-20 h-20 bg-secondary-theme rounded-full flex items-center justify-center text-muted/20">
                                          <User size={40} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-black uppercase tracking-widest">Clinical Archive Empty</p>
                                          <p className="text-[10px] font-bold uppercase tracking-tight mt-1">No matches found for current filters</p>
                                       </div>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
         </div>
      </div>
   );
}

export default React.memo(PatientsPage);
