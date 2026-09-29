'use client';

import React from 'react';
import { LogIn, LogOut, CheckCircle2} from 'lucide-react';
import { useTodayStatus, useCheckIn, useCheckOut } from '@/lib/integrations/hooks';
import toast from 'react-hot-toast';

const NurseShiftButton = () => {
    const { data: attendanceData, refetch: refetchAttendance } = useTodayStatus();
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();

    const todayAttendance = attendanceData?.attendance;
    const hasCheckedIn = !!todayAttendance?.checkIn;
    const hasCheckedOut = !!todayAttendance?.checkOut;

    const handleCheckIn = async () => {
        try {
            await checkInMutation.mutateAsync(undefined);
            toast.success('Shift started!');
            refetchAttendance();
        } catch (e) {
            toast.error('Failed to clock in');
        }
    };

    const handleCheckOut = async () => {
        try {
            await checkOutMutation.mutateAsync(undefined);
            toast.success('Shift ended!');
            refetchAttendance();
        } catch (e) {
            toast.error('Failed to clock out');
        }
    };

    if (!hasCheckedIn) {
        return (
            <button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-theme hover:bg-primary-theme/80 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
                <LogIn size={14} strokeWidth={3} />
                <span>Start Shift</span>
            </button>
        );
    }

    if (!hasCheckedOut) {
        return (
            <button
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-theme hover:bg-primary-theme/80 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
                <LogOut size={14} strokeWidth={3} />
                <span>End Shift</span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-theme/20 text-gray-600 border border-primary-theme/30 rounded-xl text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 size={14} strokeWidth={3} />
            <span>Shift Completed</span>
        </div>
    );
};

export default NurseShiftButton;
