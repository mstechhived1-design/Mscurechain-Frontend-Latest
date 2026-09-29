"use client";

import React from 'react';
import { Users, Clock, TrendingUp, Calendar, ArrowRight, UserCheck } from 'lucide-react';

interface DoctorQueueStatsProps {
  queueCount: number;
  showQueue: boolean;
  totalAppointments: number;
  completedCount: number;
  consultationDuration?: number;
}

function DoctorQueueStats({ 
    queueCount, 
    showQueue, 
    totalAppointments = 0, 
    completedCount = 0,
    consultationDuration = 0
}: DoctorQueueStatsProps) {
  
  const estimatedTime = queueCount * (consultationDuration || 15); // Fallback to 15 if not set

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Today's Summary Card */}
      <div className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm">
        <div className="flex items-center justify-between mb-6 max-sm:mb-4">
          <div className="flex items-center gap-3 max-sm:gap-2">
            <div className="w-10 h-10 max-sm:w-8 max-sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Calendar className="text-white" size={18} />
            </div>
            <div>
              <h3 className="text-sm max-sm:text-[12px] font-black text-foreground dark:text-foreground uppercase tracking-tight">Today Summary</h3>
              <p className="text-[10px] max-sm:text-[8px] text-muted font-bold">Progress overview</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] max-sm:text-[8px] font-black rounded-full uppercase">Live</span>
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:gap-2">
          <div className="p-4 max-sm:p-3 bg-secondary-theme dark:bg-secondary-theme rounded-xl border border-border-theme">
            <p className="text-[10px] max-sm:text-[8px] font-black text-muted uppercase tracking-wider mb-1">Today's Total</p>
            <p className="text-2xl max-sm:text-lg font-black text-foreground">{totalAppointments}</p>
          </div>
          <div className="p-4 max-sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <p className="text-[10px] max-sm:text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl max-sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Estimated Completion Time Card */}
      {showQueue && queueCount > 0 ? (
        <div className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm">
          <div className="flex items-center gap-3 max-sm:gap-2 mb-4 max-sm:mb-3">
            <div className="w-10 h-10 max-sm:w-8 max-sm:h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Clock className="text-white" size={18} />
            </div>
            <div>
              <h3 className="text-sm max-sm:text-[12px] font-black text-foreground dark:text-foreground uppercase tracking-tight">Estimated Wait</h3>
              <p className="text-[10px] max-sm:text-[8px] text-muted font-bold">Based on {consultationDuration || 15} mins avg.</p>
            </div>
          </div>

          <div className="flex items-end gap-2 mb-4 max-sm:mb-3">
            <p className="text-2xl max-sm:text-lg font-black text-foreground dark:text-orange-400">{formatEstimatedTime(estimatedTime)}</p>
            <p className="text-sm max-sm:text-[10px] font-bold text-muted dark:text-orange-400 mb-1">Total</p>
          </div>

          <div className="bg-secondary-theme dark:bg-secondary-theme p-3 max-sm:p-2 rounded-xl border border-border-theme flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted" />
              <span className="text-[11px] max-sm:text-[9px] font-bold text-foreground">{queueCount} Patients in queue</span>
            </div>
            <ArrowRight size={14} className="text-muted" />
          </div>
        </div>
      ) : (
        <div className="bg-card dark:bg-card p-6 max-sm:p-4 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 max-sm:w-8 max-sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Clock className="text-gray-400" size={18} />
            </div>
            <div>
              <h3 className="text-sm max-sm:text-[12px] font-black text-muted uppercase tracking-tight">Wait Time</h3>
              <p className="text-[10px] max-sm:text-[8px] text-gray-400 font-bold">No active queue</p>
            </div>
          </div>
          <p className="text-2xl max-sm:text-lg font-black text-gray-200">0 mins</p>
        </div>
      )}
    </div>
  );
}

export default React.memo(DoctorQueueStats);
