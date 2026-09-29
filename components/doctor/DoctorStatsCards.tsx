import React from 'react';
import { UserCheck, Calendar, HeartPulse, Clock } from 'lucide-react';

interface DoctorStatsCardsProps {
    stats: {
        totalPatients: number;
        appointmentsToday: number;
        totalPendingQueue?: number;
        pendingReports: number;
        activeInpatients: number;
        consultationsValue: number;
        dynamicLabel?: string;
    };
    visitTypeFilter: 'all' | 'opd' | 'ipd';
    onTypeChange: (type: 'all' | 'opd' | 'ipd') => void;
}

function DoctorStatsCards({ stats, visitTypeFilter, onTypeChange }: DoctorStatsCardsProps) {
    const cards = [
        {
            label: 'Total Patients',
            value: stats.totalPatients,
            icon: UserCheck,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-50 dark:bg-blue-900/20',
            textColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            label: 'Active Inpatients',
            value: stats.activeInpatients,
            icon: HeartPulse,
            color: 'bg-rose-500',
            lightColor: 'bg-rose-50 dark:bg-rose-900/20',
            textColor: 'text-rose-600 dark:text-rose-400',
            subValue: 'Currently admitted'
        },
        {
            label: 'Current Queue',
            dateRange: stats.dynamicLabel && stats.dynamicLabel !== "Today's" ? stats.dynamicLabel : 'Today',
            value: stats.totalPendingQueue ?? stats.appointmentsToday,
            icon: Clock,
            color: 'bg-indigo-500',
            lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
            textColor: 'text-indigo-600 dark:text-indigo-400',
            subValue: 'Total pending',
            hasFilter: true
        },
        {
            label: 'Full Schedule',
            dateRange: stats.dynamicLabel && stats.dynamicLabel !== "Today's" ? stats.dynamicLabel : 'Today',
            value: stats.appointmentsToday,
            icon: Calendar,
            color: 'bg-emerald-500',
            lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            subValue: 'Scheduled appointments',
            hasFilter: true
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-3 xl:gap-5">
            {cards.map((card: any, index) => (
                <div
                    key={index}
                    className="bg-card dark:bg-card p-3 sm:p-4 lg:p-3 xl:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme dark:border-border-theme hover:shadow-md transition-all h-full flex flex-col justify-between group overflow-hidden"
                >
                    <div className="flex items-start justify-between gap-1 sm:gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-tight truncate">{card.label}</p>
                            {card.dateRange && (
                                <p className="text-[8px] sm:text-[9px] font-black text-primary-theme/60 uppercase tracking-tighter mt-0.5 break-all leading-tight">
                                    {card.dateRange}
                                </p>
                            )}
                        </div>
                        <div className={`p-1.5 sm:p-2 rounded-lg ${card.lightColor} shrink-0 group-hover:scale-110 transition-transform`}>
                            <card.icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${card.textColor}`} />
                        </div>
                    </div>

                    <div className="mt-auto space-y-2">
                        <div className="flex items-end justify-between gap-2">
                            <h3 className="text-base sm:text-xl xl:text-2xl font-black text-foreground tabular-nums leading-none">
                                {card.value}
                            </h3>

                            {card.hasFilter && (
                                <div className="flex items-center p-0.5 bg-secondary-theme rounded-lg border border-border-theme shadow-inner scale-90 sm:scale-100 origin-bottom-right">
                                    {(['all', 'opd', 'ipd'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTypeChange(type);
                                            }}
                                            className={`px-1 sm:px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase rounded-md transition-all ${visitTypeFilter === type
                                                ? 'bg-primary-theme text-primary-theme-foreground shadow-sm ring-1 ring-white/10'
                                                : 'text-muted hover:text-foreground'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status label hidden on very small cards to prevent overflow */}
                        <p className="hidden sm:block text-[8px] xl:text-[9px] font-bold text-muted/60 uppercase tracking-widest truncate">
                            {card.subValue || 'Live Update'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default React.memo(DoctorStatsCards);
