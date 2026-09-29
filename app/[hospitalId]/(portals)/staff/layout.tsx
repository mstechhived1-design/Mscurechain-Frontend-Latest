'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    BookOpenCheck, 
    AlertTriangle, 
    ClipboardCheck, 
    Bell, 
    LogOut,
    ShieldCheck
} from 'lucide-react';
import LicenseLock from "@/components/License/LicenseLock";
import { staffService } from '@/lib/integrations/services/staff.service';

import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import LogoutModal from '@/components/auth/LogoutModal';
import Navbar from '@/components/navbar/Navbar';
import SharedSidebar from "@/components/navbar/SharedSidebar";
import ProgressBar from "@/components/ui/ProgressBar";
import StaffSupportFloatingBox from '@/components/staff/StaffSupportFloatingBox';

import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
    useNotifications, 
    useTodayStatus, 
    useCheckIn, 
    useCheckOut 
} from '@/lib/integrations/hooks';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useRealtime } from '@/hooks/useRealtime';


function StaffLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { 
        user, logout, isInitialized, isAuthenticated, isLoading, checkAuth, initEvents,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const { getPath } = useTenantLink();

    useRealtime(['staff', 'system', 'emergency']);

    useEffect(() => {
        setIsMounted(true);
        initEvents();
        checkAuth();
        verifyLicense();
    }, [checkAuth, initEvents, isAuthenticated]);

    const verifyLicense = async () => {
        if (!isAuthenticated) {
            setIsLicenseChecking(false);
            return;
        }
        setIsLicenseChecking(true);
        try {
            await staffService.getTodayStatus();
            setLicenseError(null);
        } catch (err: any) {
            const errorData = err.error || err.data || {};
            const errorMessage = errorData.message || err.message || "";
            
            // 🛑 CRITICAL: Any 403 on the core portal service means the portal is locked or unallocated
            if (err.status === 403) {
                setLicenseError({
                    message: errorMessage || "Your license has expired or is not yet active.",
                    locked: true
                });
            } else {
                console.error("[Staff] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    };

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push(getPath('/auth/login'));
            } else if (user?.role !== 'staff') {
                const routeMap: Record<string, string> = {
                    'doctor': getPath('/doctor'),
                    'hospital-admin': getPath('/hospital-admin'),
                    'lab': getPath('/lab/dashboard'),
                    'pharmacy': getPath('/pharmacy/dashboard'),
                    'pharma-owner': getPath('/pharmacy/dashboard'),
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || getPath('/auth/login'));
            }
        }
    }, [isInitialized, isAuthenticated, user?.role, router, getPath]);

    const queryClient = useQueryClient();
    useEffect(() => {
        if (isAuthenticated && user) {
            const initSocket = async () => {
                const socket = await getSocket();
                if (socket) {
                    joinSocketRoom({
                        userId: user.id || (user as any)._id,
                        role: user.role,
                        hospitalId: user.hospitalId || (user as any).hospital
                    });

                    socket.on('leave:status_change', (data: any) => {
                        const status = data.leave.status;
                        toast(`Leave Request ${status.toUpperCase()}!`, { icon: status === 'approved' ? '✅' : '❌', duration: 4000 });
                        queryClient.invalidateQueries({ queryKey: ['staff'] });
                    });

                    socket.on('incident_update', (data: any) => {
                        toast(`Incident ${data.status.toUpperCase()}: ${data.incidentId}`, { icon: '🏥', duration: 5000 });
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    socket.on('new_incident', () => {
                        queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                    });

                    socket.on('notification:new', (notif: any) => {
                        if (notif.type === 'license_expiry') {
                            toast(notif.message || 'License Expiry Warning', {
                                icon: '⚠️',
                                duration: 8000,
                                style: { borderRadius: '16px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontWeight: 'bold' }
                            });
                        }
                    });
                }
            };
            initSocket();
            return () => {
                getSocket().then(socket => {
                    if (socket) {
                        socket.off('leave:status_change');
                        socket.off('incident_update');
                        socket.off('new_incident');
                        socket.off('notification:new');
                    }
                });
            };
        }
    }, [isAuthenticated, user, queryClient]);

    const { data: notifications } = useNotifications();
    useEffect(() => {
        if (notifications && Array.isArray(notifications)) {
            const unreadExpiry = notifications.filter(n => !n.isRead && n.type === 'license_expiry');
            if (unreadExpiry.length > 0) {
                const sorted = unreadExpiry.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const latestNotif = sorted[0];
                toast(latestNotif.message, {
                    icon: '⚠️',
                    duration: 10000,
                    id: `expiry-${latestNotif._id}`,
                    style: { borderRadius: '16px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontWeight: 'bold' }
                });
            }
        }
    }, [notifications]);

    const { data: statusData } = useTodayStatus();
    const todayAttendance = statusData?.attendance;
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();
    const isAttendanceLoading = checkInMutation.isPending || checkOutMutation.isPending;

    const handleAttendanceAction = async (action: 'check-in' | 'check-out') => {
        try {
            if (action === 'check-in') {
                await checkInMutation.mutateAsync(undefined);
                toast.success('Successfully Checked In!', { icon: '🚀' });
            } else {
                await checkOutMutation.mutateAsync(undefined);
                toast.success('Successfully Checked Out!', { icon: '👋' });
            }
        } catch (error: any) {
            toast.error(error?.message || `Failed to ${action}`);
        }
    };

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter italic text-center">Initializing Portal</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-4 animate-pulse">Checking License...</p>
                </div>
            </div>
        );
    }

    if (licenseError?.locked) {
        return (
            <LicenseLock 
                message={licenseError.message}
                onRefresh={() => window.location.reload()}
                onLogout={() => logout()}
                hospitalId={user?.hospital || (user as any)?.hospitalId}
                portalName="Staff"
            />
        );
    }

    if (!isAuthenticated || user?.role !== 'staff') return null;

    const attendanceButtons = (
        <div className="flex items-center gap-2">
            {!todayAttendance || !todayAttendance.checkIn ? (
                <button
                    onClick={() => handleAttendanceAction('check-in')}
                    disabled={isAttendanceLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                >
                    <span>Check In Now</span>
                </button>
            ) : !todayAttendance.checkOut ? (
                <button
                    onClick={() => handleAttendanceAction('check-out')}
                    disabled={isAttendanceLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                >
                    <LogOut size={14} className={isAttendanceLoading ? 'animate-spin' : ''} />
                    <span>Check Out</span>
                </button>
            ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100">
                    <span>Duty Completed</span>
                </div>
            )}
        </div>
    );

    const staffUser = {
        name: user?.name || "Staff Member",
        role: user?.role || "Staff",
        image: (user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic || (user as any)?.logo || ""
    };

    const staffMenuItems: any[] = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/staff' },
        { icon: CalendarCheck, label: 'Leave & Absence', path: '/staff/leaves' },
        { icon: BookOpenCheck, label: 'My Schedule', path: '/staff/schedule' },
        { icon: AlertTriangle, label: 'Medical Incident', path: '/staff/incidents' },
        { icon: ClipboardCheck, label: 'SOP & Policies', path: '/staff/sop' },
        { icon: Bell, label: 'Announcements', path: '/staff/announcements' },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push(getPath('/auth/login')); }}
                userName={user?.name}
            />
            
            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={staffMenuItems}
                branding={{ logo: LayoutDashboard, title: "CureChain", subtitle: "Staff Portal" }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div className={`flex-1 flex flex-col min-h-screen min-w-0 relative`}>
                <Navbar
                    user={staffUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isDarkMode={theme === 'dark'}
                    onThemeToggle={toggleTheme}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30 shrink-0"
                    profileHref={getPath('/staff/profile')}
                    actions={attendanceButtons}
                />

                <main className="p-2 md:p-6 flex-1 overflow-y-auto relative bg-transparent">
                    <ProgressBar isPending={isPending} color="indigo" />
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                    <StaffSupportFloatingBox />
                </main>
            </div>
        </div>
    );
}

export default StaffLayout;
