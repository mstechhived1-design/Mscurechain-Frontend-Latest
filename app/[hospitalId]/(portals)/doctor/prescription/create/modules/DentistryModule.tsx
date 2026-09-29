'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info,
    Stethoscope, ClipboardList, Thermometer,
    Zap, HeartPulse, UserCheck, AlertCircle
} from 'lucide-react';

interface DentistryModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const DentistryModule: React.FC<DentistryModuleProps> = ({ formData, setFormData }) => {
    const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

    if (!formData.dentistryData) return null;
    const d = formData.dentistryData;

    // ── Tooth Mapping Logic ──────────────────────────────────────────────────
    // FDI notation: 11-18 (UR), 21-28 (UL), 31-38 (LL), 41-48 (LR)
    const upperRight = ["18", "17", "16", "15", "14", "13", "12", "11"];
    const upperLeft  = ["21", "22", "23", "24", "25", "26", "27", "28"];
    const lowerRight = ["48", "47", "46", "45", "44", "43", "42", "41"];
    const lowerLeft  = ["31", "32", "33", "34", "35", "36", "37", "38"];

    // ── Helper updaters ─────────────────────────────────────────────────────
    const updateDent = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, dentistryData: { ...prev.dentistryData, [field]: value } }));

    const updateOral = (field: string, value: any) =>
        updateDent('oralFindings', { ...d.oralFindings, [field]: value });

    const updateExtra = (field: string, value: any) =>
        updateDent('extraOral', { ...d.extraOral, [field]: value });

    const updateSystemic = (field: string, value: any) =>
        updateDent('systemicRisks', { ...d.systemicRisks, [field]: value });

    const toggleToothSelection = (num: string) => {
        const currentTeeth = d.teeth || [];
        const exists = currentTeeth.find((t: any) => t.toothNumber === num);
        
        if (exists) {
            // Remove tooth if it has no data, otherwise just select it
            if (!exists.condition && !exists.diagnosis && exists.mobilityGrade === 0 && !exists.tenderness) {
                updateDent('teeth', currentTeeth.filter((t: any) => t.toothNumber !== num));
                if (selectedTooth === num) setSelectedTooth(null);
            } else {
                setSelectedTooth(num);
            }
        } else {
            // Add new tooth
            const newTooth = {
                toothNumber: num,
                condition: '',
                mobilityGrade: 0,
                tenderness: false,
                cariesDepth: 'None',
                diagnosis: ''
            };
            updateDent('teeth', [...currentTeeth, newTooth]);
            setSelectedTooth(num);
        }
    };

    const updateSpecificTooth = (num: string, field: string, value: any) => {
        const updatedTeeth = (d.teeth || []).map((t: any) => 
            t.toothNumber === num ? { ...t, [field]: value } : t
        );
        updateDent('teeth', updatedTeeth);
    };

    const getToothStyle = (num: string) => {
        const isSelected = selectedTooth === num;
        const toothData = (d.teeth || []).find((t: any) => t.toothNumber === num);
        const hasData = toothData && (toothData.condition || toothData.diagnosis || toothData.mobilityGrade > 0 || toothData.tenderness);
        
        return `w-10 h-12 flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer ${
            isSelected 
                ? 'border-violet-600 bg-violet-600 text-white shadow-lg scale-110 z-10' 
                : hasData
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400'
        }`;
    };
    return (
        <div className="space-y-6">


            {/* Header */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-blue-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-blue-700">Dentistry Examination</h2>
                        <p className="text-[9px] font-bold text-blue-600/60 uppercase tracking-widest">Tooth-Specific assessment & Procedure Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-blue-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-blue-600">
                        Dental - FDI Grid
                    </div>
                </div>
            </div>

            {/* ── A. CHIEF COMPLAINT & PAIN ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-700">
                        <Thermometer size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Pain Scale (0–10)</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <input 
                            type="range" max="10" 
                            value={d.painScale || 0}
                            onChange={e => updateDent('painScale', parseInt(e.target.value))}
                            className="flex-1 accent-blue-600"
                        />
                        <span className={`text-2xl font-black w-10 text-center ${d.painScale >= 7 ? 'text-red-600 animate-bounce' : 'text-blue-600'}`}>
                            {d.painScale || 0}
                        </span>
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span>No Pain</span>
                        <span>Moderate</span>
                        <span>Severe</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-700">
                        <Activity size={17} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Duration</h3>
                    </div>
                    <input 
                        type="text"
                        placeholder="e.g. 3 days, 1 week..."
                        value={d.duration || ''}
                        onChange={e => updateDent('duration', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* ── B. TOOTH SELECTION GRID (FDI) ───────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
                 <div className="flex items-center gap-2 mb-6 text-slate-700">
                    <UserCheck size={18} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Tooth Selection (FDI Mapping)</h3>
                    <span className="ml-auto text-[9px] font-bold text-red-500 animate-pulse">Select Teeth to Assess</span>
                </div>

                <div className="space-y-8">
                    {/* Upper Arch */}
                    <div className="space-y-2">
                        <div className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Upper Arch / Maxilla</div>
                        <div className="flex justify-center gap-1 sm:gap-2 px-2">
                            <div className="flex gap-1 group">
                                {upperRight.map(num => (
                                    <div key={num} onClick={() => toggleToothSelection(num)} className={getToothStyle(num)}>
                                        <span className="text-[10px] font-black">{num}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="w-1 bg-slate-100 mx-2 rounded-full" />
                            <div className="flex gap-1">
                                {upperLeft.map(num => (
                                    <div key={num} onClick={() => toggleToothSelection(num)} className={getToothStyle(num)}>
                                        <span className="text-[10px] font-black">{num}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lower Arch */}
                    <div className="space-y-2">
                        <div className="flex justify-center gap-1 sm:gap-2 px-2">
                            <div className="flex gap-1">
                                {lowerRight.map(num => (
                                    <div key={num} onClick={() => toggleToothSelection(num)} className={getToothStyle(num)}>
                                        <span className="text-[10px] font-black">{num}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="w-1 bg-slate-100 mx-2 rounded-full" />
                            <div className="flex gap-1">
                                {lowerLeft.map(num => (
                                    <div key={num} onClick={() => toggleToothSelection(num)} className={getToothStyle(num)}>
                                        <span className="text-[10px] font-black">{num}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Lower Arch / Mandible</div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex justify-center gap-6 text-[8px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white border-2 border-slate-200 rounded" />
                        <span>Normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-50 border-2 border-red-400 rounded" />
                        <span>Findings Recorded</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-violet-600 rounded shadow-md" />
                        <span>Active Selection</span>
                    </div>
                </div>
            </div>

            {/* ── C. SPECIFIC TOOTH ASSESSMENT ────────────────────────────── */}
            {selectedTooth && (() => {
                const t = (d.teeth || []).find((tooth: any) => tooth.toothNumber === selectedTooth);
                if (!t) return null;
                
                return (
                    <div className="bg-white rounded-3xl p-6 text-slate-900 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center text-2xl font-black text-violet-600 shadow-sm">
                                    {selectedTooth}
                                </div>
                                <div>
                                    <h4 className="text-[14px] font-black uppercase tracking-widest leading-none mb-1 text-slate-800">Tooth Assessment</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">FDI World Dental Federation System</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedTooth(null)}
                                className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 transition-all border border-slate-200"
                            >Close Panel</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Condition</label>
                                    <select 
                                        value={t.condition || ''}
                                        onChange={e => updateSpecificTooth(selectedTooth, 'condition', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                    >
                                        <option value="">Select Condition</option>
                                        <option value="Caries">Caries</option>
                                        <option value="Fracture">Fracture</option>
                                        <option value="Periapical Abscess">Periapical Abscess</option>
                                        <option value="Pulpitis">Pulpitis</option>
                                        <option value="Impacted">Impacted</option>
                                        <option value="Missing">Missing</option>
                                        <option value="Restored">Restored</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Mobility Grade (0–3)</label>
                                    <div className="flex gap-2">
                                        {[0, 1, 2, 3].map(grade => (
                                            <button 
                                                key={grade}
                                                onClick={() => updateSpecificTooth(selectedTooth, 'mobilityGrade', grade)}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${
                                                    t.mobilityGrade === grade 
                                                        ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                                }`}
                                            >{grade}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tenderness on Percussion</span>
                                    <button 
                                        onClick={() => updateSpecificTooth(selectedTooth, 'tenderness', !t.tenderness)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                                            t.tenderness ? 'bg-red-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                                        }`}
                                    >{t.tenderness ? 'Present' : 'Absent'}</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Caries Depth</label>
                                    <div className="flex gap-1.5">
                                        {['None', 'Mild', 'Moderate', 'Deep'].map(depth => (
                                            <button 
                                                key={depth}
                                                onClick={() => updateSpecificTooth(selectedTooth, 'cariesDepth', depth)}
                                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${
                                                    t.cariesDepth === depth 
                                                        ? 'bg-violet-600 border-violet-600 text-white shadow-md' 
                                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                                }`}
                                            >{depth}</button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <textarea 
                                        value={t.diagnosis || ''}
                                        onChange={e => updateSpecificTooth(selectedTooth, 'diagnosis', e.target.value)}
                                        rows={2}
                                        placeholder="Detailed diagnosis for this tooth..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── D. ORAL FINDINGS & EXTRAORAL ────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-slate-700">
                        <HeartPulse size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Oral Examination Summary</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">General Caries</label>
                                <select 
                                    value={d.oralFindings?.caries || 'None'}
                                    onChange={e => updateOral('caries', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                                >
                                    {['None', 'Mild', 'Moderate', 'Deep'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gingivitis</label>
                                <select 
                                    value={d.oralFindings?.gingivitis || 'None'}
                                    onChange={e => updateOral('gingivitis', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                                >
                                    {['None', 'Mild', 'Severe'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intraoral Abscess</span>
                            <button 
                                onClick={() => updateOral('abscess', !d.oralFindings?.abscess)}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    d.oralFindings?.abscess ? 'bg-red-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                                }`}
                            >{d.oralFindings?.abscess ? 'Present' : 'Absent'}</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">General Mobility</label>
                                <select 
                                    value={d.oralFindings?.mobility || 'None'}
                                    onChange={e => updateOral('mobility', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                                >
                                    {['None', 'Grade 1', 'Grade 2', 'Grade 3'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Plaque Index</label>
                                <select 
                                    value={d.oralFindings?.plaqueIndex || 'Low'}
                                    onChange={e => updateOral('plaqueIndex', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                                >
                                    {['Low', 'Moderate', 'High'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-slate-700">
                        <AlertCircle size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Extraoral Findings</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {[
                            { id: 'facialSwelling', label: 'Facial Swelling', icon: ShieldAlert, color: 'text-red-600' },
                            { id: 'lymphNodes', label: 'Lymphadenopathy', icon: Activity, color: 'text-amber-600' },
                            { id: 'tmjPain', label: 'TMJ Pain/Tenderness', icon: Activity, color: 'text-indigo-600' }
                        ].map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                <div className="flex items-center gap-3">
                                    <item.icon size={14} className={d.extraOral?.[item.id] ? item.color : 'text-slate-300'} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                                </div>
                                <button 
                                    onClick={() => updateExtra(item.id, !d.extraOral?.[item.id])}
                                    className={`px-5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                                        d.extraOral?.[item.id] ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'
                                    }`}
                                >{d.extraOral?.[item.id] ? 'Present' : 'Not Noted'}</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── E. SYSTEMIC RISKS ───────────────────────────────────────── */}
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-rose-700">
                    <ShieldAlert size={18} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Medical Red Flags (Bleeding & Healing)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-rose-200">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-800">On Blood Thinners?</span>
                            <span className="text-[8px] font-bold text-rose-600/60 uppercase tracking-tighter">Caution: Bleeding Risk</span>
                        </div>
                        <button 
                            onClick={() => updateSystemic('onBloodThinners', !d.systemicRisks?.onBloodThinners)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                d.systemicRisks?.onBloodThinners ? 'bg-red-600 text-white shadow-lg animate-pulse' : 'bg-white border border-rose-200 text-rose-300'
                            }`}
                        >{d.systemicRisks?.onBloodThinners ? 'YES' : 'NO'}</button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-rose-200">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-800">Diabetic?</span>
                                <span className="text-[8px] font-bold text-rose-600/60 uppercase tracking-tighter">Caution: Healing Risk</span>
                            </div>
                            <button 
                                onClick={() => updateSystemic('diabetic', !d.systemicRisks?.diabetic)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    d.systemicRisks?.diabetic ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-rose-200 text-rose-300'
                                }`}
                            >{d.systemicRisks?.diabetic ? 'YES' : 'NO'}</button>
                        </div>

                        {d.systemicRisks?.diabetic && (
                            <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                                {['Controlled', 'Uncontrolled', 'N/A'].map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => updateSystemic('diabetesControl', status)}
                                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                                            d.systemicRisks?.diabetesControl === status 
                                                ? status === 'Uncontrolled' ? 'bg-red-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white/40 text-slate-400 border border-slate-200'
                                        }`}
                                    >{status}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── F. PROCEDURE SELECTION ─────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-6 text-slate-900 border border-slate-200 shadow-sm relative overflow-hidden group/plan">
                 <div className="flex items-center gap-2 mb-6">
                    <Stethoscope size={20} className="text-indigo-600" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800">Plan & Procedure</h3>
                    <span className="ml-auto text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-tighter">Clinical Directive</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {['Scaling', 'Filling', 'Root Canal Treatment', 'Extraction', 'Crown', 'Implant', 'Other'].map(proc => (
                        <button 
                            key={proc}
                            onClick={() => updateDent('procedure', proc)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                                d.procedure === proc 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105 z-10' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-white hover:text-indigo-600'
                            }`}
                        >{proc}</button>
                    ))}
                </div>

                {/* Automation Summary */}
                {d.procedure && (
                    <div className="mt-6 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <Zap size={16} className="text-amber-500" />
                             <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planned Procedure</p>
                                <p className="text-sm font-black text-slate-900 uppercase">{d.procedure}</p>
                             </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clinical Protocol</p>
                             <p className="text-[10px] font-black text-indigo-600 uppercase">
                                {d.procedure === 'Extraction' && d.systemicRisks?.onBloodThinners ? '🔴 HIGH BLEEDING RISK' :
                                 d.procedure === 'Root Canal Treatment' ? '⚡ Local Anesthesia Indicated' :
                                 d.procedure === 'Implant' ? '🏗 Surgical Workflow active' : 'Standard Routine'}
                             </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── G. NOTES ────────────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                 <div className="flex items-center gap-2 mb-4 text-slate-700">
                    <ClipboardList size={18} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em]">Clinical Notes & Patient Advice</h3>
                </div>
                <textarea 
                    value={d.notes || ''}
                    onChange={e => updateDent('notes', e.target.value)}
                    rows={4}
                    placeholder="Advise on chewing site, postoperative hygiene, follow-up instructions..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                />
            </div>

        </div>
    );
};
