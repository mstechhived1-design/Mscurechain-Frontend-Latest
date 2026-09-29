'use client';

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    Bed,
    TestTube,
    UserCheck,
    Stethoscope,
    FileCheck,
    Siren,
    UserMinus,
    BellRing,
    Banknote,
    BarChart3,
    Wallet,
    Headphones
} from "lucide-react";
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { useParams } from "next/navigation";
import SharedSidebar from "@/components/navbar/SharedSidebar";
import HelpdeskNavbar from "@/components/navbar/HelpdeskNavbar";
import LogoutModal from "@/components/auth/LogoutModal";
import HelpdeskSupportFloatingBox from "./components/HelpdeskSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";
import ProgressBar from "@/components/ui/ProgressBar";
import { useRealtime } from '@/hooks/useRealtime';
import LicenseLock from "@/components/License/LicenseLock";

const helpdeskMenu: any[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/helpdesk" },
    { icon: Bed, label: "IPD Center", path: "/helpdesk/ipd" },
    { icon: TestTube, label: "Lab Billing", path: "/helpdesk/lab-billing" },
    { icon: UserCheck, label: "Patient List", path: "/helpdesk/patients" },
    { icon: Stethoscope, label: "Doctors List", path: "/helpdesk/doctors" },
    { icon: FileCheck, label: "Files & Receipts", path: "/helpdesk/transits" },
    { icon: Siren, label: "Emergency Cases", path: "/helpdesk/emergency-accept" },
    { icon: UserMinus, label: "Discharge Queue", path: "/helpdesk/discharge" },
    { icon: BellRing, label: "Hospital Announcements", path: "/helpdesk/announcements" },
    { icon: Banknote, label: "OPD Receipts & Slips", path: "/frontdesk/receipts" },
    { icon: BarChart3, label: "Transaction Reports", path: "/frontdesk/transaction-reports" },
    { icon: Wallet, label: "Final Bill", path: "/frontdesk/final-bill" },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const {
        user, logout, isAuthenticated, checkAuth, isLoading, isInitialized,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking
    } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();
    const params_obj = useParams() as any;
    const hospitalId = params_obj.hospitalId as string;


    useRealtime(['helpdesk', 'appointments', 'patients', 'billing', 'staff', 'system', 'emergency']);

    const verifyLicense = useCallback(async () => {
        if (!isAuthenticated) {
            setIsLicenseChecking(false);
            return;
        }
        setIsLicenseChecking(true);
        try {
            await helpdeskService.getMe();
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
                console.error("[Helpdesk] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    }, [isAuthenticated, setIsLicenseChecking, setLicenseError]);

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
        verifyLicense();
    }, [checkAuth, isAuthenticated, verifyLicense]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                window.location.href = '/auth/login';
                return;
            } else if (user?.role !== 'helpdesk' && user?.role !== 'frontdesk') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin',
                    'patient': '/patient/dashboard'
                };
                const targetRoute = routeMap[user?.role || ''] || '/auth/login';
                window.location.href = targetRoute;
            }
        }
    }, [isAuthenticated, isInitialized, user?.role]);

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div key="helpdesk-init-loader" className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div key="helpdesk-init-loader-inner" className="flex flex-col items-center gap-6">
                    <div key="helpdesk-spinner" className="w-16 h-16 border-4 border-teal-600/10 border-t-teal-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Checking License...</p>
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
                hospitalId={hospitalId}
                portalName="Helpdesk"
            />
        );
    }

    if (!isAuthenticated || (user?.role !== 'helpdesk' && user?.role !== 'frontdesk')) return null;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans selection:bg-teal-100 selection:text-teal-900">
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
                menuItems={helpdeskMenu}
                branding={{
                    logo: Headphones,
                    title: "CureChain",
                    subtitle: "Helpdesk Portal"
                }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div key="main-content-wrapper" className="flex-1 flex flex-col min-h-screen w-full min-w-0 relative">
                <HelpdeskNavbar
                    key="helpdesk-navbar"
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogoutClick={() => setIsLogoutModalOpen(true)}
                    startTransition={startTransition}
                />

                <main key="helpdesk-layout-main" className="flex-1 bg-[#F8FAFC] w-full min-w-0">
                    <div key="helpdesk-layout-content-wrapper" className="p-2 md:p-6 w-full min-w-0 max-w-[1600px] mx-auto">
                        <ProgressBar key="helpdesk-layout-progress" isPending={isPending} color="#14b8a6" />
                        <React.Fragment key="helpdesk-layout-children">
                            {children}
                        </React.Fragment>
                    </div>
                </main>

                <HelpdeskSupportFloatingBox key="helpdesk-support-floating-box" />
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            `}</style>
        </div>
    );
}

export default React.memo(DashboardLayout);