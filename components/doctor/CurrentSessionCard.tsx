"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, User, ArrowRight } from 'lucide-react';

interface CurrentSessionCardProps {
    currentAppointmentId: string | null;
    patientName?: string;   
}

function CurrentSessionCard({ currentAppointmentId, patientName }: CurrentSessionCardProps) {
    const router = useRouter();

    if (!currentAppointmentId) {
        return (
            <div className="bg-card dark:bg-card p-6 rounded-2xl border border-border-theme dark:border-border-theme shadow-sm h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-black text-muted mb-2">No Active Session</h3>
                <p className="text-sm text-muted">Start a consultation to see it here</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 p-6 rounded-2xl shadow-lg h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <PlayCircle className="text-white" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-amber-900 dark:text-amber-100">Session Active</h3>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Consultation in progress</p>
                </div>
            </div>

            {patientName && (
                <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Patient</p>
                    <p className="text-sm font-black text-amber-900 dark:text-amber-100">{patientName}</p>
                </div>
            )}

            <div className="mt-auto">
                <button
                    onClick={() => router.push(`/doctor/prescription?appointmentId=${currentAppointmentId}`)}
                    className="w-full group flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    Return to Session 
                    <ArrowRight size={18} className="group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    );
}

export default React.memo(CurrentSessionCard);
