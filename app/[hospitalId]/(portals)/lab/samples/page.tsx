'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LabSample } from '@/lib/integrations/types/labSample';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { FlaskConical, RefreshCw, CheckCircle2, AlertCircle, PlayCircle, ChevronLeft, ChevronRight, IndianRupee, Printer, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invalidateCachePattern, clearApiCache } from '@/lib/integrations/api/apiClient';
import { getSocket } from '@/lib/integrations/api/socket';

type TabType = 'pending' | 'collected' | 'ready';

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

export default function SampleCollectionPage() {
    const router = useRouter();
    const [pendingSamples, setPendingSamples] = useState<LabSample[]>([]);
    const [collectedSamples, setCollectedSamples] = useState<LabSample[]>([]);
    const [readySamples, setReadySamples] = useState<LabSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [currentPage, setCurrentPage] = useState(1);
    const [isNavigating, startNavigation] = useTransition();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const itemsPerPage = 15;

    // Billing Type Filter state
    const [typeFilter, setTypeFilter] = useState<'all' | 'opd' | 'ipd' | 'lab'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Helper to identify a sample's patient type
    const getSamplePatientType = (sample: LabSample): 'opd' | 'ipd' | 'lab' => {
        if (sample.patientDetails?.patientType) return sample.patientDetails.patientType.toLowerCase() as 'opd' | 'ipd' | 'lab';
        if (sample.patientDetails?.bedInfo) return 'ipd';
        if (sample.patientDetails?.originalPatientName) return 'lab';
        
        const nameLower = (sample.patientDetails?.name || '').toLowerCase();
        if (nameLower.includes('lab') || nameLower.includes('diagnostic') || nameLower.includes('center') || nameLower.includes('hospital')) {
            return 'lab';
        }

        if (sample.isWalkIn) return 'opd';
        return 'opd';
    };


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
            console.error(error);
            if (!silent) toast.error('Failed to load samples');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // ── Real-time: trigger a cache-busted refresh after a short delay ──
    const triggerLiveRefresh = useCallback(() => {
        // First pass — fast write (500ms)
        setTimeout(() => {
            clearApiCache();
            fetchSamples(true, true);
        }, 500);
        // Second pass — slower writes / network lag (2s)
        setTimeout(() => {
            clearApiCache();
            fetchSamples(true, true);
        }, 2000);
    }, [fetchSamples]);

    useEffect(() => {
        fetchSamples(false);

        // ── Socket listeners ──
        let socketInstance: any = null;
        getSocket().then(socket => {
            if (!socket) return;
            socketInstance = socket;

            const handleUpdate = (data?: any) => {
                if (data?.message) {
                    toast.success(data.message, { duration: 5000, icon: '🔔' });
                }
                console.log('📡 [SamplesPage] Real-time event → refreshing list...');
                triggerLiveRefresh();
            };

            socket.on('new_lab_order',       handleUpdate);
            socket.on('sample_collected',    handleUpdate);
            socket.on('lab_order_updated',   handleUpdate);
            socket.on('lab_refresh_forced',  handleUpdate);
            socket.on('payment_status_changed', handleUpdate);
        });

        // ── Existing listeners ──
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

    const handleCollect = async (id: string) => {
        try {
            // Find the sample to check its status
            const sample = pendingSamples.find(s => s._id === id);
            if (!sample) {
                toast.error('Sample not found');
                return;
            }

            // Only allow collection if status is 'Pending'
            if (sample.status !== 'Pending' && (sample as any).status !== 'prescribed') {
                toast.error('Sample is not in a collectible state');
                fetchSamples(); // Refresh data
                return;
            }

            await LabSampleService.collectSample(id);
            toast.success('Sample collected successfully!');
            invalidateCachePattern('/lab/dashboard-stats');
            window.dispatchEvent(new Event('refresh-lab-data'));
            fetchSamples(false, true); // Force skip cache to move sample to Processing tab
            setActiveTab('ready'); // Switch to Processing tab
        } catch (error: any) {
            console.error('Failed to collect sample:', error);
            toast.error(error.message || 'Failed to collect sample');
        }
    };

    const handleGenerateBill = (sample: LabSample) => {
        const testNames = sample.tests.map(t => t.testName).join(',');
        const pType = getSamplePatientType(sample);
        const queryParams = new URLSearchParams({
            name: sample.patientDetails.name,
            mobile: sample.patientDetails.mobile || '',
            age: sample.patientDetails.age.toString(),
            gender: sample.patientDetails.gender,
            tests: testNames,
            sampleId: sample._id,
            displayId: sample.sampleId,
            refDoctor: sample.patientDetails.refDoctor || '',
            patientType: pType,
            originalPatientName: sample.patientDetails.originalPatientName || ''
        }).toString();
        startNavigation(() => {
            router.push(`/lab/billing?${queryParams}`);
        });
    };

    const getDisplaySamples = () => {
        let baseList: LabSample[] = [];
        switch (activeTab) {
            case 'pending': baseList = pendingSamples; break;
            case 'collected': baseList = collectedSamples; break;
            case 'ready': baseList = readySamples; break;
        }
        if (typeFilter !== 'all') {
            baseList = baseList.filter(s => getSamplePatientType(s) === typeFilter);
        }
        if (startDate) {
            const filterStart = new Date(startDate);
            filterStart.setHours(0, 0, 0, 0);
            baseList = baseList.filter(s => {
                const sampleDate = new Date(s.collectionDate || s.createdAt);
                sampleDate.setHours(0, 0, 0, 0);
                return sampleDate >= filterStart;
            });
        }
        if (endDate) {
            const filterEnd = new Date(endDate);
            filterEnd.setHours(23, 59, 59, 999);
            baseList = baseList.filter(s => {
                const sampleDate = new Date(s.collectionDate || s.createdAt);
                sampleDate.setHours(23, 59, 59, 999);
                return sampleDate <= filterEnd;
            });
        }
        return baseList;
    };

    const displaySamples = getDisplaySamples();

    // Unified Pagination logic
    const totalPages = Math.ceil(displaySamples.length / itemsPerPage);
    const paginatedSamples = displaySamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when switching tabs
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    if (loading && displaySamples.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading samples...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Unified Top Action Bar */}
            <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 mb-2">
                
                {/* Heading */}
                <div className="shrink-0 flex items-center gap-2 px-1">
                    <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                        <FlaskConical className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                            Lab Samples
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 md:mt-1">
                            Manage sample collection
                        </p>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="w-full flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between xl:justify-end">
                    
                    {/* View Tabs */}
                    <div className="flex flex-1 items-center justify-start xl:justify-end overflow-x-auto no-scrollbar shrink-0">
                        <div className="inline-flex bg-slate-100 dark:bg-gray-700/50 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'pending'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                Pending ({pendingSamples.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('ready')}
                                className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'ready'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                Processing ({readySamples.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('collected')}
                                className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'collected'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                Completed ({collectedSamples.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center justify-center p-1.5 md:p-2 rounded-lg transition-colors shadow-sm shrink-0 ${isFilterOpen ? 'text-blue-600 border border-blue-200 bg-blue-50' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700'}`}
                            title="Filters"
                        >
                            <Filter className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>
                        
                        <button
                            onClick={() => { clearApiCache(); fetchSamples(false, true); }}
                            disabled={loading}
                            className="p-1.5 md:py-2 md:px-2.5 bg-gray-50 dark:bg-gray-800/50 text-gray-500 hover:text-blue-600 rounded-lg border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0"
                            title="Refresh List"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Collapsible Filters */}
            {isFilterOpen && (
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mx-1 md:mx-2 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center w-full sm:w-auto">
                        <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1 sm:mb-0 sm:mr-2">Patient Type</span>
                        <div className="inline-flex bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 overflow-x-auto no-scrollbar max-w-full">
                            {(['all', 'opd', 'ipd', 'lab'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${typeFilter === t
                                        ? t === 'opd'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : t === 'ipd'
                                                ? 'bg-blue-500 text-white shadow-sm'
                                                : t === 'lab'
                                                    ? 'bg-purple-500 text-white shadow-sm'
                                                    : 'bg-gray-800 dark:bg-gray-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {t === 'all' ? 'All' : t === 'opd' ? 'OPD' : t === 'ipd' ? 'IPD' : 'Lab-to-Lab'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-1.5 text-xs shadow-sm">
                        <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mr-1">Date</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-[10px] md:text-xs font-bold outline-none text-gray-700 dark:text-gray-300 py-0.5 focus:ring-0 uppercase tracking-widest"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-[10px] md:text-xs font-bold outline-none text-gray-700 dark:text-gray-300 py-0.5 focus:ring-0 uppercase tracking-widest"
                        />
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); setCurrentPage(1); }}
                                className="text-xs font-bold text-rose-500 hover:text-rose-700 ml-1 px-1"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Samples List */}
            {displaySamples.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FlaskConical className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No samples found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        There are no {activeTab} samples at the moment.
                    </p>
                </div>
            ) : activeTab === 'collected' ? (
                // Table View for Completed Samples
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Pagination for Completed Tab */}
                    {totalPages > 1 && (
                        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, displaySamples.length)}</span> of <span className="font-medium">{displaySamples.length}</span> completed samples
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => (p < totalPages ? p + 1 : p))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs md:text-sm min-w-[700px]">
                            <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Type</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Tests</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Dates</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                {paginatedSamples.map((sample) => (
                                    <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">
                                                    {sample.patientDetails.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {sample.patientDetails.originalPatientName ? (
                                                            <>
                                                                <span className="font-bold text-gray-900 dark:text-white">
                                                                    {sample.patientDetails.originalPatientName}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 rounded uppercase">
                                                                    {sample.patientDetails.name}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            sample.patientDetails.name
                                                        )}
                                                        {sample.priority && sample.priority !== 'routine' && (
                                                            <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                                🚨 {sample.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                        {sample.patientDetails.bedInfo && (
                                                            <span className="ml-2 text-emerald-600 font-bold uppercase tracking-tighter">
                                                                • {sample.patientDetails.bedInfo.bedId} ({sample.patientDetails.bedInfo.room})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            {getSamplePatientType(sample) === 'opd' ? (
                                                <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">OPD</span>
                                            ) : getSamplePatientType(sample) === 'ipd' ? (
                                                <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">IPD</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-emerald-800">Lab</span>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <span className="px-2 md:px-2.5 py-0.5 md:py-1 bg-slate-100 dark:bg-gray-800 rounded-md text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
                                                {sample.sampleId}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="relative group/tooltip">
                                                <div className="max-w-[200px] truncate text-gray-600 dark:text-gray-300" title={sample.tests.map(t => t.testName).join(', ')}>
                                                    {sample.tests.map(t => t.testName).join(', ')}
                                                </div>
                                                {sample.clinicalAnnotations && (
                                                    <div className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 p-1 rounded mt-1 font-semibold border border-amber-200 dark:border-amber-800 line-clamp-1" title={sample.clinicalAnnotations}>
                                                        📝 {sample.clinicalAnnotations}
                                                    </div>
                                                )}
                                                {sample.tests.length > 2 && (
                                                    <>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 cursor-help">
                                                            +{sample.tests.length - 2} more
                                                        </div>
                                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Full Test List</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {sample.tests.map((test, idx) => (
                                                                    <span key={idx} className="px-2 py-1 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                                                        {test.testName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-gray-600 dark:text-gray-400">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs">Coll: {new Date(sample.collectionDate || sample.createdAt).toLocaleDateString()}</span>
                                                <span className="text-xs text-gray-400">Rep: {sample.reportDate ? new Date(sample.reportDate).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Completed
                                                </span>
                                                <button
                                                    onClick={() => router.push(`/lab/samples/${sample._id}`)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-100 dark:border-blue-800 shadow-sm"
                                                    title="View / Print Report"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // Table View for Pending and Processing
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Generic Pagination for Pending/Processing Tabs */}
                    {totalPages > 1 && (
                        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, displaySamples.length)}</span> of <span className="font-medium">{displaySamples.length}</span> {activeTab} samples
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => (p < totalPages ? p + 1 : p))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs md:text-sm min-w-[750px]">
                            <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Type</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Tests</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Info</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                {paginatedSamples.map((sample) => (
                                    <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${activeTab === 'pending' ? 'bg-primary-theme' : 'bg-primary-theme'}`}>
                                                    {sample.patientDetails.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                                        {getSamplePatientType(sample) === 'lab' ? (
                                                            <>
                                                                <span className="font-bold text-gray-900 dark:text-white">
                                                                    {sample.patientDetails.name}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 rounded uppercase">
                                                                    {sample.patientDetails.refDoctor || 'Lab'}
                                                                </span>
                                                            </>
                                                        ) : sample.patientDetails.originalPatientName ? (
                                                            <>
                                                                <span className="font-bold text-gray-900 dark:text-white">
                                                                    {sample.patientDetails.originalPatientName}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 rounded uppercase">
                                                                    {sample.patientDetails.name}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            sample.patientDetails.name
                                                        )}
                                                        {sample.isWalkIn && (
                                                            <span className="px-1 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[8px] font-bold rounded uppercase tracking-wider">
                                                                Walk-In
                                                            </span>
                                                        )}
                                                        {sample.priority && sample.priority !== 'routine' && (
                                                            <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                                🚨 {sample.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                        {sample.patientDetails.bedInfo && (
                                                            <span className="ml-2 text-emerald-600 font-bold uppercase tracking-tighter">
                                                                • {sample.patientDetails.bedInfo.bedId} ({sample.patientDetails.bedInfo.room})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            {getSamplePatientType(sample) === 'opd' ? (
                                                <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">OPD</span>
                                            ) : getSamplePatientType(sample) === 'ipd' ? (
                                                <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">IPD</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-800">Lab</span>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex flex-col">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-800 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 w-fit">
                                                    {sample.sampleId}
                                                </span>
                                                {activeTab === 'ready' && sample.invoiceId && (
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                        {sample.billId}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="relative group/tooltip">
                                                <div className="max-w-[200px] truncate text-gray-600 dark:text-gray-300" title={sample.tests.map(t => t.testName).join(', ')}>
                                                    {sample.tests.map(t => t.testName).join(', ')}
                                                </div>
                                                {sample.clinicalAnnotations && (
                                                    <div className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 p-1 rounded mt-1 font-semibold border border-amber-200 dark:border-amber-800 line-clamp-1" title={sample.clinicalAnnotations}>
                                                        📝 {sample.clinicalAnnotations}
                                                    </div>
                                                )}
                                                {sample.tests.length > 2 && (
                                                    <>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 cursor-help">
                                                            +{sample.tests.length - 2} more
                                                        </div>
                                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Full Test List</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {sample.tests.map((test, idx) => (
                                                                    <span key={idx} className="px-2 py-1 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                                                        {test.testName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-gray-600 dark:text-gray-400">
                                            {activeTab === 'pending' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs whitespace-nowrap">Prescribed:</span>
                                                    <span className="text-xs font-medium">{new Date(sample.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs whitespace-nowrap">Coll: {new Date(sample.collectionDate || sample.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-amber-600 font-medium">TAT: {formatTAT(sample)} ago</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === 'pending' && (
                                                    <div className="flex items-center gap-2">
                                                        {sample.invoiceId ? (
                                                            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">BILLED</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleGenerateBill(sample)}
                                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                                                            >
                                                                <IndianRupee className="w-3.5 h-3.5" />
                                                                Bill
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleCollect(sample._id)}
                                                            className="px-4 py-2 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                                                        >
                                                            <FlaskConical className="w-3.5 h-3.5" />
                                                            Collect
                                                        </button>
                                                    </div>
                                                )}

                                                {activeTab === 'ready' && (
                                                    <div className="flex items-center gap-2">
                                                        {!sample.invoiceId ? (
                                                            <button
                                                                onClick={() => handleGenerateBill(sample)}
                                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                                                            >
                                                                <IndianRupee className="w-3.5 h-3.5" />
                                                                Bill
                                                            </button>
                                                        ) : (
                                                            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">BILLED</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                            disabled={isNavigating}
                                                            className={`px-3 py-2 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm flex items-center gap-1.5 ${isNavigating ? 'opacity-70 cursor-wait' : ''}`}
                                                        >
                                                            {isNavigating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                                            Enter Results
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}