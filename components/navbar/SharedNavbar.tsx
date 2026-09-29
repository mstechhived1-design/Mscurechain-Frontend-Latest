'use client';

import React, { useState, useRef, useEffect, useTransition } from "react";
import {
    Menu,
    ChevronDown,
    User,
    Settings,
    LogOut,
    Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTenantLink } from "@/hooks/useTenantLink";
import NotificationCenter from "./NotificationCenter";
import ProgressBar from "@/components/ui/ProgressBar";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { usePrefetchDashboard } from "@/lib/integrations/hooks/useUnifiedDashboard";

interface SharedNavbarProps {
    onMenuClick?: () => void;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    centerActions?: React.ReactNode;
    showNotificationCenter?: boolean;
    profileLinks?: { label: string; path: string; icon: any; key?: string }[];
    onLogout?: () => void;
    progressBarColor?: string;
    className?: string; // ✅ Added className support
    hideMenuButton?: boolean;
}

const SharedNavbar: React.FC<SharedNavbarProps> = ({
    onMenuClick,
    title,
    description,
    actions,
    centerActions,
    showNotificationCenter = true,
    profileLinks,
    onLogout,
    progressBarColor = "indigo",
    className = "", // ✅ Default empty string
    hideMenuButton = false,
}) => {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { getPath } = useTenantLink();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const prefetchDashboard = usePrefetchDashboard(user?.role || '');

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await logout();
            router.push("/auth/login");
        }
    };

    return (
        <header className={`h-16 flex items-center justify-between px-3 sm:px-4 border-b border-slate-200 z-20 bg-white/80 backdrop-blur-md transition-all duration-300 w-full ${className}`}>
            <ProgressBar isPending={isPending} color={progressBarColor} />
            <div className="flex items-center gap-4">
                {!hideMenuButton && onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
                        aria-label="Open sidebar"
                    >
                        <Menu size={20} />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 lg:flex hidden">
                        <Activity size={20} />
                    </div>
                    {title && (
                        <div className="sm:block">
                            <h2 className="text-sm font-bold text-slate-900 leading-none uppercase tracking-tight">{title}</h2>
                            {description && <p className="text-[10px] text-slate-500 mt-1 font-medium">{description}</p>}
                        </div>
                    )}
                </div>
            </div>

            {centerActions && (
                <div className="flex flex-1 justify-center items-center">
                    <div className="scale-75 sm:scale-90 xl:scale-100 origin-center">
                        {centerActions}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3">
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                {showNotificationCenter && (
                    <div className="flex items-center gap-2">
                        <NotificationCenter />
                    </div>
                )}

                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary-theme overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
                            {(user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic ? (
                                <img 
                                    src={((user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic).includes('?') 
                                        ? `${(user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic}&t=${Date.now()}` 
                                        : `${(user as any)?.image || (user as any)?.avatar || (user as any)?.profilePic}?t=${Date.now()}`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                user?.name?.charAt(0).toUpperCase() || "U"
                            )}
                        </div>
                        <div className="hidden lg:block text-left">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                                {user?.name || "User Account"}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {user?.role || "Member"}
                            </p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-slate-200 bg-white z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1">
                            {profileLinks?.map((link: any, index: number) => (
                                <PrefetchLink
                                    key={link.key || link.path || `link-${index}`}
                                    href={link.path}
                                    onPrefetch={link.path.includes('dashboard') ? prefetchDashboard : undefined}
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-lg group text-slate-600 hover:text-slate-900"
                                >
                                    <link.icon size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    <span>{link.label}</span>
                                </PrefetchLink>
                            ))}

                            {!profileLinks && (
                                <>
                                    <PrefetchLink
                                        key="official-profile"
                                        href={getPath(`/${user?.role}/profile`)}
                                        onClick={() => setIsProfileDropdownOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                                    >
                                        <User size={16} className="text-slate-400 group-hover:text-indigo-500" />
                                        <span>Official Profile</span>
                                    </PrefetchLink>
                                    <PrefetchLink
                                        key="preferences"
                                        href={getPath(`/${user?.role}/settings`)}
                                        onClick={() => setIsProfileDropdownOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                                    >
                                        <Settings size={16} className="text-slate-400 group-hover:text-indigo-500" />
                                        <span>Preferences</span>
                                    </PrefetchLink>
                                </>
                            )}

                            <div className="h-px bg-slate-100 my-1 mx-2"></div>

                            <button
                                onClick={() => {
                                    setIsProfileDropdownOpen(false);
                                    handleLogout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all rounded-lg group"
                            >
                                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(SharedNavbar);
