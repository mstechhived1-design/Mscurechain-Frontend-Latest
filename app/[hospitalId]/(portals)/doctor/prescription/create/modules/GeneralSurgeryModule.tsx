'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info, Zap,
    ClipboardList, Stethoscope, Scissors, FlaskConical,
    ThumbsUp, Waves
} from 'lucide-react';

interface GeneralSurgeryModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

const SYMPTOMS = [
    'Abdominal Pain', 'Mass / Swelling', 'Hernia Projection',
    'Nausea', 'Vomiting', 'Constipation', 'Rectal Bleeding',
    'Post-operative Pain', 'Fever', 'Surgical Site Discharge'
];

const TENDERNESS_OPTS = ['None', 'Epigastric', 'RUQ', 'RLQ', 'LLQ', 'Diffuse'];
const HERNIA_TYPES     = ['Reducible', 'Irreducible', 'Obstructed', 'Strangulated', 'N/A'];
const SURGICAL_PLANS   = ['Conservative', 'Surgical', 'Emergency Surgery'];

export const GeneralSurgeryModule: React.FC<GeneralSurgeryModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    if (!formData.generalSurgeryData) return null;
    const s = formData.generalSurgeryData;

    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, generalSurgeryData: { ...prev.generalSurgeryData, [field]: value } }));

    const updateAbdomen = (field: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            generalSurgeryData: {
                ...prev.generalSurgeryData,
                abdomen: { ...prev.generalSurgeryData.abdomen, [field]: value }
            }
        }));

    const updateHernia = (field: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            generalSurgeryData: {
                ...prev.generalSurgeryData,
                hernia: { ...prev.generalSurgeryData.hernia, [field]: value }
            }
        }));

    const updateSurgicalSite = (field: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            generalSurgeryData: {
                ...prev.generalSurgeryData,
                surgicalSite: { ...prev.generalSurgeryData.surgicalSite, [field]: value }
            }
        }));

    const toggleSymptom = (sym: string) => {
        const curr = s.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((i: string) => i !== sym) : [...curr, sym]);
    };

    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const syms = s.symptoms || [];

        if (s.abdomen?.guarding === 'Rigidity') {
            newAlerts.push({ type: 'emergency', message: '🚨 BOARD-LIKE RIGIDITY — Peritonitis / Perforation suspected. Immediate surgical consultation required.' });
        }
        if (s.hernia?.type === 'Strangulated' || s.hernia?.type === 'Obstructed') {
            newAlerts.push({ type: 'emergency', message: `🚨 ${s.hernia.type.toUpperCase()} HERNIA — Surgical emergency. Risk of bowel ischemia.` });
        }
        if (syms.includes('Abdominal Pain') && s.abdomen?.tenderness === 'RLQ' && s.abdomen?.guarding === 'Guarding') {
            newAlerts.push({ type: 'warning', message: '⚠️ RLQ Tenderness + Guarding — Classic Appendicitis signs. McBurney\'s point positive?' });
        }
        if (s.surgicalSite?.infection || s.surgicalSite?.dressing === 'Soaked') {
            newAlerts.push({ type: 'error', message: '❗ SURGICAL SITE CONCERN — Signs of infection or excessive discharge detected.' });
        }
        if (s.abdomen?.bowelSounds === 'Absent') {
            newAlerts.push({ type: 'emergency', message: '🚨 ABSENT BOWEL SOUNDS — Rule out paralytic ileus or mechanical obstruction.' });
        }

        setAlerts(newAlerts);
    }, [s.abdomen, s.hernia, s.symptoms, s.surgicalSite]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                        <Scissors size={20} className="text-cyan-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-cyan-700">General Surgery Assessment</h2>
                        <p className="text-[9px] font-bold text-cyan-600/60 uppercase tracking-widest">Surgical Evaluation & Management</p>
                    </div>
                </div>
                <div className="bg-white border border-cyan-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-cyan-600">
                    Active Module: Surgery
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${
                            a.type === 'emergency' ? 'bg-red-50 border-red-600 text-red-900' :
                            a.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-800' :
                            'bg-amber-50 border-amber-500 text-amber-800'
                        }`}>
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black uppercase tracking-tight">{a.message}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Symptoms */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <ClipboardList size={17} className="text-slate-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Presenting Complaints</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map(sym => (
                        <button key={sym} type="button"
                            onClick={() => toggleSymptom(sym)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                s.symptoms?.includes(sym) ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                        >{sym}</button>
                    ))}
                </div>
            </div>

            {/* Abdominal Exam */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Stethoscope size={17} className="text-slate-600" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Physical Findings (Abdomen)</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Tenderness Location</label>
                            <div className="flex flex-wrap gap-1.5">
                                {TENDERNESS_OPTS.map(t => (
                                    <button key={t} type="button"
                                        onClick={() => updateAbdomen('tenderness', t)}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black border transition-all ${s.abdomen?.tenderness === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Guarding / Rigidity</label>
                            <div className="flex gap-2">
                                {['None', 'Guarding', 'Rigidity'].map(g => (
                                    <button key={g} type="button"
                                        onClick={() => updateAbdomen('guarding', g)}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${s.abdomen?.guarding === g ? (g === 'Rigidity' ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500') : 'bg-slate-50 text-slate-500'}`}
                                    >{g}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Bowel Sounds</label>
                            <div className="flex gap-2">
                                {['Normal', 'Hyperactive', 'Absent'].map(bs => (
                                    <button key={bs} type="button"
                                        onClick={() => updateAbdomen('bowelSounds', bs)}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${s.abdomen?.bowelSounds === bs ? (bs === 'Absent' ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-500 text-white border-emerald-500') : 'bg-slate-50 text-slate-500'}`}
                                    >{bs}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hernia Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={17} className="text-slate-600" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Hernia Profile</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black uppercase text-slate-500">Hernia Present?</span>
                            <button type="button"
                                onClick={() => updateHernia('present', !s.hernia?.present)}
                                className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${s.hernia?.present ? 'bg-red-600 text-white' : 'bg-slate-300 text-white'}`}
                            >{s.hernia?.present ? 'YES' : 'NO'}</button>
                        </div>
                        {s.hernia?.present && (
                            <>
                                <input type="text" placeholder="Hernia Site (e.g. Inguinal Left)"
                                    value={s.hernia?.site || ''}
                                    onChange={e => updateHernia('site', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-500/20"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {HERNIA_TYPES.filter(t => t !== 'N/A').map(t => (
                                        <button key={t} type="button"
                                            onClick={() => updateHernia('type', t)}
                                            className={`py-1.5 rounded-lg text-[9px] font-black border transition-all ${s.hernia?.type === t ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >{t}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Surgical Site & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FlaskConical size={17} className="text-slate-600" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Post-operative Status</h3>
                    </div>
                    <div className="space-y-3">
                         <div className="flex gap-2">
                            {['Clean', 'Soaked', 'N/A'].map(d => (
                                <button key={d} type="button"
                                    onClick={() => updateSurgicalSite('dressing', d)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${s.surgicalSite?.dressing === d ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                >Dressing: {d}</button>
                            ))}
                         </div>
                         <button type="button"
                            onClick={() => updateSurgicalSite('infection', !s.surgicalSite?.infection)}
                            className={`w-full py-2 rounded-xl text-[10px] font-black border transition-all ${s.surgicalSite?.infection ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200'}`}
                         >{s.surgicalSite?.infection ? '⚠️ INFECTION SUSPECTED' : '✓ NO CLINICAL INFECTION'}</button>
                    </div>
                </div>

                <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-cyan-700">
                        <Zap size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Surgical Management Plan</h3>
                    </div>
                    <div className="space-y-3">
                        {SURGICAL_PLANS.map(p => (
                            <button key={p} type="button"
                                onClick={() => update('plan', p)}
                                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    s.plan === p ? (p === 'Emergency Surgery' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-cyan-600 text-white border-cyan-600 shadow-md') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                }`}
                            >{p}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Diagnosis / Clinical Impression</label>
                <textarea
                    value={s.diagnosis || ''}
                    onChange={e => update('diagnosis', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-500/20"
                    placeholder="e.g. Acute Appendicitis, Inguinal Hernia, etc."
                />
            </div>
        </div>
    );
};
