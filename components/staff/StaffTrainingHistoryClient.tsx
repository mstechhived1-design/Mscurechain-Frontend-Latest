'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle2, Clock, XCircle,
    EyeIcon
} from 'lucide-react';
import { getMyTrainingHistoryAction } from '@/lib/integrations';

export default function StaffTrainingHistoryClient() {
    const { data: trainingRes, isLoading } = useQuery({
        queryKey: ['trainings', 'my'],
        queryFn: getMyTrainingHistoryAction,
        refetchInterval: 1000
    });

    const trainings = trainingRes?.data?.trainings || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (trainings.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No training records detected</p>
                <p className="text-[10px] text-gray-500 mt-1">Institutional records will appear here once logged by admin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {trainings.map((training: any) => (
                <div key={training._id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${training.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                                training.status?.toLowerCase() === 'cancelled' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                }`}>
                                {training.status?.toLowerCase() === 'completed' ? <CheckCircle2 size={18} /> :
                                    training.status?.toLowerCase() === 'cancelled' ? <XCircle size={18} /> : <Clock size={18} />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 dark:text-white">{training.trainingName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(training.trainingDate).toLocaleDateString()}</span>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">• {training.department}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${training.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' :
                                training.status?.toLowerCase() === 'cancelled' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700'
                                }`}>
                                {training.status}
                            </div>
                            {training.certificateUrl && (
                                <a
                                    href={training.certificateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                    title="View Internship Certificate"
                                >
                                    <EyeIcon size={16} />

                                </a>
                            )}
                        </div>
                    </div>

                    {training.status?.toLowerCase().includes('cancel') && (
                        <div className="bg-rose-50/50 dark:bg-rose-900/10 px-3 py-2 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <p className="text-[9px] font-bold text-rose-500 uppercase italic tracking-tight mb-1">
                                {training.trainingName?.toLowerCase().includes('internship') ? 'Internship Cancellation Reason:' : 'Cancellation Reason:'}
                            </p>
                            <p className="text-xs text-rose-700 dark:text-rose-400 font-medium italic">
                                {training.cancellationReason || training.reason || 'No specific reason provided by administrator.'}
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
