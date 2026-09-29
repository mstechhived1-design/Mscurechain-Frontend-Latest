'use client';

import React, { useEffect, useState } from 'react';
import { Ear, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface ENTModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

// ─── Validation Alert Types ───────────────────────────────────────────────────
type AlertType = 'critical' | 'warning' | 'info';
interface ClinicalAlert {
    field: string;
    message: string;
    type: AlertType;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const alertStyle: Record<AlertType, string> = {
    critical: 'bg-red-50 border border-red-200 text-red-700',
    warning:  'bg-amber-50 border border-amber-200 text-amber-700',
    info:     'bg-sky-50 border border-sky-200 text-sky-700',
};
const alertIcon = (type: AlertType) => {
    if (type === 'critical') return <XCircle size={12} className="shrink-0" />;
    if (type === 'warning')  return <AlertTriangle size={12} className="shrink-0" />;
    return <Info size={12} className="shrink-0" />;
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
        {children}
    </p>
);

// ─── Pill Toggle ──────────────────────────────────────────────────────────────
interface PillProps {
    label: string;
    active: boolean;
    onClick: () => void;
    color?: 'sky' | 'rose' | 'amber' | 'slate';
    disabled?: boolean;
}
const Pill: React.FC<PillProps> = ({ label, active, onClick, color = 'sky', disabled }) => {
    const colors = {
        sky:   active ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-200' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300',
        rose:  active ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300',
        amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300',
        slate: active ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-400',
    };
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all duration-150 ${colors[color]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            {label}
        </button>
    );
};

// ─── Radio Group ──────────────────────────────────────────────────────────────
interface RadioGroupProps {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    color?: 'sky' | 'rose' | 'amber' | 'slate';
    inline?: boolean;
}
const RadioGroup: React.FC<RadioGroupProps> = ({ options, value, onChange, color = 'sky', inline }) => (
    <div className={`flex ${inline ? 'flex-wrap' : 'flex-col'} gap-2`}>
        {options.map(opt => (
            <Pill key={opt} label={opt} active={value === opt} onClick={() => onChange(value === opt ? '' : opt)} color={color} />
        ))}
    </div>
);

// ─── Ear Side Panel ───────────────────────────────────────────────────────────
interface EarPanelProps {
    side: 'left' | 'right';
    data: any;
    update: (side: 'left' | 'right', field: string, value: any) => void;
    alerts: ClinicalAlert[];
}
const EarPanel: React.FC<EarPanelProps> = ({ side, data, update, alerts }) => {
    const d = data || {};
    const label = side === 'left' ? '👂 Left Ear' : '👂 Right Ear';
    const color = side === 'left' ? 'sky' : 'rose';

    const toggleCanal = (val: string) => {
        const curr: string[] = d.earCanal || [];
        // Clear vs other: mutually exclusive
        if (val === 'Clear') {
            update(side, 'earCanal', curr.includes('Clear') ? [] : ['Clear']);
            return;
        }
        const next = curr.includes(val)
            ? curr.filter((v: string) => v !== val)
            : [...curr.filter((v: string) => v !== 'Clear'), val];
        update(side, 'earCanal', next);
    };

    const canalAlert = alerts.find(a => a.field === `canal-${side}`);

    return (
        <div className={`bg-white rounded-2xl border-2 p-5 space-y-4 transition-all ${canalAlert ? 'border-amber-200' : 'border-slate-100'} shadow-sm`}>
            <h4 className={`text-[11px] font-black uppercase tracking-widest ${color === 'sky' ? 'text-sky-600' : 'text-rose-600'}`}>{label}</h4>

            {/* External Ear */}
            <div>
                <SectionLabel>External Ear</SectionLabel>
                <RadioGroup
                    options={['Normal', 'Infection', 'Swelling']}
                    value={d.externalEar || ''}
                    onChange={v => update(side, 'externalEar', v)}
                    color={color}
                    inline
                />
            </div>

            {/* Ear Canal */}
            <div>
                <SectionLabel>Ear Canal</SectionLabel>
                <div className="flex flex-wrap gap-2">
                    {['Clear', 'Wax', 'Discharge', 'Foreign Body'].map(opt => (
                        <Pill
                            key={opt}
                            label={opt}
                            active={(d.earCanal || []).includes(opt)}
                            onClick={() => toggleCanal(opt)}
                            color={color}
                            disabled={opt !== 'Clear' && (d.earCanal || []).includes('Clear')}
                        />
                    ))}
                </div>
                {canalAlert && (
                    <p className={`mt-1.5 text-[9px] font-bold flex items-center gap-1 ${alertStyle[canalAlert.type]} px-2 py-1 rounded-lg`}>
                        {alertIcon(canalAlert.type)} {canalAlert.message}
                    </p>
                )}
            </div>

            {/* Tympanic Membrane */}
            <div>
                <SectionLabel>Tympanic Membrane (TM)</SectionLabel>
                <RadioGroup
                    options={['Normal', 'Perforated', 'Retracted', 'Bulging']}
                    value={d.tympanicMembrane || ''}
                    onChange={v => update(side, 'tympanicMembrane', v)}
                    color={color}
                    inline
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════════════════════
export const ENTModule: React.FC<ENTModuleProps> = ({ formData, setFormData }) => {
    const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);

    if (!formData.entData) return null;

    const ent = formData.entData;

    // ─── Updaters ─────────────────────────────────────────────────────────────
    const updateRoot = (field: string, value: any) =>
        setFormData((p: any) => ({ ...p, entData: { ...p.entData, [field]: value } }));

    const updateNested = (section: string, field: string, value: any) =>
        setFormData((p: any) => ({
            ...p,
            entData: { ...p.entData, [section]: { ...p.entData?.[section], [field]: value } },
        }));

    const updateEar = (side: 'left' | 'right', field: string, value: any) =>
        setFormData((p: any) => ({
            ...p,
            entData: {
                ...p.entData,
                ear: {
                    ...p.entData?.ear,
                    [side]: { ...p.entData?.ear?.[side], [field]: value },
                },
            },
        }));

    const toggleSymptom = (sym: string) => {
        const curr: string[] = ent.symptoms || [];
        const next = curr.includes(sym) ? curr.filter((s: string) => s !== sym) : [...curr, sym];
        updateRoot('symptoms', next);
    };

    const toggleTuningFork = (test: string) => {
        const curr: string[] = ent.hearing?.tuningForkTest || [];
        const next = curr.includes(test) ? curr.filter((t: string) => t !== test) : [...curr, test];
        updateNested('hearing', 'tuningForkTest', next);
    };

    // ─── Validation Engine ────────────────────────────────────────────────────
    useEffect(() => {
        const msgs: ClinicalAlert[] = [];
        const ear = ent.ear || {};
        const nose = ent.nose || {};
        const throat = ent.throat || {};
        const lymph = ent.lymphNodes || {};
        const hearing = ent.hearing || {};
        const voice = ent.voice || {};

        // Ear Canal: Clear + anything else
        ['left', 'right'].forEach(side => {
            const canal: string[] = ear[side]?.earCanal || [];
            if (canal.includes('Clear') && canal.length > 1) {
                msgs.push({ field: `canal-${side}`, message: `${side} ear: 'Clear' and other findings are mutually exclusive`, type: 'warning' });
            }
            // TM conflict
            const validTMs = ['Normal', 'Perforated', 'Bulging', 'Retracted'];
            const tm = ear[side]?.tympanicMembrane;
            if (tm && !validTMs.includes(tm)) {
                msgs.push({ field: `tm-${side}`, message: `Invalid TM finding on ${side}`, type: 'critical' });
            }
        });

        // Nasal: discharge = None → no infection
        if (nose.discharge === 'None' && (nose.mucosa === 'Inflamed' || nose.mucosa === 'Congested')) {
            msgs.push({ field: 'nose', message: "Nasal mucosa shows inflammation but discharge is 'None' — review findings", type: 'warning' });
        }

        // Lymph nodes: if Enlarged → size & tenderness required
        if (lymph.cervical === 'Enlarged') {

        }

        // Hearing reduced/absent → tuning fork required
        if ((hearing.status === 'Reduced' || hearing.status === 'Absent') && (!hearing.tuningForkTest || hearing.tuningForkTest.length === 0)) {
            msgs.push({ field: 'hearing', message: 'Reduced/absent hearing requires a tuning fork test', type: 'warning' });
        }

        // Voice hoarseness + chronic → possible vocal cord pathology
        if (voice.quality === 'Hoarseness' && ent.duration === 'Chronic') {
            msgs.push({ field: 'voice', message: 'Possible vocal cord pathology — consider laryngoscopy / ENT referral', type: 'critical' });
        }

        // Cross-field — CSOM
        const leftDischarge  = (ear.left?.earCanal  || []).includes('Discharge');
        const rightDischarge = (ear.right?.earCanal || []).includes('Discharge');
        const leftPerforated  = ear.left?.tympanicMembrane  === 'Perforated';
        const rightPerforated = ear.right?.tympanicMembrane === 'Perforated';
        if ((leftDischarge && leftPerforated) || (rightDischarge && rightPerforated)) {
            msgs.push({ field: 'csom', message: 'Chronic Suppurative Otitis Media (CSOM) risk — ear discharge + perforated TM', type: 'critical' });
        }

        // Cross-field — Bacterial tonsillitis suggestion
        if (throat.tonsils === 'With Pus' && (ent.symptoms || []).includes('Sore Throat')) {
            msgs.push({ field: 'tonsil', message: 'Likely bacterial tonsillitis — consider throat swab + antibiotic', type: 'warning' });
        }

        // Cross-field — Sinusitis
        if (nose.mucosa !== 'Normal' && nose.discharge === 'Purulent') {
            msgs.push({ field: 'sinus', message: 'Possible sinus infection (sinusitis) — purulent nasal discharge with congestion', type: 'warning' });
        }

        // Cross-field — Malignancy rule-out
        if (lymph.cervical === 'Enlarged' && lymph.mobility === 'Fixed' && ent.duration === 'Chronic') {
            msgs.push({ field: 'malignancy', message: '⚠ Rule out malignancy — fixed, enlarged cervical nodes with chronic duration', type: 'critical' });
        }

        setAlerts(msgs);
    }, [ent]);

    const getAlert = (field: string) => alerts.find(a => a.field === field);
    const globalAlerts = alerts.filter(a => ['csom', 'tonsil', 'sinus', 'malignancy'].includes(a.field));

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* Standardized Light Header */}
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                        <Ear size={20} className="text-violet-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-violet-700">ENT Examination</h2>
                        <p className="text-[9px] font-bold text-violet-600/60 uppercase tracking-widest">Ear, Nose & Throat Assessment Profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {alerts.length > 0 && (
                        <div className="bg-violet-100/50 px-3 py-2 rounded-lg flex items-center gap-2 border border-violet-200 hidden md:flex">
                             <AlertTriangle size={14} className="text-violet-600" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">Safety Alerts Active</span>
                        </div>
                    )}
                    <div className="bg-white border border-violet-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-violet-600">
                        ENT - Module
                    </div>
                </div>
            </div>

            {/* ── GLOBAL CLINICAL ALERTS ── */}
            {globalAlerts.length > 0 && (
                <div className="space-y-2">
                    {globalAlerts.map((a, i) => (
                        <div key={i} className={`flex items-start gap-2 px-4 py-3 rounded-xl text-[10px] font-bold ${alertStyle[a.type]} animate-in fade-in slide-in-from-top-2`}>
                            {alertIcon(a.type)}
                            <span>{a.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── H. DURATION ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 bg-cyan-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Duration of Illness</h3>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border-2 border-slate-100 max-w-xs">
                    {[['Acute', '< 2 wks'], ['Subacute', '2–12 wks'], ['Chronic', '> 3 mos']].map(([val, sub]) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => updateRoot('duration', ent.duration === val ? '' : val)}
                            className={`flex-1 py-3 rounded-xl transition-all text-center ${ent.duration === val
                                ? 'bg-white text-sky-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <div className="text-[10px] font-black uppercase">{val}</div>
                            <div className="text-[8px] font-bold text-slate-400">{sub}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── A. EAR EXAMINATION ── */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-5 bg-sky-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">A. Otoscopy — Ear Examination</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EarPanel side="left"  data={ent.ear?.left}  update={updateEar} alerts={alerts} />
                    <EarPanel side="right" data={ent.ear?.right} update={updateEar} alerts={alerts} />
                </div>

                {/* CSOM inline alert */}
                {getAlert('csom') && (
                    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-[10px] font-bold ${alertStyle['critical']}`}>
                        {alertIcon('critical')} {getAlert('csom')?.message}
                    </div>
                )}
            </div>

            {/* ── B. HEARING ASSESSMENT ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">B. Hearing Assessment</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <SectionLabel>Hearing Status</SectionLabel>
                        <RadioGroup
                            options={['Normal', 'Reduced', 'Absent']}
                            value={ent.hearing?.status || ''}
                            onChange={v => updateNested('hearing', 'status', v)}
                            color="sky"
                            inline
                        />
                    </div>
                    <div>
                        <SectionLabel>Tuning Fork Test</SectionLabel>
                        <div className="flex flex-wrap gap-2">
                            {['Rinne Positive', 'Rinne Negative', 'Weber Central', 'Weber Lateralized'].map(t => (
                                <Pill
                                    key={t}
                                    label={t}
                                    active={(ent.hearing?.tuningForkTest || []).includes(t)}
                                    onClick={() => toggleTuningFork(t)}
                                    color="slate"
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {getAlert('hearing') && (
                    <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['warning']}`}>
                        {alertIcon('warning')} {getAlert('hearing')?.message}
                    </div>
                )}
            </div>

            {/* ── C. NOSE EXAMINATION ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-teal-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">C. Nasal Examination</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <SectionLabel>Nasal Mucosa</SectionLabel>
                        <RadioGroup
                            options={['Normal', 'Congested', 'Inflamed']}
                            value={ent.nose?.mucosa || ''}
                            onChange={v => updateNested('nose', 'mucosa', v)}
                            color="sky"
                        />
                    </div>
                    <div>
                        <SectionLabel>Nasal Septum</SectionLabel>
                        <RadioGroup
                            options={['Midline', 'Deviated']}
                            value={ent.nose?.septum || ''}
                            onChange={v => updateNested('nose', 'septum', v)}
                            color="sky"
                        />
                    </div>
                    <div>
                        <SectionLabel>Nasal Discharge</SectionLabel>
                        <RadioGroup
                            options={['None', 'Serous', 'Purulent', 'Bloody']}
                            value={ent.nose?.discharge || ''}
                            onChange={v => updateNested('nose', 'discharge', v)}
                            color="amber"
                        />
                    </div>
                </div>
                {getAlert('nose') && (
                    <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['warning']}`}>
                        {alertIcon('warning')} {getAlert('nose')?.message}
                    </div>
                )}
                {getAlert('sinus') && (
                    <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['warning']}`}>
                        {alertIcon('warning')} {getAlert('sinus')?.message}
                    </div>
                )}
            </div>

            {/* ── D. THROAT / ORAL CAVITY ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">D. Throat / Oral Cavity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <SectionLabel>Tonsils</SectionLabel>
                        <RadioGroup
                            options={['Normal', 'Enlarged', 'With Pus']}
                            value={ent.throat?.tonsils || ''}
                            onChange={v => updateNested('throat', 'tonsils', v)}
                            color="rose"
                        />
                    </div>
                    <div>
                        <SectionLabel>Pharynx</SectionLabel>
                        <RadioGroup
                            options={['Normal', 'Congested', 'Inflamed']}
                            value={ent.throat?.pharynx || ''}
                            onChange={v => updateNested('throat', 'pharynx', v)}
                            color="rose"
                        />
                    </div>
                    <div>
                        <SectionLabel>Uvula</SectionLabel>
                        <RadioGroup
                            options={['Central', 'Deviated']}
                            value={ent.throat?.uvula || ''}
                            onChange={v => updateNested('throat', 'uvula', v)}
                            color="rose"
                        />
                    </div>
                </div>
                {getAlert('tonsil') && (
                    <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['warning']}`}>
                        {alertIcon('warning')} {getAlert('tonsil')?.message}
                    </div>
                )}
            </div>

            {/* ── E. LYMPH NODES ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">E. Cervical Lymph Nodes</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <SectionLabel>Palpation Finding</SectionLabel>
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border-2 border-slate-100 max-w-xs">
                            {['Not Palpable', 'Enlarged'].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => updateNested('lymphNodes', 'cervical', ent.lymphNodes?.cervical === opt ? '' : opt)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        ent.lymphNodes?.cervical === opt
                                            ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditional fields when Enlarged */}
                    {ent.lymphNodes?.cervical === 'Enlarged' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-violet-50 border border-violet-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                            {/* Size */}
                            <div>
                                <SectionLabel>Size (cm) *</SectionLabel>
                                <div className="relative">
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        step="0.1"
                                        max="15"
                                        placeholder="e.g. 1.5"
                                        value={ent.lymphNodes?.sizeCm || ''}
                                        onChange={e => updateNested('lymphNodes', 'sizeCm', e.target.value ? parseFloat(e.target.value) : '')}
                                        className="w-full bg-white border-2 border-violet-200 rounded-xl p-3 pr-10 text-sm font-black text-slate-700 outline-none focus:border-violet-500 transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">cm</span>
                                </div>
                            </div>

                            {/* Tender */}
                            <div>
                                <SectionLabel>Tenderness *</SectionLabel>
                                <div className="flex gap-2">
                                    {['Yes', 'No'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => updateNested('lymphNodes', 'tender', ent.lymphNodes?.tender === opt ? '' : opt)}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                                ent.lymphNodes?.tender === opt
                                                    ? opt === 'Yes' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-green-500 border-green-500 text-white'
                                                    : 'bg-white border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobility */}
                            <div>
                                <SectionLabel>Mobility</SectionLabel>
                                <div className="flex gap-2">
                                    {['Mobile', 'Fixed'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => updateNested('lymphNodes', 'mobility', ent.lymphNodes?.mobility === opt ? '' : opt)}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                                ent.lymphNodes?.mobility === opt
                                                    ? opt === 'Fixed' ? 'bg-rose-700 border-rose-700 text-white shadow-md' : 'bg-violet-600 border-violet-600 text-white shadow-md'
                                                    : 'bg-white border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lymph alerts */}
                    {getAlert('lymph') && (
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['warning']}`}>
                            {alertIcon('warning')} {getAlert('lymph')?.message}
                        </div>
                    )}
                    {getAlert('malignancy') && (
                        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-[10px] font-bold ${alertStyle['critical']}`}>
                            {alertIcon('critical')} {getAlert('malignancy')?.message}
                        </div>
                    )}
                </div>
            </div>

            {/* ── F. VOICE / AIRWAY ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">F. Voice &amp; Airway</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <SectionLabel>Voice Quality</SectionLabel>
                        <RadioGroup
                            options={['Normal', 'Hoarseness', 'Aphonia']}
                            value={ent.voice?.quality || ''}
                            onChange={v => updateNested('voice', 'quality', v)}
                            color="amber"
                            inline
                        />
                    </div>
                    <div>
                        <SectionLabel>Airway Status</SectionLabel>
                        <div className="flex gap-3">
                            {['Patent', 'Obstructed'].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => updateNested('voice', 'airway', ent.voice?.airway === opt ? '' : opt)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                        ent.voice?.airway === opt
                                            ? opt === 'Obstructed' ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-green-600 border-green-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {getAlert('voice') && (
                    <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle['critical']}`}>
                        {alertIcon('critical')} {getAlert('voice')?.message}
                    </div>
                )}
            </div>

            {/* ── NOTES ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 bg-slate-400 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Additional Clinical Notes</h3>
                </div>
                <textarea
                    value={ent.notes || ''}
                    onChange={e => updateRoot('notes', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 resize-none transition-all shadow-inner"
                    placeholder="Additional ENT clinical observations, referral notes, or follow-up instructions..."
                    rows={3}
                />
            </div>

            {/* ── SUMMARY STRIP ── */}
            {alerts.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Validation Summary</p>
                    <div className="space-y-1.5">
                        {alerts.map((a, i) => (
                            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${alertStyle[a.type]}`}>
                                {alertIcon(a.type)} {a.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PHARMA WARNING STRIP ── */}
            {(alerts.some(a => a.field === 'tonsil' || a.field === 'sinus' || a.field === 'csom')) && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-700">
                        Infection suspected — ensure antibiotic compliance if prescribed
                    </p>
                </div>
            )}
        </div>
    );
};
