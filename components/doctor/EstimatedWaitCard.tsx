"use client";

import React from 'react';
import { Clock, ArrowRight, Users } from 'lucide-react';

interface EstimatedWaitCardProps {
  queueCount: number;
  showQueue: boolean;
  consultationDuration?: number;
}

function EstimatedWaitCard({ queueCount, showQueue, consultationDuration }: EstimatedWaitCardProps) {
  const estimatedTime = queueCount * (consultationDuration || 0); // Dynamic or default 0 mins

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!showQueue || queueCount === 0) {
    return (
      <div className="bg-card dark:bg-card p-6 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-secondary-theme dark:bg-secondary-theme rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted" />
          </div>
          <p className="text-sm font-bold text-muted">No patients in queue</p>
          <p className="text-xs text-muted mt-1">All caught up!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card dark:bg-card p-6 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
          <Clock className="text-white" size={18} />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Estimated Wait</h3>
          <p className="text-[10px] text-muted font-bold">Based on {consultationDuration || 0} mins avg.</p>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <p className="text-2xl font-black text-foreground dark:text-orange-400">{formatEstimatedTime(estimatedTime)}</p>
        <p className="text-sm font-bold text-muted dark:text-orange-400 mb-1">Total</p>
      </div>

      <div className="flex items-center justify-between p-3 bg-secondary-theme dark:bg-secondary-theme rounded-xl">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted" />
          <span className="text-xs font-bold text-muted">{queueCount} Patients in queue</span>
        </div>

      </div>
    </div>
  );
}

export default React.memo(EstimatedWaitCard);
