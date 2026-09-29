'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample } from '@/lib/integrations/types/labSample';
import { toast } from 'react-hot-toast';
import { Search, Clock, ChevronRight, FileText, Download, CheckCircle2, ChevronLeft, Edit3, Filter, RefreshCw } from 'lucide-react';
import { clearApiCache } from '@/lib/integrations/api/apiClient';

type TabType = 'pending' | 'submitted';

export default function LabResultsEntryPage() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const [pendingSamples, setPendingSamples] = useState<LabSample[]>([]);
    const [submittedSamples, setSubmittedSamples] = useState<LabSample[]>([]);
    const [isNavigating, startNavigation] = useTransition();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>((((searchParams?.get('tab') ?? null) ?? null) as TabType) || 'pending');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; // Items per page for submitted results

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

    // Sync tab with URL
    useEffect(() => {
        const tab = ((searchParams?.get('tab') ?? null) ?? null);
        if (tab === 'submitted' || tab === 'pending') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchSamples();

        const handleRefresh = () => {
            fetchSamples();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchSamples();
            }
        };

        window.addEventListener('refresh-lab-data', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('refresh-lab-data', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchSamples = async () => {
        setLoading(true);
        try {
            // Fetch "In Processing" samples (pending results) - Force fresh fetch
            const processing = await LabSampleService.getSamples('In Processing', true);

            // Filter samples that need results entry (no results entered yet)
            const pending = processing.filter(s =>
                s.tests.some(test => !test.resultValue || test.resultValue.trim() === '')
            );

            // Fetch "Completed" samples (submitted results) - Force fresh fetch
            const completed = await LabSampleService.getSamples('Completed', true);

            setPendingSamples(pending.sort((a, b) =>
                new Date(b.collectionDate || b.createdAt || '').getTime() -
                new Date(a.collectionDate || a.createdAt || '').getTime()
            ));

            setSubmittedSamples(completed.sort((a, b) =>
                new Date(b.reportDate || b.createdAt || '').getTime() -
                new Date(a.reportDate || a.createdAt || '').getTime()
            ));
        } catch (error) {
            console.error('Failed to fetch samples:', error);
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const displaySamples = activeTab === 'pending' ? pendingSamples : submittedSamples;

    const filteredSamples = displaySamples
        .filter(sample => typeFilter === 'all' || getSamplePatientType(sample) === typeFilter)
        .filter(sample =>
            sample.patientDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sample.patientDetails.originalPatientName && sample.patientDetails.originalPatientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sample.patientDetails.mobile && sample.patientDetails.mobile.includes(searchQuery))
        );

    // Calculate total pages
    const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);

    // Reset to page 1 when switching tabs or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading results...</p>
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
                    <div className="p-1.5 md:p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                        <FileText className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                            Lab Results
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 md:mt-1 flex items-center gap-1.5">
                            Manage results
                            <span className="hidden sm:inline-block w-1 h-1 bg-emerald-500 rounded-full animate-pulse ml-1" />
                            <span className="hidden sm:inline text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                Auto-saves
                            </span>
                        </p>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="w-full flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between xl:justify-end">
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full min-w-[180px] group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search patients or IDs..."
                            className="w-full pl-8 pr-3 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] md:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white uppercase tracking-widest"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
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
                                onClick={() => setActiveTab('submitted')}
                                className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'submitted'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                Submitted ({submittedSamples.length})
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
                            onClick={() => { clearApiCache?.(); fetchSamples(); }}
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
                        <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1 sm:mb-0 sm:mr-2">Billing Type</span>
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
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {t === 'all' ? 'All' : t === 'opd' ? 'OPD' : t === 'ipd' ? 'IPD' : 'Lab-to-Lab'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results List */}
            {activeTab === 'pending' ? (
                filteredSamples.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm min-w-[750px]">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Tests</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Collection Date</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {filteredSamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sample) => (
                                        <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-theme flex items-center justify-center text-white font-bold text-xs">
                                                        {sample.patientDetails.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
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
                                                            {sample.priority && sample.priority !== 'routine' && (
                                                                <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                                    🚨 {sample.priority}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {sample.patientDetails.age}Y • {sample.patientDetails.gender}
                                                            {sample.patientDetails.mobile && ` • ${sample.patientDetails.mobile}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
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
                                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 cursor-help hover:underline">
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
                                                {new Date(sample.collectionDate || '').toLocaleDateString()}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                                                    <Clock className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <button
                                                    onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                    disabled={isNavigating}
                                                    className={`px-4 py-2 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto ${isNavigating ? 'opacity-70' : ''}`}
                                                >
                                                    Enter Results
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination for Pending */}
                        {totalPages > 1 && (
                            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSamples.length)}</span> of <span className="font-medium">{filteredSamples.length}</span> pending results
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
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-amber-50 dark:bg-amber-900/20">
                            <FileText className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pending Results</h3>
                        <p className="text-gray-500 dark:text-gray-400">All collected samples have results entered.</p>
                    </div>
                )
            ) : (
                // Submitted Results Table View
                filteredSamples.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm min-w-[700px]">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Patient Details</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Sample ID</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Test Info</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white">Report Date</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {filteredSamples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sample) => (
                                        <tr key={sample._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">
                                                        {sample.patientDetails.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
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
                                                            {sample.priority && sample.priority !== 'routine' && (
                                                                <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                                    🚨 {sample.priority}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{sample.patientDetails.age}Y • {sample.patientDetails.gender}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
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
                                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 cursor-help hover:underline">
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
                                                {new Date(sample.reportDate || sample.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-800 flex items-center gap-1.5 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="Edit Report"
                                                    >
                                                        <Edit3 size={14} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/lab/samples/${sample._id}`))}
                                                        disabled={isNavigating}
                                                        className={`p-2 hover:bg-slate-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600 ${isNavigating ? 'opacity-70' : ''}`}
                                                        title="View Report"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSamples.length)}</span> of <span className="font-medium">{filteredSamples.length}</span> submitted results
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
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-16 text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Submitted Results</h3>
                        <p className="text-gray-500 dark:text-gray-400">No completed results available.</p>
                    </div>
                )
            )}


        </div>
    );
}
