"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    Activity,
    User,
    BarChart,
    FileText,
    FileSpreadsheet,
    Settings2,
    Save,
    X as XIcon,
} from 'lucide-react';
import { exportQualityToExcel } from '@/lib/excel-utils';
import {
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
    AreaChart,
    Area,
    BarChart as RechartsBarChart,
    Bar
} from 'recharts';
import { analyticsService } from '@/lib/integrations/services/analytics.service';
import { generateQualityReportHtml } from '@/lib/print-utils';
import { Card } from '@/components/admin';
import toast from 'react-hot-toast';
import IndicatorDetailModal from '@/components/admin/analytics/IndicatorDetailModal';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import type { Hospital } from '@/lib/integrations/types/admin';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';

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
    incidentRate: {
        definition: "Rate of reported medical incidents occurring in the hospital.",
        formula: "(Total Incidents / Total Patient Days) × 1000",
        source: "Incident Reporting Module",
        owner: "Safety & Compliance Officer",
        id: 'incidentRate'
    },
    readmissionRate: {
        definition: "Percentage of patients readmitted with the same diagnosis within 30 days.",
        formula: "(Total Readmissions / Total Discharges) × 100",
        source: "Discharge & Readmission Audit",
        owner: "Quality Assurance Cell",
        id: 'readmissionRate'
    }
};

const QualityIndicatorDashboard = () => {
    console.log("[Page: QualityIndicators] Rendering component...");
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });
    const [auditTimeframe, setAuditTimeframe] = useState<3 | 6>(3);
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');
    const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showTargets, setShowTargets] = useState(false);
    const [savingTargets, setSavingTargets] = useState(false);

    const DEFAULT_TARGETS = {
        opdWaitingTime: 30, bedOccupancyMin: 80, bedOccupancyMax: 90,
        alos: 5, billingTat: 180, incidentRateMax: 1, incidentCountMax: 5, readmissionRate: 5,
    };
    const [targetForm, setTargetForm] = useState(DEFAULT_TARGETS);

    // Enhanced Query: Fetch current + previous + metadata
    const { data: enhancedMetrics, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['enhanced-quality-metrics', selectedDate],
        queryFn: () => analyticsService.getEnhancedQualityIndicators(selectedDate),
    });

    // Query for hospital info to populate print headers
    const { data: hospitalResp } = useQuery({
        queryKey: ['hospital-admin-details'],
        queryFn: () => hospitalAdminService.getHospital()
    });

    // Audit Trends Query
    const { data: auditTrends } = useQuery({
        queryKey: ['audit-trends', auditTimeframe],
        queryFn: () => analyticsService.getAuditTrends({ months: auditTimeframe }),
    });

    // Load saved targets
    const queryClient = useQueryClient();
    const { data: savedTargets } = useQuery({
        queryKey: ['quality-targets'],
        queryFn: () => analyticsService.getQualityTargets(),
        onSuccess: (res: any) => {
            if (res?.data) setTargetForm({ ...DEFAULT_TARGETS, ...res.data });
        }
    } as any);

    // Sync targetForm whenever savedTargets loads
    React.useEffect(() => {
        const d = (savedTargets as any)?.data;
        if (d) setTargetForm({ ...DEFAULT_TARGETS, ...d });
    }, [savedTargets]);

    const T = targetForm; // shorthand

    const metrics = enhancedMetrics?.data?.current;
    const prevIndicators = enhancedMetrics?.data?.previous;

    const metricCards = useMemo(() => [
        {
            id: "opdWaitingTime",
            title: "OPD Wait Time",
            value: metrics?.indicators?.opdWaitingTime || 0,
            prevValue: prevIndicators?.opdWaitingTime || 0,
            unit: "min",
            target: `< ${T.opdWaitingTime} min`,
            status: (metrics?.indicators?.opdWaitingTime || 0) < T.opdWaitingTime ? "success" : "warning",
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
            target: `${T.bedOccupancyMin}–${T.bedOccupancyMax}%`,
            status: (() => { const v = metrics?.indicators?.bedOccupancyRate || 0; return v >= T.bedOccupancyMin && v <= T.bedOccupancyMax ? "success" : "danger"; })(),
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
            target: `< ${T.alos} days`,
            status: (metrics?.indicators?.alos || 0) < T.alos ? "success" : "warning",
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
            target: `< ${T.billingTat} min`,
            status: (metrics?.indicators?.billingTat || 0) < T.billingTat ? "success" : "warning",
            icon: Wallet,
            color: "amber",
            description: "Advice to Settlement"
        },
        (() => {
            const rawCount = metrics?.rawCounts?.totalIncidents ?? 0;
            const bedDays  = metrics?.rawCounts?.totalOccupiedBedDays ?? 0;
            const useRaw   = bedDays < 30;
            return {
                id: "incidentRate",
                title: "Incidents",
                value: useRaw ? rawCount : (metrics?.indicators?.incidentRate || 0),
                prevValue: useRaw ? 0 : (prevIndicators?.incidentRate || 0),
                unit: useRaw ? "reported" : "‰",
                target: useRaw ? `< ${T.incidentCountMax} /month` : `< ${T.incidentRateMax}‰`,
                status: useRaw
                    ? (rawCount < T.incidentCountMax ? "success" : "danger")
                    : ((metrics?.indicators?.incidentRate || 0) < T.incidentRateMax ? "success" : "danger"),
                icon: AlertTriangle,
                color: "rose",
                description: useRaw ? "Total this month" : "Per 1000 patient-days"
            };
        })(),
        {
            id: "readmissionRate",
            title: "Readmission Rate",
            value: metrics?.indicators?.readmissionRate || 0,
            prevValue: prevIndicators?.readmissionRate || 0,
            unit: "%",
            target: `< ${T.readmissionRate}%`,
            status: (metrics?.indicators?.readmissionRate || 0) < T.readmissionRate ? "success" : "warning",
            icon: TrendingUp,
            color: "indigo",
            description: "Readmit w/i 30 Days"
        }
    ], [metrics, prevIndicators, T]);

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
        const hData = (hospitalResp?.hospital || {}) as Partial<Hospital>;
        
        const headerHtml = renderToStaticMarkup(
            <MainHeader initialDetails={{
                name: hData.name || '',
                address: hData.address || '',
                phone: hData.phone || (hData as any).contact || '',
                email: hData.email || '',
                logo: hData.logo
            }} />
        );

        const footerHtml = renderToStaticMarkup(
            <MainFooter initialDetails={{
                name: hData.name || '',
                address: hData.address || '',
                phone: hData.phone || (hData as any).contact || '',
                email: hData.email || '',
            }} />
        );

        const html = generateQualityReportHtml({
            metrics,
            trends: auditTrends,
            month: selectedDate.month,
            year: selectedDate.year,
            hospital: { name: hData.name || '' },
            metadata: INDICATOR_METADATA,
            targets: T,
            headerHtml,
            footerHtml
        });
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
        }
        setShowExportMenu(false);
    };

    const handleExcelExport = async () => {
        setShowExportMenu(false);
        try {
            await exportQualityToExcel({
                metrics,
                trends: auditTrends,
                month: selectedDate.month,
                year: selectedDate.year,
                hospital: { name: '' },
                metadata: INDICATOR_METADATA,
                targets: T
            });
            toast.success("Excel report generated");
        } catch (error) {
            console.error("Excel Export Error:", error);
            toast.error("Failed to generate Excel");
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

    const handleSaveTargets = async () => {
        setSavingTargets(true);
        try {
            await analyticsService.saveQualityTargets(targetForm);
            queryClient.invalidateQueries({ queryKey: ['quality-targets'] });
            toast.success('Targets saved successfully');
            setShowTargets(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save targets');
        } finally {
            setSavingTargets(false);
        }
    };

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(selectedDate.year, selectedDate.month - 1));

    const formatMetricValue = (value: number, unit: string) => {
        if ((unit === 'min' || unit === 'mins') && value >= 60) {
            const hours = Math.floor(value / 60);
            const minutes = Math.round(value % 60);
            return `${hours}h ${minutes}m`;
        }
        // Round to 1 decimal place for small values
        if (value > 0 && value < 1) return value.toFixed(2);
        return value.toString();
    };

    const AuditTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border-none shadow-2xl p-2 md:p-4 rounded-2xl text-white space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 border-b border-white/10 pb-2 mb-2">{label}</p>
                    {payload.map((p: any, i: number) => {
                        const unit = p.name.includes('Occupancy') ? '%' : (p.name.includes('ALOS') ? ' days' : '');
                        return (
                            <div key={i} className="flex items-center justify-between gap-6">
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{p.name}</span>
                                <span className={`text-xs font-black ${p.color === '#3b82f6' ? 'text-blue-400' : 'text-violet-400'}`}>
                                    {p.value}{unit}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen">
            {/* Master Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 md:p-3 bg-primary-theme text-white rounded-xl">
                        <BarChart3 size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xs md:text-base md:text-lg font-bold text-slate-900 uppercase">QUALITY INDICATORS</h1>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold">Continuous Quality Improvement (CQI)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 flex-1 sm:flex-none justify-between">
                        <button onClick={() => handleDateChange(-1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-2 md:px-3 py-1 text-[10px] md:text-xs font-black text-slate-700 uppercase flex items-center gap-2 min-w-[120px] md:min-w-[140px] justify-center">
                            <CalendarDays size={14} className="text-blue-500" />
                            {monthName} {selectedDate.year}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex-1 sm:flex-none flex justify-center">
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={() => setShowTargets(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                            <Settings2 size={14} /> Targets
                        </button>

                        <div className="relative flex-1 sm:flex-none">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-lg shadow-slate-200"
                            >
                                <Download size={14} />
                                Export
                            </button>

                            {showExportMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowExportMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                                        <button
                                            onClick={handleExport}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all group"
                                        >
                                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100">
                                                <FileText size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-tight">Download PDF</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Print Format</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={handleExcelExport}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl transition-all group mt-1"
                                        >
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100">
                                                <FileSpreadsheet size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-tight">Download Excel</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Spreadsheet</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-6">
                {metricCards.map((card, i) => {
                    const variance = card.prevValue ? ((card.value - card.prevValue) / card.prevValue) * 100 : 0;
                    const isImprovement = card.id === 'bedOccupancyRate' ? variance > 0 : variance < 0;

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedIndicator({ ...INDICATOR_METADATA[card.id], ...card })}
                            className="p-3 md:p-5 bg-white border-slate-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all flex flex-col h-[150px] md:h-[170px] rounded-2xl border cursor-pointer group relative overflow-hidden min-w-0"
                        >
                            <div className="flex justify-between items-start mb-auto">
                                <div className={`p-1.5 md:p-2.5 rounded-xl bg-${card.color}-50 text-${card.color}-600 shadow-sm group-hover:scale-110 transition-transform shrink-0`}>
                                    <card.icon size={16} className="md:w-5 md:h-5" strokeWidth={2.5} />
                                </div>
                                <div className="text-right min-w-0">
                                    <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[6px] md:text-[8px] font-black uppercase tracking-wider border truncate ${card.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {card.target}
                                    </div>
                                    {variance !== 0 && (
                                        <div className={`mt-1 flex items-center justify-end gap-0.5 text-[7px] md:text-[8px] font-black ${isImprovement ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {variance > 0 ? <ArrowUpRight size={8} className="md:w-[10px] md:h-[10px]" /> : <ArrowDownRight size={8} className="md:w-[10px] md:h-[10px]" />}
                                            {Math.abs(variance).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-2 md:mb-3 mt-2 md:mt-0 min-w-0">
                                <div className="flex items-baseline gap-0.5 truncate">
                                    <h3 className="text-sm md:text-2xl font-black text-slate-900 tracking-tighter truncate">
                                        {formatMetricValue(card.value, card.unit)}
                                    </h3>
                                    <span className="text-[8px] md:text-xs font-bold text-slate-400 ml-0.5 uppercase">{card.unit}</span>
                                </div>
                                <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">{card.title}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 mt-auto flex justify-between items-center">
                                <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight uppercase group-hover:text-blue-500 transition-colors">Click for Trends</p>
                                <div className="group-hover:text-blue-500 transition-colors">
                                    <Info size={12} className="text-slate-300" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Audit Trend Center */}
                <Card className="lg:col-span-2 p-2 md:p-4 md:p-6 bg-white border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" />
                                Audit Performance Trends
                            </h3>
                            <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase mt-0.5">Performance Analysis</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex bg-white border-2 border-blue-400/40 rounded-full p-1 shadow-[0_0_15px_rgba(59,130,246,0.15)] items-center">
                                <button
                                    onClick={() => setChartType('area')}
                                    className={`flex items-center gap-2 px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-black transition-all duration-300 ${chartType === 'area'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                        : 'text-slate-500 hover:text-blue-600 font-bold'
                                        }`}
                                >
                                    <TrendingUp size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />
                                    Curve
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`flex items-center gap-2 px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-black transition-all duration-300 ${chartType === 'bar'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                        : 'text-slate-500 hover:text-blue-600 font-bold'
                                        }`}
                                >
                                    <BarChart size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />
                                    Bar
                                </button>
                            </div>
                            <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg">
                                {[3, 6].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setAuditTimeframe(m as any)}
                                        className={`px-2.5 py-1 text-[8px] md:text-[9px] font-black uppercase rounded-md transition-all ${auditTimeframe === m ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-400 font-bold'}`}
                                    >
                                        {m}M
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'area' ? (
                                <AreaChart data={auditTrends?.data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <RechartsTooltip content={<AuditTooltip />} />
                                    <Area type="monotone" name="Occupancy %" dataKey="bedOccupancyRate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                                    <Area type="monotone" name="ALOS (Days)" dataKey="alos" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            ) : (
                                <RechartsBarChart data={auditTrends?.data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                    <RechartsTooltip content={<AuditTooltip />} />
                                    <Bar name="Occupancy %" dataKey="bedOccupancyRate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar name="ALOS (Days)" dataKey="alos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                                </RechartsBarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Audit Evidence */}
                <div className="space-y-4">
                    <Card className="p-2 md:p-6 bg-slate-900 border-none shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 pointer-events-none">
                            <ShieldAlert size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                                    <Lock size={14} className="text-blue-400" />
                                    Governance
                                </h3>
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${metrics?.status === 'locked' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                    {metrics?.status === 'locked' ? 'VERIFIED' : 'OPEN'}
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10">
                                    <div>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase">Compliance Score</p>
                                        <p className="text-xl font-black text-emerald-400">{metrics?.complianceScore || 0}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7px] font-bold text-slate-500 uppercase">Data Gaps</p>
                                        <p className="text-xl font-black text-rose-400">
                                            {(metrics?.dataGaps?.missingDiagnoses || 0) + (metrics?.dataGaps?.untrackedInfections || 0)}
                                        </p>
                                    </div>
                                </div>
                                {metrics?.status === 'locked' && (
                                    <div className="text-[8px] font-bold text-slate-400 flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><User size={10} /> {metrics.lockedBy?.name}</div>
                                        <div className="flex items-center gap-2"><CalendarDays size={10} /> {new Date(metrics.lockedAt).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleFinalize}
                                disabled={isFinalizing || metrics?.status === 'locked'}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {metrics?.status === 'locked' ? <FileCheck size={12} /> : <RefreshCw className={isFinalizing ? 'animate-spin' : ''} size={12} />}
                                {metrics?.status === 'locked' ? 'Audit Locked' : 'Finalize Monthly Data'}
                            </button>
                        </div>
                    </Card>

                    <Card className="p-2 md:p-6 bg-white border-slate-200 shadow-sm flex-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={16} />
                            Critical Gaps
                        </h3>

                        <div className="space-y-2">
                            {[
                                { label: "Diagnosis Completeness", value: metrics?.dataGaps?.missingDiagnoses || 0 },
                                { label: "Infection Tracking", value: metrics?.dataGaps?.untrackedInfections || 0 }
                            ].map((gap, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{gap.label}</span>
                                    <span className={`text-[10px] font-black ${gap.value > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {gap.value}
                                    </span>
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

            <style jsx global>{`
                /* Global polish */
            `}</style>
            {/* =========== Configure Targets Modal =========== */}
            {showTargets && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTargets(false)} />

                    {/* Modal */}
                    <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] animate-in fade-in zoom-in duration-200 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="p-2 md:p-2.5 bg-primary-theme/10 text-primary-theme rounded-xl">
                                    <Settings2 size={16} className="md:w-5 md:h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] md:text-base font-black text-slate-900 uppercase tracking-tight">Configure Quality Targets</h2>
                                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">NABH benchmark thresholds · per hospital</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTargets(false)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                                <XIcon size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                        </div>

                        {/* Grid Form */}
                        <div className="overflow-y-auto px-3 md:px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* OPD Wait Time */}
                                <div className="p-3 md:p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={10} className="md:w-[11px] md:h-[11px]" /> OPD Wait Time
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">Less than</span>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={300}
                                            value={targetForm.opdWaitingTime}
                                            onChange={e => setTargetForm(p => ({ ...p, opdWaitingTime: +e.target.value }))}
                                            className="flex-1 px-3 py-2 border border-blue-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white h-9 md:h-10"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">min</span>
                                    </div>
                                </div>

                                {/* ALOS */}
                                <div className="p-3 md:p-4 bg-violet-50/70 border border-violet-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={10} className="md:w-[11px] md:h-[11px]" /> Avg Length of Stay
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">Less than</span>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={60} step={0.5}
                                            value={targetForm.alos}
                                            onChange={e => setTargetForm(p => ({ ...p, alos: +e.target.value }))}
                                            className="flex-1 px-3 py-2 border border-violet-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white h-9 md:h-10"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">days</span>
                                    </div>
                                </div>

                                {/* Billing TAT */}
                                <div className="p-3 md:p-4 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <Wallet size={10} className="md:w-[11px] md:h-[11px]" /> Billing TAT
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">Less than</span>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={1440}
                                            value={targetForm.billingTat}
                                            onChange={e => setTargetForm(p => ({ ...p, billingTat: +e.target.value }))}
                                            className="flex-1 px-3 py-2 border border-amber-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white h-9 md:h-10"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">min</span>
                                    </div>
                                </div>

                                {/* Readmission */}
                                <div className="p-3 md:p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <TrendingUp size={10} className="md:w-[11px] md:h-[11px]" /> Readmission Rate
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">Less than</span>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={100} step={0.1}
                                            value={targetForm.readmissionRate}
                                            onChange={e => setTargetForm(p => ({ ...p, readmissionRate: +e.target.value }))}
                                            className="flex-1 px-3 py-2 border border-indigo-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white h-9 md:h-10"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">%</span>
                                    </div>
                                </div>

                                {/* Bed Occupancy — full width */}
                                <div className="md:col-span-2 p-3 md:p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <Bed size={10} className="md:w-[11px] md:h-[11px]" /> Bed Occupancy Range
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">Between</span>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={100}
                                                value={targetForm.bedOccupancyMin}
                                                onChange={e => setTargetForm(p => ({ ...p, bedOccupancyMin: +e.target.value }))}
                                                className="w-16 md:w-20 px-3 py-2 border border-emerald-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white h-9 md:h-10"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">and</span>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={100}
                                                value={targetForm.bedOccupancyMax}
                                                onChange={e => setTargetForm(p => ({ ...p, bedOccupancyMax: +e.target.value }))}
                                                className="w-16 md:w-20 px-3 py-2 border border-emerald-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white h-9 md:h-10"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                        <span className="text-[8px] md:text-[9px] text-slate-300 font-bold ml-auto">(Target range — ✅ if within bounds)</span>
                                    </div>
                                </div>

                                {/* Incidents — full width */}
                                <div className="md:col-span-2 p-3 md:p-4 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-2 md:space-y-3">
                                    <label className="text-[9px] md:text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <AlertTriangle size={10} className="md:w-[11px] md:h-[11px]" /> Incident Targets
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0 w-24 md:w-28">Rate (‰) target</span>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={100} step={0.1}
                                                value={targetForm.incidentRateMax}
                                                onChange={e => setTargetForm(p => ({ ...p, incidentRateMax: +e.target.value }))}
                                                className="flex-1 px-3 py-2 border border-rose-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white h-9 md:h-10"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">‰</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0 w-24 md:w-28">Count/month</span>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={500}
                                                value={targetForm.incidentCountMax}
                                                onChange={e => setTargetForm(p => ({ ...p, incidentCountMax: +e.target.value }))}
                                                className="flex-1 px-3 py-2 border border-rose-200 rounded-xl text-xs md:text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white h-9 md:h-10"
                                            />
                                            <span className="text-[9px] font-bold text-slate-300">low-data</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                onClick={() => setShowTargets(false)}
                                className="px-4 md:px-6 py-2.5 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTargets}
                                disabled={savingTargets}
                                className="flex-1 py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-theme/20 disabled:opacity-60 active:scale-95"
                            >
                                {savingTargets ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                {savingTargets ? 'Saving…' : 'Save Targets'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityIndicatorDashboard;
