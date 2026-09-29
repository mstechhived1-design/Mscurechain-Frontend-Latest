'use client';

import React, { useEffect, useState } from 'react';
import {
    Heart, Activity, Calendar, AlertTriangle, Info,
    Baby, Thermometer, FlaskConical, ClipboardList, ShieldAlert
} from 'lucide-react';

interface GynecologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Helper parsers ──────────────────────────────────────────────────────────
function parseBP(bp: string): { sys: number; dia: number } | null {
    if (!bp) return null;
    const parts = bp.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    if (isNaN(sys) || isNaN(dia)) return null;
    return { sys, dia };
}

export const GynecologyModule: React.FC<GynecologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.gynaecData) return null;
    const g = formData.gynaecData;



    // ── State helpers ────────────────────────────────────────────────────────
    const updateGyn = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: { ...prev.gynaecData, [field]: value }
        }));
    };

    const updateObstetric = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                obstetric: { ...prev.gynaecData?.obstetric, [field]: value }
            }
        }));
    };

    const updateVitals = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                vitals: { ...prev.gynaecData?.vitals, [field]: value }
            }
        }));
    };

    const updateObstetricExam = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                obstetricExam: { ...prev.gynaecData?.obstetricExam, [field]: value }
            }
        }));
    };

    const updateGynExam = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            gynaecData: {
                ...prev.gynaecData,
                gynExam: { ...prev.gynaecData?.gynExam, [field]: value }
            }
        }));
    };

    const toggleSymptom = (sym: string) => {
        const curr = g.symptoms || [];
        updateGyn('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    const toggleInvestigation = (inv: string) => {
        const curr = g.investigations || [];
        updateGyn('investigations', curr.includes(inv) ? curr.filter((i: string) => i !== inv) : [...curr, inv]);
    };

    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
    };

    const btnBase = (active: boolean, color = 'pink') =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            active
                ? `bg-${color}-600 text-white shadow-md`
                : `bg-slate-50 text-slate-400 hover:bg-slate-100`
        }`;

    return (
        <div className="space-y-5">
            {/* Standardized Light Header */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                        <Heart size={20} className="text-pink-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-pink-700">Gynecology Assessment</h2>
                        <p className="text-[9px] font-bold text-pink-600/60 uppercase tracking-widest">Obstetric & Gynecological Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-pink-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-pink-600">
                        Gynae - Module
                    </div>
                </div>
            </div>

            {/* ── A. MENSTRUAL HISTORY (white card) ────────────────────────── */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-[#db2777] rounded-full"></div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Menstrual History</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* LMP */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            LMP Date
                        </label>
                        <input
                            type="date"
                            value={g.lmp || ''}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateGyn('lmp', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    {/* Cycle Length */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cycle Length (days)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={60}
                            value={g.cycleLength || ''}
                            onChange={(e) => updateGyn('cycleLength', e.target.value)}
                            placeholder="28"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                        <div className="flex gap-1">
                            {['Regular', 'Irregular'].map(r => (
                                <button key={r} type="button"
                                    onClick={() => updateGyn('cycleRegularity', r)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${g.cycleRegularity === r ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                >{r}</button>
                            ))}
                        </div>
                    </div>

                    {/* Flow Duration */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flow Duration (days)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={15}
                            value={g.flowDuration || ''}
                            onChange={(e) => updateGyn('flowDuration', e.target.value)}
                            placeholder="5"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                        <div className="flex gap-1">
                            {['Normal', 'Heavy', 'Scanty'].map(f => (
                                <button key={f} type="button"
                                    onClick={() => updateGyn('flowType', f === 'Heavy' ? 'Heavy (Menorrhagia)' : f)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${g.flowType === (f === 'Heavy' ? 'Heavy (Menorrhagia)' : f) ? 'bg-pink-600 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                >{f}</button>
                            ))}
                        </div>
                    </div>

                    {/* Pregnancy Status */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Pregnancy Status
                        </label>
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex flex-col gap-1 border-2 border-slate-100">
                            {['Yes', 'No', 'Suspected'].map(status => (
                                <button key={status} type="button"
                                    onClick={() => updateGyn('pregnant', status)}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        g.pregnant === status
                                            ? 'bg-white text-pink-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >{status}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── B. OBSTETRIC HISTORY (Structured) ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-pink-700">
                    <Baby size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Obstetric History (G·P·L·A)</h3>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { key: 'gravida', label: 'Gravida (G)', hint: 'Total pregnancies' },
                        { key: 'para', label: 'Para (P)', hint: 'Deliveries ≥20wks' },
                        { key: 'living', label: 'Living (L)', hint: 'Living children' },
                        { key: 'abortions', label: 'Abortions (A)', hint: 'Miscarriages + TOPs' },
                    ].map(({ key, label, hint }) => (
                        <div key={key} className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={20}
                                value={g.obstetric?.[key] ?? ''}
                                onChange={(e) => updateObstetric(key, e.target.value === '' ? undefined : parseInt(e.target.value))}
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-lg font-black text-center focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            />
                            <p className="text-[8px] text-slate-400 font-medium text-center">{hint}</p>
                        </div>
                    ))}
                </div>
                {/* GPLA Summary */}
                {(g.obstetric?.gravida || g.obstetric?.para || g.obstetric?.living != null || g.obstetric?.abortions != null) && (
                    <div className="mt-3 bg-pink-50 rounded-xl px-4 py-2 text-center">
                        <span className="text-sm font-black text-pink-700 tracking-widest">
                            G{g.obstetric?.gravida ?? 0}&nbsp;
                            P{g.obstetric?.para ?? 0}&nbsp;
                            L{g.obstetric?.living ?? 0}&nbsp;
                            A{g.obstetric?.abortions ?? 0}
                        </span>
                    </div>
                )}
            </div>

            {/* ── C. PREGNANCY DETAILS (conditional) ──────────────────────── */}
            {g.pregnant === 'Yes' && (
                <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm ring-1 ring-rose-100">
                    <div className="flex items-center gap-2 mb-4 text-rose-700">
                        <Calendar size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Pregnancy Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Gestational Age (weeks)
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={42}
                                value={g.gestationalAge || ''}
                                onChange={(e) => updateGyn('gestationalAge', e.target.value)}
                                placeholder="e.g. 24"
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all ${!g.gestationalAge ? 'border-rose-300' : 'border-slate-200'}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                EDD (Expected Date of Delivery)
                            </label>
                            <input
                                type="date"
                                value={g.edd || ''}
                                onChange={(e) => updateGyn('edd', e.target.value)}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all ${!g.edd ? 'border-rose-300' : 'border-slate-200'}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── D. CURRENT SYMPTOMS ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <ClipboardList size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Current Symptoms</h3>
                    <span className="ml-auto text-[9px] font-bold text-slate-400">Select all that apply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        'Abdominal Pain', 'Bleeding PV', 'White Discharge',
                        'Missed Periods', 'Nausea/Vomiting', 'Swelling', 'Decreased Fetal Movement'
                    ].map(sym => {
                        const active = (g.symptoms || []).includes(sym);
                        const isDanger = ['Bleeding PV', 'Decreased Fetal Movement'].includes(sym);
                        return (
                            <button key={sym} type="button"
                                onClick={() => toggleSymptom(sym)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    active
                                        ? isDanger
                                            ? 'bg-red-600 text-white border-red-600 shadow-md'
                                            : 'bg-pink-600 text-white border-pink-600 shadow-md'
                                        : isDanger
                                            ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            >{sym}</button>
                        );
                    })}
                </div>
            </div>

            {/* ── E. VITALS ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <Activity size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Vitals</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'bp', label: 'Blood Pressure', placeholder: '120/80', type: 'text',
                          hint: g.vitals?.bp && parseBP(g.vitals.bp)
                            ? (parseBP(g.vitals.bp)!.sys > 160 ? '🚨 Severe' : parseBP(g.vitals.bp)!.sys > 140 ? '⚠️ High' : '✓ Normal')
                            : '' },
                        { key: 'pulse', label: 'Pulse (bpm)', placeholder: '80', type: 'number', hint: '' },
                        { key: 'weight', label: 'Weight (kg)', placeholder: '60', type: 'number', hint: '' },
                        { key: 'temperature', label: 'Temp (°F)', placeholder: '98.6', type: 'number', hint: '' },
                    ].map(({ key, label, placeholder, type, hint }) => (
                        <div key={key} className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                            <input
                                type={type}
                                value={(g.vitals?.[key]) ?? ''}
                                onChange={(e) => updateVitals(key, e.target.value)}
                                placeholder={placeholder}
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                    key === 'bp' && g.vitals?.bp && parseBP(g.vitals.bp)?.sys! > 140 ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                                }`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── F. OBSTETRIC EXAMINATION (if pregnant) ──────────────────── */}
            {g.pregnant === 'Yes' && (
                <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-purple-700">
                        <Thermometer size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Obstetric Examination</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Uterine Size */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Uterine Size (weeks)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={45}
                                value={g.obstetricExam?.uterineSize || ''}
                                onChange={(e) => updateObstetricExam('uterineSize', e.target.value)}
                                placeholder="e.g. 24"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>

                        {/* Fetal Position */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fetal Position</label>
                            <div className="flex flex-col gap-1.5">
                                {['Cephalic', 'Breech', 'Transverse'].map(pos => (
                                    <button key={pos} type="button"
                                        onClick={() => updateObstetricExam('fetalPosition', pos)}
                                        className={btnBase(g.obstetricExam?.fetalPosition === pos, 'purple')}
                                    >{pos}</button>
                                ))}
                            </div>
                        </div>

                        {/* FHR */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Fetal Heart Rate (bpm)
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={200}
                                value={g.obstetricExam?.fetalHeartRate || ''}
                                onChange={(e) => updateObstetricExam('fetalHeartRate', e.target.value)}
                                placeholder="110–160 BPM"
                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 outline-none transition-all ${
                                    g.obstetricExam?.fetalHeartRate &&
                                    (parseInt(g.obstetricExam.fetalHeartRate) < 110 || parseInt(g.obstetricExam.fetalHeartRate) > 160)
                                        ? 'border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                                        : 'border-slate-200 focus:ring-purple-500/20 focus:border-purple-500'
                                }`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── G. GYNECOLOGY EXAMINATION ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-rose-700">
                    <FlaskConical size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Gynecology Examination</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Cervix */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cervix</label>
                        <div className="flex flex-col gap-1.5">
                            {['Normal', 'Inflamed', 'Erosion'].map(c => (
                                <button key={c} type="button"
                                    onClick={() => updateGynExam('cervix', c)}
                                    className={btnBase(g.gynExam?.cervix === c)}
                                >{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* Discharge */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Discharge</label>
                        <div className="flex flex-col gap-1.5">
                            {['None', 'White', 'Foul smelling'].map(d => (
                                <button key={d} type="button"
                                    onClick={() => updateGynExam('discharge', d)}
                                    className={`${btnBase(g.gynExam?.discharge === d, d === 'Foul smelling' && g.gynExam?.discharge === d ? 'red' : 'pink')}`}
                                >{d}</button>
                            ))}
                        </div>
                    </div>

                    {/* Tenderness */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tenderness</label>
                        <div className="flex gap-2">
                            {['Yes', 'No'].map(t => (
                                <button key={t} type="button"
                                    onClick={() => updateGynExam('tenderness', t)}
                                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                        g.gynExam?.tenderness === t
                                            ? t === 'Yes' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >{t}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── H. INVESTIGATIONS ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-indigo-700">
                    <FlaskConical size={17} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Investigations Required</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['USG', 'Hb%', 'Urine', 'Thyroid', 'OGTT'].map(inv => (
                        <button key={inv} type="button"
                            onClick={() => toggleInvestigation(inv)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                (g.investigations || []).includes(inv)
                                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600'
                                    : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'
                            }`}
                        >{inv}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};
