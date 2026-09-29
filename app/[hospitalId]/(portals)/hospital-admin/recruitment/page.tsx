"use client";

import React, { useState } from 'react';
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "@/lib/integrations/services/hr.service";
import { useAuthStore } from "@/stores/authStore";
import {
  CheckCircle,
  Clock,
  Search,
  Users,
  CheckCircle2,
  XCircle as XIcon,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminRecruitmentPage() {
  const { hospitalId } = useParams() as any;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const authUser = useAuthStore((state) => state.user) as any;

  const { data: recruitmentsResponse, isLoading } = useQuery({
    queryKey: ["hospital-admin", "recruitment"],
    queryFn: () => hrService.getRecruitment(),
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Real-time synchronization
  React.useEffect(() => {
    let isMounted = true;
    const initSocket = async () => {
      try {
        const { getSocket, joinSocketRoom } = await import('@/lib/integrations/api/socket');
        const socket = await getSocket();
        
        if (socket && isMounted) {
          const userId = authUser?.id || authUser?._id;
          if (userId) {
            joinSocketRoom({
              userId,
              role: 'hospital-admin',
              hospitalId: (hospitalId as string) || authUser?.hospital
            });

            socket.on('new_recruitment_request', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
              toast.success("New recruitment request received");
            });

            socket.on('recruitment_review_update', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
            });
          }
        }
      } catch (err) {
        console.error("Socket init error:", err);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      import('@/lib/integrations/api/socket').then(({ getSocket }) => {
        getSocket().then(socket => {
          if (socket) {
            socket.off('new_recruitment_request');
            socket.off('recruitment_review_update');
          }
        });
      });
    };
  }, [queryClient, authUser, hospitalId]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string, status: string, rejectionReason?: string }) =>
      hrService.reviewRecruitmentRequest(id, { status, rejectionReason }),
    onSuccess: (res) => {
      toast.success(res.message || "Request updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hospital-admin", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update request");
    }
  });

  const recruitments = recruitmentsResponse?.data || [];

  const filteredRecruitments = recruitments.filter((r: any) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecruitments.length / ITEMS_PER_PAGE));
  
  const paginatedRecruitments = React.useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredRecruitments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecruitments, page]);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleReview = (id: string, status: "approved" | "rejected") => {
    let rejectionReason = "";
    if (status === "rejected") {
      rejectionReason = prompt("Please enter a reason for rejection:") || "";
      if (!rejectionReason) return;
    }

    reviewMutation.mutate({ id, status, rejectionReason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6">
      {/* Dynamic Header with Advanced Filters */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        {/* Top Row: Identification, Process Button, and Stats */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
          
          <div className="shrink-0 flex items-center gap-2 px-1">
            <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                Recruitment Registry
              </h1>
              <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                Review and approve recruitment notices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
              <div className="p-1.5 bg-white rounded-md shadow-sm"><Users className="w-4 h-4 text-gray-500" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Positions</span>
                <span className="text-sm font-bold text-gray-700 leading-none">
                  {recruitments.reduce((acc: number, r: any) => acc + (r.numberOfPositions || 0), 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
              <div className="p-1.5 bg-white rounded-md shadow-sm"><Clock className="w-4 h-4 text-amber-500" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/70">Pending</span>
                <span className="text-sm font-bold text-amber-700 leading-none">
                  {recruitments.filter((r: any) => r.status === 'pending_approval').length}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
              <div className="p-1.5 bg-white rounded-md shadow-sm"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">Active</span>
                <span className="text-sm font-bold text-emerald-700 leading-none">
                  {recruitments.filter((r: any) => r.status === 'open').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Control Center (Search & Pagination) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
            
            {/* Search Bar - Takes remaining width */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Header Pagination */}
            <div className="flex items-center justify-between sm:justify-center gap-2 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span className="text-[10px] font-black tracking-widest text-gray-400 px-2 flex items-center gap-1">
                <span className="text-indigo-600">{page}</span> / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>

          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Notice Details</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Vacancy</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By</th>
                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-2 md:px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedRecruitments.length > 0 ? (
                paginatedRecruitments.map((r: any) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 md:px-6 py-4">
                      <div className="font-bold text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500 font-medium">{r.department}</div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{r.type}</div>
                      <div className="text-[10px] text-indigo-600 font-bold uppercase">{r.numberOfPositions} Openings</div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{r.createdBy?.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(r.createdAt).toLocaleDateString()} • {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${r.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        r.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          r.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-2 md:px-6 py-4 text-right space-x-2">
                      {r.status === 'pending_approval' ? (
                        <>
                          <button
                            onClick={() => handleReview(r._id, 'approved')}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => handleReview(r._id, 'rejected')}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Reject"
                          >
                            <XIcon size={18} />
                          </button>
                        </>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-400 italic">No actions available</div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 md:px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="text-slate-200" />
                      <p className="text-sm font-medium">No recruitment notices found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
