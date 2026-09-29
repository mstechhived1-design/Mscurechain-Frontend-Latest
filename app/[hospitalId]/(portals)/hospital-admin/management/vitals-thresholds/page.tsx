"use client";

import React, { useState, useEffect } from 'react';
import {
    Activity, Save, AlertTriangle, ShieldAlert,
    Heart, Thermometer, Wind, Droplet, Info,
    Plus, Copy,
    ArrowRight, Beaker, Zap,
    Import, Trash2, Edit3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { useAuthStore } from '@/stores/authStore';
import GenericBulkImportModal from '@/components/admin/GenericBulkImportModal';
const VITALS_METADATA = [
    {
        name: 'Heart Rate',
        id: 'heartRate',
        unit: 'BPM',
        icon: Heart,
        defaults: {
            physicalMin: 20,
            lowerCritical: 40,
            lowerWarning: 50,
            targetMin: 60,
            targetMax: 100,
            upperWarning: 110,
            upperCritical: 130,
            physicalMax: 220
        }
    },
    {
        name: 'SpO2',
        id: 'spO2',
        unit: '%',
        icon: Droplet,
        special: 'spo2',
        defaults: {
            physicalMin: 50,
            lowerCritical: 85,
            lowerWarning: 90,
            targetMin: 95,
            targetMax: 100,
            upperWarning: 100,
            upperCritical: 100,
            physicalMax: 100
        }
    },
    {
        name: 'Systolic BP',
        id: 'systolicBP',
        unit: 'mmHg',
        icon: Activity,
        defaults: {
            physicalMin: 40,
            lowerCritical: 80,
            lowerWarning: 90,
            targetMin: 100,
            targetMax: 120,
            upperWarning: 140,
            upperCritical: 180,
            physicalMax: 300
        }
    },
    {
        name: 'Diastolic BP',
        id: 'diastolicBP',
        unit: 'mmHg',
        icon: Activity,
        defaults: {
            physicalMin: 30,
            lowerCritical: 50,
            lowerWarning: 60,
            targetMin: 70,
            targetMax: 80,
            upperWarning: 90,
            upperCritical: 110,
            physicalMax: 200
        }
    },
    {
        name: 'Temperature',
        id: 'temperature',
        unit: '°F',
        icon: Thermometer,
        defaults: {
            physicalMin: 90,
            lowerCritical: 95,
            lowerWarning: 96.8,
            targetMin: 97.0,
            targetMax: 99.5,
            upperWarning: 100.4,
            upperCritical: 103,
            physicalMax: 110
        }
    },
    {
        name: 'Respiratory Rate',
        id: 'respiratoryRate',
        unit: 'breaths/min',
        icon: Wind,
        defaults: {
            physicalMin: 4,
            lowerCritical: 8,
            lowerWarning: 10,
            targetMin: 12,
            targetMax: 20,
            upperWarning: 24,
            upperCritical: 30,
            physicalMax: 60
        }
    },
    {
        name: 'Glucose: Fasting',
        id: 'glucose',
        glucoseType: 'Fasting',
        unit: 'mg/dL',
        icon: Beaker,
        defaults: {
            physicalMin: 20,
            lowerCritical: 54,
            lowerWarning: 70,
            targetMin: 80,
            targetMax: 99,
            upperWarning: 125,
            upperCritical: 250,
            physicalMax: 600
        }
    },
    {
        name: 'Glucose: After Meal',
        id: 'glucose',
        glucoseType: 'After Meal',
        unit: 'mg/dL',
        icon: Beaker,
        defaults: {
            physicalMin: 20,
            lowerCritical: 70,
            lowerWarning: 90,
            targetMin: 100,
            targetMax: 140,
            upperWarning: 180,
            upperCritical: 300,
            physicalMax: 600
        }
    },
    {
        name: 'Glucose: Random',
        id: 'glucose',
        glucoseType: 'Random',
        unit: 'mg/dL',
        icon: Beaker,
        defaults: {
            physicalMin: 20,
            lowerCritical: 60,
            lowerWarning: 80,
            targetMin: 90,
            targetMax: 140,
            upperWarning: 200,
            upperCritical: 300,
            physicalMax: 600
        }
    }
];
const SeverityPreview = ({ thresholds }: { thresholds: any }) => {
    const { physicalMin, lowerCritical, lowerWarning, upperWarning, upperCritical, physicalMax, isSpO2UpperEnabled, vitalName } = thresholds;

    const getWidth = (val: number, nextVal: number) => {
        const total = physicalMax - physicalMin;
        if (total === 0) return '0%';
        return `${((nextVal - val) / total) * 100}%`;
    };

    const isSpO2 = vitalName === 'spO2';

    return (
        <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-slate-100 border border-slate-200 mt-2">
            {/* Critical Low */}
            <div style={{ width: getWidth(physicalMin, lowerCritical) }} className="bg-rose-500" title="Critical Low" />
            {/* Warning Low */}
            <div style={{ width: getWidth(lowerCritical, lowerWarning) }} className="bg-amber-400" title="Warning Low" />
            {/* Normal */}
            <div style={{ width: getWidth(lowerWarning, upperWarning) }} className="bg-emerald-500" title="Normal Range" />
            {/* Warning High */}
            <div
                style={{ width: getWidth(upperWarning, upperCritical) }}
                className={isSpO2 && !isSpO2UpperEnabled ? "bg-emerald-500" : "bg-amber-400"}
                title="Warning High"
            />
            {/* Critical High */}
            <div
                style={{ width: getWidth(upperCritical, physicalMax) }}
                className={isSpO2 && !isSpO2UpperEnabled ? "bg-emerald-500" : "bg-rose-500"}
                title="Critical High"
            />
        </div>
    );
};

export default function VitalsThresholdsPage() {
    const user = useAuthStore((state) => state.user);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [thresholds, setThresholds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [wardTypes, setWardTypes] = useState<string[]>([]);
    const [newTemplate, setNewTemplate] = useState({ name: '', ward: 'General' });
    const [isImporting, setIsImporting] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [cloneConfig, setCloneConfig] = useState({ name: '', ward: 'General' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', ward: '' });
    const [minEscLimit, setMinEscLimit] = useState<number>(50);

    useEffect(() => {
        fetchTemplates();
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            fetchThresholds(selectedTemplate);
        }
    }, [selectedTemplate]);

    const handleImportSuccess = () => {
        fetchTemplates();
    };

    const downloadSampleCSV = () => {
        const headers = "roomType,vitalName,unit,min,lowCritical,lowWarning,targetRange,highWarning,highCritical,max,escalationMinutes\n";
        const sampleRows = [
            "ICU,heartRate,BPM,20,40,50,60-100,110,130,220,50",
            "ICU,spO2,%,60,85,90,95-100,100,100,100,50",
            "GENERAL WARD,heartRate,BPM,30,45,55,60-100,110,125,200,120"
        ].join("\n");

        const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        a.download = 'vitals_protocol_sample.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const fetchMetadata = async () => {
        try {
            const res = await hospitalAdminService.getHospitalMetadata();
            if (res.success && res.data) {
                if (res.data.wardTypes) setWardTypes(res.data.wardTypes);
                if (res.data.minEscalationMinutes) setMinEscLimit(res.data.minEscalationMinutes);

                if (res.data.wardTypes && res.data.wardTypes.length > 0) {
                    const firstWard = res.data.wardTypes[0];
                    setNewTemplate(prev => ({ ...prev, ward: firstWard }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch hospital metadata:", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await ipdService.getVitalsTemplates();
            setTemplates(res.data);
            if (res.data.length > 0 && !selectedTemplate) {
                setSelectedTemplate(res.data[0]._id);
            }
        } catch (error) {
            toast.error("Failed to fetch templates");
        } finally {
            setLoading(false);
        }
    };

    const fetchThresholds = async (id: string) => {
        try {
            setLoading(true);
            const res = await ipdService.getTemplateThresholds(id);
            // Reconstruct full list if some vitals are missing
            const existing = res.data.thresholds;
            const fullList = VITALS_METADATA.map(meta => {
                const match = existing.find((e: any) =>
                    e.vitalName === meta.id &&
                    (!meta.glucoseType || e.glucoseType === meta.glucoseType)
                );
                return match || {
                    vitalName: meta.id,
                    glucoseType: meta.glucoseType,
                    physicalMin: meta.defaults.physicalMin,
                    lowerCritical: meta.defaults.lowerCritical,
                    lowerWarning: meta.defaults.lowerWarning,
                    upperWarning: meta.defaults.upperWarning,
                    upperCritical: meta.defaults.upperCritical,
                    physicalMax: meta.defaults.physicalMax,
                    unit: meta.unit,
                    targetMin: meta.defaults.targetMin,
                    targetMax: meta.defaults.targetMax,
                    escalationCriticalMinutes: 60,
                    escalationWarningMinutes: 480,
                    isSpO2UpperEnabled: meta.id === 'spO2' ? false : undefined
                };
            });
            setThresholds(fullList);
        } catch (error) {
            toast.error("Failed to fetch thresholds");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (index: number, field: string, value: any) => {
        setThresholds(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const validateOrder = (t: any) => {
        const { physicalMin, lowerCritical, lowerWarning, targetMin, targetMax, upperWarning, upperCritical, physicalMax, vitalName, glucoseType } = t;
        const name = `${vitalName}${glucoseType ? ` (${glucoseType})` : ''}`;

        if (!(physicalMin < lowerCritical)) return { error: `Invalid [${name}]: Physical Min (${physicalMin}) must be < Lower Critical (${lowerCritical})` };
        if (!(lowerCritical < lowerWarning)) return { error: `Invalid [${name}]: Lower Critical (${lowerCritical}) must be < Lower Warning (${lowerWarning})` };
        if (!(lowerWarning <= targetMin)) return { error: `Invalid [${name}]: Lower Warning (${lowerWarning}) must be <= Target Min (${targetMin})` };
        if (!(targetMin < targetMax)) return { error: `Invalid [${name}]: Target Min (${targetMin}) must be < Target Max (${targetMax})` };
        if (!(targetMax <= upperWarning)) return { error: `Invalid [${name}]: Target Max (${targetMax}) must be <= Upper Warning (${upperWarning})` };
        if (!(upperWarning <= upperCritical)) return { error: `Invalid [${name}]: Upper Warning (${upperWarning}) must be <= Upper Critical (${upperCritical})` };
        if (!(upperCritical <= physicalMax)) return { error: `Invalid [${name}]: Upper Critical (${upperCritical}) must be <= Physical Max (${physicalMax})` };

        return { error: null };
    };

    const handleSave = async () => {
        try {
            // Validate all
            for (const t of thresholds) {
                const validation = validateOrder(t);
                if (validation.error) {
                    toast.error(validation.error);
                    return;
                }
                if (t.escalationCriticalMinutes < 50) {
                    toast.error(`Escalation time for ${t.vitalName} must be at least 50 minutes`);
                    return;
                }
            }

            setSaving(true);
            await ipdService.saveTemplateThresholds(selectedTemplate, thresholds);
            toast.success("Configuration preserved for all wards using this template");
        } catch (error: any) {
            toast.error(error.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateTemplate = async () => {
        try {
            if (!newTemplate.name) return toast.error("Name required");
            const res = await ipdService.createVitalsTemplate({
                templateName: newTemplate.name,
                wardType: newTemplate.ward
            });
            toast.success("Template created");
            setIsCreating(false);
            fetchTemplates();
            setSelectedTemplate(res.data._id);
        } catch (error) {
            toast.error("Template name might already exist");
        }
    };

    const handleCopy = async () => {
        try {
            if (!cloneConfig.name) return toast.error("New name required");
            setSaving(true);
            const res = await ipdService.copyVitalsTemplate(selectedTemplate, {
                newTemplateName: cloneConfig.name,
                newWardType: cloneConfig.ward
            });
            toast.success("Template cloned successfully");
            setIsCloning(false);
            fetchTemplates();
            setSelectedTemplate(res.data._id);
        } catch (error) {
            toast.error("Failed to copy template");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTemplate = async () => {
        try {
            setSaving(true);
            await ipdService.deleteVitalsTemplate(selectedTemplate);
            toast.success("Protocol deleted permanently");
            setIsDeleting(false);
            const remaining = templates.filter(t => t._id !== selectedTemplate);
            setTemplates(remaining);
            if (remaining.length > 0) {
                setSelectedTemplate(remaining[0]._id);
            } else {
                setSelectedTemplate("");
                setThresholds([]);
            }
        } catch (error) {
            toast.error("Failed to delete template");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTemplate = async () => {
        try {
            if (!editData.name) return toast.error("Name required");
            setSaving(true);
            await ipdService.updateVitalsTemplate(selectedTemplate, {
                templateName: editData.name,
                wardType: editData.ward
            });
            toast.success("Template profile updated");
            setIsEditing(false);
            fetchTemplates();
        } catch (error) {
            toast.error("Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading && templates.length === 0) return <div className="p-10 text-center">Loading Clinical Protocols...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Section */}
            <div className="bg-white p-2 md:p-4 md:px-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-5 md:flex-1">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                        <ShieldAlert size={24} className="md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 uppercase tracking-tight">Clinical Triage Engine</h1>
                        <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight md:tracking-[0.2em] mt-1">
                            NABH Compliance • Dynamic Ward-Specific Protocols
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl border border-slate-200 shadow-inner w-full md:w-full md:max-w-[400px] items-center overflow-hidden">
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="bg-transparent px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase text-slate-600 outline-none flex-1 min-w-0 truncate"
                    >
                        {templates.map(t => (
                            <option key={t._id} value={t._id} className="truncate">
                                {t.templateName} ({t.wardType})
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="shrink-0 bg-white p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                    >
                        <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar md:flex-1 md:justify-end shrink-0">
                    <button
                        onClick={() => {
                            const current = templates.find(t => t._id === selectedTemplate);
                            setEditData({ name: current?.templateName || '', ward: current?.wardType || '' });
                            setIsEditing(true);
                        }}
                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm shrink-0"
                        title="Edit Template Properties"
                    >
                        <Edit3 size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>

                    <button
                        onClick={() => {
                            const current = templates.find(t => t._id === selectedTemplate);
                            setCloneConfig({
                                name: `${current?.templateName || ''} Copy`,
                                ward: current?.wardType || 'General'
                            });
                            setIsCloning(true);
                        }}
                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm shrink-0"
                        title="Clone Template"
                    >
                        <Copy size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>

                    <button
                        onClick={() => setIsImporting(true)}
                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm shrink-0"
                        title="Bulk Import Protocol"
                    >
                        <Import size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>

                    <button
                        onClick={() => setIsDeleting(true)}
                        className="p-2 bg-white border border-slate-200 text-rose-400 rounded-xl hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm shrink-0"
                        title="Delete Template"
                    >
                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="shrink-0 px-3 md:px-4 py-2 md:py-2.5 bg-indigo-600 text-white rounded-xl md:rounded-[1.2rem] text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={16} className="md:w-[18px] md:h-[18px]" />
                        {saving ? 'Syncing...' : 'Save'}
                    </button>
                </div>

            </div>

            {/* Main Config Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[9px] font-black tracking-[0.15em]">
                                <th className="px-4 md:px-8 py-4 md:py-6 w-[120px] md:w-[240px] md:sticky md:left-0 md:bg-slate-50 md:z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Vital Parameter</th>
                                <th className="px-4 py-6 text-center border-l border-white/10">Min</th>
                                <th className="px-4 py-6 text-center text-rose-500">Low Crit</th>
                                <th className="px-4 py-6 text-center text-amber-500">Low Warn</th>
                                <th className="px-4 py-6 text-center text-emerald-600 italic">Target Range</th>
                                <th className="px-4 py-6 text-center text-amber-500">Up Warn</th>
                                <th className="px-4 py-6 text-center text-rose-500">Up Crit</th>
                                <th className="px-4 py-6 text-center">Max</th>
                                <th className="px-2 md:px-6 py-6 text-center text-indigo-500">Esc (Mins)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {thresholds.map((t, idx) => {
                                const meta = VITALS_METADATA.find(m => m.id === t.vitalName && (!m.glucoseType || m.glucoseType === t.glucoseType));
                                const Icon = meta?.icon || Activity;
                                const validation = validateOrder(t);
                                const isValid = !validation.error;

                                return (
                                    <tr key={idx} className={`group transition-all hover:bg-slate-50/50 ${!isValid ? 'bg-rose-50/50' : ''}`}>
                                        <td className="px-4 md:px-8 py-4 md:py-5 md:sticky md:left-0 bg-white md:z-10 border-r border-slate-200 group-hover:bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0 ${isValid ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-500'}`}>
                                                    <Icon size={18} className="md:w-5 md:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase leading-tight truncate">{meta?.name}</p>
                                                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.unit}</p>
                                                </div>
                                            </div>
                                            {t.vitalName === 'spO2' && (
                                                <div className="mt-2 md:mt-4 flex items-center gap-1.5 md:gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.isSpO2UpperEnabled}
                                                        onChange={(e) => handleUpdate(idx, 'isSpO2UpperEnabled', e.target.checked)}
                                                        className="w-3 md:w-3.5 h-3 md:h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                                    />
                                                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter">Check Upper SpO2?</span>
                                                </div>
                                            )}
                                            <SeverityPreview thresholds={t} />
                                        </td>

                                        {[
                                            'physicalMin', 'lowerCritical', 'lowerWarning',
                                            'targetRange', // Virtual field for targetMin/targetMax
                                            'upperWarning', 'upperCritical', 'physicalMax'
                                        ].map((field, fIdx) => {
                                            if (field === 'targetRange') {
                                                return (
                                                    <td key={field} className="px-2 py-4 text-center cursor-default bg-emerald-50/30">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                                value={t.targetMin || ''}
                                                                onChange={(e) => handleUpdate(idx, 'targetMin', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                                className={`w-12 md:w-16 px-1 md:px-2 py-2 md:py-2.5 bg-white border border-slate-200 rounded-xl text-[8px] md:text-[11px] font-black text-center shadow-sm focus:border-indigo-500 transition-all outline-none ${!isValid ? 'border-rose-300' : ''}`}
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-300">-</span>
                                                            <input
                                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                                value={t.targetMax || ''}
                                                                onChange={(e) => handleUpdate(idx, 'targetMax', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                                className={`w-12 md:w-16 px-1 md:px-2 py-2 md:py-2.5 bg-white border border-slate-200 rounded-xl text-[8px] md:text-[11px] font-black text-center shadow-sm focus:border-indigo-500 transition-all outline-none ${!isValid ? 'border-rose-300' : ''}`}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={field} className={`px-2 py-4 text-center cursor-default ${['upperWarning', 'upperCritical'].includes(field) ? 'bg-rose-50/10' : ''}`}>
                                                    <input
                                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                        value={t[field] || ''}
                                                        onChange={(e) => handleUpdate(idx, field, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                        className={`w-12 md:w-16 px-1 md:px-2 py-2 md:py-2.5 bg-white border border-slate-200 rounded-xl text-[8px] md:text-[11px] font-black text-center shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none ${!isValid ? 'border-rose-300' : ''}`}
                                                    />
                                                    {field === 'lowerWarning' && (
                                                        <div className="inline-block ml-2 text-slate-300"><ArrowRight size={12} /></div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <input
                                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                    value={t.escalationCriticalMinutes || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        handleUpdate(idx, 'escalationCriticalMinutes', val);
                                                        handleUpdate(idx, 'escalationWarningMinutes', val);
                                                    }}
                                                    className={`w-14 md:w-20 px-1 md:px-3 py-2 border border-slate-100 rounded-xl text-[8px] md:text-[11px] font-black text-center bg-indigo-50/30 text-indigo-600 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all relative z-20 ${t.escalationCriticalMinutes < minEscLimit ? 'border-amber-300 bg-amber-50/50' : ''}`}
                                                />
                                                {t.escalationCriticalMinutes < minEscLimit && (
                                                    <span className="text-[7px] font-bold text-amber-500 uppercase tracking-tighter italic">Min {minEscLimit}m</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                </div>
            </div>

            {/* Template Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-3 md:p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase">New Protocol</h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Base configuration</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ICU Baseline"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Ward Type</label>
                                <select
                                    value={newTemplate.ward}
                                    onChange={(e) => setNewTemplate(prev => ({ ...prev, ward: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                                >
                                    {wardTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                    {wardTypes.length === 0 && (
                                        <>
                                            <option value="General">General Ward</option>
                                            <option value="ICU">ICU / CCU</option>
                                            <option value="Emergency">ER / Emergency</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-4 md:px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTemplate}
                                    className="flex-3 px-4 md:px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    Create Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Bulk Import Modal */}
            <GenericBulkImportModal
                isOpen={isImporting}
                onClose={() => setIsImporting(false)}
                config={{
                    title: "Clinical Protocols",
                    entityName: "Protocol Row",
                    templateColumns: [
                        "roomType", "vitalName", "unit", "min", "lowCritical", "lowWarning",
                        "targetRange", "highWarning", "highCritical", "max", "escalationMinutes"
                    ],
                    sampleRows: [
                        ["ICU", "heartRate", "bpm", "30", "40", "50", "60-100", "110", "130", "220", "60"],
                        ["ICU", "spO2", "%", "0", "85", "90", "95-100", "100", "100", "100", "60"],
                        ["ICU", "systolicBP", "mmHg", "50", "70", "80", "90-140", "150", "170", "250", "60"],
                        ["ICU", "diastolicBP", "mmHg", "30", "40", "50", "60-90", "100", "110", "150", "60"],
                        ["ICU", "temperature", "°F", "90", "95", "97", "98-99", "101", "103", "110", "60"],
                        ["ICU", "respiratoryRate", "breaths/min", "5", "8", "10", "12-20", "24", "30", "50", "60"],
                        ["General Ward", "heartRate", "bpm", "40", "50", "55", "60-100", "105", "120", "200", "480"],
                        ["General Ward", "spO2", "%", "0", "88", "92", "95-100", "100", "100", "100", "480"],
                        ["General Ward", "systolicBP", "mmHg", "60", "80", "90", "100-140", "150", "160", "220", "480"],
                        ["General Ward", "diastolicBP", "mmHg", "40", "50", "60", "70-90", "100", "110", "140", "480"],
                        ["General Ward", "temperature", "°F", "94", "96", "97", "98-99", "100", "102", "108", "480"],
                        ["General Ward", "respiratoryRate", "breaths/min", "8", "10", "12", "14-18", "20", "24", "40", "480"],
                        ["Emergency", "heartRate", "bpm", "30", "45", "55", "60-100", "115", "140", "230", "60"],
                        ["Emergency", "spO2", "%", "0", "80", "88", "94-100", "100", "100", "100", "60"]
                    ],
                    onImport: async (data) => {
                        const validationErrors: any[] = [];
                        const processedData = data.map((row, idx) => {
                            const val = (k: string) => {
                                const v = row[k];
                                if (v === undefined || v === null || v === "") return 0;
                                return Number(String(v).split("-")[0]);
                            };

                            const [targetMin, targetMax] = (row.targetRange || "").split("-").map((s: string) => s.trim());

                            const pMin = val('min');
                            const lCrit = val('lowCritical');
                            const lWarn = val('lowWarning');
                            const tMin = Number(targetMin || row.targetMin || 0);
                            const tMax = Number(targetMax || row.targetMax || 0);
                            const uWarn = val('highWarning');
                            const uCrit = val('highCritical');
                            const pMax = val('max');

                            if (pMin > lCrit || lCrit > lWarn || lWarn > tMin || tMin >= tMax || tMax > uWarn || uWarn > uCrit || uCrit > pMax) {
                                validationErrors.push({
                                    message: `Record #${idx + 1}: [${row.vitalName}] in [${row.roomType}]. Boundary check failed. Ensure: Min(${pMin}) ≤ LowCrit(${lCrit}) ≤ LowWarn(${lWarn}) ≤ T-Min(${tMin}) < T-Max(${tMax}) ≤ HighWarn(${uWarn}) ≤ HighCrit(${uCrit}) ≤ Max(${pMax}).`
                                });
                            }

                            return {
                                roomType: row.roomType,
                                vitalName: row.vitalName,
                                unit: row.unit,
                                physicalMin: pMin,
                                lowerCritical: lCrit,
                                lowerWarning: lWarn,
                                targetMin: tMin,
                                targetMax: tMax,
                                upperWarning: uWarn,
                                upperCritical: uCrit,
                                physicalMax: pMax,
                                escalationCriticalMinutes: row.escalationMinutes,
                                escalationWarningMinutes: row.escalationMinutes
                            };
                        });

                        if (validationErrors.length > 0) {
                            return {
                                addedCount: 0,
                                errorCount: validationErrors.length,
                                errors: validationErrors
                            };
                        }

                        const res = await ipdService.importVitalsThresholdsJSON(processedData);
                        return {
                            addedCount: res.addedCount || 0,
                            errorCount: res.errorCount || 0,
                            errors: res.errors
                        };
                    }
                }}
                onSuccess={handleImportSuccess}
            />
            {/* Clone Template Modal */}
            {isCloning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-3 md:p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Copy size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase">Clone Protocol</h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Duplicate settings</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">New Protocol Name</label>
                                <input
                                    type="text"
                                    value={cloneConfig.name}
                                    onChange={(e) => setCloneConfig(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Ward</label>
                                <select
                                    value={cloneConfig.ward}
                                    onChange={(e) => setCloneConfig(prev => ({ ...prev, ward: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                                >
                                    {wardTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsCloning(false)}
                                    className="flex-1 px-4 md:px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCopy}
                                    disabled={saving}
                                    className="flex-3 px-4 md:px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap size={16} />
                                    {saving ? 'Cloning...' : 'Start Clone'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 bg-amber-50 rounded-2xl p-2 md:p-4 flex gap-3 border border-amber-100/50">
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-relaxed">
                                This will create a fresh database entry with its own unique identifier. Changes back to the original won't affect this clone.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Template Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-3 md:p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Edit3 size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase">Update Settings</h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Metadata modification</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ward Type</label>
                                <select
                                    value={editData.ward}
                                    onChange={(e) => setEditData(prev => ({ ...prev, ward: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                                >
                                    {wardTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 md:px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTemplate}
                                    disabled={saving}
                                    className="flex-3 px-4 md:px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    {saving ? 'Updating...' : 'Apply Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {isDeleting && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-2 md:p-4 md:p-8 border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border-2 border-rose-100 shadow-lg shadow-rose-100/50">
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                                CRITICAL ACTION
                            </h3>

                            <div className="space-y-3 mb-8">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                    Permanently destroy protocol:
                                </p>
                                <div className="py-3 px-5 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-sm font-black text-rose-600">
                                        "{templates.find(t => t._id === selectedTemplate)?.templateName}"
                                    </span>
                                </div>
                                <div className="bg-rose-50/50 p-2 md:p-4 rounded-2xl border border-rose-100/50">
                                    <p className="text-[9px] font-black text-rose-700 uppercase leading-relaxed tracking-wider">
                                        Immediately disables safety monitoring for this ward. Irreversible.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setIsDeleting(false)}
                                    className="flex-1 px-3 md:px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteTemplate}
                                    disabled={saving}
                                    className="flex-[1.2] px-3 md:px-6 py-3.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-rose-200/50 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    {saving ? '...' : 'YES, DELETE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
