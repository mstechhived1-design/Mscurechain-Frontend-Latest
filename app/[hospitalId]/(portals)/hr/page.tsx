'use client';

import React, { useMemo } from 'react';
import {
    Users,
    Calendar,
    Clock,
    Briefcase,
    Building2,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Plus,
} from 'lucide-react';
import { useHRStats } from '@/lib/integrations/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HRDashboard() {
    const { hospitalId } = useParams() as any;
    const { data: statsResponse, isLoading } = useHRStats();
    const stats = statsResponse?.data;

    const dashboardCards = useMemo(() => [
        {
            title: 'Total Staff',
            value: stats?.totalStaff || 0,
            icon: Users,
            color: 'bg-blue-500',
            link: `/${hospitalId}/hr/staff`,
        },
        {
            title: 'Pending Leaves',
            value: stats?.pendingLeaves || 0,
            icon: Calendar,
            color: 'bg-amber-500',
            link: `/${hospitalId}/hr/leaves`,
        },
        {
            title: 'Today Present',
            value: stats?.todayAttendance || 0,
            icon: Clock,
            color: 'bg-green-500',
            link: `/${hospitalId}/hr/attendance`,
        },
        {
            title: 'Departments',
            value: stats?.breakdown?.filter((item: any) => item.role !== 'emergency').length || 0,
            icon: Building2,
            color: 'bg-purple-500',
            link: `/${hospitalId}/hr/departments`,
        },
    ], [stats, hospitalId]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-10 w-48 bg-gray-200 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight uppercase leading-none">HR Dashboard</h1>
                    <p className="text-[8px] sm:text-[9px] font-medium text-slate-500 uppercase tracking-widest mt-1 hidden sm:block">Manage hospital personnel, attendance, and leaves.</p>
                </div>
                <Link
                    href={`/${hospitalId}/hr/staff/create`}
                    className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 md:py-2.5 rounded-lg font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-sm shrink-0"
                >
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 font-black" />
                    <span className="hidden sm:inline">Add Staff</span>
                    <span className="sm:hidden">Add</span>
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {dashboardCards.map((card, idx) => (
                    <Link
                        key={idx}
                        href={card.link}
                        className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col justify-between h-[90px] sm:h-[110px]"
                    >
                        <div className="flex items-center justify-between z-10">
                            <div className={`p-1.5 sm:p-2 rounded-lg ${card.color} text-white w-fit group-hover:scale-110 transition-transform`}>
                                <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <h3 className="text-gray-500 font-bold uppercase text-[7px] sm:text-[9px] tracking-widest text-right">{card.title}</h3>
                        </div>
                        <p className="text-lg sm:text-2xl font-black text-gray-900 z-10">{card.value}</p>
                        <div className="absolute -bottom-2 -right-2 p-2 text-gray-50 opacity-10 group-hover:opacity-20 transition-opacity">
                            <card.icon className="w-12 h-12 sm:w-16 sm:h-16" />
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Recent Recruitments</h3>
                        <Link href={`/${hospitalId}/hr/staff`} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
                            View All <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-50 pb-4 text-left">
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Joined</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stats?.recentStaff
                                    ?.filter((staff: any) => staff.role !== 'emergency')
                                    .map((staff: any) => (
                                        <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4">
                                                <div className="font-bold text-gray-900">{staff.name}</div>
                                                <div className="text-xs text-gray-400">{staff.email}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-wider">
                                                    {staff.role}
                                                </span>
                                            </td>
                                            <td className="py-4 text-sm text-gray-500 font-medium">
                                                {new Date(staff.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4">
                                                <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${staff.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {staff.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {staff.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-8">Role Breakdown</h3>
                        <div className="space-y-6">
                            {stats?.breakdown?.filter((item: any) => item.role !== 'emergency').map((item: any) => (
                                <div key={item.role} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-600 uppercase tracking-wider">{item.role}</span>
                                        <span className="font-black text-gray-900">{item.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full transition-all duration-1000"
                                            style={{ width: `${(item.count / stats.totalStaff) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
