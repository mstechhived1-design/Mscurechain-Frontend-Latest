'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Search,
    Activity,
    Heart,
    Thermometer,
    Wind,
    ChevronRight,
    ChevronLeft,
    History,
    RefreshCw,
    ArrowRightLeft,
    LogOut,
    Plus,
    Receipt,
    X,
    LayoutGrid,
    List,
    Pill,
    Pencil,
    Check,
    ClipboardList,
    AlertTriangle,
    FileText,
    ShieldAlert,
    HeartPulse,
    Stethoscope,
    CheckCircle2
} from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';
import AddClinicalChargeModal from '@/components/ipd/AddClinicalChargeModal';
import { IPDBillingModal } from '@/components/helpdesk/IPDBillingModal';
import TransferRequestModal from '@/components/ipd/TransferRequestModal';
import InpatientRoundingModal from '@/components/doctor/InpatientRoundingModal';
import { getDoctorInpatientsAction } from '@/lib/integrations/actions/doctor.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateStayDuration } from '@/lib/utils/date-utils';
import { ipdService } from '@/lib/integrations';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';

import { useDoctorInpatients } from '@/lib/integrations/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

const calculateNEWS = (vitals: any) => {
    if (!vitals) return { score: 0, label: 'NEWS: 0 (Stable)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' };
    let score = 0;
    if (vitals.status === 'Critical' || (vitals.spO2 && Number(vitals.spO2) < 90)) score += 5;
    else if (vitals.status === 'Warning' || (vitals.spO2 && Number(vitals.spO2) < 94)) score += 3;
    if (vitals.heartRate && (Number(vitals.heartRate) > 120 || Number(vitals.heartRate) < 45)) score += 2;
    if (vitals.temp && (Number(vitals.temp) > 38.5 || Number(vitals.temp) < 35.5)) score += 2;

    if (score >= 5 || vitals.status === 'Critical') {
        return { score: score || 6, label: `NEWS: ${score || 6} (High Risk)`, color: 'bg-rose-500 text-white border-rose-600 animate-pulse font-black shadow-sm' };
    }
    if (score >= 3 || vitals.status === 'Warning') {
        return { score: score || 3, label: `NEWS: ${score || 3} (Moderate)`, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 font-extrabold' };
    }
    return { score: score || 1, label: `NEWS: ${score || 1} (Low Risk)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-bold' };
};

export default function DoctorInpatientsPage() {
    const { getPath } = useTenantLink();
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { data: admissions = [], isLoading: loading } = useDoctorInpatients(user?.id, user?.role);

    useEffect(() => {
        if (admissions.length > 0) {
            console.log("[DoctorInpatients] Current Inpatients Sample Data:", {
                id: admissions[0].admissionId || admissions[0]._id,
                reason: admissions[0].reason,
                reasonForAdmission: admissions[0].reasonForAdmission,
                clinicalNotes: admissions[0].clinicalNotes,
                raw: admissions[0]
            });
        }
    }, [admissions]);

    const fetchAdmissions = useCallback(async () => {
        queryClient.invalidateQueries({ queryKey: ['doctor-inpatients'] });
    }, [queryClient]);

    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdmissionForCharge, setSelectedAdmissionForCharge] = useState<string | null>(null);
    const [selectedAdmissionForLedger, setSelectedAdmissionForLedger] = useState<string | null>(null);
    const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState<{ id: string; name: string } | null>(null);
    const [selectedAdmissionForRounding, setSelectedAdmissionForRounding] = useState<any>(null);
    const [roundingFilter, setRoundingFilter] = useState<'all' | 'pending' | 'rounded'>('all');
    const [roundTick, setRoundTick] = useState(0);
    const [viewType, setViewType] = useState<'list' | 'card'>('list');
    const [filters, setFilters] = useState({ type: '', room: '' });

    // ✅ REAL-TIME SYNC: Listen for updates
    useEffect(() => {
        let socketInstance: any;

        const setupSocket = async () => {
            socketInstance = await getSocket();
            if (socketInstance) {
                const performRoomJoin = async () => {
                    if (user) {
                        await joinSocketRoom({ role: user.role, userId: user.id, hospitalId: user.hospital });
                    }
                };
                if (socketInstance.connected) {
                    await performRoomJoin();
                }
                socketInstance.on('connect', performRoomJoin);

                socketInstance.on('ipd:bed_updated', (data: any) => {
                    console.log('📡 [Doctor] Bed Update Sync:', data);
                    fetchAdmissions(); // Trigger query refresh
                });
                socketInstance.on('vitals_updated', (data: any) => {
                    console.log('📡 [Doctor] Vitals Sync:', data);
                    fetchAdmissions();
                });
                socketInstance.on('doctoral_vital_alert', (data: any) => {
                    console.log('📡 [Doctor] Vital Alert Sync:', data);
                    fetchAdmissions();
                });
            }
        };

        setupSocket();
        return () => {
            if (socketInstance) {
                socketInstance.off('connect');
                socketInstance.off('ipd:bed_updated');
                socketInstance.off('vitals_updated');
                socketInstance.off('doctoral_vital_alert');
            }
        };
    }, [fetchAdmissions, user]);

    // ✅ Dynamic Filter Options Derived from Admissions
    const unitTypeOptions = Array.from(new Set(admissions.map(adm => adm.bed?.type).filter(Boolean))).sort();
    const availableRooms = Array.from(new Set(
        admissions
            .filter(adm => !filters.type || String(adm.bed?.type || '').toLowerCase() === filters.type.toLowerCase())
            .map(adm => adm.bed?.room)
            .filter(Boolean)
    )).sort();

    const todayStr = new Date().toISOString().split('T')[0];

    const filteredAdmissions = admissions.filter(adm => {
        const matchesSearch = adm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.admissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const bedType = String(adm.bed?.type || '').toLowerCase();
        const bedRoom = String(adm.bed?.room || '').toLowerCase();
        const filterType = String(filters.type || '').toLowerCase();
        const filterRoom = String(filters.room || '').toLowerCase();

        if (filterType && bedType !== filterType) return false;
        if (filterRoom && bedRoom !== filterRoom) return false;

        if (roundingFilter !== 'all') {
            const admId = adm._id || adm.id;
            const isRounded = localStorage.getItem(`ipd_rounded_${admId}_${todayStr}`) === 'true';
            if (roundingFilter === 'rounded' && !isRounded) return false;
            if (roundingFilter === 'pending' && isRounded) return false;
        }

        return true;
    });

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roundingFilter]);

    const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage);
    const paginatedAdmissions = filteredAdmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // ✅ Summary Stats Calculation
    const roundedTodayCount = admissions.filter(a => {
        const admId = a._id || a.id;
        return localStorage.getItem(`ipd_rounded_${admId}_${todayStr}`) === 'true';
    }).length;

    const stats = {
        total: admissions.length,
        critical: admissions.filter(a => a.vitals?.status === 'Critical' || a.vitals?.condition === 'Critical').length,
        abnormal: admissions.filter(a => a.vitals?.status === 'Warning' || (['Fair', 'Serious'].includes(a.vitals?.condition) && a.vitals?.status !== 'Critical')).length,
        rounded: roundedTodayCount,
        pendingRounds: admissions.length - roundedTodayCount
    };

    const getMonitoringStatus = (nextDue: string | Date | undefined) => {
        if (!nextDue) return { label: 'Scheduled', color: 'text-gray-400', isOverdue: false };
        const dueTime = new Date(nextDue).getTime();
        const now = Date.now();
        const diff = dueTime - now;

        if (diff < 0) {
            const mins = Math.abs(Math.floor(diff / 60000));
            return {
                label: `Overdue ${mins > 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`}`,
                color: 'text-rose-600 font-black animate-pulse',
                isOverdue: true
            };
        }

        const mins = Math.floor(diff / 60000);
        return {
            label: mins <= 0 ? 'Due Now' : `Due in ${mins > 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`}`,
            color: mins < 15 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold',
            isOverdue: false
        };
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Dynamic Header */}
            <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                
                {/* Top Row: Title, Action Button, Pagination */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Users className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                                SURVEILLANCE
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Active Assigned Inpatients
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchAdmissions}
                            className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0"
                            title="Refresh Data"
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>

                        {/* Pagination */}
                        {!loading && filteredAdmissions.length > 0 && (
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">
                                    <span className="text-gray-900 dark:text-white">Page {currentPage}</span> / {totalPages}
                                    <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">({filteredAdmissions.length} TOTAL)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-emerald-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                                    >
                                        <ChevronLeft size={12} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3 relative z-10">
                    
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                        <button
                            onClick={() => setViewType('list')}
                            className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-white dark:bg-[#111] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            title="List View"
                        >
                            <List size={12} />
                        </button>
                        <button
                            onClick={() => setViewType('card')}
                            className={`p-1.5 rounded-md transition-all ${viewType === 'card' ? 'bg-white dark:bg-[#111] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={12} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 w-full min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <input
                            type="text"
                            placeholder="Search by name, MRN, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>

                    {/* Filters Group */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        <select
                            className="w-full sm:w-auto px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, room: '' }))}
                        >
                            <option value="">Type</option>
                            {unitTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <select
                            className="w-full sm:w-auto px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                            value={filters.room}
                            onChange={(e) => setFilters(prev => ({ ...prev, room: e.target.value }))}
                        >
                            <option value="">Room</option>
                            {availableRooms.map(room => (
                                <option key={room} value={room}>{room}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ✅ ENHANCED STATS BAR: Moved below header for better spatial distribution */}
            {/* ✅ ENHANCED STATS BAR: 4 Columns with Morning Ward Rounding Census */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <SummaryCard
                    label="Active Assigned"
                    value={stats.total}
                    sub="Current Total"
                    color="blue"
                    icon={<Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                />
                <div
                    onClick={() => setRoundingFilter(roundingFilter === 'pending' ? 'all' : 'pending')}
                    className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${roundingFilter === 'pending'
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.02]'
                            : 'bg-white dark:bg-[#111] border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 shadow-sm'
                        }`}
                >
                    <div>
                        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider block ${roundingFilter === 'pending' ? 'text-emerald-100' : 'text-gray-400'}`}>
                            Morning Ward Rounds
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black">{stats.rounded}</span>
                            <span className={`text-xs font-bold ${roundingFilter === 'pending' ? 'text-emerald-200' : 'text-gray-400'}`}>/ {stats.total} Done</span>
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-bold uppercase mt-1 block ${roundingFilter === 'pending' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {stats.pendingRounds} Pending Rounds →
                        </span>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${roundingFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                        <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                    </div>
                </div>
                <SummaryCard
                    label="Critical Care"
                    value={stats.critical}
                    sub="Instant Attention"
                    color="rose"
                    icon={<Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                />
                <SummaryCard
                    label="Abnormal Vitals"
                    value={stats.abnormal}
                    sub="Outside Range"
                    color="amber"
                    icon={<Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                />
            </div>

            {/* ✅ CLINICAL ROUNDING TABS BAR */}
            <div className="flex items-center justify-between bg-white dark:bg-[#111] p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                    {[
                        { id: 'all', label: `All Patients (${stats.total})` },
                        { id: 'pending', label: `Pending Rounds (${stats.pendingRounds})`, alert: stats.pendingRounds > 0 },
                        { id: 'rounded', label: `Rounded Today (${stats.rounded})` }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setRoundingFilter(tab.id as any)}
                            className={`px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${roundingFilter === tab.id
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                        >
                            <span>{tab.label}</span>
                            {tab.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                        </button>
                    ))}
                </div>
                <span className="text-[10px] font-bold text-gray-400 px-2 italic hidden sm:block">
                    💡 Tip: Click any row or &quot;Round Chart&quot; to write daily SOAP notes & check vitals.
                </span>
            </div>

            {/* Content Section */}
            {viewType === 'list' ? (
                <div className="bg-white dark:bg-[#111] rounded-[0.5rem] border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Inpatient Details</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Room/Bed</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Monitoring</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Reason</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Primary Doctor</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Admission Info</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center italic text-gray-400 animate-pulse font-bold uppercase tracking-widest text-xs">
                                            Syncing Clinical Stream...
                                        </td>
                                    </tr>
                                ) : paginatedAdmissions.length > 0 ? (
                                    paginatedAdmissions.map((adm) => {
                                        const isCritical = adm.vitals?.status === 'Critical' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 90);
                                        const isAbnormal = isCritical || adm.vitals?.status === 'Warning' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 94);
                                        const monitor = getMonitoringStatus(adm.vitals?.nextVitalsDue);
                                        const news = calculateNEWS(adm.vitals);

                                        return (
                                            <tr
                                                key={adm._id}
                                                onClick={() => setSelectedAdmissionForRounding(adm)}
                                                className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group cursor-pointer"
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <Link onClick={(e) => e.stopPropagation()} href={getPath(`/doctor/patients/${adm.patient?._id || adm.patient?.id}`)} prefetch={true} className="flex items-center gap-3 group/item cursor-pointer">
                                                            <div className="relative shrink-0">
                                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-sm border border-emerald-200/50 dark:border-emerald-800/50">
                                                                    {adm.patient?.name?.[0] || 'P'}
                                                                </div>
                                                                {isAbnormal && (
                                                                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#111] ${isCritical ? 'bg-rose-600 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover/item:text-emerald-600 transition-colors">{adm.patient?.name}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">MRN: {adm.patient?.mrn || 'N/A'}</p>
                                                            </div>
                                                        </Link>
                                                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                            {adm.patient?.allergies?.length > 0 ? (
                                                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[7px] font-black uppercase">
                                                                    ⚠️ Allergy: {adm.patient.allergies[0]}
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[7px] font-bold uppercase">
                                                                    🛡️ No Allergies
                                                                </span>
                                                            )}
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[7px] font-black uppercase">
                                                                📋 Code: Full
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{adm.bed?.bedId || 'UNASSIGNED'}</span>
                                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{adm.bed?.type || 'STANDARD'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase font-black tracking-widest ${news.color}`}>
                                                            {news.label}
                                                        </span>
                                                        <span className={`text-[9px] uppercase font-black tracking-widest ${monitor.color}`}>
                                                            {monitor.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="w-[220px]">
                                                        <InpatientReason admission={adm} onSaved={() => fetchAdmissions()} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-xs font-black text-emerald-600 uppercase">
                                                        {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || 'NOT ASSIGNED'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ADM: {adm.admissionId}</span>
                                                        <span className="text-[9px] font-bold text-gray-500 italic">{calculateStayDuration(adm.createdAt)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end">
                                                        <ActionButtons
                                                            adm={adm}
                                                            onOpenRounding={() => setSelectedAdmissionForRounding(adm)}
                                                            onTransfer={() => setSelectedAdmissionForTransfer({ id: adm._id, name: adm.patient?.name })}
                                                            onCharge={() => setSelectedAdmissionForCharge(adm._id)}
                                                            onLedger={() => setSelectedAdmissionForLedger(adm._id)}
                                                            fetchAdmissions={fetchAdmissions}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center italic text-gray-400 font-bold uppercase tracking-widest">No patients found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="h-64 bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
                        ))
                    ) : paginatedAdmissions.length > 0 ? (
                        paginatedAdmissions.map((adm) => (
                            <InpatientCard
                                key={adm._id}
                                adm={adm}
                                onOpenRounding={() => setSelectedAdmissionForRounding(adm)}
                                onTransfer={() => setSelectedAdmissionForTransfer({ id: adm._id, name: adm.patient?.name })}
                                onCharge={() => setSelectedAdmissionForCharge(adm._id)}
                                onLedger={() => setSelectedAdmissionForLedger(adm._id)}
                                fetchAdmissions={fetchAdmissions}
                                getMonitoringStatus={getMonitoringStatus}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-[#111] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">No matching inpatients found</p>
                        </div>
                    )}
                </div>
            )}



            {/* Modals */}
            <InpatientRoundingModal
                isOpen={!!selectedAdmissionForRounding}
                onClose={() => setSelectedAdmissionForRounding(null)}
                admission={selectedAdmissionForRounding}
                onDischargeRequest={async (id) => {
                    const res = await ipdService.requestDischarge(id);
                    if (res) {
                        toast.success("Discharge requested");
                        fetchAdmissions();
                    }
                }}
                onTransferRequest={(id) => {
                    setSelectedAdmissionForRounding(null);
                    const adm = admissions.find(a => (a._id || a.id) === id);
                    setSelectedAdmissionForTransfer({ id, name: adm?.patient?.name || '' });
                }}
                onOpenPrescription={(adm) => {
                    router.push(getPath(`/doctor/prescription/create?patientId=${adm.patient?._id || adm.patient?.id}&admissionId=${adm.admissionId}`));
                }}
                onRoundStatusChange={() => setRoundTick(prev => prev + 1)}
            />
            <AddClinicalChargeModal
                isOpen={!!selectedAdmissionForCharge}
                onClose={() => setSelectedAdmissionForCharge(null)}
                admissionId={selectedAdmissionForCharge || ''}
            />
            <IPDBillingModal
                isOpen={!!selectedAdmissionForLedger}
                onClose={() => setSelectedAdmissionForLedger(null)}
                admissionId={selectedAdmissionForLedger || ''}
                hidePaymentActions={true}
            />
            <TransferRequestModal
                isOpen={!!selectedAdmissionForTransfer}
                onClose={() => setSelectedAdmissionForTransfer(null)}
                admissionId={selectedAdmissionForTransfer?.id || ''}
                patientName={selectedAdmissionForTransfer?.name || ''}
                onSuccess={fetchAdmissions}
            />
        </div>
    );
}

function ActionButtons({ adm, onOpenRounding, onTransfer, onCharge, onLedger, fetchAdmissions, variant = 'full' }: any) {
    const isCompact = variant === 'compact';
    const { getPath } = useTenantLink();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    if (isCompact) {
        return (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap relative">
                {/* Primary: Round Chart */}
                <button
                    onClick={(e) => { e.stopPropagation(); if (onOpenRounding) onOpenRounding(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 shrink-0"
                    title="Open Daily SOAP & Rounding Chart"
                >
                    <Stethoscope size={13} strokeWidth={2.5} />
                    <span>Round</span>
                </button>

                {/* Pending Status Badge (inline, replaces menu items) */}
                {adm.dischargeRequested && (
                    <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>DC Pending</span>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Revoke discharge request?")) {
                                    await ipdService.cancelDischargeRequest(adm._id);
                                    fetchAdmissions();
                                }
                            }}
                            className="p-0.5 rounded hover:bg-rose-600 hover:text-white transition-colors"
                            title="Revoke"
                        >
                            <X size={11} strokeWidth={3} />
                        </button>
                    </div>
                )}
                {adm.transferRequested && (
                    <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Transfer Pending</span>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Revoke transfer request?")) {
                                    await ipdService.cancelTransferRequest(adm._id);
                                    fetchAdmissions();
                                }
                            }}
                            className="p-0.5 rounded hover:bg-rose-600 hover:text-white transition-colors"
                            title="Revoke"
                        >
                            <X size={11} strokeWidth={3} />
                        </button>
                    </div>
                )}

                {/* ⋮ More Actions Dropdown */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all border border-gray-200 dark:border-gray-700"
                        title="More Actions"
                    >
                        <ClipboardList size={14} strokeWidth={2.5} />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl py-1 text-xs">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); router.push(getPath(`/doctor/prescription/create?patientId=${adm.patient?._id || adm.patient?.id}&admissionId=${adm.admissionId}`)); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-gray-700 dark:text-gray-200 font-bold transition-colors"
                                >
                                    <Pill size={14} className="text-emerald-600" strokeWidth={2} />
                                    <span>Write Orders / Rx</span>
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />
                                {!adm.dischargeRequested && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation(); setMenuOpen(false);
                                            const res = await ipdService.requestDischarge(adm._id);
                                            if (res) { toast.success("Discharge requested"); fetchAdmissions(); }
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-700 dark:text-gray-200 font-bold transition-colors"
                                    >
                                        <LogOut size={14} className="text-rose-500" strokeWidth={2} />
                                        <span>Request Discharge</span>
                                    </button>
                                )}
                                {!adm.transferRequested && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onTransfer(); }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-700 dark:text-gray-200 font-bold transition-colors"
                                    >
                                        <ArrowRightLeft size={14} className="text-amber-500" strokeWidth={2} />
                                        <span>Request Transfer</span>
                                    </button>
                                )}
                                <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCharge(); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-gray-700 dark:text-gray-200 font-bold transition-colors"
                                >
                                    <Receipt size={14} className="text-sky-600" strokeWidth={2} />
                                    <span>Add Charge</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onLedger(); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-gray-700 dark:text-gray-200 font-bold transition-colors"
                                >
                                    <History size={14} className="text-violet-600" strokeWidth={2} />
                                    <span>View Ledger</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Full Card View Variant
    const btnClass = "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-xs border";

    return (
        <div className="grid grid-cols-2 gap-2 w-full">
            <button
                onClick={(e) => { e.stopPropagation(); if (onOpenRounding) onOpenRounding(); }}
                className={`${btnClass} bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm col-span-2`}
                title="Open Daily SOAP Progress Notes & Rounding Chart"
            >
                <Stethoscope size={15} strokeWidth={2.5} />
                <span>Open Daily Rounding Chart</span>
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); router.push(getPath(`/doctor/prescription/create?patientId=${adm.patient?._id || adm.patient?.id}&admissionId=${adm.admissionId}`)); }}
                className={`${btnClass} bg-teal-700 hover:bg-teal-800 text-white border-teal-800 shadow-xs col-span-2`}
                title="CPOE: Orders & Prescriptions"
            >
                <Pill size={14} strokeWidth={2.5} />
                <span>Write Prescriptions & Orders</span>
            </button>

            {adm.dischargeRequested ? (
                <div className="flex items-center justify-between bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        <span>Discharge Pending</span>
                    </div>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Revoke discharge request?")) {
                                await ipdService.cancelDischargeRequest(adm._id);
                                fetchAdmissions();
                            }
                        }}
                        className="p-1 rounded bg-emerald-200 hover:bg-rose-600 hover:text-white text-emerald-800 transition-colors"
                        title="Revoke Discharge Request"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        const res = await ipdService.requestDischarge(adm._id);
                        if (res) {
                            toast.success("Discharge requested");
                            fetchAdmissions();
                        }
                    }}
                    className={`${btnClass} bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}
                    title="Initiate Clinical Discharge Summary"
                >
                    <LogOut size={13} strokeWidth={2.5} />
                    <span>Discharge</span>
                </button>
            )}

            {adm.transferRequested ? (
                <div className="flex items-center justify-between bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                        <span>Transfer Pending</span>
                    </div>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Revoke transfer request?")) {
                                await ipdService.cancelTransferRequest(adm._id);
                                fetchAdmissions();
                            }
                        }}
                        className="p-1 rounded bg-amber-200 hover:bg-rose-600 hover:text-white text-amber-800 transition-colors"
                        title="Revoke Transfer Request"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onTransfer(); }}
                    className={`${btnClass} bg-amber-50 text-amber-800 border-amber-300/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800`}
                    title="Initiate Floor Step-down / Transfer"
                >
                    <ArrowRightLeft size={13} strokeWidth={2.5} />
                    <span>Transfer</span>
                </button>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onCharge(); }}
                className={`${btnClass} bg-sky-50 text-sky-800 border-sky-300/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800`}
                title="Add Bedside Procedure / Charge"
            >
                <Receipt size={13} strokeWidth={2.5} />
                <span>Charge</span>
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onLedger(); }}
                className={`${btnClass} bg-violet-50 text-violet-800 border-violet-300/80 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800`}
                title="View Inpatient Financial & Clinical Ledger"
            >
                <History size={13} strokeWidth={2.5} />
                <span>Ledger</span>
            </button>
        </div>
    );
}

function InpatientCard({ adm, onOpenRounding, onTransfer, onCharge, onLedger, fetchAdmissions, getMonitoringStatus }: any) {
    const { getPath } = useTenantLink();
    const isCritical = adm.vitals?.status === 'Critical' || (adm.vitals?.spO2 && Number(adm.vitals.spO2) < 90);
    const monitor = getMonitoringStatus(adm.vitals?.nextVitalsDue);
    const news = calculateNEWS(adm.vitals);

    return (
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between relative overflow-hidden">
            {/* Acuity Bar Indicator */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isCritical ? 'bg-rose-600 animate-pulse' : news.score >= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} />

            <div>
                <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                    <Link href={getPath(`/doctor/patients/${adm.patient?._id || adm.patient?.id}`)} prefetch={true} className="flex items-center gap-3 shrink-0 group/link">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-xl border border-slate-200 dark:border-slate-700 group-hover/link:scale-105 transition-transform">
                            {adm.patient?.name?.[0] || 'P'}
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover/link:text-emerald-600 transition-colors">{adm.patient?.name}</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">MRN: {adm.patient?.mrn || 'N/A'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200/50 uppercase">
                                    {adm.bed?.bedId || 'BED'}
                                </span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase">{adm.bed?.type || 'WARD'}</span>
                            </div>
                        </div>
                    </Link>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] uppercase font-black tracking-widest ${news.color}`}>
                            {news.label}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Stay: {calculateStayDuration(adm.createdAt)}</span>
                    </div>
                </div>

                {/* Patient Clinical Safety Pills */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {adm.patient?.allergies?.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[7px] font-black uppercase tracking-tight">
                            ⚠️ Allergy: {adm.patient.allergies[0]}
                        </span>
                    ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[7px] font-bold uppercase tracking-tight">
                            🛡️ No Known Allergies
                        </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[7px] font-black uppercase tracking-tight">
                        📋 Code: Full
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-[7px] font-black uppercase tracking-tight">
                        🍽️ Diet: Standard
                    </span>
                </div>

                <div className="mb-3">
                    <InpatientReason admission={adm} onSaved={() => fetchAdmissions()} />
                </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 mt-auto">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Clinical Surveillance</span>
                    <span className={`text-[9px] uppercase font-black tracking-widest ${monitor.color}`}>
                        {monitor.label}
                    </span>
                </div>
                <ActionButtons
                    adm={adm}
                    onOpenRounding={onOpenRounding}
                    onTransfer={onTransfer}
                    onCharge={onCharge}
                    onLedger={onLedger}
                    fetchAdmissions={fetchAdmissions}
                    variant="full"
                />
            </div>
        </div>
    );
}

function SummaryCard({ label, value, sub, color, icon }: any) {
    const colorClasses: any = {
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
    };

    return (
        <div className="bg-white dark:bg-[#111] p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl md:rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-2 sm:gap-0">
            <div className="space-y-0.5 w-full">
                <div className="flex items-center justify-between w-full">
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5 sm:mb-1 pr-1">{label}</p>
                    <div className={`w-6 h-6 rounded-lg flex shrink-0 items-center justify-center transition-all group-hover:scale-110 shadow-inner ${colorClasses[color]} block sm:hidden`}>
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col xl:flex-row xl:items-baseline gap-0.5 xl:gap-2">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{value}</h3>
                    <p className="text-[6px] sm:text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-tight">{sub}</p>
                </div>
            </div>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl shrink-0 items-center justify-center transition-all group-hover:scale-110 shadow-inner ${colorClasses[color]} hidden sm:flex`}>
                {icon}
            </div>
        </div>
    );
}

function InpatientReason({ admission, onSaved }: { admission: any, onSaved: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [reason, setReason] = useState(admission?.reasonForAdmission || admission?.reason || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!reason.trim()) return;
        setSaving(true);
        try {
            await ipdService.updateAdmissionDetails(admission._id, { reason });
            toast.success("Principal diagnosis updated");
            setIsEditing(false);
            onSaved();
        } catch (error) {
            toast.error("Failed to update diagnosis");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const displayText = admission?.reasonForAdmission || admission?.reason || 'No Principal Diagnosis Recorded';

    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 group/diag transition-colors">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Stethoscope size={12} className="text-emerald-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Principal Diagnosis / Problem</span>
                </div>
                {!isEditing && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="opacity-60 group-hover/diag:opacity-100 p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded transition-all"
                        title="Edit Diagnosis"
                    >
                        <Pencil size={11} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="flex items-start gap-2 mt-1.5">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white dark:bg-[#111] border border-emerald-500/80 rounded-lg p-2 text-xs font-bold text-gray-900 dark:text-white outline-none min-h-[40px] resize-none shadow-inner"
                        placeholder="Enter primary ICD-10 diagnosis or clinical reason..."
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-50"
                            title="Save Diagnosis"
                        >
                            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditing(false); setReason(admission?.reasonForAdmission || admission?.reason || ''); }}
                            disabled={saving}
                            className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 rounded-md transition-colors disabled:opacity-50"
                            title="Cancel"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 leading-snug break-words" title={displayText}>
                    {displayText}
                </p>
            )}
        </div>
    );
}
