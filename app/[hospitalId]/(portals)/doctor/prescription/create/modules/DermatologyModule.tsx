'use client';

import React from 'react';
import { Layers, MapPin, Eye, Activity, Clock, Stethoscope } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DermatologyData {
    // A. Lesion Details
    lesionType: string;
    lesionCount: string;
    size: string;

    // B. Location & Distribution
    location: string[];
    distribution: string;

    // C. Appearance & Surface
    color: string[];
    surfaceChanges: string[];

    // D. Symptoms
    itchingSeverity: 'None' | 'Mild' | 'Moderate' | 'Severe';
    painSeverity: 'None' | 'Mild' | 'Moderate' | 'Severe';
    burning: boolean;

    // E. Duration & Progression
    duration: string;
    onset: 'Acute' | 'Chronic' | '';
    progression: 'Improving' | 'Worsening' | 'Stable' | '';

    // F. Provisional Diagnosis
    provisionalDiagnosis: string;
}

export const INITIAL_DERMATOLOGY_DATA: DermatologyData = {
    lesionType: '',
    lesionCount: '',
    size: '',
    location: [],
    distribution: '',
    color: [],
    surfaceChanges: [],
    itchingSeverity: 'None',
    painSeverity: 'None',
    burning: false,
    duration: '',
    onset: '',
    progression: '',
    provisionalDiagnosis: '',
};

// ── Constants ─────────────────────────────────────────────────────────────────

const LESION_TYPES = ['Macule', 'Papule', 'Plaque', 'Vesicle', 'Bulla', 'Nodule', 'Pustule'];
const BODY_LOCATIONS = ['Face', 'Neck', 'Chest', 'Back', 'Arms', 'Legs', 'Scalp', 'Genital'];
const DISTRIBUTION_PATTERNS = ['Localized', 'Generalized', 'Symmetrical', 'Asymmetrical'];
const COLORS = ['Erythematous', 'Hyperpigmented', 'Hypopigmented', 'Skin-colored'];
const SURFACE_CHANGES = ['Scaling', 'Crusting', 'Ulceration', 'Oozing'];
const SEVERITY_LEVELS = ['None', 'Mild', 'Moderate', 'Severe'] as const;
const PROVISIONAL_DIAGNOSES = [
    'Psoriasis',
    'Eczema / Atopic Dermatitis',
    'Acne Vulgaris',
    'Tinea Corporis (Ringworm)',
    'Tinea Versicolor',
    'Urticaria (Hives)',
    'Contact Dermatitis',
    'Seborrheic Dermatitis',
    'Rosacea',
    'Vitiligo',
    'Melasma',
    'Folliculitis',
    'Herpes Zoster (Shingles)',
    'Molluscum Contagiosum',
    'Pityriasis Rosea',
    'Drug Rash / Fixed Drug Eruption',
    'Scabies',
    'Pemphigus Vulgaris',
    'Lichen Planus',
    'Other',
];

// ── Helper sub-components ─────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, label, color }: { icon: any; label: string; color: string }) => (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-amber-100`}>
        <Icon size={15} className={color} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">{label}</h3>
    </div>
);

const severityColor = (level: string) => {
    switch (level) {
        case 'None': return 'bg-slate-100 text-slate-600 border-slate-200';
        case 'Mild': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'Moderate': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'Severe': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

// ── Main Component ─────────────────────────────────────────────────────────────

interface DermatologyModuleProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const DermatologyModule: React.FC<DermatologyModuleProps> = ({ formData, setFormData }) => {
    const dermData = formData.dermatologyData || {};
    const derm: DermatologyData = {
        ...INITIAL_DERMATOLOGY_DATA,
        ...dermData,
        location: Array.isArray(dermData.location) ? dermData.location : (dermData.location ? [dermData.location] : []),
        color: Array.isArray(dermData.color) ? dermData.color : (dermData.color ? [dermData.color] : []),
        surfaceChanges: Array.isArray(dermData.surfaceChanges) ? dermData.surfaceChanges : (dermData.surfaceChanges ? [dermData.surfaceChanges] : []),
    };

    const update = (patch: Partial<DermatologyData>) =>
        setFormData((p: any) => ({
            ...p,
            dermatologyData: { ...p.dermatologyData, ...patch },
        }));

    const toggleArrayItem = (field: 'location' | 'color' | 'surfaceChanges', item: string) => {
        const current: string[] = derm[field] ?? [];
        const next = current.includes(item)
            ? current.filter((i) => i !== item)
            : [...current, item];
        update({ [field]: next });
    };

    if (!formData.dermatologyData) return null;

    return (
        <div className="space-y-5">
            {/* Standardized Light Header */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Layers size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-amber-700">Dermatology Assessment</h2>
                        <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest">Structured Skin Examination Profile</p>
                    </div>
                </div>
                <div className="bg-white border border-amber-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-amber-600">
                    Derm - Module
                </div>
            </div>

            {/* ── A. Lesion Details ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={Layers} label="A — Lesion Details" color="text-amber-600" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Lesion Type */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Lesion Type
                        </label>
                        <select
                            value={derm.lesionType}
                            onChange={(e) => update({ lesionType: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                        >
                            <option value="">-- Select Type --</option>
                            {LESION_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Number of Lesions */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Number of Lesions
                        </label>
                        <input
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            placeholder="e.g. 5"
                            value={derm.lesionCount}
                            onChange={(e) => update({ lesionCount: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                        />
                    </div>

                    {/* Size */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Size (cm / mm)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2 cm"
                            value={derm.size}
                            onChange={(e) => update({ size: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* ── B. Location & Distribution ────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={MapPin} label="B — Location & Distribution" color="text-orange-500" />
                <div className="space-y-4">
                    {/* Body Location multi-select chips */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Body Location
                            <span className="ml-2 text-amber-500 normal-case">(select all that apply)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {BODY_LOCATIONS.map((loc) => {
                                const active = derm.location?.includes(loc);
                                return (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => toggleArrayItem('location', loc)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                                            }`}
                                    >
                                        {loc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Distribution Pattern */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Distribution Pattern
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DISTRIBUTION_PATTERNS.map((pat) => {
                                const active = derm.distribution === pat;
                                return (
                                    <button
                                        key={pat}
                                        type="button"
                                        onClick={() => update({ distribution: active ? '' : pat })}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                                            }`}
                                    >
                                        {pat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── C. Appearance & Surface ──────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={Eye} label="C — Appearance & Surface" color="text-amber-500" />
                <div className="space-y-4">
                    {/* Color multi-select */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Color <span className="ml-1 text-amber-500 normal-case">(select all that apply)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((col) => {
                                const active = derm.color?.includes(col);
                                return (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => toggleArrayItem('color', col)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                            }`}
                                    >
                                        {col}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Surface Changes checkboxes */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Surface Changes
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {SURFACE_CHANGES.map((sc) => {
                                const checked = derm.surfaceChanges?.includes(sc);
                                return (
                                    <label key={sc} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all select-none ${checked
                                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleArrayItem('surfaceChanges', sc)}
                                            className="w-3.5 h-3.5 accent-indigo-600"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-wide">{sc}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── D. Symptoms ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={Activity} label="D — Symptoms" color="text-red-500" />
                <div className="space-y-4">
                    {/* Itching */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Itching (Pruritus)
                        </label>
                        <div className="flex gap-2">
                            {SEVERITY_LEVELS.map((lvl) => {
                                const active = derm.itchingSeverity === lvl;
                                return (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => update({ itchingSeverity: lvl as any })}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? `${severityColor(lvl)} border-current shadow-sm`
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {lvl}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pain */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Pain
                        </label>
                        <div className="flex gap-2">
                            {SEVERITY_LEVELS.map((lvl) => {
                                const active = derm.painSeverity === lvl;
                                return (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => update({ painSeverity: lvl as any })}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? `${severityColor(lvl)} border-current shadow-sm`
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {lvl}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Burning */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Burning Sensation
                        </label>
                        <div className="flex gap-2">
                            {(['Yes', 'No'] as const).map((opt) => {
                                const active = opt === 'Yes' ? derm.burning : !derm.burning;
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => update({ burning: opt === 'Yes' })}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? opt === 'Yes'
                                                ? 'bg-red-50 text-red-700 border-red-400 shadow-sm'
                                                : 'bg-green-50 text-green-700 border-green-400 shadow-sm'
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── E. Duration & Progression ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={Clock} label="E — Duration & Progression" color="text-purple-500" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Duration */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Duration
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2 weeks, 3 months"
                            value={derm.duration}
                            onChange={(e) => update({ duration: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 transition-all"
                        />
                    </div>

                    {/* Onset */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Onset
                        </label>
                        <div className="flex gap-2">
                            {(['Acute', 'Chronic'] as const).map((opt) => {
                                const active = derm.onset === opt;
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => update({ onset: active ? '' : opt })}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${active
                                            ? 'bg-purple-50 text-purple-700 border-purple-400 shadow-sm'
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-purple-200'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Progression */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            Progression
                        </label>
                        <div className="flex gap-1.5">
                            {(['Improving', 'Stable', 'Worsening'] as const).map((opt) => {
                                const active = derm.progression === opt;
                                const colors = {
                                    Improving: active ? 'bg-green-50 text-green-700 border-green-400 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-green-200',
                                    Stable: active ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-200',
                                    Worsening: active ? 'bg-red-50 text-red-700 border-red-400 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-red-200',
                                };
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => update({ progression: active ? '' : opt })}
                                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wide border-2 transition-all ${colors[opt]}`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── F. Provisional Diagnosis ──────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <SectionHeader icon={Stethoscope} label="F — Provisional Diagnosis" color="text-teal-600" />
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Select or type diagnosis
                    </label>
                    <select
                        value={derm.provisionalDiagnosis}
                        onChange={(e) => update({ provisionalDiagnosis: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                    >
                        <option value="">-- Select Provisional Diagnosis --</option>
                        {PROVISIONAL_DIAGNOSES.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    {/* Manual override input */}
                    {derm.provisionalDiagnosis === 'Other' && (
                        <input
                            type="text"
                            placeholder="Type diagnosis manually..."
                            className="mt-2 w-full bg-slate-50 border border-teal-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                            onChange={(e) => update({ provisionalDiagnosis: e.target.value })}
                        />
                    )}
                </div>
            </div>

            {/* ── Selected Summary Badge ─────────────────────────────────── */}
            {(derm.lesionType || derm.location.length > 0 || derm.provisionalDiagnosis) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2">Assessment Summary</p>
                    <div className="flex flex-wrap gap-2">
                        {derm.lesionType && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[9px] font-black uppercase">{derm.lesionType}</span>
                        )}
                        {derm.location?.map((l) => (
                            <span key={l} className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-[9px] font-black uppercase">{l}</span>
                        ))}
                        {derm.distribution && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[9px] font-black uppercase">{derm.distribution}</span>
                        )}
                        {derm.itchingSeverity !== 'None' && (
                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[9px] font-black uppercase">Itching: {derm.itchingSeverity}</span>
                        )}
                        {derm.onset && (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-[9px] font-black uppercase">{derm.onset}</span>
                        )}
                        {derm.progression && (
                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[9px] font-black uppercase">{derm.progression}</span>
                        )}
                        {derm.provisionalDiagnosis && derm.provisionalDiagnosis !== 'Other' && (
                            <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full text-[9px] font-black uppercase">{derm.provisionalDiagnosis}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
