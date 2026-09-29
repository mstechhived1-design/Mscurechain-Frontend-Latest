"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
    AreaChart, Area
} from 'recharts';
import {
    Pill, FlaskConical, Building2, Users,
    Search, Info
} from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { HOSPITAL_ADMIN_ENDPOINTS } from '@/lib/integrations/config/endpoints';
import { Card } from '@/components/admin/Card';

const HRAnalyticsPage = () => {
    const [range, setRange] = useState('30d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    // Fetch Current Data
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['hospital-analytics-v4', range, startDate, endDate],
        queryFn: async () => {
            const url = new URL(`${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.ANALYTICS}`);
            url.searchParams.append('range', range);
            if (startDate) url.searchParams.append('startDate', startDate);
            if (endDate) url.searchParams.append('endDate', endDate);
            return await apiClient<any>(url.pathname + url.search);
        },
        placeholderData: (previousData) => previousData,
    });

    const summary = data?.summary || {};
    const trends = data?.revenueTrends || [];
    const bedStats = data?.bedManagement || { vacant: 0, occupied: 0, cleaning: 0, blocked: 0 };
    const doctors = data?.doctorPerformance || [];
    const depts = data?.departmentDistribution || [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const getMetricDetails = (stat: any, idx: number) => {
        const totalBeds = (Number(bedStats.vacant) || 0) + (Number(bedStats.occupied) || 0) + (Number(bedStats.cleaning) || 0) + (Number(bedStats.blocked) || 0);
        const bedUtilization = totalBeds > 0 ? Math.round((Number(bedStats.occupied) / totalBeds) * 100) : 0;
        const avgLengthOfStay = summary.ipd?.avgLengthOfStay || 0;
        const totalRevenue = (summary.appointments?.totalRevenue || 0) + (summary.ipd?.totalRevenue || 0) + (summary.pharmacy?.totalRevenue || 0) + (summary.lab?.totalRevenue || 0);
        
        const details = {
            0: {
                title: 'OPD Revenue Stream',
                items: [
                    { label: 'Total Patients', value: summary.appointments?.aptCount || summary.appointments?.totalCount || 0 },
                    { label: 'Avg Revenue', value: formatCurrency(summary.appointments?.averageRevenue || 0) },
                    { label: 'Total Revenue', value: formatCurrency(summary.appointments?.totalRevenue || 0) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.appointments?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `OPD generated ${formatCurrency(summary.appointments?.totalRevenue || 0)} from ${summary.appointments?.aptCount || summary.appointments?.totalCount || 0} consultations.`
            },
            1: {
                title: 'IPD Financial Hub',
                items: [
                    { label: 'Admissions', value: summary.ipd?.admissionCount || summary.ipd?.totalAdmissions || 0 },
                    { label: 'Avg Stay', value: avgLengthOfStay > 0 ? `${avgLengthOfStay.toFixed(1)} Days` : 'N/A' },
                    { label: 'Bed Util.', value: `${bedUtilization}%` },
                    { label: 'Occupied', value: bedStats.occupied || 0 }
                ],
                insight: `${summary.ipd?.admissionCount || summary.ipd?.totalAdmissions || 0} admissions with ${bedUtilization}% bed occupancy.`
            },
            2: {
                title: 'Pharmacy Node',
                items: [
                    { label: 'Bills Issued', value: summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 0 },
                    { label: 'Total Revenue', value: formatCurrency(summary.pharmacy?.totalRevenue || 0) },
                    { label: 'Avg Bill', value: formatCurrency((summary.pharmacy?.totalRevenue || 0) / Math.max(1, summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 1)) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.pharmacy?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `Pharmacy processed ${summary.pharmacy?.billCount || summary.pharmacy?.totalBills || 0} transactions.`
            },
            3: {
                title: 'Laboratory Intelligence',
                items: [
                    { label: 'Tests Run', value: summary.lab?.orderCount || summary.lab?.totalTests || 0 },
                    { label: 'Total Revenue', value: formatCurrency(summary.lab?.totalRevenue || 0) },
                    { label: 'Per Test Avg', value: formatCurrency((summary.lab?.totalRevenue || 0) / Math.max(1, summary.lab?.orderCount || summary.lab?.totalTests || 1)) },
                    { label: 'Share', value: totalRevenue > 0 ? `${Math.round((summary.lab?.totalRevenue || 0) / totalRevenue * 100)}%` : '0%' }
                ],
                insight: `Laboratory completed ${summary.lab?.orderCount || summary.lab?.totalTests || 0} tests.`
            }
        };
        return details[idx as keyof typeof details] || details[0];
    };

    const stats = [
        { label: 'OPD Revenue', value: summary.appointments?.totalRevenue || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'IPD Revenue', value: summary.ipd?.totalRevenue || 0, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Pharmacy', value: summary.pharmacy?.totalRevenue || 0, icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Laboratory', value: summary.lab?.totalRevenue || 0, icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const filteredDoctors = doctors.filter((doc: any) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading && !data) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute top-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase">Retrieving hospital performance metrics...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 uppercase">Hospital Analytics (View)</h1>
                            {isFetching && (
                                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Syncing</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Personnel Oversight & Financial Performance</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Read-Only Governance</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                            Range: {range.toUpperCase()}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        {['7d', '30d', '90d'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${range === r
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => {
                    const details = getMetricDetails(s, i);
                    return (
                        <div
                            key={i}
                            className="relative"
                            onMouseEnter={() => setHoveredCard(i)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <Card className="p-6 border-slate-200 shadow-sm transition-shadow h-full">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${s.bg}`}>
                                        <s.icon className={`w-6 h-6 ${s.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                        <p className="text-xl font-bold text-slate-900">{formatCurrency(s.value)}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.05} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Clinical Unit Performance</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'OPD', value: summary.appointments?.totalRevenue || 0 },
                                { name: 'IPD', value: summary.ipd?.totalRevenue || 0 },
                                { name: 'PHM', value: summary.pharmacy?.totalRevenue || 0 },
                                { name: 'LAB', value: summary.lab?.totalRevenue || 0 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    formatter={(v: any) => formatCurrency(v)}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Physician Yield</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter doctors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="pb-3">Physician</th>
                                    <th className="pb-3">Unit</th>
                                    <th className="pb-3 text-center">Load</th>
                                    <th className="pb-3 text-right">Yield</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredDoctors.length > 0 ? filteredDoctors.map((doc: any, i: number) => (
                                    <tr key={i} className="text-sm hover:bg-slate-50 transition-colors">
                                        <td className="py-4 font-bold text-slate-900">{doc.name}</td>
                                        <td className="py-4 text-slate-500 text-xs font-black uppercase tracking-tighter">{doc.department}</td>
                                        <td className="py-4 text-center font-bold text-slate-600">{doc.count}</td>
                                        <td className="py-4 text-right font-black text-slate-900">{formatCurrency(doc.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">No clinical yield data detected</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Bed Utilization</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Vacant', count: bedStats.vacant, color: 'bg-emerald-500' },
                                { label: 'Occupied', count: bedStats.occupied, color: 'bg-rose-500' },
                                { label: 'Cleaning', count: bedStats.cleaning, color: 'bg-amber-500' },
                                { label: 'Blocked', count: bedStats.blocked, color: 'bg-slate-300' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.color}`}></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Departmental Flow</h3>
                        <div className="space-y-4">
                            {depts.slice(0, 4).map((dept: any, i: number) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                        <span className="text-slate-700">{dept.department}</span>
                                        <span className="text-slate-400">{dept.count} PTS</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full transition-all duration-700"
                                            style={{ width: `${Math.min(100, (dept.count / (summary.appointments?.aptCount || summary.appointments?.totalCount || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HRAnalyticsPage;
