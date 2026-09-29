'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/lib/integrations/services/incident.service';
import MedicalIncidentForm from '@/components/medical-incident/MedicalIncidentForm';
import IncidentActivityLog from '@/components/medical-incident/IncidentActivityLog';
import { AlertTriangle, Plus, X, BadgeAlert, AlertCircle, Clock } from 'lucide-react';

export default function DoctorIncidentPage() {
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
        <div className="min-h-screen space-y-4 sm:space-y-6 pt-2 sm:pt-4 pb-16 max-w-7xl mx-auto">
            {/* Dynamic Header */}
            <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                
                {/* Top Row: Title, Action Button */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="p-1.5 md:p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                                Safety Protocols
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                Active Governance & Incident Network
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                        <button
                            onClick={() => setIsReporting(!isReporting)}
                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm shrink-0 border ${
                                isReporting
                                ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40'
                            }`}
                        >
                            {isReporting ? (
                                <><X size={12} /> Discard Session</>
                            ) : (
                                <><Plus size={12} /> Initialize Report</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {isReporting ? (
                <div className="bg-card rounded-[2.5rem] sm:rounded-[3.5rem] p-4 sm:p-10 border border-border-theme shadow-2xl shadow-black/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="max-w-7xl mx-auto">
                        <MedicalIncidentForm onSuccess={() => {
                            setIsReporting(false);
                            queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
                            queryClient.refetchQueries({ queryKey: ['my-incidents'] });
                        }} />
                    </div>
                </div>
            ) : (
                <div className="space-y-8 sm:space-y-10">
                    {/* Insights / Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { 
                                label: 'Total Logs', 
                                value: stats.total, 
                                icon: BadgeAlert, 
                                color: 'red',
                                description: 'Lifetime safety records'
                            },
                            { 
                                label: 'In Review', 
                                value: stats.inReview, 
                                icon: Clock, 
                                color: 'blue',
                                description: 'Active investigation nodes'
                            },
                            { 
                                label: 'Closed Cases', 
                                value: stats.closed, 
                                icon: AlertCircle, 
                                color: 'emerald',
                                description: 'Resolved protocols'
                            }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-card p-4 sm:p-5 rounded-2xl border border-border-theme group hover:shadow-2xl hover:shadow-black/5 transition-all relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-20 h-20 bg-${card.color}-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
                                <div className="flex items-center gap-3 sm:gap-4 mb-4 relative z-10">
                                    <div className={`p-2.5 sm:p-3 bg-${card.color}-50 dark:bg-${card.color}-500/10 text-${card.color}-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-${card.color}-500/5`}>
                                        <card.icon size={18} className="sm:size-[20px]" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted opacity-60 block mb-0.5">{card.label}</span>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-muted/40 italic leading-none">{card.description}</p>
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-foreground relative z-10 tracking-tighter italic">
                                    {card.value.toString().padStart(2, '0')}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* History Table */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <div className="w-1 h-8 bg-primary-theme rounded-full"></div>
                                <h3 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight">Recent Activity Log</h3>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary-theme/50 rounded-full border border-border-theme">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Auto-Sync Active</span>
                            </div>
                        </div>

                        <div className="bg-card rounded-xl sm:rounded-2xl border border-border-theme shadow-sm overflow-hidden p-2 sm:p-4">
                            <IncidentActivityLog
                                incidents={incidents}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
