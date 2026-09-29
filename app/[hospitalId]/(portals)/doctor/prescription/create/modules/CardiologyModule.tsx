'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Heart, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CardiologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const CardiologyModule: React.FC<CardiologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.cardiologyData) return null;

    const data = formData.cardiologyData;
    const sys = parseInt(data.bpSystolic || '0');
    const dia = parseInt(data.bpDiastolic || '0');
    const hr = parseInt(data.heartRate || '0');

    const updateField = (field: string, value: any) => {
        setFormData((p: any) => ({
            ...p,
            cardiologyData: { ...p.cardiologyData!, [field]: value }
        }));
    };

    const toggleArrayField = (field: string, value: string) => {
        const current = data[field] || [];
        const next = current.includes(value)
            ? current.filter((v: string) => v !== value)
            : [...current, value];
        updateField(field, next);
    };

    return (
        <div className="space-y-6">
            {/* Standardized Light Header */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                        <Activity size={20} className={`text-rose-600 ${hr > 100 || sys > 160 ? 'animate-bounce' : 'animate-pulse'}`} />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-rose-700">Cardiology Assessment</h2>
                        <p className="text-[9px] font-bold text-rose-600/60 uppercase tracking-widest">Structured Cardiac Examination Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">

                    <div className="bg-white border border-rose-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-rose-600">
                        Cardio - Module
                    </div>
                </div>
            </div>

            {/* VITAL MONITORING BOX - Moved outside shared background to keep header clean */}
            <div className="bg-white border-slate-100 border-2 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-1.5 h-6 bg-[#f01d41] rounded-full"></div>
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Cardiac Vital Monitoring</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* BP */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">Blood Pressure (mmHg)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                placeholder="Sys"
                                value={data.bpSystolic}
                                onChange={(e) => updateField('bpSystolic', e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xl font-black text-slate-700 placeholder:text-slate-300 focus:border-rose-500 focus:bg-white outline-none transition-all text-center"
                            />
                            <span className="text-2xl font-black text-slate-200">/</span>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                placeholder="Dia"
                                value={data.bpDiastolic}
                                onChange={(e) => updateField('bpDiastolic', e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xl font-black text-slate-700 placeholder:text-slate-300 focus:border-rose-500 focus:bg-white outline-none transition-all text-center"
                            />
                        </div>

                    </div>

                    {/* HR & Rhythm */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">Heart Rate & Rhythm</label>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative flex-1">
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    placeholder="72"
                                    value={data.heartRate}
                                    onChange={(e) => updateField('heartRate', e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-xl font-black text-slate-700 placeholder:text-slate-300 focus:border-rose-500 focus:bg-white outline-none transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Heart className={hr > 0 ? 'animate-pulse text-rose-500' : 'text-slate-200'} size={20} fill={hr > 0 ? 'currentColor' : 'none'} />
                                </div>
                            </div>
                        </div>
                        <select 
                            value={data.rhythm}
                            onChange={(e) => updateField('rhythm', e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-xl p-3 text-[10px] font-black text-slate-600 uppercase outline-none cursor-pointer focus:ring-2 focus:ring-rose-500/20"
                        >
                            <option value="">-- Select Rhythm --</option>
                            {["Regular", "Irregular", "Atrial Fibrillation", "Bradycardia", "Tachycardia"].map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Risk Level */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400 text-center">Protocol Risk Assessment</label>
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border-2 border-slate-100">
                            {['Low', 'Moderate', 'High'].map((risk) => (
                                <button
                                    key={risk}
                                    type="button"
                                    onClick={() => updateField('riskLevel', risk)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${data.riskLevel === risk
                                            ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {risk}
                                </button>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* B. Symptoms & C. Risk Factors */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-rose-500" /> NYHA Functional Class
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">NYHA Classification</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {["I", "II", "III", "IV"].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => updateField('nyhaClass', c)}
                                            className={`py-2 rounded-lg text-[10px] font-black border transition-all ${data.nyhaClass === c
                                                ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Patient Risk Profile</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {["Hypertension", "Diabetes", "Smoking", "Alcohol", "Family History"].map(r => (
                                <div 
                                    key={r}
                                    onClick={() => toggleArrayField('riskFactors', r)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${data.riskFactors?.includes(r)
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                                        : 'bg-slate-50 text-slate-500 border-slate-100 ring-1 ring-slate-100 hover:border-rose-200'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold uppercase">{r}</span>
                                    {data.riskFactors?.includes(r) ? <CheckCircle2 size={14} className="text-white" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* D. ECG Findings & E. Heart Sounds */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-blue-500" /> ECG Evaluation
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Wave Analysis</label>
                                <select 
                                    value={data.ecgType}
                                    onChange={(e) => updateField('ecgType', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-[11px] font-bold outline-none ring-1 ring-slate-200 focus:ring-blue-500"
                                >
                                    <option value="">Normal</option>
                                    {["ST Elevation", "ST Depression", "T Wave Inversion", "Arrhythmia"].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Leads Involved</label>
                                <div className="flex flex-wrap gap-1">
                                    {["V1–V6", "II, III, aVF", "I, aVL"].map(l => (
                                        <button
                                            key={l}
                                            type="button"
                                            onClick={() => toggleArrayField('ecgLeads', l)}
                                            className={`px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${data.ecgLeads?.includes(l)
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <textarea
                            value={data.ecgNotes}
                            onChange={(e) => updateField('ecgNotes', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-300 shadow-inner"
                            placeholder="Optional ECG notes..."
                            rows={2}
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Heart size={14} className="text-rose-400" /> Physical Findings
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">S1 Sound</label>
                                <select 
                                    value={data.s1}
                                    onChange={(e) => updateField('s1', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-bold outline-none ring-1 ring-slate-200"
                                >
                                    {["Normal", "Loud", "Soft"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">S2 Sound</label>
                                <select 
                                    value={data.s2}
                                    onChange={(e) => updateField('s2', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-bold outline-none ring-1 ring-slate-200"
                                >
                                    {["Normal", "Loud", "Soft"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Murmur</label>
                                <select 
                                    value={data.murmur}
                                    onChange={(e) => updateField('murmur', e.target.value)}
                                    className={`w-full border-none rounded-xl p-3 text-[10px] font-black outline-none ring-1 ${data.murmur === 'Present' ? 'bg-amber-50 ring-amber-200 text-amber-700' : 'bg-slate-50 ring-slate-200 text-slate-700'}`}
                                >
                                    <option value="None">None</option>
                                    <option value="Present">Present</option>
                                </select>
                            </div>
                        </div>
                        {data.murmur === 'Present' && (
                            <div className="flex gap-4 p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                                <span className="text-[9px] font-black text-amber-600 uppercase">Murmur Type:</span>
                                <div className="flex gap-4">
                                    {["Systolic", "Diastolic"].map(mt => (
                                        <label key={mt} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="murmurType" 
                                                checked={data.murmurType === mt}
                                                onChange={() => updateField('murmurType', mt)}
                                                className="w-3 h-3 accent-amber-600"
                                            />
                                            <span className="text-[10px] font-bold text-amber-800">{mt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                         <textarea
                            value={data.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold outline-none resize-none shadow-inner"
                            placeholder="General cardiac notes..."
                            rows={2}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
