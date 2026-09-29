'use client';

import React, { useEffect, useState } from 'react';
import { 
    Activity, AlertTriangle, ShieldAlert, Info, Zap, 
    Droplets, FlaskConical, Heart, Wind, Brain, 
    ThumbsUp, Beaker, ClipboardList, Ruler, Search,
    Scan, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';

interface RadiologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

const MODALITIES = ['X-ray', 'USG', 'CT', 'MRI', 'Doppler'] as const;
const PRIORITIES = ['Routine', 'Urgent', 'Emergency'] as const;

export const RadiologyModule: React.FC<RadiologyModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.radiologyOrder) return null;
    const r = formData.radiologyOrder;

    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, radiologyOrder: { ...prev.radiologyOrder, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, radiologyOrder: {
                ...prev.radiologyOrder,
                [key]: { ...prev.radiologyOrder?.[key], [sub]: value },
            },
        }));

    // --- SAFETY & VALIDATION ENGINE ---
    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const creat = parseFloat(r.contrast?.creatinine) || 0;

        // 1. Mandatory Clinical Justification
        if (!r.clinicalIndication) {
            newAlerts.push({ type: 'error', message: '❗ BLOCK: Imaging requires clinical justification (Indication is mandatory).' });
        }

        // 2. Radiation Safety (CT/X-ray + Pregnancy)
        if ((r.modality === 'CT' || r.modality === 'X-ray') && r.safety?.pregnancy) {
            newAlerts.push({ type: 'emergency', message: '🚨 HARD BLOCK: Radiation is strictly contraindicated in pregnancy for CT/X-ray.' });
        }

        // 3. MRI Safety (MRI + Implants)
        if (r.modality === 'MRI' && r.safety?.implants) {
            newAlerts.push({ type: 'emergency', message: '🚨 HARD BLOCK: MRI is unsafe with metallic implants/pacemakers.' });
        }

        // 4. Contrast Safety
        if (r.contrast?.requested) {
            if (!r.contrast?.creatinine) {
                newAlerts.push({ type: 'error', message: '❗ BLOCK: Serum Creatinine is mandatory for all contrast-enhanced studies.' });
            } else if (creat > 1.5) {
                newAlerts.push({ type: 'warning', message: '⚠️ WARNING: High Creatinine noted. Risk of Contrast-Induced Nephropathy.' });
            }
        }

        // 5. Modality Optimization
        if (r.modality === 'CT' && !r.clinicalIndication?.toLowerCase().includes('fracture') && !r.clinicalIndication?.toLowerCase().includes('emergency')) {
            newAlerts.push({ type: 'info', message: 'ℹ️ ALGORITHM: Consider USG or X-ray if appropriate to minimize radiation dose.' });
        }

        setAlerts(newAlerts);
    }, [r.modality, r.clinicalIndication, r.safety?.pregnancy, r.safety?.implants, r.contrast?.requested, r.contrast?.creatinine]);

    const btnPill = (active: boolean, danger = false) =>
        `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? danger ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const sectionCard = (children: React.ReactNode, title: string, icon: React.ReactNode) => (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="text-sky-700">{icon}</div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800">{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header Badge */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center">
                        <Scan size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-black uppercase tracking-[0.2em] leading-none mb-1 text-indigo-700">Radiology Requisition</h2>
                        <p className="text-[10px] font-bold text-indigo-600/60 uppercase tracking-widest">Imaging & Safety Protocols</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border ${r.priority === 'Emergency' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                        Priority: {r.priority}
                    </div>
                </div>
            </div>

            {/* Safety Alerts */}
            {alerts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-start gap-3 p-4 rounded-2xl border-l-4 shadow-sm ${
                            alert.type === 'emergency' ? 'bg-red-50 border-red-600 text-red-900' :
                            alert.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-800' :
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-800' :
                            'bg-blue-50 border-blue-400 text-blue-800'
                        }`}>
                            {alert.type === 'emergency' || alert.type === 'error' ? <ShieldAlert size={18} className="shrink-0 mt-0.5" /> :
                             alert.type === 'warning' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : <Info size={18} className="shrink-0 mt-0.5" />}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-tight leading-snug">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. Modal & Priority */}
                {sectionCard(
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Modality</label>
                            <div className="flex flex-wrap gap-2">
                                {MODALITIES.map(m => (
                                    <button key={m} type="button" onClick={() => update('modality', m)} className={btnPill(r.modality === m)}>{m}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Urgency Priority</label>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITIES.map(p => (
                                    <button key={p} type="button" onClick={() => update('priority', p)} className={btnPill(r.priority === p, p === 'Emergency')}>{p}</button>
                                ))}
                            </div>
                        </div>
                    </div>,
                    'Modality & Urgency', <Zap size={18} />
                )}

                {/* 2. Body Part & Protocol */}
                {sectionCard(
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Body Part (Required)</label>
                            <input type="text" value={r.bodyPart} onChange={e => update('bodyPart', e.target.value)} 
                                className="w-full bg-transparent text-sm font-black outline-none border-none placeholder:text-slate-300" placeholder="e.g. Abdomen, Chest, Brain" />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specific Protocol</label>
                            <input type="text" value={r.protocol} onChange={e => update('protocol', e.target.value)} 
                                className="w-full bg-transparent text-sm font-black outline-none border-none placeholder:text-slate-300" placeholder="e.g. CECT, MRI with Gad, Plain" />
                        </div>
                        <div className="bg-sky-50 p-3 rounded-2xl border border-sky-100">
                            <label className="text-[8px] font-black text-sky-600/60 uppercase tracking-widest block mb-1">Clinical Indication (MANDATORY)</label>
                            <textarea value={r.clinicalIndication} onChange={e => update('clinicalIndication', e.target.value)} rows={2}
                                className="w-full bg-transparent text-[11px] font-bold outline-none border-none placeholder:text-sky-200 resize-none" placeholder="Reason for imaging..." />
                        </div>
                    </div>,
                    'Study Parameters', <FileText size={18} />
                )}

                {/* 3. Safety Check */}
                {sectionCard(
                    <div className="space-y-4">
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={r.safety?.pregnancy} onChange={e => updateNested('safety', 'pregnancy', e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-rose-300 text-rose-600 focus:ring-rose-500 transition-all" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${r.safety?.pregnancy ? 'text-rose-700' : 'text-slate-400'}`}>Pregnant Patient</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={r.safety?.implants} onChange={e => updateNested('safety', 'implants', e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-rose-300 text-rose-600 focus:ring-rose-500 transition-all" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${r.safety?.implants ? 'text-rose-700' : 'text-slate-400'}`}>Metallic Implants</span>
                            </label>
                        </div>
                        
                        <div className={`p-4 rounded-2xl border transition-all ${r.contrast?.requested ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" checked={r.contrast?.requested} onChange={e => updateNested('contrast', 'requested', e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500 transition-all" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${r.contrast?.requested ? 'text-amber-700 font-black' : 'text-slate-400'}`}>Contrast Study</span>
                            </label>
                            {r.contrast?.requested && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-white p-2 rounded-xl border border-amber-200">
                                            <label className="text-[7px] font-black text-amber-500 uppercase tracking-widest block mb-1">Serum Creatinine</label>
                                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1" value={r.contrast?.creatinine || ''} onChange={e => updateNested('contrast', 'creatinine', e.target.value)}
                                                className="w-full bg-transparent text-xs font-black outline-none border-none placeholder:text-amber-200" placeholder="mg/dL" />
                                        </div>
                                        <div className="flex-1 bg-white p-2 rounded-xl border border-amber-200">
                                            <label className="text-[7px] font-black text-amber-500 uppercase tracking-widest block mb-1">Contrast Type</label>
                                            <input type="text" value={r.contrast?.type || ''} onChange={e => updateNested('contrast', 'type', e.target.value)}
                                                className="w-full bg-transparent text-[8px] font-black outline-none border-none" placeholder="e.g. Low Osmolar" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={r.contrast?.allergy} onChange={e => updateNested('contrast', 'allergy', e.target.checked)}
                                            className="w-4 h-4 rounded-md border-amber-300 text-amber-600 focus:ring-amber-500 transition-all" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">History of Drug Allergy</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>,
                    'Safety Checklist', <ShieldAlert size={18} />
                )}
            </div>

            {/* Additional Notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 shadow-xs">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <ClipboardList size={20} className="text-indigo-400" />
                </div>
                <input type="text" value={r.notes || ''} onChange={e => update('notes', e.target.value)}
                    className="flex-1 bg-transparent text-xs font-bold outline-none border-none placeholder:text-slate-300" placeholder="Any additional clinical clues or specific imaging requests..." />
            </div>
        </div>
    );
};
