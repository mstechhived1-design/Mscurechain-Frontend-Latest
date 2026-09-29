"use client";

import React, { memo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  Settings,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import NotificationCenter from "@/components/navbar/NotificationCenter";
import LogoutModal from "@/components/auth/LogoutModal";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { usePrefetchDashboard } from "@/lib/integrations/hooks/useUnifiedDashboard";

interface NavbarProps {
  onMenuClick: () => void;
}

function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const userName = useAuthStore((state) => state.user?.name);
  const logout = useAuthStore((state) => state.logout);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const prefetchDashboard = usePrefetchDashboard('hospital-admin');

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/auth/login");
  }, [logout, router]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
    setIsProfileDropdownOpen(false);
  }, [router]);

  return (
    <>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        userName={userName}
      />

      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border-theme sticky top-0 z-30 bg-card/80 backdrop-blur-md">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-700 dark:text-gray-200"
        >
          ☰
        </button>

        <div className="flex-1 max-w-sm mx-4 hidden md:block" />

        <div className="flex items-center gap-3">
          <NotificationCenter />
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 py-1.5 px-2 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userName?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {userName || "Hospital Admin"}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isProfileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsProfileDropdownOpen(false)}
              />
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border z-40 overflow-hidden"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="p-1">
                  <PrefetchLink
                    href="/hospital-admin/profile"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group"
                  >
                    <User size={16} className="text-gray-400 group-hover:text-blue-500" />
                    <span>My Profile</span>
                  </PrefetchLink>
                  <PrefetchLink
                    href="/hospital-admin/settings"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group"
                  >
                    <Settings size={16} className="text-gray-400 group-hover:text-blue-500" />
                    <span>Settings</span>
                  </PrefetchLink>

                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                  <button
                    onClick={() => {
                      setIsLogoutModalOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>
    </>
  );
}

// ✅ CRITICAL: Memoize to prevent re-renders
export default memo(Navbar);
