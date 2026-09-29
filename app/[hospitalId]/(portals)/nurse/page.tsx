'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Activity,
    Users,
    Clock,
    AlertTriangle,
    ArrowRight,
    HeartPulse,
    BedDouble,
    LogIn,
    LogOut,
    CheckCircle2
} from 'lucide-react';
import { ipdService, staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';
import { useTodayStatus, useCheckIn, useCheckOut, useNotifications } from '@/lib/integrations/hooks';
import { format } from 'date-fns';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';

export default function NurseDashboard() {
    const [stats, setStats] = useState({
        activePatients: 0,
        availableBeds: 0,
        vitalsDue: 0,
        criticalAlerts: 0
    });

    const [recentAdmissions, setRecentAdmissions] = useState<any[]>([]);
    const [nurseDept, setNurseDept] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

    const { data: attendanceData, refetch: refetchAttendance } = useTodayStatus();
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();

    const todayAttendance = attendanceData?.attendance;
    const hasCheckedIn = !!todayAttendance?.checkIn;
    const hasCheckedOut = !!todayAttendance?.checkOut;

    // Clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Nurse Profile
                const profileData = await staffService.getProfile();
                setProfile(profileData.staff);
                const rawDept = profileData.staff.department;
                const dept = Array.isArray(rawDept) ? rawDept.join(', ') : (rawDept || null);
                setNurseDept(dept);

                // 2. Fetch Data
                let queryDept = dept;
                if (typeof queryDept === 'string' && queryDept.toLowerCase() === 'general ward') {
                    queryDept = 'General';
                }

                const [beds, admissions] = await Promise.all([
                    ipdService.getBeds({ department: queryDept || undefined }),
                    ipdService.getActiveAdmissions(queryDept || undefined)
                ]);

                const activeAdmissions = admissions.filter((a: any) => a.status !== 'Discharged');
                const occupied = beds.filter(b => b.status === 'Occupied').length;
                const vacant = beds.filter(b => b.status === 'Vacant').length;
                const critical = activeAdmissions.filter((a: any) => a.vitals?.status === 'Critical').length;

                setStats({
                    activePatients: occupied,
                    availableBeds: vacant,
                    vitalsDue: activeAdmissions.length,
                    criticalAlerts: critical
                });

                setRecentAdmissions(activeAdmissions.slice(0, 5));
            } catch (e) {
                console.error("Dashboard load failed", e);
                // toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const checkLicenseExpiry = () => {
        if (!profile?.qualificationDetails?.licenseValidityDate) return null;
        const expiryDate = new Date(profile.qualificationDetails.licenseValidityDate);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays > 0) {
            return { days: diffDays, severity: 'warning' };
        } else if (diffDays <= 0) {
            return { days: 0, severity: 'critical' };
        }
        return null;
    };

    const expiryAlert = checkLicenseExpiry();

    const handleCheckIn = async (payload?: any) => {
        try {
            await checkInMutation.mutateAsync(payload);
            toast.success('Shift started');
            refetchAttendance();
            setIsAttendanceModalOpen(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to clock in');
        }
    };

    const triggerCheckIn = () => {
        setIsAttendanceModalOpen(true);
    };

    const handleCheckOut = async () => {
        try {
            await checkOutMutation.mutateAsync(undefined);
            toast.success('Shift ended');
            refetchAttendance();
        } catch (e) {
            toast.error('Failed to clock out');
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <div className="max-w-7xl mx-auto space-y-4">

                {/* HEADER SECTION */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">Nurse Dashboard</h1>
                        <p className="text-[7px] sm:text-[10px] font-medium text-muted uppercase tracking-widest mt-1">
                            Overview for <span className="font-semibold text-emerald-600">{nurseDept || 'All Departments'}</span> • {format(currentTime, 'EEEE')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-2 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
                            {!todayAttendance?.checkIn ? (
                                <button
                                    onClick={triggerCheckIn}
                                    disabled={checkInMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-emerald-500/20"
                                >
                                    {checkInMutation.isPending ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <LogIn size={14} strokeWidth={3} />
                                    )}
                                    Clock In
                                </button>
                            ) : !todayAttendance?.checkOut ? (
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums">
                                            {todayAttendance?.checkIn?.time ? new Date(todayAttendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCheckOut}
                                        disabled={checkOutMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-rose-500/20"
                                    >
                                        {checkOutMutation.isPending ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <LogOut size={14} strokeWidth={3} />
                                        )}
                                        Clock Out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300/50">
                                    <CheckCircle2 size={14} strokeWidth={3} />
                                    Shift Ended
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* WELCOME & ATTENDANCE SECTION */}
                {expiryAlert && (
                    <div className={`p-4 rounded-2xl flex items-center gap-4 animate-pulse transition-all shadow-lg ${expiryAlert.severity === 'critical' ? 'bg-rose-50 border-2 border-rose-200 text-rose-700' : 'bg-amber-50 border-2 border-amber-200 text-amber-700'}`}>
                        <AlertTriangle className={expiryAlert.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'} />
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                {expiryAlert.severity === 'critical' ? 'CRITICAL: License Expired' : 'Important: License Expiring Soon'}
                            </p>
                            <p className="text-[11px] font-bold opacity-80 mt-1 uppercase">
                                {expiryAlert.severity === 'critical'
                                    ? 'Your nursing council registration has expired. Please renewal it immediately.'
                                    : `Your nursing council registration will expire in ${expiryAlert.days} days. Please renewal your documents.`}
                            </p>
                        </div>

                    </div>
                )}

                <div className="flex flex-col space-y-2 mt-4">
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">Nurse Care Portal <Activity className="text-teal-600 shrink-0" size={20} /></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">
                            Monitoring {nurseDept ? `${nurseDept}` : 'All Assigned Wards'} • Session Active
                        </p>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <KPICard
                        label="Active"
                        value={stats.activePatients}
                        icon={<Users size={16} />}
                        color="blue"
                    />
                    <KPICard
                        label="Beds"
                        value={stats.availableBeds}
                        icon={<BedDouble size={16} />}
                        color="emerald"
                    />
                    <KPICard
                        label="Due"
                        value={stats.vitalsDue}
                        icon={<HeartPulse size={16} />}
                        color="amber"
                    />
                    <KPICard
                        label="Alerts"
                        value={stats.criticalAlerts}
                        icon={<AlertTriangle size={16} />}
                        color="rose"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* LEFT COLUMN: PATIENT STATUS */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] sm:min-h-[350px]">
                            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                                    <Activity size={16} className="text-emerald-500" />
                                    Live Patients
                                </h3>
                                <Link href="/nurse/patients" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group uppercase tracking-widest">
                                    View <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            <div className="bg-white rounded-[0.5rem] sm:rounded-[0.5rem] overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-[600px]">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient / Bed</th>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Latest BP</th>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Temp</th>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pulse</th>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">SpO2</th>
                                            <th className="px-4 sm:px-8 py-3 sm:py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentAdmissions.length > 0 ? (
                                            recentAdmissions.map((adm) => (
                                                <tr key={adm._id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 text-xs font-black text-slate-900">
                                                        <div className="flex flex-col">
                                                            <span>{adm.patient?.name}</span>
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{adm.bed?.bedId || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 font-bold text-slate-600 text-xs">
                                                        {adm.vitals?.bloodPressure || '--'}
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 font-bold text-slate-600 text-xs">
                                                        {adm.vitals?.temperature ? `${adm.vitals.temperature}°F` : '--'}
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 font-bold text-slate-600 text-xs">
                                                        {adm.vitals?.pulse ? `${adm.vitals.pulse} bpm` : '--'}
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 font-bold text-slate-600 text-xs">
                                                        {adm.vitals?.spO2 ? `${adm.vitals.spO2}%` : '--'}
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${adm.vitals?.status === 'Critical' ? 'bg-rose-50 text-rose-600' :
                                                                adm.vitals?.status === 'Warning' ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-emerald-50 text-emerald-600'
                                                                }`}>
                                                                {adm.vitals?.status || 'No Data'}
                                                            </span>
                                                            {adm.vitals?.condition && (
                                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{adm.vitals.condition}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 sm:px-8 py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active monitoring data</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: NEXT CARE TASKS */}
                    <div className="lg:col-span-1 space-y-3 sm:space-y-6">

                        <div className="bg-white rounded-xl sm:rounded-[0.5rem] p-4 sm:p-8 text-gray-900 shadow-sm space-y-3 sm:space-y-6">
                            <h2 className="text-[9px] sm:text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} className="text-teal-600 sm:size-[14px]" />
                                Next Tasks
                            </h2>
                            {recentAdmissions.length > 0 ? (
                                recentAdmissions.slice(0, 3).map((adm, i) => (
                                    <TaskItem
                                        key={adm._id}
                                        time={i === 0 ? "Now" : "Soon"}
                                        task="Monitoring"
                                        patient={adm.patient?.name || 'Unknown'}
                                    />
                                ))
                            ) : (
                                <TaskItem time="--" task="No Tasks" patient="System Idle" />
                            )}
                            <Link href="/nurse/tasks" className="block w-full text-center py-2 sm:py-4 bg-primary-theme rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all mt-2 sm:mt-4 text-white">
                                Task Center
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <AttendanceModal 
                isOpen={isAttendanceModalOpen} 
                onClose={() => setIsAttendanceModalOpen(false)} 
                onConfirm={handleCheckIn} 
            />
        </div>
    );
}

function TaskItem({ time, task, patient }: any) {
    return (
        <div className="flex items-center gap-2 sm:gap-4 py-1.5 sm:py-2 border-b border-slate-50 last:border-0">
            <span className="text-[8px] sm:text-[10px] font-bold text-gray-600 sm:w-12">{time}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-sm font-bold text-gray-900 truncate">{task}</p>
                <p className="text-[8px] sm:text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">{patient}</p>
            </div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 shadow-teal-500/50 shadow-lg shrink-0"></div>
        </div>
    );
}

function KPICard({ label, value, icon, color, suffix }: any) {
    const colors: any = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-100' },
    };

    const theme = colors[color] || colors.blue;

    return (
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm font-medium text-slate-500 truncate">{label}</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 leading-none">
                        {value} <span className="text-[10px] sm:text-sm text-slate-400 font-normal">{suffix}</span>
                    </h3>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0 ${theme.iconBg} ${theme.text}`}>
                    {React.cloneElement(icon, { size: 14, className: 'sm:size-[18px]' })}
                </div>
            </div>
        </div>
    );
}