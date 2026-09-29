'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import {
    Menu,
    User,
    LogOut
} from "lucide-react";

import NotificationCenter from "@/components/navbar/NotificationCenter";
import HelpdeskQuickActions from "@/app/[hospitalId]/(portals)/helpdesk/components/HelpdeskQuickActions";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTenantLink } from "@/hooks/useTenantLink";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { usePrefetchDashboard } from "@/lib/integrations/hooks/useUnifiedDashboard";

interface HelpdeskNavbarProps {
    onMenuClick: () => void;
    onLogoutClick: () => void;
    startTransition: (callback: () => void) => void;
}

const HelpdeskNavbar: React.FC<HelpdeskNavbarProps> = ({ onMenuClick, onLogoutClick, startTransition }) => {
    const router = useRouter();
    const { user } = useAuthStore();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isPending, startTransitionLocal] = React.useTransition();
    const { getPath } = useTenantLink();
    const prefetchDashboard = usePrefetchDashboard('helpdesk');

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 w-full z-40 shadow-sm shrink-0">
            <ProgressBar isPending={isPending} color="#14b8a6" />
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 text-slate-600"
            >
                <Menu size={20} />
            </button>

            <div className="flex-1 flex justify-center">
                <HelpdeskQuickActions startTransition={startTransition} />
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <NotificationCenter />
                </div>

                <div className="h-10 w-px bg-slate-100 hidden sm:block"></div>

                <div className="relative">
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 transition-colors outline-none"
                        aria-expanded={isProfileDropdownOpen}
                        aria-haspopup="true"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{user?.name || "Staff Member"}</p>
                            <p className="text-[8px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">Helpdesk Portal</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm transition-transform">
                            {user?.name?.charAt(0)}
                        </div>
                    </button>

                    {isProfileDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                            <div className="absolute right-0 mt-4 w-72 rounded-[32px] shadow-2xl border border-slate-100 z-50 overflow-hidden bg-white animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="p-8 border-b border-slate-50">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-slate-200">
                                            {user?.name?.charAt(0)}
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-slate-900 uppercase tracking-tight">{user?.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Secure Staff Access</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 space-y-1">
                                    <PrefetchLink
                                        href={getPath('/helpdesk/profile')}
                                        onClick={() => setIsProfileDropdownOpen(false)}
                                        className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-2xl transition-all"
                                    >
                                        <User size={18} className="text-slate-300" />
                                        <span>My Profile</span>
                                    </PrefetchLink>
                                    <button
                                        onClick={() => { onLogoutClick(); setIsProfileDropdownOpen(false); }}
                                        className="w-full flex items-center gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                    >
                                        <LogOut size={18} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(HelpdeskNavbar);
