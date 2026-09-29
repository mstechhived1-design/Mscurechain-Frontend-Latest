'use client';

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { Menu, LogOut, LayoutDashboard, IndianRupee, Building2, FlaskConical, Settings, ShieldCheck, FileEdit, Wrench, Package } from "lucide-react";
import LicenseLock from "@/components/License/LicenseLock";
import LogoutModal from "@/components/auth/LogoutModal";
import LabQuickActions from "@/components/lab/LabQuickActions";
import ProgressBar from "@/components/ui/ProgressBar";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import LabSupportFloatingBox from "@/components/lab/LabSupportFloatingBox";
import { useTenantLink } from "@/hooks/useTenantLink";
import { useRealtime } from '@/hooks/useRealtime';
import SharedSidebar from "@/components/navbar/SharedSidebar";
import LabNotificationPanel from "@/components/lab/LabNotificationPanel";
import { LabSampleService } from "@/lib/integrations/services";

// Menu links will be generated dynamically to include the pending count


const LabLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const routeParams = useParams() as any;
    const { 
        user, logout, isAuthenticated, checkAuth, isLoading, isInitialized,
        licenseError, isLicenseChecking, setLicenseError, setIsLicenseChecking
    } = useAuthStore();
    const [labLogo, setLabLogo] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [activeTestCount, setActiveTestCount] = useState(0);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);
    const { getPath } = useTenantLink();

    useRealtime(['lab', 'billing', 'patients', 'system']);

    const fetchPendingCount = async () => {
        if (!isAuthenticated || user?.role !== 'lab') return;
        try {
            // Use dedicated count method — always bypasses cache for accuracy
            const count = await LabSampleService.getPendingCount();
            setActiveTestCount(count);
        } catch (error: any) {
            // Silence 403s as they are handled by the license lock
            if (error.status !== 403) {
                console.error('Failed to fetch pending test count:', error);
            }
        }
    };

    const triggerGlobalRefresh = () => {
        // Clear the entire client-side cache before re-fetching
        clearApiCache();
        fetchPendingCount();
        window.dispatchEvent(new Event('refresh-lab-data'));
    };

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
        verifyLicense();
        const handleRefresh = () => {
            clearApiCache();
            fetchPendingCount();
        };
        window.addEventListener('refresh-lab-data', handleRefresh);
        return () => window.removeEventListener('refresh-lab-data', handleRefresh);
    }, [checkAuth, isAuthenticated]);

    const verifyLicense = async () => {
        if (!isAuthenticated) {
            setIsLicenseChecking(false);
            return;
        }
        setIsLicenseChecking(true);
        try {
            // Use settings as a surrogate for license check since it's a core lab route
            await LabSampleService.getPendingCount();
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
                console.error("[Lab] License check error:", err);
            }
        } finally {
            setIsLicenseChecking(false);
        }
    };

    const isLoginPage = pathname.includes('/lab/login');

    useEffect(() => {
        if (isAuthenticated && (user?.role === 'lab' || user?.role === 'hospital-admin') && isMounted && !isLoginPage) {
            fetchPendingCount();
        }
    }, [isAuthenticated, user, isMounted, isLoginPage]);

    useEffect(() => {
        if (!isLoginPage && isInitialized) {
            if (!isAuthenticated) {
                router.push(getPath('/auth/login'));
            } else if (user?.role !== 'lab' && user?.role !== 'hospital-admin') {
                const routeMap: Record<string, string> = {
                    'staff': getPath('/staff'),
                    'doctor': getPath('/doctor'),
                    'hospital-admin': getPath('/hospital-admin'),
                    'pharma-owner': getPath('/pharmacy/dashboard'),
                    'pharmacy': getPath('/pharmacy/dashboard'),
                    'admin': '/admin'
                };
                router.push(routeMap[user?.role || ''] || getPath('/auth/login'));
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router, isLoginPage, getPath]);

    useEffect(() => {
        let socketInstance: any = null;

        if (isAuthenticated && user?.role === 'lab') {
            const hId = (routeParams?.hospitalId as string);
            
            // Join the hospital-specific room for real-time updates
            joinSocketRoom({ role: 'lab', userId: user.id, hospitalId: hId });

            getSocket().then(socket => {
                if (socket) {
                    socketInstance = socket;
                    
                    // Handler function to re-fetch count when a change is detected
                    // Two-tier delay: first at 500ms, then again at 2s to catch any slow DB writes
                    const handleUpdate = () => {
                        console.log('📡 [LabLayout] Real-time event received, refreshing count...');
                        // First refresh shortly after event — covers fast DB writes
                        setTimeout(() => {
                            clearApiCache();
                            fetchPendingCount();
                        }, 500);
                        // Second refresh after 2s — handles slower writes or network lag
                        setTimeout(() => {
                            clearApiCache();
                            fetchPendingCount();
                        }, 2000);
                    };

                    socket.on('new_lab_order', handleUpdate);
                    socket.on('sample_collected', handleUpdate);
                    socket.on('lab_order_updated', handleUpdate);
                    socket.on('payment_status_changed', handleUpdate);
                    socket.on('bill_generated', handleUpdate);
                    socket.on('lab_refresh_forced', handleUpdate);
                }
            });
        }

        return () => {
            if (socketInstance) {
                socketInstance.off('new_lab_order');
                socketInstance.off('sample_collected');
                socketInstance.off('lab_order_updated');
                socketInstance.off('payment_status_changed');
                socketInstance.off('bill_generated');
                socketInstance.off('lab_refresh_forced');
            }
        };
    }, [isAuthenticated, user, routeParams?.hospitalId]);

    if (!isLoginPage && (!isMounted || isLoading || !isInitialized)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-purple-600 font-bold">LAB</div>
                    </div>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Lab Panel</p>
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
                hospitalId={routeParams?.hospitalId as string}
                portalName="Lab"
            />
        );
    }

    if (isLoginPage) return <>{children}</>;
    if (!isAuthenticated || (user?.role !== 'lab' && user?.role !== 'hospital-admin')) return null;

    const currentMenuLinks = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/lab/dashboard" },
        { icon: IndianRupee, label: "Transactions", path: "/lab/billing/transactions" },
        { icon: Building2, label: "Departments", path: "/lab/departments" },
        { icon: FlaskConical, label: "Test Master", path: "/lab/tests" },
        { icon: FileEdit, label: "Edited Results", path: "/lab/edited-results" },
        { icon: Wrench, label: "Equipment", path: "/lab/equipment" },
        { icon: Package, label: "Inventory", path: "/lab/inventory" },
        { icon: Settings, label: "Settings", path: "/lab/settings" },
    ];

    return (
        <div className="flex min-h-screen bg-background text-slate-900">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push(getPath('/lab/login')); }}
                userName={user?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={currentMenuLinks}
                branding={{ logo: FlaskConical, title: "CureChain", subtitle: "Lab Portal" }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(getPath(path));
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <ProgressBar isPending={isPending} color="blue" />
                <header className="h-16 flex items-center justify-between px-6 border-b border-border-theme bg-card sticky top-0 z-20 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="flex-1 flex justify-center items-center mx-4">
                        <LabQuickActions activeTestCount={activeTestCount} startTransition={startTransition} />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <LabNotificationPanel />
                        
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                                {((user as any)?.profilePic || (user as any)?.avatar || (user as any)?.image || (user as any)?.logo) ? (
                                    <img src={(user as any)?.profilePic || (user as any)?.avatar || (user as any)?.image || (user as any)?.logo} alt={user?.name || "Lab User"} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || 'L'
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-700">{user?.name || "Lab User"}</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Lab Technician</span>
                            </div>
                        </div>

                        <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <main className="p-2 md:p-6 flex-1 overflow-y-auto bg-background">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
                <LabSupportFloatingBox />
            </div>
        </div>
    );
};

export default LabLayout;
