'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import {
    LogIn,
    LogOut,
    CheckCircle2,
    Key,
    Copy,
    X,
    Bell,
    TrendingUp,
    ArrowUpRight,
    ChevronRight,
    BookOpenCheck,
    Zap
} from 'lucide-react';

import { API_CONFIG } from '@/lib/integrations/config/api-config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useStaffDashboard, useAttendanceHistory, useAnnouncements, useCheckIn, useCheckOut, useTodayStatus } from '@/lib/integrations/hooks';
import { StaffDashboardSkeleton } from '@/components/ui/skeletons';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';

const StaffDashboardPage = React.memo(function StaffDashboardPage() {
    const router = useRouter();
    const [helpdeskNotification, setHelpdeskNotification] = React.useState<{
        loginId: string;
        password: string;
        hospital: string;
    } | null>(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = React.useState(false);

    // ✅ React Query hooks with placeholderData for instant cached display
    const { data: dashboard, isLoading: dashboardLoading } = useStaffDashboard();
    const { data: statusData } = useTodayStatus(); // ✅ Unified status sync
    const { data: historyData } = useAttendanceHistory({ limit: 5, page: 1 });
    const { data: announcementsData } = useAnnouncements();

    // ✅ Optimized mutations with automatic cache invalidation
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();

    // ✅ Memoized derived data
    const attendanceHistory = useMemo(() => historyData?.attendance || [], [historyData]);
    const announcements = useMemo(() => (announcementsData?.announcements || []).slice(0, 3), [announcementsData]);

    // Socket connection for helpdesk credentials
    useEffect(() => {
        let socket: any;
        const connectToSocket = async () => {
            try {
                if (dashboard?.staff) {
                    const socketIO = await import('socket.io-client');
                    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
                    socket = socketIO.io(baseUrl, {
                        auth: { token: localStorage.getItem('token') },
                        transports: ['websocket'],
                    });

                    socket.emit('join_room', {
                        role: 'staff',
                        userId: dashboard.staff.staffProfileId || dashboard.staff._id
                    });

                    socket.on('helpdesk_credentials', (data: any) => {
                        setHelpdeskNotification({
                            loginId: data.loginId,
                            password: data.password,
                            hospital: data.hospital
                        });
                        toast.success('New Helpdesk Credentials Received!', { duration: 6000, icon: '🔑' });
                    });
                }
            } catch (err) {
                console.error('Socket connection error:', err);
            }
        };

        connectToSocket();

        return () => {
            if (socket) {
                socket.off('helpdesk_credentials');
                socket.disconnect();
            }
        };
    }, [dashboard?.staff]);

    // ✅ Optimized handlers with useCallback
    const handleCheckIn = useCallback(async (payload?: any) => {
        try {
            const result = await checkInMutation.mutateAsync(payload);
            const checkInTime = result?.attendance?.checkIn?.time
                ? new Date(result.attendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                : null;
            toast.success(checkInTime ? `Checked in at ${checkInTime}` : 'Checked in successfully!');
            setIsAttendanceModalOpen(false);
        } catch (error: any) {
            console.error('Check-in failed:', error);
            toast.error(error?.message || 'Failed to check in. Please try again.');
        }
    }, [checkInMutation]);

    const triggerCheckIn = useCallback(() => {
        setIsAttendanceModalOpen(true);
    }, []);

    const handleCheckOut = useCallback(async () => {
        try {
            const result = await checkOutMutation.mutateAsync(undefined);
            const checkOutTime = result?.attendance?.checkOut?.time
                ? new Date(result.attendance.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                : null;
            toast.success(checkOutTime ? `Checked out at ${checkOutTime}` : 'Checked out successfully!');
        } catch (error: any) {
            console.error('Check-out failed:', error);
            toast.error(error?.message || 'Failed to check out. Please try again.');
        }
    }, [checkOutMutation]);

    // ✅ Only show skeleton on true initial load (not on cached data)
    const showSkeleton = dashboardLoading && !dashboard;

    if (showSkeleton) {
        return <StaffDashboardSkeleton />;
    }

    if (!dashboard || !dashboard.staff) return null;

    const { staff, stats } = dashboard;
    // Prioritize statusData for real-time button sync
    const todayAttendance = statusData?.attendance || dashboard.todayAttendance;




    return (
        <div
            className="space-y-4 md:space-y-8 max-w-7xl mx-auto pb-6 md:pb-12 animate-in fade-in duration-150"
        >
            {/* Helpdesk Credentials Notification */}
            {helpdeskNotification && (
                <div className="bg-linear-to-r from-indigo-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>

                    <div className="relative flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-8 p-4 sm:p-0">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner border border-white/20 shrink-0">
                                <Key className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-2xl font-black flex items-center gap-3">
                                    Helpdesk Assigned!
                                    <span className="bg-emerald-400 text-emerald-950 text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">Live</span>
                                </h3>
                                <p className="text-indigo-100 text-[10px] sm:text-sm font-medium mt-0.5">
                                    Assigned to <span className="font-black underline decoration-emerald-400 underline-offset-2">{helpdeskNotification.hospital}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 bg-black/30 p-5 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl">
                            <div className="space-y-1.5 min-w-[160px]">
                                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black">Login ID</p>
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 group hover:bg-white/20">
                                    <code className="text-xl font-mono font-black tracking-widest">{helpdeskNotification.loginId}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(helpdeskNotification.loginId);
                                            toast.success('Login ID copied!');
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-200 active:scale-90"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="hidden xl:block w-px h-12 bg-white/10 mx-2"></div>
                            <div className="space-y-1.5 min-w-[160px]">
                                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black">Password</p>
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 group hover:bg-white/20">
                                    <code className="text-xl font-mono font-black tracking-widest">{helpdeskNotification.password}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(helpdeskNotification.password);
                                            toast.success('Password copied!');
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-200 active:scale-90"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setHelpdeskNotification(null)}
                            className="absolute -top-4 -right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 group shadow-lg active:scale-95 backdrop-blur-md"
                        >
                            <X className="w-5 h-5 text-indigo-100 group-hover:scale-110" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="space-y-0.5">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">
                        Hello, {(staff.user?.name || (staff as any).name || 'Staff').split(' ')[0]}!
                    </h1>
                    <p className="text-[7px] sm:text-[10px] font-medium text-slate-500 flex items-center gap-1.5 uppercase tracking-widest mt-1">
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        Institutional Workspace • {staff.hospital.name}
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
                    <div className="hidden lg:flex flex-col items-end mr-2">
                        <span className="text-sm font-black text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="text-xs font-bold text-gray-400">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Attendance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Cards Cluster */}
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Attendance Stats Card */}
                        <div className="bg-white rounded-[0.5rem] p-8 text-gray-900  shadow-sm relative overflow-hidden flex flex-col justify-between group">

                            <div>
                                <div className="flex items-center justify-between mb-4 sm:mb-8">
                                    <h3 className="text-[14px] sm:text-[18px] font-black uppercase text-gray-900 tracking-widest">Efficiency</h3>
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    </div>
                                </div>
                                <div className="mt-4 sm:mt-8 flex items-baseline gap-4">
                                    <span className="text-3xl sm:text-[40px] font-black tracking-tighter text-gray-900">{stats.onTimePercentage}%</span>
                                    <span className="flex items-center text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <ArrowUpRight className="w-4 h-4 mr-1" /> Precision
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-50">
                                <div className="group/stat">
                                    <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-indigo-400">Present Protocol</p>
                                    <p className="text-xl sm:text-3xl font-black mt-1 text-gray-900">{stats.presentDays} <small className="text-gray-400 text-[8px] sm:text-[10px] font-black tracking-widest uppercase">Days</small></p>
                                </div>
                                <div className="group/stat">
                                    <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-rose-400">Absent Ledger</p>
                                    <p className="text-xl sm:text-3xl font-black mt-1 text-rose-500">{stats.absentDays} <small className="text-gray-400 text-[8px] sm:text-[10px] font-black tracking-widest uppercase">Days</small></p>
                                </div>
                            </div>
                        </div>

                        {/* Leaves & Registry */}
                        <div className="bg-white rounded-[0.5rem] p-8 border border-gray-100 flex flex-col justify-between relative overflow-hidden group shadow-sm hover:border-indigo-200">
                            <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[18px]  max-sm:text-[17px] font-bold text-gray-900 uppercase">Leave Ledger</h3>
                                    <div className="flex flex-col items-end">
                                        <span className="text-4xl font-black text-indigo-600 tracking-tighter">{stats.pendingLeaves || 0}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {stats.leaveTypeBreakdown && Object.keys(stats.leaveTypeBreakdown).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(stats.leaveTypeBreakdown).map(([type, count]) => (
                                                <span key={type} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                    {type}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-gray-400 italic">No active leave protocols pending.</p>
                                    )}

                                    <div className="pt-6 border-t border-gray-50 space-y-3">
                                        <button
                                            onClick={() => router.push('/staff/leaves')}
                                            className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 cursor-pointer shadow-lg shadow-indigo-100 group/btn"
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">Request Leave</span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                                        </button>
                                        <button
                                            onClick={() => router.push('/staff/schedule')}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 hover:border-indigo-100 active:scale-95 cursor-pointer group/btn"
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest text-[9px]">View Schedule</span>
                                            <BookOpenCheck className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: History & Announcements */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Recent Attendance */}
                <div className="xl:col-span-8 bg-white rounded-[0.5rem] p-4 sm:p-8 shadow-sm border border-gray-100 overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <h3 className="text-[16px] sm:text-[18px] font-black text-gray-900 uppercase tracking-widest">Activity Registry</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th className="pb-3 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="pb-3 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">In</th>
                                    <th className="pb-3 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Out</th>
                                    <th className="pb-3 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Duration</th>
                                    <th className="pb-3 text-right text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {attendanceHistory.filter(entry => entry.status !== 'on-leave').map((entry) => (
                                    <tr key={entry._id} className="group/row hover:bg-gray-50">
                                        <td className="py-4 sm:py-5 font-black text-gray-900 text-[10px] sm:text-xs tracking-tighter shrink-0">{new Date(entry.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</td>
                                        <td className="py-4 sm:py-5 text-gray-500 font-bold text-[10px] sm:text-xs">{entry.checkIn?.time ? new Date(entry.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                        <td className="py-4 sm:py-5 text-gray-500 font-bold text-[10px] sm:text-xs">{entry.checkOut?.time ? new Date(entry.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                        <td className="py-4 sm:py-5 text-gray-500 font-bold text-[10px] sm:text-xs hidden sm:table-cell">{entry.workingHours ? `${Math.floor(entry.workingHours / 60)}h ${entry.workingHours % 60}m` : '0h 0m'}</td>
                                        <td className="py-4 sm:py-5 text-right">
                                            <span className={`px-2 sm:px-3 py-1 text-[8px] sm:text-[10px] font-black uppercase rounded-full border ${entry.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                entry.status === 'late' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-gray-50 text-gray-600 border-gray-100'
                                                }`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Announcements Section */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-indigo-50 rounded-[0.5rem] p-8 border border-indigo-100 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[18px]  max-sm:text-[17px] font-bold text-indigo-950">Latest News</h3>
                            <Bell className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="space-y-6">
                            {announcements.length > 0 ? announcements.map((news, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{new Date(news.createdAt).toLocaleDateString()}</p>
                                    <h4 className="font-black text-indigo-950 group-hover:text-indigo-600 line-clamp-1">{news.title}</h4>
                                    <p className="text-sm text-indigo-700/60 mt-1 line-clamp-2 leading-relaxed">{news.content}</p>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <Bell className="w-12 h-12 text-indigo-200 mx-auto mb-4 opacity-50" />
                                    <p className="text-sm font-bold text-indigo-300">No new announcements</p>
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/staff/announcements')}
                                className="w-full mt-4 py-3 bg-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-indigo-100 hover:shadow-lg active:scale-95"
                            >
                                View All Announcements
                            </button>
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
});

export default StaffDashboardPage;
