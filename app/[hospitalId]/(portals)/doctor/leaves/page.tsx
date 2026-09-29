"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Filter,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  CalendarDays,
  History,
  X,
  Phone,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLeaves, useLeaveBalance, useDeleteLeave } from "@/lib/integrations/hooks/useStaffQueries";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Approved" },
  rejected: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Declined" },
  cancelled: { icon: AlertTriangle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100", label: "Withdrawn" }
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  annual: "Annual Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  emergency: "Emergency Leave",
  other: "Other"
};

function DoctorLeaves() {
  const queryClient = useQueryClient();
  const { data: leavesRes, isLoading: loading, refetch } = useLeaves();
  const { data: balanceRes } = useLeaveBalance();
  const deleteLeaveMutation = useDeleteLeave();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const leaves = leavesRes?.leaves || [];
  const balance = balanceRes?.balance || (balanceRes as any) || {};

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave: any) => {
      const reason = (leave.reason || "").toLowerCase();
      const type = (leave.leaveType || "").toLowerCase();
      const label = (LEAVE_TYPE_LABELS[leave.leaveType] || "").toLowerCase();
      const id = (leave._id || "").toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesSearch = reason.includes(search) || type.includes(search) || label.includes(search) || id.includes(search);
      const matchesStatus = statusFilter === "all" || leave.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchQuery, statusFilter]);

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const refreshData = () => {
    toast.promise(Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['staff', 'leave-balance'] })]), {
      loading: 'Updating records...',
      success: 'Records refreshed',
      error: 'Failed to update'
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to withdraw this leave request?")) return;
    
    try {
      await deleteLeaveMutation.mutateAsync(id);
      toast.success("Request withdrawn successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw request");
    }
  };

  const openViewModal = (leave: any) => {
    setSelectedLeave(leave);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Leave Records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 pb-10">
      {/* Ultra Compact Dynamic Header */}
      <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden z-20">
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
        </div>
        
        {/* Top Row: Title, Inline Stats, Actions */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 xl:gap-4 w-full relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full xl:w-auto">
            {/* Title Block */}
            <div className="flex items-center gap-3 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-800 pb-3 sm:pb-0 sm:pr-6">
              <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                  Leave Management
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Manage absences
                </p>
              </div>
            </div>

            {/* Compact Inline Stats */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Balance</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{balance.totalQuota || 30}</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30 shrink-0 shadow-sm">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Approved</span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{leaves.filter((l: any) => l.status === 'approved').length}</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/30 shrink-0 shadow-sm">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Pending</span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">{leaves.filter((l: any) => l.status === 'pending').length}</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/30 shrink-0 shadow-sm">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Total</span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400">{leaves.length}</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
            <button 
              onClick={refreshData}
              title="Refresh Data"
              className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 text-gray-500 hover:text-emerald-600 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95"
            >
              <RefreshCcw size={14} />
            </button>
            <a 
              href="/doctor/leave"
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm shadow-emerald-500/20 active:scale-95 group"
            >
              <Plus size={12} className="group-hover:rotate-90 transition-transform" /> 
              New Request
            </a>
          </div>
        </div>
      </div>

      {/* Main Content: Leave Log */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
         {/* Dynamic Header */}
         <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 border-b border-gray-50 dark:border-gray-800 relative z-10">
            {/* Top Row: Title, Action Button, Pagination */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                     <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                        Leave History
                     </h3>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:block">
                        Review and manage your absence requests
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                  {/* Pagination */}
                  {totalPages > 0 && (
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block px-1">
                           <span className="text-gray-900 dark:text-white">Page {currentPage}</span> / {totalPages}
                        </div>
                        <div className="flex items-center gap-1">
                           <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-emerald-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronLeft size={12} />
                           </button>
                           <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-emerald-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
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
               
               {/* Filter Tabs */}
               <div className="flex items-center gap-1 w-full lg:w-auto overflow-x-auto no-scrollbar shrink-0 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  {['all', 'pending', 'approved', 'rejected'].map((status) => (
                     <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                           statusFilter === status 
                           ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' 
                           : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                     >
                        {status}
                     </button>
                  ))}
               </div>

               {/* Search Bar */}
               <div className="relative flex-1 w-full min-w-0 lg:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                  <input
                     type="text"
                     placeholder="Search logs..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
               </div>
            </div>
         </div>

         {/* Desktop View Table */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Range</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">Reason</th>
                     <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {paginatedLeaves.length > 0 ? paginatedLeaves.map((leave: any) => {
                     const config = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                     const StatusIcon = config.icon;
                     
                     return (
                        <tr key={leave._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 group transition-colors">
                           <td className="px-6 py-5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                 {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </span>
                                 <span className="text-[9px] font-black text-gray-400 uppercase mt-1 flex items-center gap-1">
                                    <CalendarDays size={10} /> {new Date(leave.createdAt).toLocaleDateString()}
                                 </span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-center">
                              <span className="inline-block px-2.5 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                                 {leave.duration || 0}
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color} border ${config.border} dark:bg-transparent`}>
                                 <StatusIcon size={10} />
                                 {config.label}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 line-clamp-1 italic">"{leave.reason}"</p>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <button 
                                   onClick={() => openViewModal(leave)}
                                   className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 rounded-xl transition-colors"
                                 >
                                    <Eye size={16} />
                                 </button>
                                 {leave.status === 'pending' && (
                                    <button 
                                      onClick={() => handleDelete(leave._id)}
                                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-600 rounded-xl transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     );
                  }) : (
                     <tr>
                        <td colSpan={6} className="py-20 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">No records found</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Mobile View Cards */}
         <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {paginatedLeaves.length > 0 ? paginatedLeaves.map((leave: any) => {
               const config = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
               const StatusIcon = config.icon;
               
               return (
                  <div key={leave._id} className="p-4 space-y-4">
                     <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                              {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                           </span>
                           <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                           </span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${config.bg} ${config.color} border ${config.border} dark:bg-transparent`}>
                           <StatusIcon size={10} />
                           {config.label}
                        </div>
                     </div>
                     
                     <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 italic line-clamp-2">"{leave.reason}"</p>
                     
                     <div className="flex items-center justify-between pt-2">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                           {leave.duration} Day(s) 
                        </span>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => openViewModal(leave)}
                             className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase tracking-widest rounded-lg border border-gray-100 dark:border-gray-700"
                           >
                              Details
                           </button>
                           {leave.status === 'pending' && (
                              <button 
                                onClick={() => handleDelete(leave._id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors"
                              >
                                 <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                     </div>
                  </div>
               );
            }) : (
               <div className="py-20 text-center">
                  <Calendar size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching records</p>
               </div>
            )}
         </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md transition-all">
           <div 
             className="absolute inset-0" 
             onClick={() => setIsViewModalOpen(false)}
           ></div>
           <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative z-10 overflow-hidden">
              <div className="h-1.5 bg-emerald-600 w-full"></div>
              
              <div className="p-6 sm:p-8">
                 <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <div>
                       <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.bg} ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.color} border ${STATUS_CONFIG[selectedLeave.status as keyof typeof STATUS_CONFIG]?.border} mb-2 inline-block`}>
                          {selectedLeave.status}
                       </span>
                       <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Leave Summary</h2>
                       <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">ID: {selectedLeave._id}</p>
                    </div>
                    <button 
                      onClick={() => setIsViewModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
                    >
                       <X size={18} />
                    </button>
                 </div>

                 <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                       <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Leave Type</p>
                          <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase">{LEAVE_TYPE_LABELS[selectedLeave.leaveType] || selectedLeave.leaveType}</p>
                       </div>
                       <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                          <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">{selectedLeave.duration} Day(s)</p>
                       </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Leave Interval</p>
                       <div className="flex items-center gap-4">
                          <div className="flex-1">
                             <p className="text-[8px] text-gray-400 font-black uppercase mb-0.5">Start Date</p>
                             <p className="text-[11px] sm:text-xs font-black dark:text-white uppercase">{new Date(selectedLeave.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                          </div>
                          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                          <div className="flex-1">
                             <p className="text-[8px] text-gray-400 font-black uppercase mb-0.5 text-right">End Date</p>
                             <p className="text-[11px] sm:text-xs font-black dark:text-white text-right uppercase">{new Date(selectedLeave.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                          </div>
                       </div>
                    </div>

                    <div>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <FileText size={10} className="text-emerald-500" /> Reason
                       </p>
                       <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 italic text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-bold">
                          "{selectedLeave.reason}"
                       </div>
                    </div>

                    {selectedLeave.emergencyContact && (
                       <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Emergency Contact Info</p>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-[10px] font-black uppercase tracking-widest">
                             <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <User size={14} className="text-blue-500" /> {selectedLeave.emergencyContact.name}
                             </div>
                             <div className="flex items-center gap-2 text-emerald-600">
                                <Phone size={14} /> {selectedLeave.emergencyContact.mobile}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="mt-8 flex gap-3">
                    <button 
                      onClick={() => setIsViewModalOpen(false)}
                      className="flex-1 py-3.5 sm:py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl hover:opacity-90 transition-all active:scale-95"
                    >
                       Close View
                    </button>
                    {selectedLeave.status === 'pending' && (
                       <button 
                          onClick={() => {
                             setIsViewModalOpen(false);
                             handleDelete(selectedLeave._id);
                          }}
                          className="px-5 sm:px-6 py-3.5 sm:py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl transition-colors"
                       >
                          <Trash2 size={18} />
                       </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-6 border-t border-gray-50 dark:border-gray-800/50">
         <AlertCircle size={14} className="text-amber-500 shrink-0" />
         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Note: Emergency leave requests are escalated automatically to hospital administration.
         </p>
      </div>
    </div>
  );
}

export default React.memo(DoctorLeaves);
