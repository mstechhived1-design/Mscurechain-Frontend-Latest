"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Calendar, Users, TrendingUp, Bell, ArrowRight, Activity, Clock, FileText, LayoutDashboard, ClipboardList, Briefcase, PlusCircle, UserCheck, HeartPulse, CalendarClock, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';
import QuickNotesInput from './QuickNotesInput';
import DoctorNotesList from './DoctorNotesList';
import AppointmentsQueueDynamic from './AppointmentsQueueDynamic';
import DoctorStatsCards from './DoctorStatsCards';
import EstimatedWaitCard from './EstimatedWaitCard';
import DoctorDashboardCharts from './DoctorDashboardCharts';
import DoctorIncomeStatsCard from './DoctorIncomeStatsCard';
import { AttendanceButton } from '@/components/attendance/AttendanceButton';
import { useTenantLink } from "@/hooks/useTenantLink";

interface DoctorDashboardContainerProps {
    doctorName: string;
    stats: {
        totalPatients: number;
        activeInpatients: number;
        appointmentsToday: number;
        totalPendingQueue?: number;
        pendingReports: number;
        consultationsValue: number;
    };
    chartData: any[];
    initialNotes: any[];
    consultationDuration: number;
    recentPatients?: any[];
}

function DoctorDashboardContainer({
    doctorName,
    stats,
    chartData,
    initialNotes,
    consultationDuration,
    recentPatients = []
}: DoctorDashboardContainerProps) {
    const router = useRouter();
    const [dynamicStats, setDynamicStats] = useState(stats);
    const [queueStats, setQueueStats] = useState({
        queueCount: 0,
        totalAppointments: 0,
        completedCount: 0,
        estimatedMinutes: 0,
        showQueue: true,
        nextAppointmentId: null as string | null,
        currentAppointmentId: null as string | null
    });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isUpdating, setIsUpdating] = useState(false);
    const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'opd' | 'ipd'>('all');

    // Auto-refresh to show live updates
    React.useEffect(() => {
        const interval = setInterval(() => {
            setIsUpdating(true);
            setLastUpdated(new Date());
            setTimeout(() => setIsUpdating(false), 1000);
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const handleNextPatient = () => {
        if (queueStats.nextAppointmentId) {
            toast.success('Navigating to next patient...');
            router.push(getPath(`/doctor/prescription?appointmentId=${queueStats.nextAppointmentId}`));
        } else {
            toast.error('No patients in queue');
        }
    };

    const handleQueueStatsChange = useCallback((newStats: any) => {
        setQueueStats(newStats);
        if (newStats.overallStats) {
            setDynamicStats(newStats.overallStats);
        }
    }, []);

    const { getPath } = useTenantLink();

    // Shortcuts Grid
    const shortcuts = React.useMemo(() => [
        {
            href: "/doctor/patients",
            icon: <UserCheck className="text-blue-500" />,
            label: "All Patients",
            sub: "History & Records"
        },
        {
            href: "/doctor/inpatients",
            icon: <HeartPulse className="text-emerald-500" />,
            label: "Inpatients",
            sub: "Ward Surveillance"
        },
        {
            href: "/doctor/leaves",
            icon: <CalendarClock className="text-amber-500" />,
            label: "My Leaves",
            sub: "Schedule Planning"
        },
        {
            href: "/doctor/support",
            icon: <LifeBuoy className="text-rose-500" />,
            label: "Helpdesk",
            sub: "Support & Queries"
        }
    ], []);

    return (
        <div className="space-y-3 sm:space-y-4 md:space-y-6 pt-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-card p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme">
                <div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tight">
                            Welcome, {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="shrink-0">
                        <AttendanceButton userRole="doctor" compact />
                    </div>
                    <button
                        onClick={handleNextPatient}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-primary-theme text-primary-theme-foreground text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                        <User size={14} className="sm:size-[16px]" /> Next Patient
                    </button>
                </div>
            </div>

            {/* Stats Cards Section */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
                <div className="xl:col-span-9 h-full">
                    <DoctorStatsCards 
                        stats={dynamicStats} 
                        visitTypeFilter={visitTypeFilter}
                        onTypeChange={setVisitTypeFilter}
                    />
                </div>
                <div className="xl:col-span-3 h-full">
                    <DoctorIncomeStatsCard />
                </div>
            </div>

            {/* Queue Section */}
            <div className="grid grid-cols-1 gap-4 md:gap-6">
                {/* Appointments Queue */}
                <div className="h-[450px] sm:h-[550px] md:h-[600px]">
                    <AppointmentsQueueDynamic
                        onStatsChange={handleQueueStatsChange}
                        consultationDuration={consultationDuration}
                        visitTypeFilter={visitTypeFilter}
                        setVisitTypeFilter={setVisitTypeFilter}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Analysis & Shortcuts */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Shortcuts Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {shortcuts.map((shortcut) => (
                            <ShortcutCard
                                key={shortcut.href}
                                href={getPath(shortcut.href)}
                                icon={shortcut.icon}
                                label={shortcut.label}
                                sub={shortcut.sub}
                            />
                        ))}
                    </div>

                    {/* Chart: Patient Flow */}
                    <div className="bg-card p-6 rounded-2xl border border-border-theme shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-base font-bold text-foreground">Patient Flow Analysis</h3>
                                <p className="text-xs text-muted font-medium">Trends for the current week</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-primary-theme" />
                                <span className="text-[10px] font-bold text-muted uppercase">Consultations</span>
                            </div>
                        </div>
                        <div className="h-[280px]">
                            <DoctorDashboardCharts type="area" data={chartData} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Patients & Announcements */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Recent Patients */}
                    <div className="bg-card rounded-2xl border border-border-theme shadow-sm flex flex-col h-full">
                        <div className="p-5 border-b border-border-theme flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Recent Patients seen</h3>
                            <Link href={getPath("/doctor/patients")} className="text-[10px] font-black text-primary-theme uppercase tracking-widest hover:underline">View All</Link>
                        </div>
                        <div className="p-2 space-y-1">
                            {recentPatients.length > 0 ? recentPatients.slice(0, 5).map((p: any) => (
                                <div key={p.id || p._id} className="p-3 hover:bg-secondary-theme rounded-xl transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-theme/10 flex items-center justify-center text-primary-theme text-xs font-black">
                                            {p.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{p.name}</p>
                                            <p className="text-[10px] text-muted font-medium">{p.email || p.mobile}</p>
                                        </div>
                                    </div>
                                    <Link href={getPath(`/doctor/patients/${p.id || p._id}`)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary-theme/10 rounded-lg text-primary-theme transition-all">
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            )) : (
                                <div className="p-10 text-center">
                                    <p className="text-xs text-muted font-bold italic">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Notes & Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left: Quick Notes & Stats */}
                <div className="space-y-4 md:space-y-6">
                    {/* Quick Notes */}
                    <QuickNotesInput />

                    {/* Today Summary */}
                    <div className="bg-card p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-border-theme shadow-sm">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                                    <Calendar className="text-white" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-foreground">Today Summary</h3>
                                    <p className="text-[10px] sm:text-xs text-muted font-medium">Progress overview</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-secondary-theme rounded-lg sm:rounded-xl border border-border-theme">
                                <p className="text-[10px] sm:text-xs font-bold text-muted uppercase mb-1">Today's Total</p>
                                <p className="text-xl sm:text-2xl font-bold text-foreground">{queueStats.totalAppointments}</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <p className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Completed</p>
                                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{queueStats.completedCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Estimated Wait */}
                    <EstimatedWaitCard
                        queueCount={queueStats.queueCount}
                        showQueue={queueStats.showQueue}
                        consultationDuration={consultationDuration}
                    />
                </div>

                {/* Right: My Notes */}
                <div>
                    <DoctorNotesList initialNotes={initialNotes} />
                </div>
            </div>
        </div>
    );
}

function ShortcutCard({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
    return (
        <Link
            href={href}
            className="p-4 bg-card rounded-2xl border border-border-theme hover:border-primary-theme hover:shadow-lg hover:shadow-primary-theme/5 transition-all group flex flex-col gap-3"
        >
            <div className="w-10 h-10 rounded-xl bg-secondary-theme flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-foreground">{label}</p>
                <p className="text-[10px] text-muted font-medium">{sub}</p>
            </div>
        </Link>
    );
}

export default React.memo(DoctorDashboardContainer);
