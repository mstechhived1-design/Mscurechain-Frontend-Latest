'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Heart,
    Thermometer,
    Droplets,
    FileText,
    Pill,
    ChevronLeft,
    TrendingUp,
} from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';

export default function PatientClinicalHistoryPage() {
    const params = useParams() as any;
    const router = useRouter();
    const admissionId = params.id as string;

    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'meds' | 'alerts'>('vitals');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const data = await ipdService.getClinicalHistory(admissionId);
                setHistory(data);
            } catch (error: any) {
                toast.error("Failed to load clinical history");
            } finally {
                setLoading(false);
            }
        };
        if (admissionId) fetchHistory();
    }, [admissionId]);

    if (loading) {
        return (
            <div className="flex min-h-[600px] items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!history) return <div className="p-20 text-center uppercase font-black text-slate-400">Record not found</div>;

    const admission = history.admission;

    return (
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 px-2 sm:px-0">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
                <div className="flex items-center gap-4 sm:gap-6">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm shrink-0"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase truncate">Clinical Record</h1>
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                            {admission.patient?.name} • {admissionId}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                        <p className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase leading-none">{admission.bed?.bedId || 'N/A'}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Location</p>
                    </div>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 px-2 sm:px-0">
                <QuickStat icon={<Heart className="text-rose-500" size={14} />} label="HR" value="78" unit="BPM" />
                <QuickStat icon={<Activity className="text-emerald-500" size={14} />} label="BP" value={admission.vitals?.bloodPressure || '--'} unit="" />
                <QuickStat icon={<Droplets className="text-blue-500" size={14} />} label="SpO2" value="98" unit="%" />
                <QuickStat icon={<Thermometer className="text-amber-500" size={14} />} label="Temp" value={admission.vitals?.temperature ? `${admission.vitals.temperature}°F` : '--'} unit="" />
            </div>

            {/* TAB CONTENT */}
            <div className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[400px] sm:min-h-[500px] mx-2 sm:mx-0">
                {/* TABS HEADER */}
                <div className="flex items-center gap-4 sm:gap-8 px-4 sm:px-10 border-b border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'vitals'} onClick={() => setActiveTab('vitals')} icon={<Activity size={14} />} label="Vitals" />
                    <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<FileText size={14} />} label="Notes" />
                    <TabButton active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} icon={<Pill size={14} />} label="Meds" />
                </div>

                <div className="p-4 sm:p-10">
                    {activeTab === 'vitals' && (
                        <div className="space-y-8">
                            {/* MINI GRAPH PLACEHOLDER */}
                            <div className="h-48 w-full bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                                <div className="text-center space-y-2">
                                    <TrendingUp className="text-slate-200 mx-auto" size={32} />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vitals Trend Analytics (Coming Soon)</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">BP</th>
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">HR</th>
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">SpO2</th>
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Glucose</th>
                                            <th className="pb-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {history.vitals.map((v: any) => (
                                            <tr key={v._id} className="group">
                                                <td className="py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-slate-900">{format(new Date(v.createdAt), 'dd MMM, HH:mm')}</td>
                                                <td className="py-3 sm:py-4 text-[10px] sm:text-xs font-black text-slate-600">{v.systolicBP}/{v.diastolicBP}</td>
                                                <td className="py-3 sm:py-4 text-[10px] sm:text-xs font-black text-slate-600">{v.heartRate}</td>
                                                <td className="py-3 sm:py-4 text-[10px] sm:text-xs font-black text-slate-600">{v.spO2}%</td>
                                                <td className="py-3 sm:py-4 text-[10px] sm:text-xs font-black text-slate-600">{v.glucose || v.sugar || '--'} {v.glucoseType ? `(${v.glucoseType})` : ''}</td>
                                                <td className="py-3 sm:py-4">
                                                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${v.status === 'Critical' ? 'bg-rose-50 text-rose-600' :
                                                        v.status === 'Warning' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                        {v.status[0]}<span className="hidden sm:inline">{v.status.slice(1)}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="space-y-4 sm:space-y-6">
                            {history.notes.map((n: any) => (
                                <div key={n._id} className="p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100 space-y-3 sm:space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-slate-900 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-md sm:rounded-lg shrink-0">{n.type}</span>
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[8px] sm:text-[10px] font-black uppercase shrink-0">
                                                {n.author?.name?.[0] || 'N'}
                                            </div>
                                            <p className="text-[8px] sm:text-[10px] font-black text-slate-900 uppercase truncate">Nurse {n.author?.name || 'Admin'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                                        <NoteSection label="Subj" content={n.subjective} />
                                        <NoteSection label="Obj" content={n.objective} />
                                        <NoteSection label="Assm" content={n.assessment} />
                                        <NoteSection label="Plan" content={n.plan} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'meds' && (
                        <div className="space-y-2 sm:space-y-4">
                            {(history.meds || []).map((m: any) => (
                                <div key={m._id} className="flex items-center gap-3 sm:gap-6 p-4 sm:p-6 bg-white border border-slate-100 rounded-2xl sm:rounded-3xl group hover:border-amber-200 transition-all shadow-sm">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-50 rounded-lg sm:rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                                        <Pill size={16} className="sm:size-6" />
                                    </div>
                                    <div className="grow min-w-0">
                                        <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate">{m.drugName} - {m.dose}</h3>
                                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{m.route} • {format(new Date(m.timestamp || m.createdAt), 'HH:mm')}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[7px] sm:text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 sm:px-3 py-1 rounded-full uppercase tracking-widest">Administered</span>
                                        <p className="text-[6px] sm:text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">REF: {m._id.slice(-4)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuickStat({ icon, label, value, unit }: any) {
    return (
        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[32px] border border-slate-200 shadow-sm space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner shrink-0">
                    {icon}
                </div>
                <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{label}</span>
            </div>
            <p className="text-base sm:text-2xl font-black text-slate-900 truncate">
                {value} <span className="text-[8px] sm:text-xs text-slate-400 font-bold">{unit}</span>
            </p>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 sm:gap-2 py-3 sm:py-5 border-b-2 transition-all group shrink-0 ${active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
        >
            <span className={active ? 'text-slate-900' : 'text-slate-300 group-hover:text-slate-400'}>{icon}</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{label}</span>
        </button>
    );
}

function NoteSection({ label, content }: any) {
    if (!content) return null;
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
            <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{content}"</p>
        </div>
    );
}
