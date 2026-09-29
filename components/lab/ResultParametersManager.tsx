'use client';

import React from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';

interface ResultParameter {
    label: string;
    unit?: string;
    normalRange?: string;
    normalRanges?: {
        male?: { min?: string | number; max?: string | number; text?: string };
        female?: { min?: string | number; max?: string | number; text?: string };
        child?: { min?: string | number; max?: string | number; text?: string };
        newborn?: { min?: string | number; max?: string | number; text?: string };
        infant?: { min?: string | number; max?: string | number; text?: string };
        geriatric?: { min?: string | number; max?: string | number; text?: string };
    };
    remarks?: string;
    example?: string;
    fieldType?: 'text' | 'number' | 'boolean';
    isRequired?: boolean;
    displayOrder?: number;
}

interface ResultParametersManagerProps {
    parameters: ResultParameter[];
    onChange: (parameters: ResultParameter[]) => void;
}

export default function ResultParametersManager({ parameters = [], onChange }: ResultParametersManagerProps) {
    const handleAdd = () => {
        const newParam: ResultParameter = {
            label: '',
            unit: '',
            normalRange: '',
            normalRanges: {
                newborn: { min: '', max: '' },
                infant: { min: '', max: '' },
                child: { min: '', max: '' },
                male: { min: '', max: '' },
                female: { min: '', max: '' },
                geriatric: { min: '', max: '' }
            },
            fieldType: 'text',
            isRequired: false,
            displayOrder: parameters.length
        };
        onChange([...parameters, newParam]);
    };

    const handleUpdate = (index: number, field: keyof ResultParameter, value: any) => {
        const updated = [...parameters];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        onChange(updated);
    };

    const handleDelete = (index: number) => {
        const updated = parameters.filter((_, i) => i !== index);
        updated.forEach((p, i) => p.displayOrder = i);
        onChange(updated);
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-slate-200/60 dark:border-gray-700/50 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-gray-700/50 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center shadow-md">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                                Subtests
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Configure dynamic subtest parameters
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Add Subtest</span>
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {parameters.map((param, index) => (
                    <div
                        key={index}
                        className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700/60 shadow-sm space-y-3.5 relative hover:border-slate-300 dark:hover:border-gray-600 transition-all"
                    >
                        {/* Title Row with Subtest Number & Delete */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/50 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                                Subtest #{index + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleDelete(index)}
                                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded transition-colors"
                                title="Delete subtest"
                            >
                                <Trash2 size={12} />
                                <span>DELETE</span>
                            </button>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                Subtest Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., WBC Count, Hemoglobin"
                                value={param.label}
                                onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Type & Unit Inputs */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Type
                                </label>
                                <select
                                    value={param.fieldType || 'text'}
                                    onChange={(e) => handleUpdate(index, 'fieldType', e.target.value)}
                                    className="w-full px-2 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-gray-700 dark:text-gray-300"
                                >
                                    <option value="text">Text/Descriptive</option>
                                    <option value="number">Numeric Value</option>
                                    <option value="boolean">Positive/Negative</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    list="unit-options"
                                    placeholder="e.g., g/dL"
                                    value={param.unit || ''}
                                    onChange={(e) => handleUpdate(index, 'unit', e.target.value)}
                                    className="w-full px-2 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-gray-700 dark:text-gray-300"
                                />
                            </div>
                        </div>

                        {/* Reference Range & Required Checkbox */}
                        <div className="flex gap-2.5 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    General Reference Range
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 12-16"
                                    value={param.normalRange || ''}
                                    onChange={(e) => handleUpdate(index, 'normalRange', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-gray-700 dark:text-gray-300"
                                />
                            </div>
                            <div className="shrink-0">
                                <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={param.isRequired || false}
                                        onChange={(e) => handleUpdate(index, 'isRequired', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase select-none cursor-pointer">Required</span>
                                </label>
                            </div>
                        </div>

                        {/* Normal Reference Ranges Grid */}
                        <div className="pt-3 border-t border-slate-100 dark:border-gray-700/50">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Normal Reference Ranges (Min - Max)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {(['newborn', 'infant', 'child', 'male', 'female', 'geriatric'] as const).map((category) => {
                                    const catLabel = category === 'newborn' ? 'Newborn' : category;
                                    const range = param.normalRanges?.[category] || { min: '', max: '' };

                                    const handleMinMaxChange = (field: 'min' | 'max', value: string) => {
                                        const currentRanges = param.normalRanges || {};
                                        const updatedRanges = {
                                            ...currentRanges,
                                            [category]: {
                                                ...(currentRanges[category] || {}),
                                                [field]: value
                                            }
                                        };
                                        handleUpdate(index, 'normalRanges', updatedRanges);
                                    };

                                    return (
                                        <div key={category} className="p-2 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200/60 dark:border-gray-700/50">
                                            <span className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 capitalize">
                                                {catLabel}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Min"
                                                    min="0"
                                                    value={range.min ?? ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (val < 0) return;
                                                        handleMinMaxChange('min', e.target.value);
                                                    }}
                                                    onWheel={e => (e.target as HTMLElement).blur()}
                                                    className="w-full text-center text-xs py-1 px-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-semibold text-gray-900 dark:text-white"
                                                />
                                                <span className="text-[10px] text-gray-400 font-bold">-</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Max"
                                                    min="0"
                                                    value={range.max ?? ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (val < 0) return;
                                                        handleMinMaxChange('max', e.target.value);
                                                    }}
                                                    onWheel={e => (e.target as HTMLElement).blur()}
                                                    className="w-full text-center text-xs py-1 px-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-semibold text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {parameters.length === 0 && (
                    <div className="text-center py-8 px-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-slate-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                            No Subtests Configured
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                            Click "Add Subtest" to start adding entry parameters.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
