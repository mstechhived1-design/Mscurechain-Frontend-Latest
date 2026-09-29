'use client';

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  FlaskConical, 
  ShieldAlert, 
  TrendingUp, 
  Scale 
} from 'lucide-react';

interface OncologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const OncologyModule: React.FC<OncologyModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<{ type: 'danger' | 'warning' | 'info'; message: string; field: string }[]>([]);

    if (!formData.oncologyData) return null;

    const data = formData.oncologyData;
    const { body, diagnosis, site, ecog, biomarkers, tnm, treatment, labs, toxicity, symptoms } = data;

    // BSA Calculation: sqrt((height * weight) / 3600)
    useEffect(() => {
        const weight = parseFloat(body.weight || '0');
        const height = parseFloat(body.height || '0');
        if (weight > 0 && height > 0) {
            const bsa = Math.sqrt((height * weight) / 3600).toFixed(2);
            if (parseFloat(bsa) !== parseFloat(body.bsa || '0')) {
                updateNestedField('body', 'bsa', parseFloat(bsa));
            }
        }
    }, [body.weight, body.height]);

    // Validation & Global Alerts
    useEffect(() => {
        const newAlerts: typeof alerts = [];

        // Lab Safety Checks (ANC is most critical)
        const anc = parseFloat(labs.anc || '0');
        if (anc > 0 && anc < 1500) {
            newAlerts.push({ type: 'danger', message: 'CRITICAL: Neutropenia detected — delay chemotherapy!', field: 'anc' });
        }

        const platelets = parseFloat(labs.platelets || '0');
        if (platelets > 0 && platelets < 100) {
            newAlerts.push({ type: 'danger', message: 'CRITICAL: Thrombocytopenia (Plt < 100k) — unsafe for chemotherapy!', field: 'platelets' });
        }

        const creatinine = parseFloat(labs.creatinine || '0');
        if (creatinine > 1.4) { // typical high threshold
            newAlerts.push({ type: 'warning', message: 'ALERT: Elevated Creatinine — Renal dose adjustment required.', field: 'creatinine' });
        }

        // Performance Status
        if (parseInt(ecog) >= 3) {
            newAlerts.push({ type: 'warning', message: 'ALERT: Poor performance status (ECOG ≥ 3) — reconsider therapy intent.', field: 'ecog' });
        }

        // Stage vs Intent
        if (tnm.stage === 'IV' && treatment.intent !== 'Palliative') {
            newAlerts.push({ type: 'info', message: 'INFO: Stage IV often suggests Palliative intent.', field: 'intent' });
        }

        // Toxicity checks
        setAlerts(newAlerts);
    }, [labs, ecog, tnm.stage, treatment.intent, toxicity]);



    const updateField = (field: string, value: any) => {
        setFormData((p: any) => ({
            ...p,
            oncologyData: { ...p.oncologyData, [field]: value }
        }));
    };

    const updateNestedField = (section: string, field: string, value: any) => {
        setFormData((p: any) => ({
            ...p,
            oncologyData: {
                ...p.oncologyData,
                [section]: { ...p.oncologyData[section], [field]: value }
            }
        }));
    };

    const toggleArrayItem = (field: string, item: string) => {
        const current = data[field] || [];
        const next = current.includes(item)
            ? current.filter((v: string) => v !== item)
            : [...current, item];
        updateField(field, next);
    };

    const hasDanger = alerts.some(a => a.type === 'danger');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Standardized Header */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 shadow-sm ${
                hasDanger ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                        hasDanger ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'
                    }`}>
                        <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className={`text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 ${hasDanger ? 'text-red-700' : 'text-indigo-900'}`}>
                            Oncology Command Module
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Activity size={12} className={hasDanger ? 'text-red-500' : 'text-indigo-400'} />
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${hasDanger ? 'text-red-600' : 'text-indigo-500/70'}`}>
                                Safety Mode: {hasDanger ? 'CRITICAL - CHEMO BLOCKED' : 'Active - Validating Protocols'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Patient Parameters / BSA Display Badge */}
                <div className="flex items-center gap-3 bg-white border border-indigo-200 px-4 py-2 rounded-full shadow-sm">
                    <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">BSA:</span>
                        <span className="text-xs font-black text-indigo-700">{body.bsa || '0.00'}<span className="text-[9px] ml-0.5 font-bold">m²</span></span>
                    </div>
                    <div className="w-[1px] h-3 bg-indigo-100" />
                    <Scale size={14} className="text-indigo-600" />
                </div>
            </div>

            {/* 2. Critical Safety Alerts */}
            {alerts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alerts.map((alert, i) => (
                        <div key={i} className={`p-3 rounded-xl border-l-4 flex items-start gap-3 shadow-sm ${
                            alert.type === 'danger' ? 'bg-red-50 border-red-500 text-red-700' : 
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-700' : 
                            'bg-blue-50 border-blue-500 text-blue-700'
                        }`}>
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">
                                    {alert.type === 'danger' ? 'Protocol Breach' : 'Clinical Watch'}
                                </h4>
                                <p className="text-[11px] font-bold tracking-tight">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 3. Patient Geometry & Labs */}
                <div className="space-y-6 lg:col-span-1">
                    {/* A. Body Parameters */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-indigo-500" /> Morphometry
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Weight (kg)</label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={body.weight}
                                    onChange={(e) => updateNestedField('body', 'weight', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Height (cm)</label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={body.height}
                                    onChange={(e) => updateNestedField('body', 'height', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Oncology Profile */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-4 flex items-center gap-2">
                             Performance & Biomarkers
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">ECOG Performance Status</label>
                                <select
                                    value={ecog}
                                    onChange={(e) => updateField('ecog', e.target.value)}
                                    className={`w-full bg-slate-50 border rounded-xl p-2.5 text-sm font-bold outline-none border-slate-100 transition-all ${
                                        parseInt(ecog) >= 3 ? 'text-amber-600 ring-1 ring-amber-400/50' : 'text-slate-700'
                                    }`}
                                >
                                    {[0, 1, 2, 3, 4, 5].map(v => (
                                        <option key={v} value={v} className="bg-white text-slate-700">Grade {v} - {
                                            v === 0 ? 'Asymptomatic' : 
                                            v === 1 ? 'Symptomatic but ambulatory' :
                                            v === 2 ? 'In bed <50% of day' : 
                                            v === 3 ? 'In bed >50% of day' : 
                                            v === 4 ? 'Bedridden' : 'Deceased'
                                        }</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block leading-none">Structured Biomarkers</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {["ER/PR", "HER2", "PD-L1", "EGFR", "KRAS", "BRAF", "MSI-H", "BRCA"].map(b => (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => toggleArrayItem('biomarkers', b)}
                                            className={`px-2 py-1 rounded-lg text-[9px] font-black border transition-all ${
                                                biomarkers?.includes(b)
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    </div>

                    {/* C. Toxicities */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-4">Toxicity Monitoring (Grade ≥2)</h3>
                         <div className="flex flex-wrap gap-1.5">
                            {["Nausea", "Vomiting", "Neuropathy", "Mucositis", "Hand-Foot", "Neutropenia", "Diarrhea", "Alopecia"].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleArrayItem('toxicity', t)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${
                                        toxicity?.includes(t)
                                            ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* D. Patient Symptoms */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-4">Patient Reported Symptoms</h3>
                         <div className="flex flex-wrap gap-1.5">
                            {["Pain", "Fatigue", "Anorexia", "Weight loss", "Dyspnea", "Cough", "Bone pain", "Headache"].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleArrayItem('symptoms', s)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${
                                        data.symptoms?.includes(s)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                {/* 4. Right Segment - Staging, Strategy & Chemo */}
                <div className="lg:col-span-2 space-y-6">
                    {/* A. Diagnosis & TNM Staging */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-indigo-600 flex items-center gap-2">
                                     Clinical Diagnosis
                                </h3>
                                <div className="space-y-3">
                                    <select
                                        value={diagnosis}
                                        onChange={(e) => updateField('diagnosis', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Primary Diagnosis</option>
                                        {["Breast Cancer", "Lung Cancer (NSCLC)", "Colon Adenocarcinoma", "Prostate Cancer", "Multiple Myeloma", "DLBCL", "AML", "Pancreatic Cancer"].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={site}
                                        onChange={(e) => updateField('site', e.target.value)}
                                        placeholder="Specific Anatomical Site (e.g., Upper Outer Quadrant)"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-bold text-slate-600 focus:bg-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-indigo-600 flex items-center gap-2">
                                    TNM Staging (AJCC 8th)
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {['T', 'N', 'M', 'Stage'].map(key => (
                                        <div key={key}>
                                            <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">{key}</label>
                                            <select
                                                value={tnm[key.toLowerCase()]}
                                                onChange={(e) => updateNestedField('tnm', key.toLowerCase(), e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-[11px] font-black text-indigo-700 outline-none hover:bg-slate-100 transition-colors"
                                            >
                                                 {key === 'T' && ['Tis', 'T1', 'T2', 'T3', 'T4'].map(o => <option key={o} value={o}>{o}</option>)}
                                                 {key === 'N' && ['N0', 'N1', 'N2', 'N3'].map(o => <option key={o} value={o}>{o}</option>)}
                                                 {key === 'M' && ['M0', 'M1'].map(o => <option key={o} value={o}>{o}</option>)}
                                                 {key === 'Stage' && ['I', 'II', 'IIIA', 'IIIB', 'IV'].map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* B. Treatment Strategy */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-4">Therapeutic Intent</h3>
                                <div className="flex gap-2">
                                    {["Curative", "Adjuvant", "Neoadjuvant", "Palliative"].map(intent => (
                                        <button
                                            key={intent}
                                            type="button"
                                            onClick={() => updateNestedField('treatment', 'intent', intent)}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                                                treatment.intent === intent
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm ring-4 ring-indigo-500/10'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'
                                            }`}
                                        >
                                            {intent}
                                        </button>
                                    ))}
                                </div>
                             </div>
                             <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 mb-4">Current Regimen Template</h3>
                                <input
                                    type="text"
                                    value={treatment.regimen}
                                    onChange={(e) => updateNestedField('treatment', 'regimen', e.target.value)}
                                    placeholder="e.g., AC-T, R-CHOP, FOLFOX6"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black text-indigo-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                             </div>
                        </div>
                    </div>

                    {/* C. Lab Parameters (Hematological & Organ Function) */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-6 flex items-center gap-2 relative z-10">
                            <FlaskConical size={14} className="text-indigo-500" /> Mandatory Pre-Chemo Labs
                         </h3>
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                             {[
                                { label: 'Hb', field: 'hb', unit: 'g/dL', threshold: 8 },
                                { label: 'ANC', field: 'anc', unit: '/μL', threshold: 1500, critical: true },
                                { label: 'Platelets', field: 'platelets', unit: 'k/μL', threshold: 100, critical: true },
                                { label: 'Creatinine', field: 'creatinine', unit: 'mg/dL', threshold: 1.4 },
                                { label: 'LFT (ALT)', field: 'lft', unit: 'U/L', threshold: 50 },
                             ].map(lab => (
                                <div key={lab.field}>
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1.5 block">{lab.label}</label>
                                    <div className="relative">
                                         <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={labs[lab.field]}
                                            onChange={(e) => updateNestedField('labs', lab.field, e.target.value)}
                                            className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs font-black outline-none transition-all ${
                                                (lab.critical && parseFloat(labs[lab.field]) < lab.threshold && parseFloat(labs[lab.field]) > 0) ||
                                                (!lab.critical && lab.field === 'creatinine' && parseFloat(labs[lab.field]) > lab.threshold)
                                                    ? 'bg-red-50 border-red-300 text-red-600 ring-1 ring-red-500/20'
                                                    : 'border-slate-100 text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500'
                                            }`}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400">{lab.unit}</span>
                                    </div>
                                </div>
                             ))}
                         </div>
                    </div>

                </div>
            </div>
    );
};
