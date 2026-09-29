'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
    Clock,
    LogIn,
    LogOut,
    CalendarDays,
    Building2,
    UserCheck,
    AlertCircle,
    History,
    MapPin,
    CalendarIcon,
} from 'lucide-react';
import { useStaffDashboard, useAttendanceHistory, useCheckIn, useCheckOut } from '@/lib/integrations/hooks';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function NurseAttendancePage() {
    const { data: dashboard, isLoading: dashboardLoading } = useStaffDashboard();
    const { data: historyData } = useAttendanceHistory({ limit: 10, page: 1 });
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const attendanceHistory = historyData?.attendance || [];
    const stats = dashboard?.stats || { presentDays: 0, absentDays: 0, onTimePercentage: 0, lateDays: 0 };
    const todayAttendance = dashboard?.todayAttendance;
    const staff = dashboard?.staff;

    const hasCheckedIn = !!todayAttendance?.checkIn;
    const hasCheckedOut = !!todayAttendance?.checkOut;

    const handleCheckIn = useCallback(async () => {
        try {
            await checkInMutation.mutateAsync(undefined);
            toast.success('Shift started successfully');
        } catch (error) {
            console.error('Check-in failed:', error);
            toast.error('Failed to check in');
        }
    }, [checkInMutation]);

    const handleCheckOut = useCallback(async () => {
        try {
            await checkOutMutation.mutateAsync(undefined);
            toast.success('Shift ended successfully');
        } catch (error) {
            console.error('Check-out failed:', error);
            toast.error('Failed to check out');
        }
    }, [checkOutMutation]);

    if (dashboardLoading || !staff) {
        return (
            <div className="flex items-center justify-center min-h-[600px] bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Loading Attendance Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* PAGE HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance & Shifts</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage your work schedule, clock-ins, and view monthly reports.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-emerald-600">
                            <CalendarIcon size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Date</p>
                            <p className="text-sm font-bold text-slate-900">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
                        </div>
                    </div>
                </div>

                {/* KEY METRICS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                        label="Attendance Score"
                        value={`${stats.onTimePercentage}%`}
                        subtext="Monthly Average"
                        icon={<UserCheck size={20} />}
                        color="emerald"
                    />
                    <MetricCard
                        label="Days Present"
                        value={stats.presentDays}
                        subtext="This Month"
                        icon={<CalendarDays size={20} />}
                        color="blue"
                    />
                    <MetricCard
                        label="Late Arrivals"
                        value={stats.lateDays || 0}
                        subtext="Requires Attention"
                        icon={<Clock size={20} />}
                        color="amber"
                    />
                    <MetricCard
                        label="Absences"
                        value={stats.absentDays}
                        subtext="Unexcused"
                        icon={<AlertCircle size={20} />}
                        color="rose"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                    {/* LEFT COLUMN: RECENT ACTIVITY TABLE (2/3 width) */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-[0.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full mb-8">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                                    Recent Activity
                                </h2>

                            </div>

                            <div className="flex-1 overflow-x-auto overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/50">
                                        <tr className="border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Shift Time</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Check In</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Check Out</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {attendanceHistory.length > 0 ? (
                                            attendanceHistory.map((entry) => (
                                                <tr key={entry._id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50">
                                                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">
                                                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                        09:00 AM - 05:00 PM
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                        {entry.checkIn?.time ? format(new Date(entry.checkIn.time), 'hh:mm a') : '--'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                        {entry.checkOut?.time ? format(new Date(entry.checkOut.time), 'hh:mm a') : '--'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <StatusBadge status={entry.status} />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-30">
                                                        <CalendarIcon size={40} className="text-slate-300" />
                                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Attendance Detected</h3>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SHIFT SIDEBAR (1/3 width) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Current Shift Card */}
                        <div className="bg-white rounded-[0.5rem] border border-slate-100 shadow-sm p-6 relative overflow-hidden flex flex-col items-center text-center">
                            <div className="w-full flex items-center gap-3 mb-8 text-left">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{staff.department || 'NursingICU'}</p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <MapPin size={10} />
                                        <span>Building A, Floor 3</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center mb-8">
                                <div className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                    {format(currentTime, 'HH:mm')}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">{format(currentTime, 'ss')} seconds</p>
                            </div>

                            <div className="w-full">
                                {!hasCheckedIn ? (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkInMutation.isPending}
                                        className="w-full bg-primary-theme hover:bg-primary-theme/80 disabled:opacity-50 text-white font-black py-4 rounded-[0.5rem] transform active:scale-95 flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/10 text-xs uppercase tracking-widest"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        <span>Start Shift</span>
                                    </button>
                                ) : !hasCheckedOut ? (
                                    <div className="flex flex-row items-center justify-center gap-2 w-full">
                                        <div className="px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-1.5 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight leading-none whitespace-nowrap">
                                                In: {todayAttendance?.checkIn?.time ? format(new Date(todayAttendance.checkIn.time), 'hh:mm a') : '09:00 AM'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleCheckOut}
                                            disabled={checkOutMutation.isPending}
                                            className="flex-1 bg-slate-900 hover:bg-black text-white font-black py-2.5 rounded-lg transform active:scale-95 flex items-center justify-center gap-2 transition-all shadow-lg text-[9px] uppercase tracking-widest"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>End Shift</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                                        <UserCheck size={20} className="mx-auto text-emerald-500 mb-2" />
                                        <p className="text-xs font-black text-slate-900 uppercase">Shift Completed</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shift Policy Card */}
                        <div className="bg-slate-50/50 rounded-[0.5rem] border border-slate-200/50 p-6">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <History size={14} className="text-slate-400" />
                                Shift Policy
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Check in strictly before 09:15 AM to avoid late remarks.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Mandatory 30 min break between 01:00 PM - 02:00 PM.</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, subtext, icon, color }: any) {
    const colors: any = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    };

    const theme = colors[color] || colors.emerald;

    return (
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className={`p-2 sm:p-3 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border`}>
                    {React.cloneElement(icon, { size: 16 })}
                </div>
            </div>
            <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</h3>
                <p className="text-[10px] sm:text-sm font-medium text-slate-500 mt-1">{label}</p>
                <p className={`text-[8px] sm:text-xs mt-0.5 sm:mt-1 font-bold ${theme.text} opacity-80 uppercase tracking-wide`}>{subtext}</p>
            </div>
        </div >
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        late: 'bg-amber-100 text-amber-700 border-amber-200',
        absent: 'bg-rose-100 text-rose-700 border-rose-200',
        leave: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const style = styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-600 border-slate-200';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${style} capitalize`}>
            {status}
        </span>
    );
}
