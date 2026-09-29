'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/lib/integrations/services/incident.service';
import MedicalIncidentForm from '@/components/medical-incident/MedicalIncidentForm';
import IncidentActivityLog from '@/components/medical-incident/IncidentActivityLog';
import { AlertTriangle, Plus, X, BadgeAlert, AlertCircle, Clock } from 'lucide-react';

export default function NurseIncidentPage() {
    const [isReporting, setIsReporting] = useState(false);

    const queryClient = useQueryClient();
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['my-incidents'],
        queryFn: () => incidentService.getIncidents(),
        refetchOnMount: true,
        staleTime: 0
    });

    // Derived Stats for instant reactivity
    const stats = React.useMemo(() => ({
        total: incidents.length,
        inReview: incidents.filter(i => i.status === 'IN REVIEW').length,
        closed: incidents.filter(i => i.status === 'CLOSED').length
    }), [incidents]);

    return (
        <div className="space-y-4 md:space-y-10 max-w-7xl mx-auto pb-20">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-6 pt-2">
                <div className="w-full sm:w-auto">
                    <div className="text-left">
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white leading-none uppercase">Safety Protocols</h1>
                        <p className="text-gray-400 dark:text-gray-500 font-black mt-1 uppercase tracking-widest text-[8px] sm:text-[10px] flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 animate-pulse" />
                            Incident Reporting Governance
                        </p>
                    </div>
                </div>

                <div className="w-full sm:w-auto">
                    <button
                        onClick={() => setIsReporting(!isReporting)}
                        className={`
                            w-full sm:w-auto px-4 sm:px-8 py-2 md:py-4 rounded-lg sm:rounded-[1rem] font-black uppercase tracking-widest text-[8px] sm:text-[10px] transition-all flex items-center justify-center gap-2
                            ${isReporting
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300'
                                : 'bg-primary-theme hover:bg-primary-theme/90 text-white shadow-lg shadow-primary-theme/20'}
                        `}
                    >
                        {isReporting ? <><X size={12} className="sm:size-[16px]" /> Cancel</> : <><Plus size={12} className="sm:size-[16px]" /> Report Incident</>}
                    </button>
                </div>
            </div>

            {isReporting ? (
                <div className="bg-white dark:bg-gray-900 p-3 md:p-6 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-0">
                        <MedicalIncidentForm onSuccess={() => {
                            setIsReporting(false);
                            // Multi-pronged refresh approach
                            queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                            queryClient.refetchQueries({ queryKey: ['my-incidents'] });
                        }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
                    {/* Insights / Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div className="bg-white dark:bg-gray-800 p-3 sm:p-5 rounded-xl sm:rounded-[1.5rem] border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                                <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg sm:rounded-2xl shrink-0">
                                    <BadgeAlert size={14} className="sm:size-[24px]" />
                                </div>
                                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Total</span>
                            </div>
                            <div className="text-xl sm:text-4xl font-black">{stats.total}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 sm:p-5 rounded-xl sm:rounded-[1.5rem] border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                                <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg sm:rounded-2xl shrink-0">
                                    <Clock size={14} className="sm:size-[24px]" />
                                </div>
                                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Review</span>
                            </div>
                            <div className="text-xl sm:text-4xl font-black">
                                {stats.inReview}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 sm:p-5 rounded-xl sm:rounded-[1.5rem] border border-gray-100 dark:border-gray-700 col-span-2 sm:col-span-1">
                            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                                <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg sm:rounded-2xl shrink-0">
                                    <AlertCircle size={14} className="sm:size-[24px]" />
                                </div>
                                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Closed</span>
                            </div>
                            <div className="text-xl sm:text-4xl font-black">
                                {stats.closed}
                            </div>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="space-y-3 sm:space-y-6">
                        <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-0">
                            <h3 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Recent Activity Log</h3>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <div className="p-0 md:p-6">
                                    <IncidentActivityLog
                                        incidents={incidents}
                                        isLoading={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
