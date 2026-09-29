'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Beaker, FileText, ArrowRight } from 'lucide-react';
import { useTenantLink } from "@/hooks/useTenantLink";

interface LabQuickActionsProps {
    activeTestCount?: number;
    startTransition: (callback: () => void) => void;
}

const LabQuickActions: React.FC<LabQuickActionsProps> = ({ activeTestCount = 0, startTransition }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    const actions = [
        {
            label: 'Billing',
            icon: IndianRupee,
            path: '/lab/billing',
        },
        {
            label: 'Sample',
            icon: Beaker,
            path: '/lab/samples',
            badge: activeTestCount > 0 ? { count: activeTestCount } : null
        },
        {
            label: 'Result Entry',
            icon: FileText,
            path: '/lab/results',
        },
    ];

    const handleActionClick = (path: string) => {
        startTransition(() => router.push(getPath(path)));
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Main Row */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800/40 p-1 rounded-full border border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm overflow-x-auto max-w-[calc(100vw-120px)] sm:max-w-none no-scrollbar">
                {actions.map((action, index) => {
                    const tenantPath = getPath(action.path);
                    const isActive = action.path === '/lab/billing'
                        ? pathname === tenantPath
                        : pathname.includes(tenantPath);
                    const Icon = action.icon;

                    return (
                        <React.Fragment key={action.path}>
                            <button
                                onClick={() => handleActionClick(action.path)}
                                className={`
                                    flex items-center gap-1.5 sm:gap-2 py-1.5 px-4 sm:px-6 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 group whitespace-nowrap
                                    ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-gray-700/50'}
                                `}
                            >
                                <Icon size={16} className={`shrink-0 transition-transform hover:scale-110`} />
                                
                                <span className="hidden sm:inline ml-1.5">{action.label}</span>

                                {action.badge && (
                                    <div className="flex items-center border-l border-current/20 pl-2 ml-1.5">
                                        <span className={`px-1 py-0.5 rounded-md tabular-nums text-[8px] min-w-[18px] text-center ${isActive ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400"}`}>
                                            {action.badge.count}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

        </div>
    );
};

export default LabQuickActions;
