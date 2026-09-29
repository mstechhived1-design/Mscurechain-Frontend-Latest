'use client';

import React, { useEffect, useState } from 'react';
import { Baby, Activity, Thermometer, AlertTriangle, ShieldCheck, Heart, Wind, Scale, Info } from 'lucide-react';

interface PediatricsModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const PediatricsModule: React.FC<PediatricsModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<{ type: 'error' | 'warning' | 'info'; message: string }[]>([]);

    if (!formData.pediatricData) return null;

    const pediatricData = formData.pediatricData;

    // --- Validation Engine ---
    useEffect(() => {
        const newAlerts: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
        const weight = parseFloat(pediatricData.weight);
        const temp = parseFloat(pediatricData.temperature);
        const hr = parseInt(pediatricData.heartRate);
        const rr = parseInt(pediatricData.respRate);
        const age = parseInt(formData.age) || 0;

        // 2. Age-based Head Circumference
        if (age > 5 && pediatricData.headCircumference) {
            newAlerts.push({ type: 'info', message: "Head circumference is typically monitored for children < 5 years." });
        }

        // 3. Temperature Rules
        if (temp > 104) {
            newAlerts.push({ type: 'error', message: "CRITICAL: Medical emergency - High-grade fever (>104°F)." });
        } else if (temp > 102) {
            newAlerts.push({ type: 'warning', message: "High-grade fever detected." });
        }

        // 4. Heart Rate (Simplified Age Based)
        if (hr) {
            const isInfant = age <= 1;
            if (isInfant && (hr < 100 || hr > 160)) {
                newAlerts.push({ type: 'warning', message: "Abnormal infant heart rate (Normal: 100-160 BPM)." });
            } else if (!isInfant && (hr < 70 || hr > 120)) {
                newAlerts.push({ type: 'warning', message: "Abnormal child heart rate (Normal: 70-120 BPM)." });
            }
        }

        // 5. Respiratory Rate
        if (rr) {
            const isInfant = age <= 1;
            if (isInfant && rr > 60) {
                newAlerts.push({ type: 'warning', message: "High RR: Possible respiratory distress (Normal: 30-60)." });
            } else if (!isInfant && rr > 30) {
                newAlerts.push({ type: 'warning', message: "High RR: Possible respiratory distress (Normal: 20-30)." });
            }
        }

        // 6. Milestone Check
        if (pediatricData.milestones === 'Delayed' && !pediatricData.milestoneNotes) {
            newAlerts.push({ type: 'info', message: "Please document the developmental delay in notes." });
        }

        // 7. Red Flags
        if (pediatricData.redFlags && pediatricData.redFlags.length > 0) {
            newAlerts.push({ type: 'error', message: "URGENT: Red flags selected. Immediate pediatric evaluation required." });
        }

        // 8. Cross-field logic (Infection/Dehydration)
        const syms = pediatricData.symptoms || [];
        if (syms.includes('Fever') && syms.includes('Cough')) {
            newAlerts.push({ type: 'info', message: "Clinical Suggestion: Possible respiratory infection." });
        }
        if ((syms.includes('Vomiting') || syms.includes('Diarrhea')) && syms.includes('Poor Feeding')) {
            newAlerts.push({ type: 'warning', message: "Dehydration Risk: Monitor intake and output closely." });
        }
        if (syms.includes('Lethargy') && syms.includes('Poor Feeding')) {
            newAlerts.push({ type: 'error', message: "Serious Illness Alert: Immediate medical attention required." });
        }

        setAlerts(newAlerts);
    }, [pediatricData, formData.age]);

    const updatePeds = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            pediatricData: {
                ...prev.pediatricData,
                [field]: value
            }
        }));
    };

    const updateGrowth = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            pediatricData: {
                ...prev.pediatricData,
                growth: {
                    ...prev.pediatricData.growth,
                    [field]: value
                }
            }
        }));
    };

    const toggleListItem = (field: 'symptoms' | 'redFlags' | 'dueVaccines', item: string) => {
        const current = pediatricData[field] || [];
        const next = current.includes(item)
            ? current.filter((i: string) => i !== item)
            : [...current, item];
        updatePeds(field, next);
    };

    return (
        <div className="space-y-6">
            {/* Standardized Light Header */}
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                        <Baby size={20} className="text-sky-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-sky-700">Pediatrics Assessment</h2>
                        <p className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest">Child Growth & Development Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {alerts.length > 0 && (
                        <div className="bg-sky-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-sky-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-sky-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-sky-700">Safety Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-sky-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-sky-600">
                        Pediatrics - Module
                    </div>
                </div>
            </div>

            {/* Real-time Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-4 rounded-xl border-l-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
                            alert.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-800' :
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-800' :
                            'bg-blue-50 border-blue-500 text-blue-800'
                        }`}>
                            {alert.type === 'error' ? <AlertTriangle size={18} className="shrink-0" /> : <Info size={18} className="shrink-0" />}
                            <p className="text-xs font-black uppercase tracking-tight">{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* A. Profile & B. Vitals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-rose-600">
                        <Scale size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Physical Measurements</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weight (kg)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.weight || ''}
                                onChange={(e) => updatePeds('weight', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                placeholder="0.0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height (cm)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.height || ''}
                                onChange={(e) => updatePeds('height', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">HC (cm)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.headCircumference || ''}
                                onChange={(e) => updatePeds('headCircumference', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                placeholder="0"
                                disabled={parseInt(formData.age) > 5}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                        <Activity size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Clinical Vitals</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Temp (°F)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.temperature || ''}
                                onChange={(e) => updatePeds('temperature', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                placeholder="98.6"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">HR (BPM)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.heartRate || ''}
                                onChange={(e) => updatePeds('heartRate', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                placeholder="100"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">RR (min)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={pediatricData.respRate || ''}
                                onChange={(e) => updatePeds('respRate', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                placeholder="30"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* C. Growth & D. Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <Thermometer size={18} />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Growth Assessment</h3>
                        </div>
                        <a 
                            href="https://www.who.int/tools/child-growth-standards/standards" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                        >
                            WHO Growth Charts <Info size={10} />
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weight for Age</label>
                            <div className="flex flex-col gap-1.5">
                                {['Normal', 'Underweight', 'Overweight'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => updateGrowth('weightForAge', v)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all ${pediatricData.growth?.weightForAge === v ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height for Age</label>
                            <div className="flex flex-col gap-1.5">
                                {['Normal', 'Stunted'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => updateGrowth('heightForAge', v)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all ${pediatricData.growth?.heightForAge === v ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-pink-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-pink-600">
                        <Baby size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Developmental Milestones</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {['Normal', 'Delayed', 'Borderline'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => updatePeds('milestones', m)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${pediatricData.milestones === m ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={pediatricData.milestoneNotes || ''}
                            onChange={(e) => updatePeds('milestoneNotes', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none outline-none"
                            placeholder="Milestone details (e.g., Social smile, Neck control)..."
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* E. Immunization */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-indigo-600">
                    <ShieldCheck size={18} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Immunization Status</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col gap-2">
                        {['Up to date', 'Partially immunized', 'Not immunized'].map((s) => (
                            <button
                                key={s}
                                onClick={() => updatePeds('immunizationStatus', s)}
                                className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${pediatricData.immunizationStatus === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="md:col-span-2">
                        {pediatricData.immunizationStatus !== 'Up to date' && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Due / Missing Vaccines</label>
                                <div className="flex flex-wrap gap-2">
                                    {['BCG', 'OPV', 'DPT', 'Hib', 'PCV', 'Rotavirus', 'IPV', 'Hep B', 'MMR', 'Varicella', 'Typhoid', 'Hep A'].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => toggleListItem('dueVaccines', v)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${pediatricData.dueVaccines?.includes(v) ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* G. Red Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm ring-1 ring-rose-50">
                    <div className="flex items-center gap-2 mb-4 text-rose-600">
                        <AlertTriangle size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Red Flag Signs</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['Persistent Fever', 'Poor Feeding', 'Respiratory Distress', 'Convulsions'].map((r) => (
                            <button
                                key={r}
                                onClick={() => toggleListItem('redFlags', r)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${pediatricData.redFlags?.includes(r) ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-400 hover:bg-rose-100'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
