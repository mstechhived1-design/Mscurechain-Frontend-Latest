'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Search,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock3,
    AlertCircle,
    Inbox,
    FileText,
    CalendarCheck,
    Coffee,
    ChevronLeft
} from 'lucide-react';
import { useLeaves, useLeaveBalance, useCreateLeave } from '@/lib/integrations/hooks';
import toast from 'react-hot-toast';
import CalendarPicker from '@/components/CalendarPicker';

function NurseLeavesPage() {
    const { data: leavesData, isLoading: leavesLoading, isError: leavesError, refetch: refetchLeaves } = useLeaves();
    const { data: balanceData, isLoading: balanceLoading, isError: balanceError, refetch: refetchBalance } = useLeaveBalance();

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
    const leavesPerPage = 8;

    useEffect(() => {
        if (leavesError || balanceError) {
            toast.error('Failed to load leave information.');
        }
    }, [leavesError, balanceError]);

    const leaves = leavesData?.leaves || [];
    const balance = balanceData?.balance || null;
    const loading = leavesLoading || balanceLoading;

    const filteredLeaves = leaves.filter(leave => {
        const reasonMatch = (leave.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
        const typeMatch = (leave.leaveType || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSearch = reasonMatch || typeMatch;

        if (historyTab === 'all') return matchesSearch;
        return leave.status === historyTab && matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredLeaves.length / leavesPerPage);
    const paginatedLeaves = filteredLeaves.slice(
        (currentPage - 1) * leavesPerPage,
        currentPage * leavesPerPage
    );

    const refreshData = () => {
        refetchLeaves();
        refetchBalance();
    };

    const createLeaveMutation = useCreateLeave();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.startDate || !formData.endDate || !formData.reason) {
            toast.error('Please fill all required fields');
            return;
        }
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
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Leave Records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER */}
            <div className="relative overflow-hidden rounded-xl bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border border-slate-100">
                <div className="relative z-10">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight leading-none mb-1 sm:mb-2 uppercase">
                        Service <span className="text-primary-theme">Exemption</span> Registry
                    </h1>
                    <p className="text-slate-400 font-bold text-[7px] md:text-[8px] max-w-xl leading-relaxed uppercase tracking-widest">
                        Exemption records, balance ledger & approval portal
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => setActiveTab(activeTab === 'history' ? 'request' : 'history')}
                        className={`group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl font-black uppercase text-[8px] sm:text-[10px] tracking-widest transition-all overflow-hidden w-full sm:w-auto justify-center ${activeTab === 'request'
                            ? 'bg-primary-theme text-white border border-transparent'
                            : 'bg-white text-gray-900 hover:bg-slate-50 border border-slate-200 shadow-sm'
                            }`}
                    >
                        {activeTab === 'history' ? (
                            <>
                                <Plus className="w-3.3 h-3.3 sm:w-4 sm:h-4" />
                                <span>New Request</span>
                            </>
                        ) : (
                            <>
                                <Calendar className="w-3.3 h-3.3 sm:w-4 sm:h-4" />
                                <span>View History</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* BALANCE CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                <BalanceCard
                    label="Medical"
                    count={balance?.sick || 0}
                    total={balance?.totalSick || 0}
                    color="orange"
                    icon={<FileText className="w-4 h-4 sm:w-6 sm:h-6" />}
                    sublabel="Remaining Days"
                />
                <BalanceCard
                    label="Casual"
                    count={(balance as any)?.emergency || 0}
                    total={(balance as any)?.totalEmergency || 0}
                    color="emerald"
                    icon={<CalendarCheck className="w-4 h-4 sm:w-6 sm:h-6" />}
                    sublabel="Available Days"
                />
                <BalanceCard
                    label="Approved"
                    count={balance?.other || 0}
                    total={0}
                    isDaysOnly
                    color="amber"
                    icon={<Coffee className="w-4 h-4 sm:w-6 sm:h-6" />}
                    sublabel="Total Taken"
                    className="col-span-2 md:col-span-1"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: FORM or GUIDELINES */}
                <div className="lg:col-span-4 xl:col-span-4 space-y-6">
                    {activeTab === 'request' ? (
                        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[30px] shadow-sm border border-slate-100 sticky top-24 animate-in slide-in-from-left-4 duration-500">
                            <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-100">
                                <h2 className="text-xs sm:text-sm font-black text-emerald-900 uppercase tracking-tight">New Application</h2>
                                <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Submit for Approval</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-[7.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Exemption Category</label>
                                    <div className="relative">
                                        <select
                                            value={formData.leaveType}
                                            onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-theme focus:bg-white transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="sick">Sick Exemption</option>
                                            <option value="casual">Casual Exemption</option>
                                            <option value="emergency">Emergency Exemption</option>
                                            <option value="maternity">Maternity/Paternity</option>
                                            <option value="other">Other Protocol</option>
                                        </select>
                                        <ChevronRight className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90 sm:size-[14px]" size={12} />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Duration</label>
                                    <CalendarPicker
                                        startDate={formData.startDate}
                                        endDate={formData.endDate}
                                        onChange={(dates) => setFormData({ ...formData, ...dates })}
                                    />
                                </div>

                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Reason</label>
                                    <textarea
                                        rows={3}
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        placeholder="Detailed reason..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-theme focus:bg-white transition-all resize-none"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary-theme hover:bg-primary-theme/90 text-white font-black uppercase tracking-widest text-[9px] sm:text-xs py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span>Submit Application</span>
                                    <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform sm:size-[14px]" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm sticky top-24">
                            <h2 className="text-[10px] sm:text-lg font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                <AlertCircle size={14} className="text-emerald-500 sm:size-[20px]" />
                                Compliance Guidelines
                            </h2>
                            <div className="space-y-3 sm:space-y-6 relative">
                                <div className="absolute top-2 bottom-2 left-[11px] sm:left-[19px] w-px sm:w-0.5 bg-slate-100"></div>
                                <GuidelineItem number={1} text="48h prior notice required for protocol." />
                                <GuidelineItem number={2} text="Cert needed for > 3 days skip." />
                                <GuidelineItem number={3} text="Subject to Supervisor Approval." />
                                <GuidelineItem number={4} text="Bonus Eligibility Requirements." />
                            </div>

                            <div className="mt-6 sm:mt-8 p-3 sm:p-5 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-100 flex gap-2 sm:gap-4">
                                <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[7.5px] sm:text-xs font-bold text-amber-700 leading-relaxed italic uppercase tracking-wider">
                                    Contact Admin for urgent overrides.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: LIST */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-3 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                            <div>
                                <h2 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-widest mb-2 sm:mb-1">Exemption Ledger</h2>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {['all', 'approved', 'rejected', 'pending'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => {
                                                setHistoryTab(tab as any);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${historyTab === tab
                                                ? 'bg-primary-theme text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative group w-full sm:w-auto">
                                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary-theme transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search ledger..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg sm:rounded-xl pl-9 pr-4 py-2 text-[9px] sm:text-xs font-bold focus:ring-2 focus:ring-primary-theme outline-none w-full sm:w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Applied</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedLeaves.length > 0 ? (
                                        paginatedLeaves.map((leave) => (
                                            <tr key={leave._id} className="group hover:bg-slate-50/30 transition-all">
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/50 ${leave.leaveType === 'sick' ? 'bg-orange-50 text-orange-500' :
                                                            leave.leaveType === 'casual' ? 'bg-emerald-50 text-emerald-500' :
                                                                'bg-indigo-50 text-indigo-500'
                                                            }`}>
                                                            <Calendar size={14} className="sm:size-[18px]" />
                                                        </div>
                                                        <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-tight">{leave.leaveType}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <p className="text-[10px] sm:text-xs font-black text-slate-700 leading-none">
                                                        {new Date(leave.startDate).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                        to {new Date(leave.endDate).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <div className="max-w-[100px] sm:max-w-[200px] truncate">
                                                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 italic" title={leave.reason}>
                                                            "{leave.reason}"
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                    <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] uppercase font-black tracking-widest border items-center gap-1 ${getStatusColor(leave.status)}`}>
                                                        {getStatusIcon(leave.status)}
                                                        {leave.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {new Date(leave.createdAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-50">
                                                    <Inbox size={40} className="text-slate-300" />
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Leave Records Found</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* TABLE PAGINATION FOOTER */}
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Showing <span className="text-emerald-600">{filteredLeaves.length > 0 ? (currentPage - 1) * leavesPerPage + 1 : 0}</span> to <span className="text-emerald-600">{Math.min(currentPage * leavesPerPage, filteredLeaves.length)}</span> of {filteredLeaves.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                                                ? 'bg-primary-theme text-white shadow-lg shadow-primary-theme/20'
                                                : 'bg-white text-slate-400 hover:text-emerald-600 border border-slate-200'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    )) : (
                                        <button disabled className="w-8 h-8 rounded-lg text-[10px] font-black bg-slate-900 text-white shadow-lg shadow-slate-900/20">1</button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FORCED REFRESH MODAL/ACTION */}
            <button
                onClick={refreshData}
                className="fixed bottom-6 right-6 w-12 h-12 bg-white border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-slate-400 hover:text-primary-theme transition-all z-50 group"
            >
                <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
}

function BalanceCard({ label, count, total, isDaysOnly, color, icon, sublabel, className }: any) {
    const colors: any = {
        orange: 'bg-orange-50/50 hover:bg-orange-50 text-orange-600 border-orange-100',
        emerald: 'bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50/50 hover:bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className={`p-4 sm:p-6 rounded-xl sm:rounded-[0.5rem] transition-all bg-white border border-slate-100 shadow-sm ${className || ''}`}>
            <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
                    {React.cloneElement(icon, { size: 18, className: 'sm:size-[24px]' })}
                </div>
                <div className="text-right">
                    <h3 className="text-xl sm:text-3xl font-black text-slate-900 leading-none">
                        {count}
                        {!isDaysOnly && <span className="text-[10px] sm:text-base text-slate-300 ml-0.5">/{total}</span>}
                    </h3>
                </div>
            </div>
            <div>
                <p className="text-[10px] sm:text-sm font-black text-slate-800 tracking-tight uppercase">{label}</p>
                <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sublabel}</p>
            </div>
        </div>
    );
}

function GuidelineItem({ number, text }: any) {
    return (
        <div className="flex gap-4 group/item relative z-10 bg-white py-1">
            <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-100 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors shadow-sm">{number}</div>
            <p className="text-xs font-bold text-slate-500 group-hover/item:text-slate-900 pt-1 transition-colors">{text}</p>
        </div>
    );
}

export default React.memo(NurseLeavesPage);
