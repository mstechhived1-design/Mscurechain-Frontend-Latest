"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    Clock,
    Bed,
    Calendar,
    Wallet,
    ShieldAlert,
    RefreshCw,
    Download,
    TrendingUp,
    AlertTriangle,
    FileCheck,
    Lock,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    LayoutDashboard,
    Activity,
    User
} from 'lucide-react';
import {
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { analyticsService } from '@/lib/integrations/services/analytics.service';
import { generateQualityReportHtml } from '@/lib/print-utils';
import { Card } from '@/components/admin';
import toast from 'react-hot-toast';
import IndicatorDetailModal from '@/components/admin/analytics/IndicatorDetailModal';

const INDICATOR_METADATA: Record<string, any> = {
    opdWaitingTime: {
        definition: "Average time from patient registration to the start of clinical consultation.",
        formula: "Σ(Consultation Start Time - Registration Time) / Total OPD Visits",
        source: "HMS Queue Management System",
        owner: "OPD Operations Manager",
        id: 'opdWaitingTime'
    },
    bedOccupancyRate: {
        definition: "Percentage of hospital beds occupied by patients over a specific period.",
        formula: "(Total Patient Days / Total Available Bed Days) × 100",
        source: "IPD Census & Bed Registry",
        owner: "Nursing Superintendent",
        id: 'bedOccupancyRate'
    },
    alos: {
        definition: "Average number of days that patients spend in the hospital.",
        formula: "Total Patient Days / Total Discharges",
        source: "IPD Discharge Records",
        owner: "Medical Superintendent",
        id: 'alos'
    },
    billingTat: {
        definition: "Time taken from discharge advice to final bill settlement.",
        formula: "Σ(Settlement Time - Discharge Advice Time) / Total Billable Discharges",
        source: "Hospital Billing Module",
        owner: "Finance & Accounts Head",
        id: 'billingTat'
    },
    infectionRate: {
        definition: "Rate of Healthcare-Associated Infections (HCAI) occurring in the hospital.",
        formula: "(Total Infections / Total Patient Days) × 1000",
        source: "Infection Control Registry",
        owner: "ICN (Infection Control Nurse)",
        id: 'infectionRate'
    },
    readmissionRate: {
        definition: "Percentage of patients readmitted with the same diagnosis within 30 days.",
        formula: "(Total Readmissions / Total Discharges) × 100",
        source: "Discharge & Readmission Audit",
        owner: "Quality Assurance Cell",
        id: 'readmissionRate'
    }
};

const EnhancedQualityDashboard = () => {
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });
    const [auditTimeframe, setAuditTimeframe] = useState<3 | 6>(3);
    const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Enhanced Query: Fetch current + previous + metadata
    const { data: enhancedMetrics, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['enhanced-quality-metrics', selectedDate],
        queryFn: () => analyticsService.getEnhancedQualityIndicators(selectedDate),
    });

    // Audit Trends Query
    const { data: auditTrends } = useQuery({
        queryKey: ['audit-trends', auditTimeframe],
        queryFn: () => analyticsService.getAuditTrends({ months: auditTimeframe }),
    });

    const metrics = enhancedMetrics?.current;
    const prevIndicators = enhancedMetrics?.previous;

    const metricCards = useMemo(() => [
        {
            id: "opdWaitingTime",
            title: "OPD Wait Time",
            value: metrics?.indicators?.opdWaitingTime || 0,
            prevValue: prevIndicators?.opdWaitingTime || 0,
            unit: "min",
            target: "< 30 min",
            status: (metrics?.indicators?.opdWaitingTime || 0) < 30 ? "success" : "warning",
            icon: Clock,
            color: "blue",
            description: "Registration to Consult"
        },
        {
            id: "bedOccupancyRate",
            title: "Bed Occupancy",
            value: metrics?.indicators?.bedOccupancyRate || 0,
            prevValue: prevIndicators?.bedOccupancyRate || 0,
            unit: "%",
            target: "80-90%",
            status: (metrics?.indicators?.bedOccupancyRate || 0) > 80 ? "success" : "danger",
            icon: Bed,
            color: "emerald",
            description: "Utilized vs Available"
        },
        {
            id: "alos",
            title: "Avg Length of Stay",
            value: metrics?.indicators?.alos || 0,
            prevValue: prevIndicators?.alos || 0,
            unit: "days",
            target: "< 5 days",
            status: (metrics?.indicators?.alos || 0) < 5 ? "success" : "warning",
            icon: Calendar,
            color: "violet",
            description: "Admission to Discharge"
        },
        {
            id: "billingTat",
            title: "Billing TAT",
            value: metrics?.indicators?.billingTat || 0,
            prevValue: prevIndicators?.billingTat || 0,
            unit: "min",
            target: "< 180 min",
            status: (metrics?.indicators?.billingTat || 0) < 180 ? "success" : "warning",
            icon: Wallet,
            color: "amber",
            description: "Advice to Settlement"
        },
        {
            id: "infectionRate",
            title: "Infection Rate",
            value: metrics?.indicators?.infectionRate || 0,
            prevValue: prevIndicators?.infectionRate || 0,
            unit: "‰",
            target: "< 1.0‰",
            status: (metrics?.indicators?.infectionRate || 0) < 1 ? "success" : "danger",
            icon: ShieldAlert,
            color: "rose",
            description: "HCAI per 1000 Days"
        },
        {
            id: "readmissionRate",
            title: "Readmission Rate",
            value: metrics?.indicators?.readmissionRate || 0,
            prevValue: prevIndicators?.readmissionRate || 0,
            unit: "%",
            target: "< 5%",
            status: (metrics?.indicators?.readmissionRate || 0) < 5 ? "success" : "warning",
            icon: TrendingUp,
            color: "indigo",
            description: "Readmit w/i 30 Days"
        }
    ], [metrics, prevIndicators]);

    const handleDateChange = (increment: number) => {
        let newMonth = selectedDate.month + increment;
        let newYear = selectedDate.year;

        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }

        setSelectedDate({ month: newMonth, year: newYear });
    };

    const handleExport = () => {
        // Logic to include indicator definitions in PDF
        const html = generateQualityReportHtml({
            metrics,
            trends: auditTrends,
            month: selectedDate.month,
            year: selectedDate.year,
            hospital: { name: 'CureChain Hospital' },
            metadata: INDICATOR_METADATA
        });
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
        }
    };

    const handleFinalize = async () => {
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedDate.year, selectedDate.month - 1));
        if (!confirm(`Finalize ${monthName} ${selectedDate.year} metrics? Data will be locked for audit.`)) return;

        setIsFinalizing(true);
        try {
            await analyticsService.finalizeMetrics(selectedDate.month, selectedDate.year);
            toast.success("Metrics finalized and locked.");
            refetch();
        } catch (error: any) {
            toast.error(error?.message || "Finalization failed");
        } finally {
            setIsFinalizing(false);
        }
    };

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedDate.year, selectedDate.month - 1));

    return (
        <div className="p-2 md:p-4 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Master Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-3 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="p-2 md:p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            NABH QUALITY DASHBOARD
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg">CQI MODULE</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Continuous Quality Improvement Monitor</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1.5">
                        <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all shadow-sm">
                            <ChevronLeft size={18} />
                        </button>
                        <div className="px-2 md:px-6 text-sm font-black text-slate-700 uppercase flex items-center gap-3 min-w-[180px] justify-center">
                            <CalendarDays size={16} className="text-blue-600" />
                            {monthName} {selectedDate.year}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all shadow-sm">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button onClick={handleExport} className="flex items-center gap-2 px-3 md:px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                        <Download size={16} />
                        Audit Export
                    </button>
                </div>
            </div>

            {/* Metric Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {metricCards.map((card, i) => {
                    const variance = card.prevValue ? ((card.value - card.prevValue) / card.prevValue) * 100 : 0;
                    const isImprovement = card.id === 'bedOccupancyRate' ? variance > 0 : variance < 0;

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedIndicator({ ...INDICATOR_METADATA[card.id], ...card })}
                            className="bg-white border-slate-200 shadow-sm hover:translate-y-[-4px] hover:shadow-xl transition-all cursor-pointer group rounded-3xl border p-3 md:p-6 relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                                    <card.icon size={24} strokeWidth={2.5} />
                                </div>
                                <div className="text-right">
                                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-100 bg-slate-50 text-slate-500`}>
                                        Target: {card.target}
                                    </div>
                                    {variance !== 0 && (
                                        <div className={`mt-2 flex items-center justify-end gap-1 text-[10px] font-black ${isImprovement ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {variance > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(variance).toFixed(1)}%
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                                        {card.value}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase">{card.unit}</span>
                                </div>
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{card.title}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-bold text-blue-600 uppercase">View Trends</span>
                                <Info size={14} className="text-blue-400" />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Audit Trend Center */}
                <Card className="lg:col-span-3 p-2 md:p-4 md:p-8 bg-white border-slate-200 shadow-sm flex flex-col h-[450px] rounded-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Activity className="text-blue-600" size={18} />
                                Audit-Ready Longitudinal Trends
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Measuring Continuous Quality Improvement Performance</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[3, 6].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setAuditTimeframe(m as any)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${auditTimeframe === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {m} Months
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={auditTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAlos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontSize: '12px' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                                <Area type="monotone" name="ALOS (Days)" dataKey="alos" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAlos)" />
                                <Area type="monotone" name="Occupancy (%)" dataKey="bedOccupancyRate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOcc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Audit Evidence and Governance */}
                <div className="space-y-6">
                    <Card className="p-3 md:p-8 bg-slate-900 border-none shadow-2xl text-white relative overflow-hidden rounded-3xl">
                        <div className="absolute top-0 right-0 p-3 md:p-6 opacity-10 pointer-events-none rotate-12">
                            <ShieldAlert size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-3 mb-8">
                                <Lock size={16} className="text-blue-400" />
                                Data Governance
                            </h3>

                            <div className="space-y-6 mb-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Status</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border ${metrics?.status === 'locked' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                        <div className={`w-2 h-2 rounded-full ${metrics?.status === 'locked' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></div>
                                        {metrics?.status === 'locked' ? 'Locked & Verified' : 'Open for Review'}
                                    </div>
                                </div>

                                {metrics?.status === 'locked' && (
                                    <div className="p-2 md:p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <User size={14} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase">Finalized By</p>
                                                <p className="text-xs font-black text-slate-200">{metrics.lockedBy?.name || 'Administrator'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <CalendarDays size={14} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase">Timestamp</p>
                                                <p className="text-xs font-black text-slate-200">
                                                    {new Date(metrics.lockedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleFinalize}
                                disabled={isFinalizing || metrics?.status === 'locked'}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                {metrics?.status === 'locked' ? <FileCheck size={18} /> : <LayoutDashboard size={18} />}
                                {metrics?.status === 'locked' ? 'Verified for Audit' : 'Finalize Monthly Data'}
                            </button>
                        </div>
                    </Card>

                    <Card className="p-3 md:p-8 bg-white border-slate-200 shadow-sm rounded-3xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                            <AlertTriangle className="text-amber-500" size={18} />
                            Critical Audit Gaps
                        </h3>

                        <div className="space-y-4">
                            {[
                                { label: "Diagnosis Completeness", value: metrics?.dataGaps?.missingDiagnoses || 0, threshold: 0 },
                                { label: "Infection Tracking", value: metrics?.dataGaps?.untrackedInfections || 0, threshold: 0 },
                                { label: "OPD Timestamp Integrity", value: metrics?.dataGaps?.emptyArrivalTimes || 0, threshold: 0 }
                            ].map((gap, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-slate-500">{gap.label}</span>
                                        <span className={gap.value > gap.threshold ? 'text-rose-500' : 'text-emerald-500'}>
                                            {gap.value} {gap.value > gap.threshold ? 'FAIL' : 'PASS'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${gap.value > gap.threshold ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: gap.value > 0 ? '100%' : '0%' }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <IndicatorDetailModal
                isOpen={!!selectedIndicator}
                onClose={() => setSelectedIndicator(null)}
                indicator={selectedIndicator}
                selectedDate={selectedDate}
            />
        </div>
    );
};

export default EnhancedQualityDashboard;
