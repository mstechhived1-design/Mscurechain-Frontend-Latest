'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Info,
  Briefcase,
  TrendingUp
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function SchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await staffService.getSchedule();
      setSchedule(data.schedule);
      setApprovedLeaves(data.approvedLeaves || []);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      toast.error('Failed to load work schedule');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 w-full max-w-full overflow-x-hidden mx-auto pb-4 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-1 sm:px-0">
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 tracking-tight uppercase leading-none">Work Schedule Protocol</h1>
          <p className="text-gray-500 font-bold flex items-center gap-1.5 text-[9px] sm:text-xs uppercase tracking-widest leading-none mt-1">
            <Clock className="w-3 h-3 text-indigo-600" />
            Registry of assigned shifts, working hours, and weekly offs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Shift Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 sm:w-40 sm:h-40 bg-indigo-50 rounded-full group-hover:scale-125 transition-transform duration-500"></div>

            <div className="relative z-10">
              <h2 className="text-[10px] sm:text-sm font-black text-gray-900 uppercase tracking-tight mb-3 flex items-center gap-1.5 sm:gap-2 leading-none">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                Shift Assignment
              </h2>

              <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm text-gray-900 relative overflow-hidden group/shift hover:border-indigo-200 transition-colors mb-3 sm:mb-4">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50 rounded-full blur-xl sm:blur-2xl group-hover/shift:scale-150 transition-transform"></div>
                <p className="text-gray-400 text-[8px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest relative">Current Designation</p>
                <div className="flex items-center justify-between mt-1 relative">
                  <h3 className="text-sm sm:text-lg lg:text-xl font-black text-gray-900 uppercase tracking-tight truncate mr-2">{schedule?.shift || 'General'}</h3>
                  <span className="bg-emerald-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black text-emerald-600 border border-emerald-500/20 uppercase tracking-tighter shrink-0">Active</span>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-6 relative">
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Hours</p>
                    <p className="text-xs sm:text-sm md:text-base font-bold whitespace-nowrap">{schedule?.workingHours?.start || '09:00'} - {schedule?.workingHours?.end || '17:00'}</p>
                  </div>
                  <div className="h-6 sm:h-8 w-px bg-gray-100"></div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs sm:text-sm md:text-base font-bold text-gray-600 whitespace-nowrap">8.0 HRS</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-5 px-1 mb-4 sm:mb-6">
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                      <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Contract</span>
                  </div>
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-900 uppercase truncate text-right w-1/2">{schedule?.employmentType || 'Full-Time'}</span>
                </div>
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Weekly Off</span>
                  </div>
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-900 uppercase truncate text-right w-1/2">
                    {schedule?.weeklyOff?.length > 0 ? schedule.weeklyOff[0] : 'None'}
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-3 bg-amber-50/50 rounded-xl sm:rounded-2xl border border-amber-100 flex gap-2 sm:gap-3">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[8px] sm:text-[10px] border-amber-50 md:text-xs text-amber-800 leading-tight font-bold uppercase tracking-tight">Modify: Request HR for shift rotation or reassignment.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100 overflow-hidden group">
            <h2 className="text-[10px] sm:text-xs md:text-sm font-black text-gray-900 uppercase tracking-tight mb-3 sm:mb-4 leading-none">Performance Ledger</h2>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-emerald-50 rounded-lg sm:rounded-xl border border-emerald-100 group/score">
                <div>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 sm:mb-1 leading-none">Punctuality Score</p>
                  <p className="text-sm sm:text-lg md:text-xl font-black text-emerald-900 leading-none">{schedule?.stats?.onTimePercentage || 0}%</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover/score:scale-110 transition-transform shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100 text-center sm:text-left">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1 leading-none">Present</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-gray-900 leading-none">{schedule?.stats?.presentDays || 0} D</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100 text-center sm:text-left">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1 leading-none">Absent</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-rose-600 leading-none">{schedule?.stats?.absentDays || 0} D</p>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-lg sm:rounded-xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Active Leaves</span>
                </div>
                <span className="text-[10px] sm:text-xs md:text-sm font-black text-indigo-900 uppercase leading-none">{schedule?.stats?.onLeaveDays || 0} Days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full w-full">
            <div className="px-3 py-3 sm:px-6 sm:py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-gray-50/30">
              <div>
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">{monthNames[currentMonth]} {currentYear}</h2>
                <p className="text-[9px] sm:text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">Shift Deployment Schedule</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-white border border-gray-100 rounded-lg sm:rounded-2xl p-1 sm:p-1.5 shadow-sm">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 sm:p-2 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-md sm:rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMonth(new Date().getMonth());
                      setCurrentYear(new Date().getFullYear());
                    }}
                    className="px-3 sm:px-6 py-1 sm:py-2 hover:bg-indigo-50 text-[9px] sm:text-[11px] md:text-xs font-black text-indigo-600 uppercase tracking-widest rounded-md sm:rounded-xl transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 sm:p-2 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-md sm:rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>


            <div className="flex-1 p-4 w-full max-w-full">
              <div className="w-full">
                <div className="grid grid-cols-7 w-full gap-px bg-gray-100 rounded-lg sm:rounded-2xl overflow-hidden border border-gray-100">
                  {/* Weekdays */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="bg-gray-50/50 py-2 sm:py-3 md:py-4 text-center text-[9px] sm:text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 leading-none">
                      {day}
                    </div>
                  ))}

                  {/* Empty slots for first week */}
                  {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-white/40 h-20 sm:h-24 md:h-32"></div>
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
                      <div key={day} className={`bg-white p-0.5 sm:p-2 md:p-3 h-20 sm:h-24 md:h-32 relative group transition-all duration-300 hover:bg-indigo-50/20 flex flex-col w-full ${isToday ? 'z-10 shadow-[inset_0_0_0_2px_theme(colors.indigo.500)]' : ''}`}>
                        <div className="flex justify-between items-start mb-0.5 sm:mb-2 w-full">
                          <span className={`text-[8px] sm:text-xs md:text-sm font-black leading-none ${isToday ? 'text-indigo-600' : isOff ? 'text-gray-200' : 'text-gray-900'}`}>
                            {day}
                          </span>
                          {isToday && (
                            <span className="w-1 h-1 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_6px_theme(colors.indigo.400)] shrink-0"></span>
                          )}
                        </div>

                        <div className="space-y-1 sm:space-y-1.5 mt-auto sm:mt-1 lg:mt-auto">
                          {leaveOnThisDay ? (
                            <div className="px-1 sm:px-2 py-0.5 sm:py-1 bg-rose-50 text-rose-500 border border-rose-100 rounded flex w-full justify-center">
                              <p className="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-tighter truncate leading-none text-center">Leave</p>
                            </div>
                          ) : isOff ? (
                            <div className="flex flex-col justify-end w-full pb-0.5 max-w-full">
                              <span className="text-[6px] sm:text-[10px] md:text-xs font-black text-gray-200 uppercase tracking-tighter text-center italic leading-none truncate">OFF</span>
                            </div>
                          ) : (
                            <div className="px-0.5 sm:px-2 py-0.5 sm:py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded group-hover:bg-indigo-600 group-hover:text-white transition-all w-full max-w-full text-center sm:text-left overflow-hidden">
                              <p className="text-[5px] sm:text-[9px] md:text-xs font-black uppercase tracking-tighter truncate leading-none w-full">{schedule?.shift}</p>
                              <p className="text-[4px] sm:text-[7px] md:text-[9px] font-bold opacity-70 mt-0.5 sm:mt-1 truncate leading-none w-full">{schedule?.workingHours?.start}-{schedule?.workingHours?.end}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>


            <div className="px-4 py-4 sm:px-6 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Active Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">On Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Weekly Rest</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 rounded-full"></div>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SchedulePage);
