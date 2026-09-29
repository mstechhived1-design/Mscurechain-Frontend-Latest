'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "@/lib/integrations/services/hr.service";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { useAuthStore } from "@/stores/authStore";
import {
  Briefcase,
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ArrowRight,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import toast from "react-hot-toast";

export default function RecruitmentPage() {
  const { hospitalId } = useParams() as any;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'postings' | 'applicants'>('postings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    description: "",
    requirements: "",
    numberOfPositions: 1,
    type: "Full-time"
  });

  const [viewingJob, setViewingJob] = useState<any>(null);

  const authUser = useAuthStore((state) => state.user) as any;

  const { data: recruitmentResponse, isLoading } = useQuery({
    queryKey: ["hr", "recruitment"],
    queryFn: () => hrService.getRecruitment(),
    refetchInterval: 15000, // Fallback refetch every 15s
    staleTime: 5000,
  });

  // Real-time synchronization
  useEffect(() => {
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
              role: 'hr',
              hospitalId: (hospitalId as string) || authUser?.hospital
            });

            socket.on('new_recruitment_request', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
              toast.success("New recruitment entry detected");
            });

            socket.on('recruitment_review_update', (data: any) => {
              queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
              toast.success("Recruitment status updated");
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

  const { data: metadataResponse } = useQuery({
    queryKey: ["hospital", "metadata"],
    queryFn: () => hospitalAdminService.getHospitalMetadata(),
    staleTime: 5 * 60 * 1000,
  });

  // Build department list from clinical departments + unitTypes
  const dynamicDepartments = React.useMemo(() => {
    const depts = (metadataResponse?.data?.departments || []).map((d: any) => d.name).filter(Boolean);
    const units = (metadataResponse?.data?.unitTypes || []).filter(Boolean);
    return [...new Set([...depts, ...units])].sort();
  }, [metadataResponse]);

  const createMutation = useMutation({
    mutationFn: (data: any) => hrService.createRecruitmentRequest({
      ...data,
      requirements: data.requirements.split(',').map((r: string) => r.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      toast.success("Recruitment request sent to Hospital Admin for approval");
      setIsModalOpen(false);
      setFormData({ title: "", department: "", description: "", requirements: "", numberOfPositions: 1, type: "Full-time" });
      queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send request");
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => hrService.updateRecruitmentStatus(id, status),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  const recruitments = recruitmentResponse?.data || [];

  const filteredPostings = recruitments.filter((job: any) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Active Postings', value: recruitments.filter((r: any) => r.status === 'open').length, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Approval', value: recruitments.filter((r: any) => r.status === 'pending_approval').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved Requests', value: recruitments.filter((r: any) => r.status === 'approved').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Positions', value: recruitments.reduce((acc: number, r: any) => acc + (r.numberOfPositions || 0), 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl sm:rounded-2xl border border-slate-100 shadow-sm w-full">
        {/* LEFT: Title + subtitle */}
        <div className="flex flex-col gap-1 shrink-0 w-full xl:w-auto">
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">Recruitment Management</h1>
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tight mt-1">Manage job postings and evaluate talent across departments.</p>
        </div>

        {/* CENTER: Raise Request button */}
        <div className="flex-1 flex items-center justify-center w-full md:w-auto mt-2 xl:mt-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 text-[10px] uppercase tracking-widest w-full md:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Raise Request
          </button>
        </div>

        {/* RIGHT: Stats */}
        <div className="flex items-center shrink-0 w-full xl:w-auto overflow-x-auto no-scrollbar pt-2 xl:pt-0">
          <div className="flex flex-nowrap items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 sm:py-2 bg-slate-50/50 rounded-xl border border-slate-100 w-full xl:w-auto">
            {stats.map((stat, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col min-w-[80px]">
                  <div className={`flex items-center gap-1.5 mb-0.5 ${stat.color}`}>
                    <stat.icon size={10} />
                    <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{stat.label}</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-900 leading-none">{stat.value}</p>
                </div>
                {i < stats.length - 1 && <div className="w-px h-8 bg-slate-200" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('postings')}
            className={`px-8 py-5 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'postings' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            Job Postings / Requests
            {activeTab === 'postings' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-8 py-5 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'applicants' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            Candidates (Coming Soon)
            {activeTab === 'applicants' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />}
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {activeTab === 'postings' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notice Details</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type & Vacancy</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Created By</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPostings.length > 0 ? (
                      filteredPostings.map((job: any) => (
                        <tr key={job._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div
                              onClick={() => setViewingJob(job)}
                              className="font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                            >
                              {job.title}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{job.department}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-700">{job.type}</div>
                            <div className="text-[10px] text-indigo-600 font-bold uppercase">{job.numberOfPositions} Openings</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-700">{job.createdBy?.name || 'HR Manager'}</div>
                            <div className="text-[10px] text-gray-400 font-medium">
                              {new Date(job.createdAt).toLocaleDateString()} • {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md border ${job.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              job.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                job.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  job.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    'bg-gray-50 text-gray-600 border-gray-100'
                              }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingJob(job)}
                                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border border-emerald-100 hover:bg-emerald-600 hover:text-white"
                              >
                                View
                              </button>
                              {job.status === 'open' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: job._id, status: 'closed' })}
                                  className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border border-rose-100 hover:bg-rose-600 hover:text-white"
                                >
                                  Close
                                </button>
                              )}
                              {job.status === 'approved' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: job._id, status: 'open' })}
                                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-700 transition-all"
                                >
                                  Open Posting
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <AlertCircle size={24} className="mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-medium">No recruitment postings found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">Applicant management is being integrated...</p>
                <p className="text-sm">Once a posting is "Open", candidates will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">Recruitment Requisition</h2>
                <p className="text-slate-500 text-xs md:text-sm font-medium">Draft a new recruitment notice for administrative review.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Job Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Pathologist"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Department</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    <option value="All Departments">All Departments</option>
                    {dynamicDepartments.length > 0 ? (
                      dynamicDepartments.map((dept: string) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))
                    ) : (
                      <option value="">No Departments Found</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Employment Basis</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Vacancies</label>
                  <input
                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition-all"
                    value={formData.numberOfPositions || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, numberOfPositions: isNaN(val) ? 0 : val });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Notice Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the core responsibilities and clinical expectations..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Clinical Requirements (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, MD Pathology, 5+ Years Exp..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 placeholder:text-slate-300 transition-all"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={createMutation.isPending}
                  type="submit"
                  className="flex-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText size={20} />
                      Send for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Recruitment Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Briefcase size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{viewingJob.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                      {viewingJob.department}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {viewingJob.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${viewingJob.status === 'open' ? 'bg-emerald-500 animate-pulse' :
                      viewingJob.status === 'approved' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}></div>
                    {viewingJob.status.replace('_', ' ')}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Positions</p>
                  <p className="text-sm font-black text-slate-800">{viewingJob.numberOfPositions} Vacancy</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileText size={18} className="text-indigo-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Job Description</h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {viewingJob.description}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Requirements</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingJob.requirements?.map((req: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase">
                    Created {new Date(viewingJob.createdAt).toLocaleDateString()} • {new Date(viewingJob.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span className="text-[10px] font-bold uppercase">{viewingJob.applicantsCount || 0} Candidates</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setViewingJob(null)}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close View
              </button>
              {viewingJob.status === 'approved' && (
                <button
                  onClick={() => {
                    statusMutation.mutate({ id: viewingJob._id, status: 'open' });
                    setViewingJob(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <ArrowRight size={16} />
                  Activate Posting
                </button>
              )}
              {viewingJob.status === 'open' && (
                <button
                  onClick={() => {
                    statusMutation.mutate({ id: viewingJob._id, status: 'closed' });
                    setViewingJob(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-100"
                >
                  Close Vacancy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
