import React from 'react';
import { Download, Eye, CheckCircle2 } from 'lucide-react';
import { getDoctorReportsAction } from '@/lib/integrations';

export default async function DoctorReportsPage() {
  const { data: reports } = await getDoctorReportsAction();

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 pt-4 sm:pt-8 px-3 sm:px-6">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden mb-4">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
         
         {/* Top Row: Title */}
         <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
            <div className="flex items-center gap-3 shrink-0">
               <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                     Lab Reports
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                     Review diagnostic results and patient files
                  </p>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
         {/* Desktop View Table */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Test Name</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {reports?.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 group transition-colors">
                        <td className="px-6 py-5">
                           {report.status === 'Ready' ? (
                              <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                 <CheckCircle2 size={14} /> Ready
                              </div>
                           ) : (
                              <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest">
                                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> Generating
                              </div>
                           )}
                        </td>
                        <td className="px-6 py-5 font-bold text-sm text-gray-900 dark:text-white">
                           {report.testName}
                        </td>
                        <td className="px-6 py-5">
                           <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{report.patientName}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{report.patientId}</p>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                           {report.date}
                        </td>
                        <td className="px-6 py-5">
                           <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                              report.priority === 'Urgent' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10' 
                              : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800'
                           }`}>
                              {report.priority}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <div className="flex justify-end gap-1">
                              <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl text-blue-500 transition-colors" title="View">
                                 <Eye size={18} />
                              </button>
                              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Download">
                                 <Download size={18} />
                              </button>
                           </div>
                        </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Mobile View Cards */}
         <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {reports?.map((report) => (
               <div key={report.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                     <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                           {report.testName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                              {report.patientName}
                           </span>
                           <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              {report.patientId}
                           </span>
                        </div>
                     </div>
                     <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                        report.priority === 'Urgent' 
                        ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10' 
                        : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800'
                     }`}>
                        {report.priority}
                     </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                     <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                           {report.date}
                        </div>
                        {report.status === 'Ready' ? (
                           <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase tracking-widest">
                              <CheckCircle2 size={12} /> Ready
                           </div>
                        ) : (
                           <div className="flex items-center gap-1.5 text-amber-500 font-black text-[9px] uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Generating
                           </div>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                        <button className="p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-blue-500 transition-colors">
                           <Eye size={16} />
                        </button>
                        <button className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                           <Download size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
