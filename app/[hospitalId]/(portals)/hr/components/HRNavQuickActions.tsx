'use client';

import React, { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Clock, CreditCard, Trophy, ArrowRight } from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';
import { motion, AnimatePresence } from 'framer-motion';
import nProgress from 'nprogress';
import Link from 'next/link';

const actions = [
    { label: 'Leaves', icon: Calendar, path: '/hr/leaves' },
    { label: 'Attendance', icon: Clock, path: '/hr/attendance' },
    { label: 'Payroll', icon: CreditCard, path: '/hr/payroll' },
    { label: 'Performance', icon: Trophy, path: '/hr/performance' },
];

export default function HRNavQuickActions() {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleActionClick = (e: React.MouseEvent, index: number, path: string) => {
        // For mobile (below sm: 640px), we want the dropdown behavior
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
            e.preventDefault();
            if (activeIndex === index) {
                const tenantPath = getPath(path);
                nProgress.start();
                startTransition(() => {
                    router.push(tenantPath);
                    setActiveIndex(null);
                });
            } else {
                setActiveIndex(index);
            }
        } else {
            // For desktop, Link component handles it, but we initiate progress bar
            nProgress.start();
        }
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Main Row */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/50 backdrop-blur-sm shadow-sm overflow-x-auto max-w-[calc(100vw-140px)] sm:max-w-none no-scrollbar">
                {actions.map((action, index) => {
                    const tenantPath = getPath(action.path);
                    const isActive = pathname.includes(tenantPath);
                    const isSelected = activeIndex === index;
                    const Icon = action.icon;
                    return (
                        <React.Fragment key={action.path}>
                            <Link
                                href={tenantPath}
                                onClick={(e) => handleActionClick(e, index, action.path)}
                                onBlur={() => setTimeout(() => setActiveIndex(null), 200)}
                                className={`
                                    flex items-center gap-1.5 sm:gap-2 py-1 sm:py-1.5 px-3 sm:px-4 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all duration-300 group
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-500 hover:text-slate-900'}
                                    ${isSelected ? 'bg-indigo-600/10 ring-1 ring-indigo-600/30' : ''}
                                `}
                            >
                                <Icon size={14} className={`shrink-0 transition-transform ${isSelected ? 'scale-110' : ''}`} />
                                <span className="hidden sm:inline">
                                    {action.label}
                                </span>
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
                        className="absolute top-full mt-3 w-40 bg-white border border-slate-200 rounded-[20px] shadow-2xl p-3 z-50 sm:hidden overflow-hidden"
                    >
                        <button
                            onClick={() => {
                                nProgress.start();
                                router.push(getPath(actions[activeIndex].path));
                            }}
                            className="w-full flex items-center justify-between gap-3 text-left group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {actions[activeIndex].label}
                            </span>
                            <div className="w-7 h-7 bg-indigo-600/10 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <ArrowRight size={14} />
                            </div>
                        </button>
                        {/* Little Arrow Indicator */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
