'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Info,
    Briefcase,
    TrendingUp,
    Loader2
} from 'lucide-react';
import { useSchedule } from '@/lib/integrations/hooks';
import { RefreshCw } from 'lucide-react';

function NurseSchedulePage() {
    const { data, isLoading: loading, refetch: syncData } = useSchedule();
    const schedule = data?.schedule;
    const approvedLeaves = data?.approvedLeaves || [];

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin h-12 w-12 text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 text-center sm:text-left pt-2">
                <div className="space-y-0.5">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2 uppercase">Work Protocol Management</h1>
                    <p className="text-slate-500 font-bold flex items-center justify-center sm:justify-start gap-1.5 text-[7px] md:text-[8px] max-w-xl leading-relaxed uppercase tracking-widest">
                        <Clock className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-teal-600" />
                        Shift registry & deployment monitoring
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Shift Summary */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                    <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-teal-50 rounded-full group-hover:scale-125 transition-transform duration-700"></div>

                        <div className="relative z-10">
                            <h2 className="text-[10px] sm:text-md font-black text-slate-900 uppercase tracking-widest mb-4 sm:mb-8 flex items-center gap-2 sm:gap-3">
                                <div className="w-7 h-7 sm:w-10 sm:h-10 bg-primary-theme rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg">
                                    <Clock size={14} className="sm:size-[20px]" />
                                </div>
                                Assigned Shift
                            </h2>

                            <div className="space-y-4 sm:space-y-8">
                                <div className="p-4 sm:p-6 bg-white rounded-xl text-gray-900 shadow-sm border border-slate-100 relative overflow-hidden group/shift">
                                    <p className="text-primary-theme text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Designation</p>
                                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                                        <h3 className="text-sm sm:text-xl font-black uppercase tracking-tighter">{schedule?.shift && schedule.shift.toLowerCase().includes('shift') ? schedule.shift : `${schedule?.shift || 'General'} Shift`}</h3>
                                        <span className="bg-primary-theme/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[10px] font-black text-primary-theme border border-primary-theme/30 uppercase tracking-widest whitespace-nowrap">Active</span>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-6 mt-3 sm:mt-6">
                                        <div className="space-y-0.5">
                                            <p className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Interval</p>
                                            <p className="text-[10px] sm:text-sm font-black">{schedule?.workingHours?.start || '09:00'}-{schedule?.workingHours?.end || '17:00'}</p>
                                        </div>
                                        <div className="h-6 w-px bg-slate-100"></div>
                                        <div className="space-y-0.5">
                                            <p className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Workload</p>
                                            <p className="text-[10px] sm:text-sm font-black text-slate-900">8.0 HRS</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 sm:space-y-6">
                                    <div className="flex items-center justify-between group/item">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                <Briefcase size={12} className="sm:size-[16px]" />
                                            </div>
                                            <span className="text-[9px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Contract</span>
                                        </div>
                                        <span className="text-[9px] sm:text-sm font-black text-teal-600 border border-teal-100 bg-teal-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">{schedule?.employmentType || 'FT'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group/item">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                <Calendar size={12} className="sm:size-[16px]" />
                                            </div>
                                            <span className="text-[9px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Weekly Rest</span>
                                        </div>
                                        <span className="text-[9px] sm:text-sm font-black text-slate-900 uppercase">
                                            {schedule?.weeklyOff?.[0] || 'None'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 sm:p-5 bg-amber-50 rounded-xl sm:rounded-3xl border border-amber-100 flex gap-2 sm:gap-4">
                                    <Info className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
                                    <p className="text-[8px] sm:text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-wide italic">Protocol Modification: Consult Head Nurse for rotation.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-100 overflow-hidden group">
                        <h2 className="text-xs sm:text-md font-black text-slate-900 uppercase mb-4 sm:mb-8">Performance Ledger</h2>
                        <div className="space-y-3 sm:space-y-6">
                            <div className="flex items-center justify-between p-3 sm:p-4 bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-100 group/score transition-all">
                                <div>
                                    <p className="text-[8px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Punctuality</p>
                                    <p className="text-xl sm:text-3xl font-black text-emerald-900 tracking-tighter leading-none">{schedule?.stats?.onTimePercentage || 0}%</p>
                                </div>
                                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover/score:scale-110 transition-transform shrink-0">
                                    <TrendingUp size={14} className="sm:size-[20px]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Present</p>
                                    <p className="text-base sm:text-2xl font-black text-slate-900">{schedule?.stats?.presentDays || 0} D</p>
                                </div>
                                <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Absent</p>
                                    <p className="text-base sm:text-2xl font-black text-rose-600">{schedule?.stats?.absentDays || 0} D</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar View */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-xl sm:rounded-[0.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="p-4 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 bg-slate-50/30">
                            <div className="text-center sm:text-left">
                                <h2 className="text-sm sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">{monthNames[currentMonth]} {currentYear}</h2>
                                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Duty Deployment Cycle</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                                <div className="flex bg-white border border-slate-100 rounded-lg sm:rounded-xl overflow-hidden shadow-sm p-1">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1.5 sm:p-2 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentMonth(new Date().getMonth());
                                            setCurrentYear(new Date().getFullYear());
                                        }}
                                        className="px-2 sm:px-6 py-1.5 sm:py-2 hover:bg-slate-50 text-[8px] sm:text-xs font-black text-teal-600 uppercase tracking-widest rounded-lg transition-colors border-x border-slate-100"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1.5 sm:p-2 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-2 sm:p-8 overflow-x-auto custom-scrollbar">
                            <div className="min-w-[600px] sm:min-w-[800px]">
                                <div className="grid grid-cols-7 gap-[1px] bg-slate-100 border border-slate-100 rounded-lg sm:rounded-2xl overflow-hidden shadow-sm">
                                    {/* Weekdays */}
                                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
                                        <div key={day} className="bg-slate-50/80 py-2 sm:py-4 text-center text-[7px] sm:text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                            {day}
                                        </div>
                                    ))}

                                    {/* Empty slots for first week */}
                                    {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="bg-white/40 p-2 h-16 sm:h-24 md:h-32"></div>
                                    ))}

                                    {/* Days of the month */}
                                    {Array.from({ length: daysInMonth(currentMonth, currentYear) }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(currentYear, currentMonth, day);
                                        date.setHours(0, 0, 0, 0);

                                        const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                                        const isOff = schedule?.weeklyOff?.includes(date.toLocaleDateString('en-US', { weekday: 'long' }));

                                        // Check for leaves
                                        const leaveOnThisDay = approvedLeaves.find(leave => {
                                            const start = new Date(leave.startDate);
                                            start.setHours(0, 0, 0, 0);
                                            const end = new Date(leave.endDate);
                                            end.setHours(23, 59, 59, 999);
                                            return date >= start && date <= end;
                                        });

                                        return (
                                            <div
                                                key={day}
                                                className={`bg-white p-2 sm:p-3 h-16 sm:h-24 md:h-32 relative group transition-all duration-300
                                                    ${isToday ? 'ring-2 ring-inset ring-indigo-600 z-10' : ''}
                                                `}
                                            >
                                                {/* Date Number */}
                                                <div className="flex justify-between items-start mb-0.5 sm:mb-2">
                                                    <span className={`text-[9px] sm:text-[11px] font-black ${isOff ? 'text-slate-300' : 'text-slate-900 opacity-60'}`}>
                                                        {day}
                                                    </span>
                                                </div>

                                                {/* Cell Content */}
                                                <div className="h-full flex flex-col justify-start overflow-hidden">
                                                    {leaveOnThisDay ? (
                                                        <div className="mt-0.5 px-1 sm:px-2 py-0.5 sm:py-1.5 bg-[#FFF1F2] text-[#E11D48] rounded-md border border-rose-100/50 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                            <div className="text-[6px] sm:text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5 sm:mb-1">LEAVE</div>
                                                            <div className="h-[1px] sm:h-[2px] w-full bg-[#FB7185] rounded-full opacity-30"></div>
                                                        </div>
                                                    ) : !isOff ? (
                                                        <div className="mt-0.5 px-1 sm:px-2.5 py-0.5 sm:py-1.5 bg-[#EFF2FF] text-[#4F46E5] rounded-md border border-indigo-100/50 shadow-sm hover:translate-y-[-1px] transition-transform">
                                                            <div className="text-[6px] sm:text-[8px] font-black uppercase tracking-tight leading-none mb-0.5 sm:mb-1 truncate">
                                                                {schedule?.shift && schedule.shift.toLowerCase().includes('shift') ? schedule.shift : `${schedule?.shift || 'MORNING'} SHIFT`}
                                                            </div>
                                                            <div className="text-[5px] sm:text-[7px] font-bold opacity-60 tracking-wider">
                                                                {schedule?.workingHours?.start || '09:00'}-{schedule?.workingHours?.end || '19:00'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                                            <span className="text-[7px] sm:text-[10px] font-black tracking-[0.1em] sm:tracking-[0.2em] text-slate-100 uppercase italic opacity-80 transform -rotate-12">
                                                                Weekly OFF
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center sm:justify-start gap-3 sm:gap-8 flex-wrap">
                            <LegendItem color="bg-indigo-600" label="Shift" />
                            <LegendItem color="bg-rose-600" label="Leave" />
                            <LegendItem color="bg-slate-200" label="Off" />
                            <LegendItem color="bg-white ring-2 ring-indigo-600" label="Today" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <div className="flex items-center gap-2 md:gap-3">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
    );
}

export default React.memo(NurseSchedulePage);
