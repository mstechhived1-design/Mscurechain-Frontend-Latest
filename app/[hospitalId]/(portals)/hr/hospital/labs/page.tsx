"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Microscope,
    Wallet,
    IndianRupee,
    Activity,
    TestTube,
    CheckCircle2,
    Info
} from 'lucide-react';
import { LabDashboardService } from '@/lib/integrations/services/labDashboard.service';
import { toast } from 'react-hot-toast';

function HRHospitalLabs() {
    const [range, setRange] = useState('today');

    const { data: stats, isLoading } = useQuery<any>({
        queryKey: ['hospital-admin-lab-dashboard-stats', range],
        queryFn: async () => {
            try {
                const data = await LabDashboardService.getStats(range, true);
                return data;
            } catch (error) {
                toast.error('Failed to load lab analytics');
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const rangeLabels: any = {
        'today': 'Current Session',
        '7days': 'Last 7 Cycles',
        '1month': 'Cyclic Overview'
    };

    if (isLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Lab Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Diagnostic Lab Intelligence</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Management oversight of laboratory performance (Read-Only)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Console</span>
                </div>
            </div>

            {/* Controller */}
            <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    Range: {rangeLabels[range]?.toUpperCase()}
                </div>
                <div className="inline-flex bg-slate-100 rounded-xl p-1">
                    {Object.keys(rangeLabels).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                range === r
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {r === 'today' ? 'Today' : r === '7days' ? 'Wkly' : 'Mnth'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Gross Revenue"
                    value={`₹${stats?.revenue?.toLocaleString() || 0}`}
                    icon={IndianRupee}
                    color="blue"
                />
                <StatCard
                    title="Settled Invoices"
                    value={`₹${stats?.collections?.toLocaleString() || 0}`}
                    icon={Wallet}
                    color="emerald"
                />
                <StatCard
                    title="Diagnostic Load"
                    value={stats?.patients || 0}
                    icon={Activity}
                    color="purple"
                />
                <StatCard
                    title="Tests Certified"
                    value={stats?.totalTests || 0}
                    icon={TestTube}
                    color="orange"
                />
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Payment Breakdown */}
                <div className="xl:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revenue Streams</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit by payment gateway</p>
                        </div>
                        <Activity className="w-5 h-5 text-emerald-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PaymentCard
                            label="Hard Cash"
                            amount={stats?.paymentBreakdown?.Cash || 0}
                            color="emerald"
                        />
                        <PaymentCard
                            label="UPI Transfer"
                            amount={stats?.paymentBreakdown?.UPI || 0}
                            color="blue"
                        />
                        <PaymentCard
                            label="Card Credit"
                            amount={stats?.paymentBreakdown?.Card || 0}
                            color="purple"
                        />
                    </div>
                </div>

                {/* Lab Summary */}
                <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-8 pb-4 border-b border-white/10">Lab Topology</h3>
                        <div className="space-y-6">
                            <SummaryItem 
                                label="Test Suite Catalog" 
                                value={stats?.totalTestMaster || 0} 
                            />
                            <SummaryItem 
                                label="Active Lab Units" 
                                value={stats?.totalDepartments || 0} 
                            />
                            <SummaryItem 
                                label="Specimens Logged" 
                                value={stats?.pendingSamples || 0} 
                            />
                        </div>
                    </div>
                    
                    <div className="pt-6 mt-8 border-t border-white/10 flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Infrastructure Online</span>
                    </div>
                </div>
            </div>

            {/* Top Tests */}
            {stats?.topTests && stats.topTests.length > 0 && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Strategic Test Yield</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.topTests.slice(0, 6).map((test: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-colors hover:bg-slate-100/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Microscope className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{test.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{test.count} PTS LOGGED</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 italic">₹{test.revenue.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${colorClasses[color]}`}>
                <Icon size={20} strokeWidth={3} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 italic leading-none">{value}</h3>
            </div>
        </div>
    );
};

const PaymentCard = ({ label, amount, color }: any) => {
    const colorClasses: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
    };

    return (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100/50">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 border ${colorClasses[color]}`}>
                {label}
            </span>
            <h4 className="text-xl font-black text-slate-900 italic">₹{amount.toLocaleString()}</h4>
        </div>
    );
};

const SummaryItem = ({ label, value }: any) => (
    <div className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{label}</span>
        <span className="text-lg font-black italic">{value}</span>
    </div>
);

export default React.memo(HRHospitalLabs);
