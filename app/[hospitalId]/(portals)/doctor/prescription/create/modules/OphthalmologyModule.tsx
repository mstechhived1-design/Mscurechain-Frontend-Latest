'use client';

import React, { useEffect, useState } from 'react';
import {
    Eye, AlertTriangle, ShieldAlert, Info, Zap,
    Activity, FlaskConical, Target, ThumbsUp, ClipboardList
} from 'lucide-react';

interface OphthalmologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
    'Redness', 'Pain', 'Watering', 'Itching', 'Blurred Vision',
    'Photophobia', 'Discharge', 'Foreign Body Sensation', 'Sudden Vision Loss',
] as const;

const VISION_OPTIONS = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'HM', 'PL+', 'NPL'] as const;
const PUPIL_OPTIONS  = ['PERRLA', 'Sluggish', 'Fixed'] as const;
const PUPIL_OPTS          = ['PERRLA', 'Sluggish', 'Fixed'] as const;
const CONJUNCTIVA_OPTS    = ['Normal', 'Congested', 'Pale'] as const;
const CORNEA_OPTS         = ['Clear', 'Ulcer', 'Opacity'] as const;
const ANTE_CHAMBER_OPTS   = ['Normal', 'Shallow', 'Deep'] as const;
const LENS_OPTS           = ['Clear', 'Cataract', 'Mature cataract'] as const;
const RETINA_OPTS         = ['Normal', 'Detachment', 'Degeneration'] as const;
const OPTIC_DISC_OPTS     = ['Normal', 'Cupping increased'] as const;
const MACULA_OPTS         = ['Normal', 'Edema'] as const;
const DIAGNOSES           = ['Conjunctivitis', 'Dry Eye', 'Cataract', 'Glaucoma', 'Refractive Error', 'Corneal Ulcer'] as const;

const EMERGENCY_SYMS = ['Sudden Vision Loss'];
const DANGER_SYMS    = ['Pain', 'Foreign Body Sensation'];

// ── Vision severity helper ────────────────────────────────────────────────────
const visionSeverity = (v: string): 'severe' | 'moderate' | 'normal' | 'unknown' => {
    if (!v) return 'unknown';
    const severe = ['HM', 'PL+', 'NPL', 'CF', 'PL', '6/60'];
    const moderate = ['6/36', '6/24'];
    if (severe.some(s => v.toUpperCase().startsWith(s))) return 'severe';
    if (moderate.some(s => v === s)) return 'moderate';
    if (v.match(/^6\/\d+$/)) {
        const d = parseInt(v.split('/')[1]);
        if (d >= 60) return 'severe';
        if (d >= 24) return 'moderate';
        return 'normal';
    }
    return 'unknown';
};

export const OphthalmologyModule: React.FC<OphthalmologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.ophthaData) return null;
    const o = formData.ophthaData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, ophthaData: { ...prev.ophthaData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, ophthaData: {
                ...prev.ophthaData,
                [key]: { ...prev.ophthaData?.[key], [sub]: value },
            },
        }));

    const updateDeep = (key: string, eye: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, ophthaData: {
                ...prev.ophthaData,
                [key]: {
                    ...prev.ophthaData?.[key],
                    [eye]: { ...prev.ophthaData?.[key]?.[eye], [sub]: value },
                },
            },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = o.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };



    // ── Derived ───────────────────────────────────────────────────────────────

    const syms: string[]  = o.symptoms || [];
    const iopOD = parseFloat(o.iop?.od) || 0;
    const iopOS = parseFloat(o.iop?.os) || 0;

    // ── Style helpers ─────────────────────────────────────────────────────────
    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rosese-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnPill = (active: boolean, danger = false, warn = false) =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? danger ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : warn  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-blue-600 text-white border-blue-600 shadow-md'
                : danger ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                  : warn  ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const sectionCard = (children: React.ReactNode, borderColor = 'border-slate-200') =>
        <div className={`bg-white rounded-2xl border ${borderColor} p-5 shadow-sm`}>{children}</div>;

    const sectionHeader = (icon: React.ReactNode, title: string, note?: string) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-blue-700">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {note && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );

    // Vision selection row (pills + free text)
    const renderVisionRow = ({ eye, label }: { eye: 'od' | 'os'; label: string }) => {
        const sev = visionSeverity(o.vision?.[eye]?.unaided || '');
        return (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5">Unaided (Without Glasses)</label>
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'unaided', o.vision?.[eye]?.unaided === v ? '' : v)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${o.vision?.[eye]?.unaided === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                >{v}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {['HM', 'PL+', 'NPL', 'CF'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'unaided', o.vision?.[eye]?.unaided === v ? '' : v)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${o.vision?.[eye]?.unaided === v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-400'}`}
                                >{v}</button>
                            ))}
                            <input type="text" placeholder="Custom"
                                value={!['6/6','6/9','6/12','6/18','6/24','6/36','6/60','HM','PL+','NPL','CF'].includes(o.vision?.[eye]?.unaided || '') ? (o.vision?.[eye]?.unaided || '') : ''}
                                onChange={e => updateDeep('vision', eye, 'unaided', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black text-center focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5">With Glasses / Corrected</label>
                        <div className="flex flex-wrap gap-1.5">
                            {['6/6', '6/9', '6/12', '6/18', '6/24', '6/36'].map(v => (
                                <button key={v} type="button"
                                    onClick={() => updateDeep('vision', eye, 'corrected', o.vision?.[eye]?.corrected === v ? '' : v)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${o.vision?.[eye]?.corrected === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                >{v}</button>
                            ))}
                            <input type="text" placeholder="Custom"
                                value={!['6/6','6/9','6/12','6/18','6/24','6/36'].includes(o.vision?.[eye]?.corrected || '') ? (o.vision?.[eye]?.corrected || '') : ''}
                                onChange={e => updateDeep('vision', eye, 'corrected', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black text-center focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderEyeExamRow = ({ label, category, field, options, getBtnClass, emojiFn }: { label: string, category: 'slitLamp' | 'fundus', field: string, options: readonly string[], getBtnClass: (opt: string, active: boolean) => string, emojiFn?: (opt: string) => string }) => {
        const getVal = (eye?: 're' | 'le' | 'notes') => {
            const val = o[category]?.[field];
            if (typeof val === 'string') return eye === 're' ? val : '';
            return val?.[eye || 'notes'] || '';
        };

        const setVal = (eye: 're' | 'le' | 'notes', value: string) => {
            let current = o[category]?.[field] || { re: '', le: '', notes: '' };
            if (typeof current === 'string') current = { re: current, le: current, notes: '' };
            updateNested(category, field, { ...current, [eye]: value });
        };

        const renderEyeRow = (eye: 're' | 'le', eyeLabel: string) => (
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 w-5">{eyeLabel}</span>
                <div className="flex flex-1 gap-1">
                    {options.map(opt => (
                        <button key={opt} type="button"
                            onClick={() => setVal(eye, getVal(eye) === opt ? '' : opt)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${getBtnClass(opt, getVal(eye) === opt)}`}
                        >
                            {emojiFn ? emojiFn(opt) : ''}{opt}
                        </button>
                    ))}
                    <input 
                        type="text" 
                        placeholder="Other..."
                        value={!options.includes(getVal(eye) as any) ? getVal(eye) : ''}
                        onChange={e => setVal(eye, e.target.value)}
                        className={`flex-1 min-w-[60px] py-1 px-2 rounded-lg text-[9px] font-black uppercase transition-all border outline-none ${!options.includes(getVal(eye) as any) && getVal(eye) ? 'bg-blue-50 border-blue-300 text-blue-700 focus:ring-2 focus:ring-blue-400' : 'bg-white text-slate-700 border-slate-200 focus:ring-2 focus:ring-blue-300'}`}
                    />
                </div>
            </div>
        );

        return (
            <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</label>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2">
                    {renderEyeRow('re', 'RE')}
                    {renderEyeRow('le', 'LE')}
                    <input type="text" placeholder="Additional notes..."
                        value={getVal('notes')}
                        onChange={e => setVal('notes', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">


            {/* ── PATIENT HISTORY ─────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<ClipboardList size={17} />, 'Patient History')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                                History of Presenting Illness (HOPI)
                            </label>
                            <textarea
                                value={o.hopi || ''}
                                onChange={e => update('hopi', e.target.value)}
                                rows={2}
                                placeholder="E.g., Started suddenly, non-progressive..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                                Past History (Ocular & Systemic)
                            </label>
                            <textarea
                                value={o.pastHistory || ''}
                                onChange={e => update('pastHistory', e.target.value)}
                                rows={2}
                                placeholder="E.g., Diabetes, Hypertension, previous eye surgeries..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                                Family History
                            </label>
                            <textarea
                                value={o.familyHistory || ''}
                                onChange={e => update('familyHistory', e.target.value)}
                                rows={2}
                                placeholder="E.g., Glaucoma, Cataract..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none outline-none"
                            />
                        </div>
                    </div>
                </>,
                'border-slate-200 mb-4',
            )}

            {/* ── A. VISUAL ACUITY ──────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Eye size={17} />, 'A. Visual Acuity', 'OD = Right Eye | OS = Left Eye')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderVisionRow({ eye: "od", label: "🔵 OD — Right Eye (Oculus Dexter)" })}
                        {renderVisionRow({ eye: "os", label: "🟢 OS — Left Eye (Oculus Sinister)" })}
                    </div>
                    {/* Summary row */}
                    {(o.vision?.od?.unaided || o.vision?.os?.unaided) && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
                                <span className="text-[8px] font-black uppercase text-blue-400 block">OD Unaided → Corrected</span>
                                <span className="text-sm font-black text-blue-800">
                                    {o.vision?.od?.unaided || '--'}{o.vision?.od?.corrected ? ` → ${o.vision.od.corrected}` : ''}
                                </span>
                            </div>
                            <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-2 text-center">
                                <span className="text-[8px] font-black uppercase text-cyan-400 block">OS Unaided → Corrected</span>
                                <span className="text-sm font-black text-cyan-800">
                                    {o.vision?.os?.unaided || '--'}{o.vision?.os?.corrected ? ` → ${o.vision.os.corrected}` : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </>,
                'border-blue-100',
            )}

            {/* ── B. REFRACTION ─────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Target size={17} />, 'B. Refraction')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Right Eye */}
                        <div className="rounded-xl border border-blue-200 overflow-hidden">
                            <div className="bg-blue-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center">
                                Right Eye (OD)
                            </div>
                            <table className="w-full text-center">
                                <thead>
                                    <tr className="bg-blue-50 border-b border-blue-200">
                                        <th className="text-[8px] font-black uppercase text-blue-700 py-2 px-1 w-[20%]"></th>
                                        <th className="text-[8px] font-black uppercase text-blue-700 py-2 px-1">Sph.</th>
                                        <th className="text-[8px] font-black uppercase text-blue-700 py-2 px-1">Cyl.</th>
                                        <th className="text-[8px] font-black uppercase text-blue-700 py-2 px-1">Axis</th>
                                        <th className="text-[8px] font-black uppercase text-blue-700 py-2 px-1">VA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(['distant', 'near'] as const).map(row => (
                                        <tr key={row} className="border-b border-slate-100 last:border-0">
                                            <td className="text-[8px] font-black uppercase text-slate-500 py-2 px-2 text-left">
                                                {row === 'distant' ? 'Distant Vision' : 'Near Vision'}
                                            </td>
                                            {(['sph', 'cyl', 'axis', 'va'] as const).map(field => (
                                                <td key={field} className="py-1.5 px-1">
                                                    <input
                                                        type="text"
                                                        placeholder={field === 'axis' ? '0–180' : field === 'va' ? '6/6' : '+/-'}
                                                        value={o.refraction?.od?.[row]?.[field] || ''}
                                                        onChange={e => {
                                                            setFormData((prev: any) => ({
                                                                ...prev,
                                                                ophthaData: {
                                                                    ...prev.ophthaData,
                                                                    refraction: {
                                                                        ...prev.ophthaData?.refraction,
                                                                        od: {
                                                                            ...prev.ophthaData?.refraction?.od,
                                                                            [row]: {
                                                                                ...prev.ophthaData?.refraction?.od?.[row],
                                                                                [field]: e.target.value,
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            }));
                                                        }}
                                                        className="w-full rounded-lg px-1 py-1.5 text-xs font-bold text-center border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-300"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Left Eye */}
                        <div className="rounded-xl border border-emerald-200 overflow-hidden">
                            <div className="bg-emerald-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center">
                                Left Eye (OS)
                            </div>
                            <table className="w-full text-center">
                                <thead>
                                    <tr className="bg-emerald-50 border-b border-emerald-200">
                                        <th className="text-[8px] font-black uppercase text-emerald-700 py-2 px-1 w-[20%]"></th>
                                        <th className="text-[8px] font-black uppercase text-emerald-700 py-2 px-1">Sph.</th>
                                        <th className="text-[8px] font-black uppercase text-emerald-700 py-2 px-1">Cyl.</th>
                                        <th className="text-[8px] font-black uppercase text-emerald-700 py-2 px-1">Axis</th>
                                        <th className="text-[8px] font-black uppercase text-emerald-700 py-2 px-1">VA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(['distant', 'near'] as const).map(row => (
                                        <tr key={row} className="border-b border-slate-100 last:border-0">
                                            <td className="text-[8px] font-black uppercase text-slate-500 py-2 px-2 text-left">
                                                {row === 'distant' ? 'Distant Vision' : 'Near Vision'}
                                            </td>
                                            {(['sph', 'cyl', 'axis', 'va'] as const).map(field => (
                                                <td key={field} className="py-1.5 px-1">
                                                    <input
                                                        type="text"
                                                        placeholder={field === 'axis' ? '0–180' : field === 'va' ? '6/6' : '+/-'}
                                                        value={o.refraction?.os?.[row]?.[field] || ''}
                                                        onChange={e => {
                                                            setFormData((prev: any) => ({
                                                                ...prev,
                                                                ophthaData: {
                                                                    ...prev.ophthaData,
                                                                    refraction: {
                                                                        ...prev.ophthaData?.refraction,
                                                                        os: {
                                                                            ...prev.ophthaData?.refraction?.os,
                                                                            [row]: {
                                                                                ...prev.ophthaData?.refraction?.os?.[row],
                                                                                [field]: e.target.value,
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            }));
                                                        }}
                                                        className="w-full rounded-lg px-1 py-1.5 text-xs font-bold text-center border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-emerald-300"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>,
                'border-slate-200',
            )}

            {/* ── C. IOP ────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Activity size={17} />, 'C. Intraocular Pressure (IOP)', 'Normal: 10–21 mmHg')}
                    <div className="grid grid-cols-2 gap-4">
                        {(['od', 'os'] as const).map(eye => {
                            const val = parseFloat(o.iop?.[eye]) || 0;
                            const isHigh  = val > 21;
                            const isVHigh = val > 30;
                            return (
                                <div key={eye} className={`rounded-xl p-4 border text-center ${isVHigh ? 'bg-red-50 border-red-300' : isHigh ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                        {eye === 'od' ? '🔵 OD Right' : '🟢 OS Left'}
                                    </label>
                                    <input
                                        type="text" placeholder="16"
                                        value={o.iop?.[eye] || ''}
                                        onChange={e => updateNested('iop', eye, e.target.value)}
                                        className={`w-full border rounded-lg p-2.5 text-xl font-black text-center outline-none focus:ring-2 ${
                                            isVHigh ? 'bg-red-100 border-red-400 text-red-700 focus:ring-red-300' :
                                            isHigh  ? 'bg-amber-100 border-amber-400 text-amber-700 focus:ring-amber-300' :
                                            'bg-white border-slate-200 text-slate-800 focus:ring-blue-300'
                                        }`}
                                    />
                                    <span className="text-[8px] text-slate-400 mt-1 block">mmHg</span>
                                </div>
                            );
                        })}
                    </div>
                </>,
                'border-sky-100',
            )}

            {/* ── F. SLIT LAMP ──────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'E. Slit Lamp Examination')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {renderEyeExamRow({ label: "Conjunctiva", category: "slitLamp", field: "conjunctiva", options: CONJUNCTIVA_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100' 
                        })}
                        {renderEyeExamRow({ label: "Cornea", category: "slitLamp", field: "cornea", options: CORNEA_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Clear' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-red-600 text-white border-red-600 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100',
                            emojiFn: opt => opt !== 'Clear' ? '🔴 ' : ''
                        })}
                        {renderEyeExamRow({ label: "Anterior Chamber", category: "slitLamp", field: "anteriorChamber", options: ANTE_CHAMBER_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100' 
                        })}
                        {renderEyeExamRow({ label: "Pupil", category: "slitLamp", field: "pupil", options: PUPIL_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Fixed' ? 'bg-red-600 text-white border-red-600 shadow-md' : opt === 'Sluggish' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-emerald-500 text-white border-emerald-500 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100',
                            emojiFn: opt => opt === 'PERRLA' ? '✓ ' : opt === 'Fixed' ? '🔴 ' : '⚠️ '
                        })}
                        {renderEyeExamRow({ label: "Lens", category: "slitLamp", field: "lens", options: LENS_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Clear' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : (opt === 'Mature cataract' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md')) : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100' 

                        })}
                    </div>
                </>,
                'border-blue-100',
            )}

            {/* ── G. FUNDUS EXAM ────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Target size={17} />, 'G. Fundus Examination')}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {renderEyeExamRow({ label: "Retina", category: "fundus", field: "retina", options: RETINA_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-red-600 text-white border-red-600 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100',
                            emojiFn: opt => opt !== 'Normal' ? '🔴 ' : ''
                        })}
                        {renderEyeExamRow({ label: "Optic Disc", category: "fundus", field: "opticDisc", options: OPTIC_DISC_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100' 
                        })}
                        {renderEyeExamRow({ label: "Macula", category: "fundus", field: "macula", options: MACULA_OPTS, 
                            getBtnClass: (opt, active) => active ? (opt === 'Normal' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-amber-500 text-white border-amber-500 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100' 
                        })}
                    </div>
                </>,
                'border-indigo-100',
            )}


            {/* ── Notes ─────────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        Clinical Notes / Additional Observations
                    </label>
                    <textarea
                        value={o.notes || ''}
                        onChange={e => update('notes', e.target.value)}
                        rows={3}
                        placeholder="Colour vision, contrast sensitivity, additional investigations requested, specialist referral notes..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none outline-none"
                    />
                </>,
                'border-slate-200',
            )}




        </div>
    );
};
