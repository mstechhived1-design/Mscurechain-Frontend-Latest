'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/lib/integrations/services/incident.service';
import MedicalIncidentForm from '@/components/medical-incident/MedicalIncidentForm';
import IncidentActivityLog from '@/components/medical-incident/IncidentActivityLog';
import { AlertTriangle, Plus, X, BadgeAlert, AlertCircle, Clock } from 'lucide-react';

export default function StaffIncidentPage() {
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
        <div className="p-0 sm:p-2 space-y-2 sm:space-y-4 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 px-1 sm:px-0 mt-2 sm:mt-0">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tighter uppercase">Safety Portal</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-0.5 uppercase tracking-widest text-[6px] sm:text-[9px] sm:ml-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 sm:h-3 text-red-500 animate-pulse" />
                        Governance
                    </p>
                </div>

                <button
                    onClick={() => setIsReporting(!isReporting)}
                    className={`
                        w-full sm:w-auto px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg font-black uppercase tracking-widest text-[8px] sm:text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5
                        ${isReporting
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            : 'bg-primary-theme hover:bg-primary-theme/80 text-white dark:text-white shadow-lg shadow-primary-theme/20'}
                    `}
                >
                    {isReporting ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Report New</>}
                </button>
            </div>

            {isReporting ? (
                <div className="bg-white dark:bg-gray-900 p-1 rounded-[0.5rem]  border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-2">
                        <MedicalIncidentForm onSuccess={() => {
                            setIsReporting(false);
                            // Multi-pronged refresh approach
                            queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                            queryClient.refetchQueries({ queryKey: ['my-incidents'] });
                        }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {/* Insights / Stats */}
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 px-1 sm:px-0">
                        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center sm:items-start text-center sm:text-left group">
                            <div className="p-1 sm:p-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg mb-1 group-hover:scale-110 transition-transform">
                                <BadgeAlert size={12} className="sm:size-4" />
                            </div>
                            <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-tighter text-gray-400">Total</span>
                            <div className="text-sm sm:text-xl font-black mt-0.5 sm:mt-0">{stats.total}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center sm:items-start text-center sm:text-left group">
                            <div className="p-1 sm:p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg mb-1 group-hover:scale-110 transition-transform">
                                <Clock size={12} className="sm:size-4" />
                            </div>
                            <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-tighter text-gray-400">Review</span>
                            <div className="text-sm sm:text-xl font-black mt-0.5 sm:mt-0">{stats.inReview}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center sm:items-start text-center sm:text-left group">
                            <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg mb-1 group-hover:scale-110 transition-transform">
                                <AlertCircle size={12} className="sm:size-4" />
                            </div>
                            <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-tighter text-gray-400">Closed</span>
                            <div className="text-sm sm:text-xl font-black mt-0.5 sm:mt-0">{stats.closed}</div>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-3 px-2 sm:px-0">
                            <h3 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Recent Logs</h3>
                        </div>

                        <IncidentActivityLog
                            incidents={incidents}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

