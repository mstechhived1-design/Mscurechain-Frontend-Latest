'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import LicenseLock from "@/components/License/LicenseLock";
import { useThemeStore } from '@/stores/themeStore';
import Navbar from '@/components/navbar/Navbar';
import LogoutModal from '@/components/auth/LogoutModal';
import PharmacySupportFloatingBox from '@/components/pharmacy/PharmacySupportFloatingBox';
import { useTenantLink } from '@/hooks/useTenantLink';
import { useQuery } from '@tanstack/react-query';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
import PharmacyQuickActions from '@/components/pharmacy/PharmacyQuickActions';
import ProgressBar from '@/components/ui/ProgressBar';
import { useRealtime } from '@/hooks/useRealtime';
import SharedSidebar from "@/components/navbar/SharedSidebar";

import {
    LayoutDashboard,
    Package,
    PlusCircle,
    Users,
    RotateCcw,
    CornerDownLeft,
    BarChart3,
    ShoppingCart,
    ShoppingBag,
    ArrowLeftRight,
    ShieldCheck,
    Pill,
} from "lucide-react";
import { useParams } from "next/navigation";

const PharmacyLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { 
        user, logout, isAuthenticated, checkAuth, isInitialized, isLoading,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();
    const params_obj = useParams() as any;
    const hospitalId = params_obj.hospitalId as string;


    useRealtime(['pharmacy', 'inventory', 'billing', 'patients', 'system']);

    const isPharma = user?.role === 'pharma-owner' || user?.role === 'pharmacy' || user?.role === 'hospital-admin';
    const isLoginPage = pathname?.includes('/pharmacy/login');

    const { data: activeOrdersCountData } = useQuery<{ count: number }>({
        queryKey: ['pharmacy', 'active-orders-count', user?.hospital],
        queryFn: () => pharmacyService.getActiveOrdersCount((user?.hospital || (user as any)?.hospitalId) as string),
        enabled: !!(user?.hospital || (user as any)?.hospitalId) && isPharma && isAuthenticated && !isLoginPage,
        refetchInterval: 10000,
    });

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
        verifyLicense();
    }, [checkAuth, isAuthenticated]);

    const verifyLicense = async () => {
        if (isLoginPage || !isAuthenticated) {
            setIsLicenseChecking(false);
            return;
        }
        setIsLicenseChecking(true);
        try {
            await pharmacyService.getMe();
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
                console.error("[Pharmacy] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    };

    useEffect(() => {
        if (!isLoginPage && isInitialized) {
            if (!isAuthenticated) {
                router.push(getPath('/auth/login'));
            } else if (!isPharma) {
                const routeMap: Record<string, string> = {
                    'staff': getPath('/staff'),
                    'doctor': getPath('/doctor'),
                    'hospital-admin': getPath('/hospital-admin'),
                    'lab': getPath('/lab/dashboard'),
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || getPath('/auth/login'));
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router, isPharma, isLoginPage, getPath]);

    if (!isLoginPage && (!isMounted || isLoading || !isInitialized)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-teal-600 font-bold">PHARMA</div>
                    </div>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Pharmacy Panel</p>
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
                portalName="Pharmacy"
            />
        );
    }

    if (isLoginPage) return <React.Fragment key="pharma-login-page-root">{children}</React.Fragment>;
    if (!isAuthenticated || !isPharma) return null;



    const pharmacyMenuItems: any[] = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/pharmacy/dashboard" },
        
        { icon: PlusCircle, label: "Create Invoice", path: "/pharmacy/billing" },
        { icon: ArrowLeftRight, label: "IPD Issuance", path: "/pharmacy/ipd-issuance" },
        { icon: RotateCcw, label: "Medicine Returns", path: "/pharmacy/medicine-return" },
        { icon: CornerDownLeft, label: "General Return", path: "/pharmacy/general-return" },
        { icon: Pill, label: "Products", path: "/pharmacy/products" },
        { icon: Users, label: "Suppliers", path: "/pharmacy/suppliers" },
        { icon: BarChart3, label: "EOD Sales Report", path: "/pharmacy/eod-sales" },
    ];

    const pharmacyUser = {
        name: user?.name || "Pharmacy User",
        role: user?.role || "pharmacy",
        image: (user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic || (user as any)?.logo
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push(getPath('/pharmacy/login')); }}
                userName={user?.name}
            />

            <div className="print:hidden">
                <SharedSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    menuItems={pharmacyMenuItems}
                    branding={{ logo: Package, title: "CureChain", subtitle: "Pharmacy Portal" }}
                    currentPath={pathname}
                    onMenuItemClick={(path) => {
                        startTransition(() => {
                            router.push(getPath(path));
                            setIsSidebarOpen(false);
                        });
                    }}
                />
            </div>

            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <div className="print:hidden">
                    <Navbar
                        user={pharmacyUser}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        isDarkMode={theme === 'dark'}
                        onThemeToggle={toggleTheme}
                        onLogout={() => setIsLogoutModalOpen(true)}
                        className="sticky top-0 z-30 shrink-0"
                        profileHref={getPath('/pharmacy/profile')}
                        centerActions={
                            <PharmacyQuickActions
                                activeOrdersCount={activeOrdersCountData?.count || 0}
                                startTransition={startTransition}
                            />
                        }
                    />
                </div>

                <main className="flex-1 p-2 md:p-6 overflow-y-auto print:overflow-visible print:p-0 relative">
                    <ProgressBar isPending={isPending} color="teal" />
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
                <div className="print:hidden">
                    <PharmacySupportFloatingBox />
                </div>
            </div>
        </div>
    );
};

export default PharmacyLayout;
