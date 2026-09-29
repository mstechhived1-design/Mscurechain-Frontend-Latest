"use client";

import React, { useState } from 'react';
import {
    IndianRupee,
    Package,
    AlertTriangle,
    FileText,
    Loader2,
    Wallet,
    Info
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PharmacyDashboardService } from '@/lib/integrations/services/pharmacyDashboard.service';

const HRHospitalPharma = () => {
    const { data: stats, isLoading, error } = useQuery<any>({
        queryKey: ['hospital-admin-pharma-dashboard'],
        queryFn: async () => {
            try {
                const data = await PharmacyDashboardService.getStats();
                return data;
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    if (isLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Pharmacy Node...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="p-5 bg-rose-50 text-rose-600 rounded-2xl mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Protocol Offline</h3>
                <p className="text-sm font-bold text-slate-400 mt-2 max-w-md text-center">
                    Unable to establish a secure handshake with the pharmacy registry. 
                    Ensure a pharmacy profile is mapped to this hospital.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmaceutical Intelligence</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Management oversight of pharmacy operations & inventory (Read-Only)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Console</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Cycle Revenue", value: formatCurrency(stats?.todayStats.revenue || 0), sub: `${stats?.todayStats.billCount || 0} Invoices`, icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Stock Registry", value: stats?.inventoryStats.totalProducts.toString() || "0", sub: "Active SKU Units", icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Critical Stock", value: stats?.inventoryStats.lowStockCount.toString() || "0", sub: stats?.inventoryStats.outOfStockCount ? `${stats.inventoryStats.outOfStockCount} Depleted` : "Status Stable", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Session Volume", value: stats?.todayStats.billCount.toString() || "0", sub: "Dispatched Assets", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-4`}>
                            <stat.icon size={20} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Detailed Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <FileText size={18} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Session Digest</h4>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        {[
                            { label: "Gross Assets", value: formatCurrency(stats?.todayStats.revenue || 0), desc: "Current cycle valuation" },
                            { label: "Dispatch Frequency", value: stats?.todayStats.billCount.toString() || "0", desc: "Settled invoices" },
                            { label: "Quantum Density", value: formatCurrency(stats?.todayStats.avgBillValue || 0), desc: "Average bill valuation" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                                <div>
                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight leading-none">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{item.desc}</p>
                                </div>
                                <span className="text-lg font-black text-slate-900 italic">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <Wallet size={18} />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Settlement Gateway</h4>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-2 gap-4">
                        {[
                            { label: "Physical Cash", value: formatCurrency(stats?.paymentBreakdown.Cash || 0), color: "bg-emerald-500" },
                            { label: "Digital Card", value: formatCurrency(stats?.paymentBreakdown.Card || 0), color: "bg-blue-500" },
                            { label: "Unified UPI", value: formatCurrency(stats?.paymentBreakdown.UPI || 0), color: "bg-indigo-500" },
                            { label: "Institutional", value: formatCurrency(stats?.paymentBreakdown.Credit || 0), color: "bg-rose-500" },
                        ].map((method, idx) => (
                            <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative group overflow-hidden transition-colors hover:bg-slate-100/50">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${method.color} rounded-l-2xl`} />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{method.label}</p>
                                <p className="text-lg font-black text-slate-900 italic leading-none">{method.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRHospitalPharma;
