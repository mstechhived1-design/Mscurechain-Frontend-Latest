'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { toast } from 'react-hot-toast';
import {
    TestTube, ChevronRight,
    ChevronLeft, LayoutGrid, List, FlaskConical,
    AlertTriangle, RefreshCw, Search, Filter, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';
import Link from 'next/link';
import { apiClient } from '@/lib/integrations/api/apiClient';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

interface LabResult {
    _id: string;
    sampleId: string;
    patient: {
        _id: string;
        name: string;
        mobile?: string;
        email?: string;
        mrn?: string;
    };
    tests: Array<{
        testName: string;
        status: string;
        result: any;
        isAbnormal?: boolean;
        remarks?: string;
    }>;
    status: string;
    doctorNotified?: boolean;
    doctor?: { name: string; };
    hospital?: { name: string; };
    completedAt?: Date;
    createdAt: Date;
}

type ViewMode = 'card' | 'table';
type FilterType = 'all' | 'completed' | 'pending';

const ITEMS_PER_PAGE = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

const getStatusConfig = (result: LabResult) => {
    const isDone = result.status?.toLowerCase() === 'completed' && result.doctorNotified;
    const isProcessing = result.status?.toLowerCase() === 'completed' && !result.doctorNotified;
    if (isDone) return { label: 'Verified', color: 'blue', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' };
    if (isProcessing) return { label: 'Pending Notify', color: 'indigo', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' };
    return { label: result.status || 'In Queue', color: 'amber', dot: 'bg-amber-500 animate-pulse', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
};

const formatDate = (d: any) => d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatTime = (d: any) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

// ── Pagination Component ──────────────────────────────────────────────────────

function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-4">
            <button
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-theme bg-card text-muted hover:text-primary-theme hover:border-primary-theme/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-black transition-all border ${
                            p === page
                                ? 'bg-primary-theme text-white border-primary-theme shadow-sm'
                                : 'bg-card text-muted border-border-theme hover:text-primary-theme hover:border-primary-theme/40'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <button
                onClick={() => onChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-theme bg-card text-muted hover:text-primary-theme hover:border-primary-theme/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronRight size={14} />
            </button>

            {/* <prev / next> style indicator */}
            <span className="text-[11px] font-black text-muted ml-1 font-mono tracking-tight opacity-60">
                &lt;{page - 1}/{totalPages}&gt;
            </span>
        </div>
    );
}

// ── Card View ─────────────────────────────────────────────────────────────────

function CardView({ items, getPath }: { items: LabResult[]; getPath: (p: string) => string }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map(result => {
                const cfg = getStatusConfig(result);
                const hasAbnormal = result.tests.some(t => t.isAbnormal);
                return (
                    <Link
                        key={result._id}
                        href={getPath(`/doctor/lab-results/${result._id}`)}
                        className="group bg-card rounded-xl border border-border-theme hover:border-primary-theme/30 hover:shadow-md transition-all flex flex-col overflow-hidden relative"
                    >
                        {/* Top strip */}
                        <div className={`h-0.5 w-full ${cfg.color === 'blue' ? 'bg-blue-500' : cfg.color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-400'}`} />

                        <div className="p-3 flex flex-col gap-2 flex-1">
                            {/* Row 1: Status + Abnormal badge */}
                            <div className="flex items-center justify-between gap-1">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${cfg.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                                    {cfg.label}
                                </span>
                                {hasAbnormal && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[9px] font-black dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800">
                                        <AlertTriangle size={9} /> ABN
                                    </span>
                                )}
                            </div>

                            {/* Row 2: Patient */}
                            <div className="flex items-center gap-2">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0 ${cfg.color === 'blue' ? 'bg-blue-600' : cfg.color === 'indigo' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                                    {result.patient?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-black text-foreground truncate uppercase tracking-tight leading-tight">
                                        {result.patient?.name || 'Unknown'}
                                    </p>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-60 truncate">
                                        MRN: {result.patient?.mrn || '—'} · #{result.sampleId}
                                    </p>
                                </div>
                            </div>

                            {/* Row 3: Tests */}
                            <div className="flex flex-wrap gap-1">
                                {result.tests.slice(0, 3).map((test, i) => (
                                    <span
                                        key={i}
                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${
                                            test.isAbnormal
                                                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800'
                                                : 'bg-secondary-theme border-border-theme text-muted'
                                        }`}
                                    >
                                        {test.testName}
                                    </span>
                                ))}
                                {result.tests.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black border border-border-theme bg-secondary-theme text-muted italic">
                                        +{result.tests.length - 3}
                                    </span>
                                )}
                            </div>

                            {/* Row 4: Date + Doctor */}
                            <div className="mt-auto pt-2 border-t border-border-theme/50 grid grid-cols-2 gap-1">
                                <div>
                                    <p className="text-[9px] font-black text-muted uppercase opacity-50">Date</p>
                                    <p className="text-[10px] font-black text-foreground">{formatDate(result.completedAt || result.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-muted uppercase opacity-50">Doctor</p>
                                    <p className="text-[10px] font-black text-foreground truncate">
                                        {result.doctor?.name ? (result.doctor.name.startsWith('Dr.') ? result.doctor.name : `Dr. ${result.doctor.name}`) : 'Staff'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 bg-secondary-theme/30 border-t border-border-theme flex items-center justify-between text-muted group-hover:text-primary-theme transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest">View Report</span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

// ── Table View ────────────────────────────────────────────────────────────────

function TableView({ items, getPath }: { items: LabResult[]; getPath: (p: string) => string }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border-theme bg-card">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-border-theme">
                        {['Sample ID', 'Patient', 'MRN', 'Tests', 'Abnormal', 'Doctor', 'Date', 'Time', 'Status', ''].map(h => (
                            <th key={h} className="px-3 py-2.5 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap bg-secondary-theme/30">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((result, idx) => {
                        const cfg = getStatusConfig(result);
                        const hasAbnormal = result.tests.some(t => t.isAbnormal);
                        return (
                            <tr
                                key={result._id}
                                className={`border-b border-border-theme/50 hover:bg-primary-theme/3 transition-colors group ${idx % 2 === 0 ? '' : 'bg-secondary-theme/10'}`}
                            >
                                <td className="px-3 py-2">
                                    <span className="text-[11px] font-black text-primary-theme font-mono">#{result.sampleId}</span>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 ${cfg.color === 'blue' ? 'bg-blue-600' : cfg.color === 'indigo' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                                            {result.patient?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <span className="text-[12px] font-black text-foreground uppercase tracking-tight whitespace-nowrap">
                                            {result.patient?.name || 'Unknown'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <span className="text-[11px] text-muted font-mono">{result.patient?.mrn || '—'}</span>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                                        {result.tests.slice(0, 2).map((t, i) => (
                                            <span key={i} className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${t.isAbnormal ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-secondary-theme border-border-theme text-muted'}`}>
                                                {t.testName}
                                            </span>
                                        ))}
                                        {result.tests.length > 2 && (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black border border-border-theme bg-secondary-theme text-muted italic">
                                                +{result.tests.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    {hasAbnormal
                                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black dark:bg-rose-900/20 dark:border-rose-800"><AlertTriangle size={9} />Yes</span>
                                        : <span className="text-[11px] text-muted opacity-40">—</span>
                                    }
                                </td>
                                <td className="px-3 py-2">
                                    <span className="text-[11px] text-muted whitespace-nowrap">
                                        {result.doctor?.name ? (result.doctor.name.startsWith('Dr.') ? result.doctor.name : `Dr. ${result.doctor.name}`) : 'Staff'}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="text-[11px] text-foreground font-medium">{formatDate(result.completedAt || result.createdAt)}</span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="text-[11px] text-muted">{formatTime(result.completedAt || result.createdAt)}</span>
                                </td>
                                <td className="px-3 py-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wide ${cfg.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                                        {cfg.label}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <Link
                                        href={getPath(`/doctor/lab-results/${result._id}`)}
                                        className="p-1.5 text-muted hover:text-primary-theme hover:bg-primary-theme/5 rounded-md transition-all inline-flex"
                                        title="View Report"
                                    >
                                        <ChevronRight size={15} />
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DoctorLabResultsPage() {
    const { getPath } = useTenantLink();
    const [results, setResults] = useState<LabResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [socketConnected, setSocketConnected] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTest, setSelectedTest] = useState('all');

    const [isTestDropdownOpen, setIsTestDropdownOpen] = useState(false);
    const [testSearchQuery, setTestSearchQuery] = useState('');
    const testDropdownRef = useRef<HTMLDivElement>(null);

    const fetchLabResults = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        try {
            const data = await apiClient<any>(`/doctor/lab-results?limit=60&_cb=${Date.now()}`);
            if (data?.success) setResults(data.data);
        } catch {
            if (!silent) toast.error('Failed to fetch lab results');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLabResults();
        let socketInstance: any = null;

        const initSocket = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user._id || user.id;
                if (userId && user.role) {
                    socketInstance = await getSocket();
                    if (socketInstance) {
                        const performRoomJoin = async () => {
                            await joinSocketRoom({ role: user.role, userId, hospitalId: user.hospital });
                            setSocketConnected(true);
                        };
                        if (socketInstance.connected) await performRoomJoin();
                        socketInstance.on('connect', performRoomJoin);
                        socketInstance.on('disconnect', () => setSocketConnected(false));
                        socketInstance.on('lab_result_notification', (notification: any) => {
                            toast.success(`Lab results ready for ${notification.patientName}`, { duration: 8000, icon: '🧪', position: 'top-right' });
                            fetchLabResults();
                            try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
                        });
                    }
                }
            } catch (error) { console.error('Socket setup error:', error); }
        };

        initSocket();

        const handleClickOutside = (event: MouseEvent) => {
            if (testDropdownRef.current && !testDropdownRef.current.contains(event.target as Node)) {
                setIsTestDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        const handleRefresh = () => fetchLabResults();
        window.addEventListener('refresh-lab-results', handleRefresh);
        return () => {
            if (socketInstance) {
                socketInstance.off('connect');
                socketInstance.off('disconnect');
                socketInstance.off('lab_result_notification');
            }
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('refresh-lab-results', handleRefresh);
        };
    }, [fetchLabResults]);

    // Reset to page 1 on filter/view change
    useEffect(() => setCurrentPage(1), [filter, viewMode, searchQuery, selectedTest]);

    const testOptions = Array.from(new Set(results.flatMap(r => r.tests.map(t => t.testName)))).sort();

    const filteredResults = results.filter(r => {
        const isVerified = r.status?.toLowerCase() === 'completed' && r.doctorNotified;
        const statusMatch = filter === 'completed' ? isVerified : (filter === 'pending' ? !isVerified : true);

        const q = searchQuery.toLowerCase();
        const nameMatch = r.patient?.name?.toLowerCase().includes(q);
        const mrnMatch = r.patient?.mrn?.toLowerCase().includes(q);
        const searchMatch = searchQuery === '' || nameMatch || mrnMatch;

        const testMatch = selectedTest === 'all' || r.tests.some(t => t.testName === selectedTest);

        return statusMatch && searchMatch && testMatch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
    const pageItems = filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // delete handler kept for modal wiring (modal is removed from UI but kept for safety)
    const handleDeleteResult = (_id: string, _e: React.MouseEvent) => {};

    const confirmDelete = async () => {
        if (!idToDelete) return;
        setIsDeleting(true);
        try {
            await apiClient(`/lab/orders/${idToDelete}`, { method: 'DELETE' });
            toast.success('Lab result deleted successfully');
            setResults(r => r.filter(x => x._id !== idToDelete));
            setIsDeleteModalOpen(false);
            setIdToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete lab result');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-primary-theme/20 border-t-primary-theme rounded-full animate-spin" />
                        <TestTube className="absolute inset-0 m-auto text-primary-theme animate-pulse" size={18} />
                    </div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] animate-pulse">Loading Results...</p>
                </div>
            </div>
        );
    }

    const tabs: { id: FilterType; label: string; count: number }[] = [
        { id: 'all', label: 'All', count: results.length },
        { id: 'completed', label: 'Verified', count: results.filter(r => r.status?.toLowerCase() === 'completed' && r.doctorNotified).length },
        { id: 'pending', label: 'In Queue', count: results.filter(r => !(r.status?.toLowerCase() === 'completed' && r.doctorNotified)).length },
    ];

    return (
        <div className="min-h-screen space-y-3 pt-1 pb-16">

            {/* Dynamic Header */}
            <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative z-20">
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                </div>

                {/* Top Row: Title, Action Button, Pagination */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <FlaskConical className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase flex items-center gap-2">
                                Lab Results
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${socketConnected ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'}`} />
                                    {socketConnected ? 'Live' : 'Offline'}
                                </div>
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchLabResults(true)}
                            disabled={isRefreshing}
                            className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0 disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Control Center (Search, Filters) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3 relative z-10">
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0 hidden md:flex">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={12} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            title="Table View"
                        >
                            <List size={12} />
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar shrink-0 max-w-full">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    filter === tab.id ? 'bg-white dark:bg-[#111] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {tab.label}
                                <span className={`px-1 py-0.5 rounded text-[8px] font-black ${filter === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 w-full min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <input
                            type="text"
                            placeholder="Search Patient Name or MRN..."
                            className="w-full pl-8 pr-8 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Test Name Filter - Custom Searchable Dropdown */}
                    <div className="relative w-full md:w-72 shrink-0 group" ref={testDropdownRef}>
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                            <Filter size={12} className={`transition-colors ${isTestDropdownOpen ? 'text-blue-500' : 'text-gray-400'}`} />
                        </div>
                        
                        <button
                            onClick={() => {
                                setIsTestDropdownOpen(!isTestDropdownOpen);
                                if (!isTestDropdownOpen) setTestSearchQuery('');
                            }}
                            className={`w-full bg-gray-50 dark:bg-gray-800/50 border rounded-lg pl-8 pr-8 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 flex items-center justify-between transition-all outline-none ${
                                isTestDropdownOpen ? 'border-blue-400/40 ring-1 ring-blue-500/10 bg-white dark:bg-[#111]' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500/30'
                            }`}
                        >
                            <span className="truncate">
                                {selectedTest === 'all' ? 'All Available Tests' : selectedTest}
                            </span>
                            <div className="absolute right-2.5 flex items-center pointer-events-none">
                                <ChevronRight size={12} className={`text-gray-400 transition-transform duration-300 ${isTestDropdownOpen ? 'rotate-[-90deg]' : 'rotate-90'}`} />
                            </div>
                        </button>

                        {isTestDropdownOpen && (
                            <div className="absolute top-[calc(100%+5px)] right-0 w-[280px] bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Search Input for Test */}
                                <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-2">
                                    <Search size={12} className="text-gray-400" />
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Search tests..."
                                        className="w-full bg-transparent border-none text-[9px] font-bold uppercase tracking-widest focus:outline-none placeholder:text-gray-400/50 text-gray-900 dark:text-white"
                                        value={testSearchQuery}
                                        onChange={(e) => setTestSearchQuery(e.target.value)}
                                    />
                                    {testSearchQuery && (
                                        <button onClick={() => setTestSearchQuery('')} className="text-gray-400 hover:text-red-500">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <button
                                        className={`w-full text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group ${
                                            selectedTest === 'all' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-blue-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-l-2 border-transparent'
                                        }`}
                                        onClick={() => {
                                            setSelectedTest('all');
                                            setIsTestDropdownOpen(false);
                                        }}
                                    >
                                        <span>All Available Tests</span>
                                        {selectedTest === 'all' && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        )}
                                    </button>
                                    
                                    {testOptions
                                        .filter(test => test.toLowerCase().includes(testSearchQuery.toLowerCase()))
                                        .map(test => (
                                        <button
                                            key={test}
                                            className={`w-full text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group ${
                                                selectedTest === test ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-blue-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-l-2 border-transparent'
                                            }`}
                                            onClick={() => {
                                                setSelectedTest(test);
                                                setIsTestDropdownOpen(false);
                                            }}
                                        >
                                            <span className="truncate pr-2">{test}</span>
                                            {selectedTest === test && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                    {testOptions.filter(test => test.toLowerCase().includes(testSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No matching tests</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            {filteredResults.length === 0 ? (
                <div className="bg-card rounded-xl border border-border-theme p-16 text-center shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 bg-secondary-theme rounded-2xl flex items-center justify-center mb-4 relative">
                        <TestTube className="w-8 h-8 text-muted/30" />
                        <div className="absolute inset-0 border-2 border-dashed border-border-theme rounded-2xl animate-[spin_12s_linear_infinite]" />
                    </div>
                    <h3 className="text-base font-black text-foreground uppercase tracking-tight mb-1">No Results Found</h3>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest opacity-50">
                        {filter === 'all' ? 'No diagnostic records in this cycle.' : `No ${filter} records found.`}
                    </p>
                </div>
            ) : (
                <>
                    {viewMode === 'card'
                        ? <CardView items={pageItems} getPath={getPath} />
                        : <TableView items={pageItems} getPath={getPath} />
                    }

                </>
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { if (!isDeleting) { setIsDeleteModalOpen(false); setIdToDelete(null); } }}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                title="Delete Lab Result"
                message="Are you sure you want to delete this lab result? This action cannot be undone and will remove the record from the system."
            />
        </div>
    );
}
