'use client';

import React, { useEffect } from 'react';
import { getBMICategory, bmiColorClass, bmiAccentClass } from '@/lib/clinical/bmiUtils';
import { 
    Activity, 
    Droplet, 
    Zap, 
    Scale, 
    Baby, 
    AlertCircle,
    TestTube,
    Pill
} from 'lucide-react';

export const EndocrinologyModule = ({ formData, setFormData }: any) => {
    const e = formData.endocrinologyData || {};

    const updateData = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            endocrinologyData: {
                ...(prev.endocrinologyData || {}),
                [field]: value
            }
        }));
    };

    const updateNested = (parent: string, field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            endocrinologyData: {
                ...(prev.endocrinologyData || {}),
                [parent]: {
                    ...(prev.endocrinologyData?.[parent] || {}),
                    [field]: value
                }
            }
        }));
    };

    // Auto-calculate BMI — clears if either field is empty
    useEffect(() => {
        const weight = parseFloat(e.weight || '0');
        const height = parseFloat(e.height || '0') / 100;
        if (weight > 0 && height > 0) {
            const bmi = (weight / (height * height)).toFixed(1);
            if (e.bmi !== bmi) updateData('bmi', bmi);
        } else {
            // Clear BMI when inputs are empty
            if (e.bmi) updateData('bmi', '');
        }
    }, [e.weight, e.height]);

    const symptomsList = [
        'Polyuria', 'Polydipsia', 'Weight loss', 'Fatigue', 
        'Hair loss', 'Cold intolerance', 'Heat intolerance', 'Neck swelling'
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Standardized Light Header */}
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                        <Droplet size={20} className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-teal-700">Endocrinology (Diabetes Care Included)</h2>
                        <p className="text-[9px] font-bold text-teal-600/60 uppercase tracking-widest">Hormonal, Metabolic & Glycemic Status Profile</p>
                    </div>
                </div>
                <div className="bg-white border border-teal-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-teal-600">
                    Endo - Module
                </div>
            </div>
            {/* 1. Glycemic & Thyroid Profiles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Glycemic Profile */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Droplet size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
                            <Droplet size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Glycemic Profile</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">FBS (mg/dL)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={e.glycemic?.fbs || ''}
                                onChange={(e) => updateNested('glycemic', 'fbs', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">PPBS (mg/dL)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={e.glycemic?.ppbs || ''}
                                onChange={(e) => updateNested('glycemic', 'ppbs', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">HbA1c (%)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1"
                                value={e.glycemic?.hba1c || ''}
                                onChange={(e) => updateNested('glycemic', 'hba1c', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Thyroid Profile */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Zap size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Thyroid Panel</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">TSH (mIU/L)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.01"
                                value={e.thyroid?.tsh || ''}
                                onChange={(e) => updateNested('thyroid', 'tsh', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">FT3</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1"
                                value={e.thyroid?.t3 || ''}
                                onChange={(e) => updateNested('thyroid', 't3', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">FT4</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1"
                                value={e.thyroid?.t4 || ''}
                                onChange={(e) => updateNested('thyroid', 't4', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1.5 Advanced Diabetes Assessment (Consolidated from Diabetology) */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
                        <Activity size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Diabetes & Chronic Stewardship</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Foot Exam & Symptoms */}
                    <div className="space-y-6">
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Foot Examination (Neuropathy Screening)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Monofilament Sensation</label>
                                    <select
                                        value={e.diabetes?.footExam?.sensation || ''}
                                        onChange={(evt) => updateNested('diabetes', 'footExam', { ...(e.diabetes?.footExam || {}), sensation: evt.target.value })}
                                        className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Normal">Normal</option>
                                        <option value="Reduced">Reduced</option>
                                        <option value="Absent">Absent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Foot Ulcers</label>
                                    <select
                                        value={e.diabetes?.footExam?.ulcer || ''}
                                        onChange={(evt) => updateNested('diabetes', 'footExam', { ...(e.diabetes?.footExam || {}), ulcer: evt.target.value })}
                                        className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Present">Present (Active)</option>
                                        <option value="Healed">Healed / Scar</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-rose-50/30 rounded-2xl p-4 border border-rose-100/50">
                            <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertCircle size={14} /> Hypoglycemia Awareness
                            </h4>
                            <div className="flex gap-2">
                                {['None', 'Mild', 'Severe'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => updateNested('diabetes', 'hypoglycemia', lvl)}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                            e.diabetes?.hypoglycemia === lvl
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'bg-white text-rose-600 border border-rose-100 hover:bg-rose-50'
                                        }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Treatment & Complications */}
                    <div className="space-y-6">
                         <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Treatment Intensity</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="col-span-2">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Primary Med Type</label>
                                    <div className="flex gap-2">
                                        {['Oral', 'Insulin', 'Both'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => updateNested('diabetes', 'treatment', { ...(e.diabetes?.treatment || {}), type: t })}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                    e.diabetes?.treatment?.type === t
                                                        ? 'bg-teal-600 text-white shadow-md'
                                                        : 'bg-white text-slate-600 border border-slate-100'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {e.diabetes?.treatment?.type && e.diabetes?.treatment?.type !== 'Oral' && (
                                    <>
                                        <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Insulin Protocol</label>
                                            <select
                                                value={e.diabetes?.treatment?.insulinType || ''}
                                                onChange={(evt) => updateNested('diabetes', 'treatment', { ...(e.diabetes?.treatment || {}), insulinType: evt.target.value })}
                                                className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold"
                                            >
                                                <option value="">Select Type</option>
                                                <option value="Basal">Basal Only</option>
                                                <option value="Bolus">Bolus (Prandial)</option>
                                                <option value="Mixed">Premixed</option>
                                                <option value="Basal-Bolus">Basal-Bolus</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Total Daily Dose</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 20U"
                                                value={e.diabetes?.treatment?.dose || ''}
                                                onChange={(evt) => updateNested('diabetes', 'treatment', { ...(e.diabetes?.treatment || {}), dose: evt.target.value })}
                                                className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chronic Complications</h4>
                            <div className="flex flex-wrap gap-2">
                                {['Retinopathy', 'Nephropathy', 'Neuropathy', 'CAD', 'Stroke', 'PVD'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => {
                                            const current = e.diabetes?.complications || [];
                                            const next = current.includes(c) ? current.filter((x:any)=>x!==c) : [...current, c];
                                            updateNested('diabetes', 'complications', next);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                            e.diabetes?.complications?.includes(c)
                                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Body Metrics & PCOS Screening */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    {/* Header row: icon + title + BMI card side-by-side */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
                                <Scale size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Metabolic Parameters</h3>
                        </div>
                        {/* ── Clinical BMI Card (inline with title) ── */}
                        {(() => {
                            const bmiNum = parseFloat(e.bmi || '0');
                            const hasValue = bmiNum > 0;
                            const bmiData = hasValue ? getBMICategory(bmiNum, 'asian') : null;
                            return (
                                <div className={`rounded-2xl px-4 py-2 flex flex-col items-center justify-center shadow-md border min-w-[100px] ${
                                    bmiData
                                        ? `${bmiAccentClass[bmiData.severity]} bg-white`
                                        : 'bg-blue-50 border-blue-200'
                                }`}>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${
                                        bmiData ? 'text-slate-400' : 'text-blue-400'
                                    }`}>BMI</span>
                                    <span className={`text-base font-black leading-none mt-0.5 ${
                                        bmiData ? bmiColorClass[bmiData.color] : 'text-blue-600'
                                    }`}>{e.bmi || '--'}</span>
                                    {bmiData && (
                                        <>
                                            <span className={`text-[8px] font-black mt-0.5 ${bmiColorClass[bmiData.color]}`}>
                                                {bmiData.label} {bmiData.emoji}
                                            </span>
                                            <span className="text-[6px] font-bold text-slate-400 text-center leading-tight mt-0.5 max-w-[130px]">
                                                {bmiData.message}
                                            </span>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    {/* Inputs only – 2 columns now that BMI card is in header */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Height (cm)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={e.height || ''}
                                onChange={(e) => updateData('height', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-border-theme rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Weight (kg)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={e.weight || ''}
                                onChange={(e) => updateData('weight', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border-border-theme rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-fuchsia-50 p-2.5 rounded-2xl text-fuchsia-600">
                            <Baby size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">PCOS / Menstrual Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         {['irregularCycles', 'hirsutism', 'acne', 'infertility'].map(p => (
                            <label key={p} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-fuchsia-50/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={e.pcos?.[p] || false}
                                    onChange={(evt) => updateNested('pcos', p, evt.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                                />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                    {p.replace(/([A-Z])/g, ' $1')}
                                </span>
                            </label>
                         ))}
                    </div>
                </div>
            </div>

            {/* 3. Symptoms & Complications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <Activity size={14} /> Endocrine Symptoms
                     </h4>
                     <div className="flex flex-wrap gap-2">
                        {symptomsList.map(s => (
                            <button
                                key={s}
                                onClick={() => {
                                    const current = e.symptoms || [];
                                    const next = current.includes(s) ? current.filter((x:any)=>x!==s) : [...current, s];
                                    updateData('symptoms', next);
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                                    e.symptoms?.includes(s)
                                    ? 'bg-teal-600 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
                     <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-4">Medication Protocol</h4>
                     <div className="space-y-2">
                        {['Oral hypoglycemics', 'Insulin', 'Thyroxine', 'Anti-thyroid drugs'].map(m => (
                            <label key={m} className="flex items-center gap-3 p-2.5 bg-white rounded-xl cursor-pointer border border-indigo-100 hover:border-indigo-300 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={e.medicationType?.includes(m)}
                                    onChange={() => {
                                        const current = e.medicationType || [];
                                        const next = current.includes(m) ? current.filter((x:any)=>x!==m) : [...current, m];
                                        updateData('medicationType', next);
                                    }}
                                    className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-400"
                                />
                                <span className="text-[10px] font-black text-slate-700 uppercase">{m}</span>
                            </label>
                        ))}
                     </div>
                </div>
            </div>

             {/* Clinical Awareness Card */}
             {e.thyroid?.tsh && (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-[2rem] border-2 border-slate-100 p-6 shadow-xl group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-teal-50 p-2 rounded-xl text-teal-600">
                             <TestTube size={20} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Endocrine Interpretive Summary</h4>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {parseFloat(e.thyroid?.tsh) > 4 && (
                            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl border border-rose-100">
                                <AlertCircle size={14} />
                                <span className="text-[10px] font-black uppercase">Hypothyroid State Detected</span>
                            </div>
                        )}
                        {parseFloat(e.glycemic?.hba1c) > 6.5 && (
                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100">
                                <AlertCircle size={14} />
                                <span className="text-[10px] font-black uppercase">Diabetes Management (HbA1c &gt; 6.5%)</span>
                            </div>
                        )}
                    </div>
                </div>
             )}
        </div>
    );
};
