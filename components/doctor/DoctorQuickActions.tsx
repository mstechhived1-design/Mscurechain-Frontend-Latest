'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { useTenantLink } from "@/hooks/useTenantLink";
import Link from 'next/link';

interface DoctorQuickActionsProps {
    inpatientStats: {
        total: number;
        critical: number;
        warning: number;
    };
    startTransition: (callback: () => void) => void;
}

const DoctorQuickActions: React.FC<DoctorQuickActionsProps> = ({ inpatientStats, startTransition }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const actions = React.useMemo(() => [
        {
            label: 'Inpatients',
            icon: Activity,
            path: '/doctor/inpatients',
            badge: inpatientStats.total > 0 ? {
                count: inpatientStats.total,
                critical: inpatientStats.critical,
                warning: inpatientStats.warning
            } : null
        },
        {
            label: 'Appointments',
            icon: Calendar,
            path: '/doctor/appointments',
        },
        {
            label: 'Prescriptions',
            icon: FileText,
            path: '/doctor/prescription',
        },
    ], [inpatientStats]);

    const handleActionClick = (index: number) => {
        setActiveIndex(index);
        // We let the Link handle navigation for maximum speed (prefetching)
        // But we can still use startTransition if we want to synchronize with parent ProgressBar
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Main Row */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800/40 p-1 rounded-full border border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm overflow-x-auto max-w-[calc(100vw-140px)] sm:max-w-none no-scrollbar">
                {actions.map((action, index) => {
                    const tenantPath = getPath(action.path);
                    const isActive = pathname.includes(tenantPath);
                    const isSelected = activeIndex === index;
                    const Icon = action.icon;

                    return (
                        <React.Fragment key={action.path}>
                            <Link
                                href={tenantPath}
                                prefetch={true}
                                onClick={() => handleActionClick(index)}
                                onBlur={() => setTimeout(() => setActiveIndex(null), 200)}
                                className={`
                                    flex items-center gap-1.5 sm:gap-2 py-1 sm:py-1.5 px-2.5 sm:px-4 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all duration-300 group
                                    ${isActive
                                        ? 'bg-primary-theme text-white shadow-lg shadow-primary-theme/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'}
                                    ${isSelected ? 'bg-primary-theme/10 ring-1 ring-primary-theme/30' : ''}
                                `}
                            >
                                <Icon size={14} className={`shrink-0 transition-transform ${isSelected ? 'scale-110' : ''}`} />
                                
                                <span className="hidden sm:inline">
                                    {action.label}
                                </span>

                                {action.badge && (
                                    <div className="flex items-center gap-1 border-l border-current/20 pl-1.5 ml-0.5">
                                        <span className={`px-1 py-0.5 rounded-md tabular-nums text-[8px] min-w-[18px] text-center ${isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-400"}`}>
                                            {action.badge.count}
                                        </span>
                                        {action.badge.critical > 0 && (
                                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black animate-pulse shadow-sm shadow-rose-500/20">
                                                <AlertTriangle size={8} />
                                                {action.badge.critical}
                                            </span>
                                        )}
                                        {action.badge.warning > 0 && (
                                            <span className="px-1 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black shadow-sm shadow-amber-500/20">
                                                {action.badge.warning}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Dropdown Label for Mobile */}
            <AnimatePresence>
                {activeIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full mt-3 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[20px] shadow-2xl p-3 z-50 sm:hidden overflow-hidden"
                    >
                        <Link
                            href={getPath(actions[activeIndex].path)}
                            prefetch={true}
                            onClick={() => setActiveIndex(null)}
                            className="w-full flex items-center justify-between gap-3 text-left group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white group-hover:text-primary-theme transition-colors">
                                {actions[activeIndex].label}
                            </span>
                            <div className="w-7 h-7 bg-primary-theme/10 text-primary-theme rounded-lg flex items-center justify-center group-hover:bg-primary-theme group-hover:text-white transition-all">
                                <ArrowRight size={14} />
                            </div>
                        </Link>
                        
                        {/* Little Arrow Indicator */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-slate-200 dark:border-gray-700 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DoctorQuickActions;
