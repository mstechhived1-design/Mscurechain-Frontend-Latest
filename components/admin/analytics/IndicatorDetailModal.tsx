"use client";

import React, { useState } from 'react';
import {
    X,
    TrendingUp,
    BookOpen,
    Calculator,
    Database,
    User,
    Calendar,
    Activity
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/integrations/services/analytics.service';

interface IndicatorDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    indicator: {
        id: string;
        title: string;
        unit: string;
        target: string;
        definition: string;
        formula: string;
        source: string;
        owner: string;
        color: string;
    } | null;
    selectedDate: { month: number; year: number };
}

const IndicatorDetailModal: React.FC<IndicatorDetailModalProps> = ({ isOpen, onClose, indicator, selectedDate }) => {
    const [category, setCategory] = useState<'IPD' | 'OPD'>('IPD');

    const { data: dayWiseData, isLoading } = useQuery({
        queryKey: ['day-wise-trends', indicator?.id, selectedDate, category],
        queryFn: () => analyticsService.getIndicatorDayWiseTrends({
            indicatorId: indicator?.id || '',
            month: selectedDate.month,
            year: selectedDate.year,
            category: indicator?.id === 'readmissionRate' ? category : undefined
        }),
        enabled: !!indicator && isOpen
    });

    const formatMetricValue = (value: number, unit: string) => {
        if ((unit === 'min' || unit === 'mins') && value >= 60) {
            const hours = Math.floor(value / 60);
            const minutes = Math.round(value % 60);
            return `${hours}h ${minutes}m`;
        }
        if (value > 0 && value < 1) return value.toFixed(2);
        return value.toString();
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length && indicator) {
            return (
                <div className="bg-slate-900 border-none shadow-2xl p-3 rounded-2xl text-white">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Day {label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-blue-400">
                            {formatMetricValue(payload[0].value, indicator.unit)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{indicator.unit}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!isOpen || !indicator) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`p-2.5 md:p-3 rounded-2xl bg-${indicator.color}-100 text-${indicator.color}-600`}>
                            <TrendingUp size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight">{indicator.title}</h2>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedDate.month}/{selectedDate.year} Monitoring</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 md:p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                    >
                        <X size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>

                <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Left: Indicator Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                <div className="flex items-start gap-3">
                                    <BookOpen size={16} className="text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definition</p>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">{indicator.definition}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calculator size={16} className="text-violet-500 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formula</p>
                                        <p className="text-xs font-mono font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 mt-1">{indicator.formula}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <Database size={16} className="text-emerald-500 mb-2" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Source</p>
                                    <p className="text-xs font-bold text-slate-700 mt-1">{indicator.source}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <User size={16} className="text-amber-500 mb-2" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsibility</p>
                                    <p className="text-xs font-bold text-slate-700 mt-1">{indicator.owner}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">NABH Target</p>
                                        <p className="text-lg font-black text-emerald-400 tracking-tighter">{indicator.target}</p>
                                    </div>
                                    <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                                        <Activity size={20} className="text-emerald-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Trend Chart */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Calendar size={14} className="text-blue-500" />
                                Day-Wise Trend Analysis
                            </h3>
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase">
                                Daily Monitoring
                            </div>
                        </div>

                        {indicator.id === 'readmissionRate' && (
                            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                <button
                                    onClick={() => setCategory('IPD')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${category === 'IPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    IPD View
                                </button>
                                <button
                                    onClick={() => setCategory('OPD')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${category === 'OPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    OPD View
                                </button>
                            </div>
                        )}

                        <div className="h-[300px] w-full bg-slate-50 rounded-3xl p-6 border border-slate-100 relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dayWiseData?.data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                        >
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                offset={10}
                                                content={(props: any) => {
                                                    const { x, y, value } = props;
                                                    if (value < 100) return null; // Only show for larger values/peaks
                                                    return (
                                                        <text
                                                            x={x}
                                                            y={y}
                                                            dy={-10}
                                                            fill="#3b82f6"
                                                            fontSize={10}
                                                            fontWeight="900"
                                                            textAnchor="middle"
                                                        >
                                                            {formatMetricValue(value, indicator.unit)}
                                                        </text>
                                                    );
                                                }}
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <Activity size={16} className="text-amber-500" />
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                                Auditor Tip: Look for spikes in the trend line and ensure a "Deviation Note" exists for outlier days.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default IndicatorDetailModal;
