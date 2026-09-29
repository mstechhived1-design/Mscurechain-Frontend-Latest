'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Droplets, AlertTriangle, CheckCircle2, FlaskConical, Thermometer, UserMinus } from 'lucide-react';

interface HematologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const HematologyModule: React.FC<HematologyModuleProps> = ({ formData, setFormData }) => {
    const [validationMsg, setValidationMsg] = useState<{ field: string; message: string; type: 'warning' | 'critical' | 'info' }[]>([]);

    if (!formData.hematologyData) return null;

    const data = formData.hematologyData;
    const { cbc, rbcIndices, coagulation, symptoms, transfusion } = data;

    // Real-time Validations
    useEffect(() => {
        const msgs: typeof validationMsg = [];

        // Hb
        const hb = parseFloat(cbc.hb || '0');
        if (hb > 0) {
            if (hb < 7) msgs.push({ field: 'hb', message: 'CRITICAL: Severe Anemia! Transfusion required.', type: 'critical' });
            else if (hb < 10) msgs.push({ field: 'hb', message: 'Alert: Significant Anemia', type: 'warning' });
        }

        // Platelets
        const plt = parseFloat(cbc.platelets || '0');
        if (plt > 0) {
            if (plt < 20000) msgs.push({ field: 'platelets', message: 'EMERGENCY: Platelet transfusion required!', type: 'critical' });
            else if (plt < 50000) msgs.push({ field: 'platelets', message: 'Warning: High bleeding risk', type: 'warning' });
            else if (plt < 100000) msgs.push({ field: 'platelets', message: 'Low platelet count', type: 'info' });
        }

        // TLC
        const tlc = parseFloat(cbc.tlc || '0');
        if (tlc > 0) {
            if (tlc > 50000) msgs.push({ field: 'tlc', message: 'CRITICAL: Leukemia suspicion (TLC > 50k)', type: 'critical' });
            else if (tlc > 20000) msgs.push({ field: 'tlc', message: 'Significant Infection detected', type: 'warning' });
        }

        // INR
        const inr = parseFloat(coagulation.inr || '0');
        if (inr > 0) {
            if (inr > 4) msgs.push({ field: 'inr', message: 'CRITICAL: Severe bleeding risk!', type: 'critical' });
            else if (inr > 3) msgs.push({ field: 'inr', message: 'Warning: Elevated bleeding risk', type: 'warning' });
        }

        // RBC Indices
        const mcv = parseFloat(rbcIndices.mcv || '0');
        if (hb < 12 && mcv > 0) {
            if (mcv < 80) msgs.push({ field: 'mcv', message: 'Suggests Iron Deficiency Anemia', type: 'info' });
            else if (mcv > 100) msgs.push({ field: 'mcv', message: 'Suggests B12/Folate Deficiency', type: 'info' });
        }

        // Cross-field logic
        if (hb > 0 && plt > 0 && tlc > 0) {
            if (hb < 10 && tlc < 4000 && plt < 100000) {
                msgs.push({ field: 'global', message: 'ALERT: Possible Bone Marrow Failure / Aplastic Anemia', type: 'critical' });
            }
        }

        if (tlc > 50000 && (symptoms?.includes('Fever') || symptoms?.includes('Weight loss'))) {
            msgs.push({ field: 'global', message: 'HIGH RISK: Possible Leukemia! Verify ASAP.', type: 'critical' });
        }

        if (hb < 7 && (!transfusion.product || transfusion.units <= 0)) {
            msgs.push({ field: 'transfusion', message: 'TRANSFUSION REQ: Patient needs PRBC transfusion', type: 'critical' });
        }

        setValidationMsg(msgs);
    }, [cbc, rbcIndices, coagulation, symptoms, transfusion]);

    const updateNestedField = (section: string, field: string, value: any) => {
        setFormData((p: any) => ({
            ...p,
            hematologyData: {
                ...p.hematologyData,
                [section]: { ...p.hematologyData[section], [field]: value }
            }
        }));
    };

    const updateField = (field: string, value: any) => {
        setFormData((p: any) => ({
            ...p,
            hematologyData: { ...p.hematologyData, [field]: value }
        }));
    };

    const toggleSymptom = (s: string) => {
        const current = data.symptoms || [];
        const next = current.includes(s)
            ? current.filter((v: string) => v !== s)
            : [...current, s];
        updateField('symptoms', next);
    };

    const getMsg = (field: string) => validationMsg.find(m => m.field === field);
    const hasCritical = validationMsg.some(m => m.type === 'critical');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                        <Droplets size={20} className={`text-rose-600 ${hasCritical ? 'animate-bounce' : 'animate-pulse'}`} />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-rose-700">Hematology Assessment</h2>
                        <p className="text-[9px] font-bold text-rose-600/60 uppercase tracking-widest">Complete Blood Count & Coagulation Analysis</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {validationMsg.length > 0 && (
                        <div className="bg-rose-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-rose-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-rose-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-rose-700">Hematological Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-rose-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-rose-600">
                        HEMA - V1
                    </div>
                </div>
            </div>

            {/* A. Complete Blood Count (CBC) */}
            <div className={`rounded-xl border transition-all duration-500 ${
                hasCritical ? 'bg-red-50/30 border-red-100' : 'bg-transparent border-slate-100'
            } p-3`}>
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-3.5 bg-rose-500 rounded-full"></div>
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complete Blood Count (CBC)</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Hb */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-400">Hb (g/dL)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            step="0.1"
                            placeholder="12.0"
                            value={cbc.hb}
                            onChange={(e) => updateNestedField('cbc', 'hb', e.target.value)}
                            className={`w-full bg-slate-50/50 border rounded-lg p-2 text-sm font-black focus:bg-white outline-none transition-all text-center ${
                                getMsg('hb')?.type === 'critical' ? 'border-red-400 text-red-600' : 'border-slate-100 text-slate-700 focus:border-rose-500'
                            }`}
                        />
                        {getMsg('hb') && (
                            <p className={`mt-0.5 text-[8px] font-bold uppercase flex items-center gap-1 ${getMsg('hb')?.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                                <AlertTriangle size={8} /> {getMsg('hb')?.message}
                            </p>
                        )}
                    </div>

                    {/* TLC */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">TLC (/cumm)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            placeholder="7500"
                            value={cbc.tlc}
                            onChange={(e) => updateNestedField('cbc', 'tlc', e.target.value)}
                            className={`w-full bg-slate-50/50 border rounded-lg p-2 text-sm font-black focus:bg-white outline-none transition-all text-center ${
                                getMsg('tlc')?.type === 'critical' ? 'border-red-400 text-red-600' : 'border-slate-100 text-slate-700 focus:border-rose-500'
                            }`}
                        />
                         {getMsg('tlc') && (
                            <p className={`mt-0.5 text-[8px] font-bold uppercase flex items-center gap-1 ${getMsg('tlc')?.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                                <AlertTriangle size={8} /> {getMsg('tlc')?.message}
                            </p>
                        )}
                    </div>

                    {/* Platelets */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">PLTs (Lakhs)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            step="0.1"
                            placeholder="2.5"
                            value={cbc.platelets}
                            onChange={(e) => updateNestedField('cbc', 'platelets', e.target.value)}
                            className={`w-full bg-slate-50/50 border rounded-lg p-2 text-sm font-black focus:bg-white outline-none transition-all text-center ${
                                getMsg('platelets')?.type === 'critical' ? 'border-red-400 text-red-600' : 'border-slate-100 text-slate-700 focus:border-rose-500'
                            }`}
                        />
                         {getMsg('platelets') && (
                            <p className={`mt-0.5 text-[8px] font-bold uppercase flex items-center gap-1 ${getMsg('platelets')?.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                                <AlertTriangle size={8} /> {getMsg('platelets')?.message}
                            </p>
                        )}
                    </div>

                    {/* ESR */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">ESR (mm/hr)</label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            placeholder="15"
                            value={cbc.esr}
                            onChange={(e) => updateNestedField('cbc', 'esr', e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-700 placeholder:text-slate-300 focus:border-rose-500 focus:bg-white outline-none transition-all text-center"
                        />
                    </div>
                </div>

                {/* Global Critical Alerts */}
                {getMsg('global') && (
                    <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-600 rounded-r-xl animate-bounce">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-red-600" size={24} />
                            <div>
                                <h4 className="text-[11px] font-black uppercase text-red-700 tracking-wider">Life-Threatening Clinical Signal</h4>
                                <p className="text-[10px] font-bold text-red-600 uppercase">{getMsg('global')?.message}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* B. RBC Indices */}
                <div className="bg-transparent rounded-xl border border-slate-100 p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <FlaskConical size={14} className="text-emerald-500" /> RBC Indices
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">MCV (fL)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={rbcIndices.mcv}
                                onChange={(e) => updateNestedField('rbcIndices', 'mcv', e.target.value)}
                                className={`w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black outline-none focus:ring-1 focus:ring-emerald-500/20 ${
                                    getMsg('mcv') ? 'text-emerald-600' : 'text-slate-600'
                                }`}
                                placeholder="80-100"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">MCH (pg)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={rbcIndices.mch}
                                onChange={(e) => updateNestedField('rbcIndices', 'mch', e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/20"
                                placeholder="27-32"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">MCHC (g/dL)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={rbcIndices.mchc}
                                onChange={(e) => updateNestedField('rbcIndices', 'mchc', e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/20"
                                placeholder="32-36"
                            />
                        </div>
                    </div>
                    {getMsg('mcv') && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase">{getMsg('mcv')?.message}</span>
                        </div>
                    )}
                </div>

                {/* C. Coagulation Profile */}
                <div className="bg-transparent rounded-xl border border-slate-100 p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Droplets size={14} className="text-rose-500" /> Coagulation Profile
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">PT (sec)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={coagulation.pt}
                                onChange={(e) => updateNestedField('coagulation', 'pt', e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-600 outline-none focus:ring-1 focus:ring-rose-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block text-rose-600">INR</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                step="0.1"
                                value={coagulation.inr}
                                onChange={(e) => updateNestedField('coagulation', 'inr', e.target.value)}
                                className={`w-full border rounded-lg p-2 text-sm font-black outline-none focus:ring-1 ${
                                    getMsg('inr')?.type === 'critical' ? 'bg-red-600 border-red-600 text-white' : 'bg-rose-50 border-rose-100 text-rose-700 focus:ring-rose-500/20'
                                }`}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">aPTT (sec)</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={coagulation.aptt}
                                onChange={(e) => updateNestedField('coagulation', 'aptt', e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-600 outline-none focus:ring-1 focus:ring-rose-500/20"
                            />
                        </div>
                    </div>
                    {getMsg('inr') && (
                        <p className={`mt-3 text-[9px] font-black uppercase flex items-center gap-1 ${getMsg('inr')?.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                            <AlertTriangle size={10} /> {getMsg('inr')?.message}
                        </p>
                    )}
                </div>

                {/* D. Symptoms */}
                <div className="bg-transparent rounded-xl border border-slate-100 p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Clinical Symptoms</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {["Fatigue", "Pallor", "Bleeding", "Fever", "Weight loss", "Bone pain"].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => toggleSymptom(s)}
                                className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1.5 ${symptoms?.includes(s)
                                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500'
                                 }`}
                            >
                                {s === 'Bleeding' && <Droplets size={10} className={symptoms?.includes(s) ? 'text-white' : 'text-slate-400'} />}
                                {s === 'Fever' && <Thermometer size={10} className={symptoms?.includes(s) ? 'text-white' : 'text-slate-400'} />}
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* E. Transfusion Management */}
                <div className={`rounded-xl border p-4 transition-all ${
                    getMsg('transfusion') ? 'bg-amber-50/50 border-amber-200' : 'bg-transparent border-slate-100'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity size={14} className="text-rose-500" /> Transfusion
                        </h3>
                        {getMsg('transfusion') && (
                            <span className="text-[8px] font-black bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded animate-pulse">
                                REQUIRED
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Product</label>
                            <select
                                value={transfusion.product}
                                onChange={(e) => updateNestedField('transfusion', 'product', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="">None</option>
                                <option value="PRBC">PRBC</option>
                                <option value="Platelets">Platelets</option>
                                <option value="FFP">FFP</option>
                                <option value="Cryo">Cryoprecipitate</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Units</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={transfusion.units}
                                onChange={(e) => updateNestedField('transfusion', 'units', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="Clinical Indication..."
                        value={transfusion.indication}
                        onChange={(e) => updateNestedField('transfusion', 'indication', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] font-bold outline-none focus:bg-white"
                    />
                </div>
            </div>

            {/* F. Diagnosis Segment */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final Assessment & Diagnosis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                        value={data.diagnosis}
                        onChange={(e) => updateField('diagnosis', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] font-black text-rose-600 uppercase outline-none focus:ring-1 focus:ring-rose-500"
                    >
                        <option value="">-- Clinical Diagnosis --</option>
                        {["Iron deficiency anemia", "Megaloblastic anemia", "Leukemia", "Thrombocytopenia", "Hemophilia", "Aplastic Anemia", "Sickle Cell Anemia"].map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <textarea
                        value={data.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] font-medium text-slate-600 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-rose-500 h-12"
                        placeholder="Additional clinical notes..."
                    />
                </div>
            </div>
        </div>
    );
};
