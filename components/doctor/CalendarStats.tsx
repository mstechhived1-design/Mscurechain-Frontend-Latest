import React from 'react';
import { Calendar, Users, FileText, Activity } from 'lucide-react';

interface CalendarStatsProps {
    stats: {
        totalPatients?: number;
        appointmentsToday?: number;
        pendingReports?: number;
        consultationsValue?: number;
    } | null;
}

function CalendarStats({ stats }: CalendarStatsProps) {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center justify-center gap-2">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center">
                    <Users size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">{stats.totalPatients || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Total Patients</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center justify-center gap-2">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center">
                    <Calendar size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">{stats.appointmentsToday || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Appointments Today</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center justify-center gap-2">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full flex items-center justify-center">
                    <FileText size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">{stats.pendingReports || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Pending Reports</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center justify-center gap-2">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-full flex items-center justify-center">
                    <Activity size={20} />
                </div>
                <div>
                    <span className="block text-2xl font-black text-gray-900 dark:text-white">₹{stats.consultationsValue || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Consultation Value</span>
                </div>
            </div>
        </div>
    );
}

export default React.memo(CalendarStats);
