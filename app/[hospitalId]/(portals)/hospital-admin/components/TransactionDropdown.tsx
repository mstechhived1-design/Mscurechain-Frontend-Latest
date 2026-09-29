'use client';

import React, { useState, useRef, useEffect, useTransition } from "react";
import {
    Headphones,
    Pill,
    FlaskConical,
    ChevronDown,
    Activity
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTenantLink } from "@/hooks/useTenantLink";

interface TransactionDropdownProps {
    startTransition: (callback: () => void) => void;
}

const TransactionDropdown: React.FC<TransactionDropdownProps> = ({ startTransition }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const transactions = [
        {
            label: "Helpdesk Transaction",
            path: "/hospital-admin/transactions",
            icon: Headphones,
            color: "text-indigo-500",
            bg: "bg-indigo-50"
        },
        {
            label: "Pharma Transaction",
            path: "/hospital-admin/pharma/transactions",
            icon: Pill,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            label: "Lab Transaction",
            path: "/hospital-admin/labs/transactions",
            icon: FlaskConical,
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            label: "Radiology Transaction",
            path: "/hospital-admin/radiology/transactions",
            icon: Activity,
            color: "text-blue-500",
            bg: "bg-blue-50"
        }
    ];

    const activeTransaction = transactions.find(t => pathname?.includes(getPath(t.path)));

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 hover:bg-white hover:shadow-sm py-1.5 px-2 sm:px-4 rounded-xl transition-all group"
            >
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider hidden sm:block">
                    {activeTransaction ? activeTransaction.label : "Transactions"}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 sm:w-64 rounded-2xl shadow-xl border border-slate-200 bg-white/95 backdrop-blur-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Records</p>
                    </div>
                    {transactions.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                startTransition(() => {
                                    router.push(getPath(item.path));
                                    setIsOpen(false);
                                });
                            }}
                            className="w-full flex items-center justify-between px-3 py-3 text-xs font-bold transition-all hover:bg-slate-50 rounded-xl group text-slate-600 hover:text-slate-900"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.bg} ${item.color} transition-colors`}>
                                    <item.icon size={16} />
                                </div>
                                <span>{item.label}</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-300 -rotate-90 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionDropdown;
