'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  Inbox
} from 'lucide-react';

import type { LeaveBalance } from '@/lib/integrations/types';
import toast from 'react-hot-toast';
import CalendarPicker from '@/components/CalendarPicker';

import { useQueryClient } from '@tanstack/react-query';
import { useLeaves, useLeaveBalance, useCreateLeave } from '@/lib/integrations/hooks/useStaffQueries';

function LeavesPage() {

  const { data: leavesRes, isLoading: leavesLoading, refetch: refetchLeaves } = useLeaves();
  const { data: balanceRes, isLoading: balanceLoading, refetch: refetchBalance } = useLeaveBalance();
  const createLeaveMutation = useCreateLeave();

  const leaves = leavesRes?.leaves || [];
  const balance = (balanceRes as any)?.balance as LeaveBalance | undefined;

  const [activeTab, setActiveTab] = useState<'history' | 'request'>('history');

  // Form state
  const [formData, setFormData] = useState({
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [historyTab, setHistoryTab] = useState<'all' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const loading = leavesLoading || balanceLoading;

  const refreshData = () => {
    toast.promise(Promise.all([refetchLeaves(), refetchBalance()]), {
      loading: 'Synchronizing records...',
      success: 'Registry updated',
      error: 'Sync failed'
    });
  };

  const filteredLeaves = (leaves || []).filter(leave => {
    const reason = leave.reason || '';
    const type = leave.leaveType || '';
    const matchesSearch = reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase());

    if (historyTab === 'all') return matchesSearch;
    return leave.status === historyTab && matchesSearch;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, historyTab]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const truncateReason = (text: string) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= 2) return text;
    return words.slice(0, 2).join(' ') + '...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLeaveMutation.mutateAsync(formData as any);
      toast.success('Leave request submitted successfully!');
      setFormData({ leaveType: 'sick', startDate: '', endDate: '', reason: '' });
      setActiveTab('history');
      setHistoryTab('all');
    } catch (error) {
      console.error('Failed to submit leave:', error);
      toast.error('Failed to submit leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock3 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 w-full min-w-0 max-w-full overflow-x-hidden mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-1 sm:px-0">
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight uppercase leading-none">Leave Management</h1>
          <p className="text-gray-500 font-bold flex items-center gap-1.5 text-[9px] sm:text-xs uppercase tracking-widest leading-none mt-1">
            <Clock className="w-3 h-3 text-indigo-600" />
            Registry: Full Leave Lifecycle Protocol
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={refreshData}
            className="p-2 sm:p-3 bg-white text-gray-400 rounded-lg sm:rounded-xl border border-gray-100 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'history' ? 'request' : 'history')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border font-black uppercase text-[9px] sm:text-xs tracking-widest transition-all ${activeTab === 'request'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-600 hover:text-indigo-600 shadow-sm'
              }`}
          >
            {activeTab === 'history' ? (
              <><Plus className="w-4 h-4" /> New Request</>
            ) : (
              <><Calendar className="w-4 h-4" /> View History</>
            )}
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="flex flex-nowrap overflow-x-auto custom-scrollbar gap-2 sm:gap-4 px-1 sm:px-0 min-w-0 pb-2">
        <div className="flex-1 min-w-[40%] sm:min-w-[30%] bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-start gap-2 sm:gap-4 group hover:border-indigo-500 transition-all shrink-0">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-50 rounded-lg sm:rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 shrink-0 transition-transform">
            <Calendar className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-1">Medical</p>
            <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 truncate leading-none">
              {balance?.sick ?? 0}<span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 ml-1">/{balance?.totalSick ?? 0}</span>
            </h3>
          </div>
        </div>
        <div className="flex-1 min-w-[40%] sm:min-w-[30%] bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-start gap-2 sm:gap-4 group hover:border-emerald-500 transition-all shrink-0">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 shrink-0 transition-transform">
            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-1">Urgent</p>
            <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 truncate leading-none">
              {balance?.emergency ?? 0}<span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 ml-1">/{balance?.totalEmergency ?? 0}</span>
            </h3>
          </div>
        </div>
        <div className="flex-1 min-w-[40%] sm:min-w-[30%] bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-start gap-2 sm:gap-4 group hover:border-amber-500 transition-all shrink-0">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 shrink-0 transition-transform">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-1">Other</p>
            <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 truncate leading-none">
              {balance?.other ?? 0}<span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 ml-1">D</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 mt-2 w-full min-w-0">
        {/* Left Column: Form or Stats */}
        <div className="lg:w-1/3 w-full min-w-0">
          {activeTab === 'request' ? (
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-20">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase leading-none tracking-tight">Request Protocol</h2>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-2">Initialize New Leave Application</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Application Category</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="maternity">Maternity/Paternity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Leave Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">End Date</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  {(formData.startDate || formData.endDate) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, startDate: '', endDate: '' })}
                        className="text-[8px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        ✕ Clear Dates
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Subject Justification</label>
                  <textarea
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Provide justification protocol for this leave..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs sm:text-sm py-3 rounded-xl shadow-md hover:shadow-indigo-500/30 transform active:scale-95 tracking-widest transition-all mt-4"
                >
                  Authorize Leave Request
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 group sticky top-20">
              <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-widest mb-4 leading-none flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Leave Guidelines
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-2 sm:gap-3 group/item">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md sm:rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">1</div>
                  <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight transition-colors">Apply at least 2 days in advance for casual leaves.</p>
                </div>
                <div className="flex gap-2 sm:gap-3 group/item">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md sm:rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">2</div>
                  <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight transition-colors">Medical certificates required for sick leaves &gt; 3 days.</p>
                </div>
                <div className="flex gap-2 sm:gap-3 group/item">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md sm:rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">3</div>
                  <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-600 group-hover/item:text-gray-900 pt-0.5 leading-tight transition-colors">Approval dependent on unit operational capacity.</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50/50 rounded-lg sm:rounded-xl border border-amber-100 flex gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm font-bold text-amber-800 leading-tight italic">For urgent emergency protocols, contact leadership directly.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History with Tabs */}
        <div className="lg:w-2/3 w-full min-w-0 flex flex-col">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] sm:min-h-[500px] flex flex-col w-full min-w-0">
            {/* Tab Header */}
            <div className="p-3 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 min-w-0">
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Application Ledger</h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  {['all', 'approved', 'rejected'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab as any)}
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest leading-none transition-all ${historyTab === tab
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200'
                        }`}
                    >
                      {tab === 'all' ? 'Recent' : tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full md:w-auto">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 sm:py-2.5 text-[10px] sm:text-xs md:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full md:w-64 shadow-sm transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar w-full min-w-0">
              {filteredLeaves.length > 0 ? (
                <div className="w-full min-w-[500px] md:min-w-[700px]">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest leading-none">Leave Type</th>
                        <th className="px-4 py-4 text-left text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest leading-none">Period Date</th>
                        <th className="px-4 py-4 text-left text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest leading-none">Reason</th>
                        <th className="px-4 py-4 text-center text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest leading-none">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedLeaves.map((leave) => (
                        <tr key={leave._id} className="hover:bg-indigo-50/30 group transition-colors">
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center shrink-0 shadow-sm ${leave.leaveType === 'sick' ? 'bg-orange-50 text-orange-600' :
                                leave.leaveType === 'casual' ? 'bg-indigo-50 text-indigo-600' :
                                  'bg-emerald-50 text-emerald-600'
                                }`}>
                                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <span className="text-[10px] sm:text-[11px] md:text-sm font-bold text-gray-900 uppercase tracking-tight">{leave.leaveType}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                              <span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-900 leading-none">
                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                              </span>
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 leading-none">
                                <Clock3 size={10} className="sm:w-3 sm:h-3" /> {new Date(leave.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 max-w-[120px] sm:max-w-xs">
                            <p
                              className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-600 italic leading-tight cursor-help hover:text-indigo-600 transition-colors truncate"
                              title={leave.reason}
                            >
                              "{truncateReason(leave.reason)}"
                            </p>
                            {leave.status === 'rejected' && (leave as any).rejectionReason && (
                              <div className="mt-1 flex items-start gap-1 sm:gap-1.5 text-rose-600 bg-rose-50 p-1 sm:p-1.5 rounded-md sm:rounded-lg border border-rose-100">
                                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                                <span className="text-[8px] sm:text-[10px] font-bold italic line-clamp-1 sm:line-clamp-2 leading-tight">{(leave as any).rejectionReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                              <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black tracking-widest border flex items-center gap-1 sm:gap-1.5 shadow-sm ${getStatusColor(leave.status)}`}>
                                {getStatusIcon(leave.status)}
                                {leave.status}
                              </span>
                              {leave.status === 'approved' && (
                                <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-0.5 sm:gap-1 mt-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Validated
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Enhanced Pagination Controls */}
                  <div className="px-4 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
                      Showing <span className="text-gray-900">{filteredLeaves.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredLeaves.length)}</span> of <span className="text-gray-900">{filteredLeaves.length}</span> entries
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || totalPages <= 1}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1.5">
                        {totalPages > 0 ? (
                          [...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-[10px] sm:text-xs font-black transition-all transform active:scale-95 ${currentPage === i + 1
                                ? 'bg-indigo-600 text-white shadow-md scale-105'
                                : 'bg-white text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 shadow-sm'
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))
                        ) : (
                          <button
                            disabled
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[8px] sm:rounded-lg text-[10px] sm:text-[12px] font-black bg-indigo-600 text-white shadow-md scale-105"
                          >
                            1
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || totalPages <= 1}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 text-center h-full">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300 border border-gray-100">
                    <Inbox className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 italic tracking-tight mb-1">Ledger Empty</h3>
                  <p className="text-gray-500 font-bold text-[10px] sm:text-xs max-w-sm uppercase tracking-widest">No leave applications detected in the current matrix filter.</p>
                  <button
                    onClick={() => setActiveTab('request')}
                    className="mt-6 px-4 py-2 sm:px-6 sm:py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 hover:border-indigo-600"
                  >
                    Initiate Request
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LeavesPage);
