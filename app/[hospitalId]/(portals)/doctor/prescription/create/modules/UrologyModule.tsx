'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info, Zap,
    Droplets, FlaskConical, Heart, Wind, Brain,
    ThumbsUp, Beaker, ClipboardList, Ruler, Search
} from 'lucide-react';

interface UrologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_SYMPTOMS = ['Frequency', 'Urgency', 'Nocturia'] as const;
const VOIDING_SYMPTOMS = ['Weak Stream', 'Hesitancy', 'Straining', 'Incomplete Emptying'] as const;
const OTHER_SYMPTOMS   = ['Dysuria', 'Hematuria', 'Flank Pain'] as const;

const PROSTATE_SIZES   = ['Normal', 'Grade I', 'Grade II', 'Grade III', 'Enlarged'] as const;
const CONSISTENCY_OPTS = ['Fibroadenomatous', 'Firm', 'Hard'] as const;
const PROTEIN_OPTIONS  = ['Nil', 'Trace', '1+', '2+', '3+'] as const;
const BINARY_OPTIONS   = ['Nil', 'Present'] as const;
const STONE_LOCATIONS  = ['None', 'Kidney', 'Ureter', 'Bladder'] as const;

const getIPSSCategory = (score: number) => {
    if (score <= 7) return 'Mild';
    if (score <= 19) return 'Moderate';
    return 'Severe';
};

const IPSS_COLORS: Record<string, string> = {
    'Mild': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'Moderate': 'text-amber-600 bg-amber-50 border-amber-200',
    'Severe': 'text-red-700 bg-red-50 border-red-300',
};

export const UrologyModule: React.FC<UrologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.urologyData) return null;
    const u = formData.urologyData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, urologyData: { ...prev.urologyData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, urologyData: {
                ...prev.urologyData,
                [key]: { ...prev.urologyData?.[key], [sub]: value },
            },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = u.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };



    const btnPill = (active: boolean, danger = false, warn = false) =>
        `px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
            active
                ? danger ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : warn  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : danger ? 'bg-red-50 text-red-400 border-red-200 hover:bg-red-100'
                  : warn  ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`;

    const sectionCard = (children: React.ReactNode, borderColor = 'border-slate-200') =>
        <div className={`bg-white rounded-2xl border ${borderColor} p-5 shadow-sm`}>{children}</div>;

    const sectionHeader = (icon: React.ReactNode, title: string, required = false, note?: string) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="text-sky-700">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {note && !required && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );

    const ipssCat = getIPSSCategory(parseInt(u.ipss?.score) || 0);

    return (
        <div className="space-y-4">


            {/* Header */}
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-sky-600" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-sky-700">Urology Assessment</h2>
                        <p className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest">LUTS, BPH & Renal Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border ${IPSS_COLORS[ipssCat]}`}>
                        IPSS: {u.ipss?.score || 0} ({ipssCat})
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── A. SYMPTOMS ────────────────────────── */}
                {sectionCard(
                    <>
                        {sectionHeader(<ClipboardList size={17} />, 'A. Urological Symptoms (LUTS)')}
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Storage Symptoms</p>
                                <div className="flex flex-wrap gap-2">
                                    {STORAGE_SYMPTOMS.map(sym => (
                                        <button key={sym} type="button" onClick={() => toggleSymptom(sym)}
                                            className={btnPill(u.symptoms?.includes(sym))}>{sym}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Voiding Symptoms</p>
                                <div className="flex flex-wrap gap-2">
                                    {VOIDING_SYMPTOMS.map(sym => (
                                        <button key={sym} type="button" onClick={() => toggleSymptom(sym)}
                                            className={btnPill(u.symptoms?.includes(sym))}>{sym}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-rose-400 uppercase mb-2 tracking-widest">Red Flags / Others</p>
                                <div className="flex flex-wrap gap-2">
                                    {OTHER_SYMPTOMS.map(sym => (
                                        <button key={sym} type="button" onClick={() => toggleSymptom(sym)}
                                            className={btnPill(u.symptoms?.includes(sym), sym === 'Hematuria')}>{sym}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── B. SCORE & RENAL ────────────────────────── */}
                <div className="space-y-4">
                    {sectionCard(
                        <>
                            {sectionHeader(<Zap size={17} />, 'B. IPSS & Renal Function')}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                    <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500 text-left">IPSS Score</label>
                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.ipss?.score || ''} onChange={e => updateNested('ipss', 'score', e.target.value)}
                                        className="w-full bg-transparent text-xl font-black text-center outline-none" placeholder="0-35" />
                                </div>
                                <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 text-center">
                                    <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-sky-600 text-left">Creatinine</label>
                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1" value={u.renal?.creatinine || ''} onChange={e => updateNested('renal', 'creatinine', e.target.value)}
                                        className="w-full bg-transparent text-xl font-black text-center outline-none text-sky-800" placeholder="mg/dL" />
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                    <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500 text-left">Urea</label>
                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.renal?.urea || ''} onChange={e => updateNested('renal', 'urea', e.target.value)}
                                        className="w-full bg-transparent text-xl font-black text-center outline-none" placeholder="mg/dL" />
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                    <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500 text-left">PVR Volume</label>
                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.pvr || ''} onChange={e => update('pvr', e.target.value)}
                                        className="w-full bg-transparent text-xl font-black text-center outline-none" placeholder="ml" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── C. URINE ANALYSIS ────────────────────────── */}
                {sectionCard(
                    <>
                        {sectionHeader(<FlaskConical size={17} />, 'C. Urine Analysis (Microscopy)')}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Pus Cells (/hpf)</label>
                                <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.urine?.pusCells || ''} onChange={e => updateNested('urine', 'pusCells', e.target.value)}
                                    className="w-full bg-transparent text-lg font-black outline-none" placeholder="0" />
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-red-400">RBC (/hpf)</label>
                                <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.urine?.rbc || ''} onChange={e => updateNested('urine', 'rbc', e.target.value)}
                                    className="w-full bg-transparent text-lg font-black text-red-600 outline-none" placeholder="0" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Protein</label>
                                <div className="flex flex-wrap gap-1">
                                    {PROTEIN_OPTIONS.map(opt => (
                                        <button key={opt} type="button" onClick={() => updateNested('urine', 'protein', opt)}
                                            className={btnPill(u.urine?.protein === opt, opt === '2+' || opt === '3+')}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 text-right">
                                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Nitrites</label>
                                <div className="flex justify-end gap-1">
                                    {BINARY_OPTIONS.map(opt => (
                                        <button key={opt} type="button" onClick={() => updateNested('urine', 'nitrite', opt === 'Present')}
                                            className={btnPill(u.urine?.nitrite === (opt === 'Present'), opt === 'Present')}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── D. PROSTATE ────────────────────────── */}
                {sectionCard(
                    <>
                        {sectionHeader(<Search size={17} />, 'D. Prostate Findings (DRE/Imaging)')}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Size / Grade</label>
                                <div className="flex flex-wrap gap-1">
                                    {PROSTATE_SIZES.map(opt => (
                                        <button key={opt} type="button" onClick={() => updateNested('prostate', 'size', opt)}
                                            className={btnPill(u.prostate?.size === opt, opt === 'Enlarged')}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Consistency</label>
                                    <div className="flex flex-wrap gap-1">
                                        {CONSISTENCY_OPTS.map(opt => (
                                            <button key={opt} type="button" onClick={() => updateNested('prostate', 'consistency', opt)}
                                                className={btnPill(u.prostate?.consistency === opt, opt === 'Hard')}>{opt}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Nodules</label>
                                    <div className="flex gap-1">
                                        {BINARY_OPTIONS.map(opt => (
                                            <button key={opt} type="button" onClick={() => updateNested('prostate', 'nodules', opt === 'Present')}
                                                className={btnPill(u.prostate?.nodules === (opt === 'Present'), opt === 'Present')}>{opt}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── E. CALCULUS & CATHETER ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sectionCard(
                    <>
                        {sectionHeader(<Ruler size={17} />, 'E. Calculus (Stone) Details')}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Size (mm)</label>
                                <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={u.stone?.size || ''} onChange={e => updateNested('stone', 'size', e.target.value)}
                                    className="w-full bg-transparent text-lg font-black outline-none" placeholder="0" />
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <label className="block text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Location</label>
                                <select value={u.stone?.location || ''} onChange={e => updateNested('stone', 'location', e.target.value)}
                                    className="w-full bg-transparent text-sm font-bold outline-none border-none">
                                    {STONE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {sectionCard(
                    <>
                        {sectionHeader(<Droplets size={17} />, 'F. Catheter Status')}
                        <div className="flex gap-4 items-center mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={u.catheter?.present || false} onChange={e => updateNested('catheter', 'present', e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Catheter In-situ</span>
                            </label>
                        </div>
                        {u.catheter?.present && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input type="text" value={u.catheter?.type || ''} onChange={e => updateNested('catheter', 'type', e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none" placeholder="Type (e.g. 16Fr Foley)" />
                                <input type="text" value={u.catheter?.duration || ''} onChange={e => updateNested('catheter', 'duration', e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none" placeholder="Duration" />
                                <input type="text" value={u.catheter?.reason || ''} onChange={e => updateNested('catheter', 'reason', e.target.value)}
                                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none" placeholder="Reason" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Final Diagnosis ────────────────────────────────────────── */}
            {sectionCard(
                <>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Clinical Impression / Diagnosis</label>
                    <input type="text" value={u.diagnosis || ''} onChange={e => update('diagnosis', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-sky-800"
                        placeholder="e.g. BPH with Acute Urinary Retention" />
                    <textarea value={u.notes || ''} onChange={e => update('notes', e.target.value)} rows={2}
                        className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none outline-none"
                        placeholder="Additional clinical notes..." />
                </>,
                'border-sky-200'
            )}
        </div>
    );
};
