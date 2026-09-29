"use client";

import React, { useEffect, useState } from 'react';
import { getAnalyticsAction } from '@/lib/integrations/actions/admin.actions';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Building2, Stethoscope, Pill, Users, Activity,
    HeartPulse, Ambulance, Headphones, Briefcase, HeartHandshake,
    Bed, ArrowUpRight
} from 'lucide-react';
import { PageHeader, Modal } from '@/components/admin';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [breakdownModal, setBreakdownModal] = useState<{
        isOpen: boolean;
        title: string;
        data: any[];
        color: string;
        type: string;
    }>({
        isOpen: false,
        title: '',
        data: [],
        color: '#3B82F6',
        type: ''
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getAnalyticsAction();
                setData(res);
            } catch (e) {
                console.error("Failed to load analytics", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const revenueData = [
        { name: 'Pharmacy', amount: Math.round(data?.pharmaRevenue || 0), color: '#10B981' },
        { name: 'Laboratory', amount: Math.round(data?.labRevenue || 0), color: '#3B82F6' },
        { name: 'OPD', amount: Math.round(data?.opdRevenue || 0), color: '#F59E0B' },
        { name: 'IPD', amount: Math.round(data?.ipdRevenue || 0), color: '#EF4444' },
    ];

    const doctorStats = [
        { name: 'On Duty', value: data?.doctorsPresent || 0, color: '#10B981' },
        { name: 'Off Duty', value: Math.max(0, (data?.totalDoctors || 0) - (data?.doctorsPresent || 0)), color: '#E5E7EB' }
    ];

    const handleShowBreakdown = (type: string, title: string, breakdown: any[], color: string) => {
        setBreakdownModal({
            isOpen: true,
            title,
            data: breakdown || [],
            color,
            type,
        });
    };

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <PageHeader
                icon={<Activity className="text-blue-600" />}
                title="Super Admin Analytics"
                subtitle="Overview of financial performance and system users"
            />

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Financial Revenue</h3>
                    <div className="flex items-center gap-2">
                         <span className="animate-pulse w-2 h-2 rounded-full bg-blue-500"></span>
                         <span className="text-[10px] md:text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full uppercase tracking-wider">Click card for hospital-wise details</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    
                    {/* Pharmacy Revenue Card */}
                    <div 
                        onClick={() => handleShowBreakdown('pharma', 'Pharmacy Revenue Breakdown', data?.pharmaBreakdown, '#10B981')}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-green-200 dark:hover:border-green-900 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight size={18} className="text-green-500" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Pharmacy Revenue</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                                    <span className="text-sm md:text-base text-gray-400 font-normal">₹</span>
                                    {Math.round(data?.pharmaRevenue || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                                <Pill className="text-green-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                             <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
                                 <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }}></div>
                             </div>
                             <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">LIVE</span>
                        </div>
                    </div>

                    {/* Lab Revenue Card */}
                    <div 
                        onClick={() => handleShowBreakdown('lab', 'Laboratory Revenue Breakdown', data?.labBreakdown, '#3B82F6')}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight size={18} className="text-blue-500" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Laboratory Revenue</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                                    <span className="text-sm md:text-base text-gray-400 font-normal">₹</span>
                                    {Math.round(data?.labRevenue || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                <Activity className="text-blue-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                             <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
                                 <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                             </div>
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">LIVE</span>
                        </div>
                    </div>

                    {/* OPD Revenue Card */}
                    <div 
                        onClick={() => handleShowBreakdown('opd', 'OPD Appointment Revenue', data?.opdBreakdown, '#F59E0B')}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-900 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight size={18} className="text-orange-500" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">OPD Revenue</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                                    <span className="text-sm md:text-base text-gray-400 font-normal">₹</span>
                                    {Math.round(data?.opdRevenue || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                <Stethoscope className="text-orange-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                             <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
                                 <div className="h-full bg-orange-500 rounded-full" style={{ width: '45%' }}></div>
                             </div>
                             <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">LIVE</span>
                        </div>
                    </div>

                    {/* IPD Revenue Card */}
                    <div 
                        onClick={() => handleShowBreakdown('ipd', 'IPD Admission Revenue', data?.ipdBreakdown, '#EF4444')}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-red-200 dark:hover:border-red-900 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight size={18} className="text-red-500" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">IPD Revenue</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                                    <span className="text-sm md:text-base text-gray-400 font-normal">₹</span>
                                    {Math.round(data?.ipdRevenue || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                <Bed className="text-red-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                             <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
                                 <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }}></div>
                             </div>
                             <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">LIVE</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <Users className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Total Users</p>
                        <h3 className="text-xl md:text-2xl font-black">{(data?.totalUsers || 0).toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <Building2 className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Hospitals</p>
                        <h3 className="text-xl md:text-2xl font-black">{data?.totalHospitals || 0}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                        <HeartPulse className="text-pink-600" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Total Patients</p>
                        <h3 className="text-xl md:text-2xl font-black">{(data?.totalPatients || 0).toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">System Staff Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {[
                        { label: 'Patients', count: data?.totalPatients, icon: HeartPulse, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Doctors', count: data?.totalDoctors, icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Nurses', count: data?.totalNurses, icon: HeartHandshake, color: 'text-pink-600', bg: 'bg-pink-50' },
                        { label: 'HelpDesk', count: data?.totalHelpdesks, icon: Headphones, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Ambulance', count: data?.totalEmergencies, icon: Ambulance, color: 'text-red-600', bg: 'bg-red-50' },
                        { label: 'Other Staff', count: data?.totalStaff, icon: Briefcase, color: 'text-gray-600', bg: 'bg-gray-50' },
                    ].map((role) => (
                        <div key={role.label} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-all group">
                            <div className={`p-2 rounded-full ${role.bg} ${role.color} group-hover:scale-110 transition-transform`}><role.icon size={20} /></div>
                            <span className="text-xl font-bold">{role.count || 0}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight text-center leading-none">{role.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-8 text-gray-800 dark:text-gray-200">Revenue Stream Comparison</h3>
                    <div className="h-72 md:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    tickFormatter={(value: any) => `₹${Number(value) >= 1000 ? (Number(value) / 1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '13px' }}
                                    formatter={(value: any) => [`₹${Math.round(Number(value || 0)).toLocaleString()}`, 'Total Revenue']}
                                />
                                <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={45}>
                                    {revenueData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-8 text-gray-800 dark:text-gray-200">Live Doctor Availability</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center min-h-[300px]">
                        <div className="h-60 w-60 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={doctorStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {doctorStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-gray-900 dark:text-white leading-none">{data?.doctorsPresent || 0}</span>
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Present</span>
                            </div>
                        </div>
                        <div className="mt-8 sm:mt-0 sm:ml-12 space-y-5 w-full sm:w-auto">
                            <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                                <div className="w-2 h-8 rounded-full bg-emerald-500"></div>
                                <div className="flex flex-col">
                                    <span className="font-black text-xl leading-none">{data?.doctorsPresent || 0}</span>
                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">Active Duty</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/20">
                                <div className="w-2 h-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                <div className="flex flex-col">
                                    <span className="font-black text-xl leading-none">{Math.max(0, (data?.totalDoctors || 0) - (data?.doctorsPresent || 0))}</span>
                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">Offline</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal 
                isOpen={breakdownModal.isOpen} 
                onClose={() => setBreakdownModal({ ...breakdownModal, isOpen: false })} 
                title={<div className="flex items-center gap-3">
                    <div className="w-2.5 h-7 rounded-full" style={{ backgroundColor: breakdownModal.color }}></div>
                    <span className="text-xl md:text-2xl">{breakdownModal.title}</span>
                </div>}
                maxWidth="max-w-4xl"
            >
                <div className="space-y-8 py-4">
                    <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">
                        Regional performance breakdown for {breakdownModal.type.toUpperCase()}
                    </p>
                    
                    <div className="h-[350px] md:h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={breakdownModal.data} 
                                layout="vertical" 
                                margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                <XAxis type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} hide />
                                <YAxis 
                                    dataKey="hospitalName" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={140}
                                    tick={{ fontSize: 12, fontWeight: 700, fill: '#6B7280' }}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '16px' }}
                                    formatter={(value: any) => [`₹${Math.round(Number(value || 0)).toLocaleString()}`, 'Revenue']}
                                />
                                <Bar 
                                    dataKey="revenue" 
                                    fill={breakdownModal.color} 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={28}
                                    label={{ 
                                        position: 'right', 
                                        formatter: (val: any) => `₹${Math.round(Number(val)) >= 1000 ? (Math.round(Number(val))/1000).toFixed(1) + 'k' : Math.round(Number(val))}`, 
                                        fontSize: 12, 
                                        fontWeight: 800,
                                        offset: 15,
                                        fill: '#374151'
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/40 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                             Transaction Insights
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {breakdownModal.data.map((h, i) => (
                                <div key={i} className="flex flex-col gap-1 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 transition-transform">
                                    <span className="text-xs font-black text-gray-400 truncate">{h.hospitalName}</span>
                                    <span className="text-lg font-black text-gray-900 dark:text-white">₹{Math.round(h.revenue).toLocaleString()}</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                         <span className="text-[10px] font-bold text-gray-400 uppercase">{h.count} Collections</span>
                                    </div>
                                </div>
                            ))}
                            {breakdownModal.data.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400 font-medium italic">
                                     No granular data available for this category yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
