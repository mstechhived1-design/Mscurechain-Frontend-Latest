'use client';

import React, { useMemo, useState } from "react";
import {
    ArrowLeft,
    IndianRupee,
    CreditCard,
    RefreshCw,
    Zap,
    Building2,
    LayoutDashboard,
    Globe,
    Wallet,
    ClipboardList,
    Smartphone,
    UserCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useMasterTransactions } from "@/lib/integrations/hooks";

export default function TransactionSummaryPage() {
    const router = useRouter();
    const params = useParams() as any;
    const searchParams = useSearchParams() as any;
    const hospitalId = params?.hospitalId as string;

    const startDate = ((searchParams?.get('startDate') ?? null) ?? null) || new Date().toISOString().split('T')[0];
    const endDate = ((searchParams?.get('endDate') ?? null) ?? null) || new Date().toISOString().split('T')[0];

    const { data: txRaw, isLoading, isFetching, refetch } = useMasterTransactions(
        1,
        1, 
        hospitalId,
        startDate,
        endDate,
        'all'
    );

    const { total, totalRevenue, backendStats } = useMemo(() => {
        const raw: any = txRaw;
        if (!raw) return { total: 0, totalRevenue: 0, backendStats: null };
        return {
            total: raw.pagination?.total || 0,
            totalRevenue: raw.stats?.totalRevenue || 0,
            backendStats: raw.stats || null
        };
    }, [txRaw]);

    const updateDateRange = (start: string, end: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('startDate', start);
        params.set('endDate', end);
        router.replace(`/${hospitalId}/masterhelpdesk/transactions/summary?${params.toString()}`);
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auditing Flows...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-10 antialiased font-sans">
            {/* COMPACT STICKY HEADER WITH CONFIG */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push(`/${hospitalId}/masterhelpdesk/transactions`)}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900 border border-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">Application Tracking Hub</h1>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Audit Period</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => updateDateRange(e.target.value, endDate)}
                                    className="text-[10px] font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                                />
                                <span className="text-slate-300 text-[10px]">/</span>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => updateDateRange(startDate, e.target.value)}
                                    className="text-[10px] font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black uppercase">Live Tracking</span>
                        </div>
                        <button 
                            onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }}
                            className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900 transition-all shadow-sm"
                        >
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
                
                {/* COMPACT APPOINTMENT LOGISTICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                <ClipboardList size={18} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Appointments</span>
                        </div>
                        <p className="text-2xl font-black tracking-tighter">{total}</p>
                        
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Smartphone size={18} />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Online Channel</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{backendStats?.onlineCount || 0}</p>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">₹{Math.round(backendStats?.onlineRevenue || 0).toLocaleString()}</p>
                            </div>
                       
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <UserCircle2 size={18} />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Offline Channel</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{backendStats?.offlineCount || 0}</p>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">₹{Math.round(backendStats?.offlineRevenue || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TRACKING MODULES GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* FINANCIAL AUDIT - COMPACT */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard size={14} className="text-slate-900" />
                                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Financial Flow Summary</h2>
                            </div>
                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">₹{Math.round(totalRevenue).toLocaleString()} Net</div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Online Money</span>
                                        <Globe size={12} className="text-indigo-400" />
                                    </div>
                                    <p className="text-xl font-black text-slate-900">₹{Math.round(backendStats?.onlineRevenue || 0).toLocaleString()}</p>
                                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${totalRevenue > 0 ? (backendStats?.onlineRevenue / totalRevenue) * 100 : 0}%` }} />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Offline Money</span>
                                        <Building2 size={12} className="text-emerald-400" />
                                    </div>
                                    <p className="text-xl font-black text-slate-900">₹{Math.round(backendStats?.offlineRevenue || 0).toLocaleString()}</p>
                                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${totalRevenue > 0 ? (backendStats?.offlineRevenue / totalRevenue) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>

                            
                        </div>
                    </div>

                    {/* INSTRUMENT MIX - COMPACT */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Wallet size={14} className="text-slate-900" />
                                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Instrument Mix</h2>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {[
                                { label: 'Cash Flow', revenue: backendStats?.cashRevenue || 0, color: 'bg-slate-900', icon: IndianRupee },
                                { label: 'UPI App', revenue: backendStats?.upiRevenue || 0, color: 'bg-indigo-500', icon: Zap },
                                { label: 'Card', revenue: backendStats?.cardRevenue || 0, color: 'bg-emerald-500', icon: CreditCard }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${item.color} text-white flex items-center justify-center shadow-sm`}>
                                            <item.icon size={12} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Realized</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900">₹{Math.round(item.revenue).toLocaleString()}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase">{totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0}%</p>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-5 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Accuracy</span>
                                    <span className="text-[8px] font-black text-slate-900 uppercase">High Integrity</span>
                                </div>
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-900 rounded-full w-[99.8%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COMPACT FOOTER REGISTRY */}
                <div className="flex items-center justify-center py-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        Application Tracking Hub — Institutional Ledger context #{hospitalId.slice(-8)}
                    </p>
                </div>

            </div>
        </div>
    );
}
