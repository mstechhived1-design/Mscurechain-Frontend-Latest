'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, ClipboardList, User } from 'lucide-react';
import LogoutModal from '@/components/auth/LogoutModal';
import { useAuthStore } from '@/stores/authStore';
import { useRealtime } from '@/hooks/useRealtime';
import Navbar from '@/components/navbar/Navbar';
import SharedSidebar from "@/components/navbar/SharedSidebar";
import LicenseLock from "@/components/License/LicenseLock";
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { ShieldCheck } from "lucide-react";

const dischargeMenuItems: any[] = [
    { icon: FileText, label: 'Discharge Form', path: '/discharge' },
    { icon: ClipboardList, label: 'Discharge History', path: '/discharge/history' },
    { icon: User, label: 'My Profile', path: '/discharge/profile' },
];

function DischargeLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { 
        user: authUser, checkAuth,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking 
    } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = React.useTransition();

    const isLoginPage = pathname === '/discharge/login';

    useRealtime(['patients', 'billing', 'beds', 'appointments', 'system']);

    useEffect(() => {
        if (isLoginPage) {
            setIsLoading(false);
            return;
        }

        const storedUser = localStorage.getItem("user");
        let userRole = localStorage.getItem("userRole");

        if (!userRole && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                userRole = parsedUser.role;
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }

        const allowedRoles = ["nurse", "helpdesk", "doctor", "admin", "super-admin", "hospital-admin"];

        if (!storedUser || !allowedRoles.includes(userRole || "")) {
            router.push("/discharge/login");
            return;
        }

        checkAuth().finally(() => {
            setIsLoading(false);
            if (localStorage.getItem("user")) {
                verifyLicense();
            }
        });
    }, [router, isLoginPage, checkAuth]);

    const verifyLicense = async () => {
        setIsLicenseChecking(true);
        try {
            await dischargeService.getPendingDischarges();
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
                console.error("[Discharge] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => { if (e.key === 'user' && e.newValue) checkAuth(); };
        const handleCustomStorageChange = () => checkAuth();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('userUpdated', handleCustomStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userUpdated', handleCustomStorageChange);
        };
    }, [checkAuth]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                        Checking Credentials
                    </p>
                </div>
            </div>
        );
    }

    if (licenseError?.locked) {
        return (
            <LicenseLock 
                message={licenseError.message}
                onRefresh={() => window.location.reload()}
                onLogout={() => {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("userRole");
                    localStorage.removeItem("user");
                    router.push("/");
                }}
                hospitalId={authUser?.hospital || (authUser as any)?.hospitalId}
                portalName="Discharge"
            />
        );
    }

    if (isLoginPage) return <>{children}</>;

    const navUser = {
        name: authUser?.name || "User",
        role: authUser?.role || "Personnel",
        image: authUser?.image || ""
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={() => {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("userRole");
                    localStorage.removeItem("user");
                    router.push("/");
                }}
                userName={authUser?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={dischargeMenuItems}
                branding={{ logo: FileText, title: "CureChain", subtitle: "Discharge Node" }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(path);
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <Navbar
                    user={navUser}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30 shrink-0"
                    profileHref="/discharge/profile"
                />

                <main className="p-2 md:p-6 flex-1 overflow-y-auto relative bg-white">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default React.memo(DischargeLayout);
