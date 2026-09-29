"use client";

import React, { memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    IndianRupee,
    FlaskConical,
    Settings,
    X,
    Building2,
    FileEdit,
    Wrench,
    Package,
} from "lucide-react";
import { useTenantLink } from "@/hooks/useTenantLink";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTestCount?: number;
    onLogout?: () => void;
    isPending?: boolean;
    startTransition?: (callback: () => void) => void;
}

function LabSidebar({ isOpen, onClose, activeTestCount = 0, onLogout, isPending, startTransition }: SidebarProps) {
    const pathname = usePathname() as string;
    const router = useRouter(); // ✅ use standard useRouter from next/navigation
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY

    const handleNavigation = (path: string) => {
        onClose();
        if (pathname === path) return;
        if (startTransition) {
            startTransition(() => {
                router.push(path);
            });
        } else {
            router.push(path);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Mobile Close Button */}
            {isOpen && (
                <button
                    onClick={onClose}
                    className="lg:hidden fixed top-2 right-4 z-50 p-2 rounded-lg shadow-sm bg-card text-gray-600 dark:text-gray-300"
                >
                    <X size={20} />
                </button>
            )}

            {/* Sidebar */}
            <div
                className={`
          fixed left-0 top-0 h-full w-56 text-gray-600 dark:text-gray-300 flex flex-col z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          border-r border-border-theme bg-card
        `}
            >
                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-border-theme">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                            <FlaskConical className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">
                                CureChain
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Lab Portal</p>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 hide-scrollbar">

                    {/* Dashboard */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/dashboard'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/dashboard')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <LayoutDashboard
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/dashboard' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Dashboard
                    </button>

                    {/* Billing */}
                    

                    {/* Transactions */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/billing/transactions'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/billing/transactions')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <IndianRupee
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/billing/transactions' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Transactions
                    </button>

                    {/* Section Divider - Lab Test Catalog */}
                    <div className="pt-4 pb-1">
                        <div className="px-2">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lab Test Catalog</p>
                        </div>
                    </div>

                    {/* Departments */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/departments'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/departments')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <Building2
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/departments' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Departments
                    </button>

                    {/* Test Master */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/tests'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/tests')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <FlaskConical
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/tests' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Test Master
                    </button>

                    {/* Edited Results */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/edited-results'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/edited-results')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <FileEdit
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/edited-results' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Edited Results
                    </button>

                    {/* Equipment */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/equipment'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/equipment')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <Wrench
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/equipment' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Equipment
                    </button>

                    {/* Inventory */}
                    <button
                        onClick={() => handleNavigation(getPath('/lab/inventory'))}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 w-full text-left group
              ${pathname === getPath('/lab/inventory')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <Package
                            size={20}
                            className={`transition-colors duration-200 ${pathname === '/lab/inventory' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-500"}`}
                        />
                        Inventory
                    </button>

                </div>

                {/* Footer - Settings & Logout */}
                <div className="p-3 space-y-1 border-t border-border-theme">
                    <button
                        onClick={() => handleNavigation(getPath('/lab/settings'))}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 group
                            ${pathname === getPath('/lab/settings')
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <Settings size={20} className={`transition-colors duration-200 ${pathname === '/lab/settings' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:rotate-90"}`} />
                        Settings
                    </button>
                </div>
            </div>
        </>
    );
}

export default memo(LabSidebar);
