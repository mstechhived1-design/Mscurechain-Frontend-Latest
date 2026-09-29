'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Building2,
  Stethoscope,
  Headphones,
  Bell,
  ShieldCheck,
  BedDouble,
  HeartPulse,
  DoorOpen,
  Hospital,
  Megaphone,
} from "lucide-react";
import LicenseLock from "@/components/License/LicenseLock";
import LogoutModal from "@/components/auth/LogoutModal";
import { useTenantLink } from "@/hooks/useTenantLink";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import NotificationCenter from "@/components/navbar/NotificationCenter";
import HRNavQuickActions from "./components/HRNavQuickActions";
import Navbar from "@/components/navbar/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import { hrService } from "@/lib/integrations/services/hr.service";
import { useRealtime } from '@/hooks/useRealtime';

import SharedSidebar from "@/components/navbar/SharedSidebar";

const hrMenuLinks = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/hr" },
  { icon: Users, label: "Staff Directory", path: "/hr/staff" },
  { icon: Stethoscope, label: "Doctors", path: "/hr/doctors" },
  { icon: HeartPulse, label: "Nursing Registry", path: "/hr/nurses" },
  { icon: Headphones, label: "Helpdesk", path: "/hr/helpdesks" },
  { icon: Briefcase, label: "Recruitment", path: "/hr/recruitment" },
  { icon: Building2, label: "Departments", path: "/hr/departments" },
  { icon: DoorOpen, label: "Rooms", path: "/hr/rooms" },
  { icon: BedDouble, label: "Beds", path: "/hr/beds" },
  { icon: FileText, label: "Document Vault", path: "/hr/documents" },
  { icon: Hospital, label: "Inpatients", path: "/hr/inpatients" },
  { icon: Megaphone, label: "Announcements", path: "/hr/announcements" },
];

export function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() as string;
  const { 
    user, isAuthenticated, isInitialized, logout, checkAuth, isLoading,
    licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
  } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const { getPath } = useTenantLink();

  useRealtime(['hr', 'staff', 'system']);

  const isLoginPage = pathname.includes('/hr/login');

  useEffect(() => {
    setIsMounted(true);
    checkAuth();
    verifyLicense();
  }, [checkAuth, isAuthenticated]);

  const verifyLicense = async () => {
    if (!isAuthenticated) {
        setIsLicenseChecking(false);
        return;
    }
    setIsLicenseChecking(true);
    try {
        await hrService.getStats();
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
            console.error("[HR] License check error:", err);
        }
    } finally {
        setIsLicenseChecking(false);
    }
  };

  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isLoginPage) {
      router.push(getPath('/hr/login'));
    }
  }, [isAuthenticated, isInitialized, router, isLoginPage, getPath]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const initSocket = async () => {
      const socket = await getSocket();
      if (!socket) return;
      joinSocketRoom({
        userId: user.id || (user as any)._id,
        role: user.role || "hr",
        hospitalId: (user as any).hospital || (user as any).hospitalId,
      });
      socket.on("recruitment_review_update", (data: any) => {
        toast(data.message || "Recruitment Request Updated", { icon: data.status === 'approved' ? "✅" : "❌", duration: 6000 });
        queryClient.invalidateQueries({ queryKey: ["hr", "recruitment"] });
      });
      socket.on("leave:status_change", (data: any) => {
        toast(data.message || `Leave request ${data.leave.status}`, { icon: data.leave.status === 'approved' ? "✅" : "❌", duration: 6000 });
        queryClient.invalidateQueries({ queryKey: ["hr", "leaves"] });
      });
    };
    initSocket();
    return () => {
      getSocket().then(socket => { if (socket) socket.off("recruitment_review_update"); });
    };
  }, [isAuthenticated, user, queryClient]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const prefetchData = async () => {
        try {
          queryClient.prefetchQuery({ queryKey: ['hr', 'stats'], queryFn: () => hrService.getStats(), staleTime: 60000 });
          queryClient.prefetchQuery({ queryKey: ['hr', 'staff'], queryFn: () => hrService.getAllStaff({ limit: 20 }), staleTime: 60000 });
          queryClient.prefetchQuery({ queryKey: ['hr', 'leaves'], queryFn: () => hrService.getLeaves({ limit: 20 }), staleTime: 60000 });
        } catch (e) { console.error('Prefetch error:', e); }
      };
      prefetchData();
    }
  }, [isAuthenticated, user, queryClient]);

  if (!isLoginPage && (!isMounted || isLoading || !isInitialized)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-6">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
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
            portalName="HR"
        />
    );
  }

  if (isLoginPage) return <>{children}</>;

  const hrUser = {
    name: user?.name || 'HR Manager',
    role: 'HR',
    image: (user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic || '',
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => { await logout(); router.push(getPath('/hr/login')); }}
        userName={user?.name}
      />

      <SharedSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        menuItems={hrMenuLinks}
        branding={{ logo: Briefcase, title: "CureChain", subtitle: "HR Portal" }}
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
          user={hrUser}
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={() => setIsLogoutModalOpen(true)}
          className="sticky top-0 z-30 shrink-0"
          profileHref={getPath('/hr/profile')}
          centerActions={<HRNavQuickActions />}
          titleHref={getPath('/hr')}
          showLogo={false}
        />

        <main className="flex-1 p-2 md:p-6 overflow-y-auto relative">
          <ProgressBar color="#4f46e5" isPending={isPending} />
          <div className="max-w-[1600px] mx-auto">
            <React.Fragment>
                {children}
            </React.Fragment>
          </div>
        </main>
      </div>
    </div>
  );
}

export default HRLayout;
