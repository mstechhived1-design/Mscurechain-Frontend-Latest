'use client';

import React from 'react';
import { Menu, User, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect, useTransition } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';
import ProgressBar from '@/components/ui/ProgressBar';

interface NavbarProps {
    title?: string;
    onMenuClick?: () => void;
    isDarkMode?: boolean;
    onThemeToggle?: () => void;
    user?: {
        name: string;
        role: string;
        image?: string;
    };

    actions?: React.ReactNode;
    centerActions?: React.ReactNode;
    onSearch?: (query: string) => void;

    onLogout?: () => void;

    className?: string;

    showProfileDropdown?: boolean;
    profileHref?: string;
    titleHref?: string;
    showLogo?: boolean;
}


import NotificationCenter from './NotificationCenter';
import LogoutModal from '../auth/LogoutModal';

function Navbar({
    title = "MScurechain",
    onMenuClick,
    isDarkMode = false,
    onThemeToggle,
    user: propUser,
    actions,
    centerActions,
    onSearch,
    onLogout,
    className = "",
    showProfileDropdown = true,
    profileHref,
    titleHref = "/",
    showLogo = true
}: NavbarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { logout, user: authUser } = useAuthStore();
    const router = useRouter();
    const { getPath } = useTenantLink();

    const user = propUser || (authUser ? {
        name: authUser.name,
        role: authUser.role,
        image: (authUser as any).image || (authUser as any).avatar || (authUser as any).profilePic || ""
    } : undefined);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogoutClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsProfileOpen(false);
        if (onLogout) {
            onLogout();
        }
    };
    return (
        <nav className={`w-full bg-card border-b border-border-theme px-4 py-3 flex items-center justify-between sticky top-0 z-50 ${className}`}>
            <ProgressBar isPending={isPending} color="teal" />
            {/* Left Section: Logo & Menu Toggle */}
            <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>


            </div>

            {/* Center Section: Managed Actions */}
            {centerActions && (
                <div className="flex-1 flex justify-center items-center">
                    {centerActions}
                </div>
            )}

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Custom Actions */}
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                {/* Notifications */}
                <NotificationCenter showAuditHistory={user?.role?.toLowerCase() !== 'doctor'} />

                {/* Profile Dropdown Trigger */}
                {showProfileDropdown && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-gray-800 ml-2 group"
                        >
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                    {user?.name || "User"}
                                </span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    {user?.role || "Guest"}
                                    <ChevronDown className={`w-3 h-3 ${isProfileOpen ? 'rotate-180' : ''}`} />
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700 shadow-xs group-hover:border-blue-500 flex items-center justify-center text-gray-400">
                                {user?.image ? (
                                    <img src={user.image.includes('?') ? `${user.image}&t=${Date.now()}` : `${user.image}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 group-hover:text-blue-500" />
                                )}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-card rounded-2xl shadow-2xl border border-border-theme z-50 overflow-hidden p-2 transform">
                                <div className="px-4 py-3 mb-2 border-b border-gray-50 dark:border-gray-800">

                                    <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase">{user?.name}</p>
                                </div>

                                <Link
                                    href={profileHref || getPath(`/${user?.role?.toLowerCase()}/profile`)}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        startTransition(() => {
                                            router.push(profileHref || getPath(`/${user?.role?.toLowerCase()}/profile`));
                                            setIsProfileOpen(false);
                                        });
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl group"
                                >
                                    <UserCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-600 font-black" />
                                    My Profile
                                </Link>




                                <div className="my-2 border-t border-gray-50 dark:border-gray-800"></div>

                                <button
                                    onClick={handleLogoutClick}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl group"
                                >
                                    <LogOut className="w-4 h-4 group-hover:translate-x-1" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </nav>
    );
}

export default React.memo(Navbar);
