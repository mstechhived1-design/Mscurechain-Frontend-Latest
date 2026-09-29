'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, ShoppingCart, ArrowLeftRight, ArrowRight, AlertTriangle } from 'lucide-react';
import { useTenantLink } from "@/hooks/useTenantLink";

interface PharmacyQuickActionsProps {
    activeOrdersCount?: number;
    startTransition: (callback: () => void) => void;
}

const PharmacyQuickActions: React.FC<PharmacyQuickActionsProps> = ({ activeOrdersCount = 0, startTransition }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const actions = [
        {
            id: 'qa-ipd',
            label: 'IPD Billing',
            icon: Receipt,
            path: '/pharmacy/ipd-billing',
        },
        {
            id: 'qa-orders',
            label: 'Active Orders',
            icon: ShoppingCart,
            path: '/pharmacy/orders',
            badge: activeOrdersCount > 0 ? { count: activeOrdersCount } : null
        },
        {
            id: 'qa-trans',
            label: 'Transactions',
            icon: ArrowLeftRight,
            path: '/pharmacy/transactions',
        },
    ];

    const handleActionClick = (index: number, path: string) => {
        setActiveIndex(index);
        startTransition(() => {
            router.push(getPath(path));
        });
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
                        <button
                            key={action.id || `qa-${action.path}-${index}`}
                            onClick={() => handleActionClick(index, action.path)}
                            onBlur={() => setTimeout(() => setActiveIndex(null), 200)}
                            className={`
                                flex items-center gap-1.5 sm:gap-2 py-1 sm:py-1.5 px-2.5 sm:px-4 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all duration-300 group
                                ${isActive
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'}
                                ${isSelected ? 'bg-teal-600/10 ring-1 ring-teal-600/30' : ''}
                            `}
                        >
                            <Icon size={14} className={`shrink-0 transition-transform ${isSelected ? 'scale-110' : ''}`} />

                            <span className="hidden sm:inline">
                                {action.label}
                            </span>

                            {action.badge && (
                                <div className="flex items-center border-l border-current/20 pl-1.5 ml-0.5">
                                    <span className={`px-1 py-0.5 rounded-md tabular-nums text-[8px] min-w-[18px] text-center ${isActive ? "bg-white/20 text-white" : "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-400"}`}>
                                        {action.badge.count}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Dropdown Label for Mobile */}
            <AnimatePresence>
                {activeIndex !== null && (
                    <motion.div
                        key={`mobile-action-${actions[activeIndex].id}`}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full mt-3 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[20px] shadow-2xl p-3 z-50 sm:hidden overflow-hidden"
                    >
                        <button
                            onClick={() => startTransition(() => router.push(getPath(actions[activeIndex].path)))}
                            className="w-full flex items-center justify-between gap-3 text-left group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                                {actions[activeIndex].label}
                            </span>
                            <div className="w-7 h-7 bg-teal-600/10 text-teal-600 rounded-lg flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
                                <ArrowRight size={14} />
                            </div>
                        </button>

                        {/* Little Arrow Indicator */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-slate-200 dark:border-gray-700 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PharmacyQuickActions;
