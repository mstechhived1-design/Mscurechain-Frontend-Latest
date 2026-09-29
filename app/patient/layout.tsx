'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
    User,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LogoutModal from '@/components/auth/LogoutModal';
import SharedNavbar from '@/components/navbar/SharedNavbar';
import ProgressBar from '@/components/ui/ProgressBar';

const queryClient = new QueryClient();

function PatientPortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
    }, []);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role && user.role.toLowerCase() !== 'patient') {
                const role = user.role.toLowerCase();
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharma-owner': '/pharmacy/dashboard',
                    'super-admin': '/admin',
                    'admin': '/admin',
                    'helpdesk': '/helpdesk',
                    'nurse': '/nurse'
                };
                console.log(`[PatientLayout] Non-patient user (${role}) detected. Redirecting...`);
                router.push(routeMap[role] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    const handleConfirmLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] text-center">CureChain</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mt-1">Accessing Patient Portal</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'patient') return null;

    return (
        <div className="flex min-h-screen bg-white">
            <LogoutModal
                key="logout-modal"
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                userName={user?.name}
            />

            <div key="main-content-wrapper" className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <SharedNavbar
                    key="shared-navbar"
                    hideMenuButton={true}
                    title="Patient Dashboard"
                    description="Personal Health & Medical Records"
                    profileLinks={[
                        { label: "My Profile", path: "/patient/dashboard?tab=profile", icon: User },
                    ]}
                    onLogout={() => setIsLogoutModalOpen(true)}
                    className="sticky top-0 z-30"
                />

                <main key="patient-layout-main" className="p-2 md:p-6 flex-1 bg-white relative mt-0 overflow-x-hidden">
                    <ProgressBar key="patient-layout-progress" isPending={isPending} color="indigo" />
                    <QueryClientProvider key="patient-layout-query-client" client={queryClient}>
                        <div className="w-full">
                            <React.Fragment key="patient-layout-children">
                                {children}
                            </React.Fragment>
                        </div>
                    </QueryClientProvider>
                </main>
            </div>
        </div>
    );
}

export default PatientPortalLayout;
