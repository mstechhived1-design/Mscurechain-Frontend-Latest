'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info, Zap,
    ClipboardList, Droplets, Wind, Stethoscope, FlaskConical,
    ThumbsUp
} from 'lucide-react';

interface GastroModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Data constants ────────────────────────────────────────────────────────────
const SYMPTOMS = [
    'Abdominal Pain',
    'Vomiting',
    'Nausea',
    'Diarrhea',
    'Constipation',
    'Bloating',
    'Loss of appetite',
    'Blood in stool',
    'Black stool (Melena)',
    'Blood in vomit (Hematemesis)',
] as const;

const RED_FLAG_SYMPTOMS = [
    'Blood in stool',
    'Black stool (Melena)',
    'Blood in vomit (Hematemesis)',
];

const PAIN_LOCATIONS = ['Epigastric', 'RUQ', 'RLQ', 'LLQ', 'Diffuse'] as const;
const PAIN_TYPES = ['Burning', 'Colicky', 'Sharp'] as const;
const BOWEL_HABITS = ['Normal', 'Constipation', 'Diarrhea', 'Alternating'] as const;
const STOOL_TYPES = ['Normal', 'Loose', 'Hard', 'Black (Melena)', 'Blood-stained'] as const;
const BOWEL_SOUNDS = ['Normal', 'Hyperactive', 'Sluggish', 'Absent'] as const;
const DISTENTION = ['None', 'Mild', 'Severe'] as const;
const TENDERNESS = ['None', 'Epigastric', 'RUQ', 'RLQ', 'Diffuse'] as const;
const GUARDING = ['None', 'Guarding', 'Rigidity', 'Palpable Mass'] as const;
const DIAGNOSES = ['GERD', 'Gastritis', 'PUD', 'IBS', 'IBD', 'Hepatitis', 'Fatty Liver', 'Cirrhosis', 'Pancreatitis'] as const;

export const GastroModule: React.FC<GastroModuleProps> = ({ formData, setFormData }) => {
    if (!formData.gastroData) return null;
    const g = formData.gastroData;

    // ── Helper updaters ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, gastroData: { ...prev.gastroData, [field]: value } }));

    const updateLiver = (subField: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            gastroData: {
                ...prev.gastroData,
                liver: { ...prev.gastroData?.liver, [subField]: value },
            },
        }));

    const updateSpleen = (value: string) =>
        setFormData((prev: any) => ({
            ...prev,
            gastroData: { ...prev.gastroData, spleen: { status: value } },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = g.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };



    // ── Derived convenience flags ─────────────────────────────────────────────

    const syms: string[] = g.symptoms || [];
    const hasRedFlag = syms.some(s => RED_FLAG_SYMPTOMS.includes(s));

    // ── Style helpers ─────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error: 'bg-rose-50 border-rose-500 text-rose-800',
        warning: 'bg-amber-50 border-amber-500 text-amber-800',
        info: 'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnPill = (active: boolean, danger = false, warn = false) =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${active
            ? danger ? 'bg-red-600 text-white border-red-600 shadow-md'
                : warn ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-md'
            : danger ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                : warn ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const sectionCard = (children: React.ReactNode, borderColor = 'border-slate-200') =>
        <div className={`bg-white rounded-2xl border ${borderColor} p-5 shadow-sm`}>{children}</div>;

    const sectionHeader = (icon: React.ReactNode, title: string, required = false, note?: string) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-slate-700">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {required && <span className="ml-auto text-[9px] font-bold text-red-400 uppercase tracking-wider">Required</span>}
            {note && !required && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );



    return (
        <div className="space-y-4">



            {/* Standardized Light Header */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-emerald-700">Gastroenterology Assessment</h2>
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Digestive & Hepatic System Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-emerald-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">
                        Gastro - Module
                    </div>
                </div>
            </div>

            {/* ── A. SYMPTOMS ─────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<ClipboardList size={17} />, 'Presenting Symptoms', true, 'select all that apply')}
                    <div className="flex flex-wrap gap-2">
                        {SYMPTOMS.map(sym => {
                            const active = syms.includes(sym);
                            const isDanger = RED_FLAG_SYMPTOMS.includes(sym);
                            return (
                                <button
                                    key={sym} type="button"
                                    onClick={() => toggleSymptom(sym)}
                                    className={btnPill(active, isDanger)}
                                >
                                    {isDanger && '🔴 '}{sym}
                                </button>
                            );
                        })}
                    </div>
                </>,
                'border-emerald-100',
            )}

            {/* ── B. PAIN CHARACTER ───────────────────────────────────────── */}
            {syms.includes('Abdominal Pain') && sectionCard(
                <>
                    {sectionHeader(<Zap size={17} />, 'Pain Character')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Location */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Pain Location
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PAIN_LOCATIONS.map(loc => (
                                    <button
                                        key={loc} type="button"
                                        onClick={() => update('painLocation', g.painLocation === loc ? '' : loc)}
                                        className={btnPill(g.painLocation === loc)}
                                    >{loc}</button>
                                ))}
                            </div>
                        </div>
                        {/* Type */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Pain Type
                            </label>
                            <div className="flex gap-2">
                                {PAIN_TYPES.map(type => (
                                    <button
                                        key={type} type="button"
                                        onClick={() => update('painType', g.painType === type ? '' : type)}
                                        className={`flex-1 ${btnPill(
                                            g.painType === type,
                                            type === 'Sharp',
                                            type === 'Colicky',
                                        )}`}
                                    >{type}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>,
                'border-amber-100',
            )}

            {/* ── C. BOWEL HABITS ────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Activity size={17} />, 'Bowel Habits', true)}
                    <div className="flex gap-2">
                        {BOWEL_HABITS.map(habit => (
                            <button
                                key={habit} type="button"
                                onClick={() => update('bowelHabits', habit)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${g.bowelHabits === habit
                                        ? habit === 'Constipation' ? 'bg-amber-500 text-white shadow-md'
                                            : habit === 'Diarrhea' ? 'bg-orange-500 text-white shadow-md'
                                                : habit === 'Alternating' ? 'bg-purple-500 text-white shadow-md'
                                                    : 'bg-emerald-500 text-white shadow-md'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                {habit === 'Normal' ? '✓ Normal'
                                    : habit === 'Alternating' ? '↕ Alternating'
                                        : habit}
                            </button>
                        ))}
                    </div>
                </>,
                'border-slate-200',
            )}

            {/* ── D. STOOL CHARACTER ──────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Droplets size={17} />, 'Stool Character')}
                    <div className="flex flex-wrap gap-2">
                        {STOOL_TYPES.map(type => {
                            const isDanger = type === 'Black (Melena)' || type === 'Blood-stained';
                            return (
                                <button
                                    key={type} type="button"
                                    onClick={() => update('stoolType', type)}
                                    className={btnPill(g.stoolType === type, isDanger)}
                                >
                                    {isDanger && '🔴 '}{type}
                                </button>
                            );
                        })}
                    </div>
                </>,
                'border-slate-200',
            )}

            {/* ── E. PHYSICAL EXAMINATION ─────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Stethoscope size={17} />, 'Abdominal Examination')}

                    <div className="space-y-5">
                        {/* Bowel Sounds */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Bowel Sounds (Auscultation)
                            </label>
                            <div className="flex gap-2">
                                {BOWEL_SOUNDS.map(bs => (
                                    <button
                                        key={bs} type="button"
                                        onClick={() => update('bowelSounds', bs)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${g.bowelSounds === bs
                                                ? bs === 'Absent' ? 'bg-red-600 text-white shadow-md'
                                                    : bs === 'Sluggish' ? 'bg-amber-500 text-white shadow-md'
                                                        : bs === 'Hyperactive' ? 'bg-orange-500 text-white shadow-md'
                                                            : 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                    >{bs}</button>
                                ))}
                            </div>
                        </div>

                        {/* Distention */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Abdominal Distention (Inspection)
                            </label>
                            <div className="flex gap-2">
                                {DISTENTION.map(d => (
                                    <button
                                        key={d} type="button"
                                        onClick={() => update('distention', d)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${g.distention === d
                                                ? d === 'Severe' ? 'bg-red-600 text-white shadow-md'
                                                    : d === 'Mild' ? 'bg-amber-500 text-white shadow-md'
                                                        : 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                    >{d}</button>
                                ))}
                            </div>
                        </div>

                        {/* Tenderness — dropdown (REQUIRED) */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Tenderness (Palpation)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TENDERNESS.map(t => (
                                    <button
                                        key={t} type="button"
                                        onClick={() => update('tenderness', t)}
                                        className={btnPill(g.tenderness === t, t !== 'None')}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* Organomegaly — Liver */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    🫀 Liver
                                </label>
                                <div className="flex gap-2 mb-3">
                                    {(['Not palpable', 'Enlarged'] as const).map(s => (
                                        <button
                                            key={s} type="button"
                                            onClick={() => updateLiver('status', s)}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${g.liver?.status === s
                                                    ? s === 'Enlarged' ? 'bg-red-500 text-white shadow-md'
                                                        : 'bg-emerald-500 text-white shadow-md'
                                                    : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >{s}</button>
                                    ))}
                                </div>
                                {g.liver?.status === 'Enlarged' && (
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                            Size (cm below costal margin)
                                        </label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={20}
                                            placeholder="0 – 20 cm"
                                            value={g.liver?.size ?? ''}
                                            onChange={e => updateLiver('size', e.target.value)}
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm font-black text-center outline-none transition-all border focus:ring-2 ${(g.liver?.size || 0) > 15
                                                    ? 'border-red-400 bg-red-50 focus:ring-red-500/20'
                                                    : 'border-slate-200 bg-white focus:ring-emerald-500/20 focus:border-emerald-400'
                                                }`}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Spleen */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    🫀 Spleen
                                </label>
                                <div className="flex gap-2">
                                    {(['Not palpable', 'Enlarged'] as const).map(s => (
                                        <button
                                            key={s} type="button"
                                            onClick={() => updateSpleen(s)}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${g.spleen?.status === s
                                                    ? s === 'Enlarged' ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-emerald-500 text-white shadow-md'
                                                    : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Guarding / Rigidity */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Guarding / Rigidity
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {GUARDING.map(gd => (
                                    <button
                                        key={gd} type="button"
                                        onClick={() => update('guarding', gd)}
                                        className={btnPill(
                                            g.guarding === gd,
                                            gd === 'Rigidity' || gd === 'Palpable Mass',
                                            gd === 'Guarding',
                                        )}
                                    >
                                        {gd === 'Rigidity' || gd === 'Palpable Mass' ? '🔴 ' : ''}{gd}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>,
                'border-blue-100',
            )}

            {/* ── F. DIAGNOSIS ────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'GI Diagnosis', false, 'select one')}
                    <div className="flex flex-wrap gap-2">
                        {DIAGNOSES.map(dx => (
                            <button
                                key={dx} type="button"
                                onClick={() => update('diagnosis', g.diagnosis === dx ? '' : dx)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${g.diagnosis === dx
                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                            >{dx}</button>
                        ))}
                    </div>
                </>,
                'border-emerald-100',
            )}

            {/* ── Notes ───────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        Clinical Notes / Additional Observations
                    </label>
                    <textarea
                        value={g.notes || ''}
                        onChange={e => update('notes', e.target.value)}
                        rows={3}
                        placeholder="Additional clinical observations, special investigations requested, clinical impression..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none outline-none"
                    />
                </>,
                'border-slate-200',
            )}
        </div>
    );
};
