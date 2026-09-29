'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    Settings,
    Headphones,
    ClipboardList,
    Menu,
    LogOut,
    Bell,
    Stethoscope,
    UserPlus,
    CalendarPlus,
    Clock,
    Bot,
    ShieldCheck
} from "lucide-react";
import SharedSidebar from "@/components/navbar/SharedSidebar";
import LogoutModal from "@/components/auth/LogoutModal";
import { useTenantLink } from "@/hooks/useTenantLink";
import ProgressBar from "@/components/ui/ProgressBar";
import AIAssistantModal from "@/components/masterhelpdesk/AIAssistantModal";
import MasterHelpdeskQuickActions from "./components/MasterHelpdeskQuickActions";
import NotificationCenter from "@/components/navbar/NotificationCenter";
import LicenseLock from "@/components/License/LicenseLock";

const masterhelpdeskMenu: any[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/masterhelpdesk" },
    { icon: Clock, label: "Queue", path: "/masterhelpdesk/queue" },
    { icon: CalendarPlus, label: "Book Appointment", path: "/masterhelpdesk/appointment-booking" },
    { icon: ClipboardList, label: "Patients List", path: "/masterhelpdesk/patients" },
    { icon: Stethoscope, label: "Doctors", path: "/masterhelpdesk/doctors" },
    { icon: Headphones, label: "Support", path: "/masterhelpdesk/support" },
    { icon: Settings, label: "Settings", path: "/masterhelpdesk/settings" },
];

export function MasterHelpdeskLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const params = useParams() as any;
    const currentHospitalId = params?.hospitalId as string;
    const { 
        user, logout, isAuthenticated, checkAuth, isLoading, isInitialized,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();

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
            const { masterHelpdeskService } = await import("@/lib/integrations/services/masterHelpdesk.service");
            await masterHelpdeskService.getMe();
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
                console.error("[MasterHelpdesk] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    }

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                window.location.href = '/auth/login';
                return;
            } else if (user?.role !== 'masterhelpdesk') {
                 const routeMap: Record<string, string> = {
                     'staff': '/staff',
                     'doctor': '/doctor',
                     'hospital-admin': '/hospital-admin',
                     'lab': '/lab/dashboard',
                     'pharma-owner': '/pharmacy/dashboard',
                     'super-admin': '/admin',
                     'admin': '/admin',
                     'patient': '/patient/dashboard',
                     'helpdesk': '/helpdesk'
                 };
                 const targetRoute = routeMap[user?.role || ''] || '/auth/login';
                 window.location.href = targetRoute;
            }
        }
    }, [isAuthenticated, isInitialized, user?.role]);

    if (!isMounted || isLoading || !isInitialized || isLicenseChecking) {
        return (
            <div key="loader" className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div key="loader-inner" className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Starting System...</p>
                    </div>
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
                hospitalId={currentHospitalId}
                portalName="Master Helpdesk"
            />
        );
    }

    if (!isAuthenticated || user?.role !== 'masterhelpdesk') return null;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <LogoutModal
                key="logout-modal"
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => {
                    await logout();
                    window.location.href = '/auth/login';
                }}
                userName={user?.name}
            />

            <SharedSidebar
                key="shared-sidebar"
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={masterhelpdeskMenu}
                branding={{
                    logo: Headphones,
                    title: "CureChain",
                    subtitle: "Master Helpdesk"
                }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div key="main-content" className="flex-1 flex flex-col min-h-screen w-full min-w-0 relative">
                {/* Minimal Navbar for Master Helpdesk */}
                <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-sm font-bold text-slate-800">Master portal</h2>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                        <MasterHelpdeskQuickActions startTransition={startTransition} />
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationCenter hospitalId={currentHospitalId} />
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(getPath('/masterhelpdesk/settings'))}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-200 hover:scale-110 hover:shadow-md transition-all active:scale-95"
                                title="Settings"
                            >
                                {user?.name?.charAt(0).toUpperCase() || 'M'}
                            </button>
                            <button 
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 bg-[#F8FAFC] w-full min-w-0">
                    <div className="p-2 md:p-6 w-full min-w-0 max-w-[1600px] mx-auto">
                        <ProgressBar key="progress" isPending={isPending} color="#4f46e5" />
                        <React.Fragment key="children">
                            {children}
                        </React.Fragment>
                    </div>
                </main>

                {/* Floating AI Assistant Button */}
                <button
                    onClick={() => setIsAIAssistantOpen(true)}
                    className={`fixed bottom-6 right-6 z-40 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all duration-300 hover:scale-110 active:scale-95 group ${isAIAssistantOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                >
                    <div className="relative">
                        <Bot size={24} />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-indigo-600 rounded-full animate-pulse"></span>
                    </div>
                    {/* Tooltip */}
                
                </button>

                <AIAssistantModal
                    isOpen={isAIAssistantOpen}
                    onClose={() => setIsAIAssistantOpen(false)}
                />
            </div>
        </div>
    );
}

export default React.memo(MasterHelpdeskLayout);
