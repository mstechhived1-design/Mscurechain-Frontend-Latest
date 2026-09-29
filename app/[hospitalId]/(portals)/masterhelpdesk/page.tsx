'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Activity,
    Users,
    UserPlus,
    Calendar,
    Clock,
    Search,
    ChevronRight,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    ArrowRight,
    CalendarCheck,
    Stethoscope,
    Filter,
    Plus,
    Loader2,
    Hospital,
    CreditCard,
    Zap,
    LayoutDashboard,
    ClipboardList,
    AlertCircle,
    Smartphone,
    Thermometer,
    Shield,
    X
} from "lucide-react";
import { helpdeskService, adminService, doctorService, MASTER_HELPDESK_ENDPOINTS, useMasterDashboard } from "@/lib/integrations";
import { apiClient } from "@/lib/integrations/api";
import type { HelpdeskDoctor, Appointment } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
    totalPatients: number;
    todayPatients: number;
    completedAppointments: number;
    onlineRevenue: number;
    offlineRevenue: number;
    totalRevenue: number;
    onlineCount: number;
    offlineCount: number;
    emergencyPatients: number;
    hospitalName?: string;
}

const isSameDay = (d1: any, d2: any) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

// ── Components ──────────────────────────────────────────────────────────────

const CountdownTimer = React.memo(({ targetDate, startTime }: { targetDate: string | Date; startTime: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        const calculate = () => {
            try {
                if (!targetDate || !startTime) {
                    setTimeLeft("N/A");
                    return;
                }

                const [time, modifier] = startTime.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;

                const target = new Date(targetDate);
                target.setHours(hours, minutes, 0, 0);

                const now = new Date();
                const diff = target.getTime() - now.getTime();

                if (diff <= 0) {
                    if (diff > -15 * 60 * 1000) { // 15 mins buffer
                        setTimeLeft("IN PROGRESS");
                    } else {
                        setTimeLeft("PASSED");
                    }
                    return;
                }

                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeLeft(
                    `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`
                );
            } catch (e) {
                setTimeLeft("N/A");
            }
        };

        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [targetDate, startTime]);

    if (timeLeft === "IN PROGRESS") return <span className="text-emerald-500 font-black animate-pulse text-[8px] md:text-[10px] uppercase tracking-wider">IN PROGRESS</span>;
    if (timeLeft === "PASSED") return <span className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">COMPLETED</span>;

    return (
        <span className="text-teal-600 font-black flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
            {timeLeft}
        </span>
    );
});

const StatCard = React.memo(function StatCard({
    icon,
    title,
    value,
    trend,
    color,
    path,
    showFilter,
    filterValue,
    onFilterChange
}: {
    icon: React.ReactElement<{ size?: number; strokeWidth?: number }>;
    title: string;
    value: string | number;
    trend?: string;
    color: 'teal' | 'slate' | 'rose' | 'emerald';
    path?: string;
    showFilter?: boolean;
    filterValue?: 'all' | 'online' | 'offline';
    onFilterChange?: (val: 'all' | 'online' | 'offline') => void;
}) {
    const router = useRouter();
    const colors = {
        teal: "bg-teal-600 text-white shadow-teal-500/10",
        slate: "bg-slate-900 text-white shadow-slate-900/10",
        rose: "bg-rose-600 text-white shadow-rose-500/10",
        emerald: "bg-emerald-600 text-white shadow-emerald-500/10"
    };

    return (
        <div
            onClick={() => path && !showFilter && router.push(path)}
            className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group flex flex-col gap-3 transition-all duration-200 ${path && !showFilter ? 'cursor-pointer hover:border-teal-500/30 hover:shadow-md' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]} group-hover:scale-110 shadow-lg transition-transform`}>
                    {React.cloneElement(icon, { size: 18, strokeWidth: 3 })}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {showFilter ? (
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
                            {['all', 'online', 'offline'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFilterChange?.(mode as any);
                                    }}
                                    className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${filterValue === mode
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase border border-teal-100">
                            <Activity size={8} /> Live
                        </div>
                    )}
                </div>
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-black text-slate-900 tabular-nums tracking-tighter">{value}</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{trend}</p>
                        {path && showFilter && (
                            <button
                                onClick={() => router.push(path)}
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-teal-600 transition-all"
                            >
                                <ArrowRight size={10} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ── Modal Components ────────────────────────────────────────────────────────

const OnlineAdmissionsTable = React.memo(({ appointments, onCheckIn }: { appointments: any[], onCheckIn: (apt: any) => void }) => {
    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-left">
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Identity</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment Manifest</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attending Physician</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Verification Status</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.length > 0 ? (
                        appointments.map((apt, idx) => (
                            <tr key={apt.id || idx} className="group/row cursor-pointer">
                                <td className="bg-slate-50 border-y border-l border-slate-100 rounded-l-[20px] px-6 py-4 transition-all group-hover/row:bg-teal-50/50 group-hover/row:border-teal-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-extrabold group-hover/row:bg-teal-600 group-hover/row:text-white transition-all">
                                            {sanitizePatientName(apt.patientName)?.[0]}
                                        </div>
                                        <div>
                                            <div className="text-slate-900 text-xs font-black uppercase tracking-tight">{sanitizePatientName(apt.patientName || apt.patient?.name || apt.patientDetails?.name)}</div>
                                            <div className="text-slate-400 text-[9px] font-bold uppercase mt-0.5">{apt.mrn || apt.patient?.mrn || apt.patientDetails?.mrn || 'MOB-PENDING'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="bg-slate-50 border-y border-slate-100 px-6 py-4 group-hover/row:bg-teal-50/50 group-hover/row:border-teal-200">
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className="text-teal-600" />
                                        <div>
                                            <div className="text-slate-900 text-xs font-black">{apt.time}</div>
                                            <div className="text-[9px] font-bold mt-0.5 uppercase flex items-center gap-2">
                                                <CountdownTimer
                                                    targetDate={apt.date}
                                                    startTime={apt.startTime || apt.time.split(' - ')[0]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="bg-slate-50 border-y border-slate-100 px-6 py-4 group-hover/row:bg-teal-50/50 group-hover/row:border-teal-200">
                                    <div className="flex items-center gap-3">
                                        <Stethoscope size={14} className="text-teal-600" />
                                        <span className="text-slate-600 text-xs font-black uppercase">{apt.doctorName ? `DR. ${apt.doctorName}` : "UNASSIGNED"}</span>
                                    </div>
                                </td>
                                <td className="bg-slate-50 border-y border-r border-slate-100 rounded-r-[20px] px-6 py-4 text-right group-hover/row:bg-teal-50/50 group-hover/row:border-teal-200">
                                    <div className="flex items-center justify-end gap-3">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-teal-600 text-[9px] font-black uppercase tracking-widest shadow-sm group-hover/row:border-teal-300">
                                            <CheckCircle2 size={12} className="text-teal-500" />
                                            {apt.status}
                                        </div>

                                        {['booked', 'confirmed', 'arrived', 'pending'].includes(apt.status?.toLowerCase()) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCheckIn(apt);
                                                }}
                                                className={`flex items-center gap-2 ${apt.status?.toLowerCase() === 'booked' ? 'bg-teal-600 shadow-teal-500/20' : 'bg-slate-900 shadow-slate-900/20'} text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95`}
                                            >
                                                {apt.status?.toLowerCase() === 'booked' ? <Activity size={12} /> : <CheckCircle2 size={12} className="text-teal-400" />}
                                                {apt.status?.toLowerCase() === 'booked' ? 'Admission' : 'Edit Admission'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="py-24 text-center bg-slate-50/10 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
                                        <Smartphone size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-slate-300 text-[11px] font-black uppercase tracking-[0.4em]">No Online Admissions Found</p>
                                    <p className="text-slate-400 text-[9px] font-bold uppercase mt-2 tracking-widest">Digital queue is clear</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});

const PhysicianMonitor = React.memo(({ doctors, hospitalId, appointments }: { doctors: any[], hospitalId: string, appointments: any[] }) => {
    const router = useRouter();

    const handleDoctorClick = (doctorId: string) => {
        const today = new Date().toISOString().split('T')[0];
        router.push(`/${hospitalId}/masterhelpdesk/appointments?doctorId=${doctorId}&startDate=${today}&endDate=${today}`);
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Stethoscope size={14} className="text-teal-600" /> Physician Load Monitor
                </h2>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {doctors.map((doc, idx) => (
                    <div 
                        key={doc._id} 
                        onClick={() => handleDoctorClick(doc._id)}
                        className="p-3.5 rounded-2xl hover:bg-teal-50/50 border border-transparent hover:border-teal-100 transition-all group cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg overflow-hidden group-hover:scale-105 transition-transform">
                                    {(doc.user?.name || doc.name).charAt(0)}
                                </div>
                                {(idx % 3 === 0) && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-500 border-2 border-white rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase truncate">Dr. {doc.user?.name || doc.name}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{doc.specialties?.[0] || 'Clinician'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-900 leading-none">
                                    {appointments.filter(a => 
                                        (a.doctorId === doc._id || a.doctor?._id === doc._id) && 
                                        isSameDay(a.date, new Date())
                                    ).length}
                                </p>
                                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Waiting</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => router.push(`/${hospitalId}/masterhelpdesk/doctors`)} className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline flex items-center justify-center gap-1">
                    Full Roster Access <ArrowUpRight size={10} />
                </button>
            </div>
        </div>
    );
});

export default function MasterDashboard() {
    const params = useParams() as any;
    const router = useRouter();
    const hospitalId = params.hospitalId as string;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        todayPatients: 0,
        completedAppointments: 0,
        onlineRevenue: 0,
        offlineRevenue: 0,
        totalRevenue: 0,
        onlineCount: 0,
        offlineCount: 0,
        emergencyPatients: 0,
    });

    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOnlineDate, setSelectedOnlineDate] = useState(new Date().toDateString());
    const [protocolFilter, setProtocolFilter] = useState<'all' | 'online' | 'offline'>('all');

    // ── Data Fetching ───────────────────────────────────────────────────────
    const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useMasterDashboard(hospitalId);

    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        try {
            const [docs, profile] = await Promise.all([
                helpdeskService.getDoctors(),
                helpdeskService.getMasterMe()
            ]);

            const docList = Array.isArray(docs) ? docs : (docs?.doctors || docs?.data || []);
            setDoctors(docList);

            if (dashboardData) {
                const aptList = dashboardData.appointments || [];
                setStats({
                    totalPatients: dashboardData.stats?.totalPatients || 0,
                    todayPatients: dashboardData.stats?.todayAppointments || 0,
                    completedAppointments: dashboardData.stats?.completed || 0,
                    onlineRevenue: dashboardData.stats?.onlineRevenue || 0,
                    offlineRevenue: dashboardData.stats?.offlineRevenue || 0,
                    totalRevenue: dashboardData.stats?.revenue || 0,
                    onlineCount: dashboardData.stats?.onlineAppointments || 0,
                    offlineCount: dashboardData.stats?.offlineAppointments || 0,
                    emergencyPatients: dashboardData.stats?.emergencyPatients || 0,
                    hospitalName: profile?.hospital?.name
                });
                setAppointments(aptList);
            }
        } catch (err) {
            console.error("Dashboard Sync Error:", err);
            toast.error("Failed to synchronize global dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dashboardData]);

    useEffect(() => {
        loadData();
    }, [loadData, dashboardData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchDashboard(), loadData(true)]);
        setRefreshing(false);
    };

    const filteredStats = useMemo(() => {
        const today = new Date();
        const todayApts = appointments.filter(a => isSameDay(a.date, today));

        let filteredToday = todayApts;
        if (protocolFilter === 'online') filteredToday = todayApts.filter(a => a.isOnline);
        if (protocolFilter === 'offline') filteredToday = todayApts.filter(a => !a.isOnline);

        const completed = filteredToday.filter(a => a.status?.toLowerCase() === 'completed');

        // Sync revenue with protocol filter
        let revenue = stats.totalRevenue;
        if (protocolFilter === 'online') revenue = stats.onlineRevenue;
        if (protocolFilter === 'offline') revenue = stats.offlineRevenue;

        // Sync counts with backend if possible, or fallback to filteredToday
        let count = filteredToday.length;
        if (protocolFilter === 'online') count = stats.onlineCount || filteredToday.length;
        if (protocolFilter === 'offline') count = stats.offlineCount || filteredToday.length;

        return {
            today: count,
            completed: completed.length,
            revenue: revenue
        };
    }, [appointments, protocolFilter, stats]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleCheckIn = useCallback((apt: any) => {
        router.push(`/${hospitalId}/masterhelpdesk/admission/${apt._id || apt.id}`);
    }, [hospitalId, router]);


    // ── Filtering ──────────────────────────────────────────────────────────
    const { offlineAppointments, onlineAppointments } = useMemo(() => {
        // Filter for the bottom "Appointment Ledger" — OFFLINE only
        const offlineFiltered = appointments.filter(apt => {
            const isAptOnline = apt.isOnline || (apt as any).source === "online" || apt.type?.toLowerCase() === 'online' || apt.bookingSource?.toLowerCase() === 'online';
            // Only offline appointments in Session Live / History Registry
            if (isAptOnline) return false;

            const patientNameStr = apt.patientName || apt.patient?.name || apt.patientDetails?.name || "";
            const matchesSearch = !searchQuery || patientNameStr.toLowerCase().includes(searchQuery.toLowerCase()) || apt.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) || apt.patient?.mrn?.toLowerCase().includes(searchQuery.toLowerCase());
            const status = (apt.status || "").toLowerCase();
            const matchesTab = activeTab === 'active'
                ? ['confirmed', 'in-progress', 'booked', 'pending', 'arrived', 'waiting', 'scheduled'].includes(status)
                : ['completed', 'cancelled'].includes(status);
            return matchesSearch && matchesTab;
        });

        // Filter for the top "Digital Front Door" (Online)
        const onlineFiltered = appointments.filter(apt => {
            const isAptOnline = apt.isOnline || (apt as any).source === "online" || apt.type?.toLowerCase() === 'online' || apt.bookingSource?.toLowerCase() === 'online';
            if (!isAptOnline) return false;
            // Sync with global protocol filter
            if (protocolFilter === 'offline') return false;

            const patientNameStr = apt.patientName || apt.patient?.name || apt.patientDetails?.name || "";
            const matchesSearch = !searchQuery || patientNameStr.toLowerCase().includes(searchQuery.toLowerCase()) || apt.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) || apt.patient?.mrn?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = isSameDay(apt.date, selectedOnlineDate);
            return matchesSearch && matchesDate;
        });

        return {
            offlineAppointments: offlineFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            onlineAppointments: onlineFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [appointments, searchQuery, activeTab, selectedOnlineDate, protocolFilter]);

    const displayAppointments = offlineAppointments;

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await helpdeskService.updateAppointmentStatus(id, status);
            toast.success(`Session ${status}`);
            loadData(true);
        } catch {
            toast.error("Update failed");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-teal-600" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastering Command Dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Admission Modal Overlay */}

            <style jsx global>{`
                @keyframes pulse-ring {
                    0% { transform: scale(0.33); }
                    80%, 100% { opacity: 0; }
                }
                .dot-notify { position: relative; }
                .dot-notify::after {
                    content: '';
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    top: -1px;
                    right: -1px;
                    box-shadow: 0 0 0 2px white;
                    animation: pulse-ring 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
                }
                @keyframes glow { 0%, 100% { text-shadow: 0 0 5px rgba(13,148,136,.5); opacity: 1; } 50% { text-shadow: 0 0 10px rgba(13,148,136,.8); opacity: .8; } }
            `}</style>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Frontdesk Dashboard <span className="text-[10px] bg-slate-900 text-white px-3 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">Master Oversight</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        {stats.hospitalName || "Protocol Hospital"} • LIVE REGISTRY MONITORING
                        {refreshing && <Loader2 size={10} className="animate-spin text-teal-500" />}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Clock className="text-teal-500" size={14} />
                        <span className="text-[10px] font-black text-slate-500">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button onClick={() => router.push(`/${hospitalId}/masterhelpdesk/registration`)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                        <UserPlus size={14} /> New Admission
                    </button>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users />} title="Total Registries" value={stats.totalPatients} color="slate" />
                <StatCard icon={<CalendarCheck />} title="Today's Sessions" value={stats.todayPatients} color="teal" />
        
                <StatCard icon={<CheckCircle2 />} title="Completed Manifests" value={stats.completedAppointments} color="emerald" />
            </div>

            {/* ONLINE APPOINTMENTS SECTION - LIST VIEW & FILTERS */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                    <Zap size={240} className="text-teal-600" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
                                <Smartphone size={24} className="text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-slate-900 text-lg md:text-xl lg:text-xl font-bold uppercase tracking-tighter">
                                    Digital Front Door: <span className="text-teal-600">Online Admissions</span>
                                </h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                                    Total Synchronized: {onlineAppointments.length} Active Records {protocolFilter === 'offline' && <span className="text-rose-500 ml-2 font-black">• FILTERED BY OFFLINE</span>}
                                </p>
                            </div>
                        </div>

                        {/* 7-Day Date Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() + i);
                                const dateStr = d.toDateString();
                                const isSelected = selectedOnlineDate === dateStr;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedOnlineDate(dateStr)}
                                        className={`flex flex-col items-center min-w-[60px] py-1.5 px-3 rounded-2xl border transition-all active:scale-95 ${isSelected
                                                ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/20'
                                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-teal-200 hover:text-teal-600'
                                            }`}
                                    >
                                        <span className="text-[7px] font-black uppercase tracking-widest">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <span className="text-sm font-black mt-0.5">{d.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Table-like List */}
                    <OnlineAdmissionsTable
                        appointments={onlineAppointments}
                        onCheckIn={handleCheckIn}
                    />

                    {/* Proper Pagination */}
                    <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Showing {onlineAppointments.length} active admissions
                        </p>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all active:scale-95">
                                <ArrowRight size={14} className="rotate-180" />
                            </button>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3].map(p => (
                                    <button key={p} className={`w-8 h-8 rounded-xl text-[10px] font-black border transition-all ${p === 1 ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <button className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:bg-teal-600 hover:text-white transition-all active:scale-95">
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* DOCTOR QUEUE TRACKER */}
                <div className="lg:col-span-4 space-y-4">
                    <PhysicianMonitor doctors={doctors} hospitalId={hospitalId} appointments={appointments} />
                </div>

                {/* APPOINTMENT LEDGER DISPLAY */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col h-[500px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
                                <button onClick={() => setActiveTab('active')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Session Live</button>
                                <button onClick={() => setActiveTab('history')} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>History Registry</button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="SEARCH PATIENT MRN / NAME..."
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none focus:border-teal-500 w-full sm:w-64 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {displayAppointments.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {displayAppointments.map((apt: any, idx) => {
                                        const patientName = sanitizePatientName(apt.patient?.name || apt.patientDetails?.name || apt.patientName);
                                        const mrn = apt.mrn || apt.patient?.mrn || (apt as any).patientDetails?.mrn || 'MRN-PENDING';
                                        const age = apt.age || (apt as any).patient?.age || (apt as any).patientDetails?.age || '--';
                                        const gender = apt.gender || (apt as any).patient?.gender || (apt as any).patientDetails?.gender || '--';

                                        return (
                                            <div key={apt._id || idx} className="group p-4 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 relative">
                                                        {patientName.charAt(0)}
                                                        {(apt as any).type === 'EMERGENCY' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{patientName}</h4>
                                                            {(() => {
                                                                const aptType = (apt as any).type?.toLowerCase() || '';
                                                                const isMobileOnline = ['consultation', 'follow-up', 'follow up', 'routine', 'online'].includes(aptType);
                                                                const isEmergency = aptType === 'emergency';
                                                                return (
                                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase border ${isMobileOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            isEmergency ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                                'bg-teal-50 text-teal-600 border-teal-100'
                                                                        }`}>
                                                                        {isMobileOnline ? 'Online' : ((apt as any).type || 'OPD')}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{mrn}</p>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{age}Y • {gender}</p>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{apt.doctorName || 'General Staff'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-6 h-full">
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5 mb-1">
                                                            <Clock size={10} className="text-teal-500" />
                                                            <CountdownTimer
                                                                targetDate={apt.date}
                                                                startTime={apt.startTime || apt.appointmentTime || "09:00 AM"}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{apt.appointmentTime || 'Scheduled'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {['confirmed', 'booked', 'pending', 'arrived', 'waiting'].includes(apt.status?.toLowerCase()) && (
                                                            <button 
                                                                onClick={() => handleCheckIn(apt)} 
                                                                className={`px-4 py-2 ${apt.status?.toLowerCase() === 'booked' ? 'bg-teal-600' : 'bg-slate-900'} text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg`}
                                                            >
                                                                {apt.status?.toLowerCase() === 'booked' ? 'Admission' : 'Edit Admission'}
                                                            </button>
                                                        )}
                                                        {['confirmed', 'in-progress', 'booked', 'pending', 'arrived', 'waiting'].includes(apt.status?.toLowerCase()) ? (
                                                            <button onClick={() => apt._id && handleUpdateStatus(apt._id, 'completed')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">Finalize</button>
                                                        ) : (
                                                            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                                {apt.status}
                                                            </div>
                                                        )}
                                                        <button onClick={() => router.push(`/${hospitalId}/masterhelpdesk/appointment-booking?patientId=${apt.patientId || apt.patient?._id}&type=${apt.type || 'OPD'}`)} className="p-2 bg-slate-100 text-slate-400 hover:text-teal-600 rounded-xl transition-all">
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 opacity-50 p-20">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                        <Activity size={24} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Everything is synchronized</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Frontdesk Dashboard Matrix v2.0</p>
                            <button onClick={() => router.push(`/${hospitalId}/masterhelpdesk/appointments`)} className="text-[8px] font-black text-teal-600 uppercase tracking-[0.2em] hover:underline flex items-center gap-1">
                                View Full Clinical Ledger <ArrowRight size={10} />
                            </button>
                        </div>
                </div>
            </div>
            </div>

            {/* PROMOTIONAL BANNER */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-xl relative overflow-hidden group mt-6">
                {/* Decorative Elements */}
                <div className="absolute right-0 top-0 text-indigo-500/10 -translate-y-1/4 translate-x-1/4 group-hover:scale-110 transition-transform duration-700">
                    <Shield size={200} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left space-y-2">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-teal-500/20">
                            <Activity size={10} />
                            Institutional Growth
                        </div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                            Expand Your Hospital’s Digital Ecosystem
                        </h2>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-medium max-w-lg">
                            Looking for specialized modules? Our platform offers integrated portals for Lab, 
                            Pharmacy, and Advanced IPD Billing.
                        </p>
                    </div>

                    <a 
                        href="https://www.mscurechain.com/portals" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group/btn flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] hover:bg-teal-500 hover:text-white transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        Explore More Portals
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        </div>
    );
}
