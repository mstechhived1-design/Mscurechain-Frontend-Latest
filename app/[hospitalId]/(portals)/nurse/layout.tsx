'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  BookOpenCheck,
  Activity,
  Users,
  Clock,
  RotateCcw,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import LicenseLock from "@/components/License/LicenseLock";
import { NurseService } from '@/lib/integrations/services/nurse.service';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import LogoutModal from '@/components/auth/LogoutModal';
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNotifications } from '@/lib/integrations/hooks';
import NurseShiftButton from './components/NurseShiftButton';
import NurseSupportFloatingBox from './components/NurseSupportFloatingBox';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useRealtime } from '@/hooks/useRealtime';
import Navbar from '@/components/navbar/Navbar';
import SharedSidebar from "@/components/navbar/SharedSidebar";
import ProgressBar from "@/components/ui/ProgressBar";

export function NurseLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const { 
        user, logout, isInitialized, isAuthenticated, isLoading, checkAuth, initEvents,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = React.useTransition();

    useRealtime(['patients', 'beds', 'staff', 'emergency', 'system', 'pharmacy']);

    const isLoginPage = pathname?.includes('/nurse/login');

    const nurseMenuItems: any[] = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/nurse' },
      { icon: Activity, label: 'My Ward Status', path: '/nurse/ward' },
      { icon: Users, label: 'Patient Monitoring', path: '/nurse/patients' },
      { icon: Activity, label: 'Hourly Monitoring', path: '/nurse/patient-hourly-record' },
      { icon: ClipboardList, label: 'Daily Tasks', path: '/nurse/tasks' },
      { icon: ClipboardList, label: 'Discharge Management', path: '/nurse/discharge' },
      {
        icon: Clock, label: 'My Workforce',
        subItems: [
          { label: 'Attendance', path: '/nurse/attendance' },
          { label: 'Leave Management', path: '/nurse/leaves' },
          { label: 'My Schedule', path: '/nurse/schedule' },
        ]
      },
      { icon: AlertTriangle, label: 'Medical Incident', path: '/nurse/incidents' },
      { icon: RotateCcw, label: 'Medicine Return', path: '/nurse/medicine-return' },
      { icon: BookOpenCheck, label: 'Sop & Policies', path: '/nurse/sop' },
      { icon: Bell, label: 'Announcements', path: '/nurse/announcements' },
    ];

  useEffect(() => {
    setIsMounted(true);
    initEvents();
    checkAuth();
    verifyLicense();
    // ✅ FIX BUG 4: Do NOT include isAuthenticated in deps — it causes a re-run loop.
    // When token rotates, isAuthenticated briefly becomes false → checkAuth re-fires →
    // during that re-fire window, the redirect effect sees !isAuthenticated → logouts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyLicense = async () => {
    if (!isAuthenticated) {
        setIsLicenseChecking(false);
        return;
    }
    setIsLicenseChecking(true);
    try {
        await NurseService.getDashboardStats();
        setLicenseError(null);
    } catch (err: any) {
        const errorData = err.error || err.data || {};
        const errorMessage = errorData.message || err.message || "";
        if (err.status === 403) {
            setLicenseError({
                message: errorMessage || "Your license has expired or is not yet active.",
                locked: true
            });
        } else {
            console.error("[Nurse] License check error:", err);
        }
    } finally {
        setIsLicenseChecking(false);
    }
  };

  useEffect(() => {
    if (!isLoginPage && isInitialized) {
      if (!isAuthenticated) {
        router.push(getPath('/auth/login'));
      } else if (user?.role !== 'nurse') {
        const roleMap: Record<string, string> = {
          'helpdesk': getPath('/helpdesk'),
          'staff': getPath('/staff'),
          'doctor': getPath('/doctor'),
          'hospital-admin': getPath('/hospital-admin'),
        };
        if (roleMap[user?.role || '']) router.push(roleMap[user?.role || '']!);
      }
    }
  }, [isInitialized, isAuthenticated, user?.role, router, isLoginPage, getPath]);

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
        }
      };
      initSocket();
      return () => {
        getSocket().then(socket => {
          if (socket) {
            socket.off('leave:status_change');
            socket.off('incident_update');
            socket.off('new_incident');
          }
        });
      };
    }
  }, [isAuthenticated, user, queryClient]);

  if (!isLoginPage && (!isMounted || isLoading || !isInitialized)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Checking License...</p>
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
            portalName="Nurse"
        />
    );
  }

  if (isLoginPage) return <>{children}</>;
  if (!isAuthenticated || user?.role !== 'nurse') return null;

  const nurseUser = {
    name: user?.name || "Nurse Member",
    role: "nurse",
    image: (user as any)?.image || ""
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => { await logout(); router.push(getPath('/nurse/login')); }}
        userName={user?.name}
      />

      <SharedSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        menuItems={nurseMenuItems}
        branding={{ logo: Activity, title: "CureChain", subtitle: "Nurse Portal" }}
        currentPath={pathname}
        onMenuItemClick={(path) => {
          startTransition(() => {
            router.push(getPath(path));
            setIsSidebarOpen(false);
          });
        }}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
        <Navbar
          user={nurseUser}
          onMenuClick={() => setIsSidebarOpen(true)}
          isDarkMode={theme === 'dark'}
          onThemeToggle={toggleTheme}
          actions={<NurseShiftButton />}
          onLogout={() => setIsLogoutModalOpen(true)}
          className="sticky top-0 z-30 shrink-0"
          profileHref={getPath('/nurse/profile')}
        />

        <main className="p-2 md:p-6 flex-1 overflow-y-auto relative">
          <ProgressBar color="#2563eb" isPending={isPending} />
          <div className="max-w-[1600px] mx-auto w-full">
            <React.Fragment>
                {children}
            </React.Fragment>
          </div>
          <NurseSupportFloatingBox />
        </main>
      </div>
    </div>
  );
}

export default NurseLayout;
