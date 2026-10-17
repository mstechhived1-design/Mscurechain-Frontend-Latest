'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Pill,
    Plus,
    Trash2,
    Sparkles,
    FileText,
    Stethoscope,
    Activity,
    Search,
    Loader2
} from 'lucide-react';
import { DischargeMedicine, DischargeSummaryData } from '@/lib/utils/print-discharge-summary';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';

interface DischargeSummaryViewProps {
    data: DischargeSummaryData;
    onChange: (data: DischargeSummaryData) => void;
    patient?: any;
    admission?: any;
    reportData?: any;
}

/**
 * Autocomplete search input for medicines matching the hospital's pharmacy inventory
 */
function MedicineSearchInput({
    value,
    onChange,
    onSelect
}: {
    value: string;
    onChange: (val: string) => void;
    onSelect: (med: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (text: string) => {
        onChange(text);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!text || text.trim().length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        setLoading(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await helpdeskService.searchMedicines(text.trim());
                if (res && res.success && Array.isArray(res.data)) {
                    setSuggestions(res.data);
                    setOpen(res.data.length > 0);
                } else if (Array.isArray(res)) {
                    setSuggestions(res);
                    setOpen(res.length > 0);
                } else {
                    setSuggestions([]);
                    setOpen(false);
                }
            } catch (err) {
                console.error("Search medicines failed:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 250);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search pharma medicine... (e.g. Paracetamol, Asacol)"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) setOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 pr-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    {loading ? (
                        <Loader2 size={12} className="animate-spin text-indigo-500" />
                    ) : (
                        <Search size={12} />
                    )}
                </div>
            </div>

            {open && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-2.5 py-1 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between sticky top-0 z-10">
                        <span>Hospital Pharmacy Stock</span>
                        <span>{suggestions.length} items</span>
                    </div>
                    {suggestions.map((med, i) => {
                        const name = med.brand || med.name || 'Unknown';
                        const generic = med.generic || '';
                        const form = med.form || '';
                        const strength = med.strength || '';
                        const stock = med.stock ?? null;

                        return (
                            <button
                                key={med._id || i}
                                type="button"
                                onClick={() => {
                                    onSelect(med);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black text-slate-800 group-hover:text-indigo-600 truncate">
                                            {name}
                                        </span>
                                        {strength && (
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                                                {strength}
                                            </span>
                                        )}
                                        {form && (
                                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                                {form}
                                            </span>
                                        )}
                                    </div>
                                    {generic && (
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {generic}
                                        </p>
                                    )}
                                </div>
                                {stock !== null && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                        stock > 0 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {stock > 0 ? `Stock: ${stock}` : 'Pharma'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function DischargeSummaryView({
    data,
    onChange,
    patient,
    admission,
    reportData
}: DischargeSummaryViewProps) {
    const medsList = data.dischargeMedications || [];

    const handleMedChange = (index: number, field: keyof DischargeMedicine, value: string) => {
        const nextMeds = [...medsList];
        if (!nextMeds[index]) return;
        nextMeds[index] = { ...nextMeds[index], [field]: value };
        onChange({ ...data, dischargeMedications: nextMeds });
    };

    const handleAddMed = () => {
        const nextMeds = [...medsList];
        nextMeds.push({
            id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            medicineName: '',
            dose: '1 Tablet',
            frequency: 'BD (Morning, Night)',
            duration: '5 Days',
            quantity: '10'
        });
        onChange({ ...data, dischargeMedications: nextMeds });
    };

    const handleDeleteMed = (index: number) => {
        const nextMeds = [...medsList];
        nextMeds.splice(index, 1);
        onChange({ ...data, dischargeMedications: nextMeds });
    };

    const handleSelectPharmaMed = (index: number, med: any) => {
        const nextMeds = [...medsList];
        if (!nextMeds[index]) return;

        const namePart = med.brand || med.name || '';
        const genericPart = med.generic ? ` (${med.generic})` : '';
        const strengthPart = med.strength ? ` ${med.strength}` : '';
        const fullName = `${namePart}${genericPart}${strengthPart}`.trim() || namePart;

        const defaultDose = med.strength ? med.strength : (med.form ? `1 ${med.form}` : '1 Tablet');
        const defaultQty = med.unitsPerPack ? String(med.unitsPerPack) : (nextMeds[index].quantity || '10');

        nextMeds[index] = {
            ...nextMeds[index],
            medicineName: fullName,
            dose: nextMeds[index].dose && nextMeds[index].dose !== '1 Tablet' ? nextMeds[index].dose : defaultDose,
            frequency: nextMeds[index].frequency || 'BD (Morning, Night)',
            duration: nextMeds[index].duration || '5 Days',
            quantity: nextMeds[index].quantity || defaultQty
        };

        onChange({ ...data, dischargeMedications: nextMeds });
    };

    const handleImportFromPharmacy = () => {
        const pharmacyMeds = reportData?.meds || [];
        if (!pharmacyMeds || pharmacyMeds.length === 0) return;

        const existingNames = new Set(
            medsList.map((m: any) => (m.medicineName || '').trim().toLowerCase()).filter(Boolean)
        );

        const newMeds: DischargeMedicine[] = [];
        for (let i = 0; i < pharmacyMeds.length; i++) {
            const pMed = pharmacyMeds[i];
            const name = (pMed.medicineName || pMed.name || '').trim();
            if (!name) continue;
            if (existingNames.has(name.toLowerCase())) continue;

            existingNames.add(name.toLowerCase());
            newMeds.push({
                id: `imported_${Date.now()}_${i}`,
                medicineName: name,
                dose: '1 Tablet',
                frequency: 'BD (Morning, Night)',
                duration: `${pMed.quantity || 5} Days`,
                quantity: String(pMed.quantity || 10)
            });
        }

        if (newMeds.length > 0) {
            onChange({
                ...data,
                dischargeMedications: [...medsList, ...newMeds]
            });
        }
    };

    const handleImportInvestigations = () => {
        const diags = reportData?.diags || [];
        const rads = reportData?.rads || [];
        const allTests = [
            ...diags.map((d: any) => d.testName || d.serviceName || d.name),
            ...rads.map((r: any) => r.testName || r.serviceName || r.name)
        ].filter(Boolean);

        if (allTests.length > 0) {
            onChange({
                ...data,
                investigations: allTests.join(', ')
            });
        }
    };

    const conditionPresets = [
        'Stable, Afebrile, Ambulatory',
        'Clinically Improved, Hemodynamically Stable',
        'Vitals Normal, Tolerating Oral Diet',
        'Discharged on Request (DOR)'
    ];

    return (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* SECTION 1: Discharge Medications (Manual Entry Table) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Pill size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                                6. Discharge Medications (Manual Entry)
                            </h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                Specify take-home medications with exact dosage, frequency, and duration.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {reportData?.meds && reportData.meds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleImportFromPharmacy}
                                className="px-2.5 sm:px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Copy medicines listed in the current pharmacy bill"
                            >
                                <Sparkles size={12} className="text-indigo-500" />
                                <span>Copy From Pharmacy</span>
                            </button>
                        )}
                        {medsList.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onChange({ ...data, dischargeMedications: [] })}
                                className="px-2.5 sm:px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Clear all discharge medicines"
                            >
                                <Trash2 size={12} />
                                <span>Clear All</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleAddMed}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>Add Medicine</span>
                        </button>
                    </div>
                </div>

                <div className="w-full overflow-x-auto p-2 sm:p-3 min-h-[140px]">
                    {medsList.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                            <Pill className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-600">No discharge medicines added yet</p>
                            <button
                                type="button"
                                onClick={handleAddMed}
                                className="mt-2.5 px-3 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={12} />
                                <span>Add First Medicine</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Layout (sm:hidden): Clear visibility for Dose, Qty, Frequency, Duration */}
                            <div className="sm:hidden space-y-3 p-1">
                                {medsList.map((m, idx) => (
                                    <div key={m.id || idx} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 space-y-2.5 shadow-2xs">
                                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60">
                                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                                #{idx + 1} Medication
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMed(idx)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Remove medicine"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                                                Medicine Name
                                            </label>
                                            <MedicineSearchInput
                                                value={m.medicineName}
                                                onChange={(val) => handleMedChange(idx, 'medicineName', val)}
                                                onSelect={(med) => handleSelectPharmaMed(idx, med)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                                                    Dose
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 1 Tablet"
                                                    value={m.dose}
                                                    onChange={(e) => handleMedChange(idx, 'dose', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                                                    Qty
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 10"
                                                    value={m.quantity || ''}
                                                    onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                                                    Frequency
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. BD (Morning, Night)"
                                                    value={m.frequency}
                                                    onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                                                    Duration
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 5 Days"
                                                    value={m.duration}
                                                    onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop & Tablet Table (hidden sm:table): Generous widths for Quantity and Frequency */}
                            <table className="hidden sm:table w-full min-w-[850px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/80">
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-12 text-center">
                                            S.No
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 min-w-[280px]">
                                            Medicine Name
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-32 min-w-[120px]">
                                            Dose
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-56 min-w-[190px]">
                                            Frequency
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-24 min-w-[80px]">
                                            Qty
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-32 min-w-[110px]">
                                            Duration
                                        </th>
                                        <th className="py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-12 text-center">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {medsList.map((m, idx) => (
                                        <tr key={m.id || idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-1.5 px-3 text-center text-xs font-black text-slate-400">
                                                {idx + 1}
                                            </td>
                                            <td className="py-1.5 px-3 relative">
                                                <MedicineSearchInput
                                                    value={m.medicineName}
                                                    onChange={(val) => handleMedChange(idx, 'medicineName', val)}
                                                    onSelect={(med) => handleSelectPharmaMed(idx, med)}
                                                />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 1 Tablet"
                                                    value={m.dose}
                                                    onChange={(e) => handleMedChange(idx, 'dose', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. BD (Morning, Night)"
                                                    value={m.frequency}
                                                    onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 10"
                                                    value={m.quantity || ''}
                                                    onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 5 Days"
                                                    value={m.duration}
                                                    onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMed(idx)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Delete medicine row"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>

            {/* SECTION 2: Clinical Summary & Diagnoses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 2. Clinical Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <Stethoscope size={15} />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                            2. Clinical Summary
                        </h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Chief Complaints
                        </label>
                        <textarea
                            rows={2}
                            placeholder="e.g. Fever, cough and generalized weakness for 3 days."
                            value={data.chiefComplaints || ''}
                            onChange={(e) => onChange({ ...data, chiefComplaints: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            History of Present Illness
                        </label>
                        <textarea
                            rows={2}
                            placeholder="e.g. Patient presented with insidious onset of symptoms..."
                            value={data.historyOfPresentIllness || ''}
                            onChange={(e) => onChange({ ...data, historyOfPresentIllness: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Past Medical / Surgical History
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. No known comorbidities / No prior surgeries."
                            value={data.pastMedicalHistory || ''}
                            onChange={(e) => onChange({ ...data, pastMedicalHistory: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Examination Findings at Admission
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. BP: 120/80 mmHg, PR: 78/min, Afebrile, Chest Clear."
                            value={data.examinationFindings || ''}
                            onChange={(e) => onChange({ ...data, examinationFindings: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>
                </div>

                {/* 3. Diagnosis & Investigations Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Activity size={15} />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                            3. Diagnosis & Investigations
                        </h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Provisional Diagnosis
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Acute Febrile Illness"
                            value={data.provisionalDiagnosis || ''}
                            onChange={(e) => onChange({ ...data, provisionalDiagnosis: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Final Diagnosis
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Viral Fever with Mild Bronchitis"
                            value={data.finalDiagnosis || ''}
                            onChange={(e) => onChange({ ...data, finalDiagnosis: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Investigations (Page 2 Header)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="e.g. CBC, Serum Electrolytes, Chest X-Ray PA View - Normal limits."
                            value={data.investigations || ''}
                            onChange={(e) => onChange({ ...data, investigations: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 3: Hospital Course, Condition & Advice */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <FileText size={15} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        4, 5 & 7. Hospital Course, Condition & Discharge Advice
                    </h3>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        4. Treatment and Hospital Course
                    </label>
                    <textarea
                        rows={2}
                        placeholder="Mention relevant medications, procedures or surgery, clinical progress, and response to treatment..."
                        value={data.treatmentAndCourse || ''}
                        onChange={(e) => onChange({ ...data, treatmentAndCourse: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            5. Condition at Discharge
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Stable, Afebrile, Ambulatory"
                            value={data.conditionAtDischarge || ''}
                            onChange={(e) => onChange({ ...data, conditionAtDischarge: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                        <div className="flex flex-wrap gap-1">
                            {conditionPresets.map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onChange({ ...data, conditionAtDischarge: preset })}
                                    className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-md transition-colors cursor-pointer"
                                >
                                    + {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Follow-Up Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={data.followUpDate || ''}
                                onChange={(e) => onChange({ ...data, followUpDate: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            7. Diet and Activity Advice
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Normal soft diet, avoid oily/spicy food, adequate rest."
                            value={data.dietAndActivityAdvice || ''}
                            onChange={(e) => onChange({ ...data, dietAndActivityAdvice: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Wound Care / Precautions
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Keep cannula/incision area clean and dry."
                            value={data.woundCarePrecautions || ''}
                            onChange={(e) => onChange({ ...data, woundCarePrecautions: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
