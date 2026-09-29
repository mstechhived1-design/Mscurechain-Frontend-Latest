"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from "@/lib/integrations";
import {
   CheckCircle2,
   XCircle,
   AlertCircle,
   User,
   Search,
   CheckCircle,
   ClipboardList,
   ChevronLeft,
   ChevronRight,
   History,
   Send
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/stores/authStore";
import { useRequestLeaveAdmin, useUpdateLeaveStatusAdmin } from '@/lib/integrations/hooks';
import { TableSkeleton } from '@/components/admin/Skeletons';

const STATUS_CONFIG = {
   pending: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Pending" },
   approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Approved" },
   rejected: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Rejected" },
   cancelled: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-100", label: "Cancelled" }
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

const ITEMS_PER_PAGE = 10;

// ============================================================================
// PERFORMANCE: Memoized Leave Row
// ============================================================================
const LeaveRow = React.memo(({
   leave,
   onStatusUpdate,
   processingId,
   currentUserId
}: {
   leave: any;
   onStatusUpdate: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
   processingId: string | null;
   currentUserId: string;
}) => {
   const isPending = leave.status === 'pending';
   const isProcessing = processingId === leave._id;
   const statusConfig = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
   const StatusIcon = statusConfig.icon;

   const isOwnLeave = leave.requester?._id === currentUserId || leave.requester === currentUserId;

   return (
      <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 group">
         <td className="py-5 px-3 md:px-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500/10 to-blue-600/10 flex items-center justify-center text-blue-600 font-black text-sm">
                  {(leave.requester?.name || leave.applicant?.name || "A")?.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                     {leave.requester?.name || leave.applicant?.name || "Anonymous User"} {isOwnLeave && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">YOU</span>}
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {leave.requester?.role?.replace('-', ' ') || 'Staff Member'}
                  </p>
               </div>
            </div>
         </td>
         <td className="py-5 px-3 md:px-6">
            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">
               {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
            </p>
         </td>
         <td className="py-5 px-3 md:px-6">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
               </span>
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {leave.numberOfDays || (Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} Days
               </span>
            </div>
         </td>
         <td className="py-5 px-3 md:px-6 max-w-xs">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 italic line-clamp-1 truncate">
               "{leave.reason}"
            </p>
         </td>
         <td className="py-5 px-3 md:px-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
               <StatusIcon size={12} />
               {statusConfig.label}
            </div>
         </td>
         <td className="py-5 px-3 md:px-6 text-right">
            {isPending && !isOwnLeave ? (
               <div className="flex justify-end gap-2">
                  <button
                     onClick={() => onStatusUpdate(leave._id, 'approved')}
                     disabled={isProcessing}
                     className="px-4 py-2 bg-emerald-600/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-all active:scale-95"
                  >
                     Approve
                  </button>
                  <button
                     onClick={() => {
                        const reason = prompt("Enter reason for rejection:");
                        if (reason) onStatusUpdate(leave._id, 'rejected', reason);
                     }}
                     disabled={isProcessing}
                     className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white disabled:opacity-50 transition-all active:scale-95"
                  >
                     Reject
                  </button>
               </div>
            ) : isPending && isOwnLeave ? (
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">
                  Your Request (Pending Review)
               </span>
            ) : (
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Logged: {new Date(leave.createdAt).toLocaleDateString()}
               </span>
            )}
         </td>
      </tr>
   );
});

LeaveRow.displayName = 'LeaveRow';

export default function HospitalAdminLeaves() {
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
   const [filterRole, setFilterRole] = useState("all");
   const [searchTerm, setSearchTerm] = useState("");
   const debouncedSearch = useDebounce(searchTerm, 300);
   const [processingId, setProcessingId] = useState<string | null>(null);
   const [page, setPage] = useState(1);
   const [showRequestModal, setShowRequestModal] = useState(false);

   const authUser = useAuthStore((state) => state.user) as any;
   const currentUserId = authUser?.id || authUser?._id;

   const { data: leavesResponse, isLoading: loading } = useQuery<any>({
      queryKey: ['hospital-admin', 'leaves'],
      queryFn: async () => {
         try {
            return await adminService.getLeavesClient();
         } catch (error) {
            console.error("Failed to fetch leave requests:", error);
            toast.error("Failed to load leave requests");
            throw error;
         }
      },
      staleTime: 30000,
      placeholderData: (previousData: any) => previousData,
      refetchInterval: 15000,
   });

   const leaves = Array.isArray(leavesResponse) ? leavesResponse : (leavesResponse?.leaves || []);
   const updateStatusMutation = useUpdateLeaveStatusAdmin();
   const requestLeaveMutation = useRequestLeaveAdmin();

   // Socket Integration
   useEffect(() => {
      let isMounted = true;
      const initSocketSync = async () => {
         const { getSocket, joinSocketRoom } = await import('@/lib/integrations/api/socket');
         const socket = await getSocket();
         if (socket && isMounted) {
            if (currentUserId) {
               joinSocketRoom({
                  userId: currentUserId,
                  role: 'hospital-admin',
                  hospitalId: authUser?.hospital || authUser?.hospitalId
               });

               socket.on('leave:new', (data: any) => {
                  queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'leaves'] });
                  toast.success("New leave request received");
               });

               socket.on('leave:status_change', (data: any) => {
                  queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'leaves'] });
                  toast.success(`Leave request status updated: ${data.leave.status}`);
               });
            }
         }
      };

      initSocketSync();
      return () => {
         isMounted = false;
         import('@/lib/integrations/api/socket').then(({ getSocket }) => {
            getSocket().then(socket => {
               if (socket) {
                  socket.off('leave:new');
                  socket.off('leave:status_change');
               }
            });
         });
      };
   }, [queryClient, currentUserId, authUser]);

   const handleStatusUpdate = async (leaveId: string, status: 'approved' | 'rejected', reason?: string) => {
      setProcessingId(leaveId);
      try {
         await updateStatusMutation.mutateAsync({ id: leaveId, data: { status, rejectionReason: reason } });
         toast.success(`Leave request ${status} successfully`);
      } catch (error: any) {
         console.error("Failed to update leave status:", error);
         toast.error(error.message || "Failed to update leave status");
      } finally {
         setProcessingId(null);
      }
   };

   const [selfRequestData, setSelfRequestData] = useState({
      startDate: '',
      endDate: '',
      leaveType: 'sick',
      reason: ''
   });

   const handleSelfRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         await requestLeaveMutation.mutateAsync(selfRequestData);
         toast.success("Personal leave request created");
         setShowRequestModal(false);
         setSelfRequestData({ startDate: '', endDate: '', leaveType: 'sick', reason: '' });
      } catch (error: any) {
         toast.error(error.message || "Failed to submit leave request");
      }
   };

   const filteredLeaves = useMemo(() => {
      return (leaves || []).filter((leave: any) => {
         const matchesTab = activeTab === 'active'
            ? leave.status === 'pending'
            : ['approved', 'rejected', 'cancelled'].includes(leave.status);

         const role = leave.requester?.role || leave.applicant?.type;
         const matchesRole = filterRole === "all" || role === filterRole;

         const name = (leave.requester?.name || leave.applicant?.name || "").toLowerCase();
         const matchesSearch = !debouncedSearch || name.includes(debouncedSearch.toLowerCase());

         return matchesTab && matchesRole && matchesSearch;
      });
   }, [leaves, activeTab, filterRole, debouncedSearch]);

   const paginatedLeaves = useMemo(() => {
      const start = (page - 1) * ITEMS_PER_PAGE;
      return filteredLeaves.slice(start, start + ITEMS_PER_PAGE);
   }, [filteredLeaves, page]);

   const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE);

   useEffect(() => {
      setPage(1);
   }, [activeTab, filterRole, debouncedSearch]);

   const stats = useMemo(() => {
      return {
         total: leaves.length,
         pending: leaves.filter((l: any) => l.status === 'pending').length,
         approved: leaves.filter((l: any) => l.status === 'approved').length,
         rejected: leaves.filter((l: any) => l.status === 'rejected').length
      };
   }, [leaves]);

   return (
      <div className="space-y-8 pb-12 bg-gray-50 min-h-screen">
         {/* Dynamic Header with Advanced Filters */}
         <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0">
            {/* Top Row: Identification & Stats */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
               {/* Heading */}
               <div className="shrink-0 flex items-center gap-2 px-1">
                  <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
                     <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                        Leave Management
                     </h1>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                        Total Requests: {leaves.length}
                     </p>
                  </div>
               </div>

               {/* Miniature Stats Row */}
               <div className="w-full xl:w-auto flex flex-1 flex-wrap sm:flex-nowrap items-stretch sm:items-center justify-start xl:justify-end gap-2 shrink-0">
                  {[
                     { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', border: 'border-indigo-100' },
                     { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'text-amber-600', border: 'border-amber-100' },
                     { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', border: 'border-emerald-100' },
                     { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-rose-600', border: 'border-rose-100' }
                  ].map((stat, i) => (
                     <div key={i} className={`flex-1 sm:flex-none flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border ${stat.border} shadow-sm min-w-[100px] justify-center sm:justify-start`}>
                        <stat.icon className={`w-3.5 h-3.5 ${stat.color} shrink-0`} />
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none truncate">{stat.label}</span>
                           <span className={`text-xs font-black ${stat.color} leading-none mt-0.5`}>{stat.value}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Bottom Row: Control Center (Tabs & Filters) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
               {/* Navigation Tabs */}
               <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200 shrink-0">
                  <button
                     onClick={() => setActiveTab('active')}
                     className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-600'}`}
                  >
                     <AlertCircle size={14} className="shrink-0" /> <span className="truncate">Active ({stats.pending})</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('history')}
                     className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-600'}`}
                  >
                     <History size={14} className="shrink-0" /> <span className="truncate">History ({stats.total - stats.pending})</span>
                  </button>
               </div>

               {/* Filters & Pagination */}
               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
                  {/* Search Bar - Takes remaining width */}
                  <div className="relative flex-1">
                     <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                     />
                  </div>
                  
                  {/* Role Dropdown */}
                  <div className="relative shrink-0 sm:w-32">
                     <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                     >
                        <option value="all">All Roles</option>
                        <option value="doctor">Doctors</option>
                        <option value="nurse">Nurses</option>
                        <option value="staff">Staff</option>
                        <option value="hr">HR</option>
                     </select>
                  </div>

                  {/* Header Pagination */}
                  <div className="flex items-center gap-2 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200">
                     <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
                     >
                        <ChevronLeft size={16} />
                     </button>
                     <span className="text-[10px] font-black tracking-widest text-gray-400 px-1">
                        {page} / {totalPages || 1}
                     </span>
                     <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
                     >
                        <ChevronRight size={16} />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Tabular Registry */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
               <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-3 md:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Name</th>
                        <th className="py-4 px-3 md:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Leave Type</th>
                        <th className="py-4 px-3 md:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Leave Dates</th>
                        <th className="py-4 px-3 md:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                        <th className="py-4 px-3 md:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="py-4 px-3 md:px-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Applied On</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading && !leaves.length ? (
                        <tr className="bg-white">
                           <td colSpan={6} className="p-0">
                              <TableSkeleton rows={8} />
                           </td>
                        </tr>
                     ) : paginatedLeaves.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="py-32 text-center text-gray-400">
                              <div className="flex flex-col items-center gap-4">
                                 <ClipboardList size={48} className="opacity-20" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">No leave requests found</p>
                              </div>
                           </td>
                        </tr>
                     ) : (
                        paginatedLeaves.map((leave: any) => (
                           <LeaveRow
                              key={leave._id}
                              leave={leave}
                              onStatusUpdate={handleStatusUpdate}
                              processingId={processingId}
                              currentUserId={currentUserId}
                           />
                        ))
                     )}
                  </tbody>
               </table></div>
            </div>
         </div>

         {/* Self Request Modal */}
         {showRequestModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
               <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
                  <div className="p-4 md:p-8 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30 shrink-0">
                     <div>
                        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 uppercase">Personal Leave Request</h2>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 md:mt-1">Submit your own leave request</p>
                     </div>
                     <button onClick={() => setShowRequestModal(false)} className="p-1.5 md:p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 shrink-0">
                        <XCircle size={24} />
                     </button>
                  </div>
                  <form onSubmit={handleSelfRequest} className="p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                            <input
                               type="date"
                               required
                               value={selfRequestData.startDate}
                               onChange={e => setSelfRequestData(prev => ({ ...prev, startDate: e.target.value }))}
                               className="w-full px-4 md:px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all font-mono"
                            />
                         </div>
                         <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                            <input
                               type="date"
                               required
                               value={selfRequestData.endDate}
                               onChange={e => setSelfRequestData(prev => ({ ...prev, endDate: e.target.value }))}
                               className="w-full px-4 md:px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all font-mono"
                            />
                         </div>
                     </div>

                     <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</label>
                        <select
                           value={selfRequestData.leaveType}
                           onChange={e => setSelfRequestData(prev => ({ ...prev, leaveType: e.target.value }))}
                           className="w-full px-4 md:px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                        >
                           {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => (
                               <option key={val} value={val}>{label}</option>
                           ))}
                        </select>
                     </div>

                     <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Leave</label>
                        <textarea
                           required
                           value={selfRequestData.reason}
                           onChange={e => setSelfRequestData(prev => ({ ...prev, reason: e.target.value }))}
                           placeholder="Briefly describe your reason for leave..."
                           className="w-full px-4 md:px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] md:min-h-[120px] resize-none"
                        />
                     </div>

                     <button
                        type="submit"
                        disabled={requestLeaveMutation.isPending}
                        className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                     >
                        {requestLeaveMutation.isPending ? "Submitting..." : (
                           <>
                              <Send size={18} /> Submit Request
                           </>
                        )}
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
