'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, Wind, AlertTriangle, ShieldAlert, Info, Zap,
    Thermometer, ClipboardList, Stethoscope, Move, Gauge
} from 'lucide-react';

interface PulmonologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
    'Dry cough', 'Productive cough', 'Breathlessness', 
    'Wheeze', 'Chest pain', 'Fever', 'Hemoptysis'
] as const;

const OXYGEN_OPTS = ['Room Air', 'Nasal Oxygen', 'Mask', 'Ventilator'] as const;
const EXPANSION_OPTS = ['Normal', 'Reduced', 'Asymmetrical'] as const;
const AIR_ENTRY_OPTS = ['Normal', 'Reduced Right', 'Reduced Left', 'Absent'] as const;
const ADDED_SOUNDS = ['Wheeze', 'Crackles', 'Stridor', 'Pleural Rub'] as const;
const SEVERITIES = ['Mild', 'Moderate', 'Severe', 'Acute Exacerbation'] as const;
const DIAGNOSES = ['Asthma', 'COPD', 'Pneumonia', 'TB', 'ARDS'] as const;

export const PulmonologyModule: React.FC<PulmonologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.pulmoData) return null;
    const p = formData.pulmoData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, pulmoData: { ...prev.pulmoData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, pulmoData: {
                ...prev.pulmoData,
                [key]: { ...prev.pulmoData?.[key], [sub]: value },
            },
        }));

    const toggleMulti = (field: string, value: string) => {
        const curr: string[] = p[field] || [];
        update(field, curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value]);
    };

    const toggleAuscultationSound = (sound: string) => {
        const curr: string[] = p.auscultation?.sounds || [];
        updateNested('auscultation', 'sounds', curr.includes(sound) ? curr.filter(s => s !== sound) : [...curr, sound]);
    };

    // ── Style helpers ─────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-cyan-50 border-cyan-400 text-cyan-800',
    };

    const sectionHeader = (icon: React.ReactNode, title: string, required = false) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-cyan-600">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {required && <span className="ml-auto text-[9px] font-bold text-red-400 uppercase tracking-widest">Required</span>}
        </div>
    );

    const btnPill = (active: boolean, color = 'cyan') =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? color === 'red' ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : color === 'orange' ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                  : 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const isHypoxic = p.vitals?.spo2 && parseInt(p.vitals.spo2) < 94;
    const isDistressed = p.vitals?.respRate && parseInt(p.vitals.respRate) > 24;

    return (
        <div className="space-y-4">



            {/* Standardized Light Header */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                        <Wind size={20} className="text-cyan-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-cyan-700">Pulmonology Assessment</h2>
                        <p className="text-[9px] font-bold text-cyan-600/60 uppercase tracking-widest">Respiratory & Lung Function Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">

                    <div className="bg-white border border-cyan-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-cyan-600">
                        Pulmo - Module
                    </div>
                </div>
            </div>

            {/* ── A. VITALS ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                {sectionHeader(<Activity size={17} />, 'A. Respiratory Vitals', true)}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Respiratory Rate (bpm)</label>
                        <div className="relative">
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                                value={p.vitals?.respRate || ''}
                                onChange={(e) => updateNested('vitals', 'respRate', e.target.value)}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-lg font-black focus:ring-2 outline-none transition-all ${isDistressed ? 'border-red-400 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 focus:ring-cyan-500/20'}`}
                                placeholder="12-20"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">bpm</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">SpO2 Level (%)</label>
                        <div className="relative">
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                                value={p.vitals?.spo2 || ''}
                                onChange={(e) => updateNested('vitals', 'spo2', e.target.value)}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-lg font-black focus:ring-2 outline-none transition-all ${isHypoxic ? 'border-red-400 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 focus:ring-cyan-500/20'}`}
                                placeholder="95-100"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">%</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Oxygen Support</label>
                        <div className="flex flex-col gap-1.5">
                            {OXYGEN_OPTS.map(opt => (
                                <button key={opt} type="button"
                                    onClick={() => updateNested('vitals', 'oxygenSupport', opt)}
                                    className={btnPill(p.vitals?.oxygenSupport === opt, opt === 'Ventilator' ? 'red' : 'cyan')}
                                >{opt}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── B. SYMPTOMS ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                {sectionHeader(<ClipboardList size={17} />, 'B. Respiratory Symptoms', true)}
                <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map(sym => (
                        <button key={sym} type="button"
                            onClick={() => toggleMulti('symptoms', sym)}
                            className={btnPill(p.symptoms?.includes(sym), sym === 'Hemoptysis' ? 'red' : 'cyan')}
                        >{sym}</button>
                    ))}
                </div>
            </div>

            {/* ── C. mMRC SCALE ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                {sectionHeader(<Gauge size={17} />, 'C. mMRC Grade (Breathlessness Scale)')}
                <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(grade => (
                        <button key={grade} type="button"
                            onClick={() => update('mmrcGrade', grade)}
                            className={`flex-1 py-4 rounded-xl text-lg font-black transition-all border ${
                                p.mmrcGrade === grade 
                                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' 
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-cyan-300'
                            }`}
                        >
                            {grade}
                        </button>
                    ))}
                </div>
                <div className="mt-3 grid grid-cols-5 text-[7px] text-slate-400 font-bold uppercase tracking-tighter text-center">
                    <span>Normal</span>
                    <span>Hill Only</span>
                    <span>Walk Slower</span>
                    <span>Stop at 100m</span>
                    <span>House Bound</span>
                </div>
            </div>

            {/* ── D. CLINICAL EXAM ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    {sectionHeader(<Move size={17} />, 'D. Physical Exam')}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Chest Expansion</label>
                            <div className="flex gap-1">
                                {EXPANSION_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'chestExpansion', opt)}
                                        className={btnPill(p.exam?.chestExpansion === opt)}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Accessory Muscles Use</label>
                            <div className="flex gap-1">
                                {['Yes', 'No'].map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('exam', 'accessoryMuscles', opt)}
                                        className={btnPill(p.exam?.accessoryMuscles === opt, opt === 'Yes' ? 'red' : 'cyan')}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    {sectionHeader(<Stethoscope size={17} />, 'E. Auscultation')}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Air Entry</label>
                            <div className="grid grid-cols-2 gap-1">
                                {AIR_ENTRY_OPTS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('auscultation', 'airEntry', opt)}
                                        className={btnPill(p.auscultation?.airEntry === opt, opt === 'Absent' ? 'red' : 'cyan')}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Added Sounds</label>
                            <div className="grid grid-cols-2 gap-1">
                                {ADDED_SOUNDS.map(sound => (
                                    <button key={sound} type="button"
                                        onClick={() => toggleAuscultationSound(sound)}
                                        className={btnPill(p.auscultation?.sounds?.includes(sound), sound === 'Stridor' ? 'red' : 'cyan')}
                                    >{sound}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── F. PEAK FLOW & G. DIAGNOSIS ───────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    {sectionHeader(<Activity size={17} />, 'F. Peak Flow (PEFR)')}
                    <div className="flex items-center gap-4">
                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} 
                            value={p.peakFlow || ''}
                            onChange={(e) => update('peakFlow', e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-cyan-500/20 outline-none"
                            placeholder="e.g. 450"
                        />
                        <div className="text-[10px] font-bold text-slate-400 uppercase">L/min</div>
                    </div>
                    {p.peakFlow && p.peakFlow < 200 && (
                        <p className="mt-2 text-[9px] font-black text-red-600 uppercase">&larr; Severe airway obstruction</p>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    {sectionHeader(<ClipboardList size={17} />, 'G. Impression')}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {DIAGNOSES.map(dx => (
                            <button key={dx} type="button"
                                onClick={() => update('diagnosis', dx)}
                                className={btnPill(p.diagnosis === dx, 'cyan')}
                            >{dx}</button>
                        ))}
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Severity</label>
                        <div className="flex gap-1">
                            {SEVERITIES.map(sev => (
                                <button key={sev} type="button"
                                    onClick={() => update('severity', sev)}
                                    className={btnPill(p.severity === sev, sev.includes('Severe') || sev.includes('Acute') ? 'red' : 'cyan')}
                                >{sev}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Patient View Summary ─────────────────────────────── */}

        </div>
    );
};
