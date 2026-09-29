'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from '@/stores/authStore';
import LicenseLock from "@/components/License/LicenseLock";
import {
    Stethoscope,
    UserCheck,
    Bell,
    Activity,
    CalendarClock,
    ShieldAlert,
    ShieldCheck,
    FlaskConical,
    History,
    FileText,
    TrendingUp,
    HeartPulse
} from "lucide-react";
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationCenter from "@/components/navbar/NotificationCenter";
import LogoutModal from "@/components/auth/LogoutModal";
import { getSocket, joinSocketRoom } from '@/lib/integrations/api/socket';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import toast from 'react-hot-toast';
import { useNotifications, useDoctorInpatients } from '@/lib/integrations/hooks';
import Navbar from "@/components/navbar/Navbar";
import DoctorQuickActions from "@/components/doctor/DoctorQuickActions";
import { useThemeStore } from '@/stores/themeStore';
import DoctorSupportFloatingBox from "@/components/doctor/DoctorSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";
import { getDoctorInpatientsAction } from '@/lib/integrations/actions/doctor.actions';
import ProgressBar from "@/components/ui/ProgressBar";
import { useRealtime } from '@/hooks/useRealtime';


import SharedSidebar from "@/components/navbar/SharedSidebar";

const doctorMenuLinks = [
    { icon: Stethoscope, label: "Dashboard", path: "/doctor" },
    { icon: TrendingUp, label: "Analytics", path: "/doctor/analytics" },
    { icon: UserCheck, label: "Patients", path: "/doctor/patients" },
    { icon: History, label: "Paused Appointments", path: "/doctor/paused-appointments" },
    { icon: FlaskConical, label: "Lab Results", path: "/doctor/lab-results" },
    { icon: HeartPulse, label: "Hourly Monitoring", path: "/doctor/patient-hourly-record" },
    { icon: CalendarClock, label: "Leave Requests", path: "/doctor/leaves" },
    { icon: ShieldAlert, label: "Medical Incident", path: "/doctor/incidents" },
    { icon: ShieldCheck, label: "SOP & Policies", path: "/doctor/sop" },
    { icon: Bell, label: "Announcements", path: "/doctor/announcements" },
];

const DoctorLayout = ({ children }: { children: React.ReactNode }) => {
    // ... hooks ...
    const router = useRouter();
    const pathname = usePathname() as string;
    const { 
        user, isAuthenticated, isInitialized, logout, checkAuth, isLoading,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = useTransition();
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink();
    const params_obj = useParams() as any;
    const hospitalId = params_obj.hospitalId as string;


    // ... useNotifications, useDoctorInpatients, realtime hooks ...
    useRealtime(['appointments', 'patients', 'lab', 'pharmacy', 'beds', 'emergency', 'system']);

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
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
            await doctorService.getMe();
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
                console.error("[Doctor] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    };

    const { data: inpatientData } = useDoctorInpatients(user?.id, user?.role);
    const inpatientStats = React.useMemo(() => {
        const admissions = inpatientData || [];
        return {
            total: admissions.length,
            critical: admissions.filter(a => a.vitals?.status === 'Critical').length,
            warning: admissions.filter(a => a.vitals?.status === 'Warning').length
        };
    }, [inpatientData]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (!['doctor', 'hospital-admin', 'super-admin', 'nurse'].includes(user?.role || '')) {
                const routeMap: Record<string, string> = {
                    'helpdesk': '/helpdesk',
                    'staff': '/staff',
                    'lab': '/lab/dashboard',
                    'patient': '/patient/dashboard',
                    'pharmacy': '/pharmacy/dashboard',
                    'admin': '/admin',
                    'hr': '/hr',
                    'frontdesk': '/frontdesk'
                };
                router.push(routeMap[user?.role || ''] || "/auth/login");
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-xl font-black text-foreground uppercase tracking-tighter italic">Doctor Portal</p>
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
                hospitalId={hospitalId}
                portalName="Doctor"
            />
        );
    }

    if (!isAuthenticated || !['doctor', 'hospital-admin', 'super-admin', 'nurse'].includes(user?.role || '')) return null;

    const doctorUser = {
        name: user?.name || 'Doctor',
        role: 'doctor',
        image: (user as any)?.image || ''
    };

    return (
        <div className="flex min-h-screen bg-background selection:bg-emerald-100">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push('/auth/login'); }}
                userName={user?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={doctorMenuLinks}
                branding={{ 
                    logo: Activity, 
                    title: "CureChain", 
                    subtitle: "Doctor Portal" 
                }}
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
                    user={doctorUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30 shrink-0"
                    profileHref={getPath('/doctor/profile')}
                    centerActions={<DoctorQuickActions inpatientStats={inpatientStats} startTransition={startTransition} />}
                    titleHref={getPath('/doctor')}
                    showLogo={false}
                />

                <main className="p-2 md:p-6 flex-1 overflow-y-auto relative">
                    <ProgressBar isPending={isPending} color="emerald" />
                    <div className="max-w-[1600px] mx-auto">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
                <DoctorSupportFloatingBox />
            </div>
        </div>
    );
}

export default React.memo(DoctorLayout);
