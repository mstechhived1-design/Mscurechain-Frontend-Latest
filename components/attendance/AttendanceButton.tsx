'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { AttendanceModal } from './AttendanceModal';
import { API_CONFIG } from '@/lib/integrations/config/api-config';

interface AttendanceButtonProps {
  userRole: 'doctor' | 'nurse' | 'staff';
  className?: string;
  compact?: boolean;
}

interface TodayAttendance {
  checkIn?: { time: string };
  checkOut?: { time: string };
  status?: string;
}

export const AttendanceButton: React.FC<AttendanceButtonProps> = ({ userRole, className = '', compact = false }) => {
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<any>('/attendance/today-status');
      if (data && data.attendance) {
        setTodayAttendance(data.attendance);
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const [modalMode, setModalMode] = useState<'check-in' | 'check-out'>('check-in');

  const handleCheckIn = () => {
    setModalMode('check-in');
    setIsModalOpen(true);
  };

  const handleCheckOutClick = () => {
    setModalMode('check-out');
    setIsModalOpen(true);
  };

  const handleModalConfirm = async (payload: { lat?: number; lng?: number; photo?: string | null }) => {
    if (modalMode === 'check-in') {
      await confirmCheckIn(payload);
    } else {
      await confirmCheckOut(payload);
    }
  };

  const confirmCheckIn = async (payload: { lat?: number; lng?: number; photo?: string | null }) => {
    try {
      setChecking(true);
      const data = await apiClient<any>('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data && data.warning) {
        toast.success(`Checked in: ${data.warning}`, { duration: 5000 });
      } else {
        toast.success('Checked in successfully!');
      }
      await fetchTodayStatus();
    } catch (error: any) {
      console.error('[Attendance] Check-in error:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setChecking(false);
    }
  };

  const confirmCheckOut = async (payload: { lat?: number; lng?: number; photo?: string | null }) => {
    try {
      setChecking(true);
      const data = await apiClient<any>('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data && data.warning) {
        toast.success(`Checked out: ${data.warning}`, { duration: 5000 });
      } else {
        toast.success('Checked out successfully!');
      }
      await fetchTodayStatus();
    } catch (error: any) {
      console.error('[Attendance] Check-out error:', error);
      toast.error(error.message || 'Failed to check out');
    } finally {
      setChecking(false);
    }
  };

  const hasCheckedIn = !!todayAttendance?.checkIn;
  const hasCheckedOut = !!todayAttendance?.checkOut;

  // Compact Mode (for headers)
  if (compact) {
    return (
      <div className={`flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner ${className}`}>
        {loading && !todayAttendance ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/10 rounded-lg animate-pulse">
            <div className="w-3 h-3 border-2 border-primary-theme border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-muted uppercase">Syncing...</span>
          </div>
        ) : !hasCheckedIn ? (
          <button
            onClick={handleCheckIn}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-emerald-500/20"
          >
            {checking ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={14} strokeWidth={3} />
            )}
            Clock In
          </button>
        ) : !hasCheckedOut ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums">
                {todayAttendance?.checkIn?.time ? new Date(todayAttendance.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
            <button
              onClick={handleCheckOutClick}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-md active:scale-95 disabled:opacity-50 transition-all border border-rose-500/20"
            >
              {checking ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut size={14} strokeWidth={3} />
              )}
              Clock Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300/50">
            <CheckCircle2 size={14} strokeWidth={3} />
            Shift Ended
          </div>
        )}
        <AttendanceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onConfirm={handleModalConfirm} 
        />
      </div>
    );
  }

  // Normal Mode (for cards)
  if (loading && !todayAttendance) {
    return (
      <div className={`bg-card rounded-3xl p-6 border border-border/50 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary-theme/10 rounded-2xl flex items-center justify-center text-primary-theme">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-foreground">Attendance</h3>
        </div>
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-primary-theme/10 border-t-primary-theme rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-3xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary-theme/10 rounded-2xl flex items-center justify-center text-primary-theme shadow-sm">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-foreground">Attendance</h3>
      </div>

      <div className="space-y-4">
        {hasCheckedIn ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span className="tracking-wide">ACTIVE SESSION</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Check-In Time</p>
              <p className="text-xl font-black text-foreground mt-1">
                {new Date(todayAttendance?.checkIn?.time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm font-bold text-muted italic">Ready to start your shift</p>
          </div>
        )}

        <div className="pt-2">
          {!hasCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={checking}
              className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-xl shadow-primary-theme/20 transform active:scale-95 flex items-center justify-center gap-2 transition-all uppercase text-sm tracking-widest"
            >
              {checking ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Clock In</span>
                </>
              )}
            </button>
          ) : !hasCheckedOut ? (
            <button
              onClick={handleCheckOutClick}
              disabled={checking}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-xl transform active:scale-95 flex items-center justify-center gap-2 transition-all uppercase text-sm tracking-widest"
            >
              {checking ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>Clock Out</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase text-sm tracking-widest">
              <CheckCircle2 className="w-5 h-5" />
              <span>Shift Completed</span>
            </div>
          )}
        </div>
      </div>
      <AttendanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handleModalConfirm} 
      />
    </div>
  );
};
