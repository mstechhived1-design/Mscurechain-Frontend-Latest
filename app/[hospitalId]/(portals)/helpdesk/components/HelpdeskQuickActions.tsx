'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, CalendarCheck, CreditCard, ArrowRight, FilePlus } from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';

interface HelpdeskQuickActionsProps {
    startTransition: (callback: () => void) => void;
}

const HelpdeskQuickActions: React.FC<HelpdeskQuickActionsProps> = ({ startTransition }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    const actions = [
        {
            label: 'Register Patient',
            icon: UserPlus,
            path: '/helpdesk/patient-registration',
        },
        {
            label: 'Book Appointment',
            icon: CalendarCheck,
            path: '/helpdesk/appointment-booking',
        },
        {
            label: 'Add Bills',
            icon: FilePlus,
            path: '/helpdesk/add-bills',
        },
        {
            label: 'Transactions',
            icon: CreditCard,
            path: '/helpdesk/transactions',
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
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
                {actions.map((action, index) => {
                    const isActive = pathname === action.path;
                    const isSelected = activeIndex === index;
                    const Icon = action.icon;

                    return (
                        <React.Fragment key={action.path}>
                            <button
                                onClick={() => handleActionClick(index, action.path)}
                                onBlur={() => setTimeout(() => setActiveIndex(null), 200)}
                                className={`
                                    flex items-center gap-2 py-2 px-3.5 sm:px-5 rounded-xl transition-all duration-300 group
                                    ${isActive
                                        ? 'bg-white shadow-sm text-teal-600'
                                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-teal-600'}
                                    ${isSelected ? 'bg-teal-50 shadow-inner' : ''}
                                `}
                            >
                                <Icon size={18} className={`shrink-0 transition-transform ${isSelected ? 'scale-110' : ''}`} />

                                <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">
                                    {action.label}
                                </span>
                            </button>
                            {index < actions.length - 1 && (
                                <div className="w-px h-4 bg-slate-300 mx-0.5 self-center hidden xl:block"></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Dropdown Label for Mobile/Tablet */}
            <AnimatePresence>
                {activeIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full mt-3 w-56 bg-white border border-slate-200 rounded-[24px] shadow-2xl p-4 z-50 xl:hidden overflow-hidden"
                    >
                        <button
                            onClick={() => startTransition(() => router.push(getPath(actions[activeIndex].path)))}
                            className="w-full flex items-center justify-between gap-3 text-left group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 group-hover:text-teal-600 transition-colors">
                                {actions[activeIndex].label}
                            </span>
                            <div className="w-7 h-7 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all">
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
};

export default HelpdeskQuickActions;
