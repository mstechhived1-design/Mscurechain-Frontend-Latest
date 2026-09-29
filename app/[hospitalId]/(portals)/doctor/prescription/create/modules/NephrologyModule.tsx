'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, ShieldAlert, Info, Zap,
    Droplets, FlaskConical, Heart, Wind, Brain,
    ThumbsUp, Beaker, ClipboardList
} from 'lucide-react';

interface NephrologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

type AlertEntry = { type: 'emergency' | 'error' | 'warning' | 'info'; message: string };

// ── Constants ──────────────────────────────────────────────────────────────────
const SYMPTOMS         = ['Reduced urine', 'Swelling', 'Breathlessness', 'Nausea', 'Fatigue', 'Confusion'] as const;
const EDEMA_OPTIONS    = ['None', 'Trace', '1+', '2+', '3+', '4+'] as const;
const PROTEIN_OPTIONS  = ['Nil', 'Trace', '1+', '2+', '3+'] as const;
const BINARY_OPTIONS   = ['Nil', 'Present'] as const;
const DIALYSIS_STATUS  = ['Not on dialysis', 'Hemodialysis', 'Peritoneal dialysis'] as const;
const DIALYSIS_ACCESS  = ['AV fistula', 'Catheter'] as const;

// ── Auto CKD staging from eGFR ────────────────────────────────────────────────
const getCKDStage = (egfr: number): string => {
    if (egfr <= 0) return '';
    if (egfr >= 90) return 'Stage 1';
    if (egfr >= 60) return 'Stage 2';
    if (egfr >= 30) return 'Stage 3';
    if (egfr >= 15) return 'Stage 4';
    return 'Stage 5';
};

const CKD_COLORS: Record<string, string> = {
    'Stage 1': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'Stage 2': 'text-blue-600 bg-blue-50 border-blue-200',
    'Stage 3': 'text-amber-600 bg-amber-50 border-amber-200',
    'Stage 4': 'text-orange-600 bg-orange-50 border-orange-200',
    'Stage 5': 'text-red-700 bg-red-50 border-red-300',
};

// ── Numeric input helper ───────────────────────────────────────────────────────
const NumInput = ({
    value, onChange, placeholder, bgClass = 'bg-white/10', textClass = 'text-white',
    borderClass = 'border-none', ringClass = 'focus:ring-white/50',
}: {
    value: string; onChange: (v: string) => void; placeholder: string;
    bgClass?: string; textClass?: string; borderClass?: string; ringClass?: string;
}) => (
    <input
        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${bgClass} border ${borderClass} rounded-lg p-3 text-xl font-black ${textClass} focus:outline-none focus:ring-2 ${ringClass} text-center`}
    />
);

export const NephrologyModule: React.FC<NephrologyModuleProps> = ({ formData, setFormData }) => {
    if (!formData.nephroData) return null;
    const n = formData.nephroData;

    // ── Updater helpers ───────────────────────────────────────────────────────
    const update = (field: string, value: any) =>
        setFormData((prev: any) => ({ ...prev, nephroData: { ...prev.nephroData, [field]: value } }));

    const updateNested = (key: string, sub: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev, nephroData: {
                ...prev.nephroData,
                [key]: { ...prev.nephroData?.[key], [sub]: value },
            },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = n.symptoms || [];
        update('symptoms', curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym]);
    };

    // ── Auto-stage CKD from eGFR ──────────────────────────────────────────────
    useEffect(() => {
        const egfr = parseFloat(n.egfr) || 0;
        if (egfr > 0) {
            const stage = getCKDStage(egfr);
            if (stage !== n.ckdStage) update('ckdStage', stage);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [n.egfr]);

    const [alerts, setAlerts] = useState<AlertEntry[]>([]);

    useEffect(() => {
        const newAlerts: AlertEntry[] = [];
        const syms: string[] = n.symptoms || [];
        const creat   = parseFloat(n.creatinine) || 0;
        const egfr    = parseFloat(n.egfr) || 0;
        const intake  = parseFloat(n.fluidBalance?.intake) || 0;
        const output  = parseFloat(n.fluidBalance?.output) || 0;
        const uo      = parseFloat(n.urineOutput) || 0;
        const k       = parseFloat(n.electrolytes?.potassium) || 0;

        if (creat > 1.5 && egfr > 0 && egfr < 60) {
            newAlerts.push({ type: 'info', message: '💡 Elevated Creatinine + Low eGFR — Consistent with Chronic Kidney Disease (CKD) pattern.' });
        }

        // 8. Cross-field: Fluid Overload + Edema
        if (n.edema && n.edema !== 'None' && intake > 0 && intake > output) {
            newAlerts.push({ type: 'warning', message: `⚠️ Fluid Overload — Edema (${n.edema}) + Positive fluid balance. Consider loop diuretics. Sodium restriction.` });
        }

        // 9. Uremic Encephalopathy
        if (creat > 1.5 && syms.includes('Confusion')) {
            newAlerts.push({ type: 'emergency', message: '🚨 UREMIC ENCEPHALOPATHY SUSPECTED — Elevated creatinine + Confusion. Urgent renal support / dialysis evaluation.' });
        }

        // 10. AKI Pattern
        if (creat > 1.5 && uo > 0 && uo < 400) {
            newAlerts.push({ type: 'warning', message: '⚠️ Possible ACUTE KIDNEY INJURY (AKI) — Elevated creatinine + Oliguria. Identify and treat precipitating cause.' });
        }

        // 11. Dialysis alert when ESRD + not on dialysis
        if (egfr > 0 && egfr < 15 && n.dialysis?.status === 'Not on dialysis') {
            newAlerts.push({ type: 'emergency', message: '🚨 eGFR < 15 ml/min + Not on dialysis — DIALYSIS MAY BE IMMINENTLY REQUIRED. Refer to nephrologist urgently.' });
        }

        // 12. Breathlessness + Fluid Overload + Edema
        if (syms.includes('Breathlessness') && n.edema && n.edema !== 'None' && intake > output) {
            newAlerts.push({ type: 'emergency', message: '🚨 Breathlessness + Edema + Fluid Overload — Possible ACUTE PULMONARY EDEMA. Urgent evaluation and management.' });
        }

        // 13. Proteinuria
        if (n.urineAnalysis?.protein && ['2+', '3+'].includes(n.urineAnalysis.protein)) {
            newAlerts.push({ type: 'warning', message: `⚠️ Significant Proteinuria (${n.urineAnalysis.protein}) — Evaluate for nephrotic syndrome. 24-hour urine protein collection recommended.` });
        }

        // Pharma reminders
        if (creat > 1.5 || (egfr > 0 && egfr < 60)) {
            newAlerts.push({ type: 'info', message: '💊 Dose adjustment required for renally-cleared drugs. AVOID NSAIDs, aminoglycosides, and nephrotoxic contrast agents.' });
        }
        if (k > 5.5) {
            newAlerts.push({ type: 'info', message: '💊 AVOID: Potassium-sparing diuretics (Spironolactone, Amiloride), ACE inhibitors, ARBs until potassium normalises.' });
        }

        setAlerts(newAlerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        n.creatinine, n.urea, n.egfr,
        n.electrolytes?.potassium, n.electrolytes?.sodium, n.electrolytes?.bicarbonate,
        n.urineOutput, n.fluidBalance?.intake, n.fluidBalance?.output,
        n.edema, n.dialysis?.status, n.symptoms, n.urineAnalysis?.protein,
    ]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasEmergency = alerts.some(a => a.type === 'emergency');
    const creat   = parseFloat(n.creatinine) || 0;
    const egfr    = parseFloat(n.egfr) || 0;
    const k       = parseFloat(n.electrolytes?.potassium) || 0;
    const uo      = parseFloat(n.urineOutput) || 0;
    const intake  = parseFloat(n.fluidBalance?.intake) || 0;
    const outflow = parseFloat(n.fluidBalance?.output) || 0;
    const syms: string[] = n.symptoms || [];
    const ckdStage = n.ckdStage || (egfr > 0 ? getCKDStage(egfr) : '');

    const alertColors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-blue-50 border-blue-400 text-blue-800',
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
            <div className="text-indigo-700">{icon}</div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">{title}</h3>
            {note && !required && <span className="ml-auto text-[9px] font-bold text-slate-400">{note}</span>}
        </div>
    );

    return (
        <div className="space-y-4">



            {/* Standardized Light Header */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Beaker size={20} className="text-blue-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-blue-700">Nephrology Assessment</h2>
                        <p className="text-[9px] font-bold text-blue-600/60 uppercase tracking-widest">Renal & Electrolyte Function Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasEmergency && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 animate-pulse rounded-full shadow-lg shadow-red-500/20">
                            <ShieldAlert size={12} className="text-white" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">Critical Alert</span>
                        </div>
                    )}
                    {ckdStage && (
                        <div className="bg-white border border-blue-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-blue-600">
                             CKD {ckdStage}
                        </div>
                    )}
                </div>
            </div>

            {/* ── ALERTS SYSTEM ─────────────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-start gap-3 p-4 rounded-2xl border ${alertColors[alert.type]} shadow-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
                            {alert.type === 'emergency' ? <ShieldAlert size={18} className="shrink-0" /> :
                             alert.type === 'warning'   ? <AlertTriangle size={18} className="shrink-0" /> :
                             <Info size={18} className="shrink-0" />}
                            <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">
                                {alert.message}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── A. RENAL FUNCTION (simplified) ────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'A. Renal Function Tests')}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Creatinine */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                Serum Creatinine
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.01"
                                value={n.creatinine}
                                onChange={e => update('creatinine', e.target.value)}
                                placeholder="0.9"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-lg font-black text-center text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">mg/dL &nbsp;|&nbsp; Normal: 0.5–1.2</span>
                            {creat > 0 && (
                                <div className={`mt-2 text-[9px] font-black uppercase ${creat > 5 ? 'text-red-600' : creat > 1.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {creat > 5 ? '🚨 Severe Failure' : creat > 1.5 ? '⚠️ Impaired' : '✓ Normal'}
                                </div>
                            )}
                        </div>

                        {/* Urea */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                Blood Urea
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={n.urea}
                                onChange={e => update('urea', e.target.value)}
                                placeholder="20"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-lg font-black text-center text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">mg/dL &nbsp;|&nbsp; Normal: 15–45</span>
                            {parseFloat(n.urea) > 100 && (
                                <div className="mt-2 text-[9px] font-black uppercase text-amber-600">⚠️ Elevated</div>
                            )}
                        </div>

                        {/* eGFR */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                eGFR
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={n.egfr}
                                onChange={e => update('egfr', e.target.value)}
                                placeholder="90"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-lg font-black text-center text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">ml/min &nbsp;|&nbsp; Normal: &gt;90</span>
                            {egfr > 0 && ckdStage && (
                                <div className={`mt-2 text-[9px] font-black uppercase ${egfr < 15 ? 'text-red-600' : egfr < 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {egfr < 15 ? '🚨 ESRD' : egfr < 60 ? `⚠️ ${ckdStage}` : '✓ Normal'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CKD Stage Badge */}
                    {ckdStage && (
                        <div className="mt-4 flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Auto-staged CKD:</span>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${CKD_COLORS[ckdStage] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {ckdStage}
                                {ckdStage === 'Stage 5' && ' — ESRD'}
                                {ckdStage === 'Stage 4' && ' — Severe'}
                                {ckdStage === 'Stage 3' && ' — Moderate'}
                            </span>
                        </div>
                    )}
                </>,
                'border-indigo-100'
            )}

            {/* ── B. ELECTROLYTES ───────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Zap size={17} />, 'B. Electrolytes', false, 'critical monitoring')}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Sodium */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">Na⁺ — Sodium</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="138"
                                value={n.electrolytes?.sodium || ''}
                                onChange={e => updateNested('electrolytes', 'sodium', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-lg font-black text-center text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">mEq/L &nbsp;|&nbsp; Normal: 135–145</span>
                            {parseFloat(n.electrolytes?.sodium) > 0 && parseFloat(n.electrolytes?.sodium) < 135 && (
                                <p className="mt-1 text-[9px] font-black text-amber-600">⚠️ Hyponatremia</p>
                            )}
                        </div>

                        {/* Potassium — CRITICAL */}
                        <div className={`rounded-xl p-4 border text-center ${k > 5.5 ? 'bg-red-50 border-red-300' : k > 0 && k < 3.5 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                                K⁺ — Potassium <span className="text-red-500">❗ CRITICAL</span>
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="4.0" step="0.1"
                                value={n.electrolytes?.potassium || ''}
                                onChange={e => updateNested('electrolytes', 'potassium', e.target.value)}
                                className={`w-full border rounded-lg p-2.5 text-lg font-black text-center outline-none focus:ring-2 ${k > 5.5 ? 'bg-red-100 border-red-400 text-red-700 focus:ring-red-300' : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-300'}`}
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">mEq/L &nbsp;|&nbsp; Normal: 3.5–5.5</span>
                            {k > 6 && <p className="mt-1 text-[9px] font-black text-red-600">🚨 EMERGENCY — Cardiac Risk</p>}
                            {k > 5.5 && k <= 6 && <p className="mt-1 text-[9px] font-black text-red-500">🚨 Hyperkalemia</p>}
                            {k > 0 && k < 3.5 && <p className="mt-1 text-[9px] font-black text-amber-600">⚠️ Hypokalemia</p>}
                            {k >= 3.5 && k <= 5.5 && k > 0 && <p className="mt-1 text-[9px] font-black text-emerald-600">✓ Normal</p>}
                        </div>

                        {/* Bicarbonate */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">HCO₃⁻ — Bicarbonate</label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="24"
                                value={n.electrolytes?.bicarbonate || ''}
                                onChange={e => updateNested('electrolytes', 'bicarbonate', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-lg font-black text-center text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-slate-400 mt-1 block">mEq/L &nbsp;|&nbsp; Normal: 22–29</span>
                            {parseFloat(n.electrolytes?.bicarbonate) > 0 && parseFloat(n.electrolytes?.bicarbonate) < 22 && (
                                <p className="mt-1 text-[9px] font-black text-amber-600">⚠️ Metabolic Acidosis</p>
                            )}
                        </div>
                    </div>
                </>,
                'border-indigo-100',
            )}

            {/* ── C. URINE OUTPUT ───────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Droplets size={17} />, 'C. Urine Output')}
                    <div className="max-w-xs">
                        <div className={`rounded-xl p-4 border text-center ${uo > 0 && uo < 100 ? 'bg-red-50 border-red-300' : uo >= 100 && uo < 400 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="1500"
                                value={n.urineOutput}
                                onChange={e => update('urineOutput', e.target.value)}
                                className={`w-full border rounded-lg p-3 text-2xl font-black text-center outline-none focus:ring-2 ${uo > 0 && uo < 100 ? 'bg-red-100 border-red-400 text-red-700 focus:ring-red-300' : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-300'}`}
                            />
                            <span className="text-[9px] text-slate-400 mt-2 block font-bold uppercase tracking-widest">ml / 24 hours</span>
                        </div>
                        {uo > 0 && uo < 100 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded-xl text-center">
                                <p className="text-[10px] font-black text-red-700">🚨 ANURIA — &lt;100 ml/day. Urgent evaluation required.</p>
                            </div>
                        )}
                        {uo >= 100 && uo < 400 && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xl text-center">
                                <p className="text-[10px] font-black text-amber-700">⚠️ OLIGURIA — &lt;400 ml/day. Monitor closely.</p>
                            </div>
                        )}
                        {uo >= 400 && (
                            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                <p className="text-[10px] font-black text-emerald-700">✓ Adequate urine output</p>
                            </div>
                        )}
                    </div>
                </>,
                'border-sky-100',
            )}

            {/* ── D. URINE ANALYSIS (STRUCTURED) ────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<FlaskConical size={17} />, 'D. Urine Analysis', false, 'structured — not free text')}
                    <div className="space-y-4">
                        {/* Protein */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Protein &nbsp;<span className="text-blue-400">(Urine Albumin)</span>
                            </label>
                            <div className="flex gap-2">
                                {PROTEIN_OPTIONS.map(p => (
                                    <button key={p} type="button"
                                        onClick={() => updateNested('urineAnalysis', 'protein', p)}
                                        className={btnPill(n.urineAnalysis?.protein === p, p === '3+' || p === '2+', p === 'Trace' || p === '1+')}
                                    >
                                        {p === '3+' || p === '2+' ? '🔴 ' : ''}{p}
                                    </button>
                                ))}
                            </div>
                            {n.urineAnalysis?.protein && ['2+', '3+'].includes(n.urineAnalysis.protein) && (
                                <p className="mt-2 text-[10px] font-black text-red-600">
                                    ⚠️ Significant Proteinuria ({n.urineAnalysis.protein}) — Evaluate for Nephrotic Syndrome
                                </p>
                            )}
                        </div>

                        {/* Sugar */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Sugar (Glycosuria)</label>
                            <div className="flex gap-3">
                                {BINARY_OPTIONS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('urineAnalysis', 'sugar', opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            n.urineAnalysis?.sugar === opt
                                                ? opt === 'Present' ? 'bg-amber-500 text-white shadow-md' : 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>

                        {/* RBC */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">RBC (Haematuria)</label>
                            <div className="flex gap-3">
                                {BINARY_OPTIONS.map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => updateNested('urineAnalysis', 'rbc', opt)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            n.urineAnalysis?.rbc === opt
                                                ? opt === 'Present' ? 'bg-red-500 text-white shadow-md' : 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >{opt}</button>
                                ))}
                            </div>
                            {n.urineAnalysis?.rbc === 'Present' && (
                                <p className="mt-2 text-[10px] font-black text-red-600">
                                    🩸 Haematuria present — Evaluate for glomerulonephritis, nephrolithiasis, or malignancy
                                </p>
                            )}
                        </div>
                    </div>
                </>,
                'border-slate-200',
            )}

            {/* ── E. FLUID BALANCE ──────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Activity size={17} />, 'E. Fluid Balance (24h)')}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-blue-500">
                                💧 Intake (ml/24h)
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="2000"
                                value={n.fluidBalance?.intake || ''}
                                onChange={e => updateNested('fluidBalance', 'intake', e.target.value)}
                                className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-xl font-black text-center text-blue-800 focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                            <span className="text-[8px] text-blue-400 mt-1 block">ml</span>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
                            <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-indigo-500">
                                💦 Output (ml/24h)
                            </label>
                            <input
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="1500"
                                value={n.fluidBalance?.output || ''}
                                onChange={e => updateNested('fluidBalance', 'output', e.target.value)}
                                className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xl font-black text-center text-indigo-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                            />
                            <span className="text-[8px] text-indigo-400 mt-1 block">ml</span>
                        </div>
                    </div>
                    {intake > 0 && outflow > 0 && (
                        <div className={`mt-3 p-3 rounded-xl border text-center ${intake > outflow * 1.25 ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
                            <span className={`text-[10px] font-black uppercase ${intake > outflow * 1.25 ? 'text-red-700' : 'text-emerald-700'}`}>
                                Balance: {intake > outflow ? '+' : ''}{(intake - outflow).toFixed(0)} ml/24h &nbsp;
                                {intake > outflow * 1.25 ? '⚠️ Positive Balance — Fluid Overload Risk' : '✓ Balanced'}
                            </span>
                        </div>
                    )}
                </>,
                'border-blue-100',
            )}

            {/* ── F. EDEMA ──────────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Wind size={17} />, 'F. Pedal Edema / Anasarca')}
                    <div className="flex gap-2">
                        {EDEMA_OPTIONS.map(opt => (
                            <button key={opt} type="button"
                                onClick={() => update('edema', opt)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    n.edema === opt
                                        ? opt === 'None' ? 'bg-emerald-500 text-white shadow-md'
                                          : opt === 'Trace' ? 'bg-blue-400 text-white shadow-md'
                                          : ['1+', '2+'].includes(opt) ? 'bg-amber-500 text-white shadow-md'
                                          : 'bg-red-600 text-white shadow-md'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >{opt}</button>
                        ))}
                    </div>
                    {n.edema && ['3+', '4+'].includes(n.edema) && (
                        <p className="mt-3 text-[10px] font-black text-red-600">
                            🚨 Severe oedema ({n.edema}) — Rule out nephrotic syndrome, cardiac failure, hypoalbuminaemia
                        </p>
                    )}
                </>,
                'border-slate-200',
            )}

            {/* ── G. DIALYSIS (structured) ──────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Heart size={17} />, 'G. Dialysis Status')}

                    {/* Status selector */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        {DIALYSIS_STATUS.map(status => (
                            <button key={status} type="button"
                                onClick={() => updateNested('dialysis', 'status', status)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    n.dialysis?.status === status
                                        ? status === 'Not on dialysis' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                          : status === 'Hemodialysis' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                          : 'bg-violet-600 text-white border-violet-600 shadow-md'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {status === 'Not on dialysis' ? '✓ Not on Dialysis'
                                    : status === 'Hemodialysis' ? '🩸 Hemodialysis'
                                    : '💧 Peritoneal Dialysis'}
                            </button>
                        ))}
                    </div>

                    {/* Conditional: Hemodialysis fields */}
                    {n.dialysis?.status === 'Hemodialysis' && (
                        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Hemodialysis Details</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-slate-500">Frequency</label>
                                    <input type="text" placeholder="e.g. 2/week"
                                        value={n.dialysis?.frequency || ''}
                                        onChange={e => updateNested('dialysis', 'frequency', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-slate-500">Last Session Date</label>
                                    <input type="date"
                                        value={n.dialysis?.lastSession || ''}
                                        onChange={e => updateNested('dialysis', 'lastSession', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">Access Type</label>
                                    <div className="flex gap-2">
                                        {DIALYSIS_ACCESS.map(acc => (
                                            <button key={acc} type="button"
                                                onClick={() => updateNested('dialysis', 'access', acc)}
                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                                    n.dialysis?.access === acc
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >{acc}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dialysis alert when indicated but not on it */}
                    {egfr > 0 && egfr < 15 && n.dialysis?.status === 'Not on dialysis' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2">
                            <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black text-red-700 uppercase">
                                🚨 eGFR &lt;15 ml/min + Not on Dialysis — Dialysis may be imminently required. Urgent nephrology referral.
                            </p>
                        </div>
                    )}
                </>,
                'border-violet-100',
            )}

            {/* ── H. SYMPTOMS ───────────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<ClipboardList size={17} />, 'H. Presenting Symptoms', false, 'select all that apply')}
                    <div className="flex flex-wrap gap-2">
                        {SYMPTOMS.map(sym => {
                            const isDanger = sym === 'Confusion' || sym === 'Breathlessness';
                            const isWarn   = sym === 'Reduced urine' || sym === 'Swelling';
                            return (
                                <button key={sym} type="button"
                                    onClick={() => toggleSymptom(sym)}
                                    className={btnPill(syms.includes(sym), isDanger, isWarn)}
                                >
                                    {isDanger ? '🔴 ' : isWarn ? '⚠️ ' : ''}{sym}
                                </button>
                            );
                        })}
                    </div>
                    {syms.includes('Confusion') && creat > 1.5 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-xl">
                            <p className="text-[10px] font-black text-red-700 uppercase">🚨 Uremic Encephalopathy — Confusion + Elevated Creatinine. Urgent dialysis evaluation.</p>
                        </div>
                    )}
                </>,
                'border-slate-200',
            )}

            {/* ── I. CKD STAGING ───────────────────────────────────────── */}
            {sectionCard(
                <>
                    {sectionHeader(<Brain size={17} />, 'I. CKD Stage', false, 'auto-calculated from eGFR')}
                    <div className="flex gap-2">
                        {['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'].map(stage => (
                            <button key={stage} type="button"
                                onClick={() => update('ckdStage', stage)}
                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                                    n.ckdStage === stage
                                        ? stage === 'Stage 1' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                          : stage === 'Stage 2' ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                          : stage === 'Stage 3' ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                          : stage === 'Stage 4' ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                          : 'bg-red-600 text-white border-red-600 shadow-md'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {stage.replace('Stage ', 'S')}<br />
                                <span className="text-[7px] opacity-70">
                                    {stage === 'Stage 1' ? '≥90' : stage === 'Stage 2' ? '60-89' : stage === 'Stage 3' ? '30-59' : stage === 'Stage 4' ? '15-29' : '<15'}
                                </span>
                            </button>
                        ))}
                    </div>
                    {n.ckdStage === 'Stage 5' && (
                        <p className="mt-2 text-[10px] font-black text-red-600">Stage 5 = End-Stage Renal Disease (ESRD) — Dialysis or transplant evaluation required</p>
                    )}
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
                        value={n.notes || ''}
                        onChange={e => update('notes', e.target.value)}
                        rows={3}
                        placeholder="Additional clinical findings, AKI staging, cause of CKD, specialist referral notes..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none outline-none"
                    />
                </>,
                'border-slate-200',
            )}

            {/* ── Pharma Warning Banner ─────────────────────────────────── */}
            {(creat > 1.5 || egfr < 60 || k > 5.5) ? (
                <div className="bg-red-600 rounded-2xl p-4 text-white flex items-start gap-3 shadow-lg">
                    <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">💊 Pharma Warning — Renal Impairment</p>
                        <p className="text-[10px] font-bold text-red-50">
                            {creat > 1.5 && 'Dose adjustment required for renally-cleared medications. '}
                            {(egfr < 60) && 'AVOID NSAIDs (Ibuprofen, Diclofenac, Naproxen), nephrotoxic antibiotics (Aminoglycosides), contrast agents. '}
                            {k > 5.5 && 'K+ ELEVATED — AVOID potassium-sparing diuretics, ACE inhibitors, ARBs, potassium supplements.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-indigo-700/10 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
                    <ThumbsUp size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700 mb-1">💊 Pharma Reminder — Renal Condition</p>
                        <p className="text-[10px] font-bold text-indigo-700">
                            Ensure adequate hydration. Avoid unnecessary NSAIDs. Review all drug doses against current renal function.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Patient-Friendly Summary ──────────────────────────────── */}
            {(creat > 0 || uo > 0 || ckdStage) && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-indigo-900 mt-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={16} className="text-indigo-600" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Kidney Summary (Patient-Friendly)</h3>
                    </div>
                    <div className="space-y-1.5 text-sm font-medium text-indigo-800">
                        {ckdStage && (
                            <p>🫁 Kidney stage: <span className={`font-bold ${ckdStage === 'Stage 5' ? 'text-red-600' : ckdStage === 'Stage 4' ? 'text-orange-600' : ckdStage === 'Stage 3' ? 'text-amber-600' : 'text-emerald-600'}`}>CKD {ckdStage}</span></p>
                        )}
                        {creat > 1.5 && (
                            <p>🧪 Kidney function: <span className={`font-bold ${creat > 5 ? 'text-red-600' : 'text-amber-600'}`}>{creat > 5 ? 'Severely reduced' : 'Reduced'}</span></p>
                        )}
                        {uo > 0 && uo < 400 && (
                            <p>🚽 Urine output: <span className="font-bold text-amber-600">{uo < 100 ? 'Almost absent (Anuria)' : 'Reduced (Oliguria)'}</span></p>
                        )}
                        {n.edema && n.edema !== 'None' && (
                            <p>🦵 Swelling: <span className="font-bold text-amber-600">Present ({n.edema})</span></p>
                        )}
                        {k > 5.5 && (
                            <p>⚡ Potassium level: <span className="font-bold text-red-400">High — medication caution required</span></p>
                        )}
                        {n.dialysis?.status && n.dialysis.status !== 'Not on dialysis' && (
                            <p>💉 Dialysis: <span className="font-bold text-indigo-300">{n.dialysis.status}</span></p>
                        )}
                        {syms.length > 0 && (
                            <p>🤒 Symptoms: <span className="text-white font-bold">{syms.join(', ')}</span></p>
                        )}
                        <p className="mt-2 text-indigo-300 font-bold text-xs">
                            📌 Advice: Follow fluid restriction and medication schedule strictly as prescribed by your doctor.
                            Avoid painkillers (NSAIDs) without medical advice.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
};
