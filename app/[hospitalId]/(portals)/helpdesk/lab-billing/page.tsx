'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LabSample } from '@/lib/integrations/types/labSample';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { FlaskConical, RefreshCw, CheckCircle2, AlertCircle, PlayCircle, ChevronLeft, ChevronRight, Receipt, User, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import { getSocket } from '@/lib/integrations/api/socket';
import { useTenantLink } from '@/hooks/useTenantLink';
import CurechainPagination from '@/components/common/CurechainPagination';

type TabType = 'pending' | 'ready' | 'completed';

const formatTAT = (sample: LabSample) => {
    const now = new Date();
    const collectionTime = new Date(sample.collectionDate || sample.createdAt);
    const diffMs = now.getTime() - collectionTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
};

export default function HelpdeskLabBillingPage() {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const [pendingSamples, setPendingSamples] = useState<LabSample[]>([]);
    const [collectedSamples, setCollectedSamples] = useState<LabSample[]>([]);
    const [readySamples, setReadySamples] = useState<LabSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNavigating, startNavigation] = useTransition();
    const itemsPerPage = 15;

    const fetchSamples = useCallback(async (silent = false, skipCache = false) => {
        if (!silent) setLoading(true);
        try {
            const [pending, processing, completed] = await Promise.all([
                LabSampleService.getSamples('Pending', skipCache),
                LabSampleService.getSamples('In Processing', skipCache),
                LabSampleService.getSamples('Completed', skipCache)
            ]);

            setPendingSamples(pending.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()));
            setReadySamples(processing.sort((a, b) => new Date(b.collectionDate || b.createdAt || '').getTime() - new Date(a.collectionDate || a.createdAt || '').getTime()));
            setCollectedSamples(completed.sort((a, b) => new Date(b.reportDate || b.collectionDate || b.createdAt || '').getTime() - new Date(a.reportDate || a.collectionDate || a.createdAt || '').getTime()));
        } catch (error) {
            console.error('Failed to fetch samples:', error);
            if (!silent) toast.error('Failed to load lab samples');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    const triggerLiveRefresh = useCallback(() => {
        setTimeout(() => {
            clearApiCache();
            fetchSamples(true, true);
        }, 500);
        setTimeout(() => {
            clearApiCache();
            fetchSamples(true, true);
        }, 2000);
    }, [fetchSamples]);

    useEffect(() => {
        fetchSamples(false);

        let socketInstance: any = null;
        getSocket().then(socket => {
            if (!socket) return;
            socketInstance = socket;

            const handleUpdate = (data?: any) => {
                if (data?.message) {
                    toast.success(data.message, { duration: 5000, icon: '🔔' });
                }
                console.log('📡 [HelpdeskLabBilling] Real-time event → refreshing...');
                triggerLiveRefresh();
            };

            socket.on('new_lab_order', handleUpdate);
            socket.on('sample_collected', handleUpdate);
            socket.on('lab_order_updated', handleUpdate);
            socket.on('lab_refresh_forced', handleUpdate);
            socket.on('payment_status_changed', handleUpdate);
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') fetchSamples(true, false);
        };
        const handleRefresh = () => fetchSamples(true, true);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('refresh-lab-data', handleRefresh);

        return () => {
            if (socketInstance) {
                socketInstance.off('new_lab_order');
                socketInstance.off('sample_collected');
                socketInstance.off('lab_order_updated');
                socketInstance.off('lab_refresh_forced');
                socketInstance.off('payment_status_changed');
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('refresh-lab-data', handleRefresh);
        };
    }, [fetchSamples, triggerLiveRefresh]);

    const handleGoToBill = (sample: LabSample) => {
        const testNames = sample.tests.map(t => t.testName).join(',');
        const queryParams = new URLSearchParams({
            name: sample.patientDetails.name,
            mobile: sample.patientDetails.mobile || '',
            age: sample.patientDetails.age.toString(),
            gender: sample.patientDetails.gender,
            tests: testNames,
            sampleId: sample._id,
            displayId: sample.sampleId,
            refDoctor: sample.patientDetails.refDoctor || ''
        }).toString();
        
        startNavigation(() => {
            router.push(getPath(`/helpdesk/lab-billing/checkout?${queryParams}`));
        });
    };

    const getDisplaySamples = () => {
        let baseList: LabSample[] = [];
        switch (activeTab) {
            case 'pending': baseList = pendingSamples; break;
            case 'ready': baseList = readySamples; break;
            case 'completed': baseList = collectedSamples; break;
        }

        if (!searchTerm.trim()) return baseList;

        const term = searchTerm.toLowerCase();
        return baseList.filter(s => 
            s.patientDetails.name.toLowerCase().includes(term) ||
            s.sampleId.toLowerCase().includes(term) ||
            (s.patientDetails.mobile && s.patientDetails.mobile.includes(term))
        );
    };

    const displaySamples = getDisplaySamples();
    const totalPages = Math.ceil(displaySamples.length / itemsPerPage);
    const paginatedSamples = displaySamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    if (loading && displaySamples.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium">Loading lab orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header section with Stats card */}
            <div className="bg-gradient-to-br from-teal-900 via-teal-950 to-slate-900 rounded-3xl border border-teal-800/30 p-6 md:p-8 shadow-xl shadow-teal-950/20 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <Receipt className="w-6 h-6 text-teal-300" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Lab Billing & Account Center</h1>
                                <p className="text-xs md:text-sm text-teal-200/70 mt-0.5">Collect payments and billing invoices directly before or after sample collection</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <input
                                placeholder="Search by name or ID..."
                                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-xl px-4 py-2.5 pl-10 outline-none text-xs md:text-sm placeholder-teal-100/50 transition-all focus:ring-2 focus:ring-teal-400/35 focus:border-transparent"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="w-4 h-4 text-teal-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <button
                            onClick={() => fetchSamples(false, true)}
                            disabled={loading}
                            className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-all flex-shrink-0"
                            title="Force Refresh Data"
                        >
                            <RefreshCw className={`w-5 h-5 text-teal-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Micro Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-300">
                        <div className="p-3 bg-rose-500/20 text-rose-300 rounded-xl">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-teal-200/60 font-semibold uppercase tracking-wider">Pending Collection</p>
                            <p className="text-2xl font-bold mt-0.5">{pendingSamples.length}</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-300">
                        <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl">
                            <PlayCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-teal-200/60 font-semibold uppercase tracking-wider">Processing (In Lab)</p>
                            <p className="text-2xl font-bold mt-0.5">{readySamples.length}</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-300">
                        <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-teal-200/60 font-semibold uppercase tracking-wider">Completed Reports</p>
                            <p className="text-2xl font-bold mt-0.5">{collectedSamples.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab navigation matching theme */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">View List:</span>
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'pending'
                                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm border border-slate-200/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Pending Collection ({pendingSamples.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('ready')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'ready'
                                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm border border-slate-200/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Processing ({readySamples.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'completed'
                                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm border border-slate-200/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Completed ({collectedSamples.length})
                        </button>
                    </div>
                </div>
                <div className="flex items-center">
                    <CurechainPagination
                        currentPage={currentPage}
                        totalItems={displaySamples.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            {/* List block */}
            {displaySamples.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-16 text-center shadow-md">
                    <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-100 dark:border-teal-900/30">
                        <FlaskConical className="w-10 h-10 text-teal-600 dark:text-teal-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No matching orders found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        There are no orders matching your criteria in the {activeTab === 'pending' ? 'Pending Collection' : activeTab === 'ready' ? 'Processing' : 'Completed'} stage.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm min-w-[850px]">
                            <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Patient Details</th>
                                    <th className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Sample ID</th>
                                    <th className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Prescribed Tests</th>
                                    <th className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Date / Timing</th>
                                    <th className="px-6 py-4 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {paginatedSamples.map((sample) => {
                                    const isPaid = !!sample.invoiceId;
                                    const testListString = sample.tests.map(t => t.testName).join(', ');

                                    return (
                                        <tr key={sample._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold border border-teal-100/50 dark:border-teal-900/30 shadow-sm">
                                                        {sample.patientDetails.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                            {sample.patientDetails.name}
                                                            {sample.isWalkIn && (
                                                                <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-[8px] font-black rounded uppercase tracking-wider border border-orange-100 dark:border-orange-900/20">
                                                                    Walk-In
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                            {sample.patientDetails.bedInfo && (
                                                                <span className="ml-2 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] rounded border border-emerald-100 dark:border-emerald-900/20 uppercase tracking-tighter">
                                                                    {sample.patientDetails.bedInfo.bedId} ({sample.patientDetails.bedInfo.room})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 w-fit">
                                                        {sample.sampleId}
                                                    </span>
                                                    {isPaid && sample.billId && (
                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                                                            {sample.billId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="relative group/tooltip max-w-[240px]">
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={testListString}>
                                                        {testListString}
                                                    </div>
                                                    {sample.tests.length > 2 && (
                                                        <>
                                                            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-bold mt-0.5 cursor-pointer">
                                                                +{sample.tests.length - 2} more services
                                                            </div>
                                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Prescribed Tests</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {sample.tests.map((test, idx) => (
                                                                        <span key={idx} className="px-2 py-1 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                            {test.testName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-slate-600 dark:text-slate-400 font-medium">
                                                {activeTab === 'pending' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] text-slate-400 uppercase font-black tracking-wider">Ordered</span>
                                                        <span className="text-xs">{new Date(sample.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {new Date(sample.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs">Coll: {new Date(sample.collectionDate || sample.createdAt).toLocaleDateString('en-GB')}</span>
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Collected {formatTAT(sample)} ago</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {isPaid ? (
                                                        <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                                                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Billed
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleGoToBill(sample)}
                                                            disabled={isNavigating}
                                                            className={`px-4 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/10 ${isNavigating ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
                                                            <Receipt className="w-4 h-4" />
                                                            Bill Order
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
