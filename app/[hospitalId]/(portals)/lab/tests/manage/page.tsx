'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Database, FlaskConical, AlertCircle, Settings, Edit2, Trash2, Check } from 'lucide-react';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';
import ResultParametersManager from '@/components/lab/ResultParametersManager';

function ManageTestPage() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const testId = ((searchParams?.get('id') ?? null) ?? null);
    const isEditMode = !!testId;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [metaOptions, setMetaOptions] = useState<any>({
        testNames: [],
        methods: [],
        sampleTypes: [],
        turnaroundTimes: [],
        units: []
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    const [modalState, setModalState] = useState<{ type: string | null, title: string }>({ type: null, title: '' });
    const [newItemName, setNewItemName] = useState('');
    const [isNavigating, startNavigation] = useTransition();

    // Method manager state
    const [showMethodManager, setShowMethodManager] = useState(false);
    const [editingMethod, setEditingMethod] = useState<{ index: number; value: string } | null>(null);
    const [editMethodError, setEditMethodError] = useState('');

    // Sample Type manager state
    const [showSampleManager, setShowSampleManager] = useState(false);
    const [editingSample, setEditingSample] = useState<{ index: number; value: string } | null>(null);

    // Unit manager state
    const [showUnitManager, setShowUnitManager] = useState(false);
    const [editingUnit, setEditingUnit] = useState<{ index: number; value: string } | null>(null);

    const persistMetaOptions = async (updatedMeta: { methods?: string[]; sampleTypes?: string[]; units?: string[] }) => {
        try {
            await LabTestService.updateMetaOptions(updatedMeta);
        } catch (e: any) {
            console.error("Failed to persist meta options", e);
            toast.error(e.message || "Failed to persist customization to server");
        }
    };

    const [formData, setFormData] = useState({
        testName: '',
        departmentId: '',
        departmentIds: [] as string[],
        sampleType: '',
        price: '',
        labPrice: '', // Optional Lab-to-Lab discounted price,
        unit: '',
        method: '',
        turnaroundTime: '',
        normalRanges: {
            male: { min: '', max: '' },
            female: { min: '', max: '' },
            child: { min: '', max: '' },
            newborn: { min: '', max: '' },
            infant: { min: '', max: '' },
            geriatric: { min: '', max: '' },
        },
        fastingRequired: false,
        sampleVolume: '',
        testCode: '',
        reportType: 'numeric' as 'numeric' | 'text' | 'both',
        reportFormat: '',
        resultParameters: [] as Array<{
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
        }>
    });

    useEffect(() => {
        loadEditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    const loadEditData = async () => {
        try {
            // 1. Always load departments + meta FIRST
            const [depts, meta] = await Promise.all([
                DepartmentService.getDepartments(),
                LabTestService.getMetaOptions()
            ]);
            setDepartments(depts);
            setMetaOptions(meta);

            if (!isEditMode && depts.length > 0) {
                setFormData(prev => ({ ...prev, departmentId: depts[0]._id, departmentIds: [depts[0]._id] }));
            }

            // 2. If editing, load test details AFTER meta is ready
            if (isEditMode && testId) {
                setInitialLoading(true);
                try {
                    const test = await LabTestService.getTestById(testId);

                    // Resolve method field (stored as 'methodology' in DB)
                    const methodVal = test.method || (test as any).methodology || '';
                    // Resolve turnaround time (stored as 'temporalTATCycle' or 'turnaroundTime')
                    const tatVal = test.turnaroundTime || (test as any).temporalTATCycle || '';
                    const unitVal = test.unit || '';
                    const sampleTypeVal = test.sampleType || '';

                    // Inject any custom values into metaOptions so the dropdowns show them
                    setMetaOptions((prev: any) => {
                        const inject = (list: string[], val: string) =>
                            val && !list.some(x => x.toLowerCase() === val.toLowerCase())
                                ? [...list, val]
                                : list;
                        return {
                            ...prev,
                            methods: inject(prev.methods, methodVal),
                            sampleTypes: inject(prev.sampleTypes, sampleTypeVal),
                            turnaroundTimes: inject(prev.turnaroundTimes, tatVal),
                            units: inject(prev.units, unitVal),
                        };
                    });

                    // Map resultParameters — handle both inline subdoc and separate collection response
                    const rawParams = (test as any).resultParameters || [];
                    const mappedParams = rawParams.map((p: any) => ({
                        label: p.label || p.name || '',
                        unit: p.unit || '',
                        normalRange: p.normalRange || p.range || '',
                        remarks: p.remarks || '',
                        example: p.example || '',
                        fieldType: p.fieldType || p.type || 'text',
                        isRequired: p.isRequired ?? false,
                        displayOrder: p.displayOrder ?? 0,
                    }));

                    setFormData({
                        testName: test.testName || (test as any).name || '',
                        departmentId: typeof test.departmentId === 'object' ? (test.departmentId as any)?._id : test.departmentId || '',
                        departmentIds: (test as any).departmentIds?.map((d: any) => typeof d === 'object' ? d._id : d) ||
                            (test.departmentId ? [typeof test.departmentId === 'object' ? (test.departmentId as any)._id : test.departmentId] : []),
                        sampleType: sampleTypeVal,
                        price: test.price?.toString() || '0',
                        labPrice: (test as any).labPrice !== undefined ? (test as any).labPrice.toString() : '',
                        unit: unitVal,
                        method: methodVal,
                        turnaroundTime: tatVal,
                        normalRanges: {
                            male: { min: test.normalRanges?.male?.min?.toString() || '', max: test.normalRanges?.male?.max?.toString() || '' },
                            female: { min: test.normalRanges?.female?.min?.toString() || '', max: test.normalRanges?.female?.max?.toString() || '' },
                            child: { min: test.normalRanges?.child?.min?.toString() || '', max: test.normalRanges?.child?.max?.toString() || '' },
                            newborn: { min: test.normalRanges?.newborn?.min?.toString() || '', max: test.normalRanges?.newborn?.max?.toString() || '' },
                            infant: { min: test.normalRanges?.infant?.min?.toString() || '', max: test.normalRanges?.infant?.max?.toString() || '' },
                            geriatric: { min: test.normalRanges?.geriatric?.min?.toString() || '', max: test.normalRanges?.geriatric?.max?.toString() || '' },
                        },
                        fastingRequired: test.fastingRequired || false,
                        sampleVolume: (test as any).sampleVolume || '',
                        reportType: test.reportType || 'numeric',
                        reportFormat: (test as any).reportFormat || '',
                        testCode: (test as any).testCode || '',
                        resultParameters: mappedParams,
                    });
                } catch (error) {
                    console.error("Failed to fetch test details", error);
                    toast.error("Failed to load test details");
                    startNavigation(() => {
                        router.push('/lab/tests');
                    });
                } finally {
                    setInitialLoading(false);
                }
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
            toast.error("Failed to load form data");
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const priceVal = parseFloat(formData.price);
        if (isNaN(priceVal) || priceVal < 0) {
            toast.error("Price must be a valid positive number");
            setLoading(false);
            return;
        }
        const labPriceVal = formData.labPrice !== '' ? parseFloat(formData.labPrice) : undefined;
        if (labPriceVal !== undefined && (isNaN(labPriceVal) || labPriceVal < 0)) {
            toast.error("Lab-to-Lab price must be a valid positive number");
            setLoading(false);
            return;
        }
        const payload: any = {
            ...formData,
            price: priceVal,
            labPrice: labPriceVal,
            methodology: formData.method,
            temporalTATCycle: formData.turnaroundTime,
            normalRanges: {
                male: { min: parseFloat(formData.normalRanges.male.min) || 0, max: parseFloat(formData.normalRanges.male.max) || 0 },
                female: { min: parseFloat(formData.normalRanges.female.min) || 0, max: parseFloat(formData.normalRanges.female.max) || 0 },
                child: { min: parseFloat(formData.normalRanges.child.min) || 0, max: parseFloat(formData.normalRanges.child.max) || 0 },
                newborn: { min: parseFloat(formData.normalRanges.newborn.min) || 0, max: parseFloat(formData.normalRanges.newborn.max) || 0 },
                infant: { min: parseFloat(formData.normalRanges.infant.min) || 0, max: parseFloat(formData.normalRanges.infant.max) || 0 },
                geriatric: { min: parseFloat(formData.normalRanges.geriatric.min) || 0, max: parseFloat(formData.normalRanges.geriatric.max) || 0 },
            }
        };

        try {
            if (isEditMode && testId) {
                await LabTestService.updateTest(testId, payload);
                toast.success("Test updated successfully");
            } else {
                await LabTestService.addTest(payload);
                toast.success("Test added successfully");
            }
            startNavigation(() => {
                router.push('/lab/tests');
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to save test");
        } finally {
            setLoading(false);
        }
    };

    const handleRangeChange = (category: string, field: 'min' | 'max', value: string) => {
        setFormData(prev => ({
            ...prev,
            normalRanges: { ...prev.normalRanges, [category]: { ...(prev.normalRanges as any)[category], [field]: value } }
        }));
    };

    const openModal = (type: string, title: string) => {
        setModalState({ type, title });
        setNewItemName('');
    };

    const handleAddCustomItem = async () => {
        if (!newItemName.trim()) return;

        if (modalState.type === 'dept') {
            try {
                const res = await DepartmentService.addDepartment({ name: newItemName });
                setDepartments(prev => [...prev, res.department]);
                setFormData(prev => ({
                    ...prev,
                    departmentId: res.department._id,
                    departmentIds: [res.department._id]
                }));
                toast.success("Department added");
            } catch (e) { toast.error("Failed to add department"); }
        } else if (modalState.type === 'test') {
            setFormData(prev => ({ ...prev, testName: newItemName }));
        } else if (modalState.type === 'sample') {
            const trimmed = newItemName.trim();
            const alreadyExists = metaOptions.sampleTypes.some(
                (s: string) => s.trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyExists) return;
            const updatedSamples = [...metaOptions.sampleTypes, trimmed];
            setMetaOptions((prev: any) => ({
                ...prev,
                sampleTypes: updatedSamples,
            }));
            setFormData(prev => ({ ...prev, sampleType: trimmed }));
            persistMetaOptions({ sampleTypes: updatedSamples });
            toast.success(`Sample Type "${trimmed}" added`);
        } else if (modalState.type === 'method') {
            const trimmed = newItemName.trim();
            // Guard: block if already exists
            const alreadyExists = metaOptions.methods.some(
                (m: string) => m.trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyExists) return; // error shown inline, prevent add
            // Add to dropdown list
            const updatedMethods = [...metaOptions.methods, trimmed];
            setMetaOptions((prev: any) => ({
                ...prev,
                methods: updatedMethods,
            }));
            // Auto-select the new method
            setFormData(prev => ({ ...prev, method: trimmed }));
            persistMetaOptions({ methods: updatedMethods });
            toast.success(`Method "${trimmed}" added`);
        } else if (modalState.type === 'unit') {
            const trimmed = newItemName.trim();
            const alreadyExists = metaOptions.units.some(
                (u: string) => u.trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyExists) return;
            const updatedUnits = [...metaOptions.units, trimmed];
            setMetaOptions((prev: any) => ({
                ...prev,
                units: updatedUnits,
            }));
            setFormData(prev => ({ ...prev, unit: trimmed }));
            persistMetaOptions({ units: updatedUnits });
            toast.success(`Unit "${trimmed}" added`);
        } else if (modalState.type === 'tat') {
            setFormData(prev => ({ ...prev, turnaroundTime: newItemName }));
        }

        setModalState({ type: null, title: '' });
        setNewItemName('');
    };

    if (initialLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 animate-pulse">Loading test data...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
            <div className="flex items-center gap-4">
                <button disabled={isNavigating} onClick={() => startNavigation(() => router.back())} className={`p-2.5 bg-white dark:bg-gray-800 rounded-lg transition-colors border border-slate-200 dark:border-gray-700 ${isNavigating ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">
                        {isEditMode ? 'Edit Test' : 'Add New Test'}
                    </h1>
                    <p className="text-[10px] md:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Configure test parameters and pricing
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-indigo-600" />
                            Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] md:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    list="test-templates"
                                    required
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Complete Blood Count"
                                    value={formData.testName}
                                    onChange={e => setFormData({ ...formData, testName: e.target.value })}
                                />
                                <datalist id="test-templates">
                                    {metaOptions.testNames.map((n: string) => <option key={n} value={n} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Code
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. CBC-001"
                                    value={formData.testCode}
                                    onChange={e => setFormData({ ...formData, testCode: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Department <span className="text-rose-500">*</span>
                                </label>
                                <button type="button" onClick={() => openModal('dept', 'New Department')} className="text-xs font-medium text-indigo-600 hover:underline">
                                    + Add Department
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {departments.map(dept => {
                                    const isSelected = formData.departmentId === dept._id;
                                    return (
                                        <button
                                            key={dept._id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, departmentId: dept._id, departmentIds: [dept._id] })}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-300'}`}
                                        >
                                            {dept.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Test Parameters */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Database className="w-4 h-4 text-emerald-600" />
                                Test Parameters
                            </h2>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    sampleType: 'Blood',
                                    unit: 'g/dL',
                                    turnaroundTime: '24 Hours'
                                }))}
                                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 transition-all shadow-sm"
                            >
                                Reset to Defaults
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Sample Type <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openModal('sample', 'Add New Sample Type')}
                                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Type
                                        </button>
                                        <button
                                            type="button"
                                            title="Edit / Delete sample types"
                                            onClick={() => { setShowSampleManager(true); setEditingSample(null); }}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-600 transition-all"
                                        >
                                            <Settings className="w-3 h-3" />
                                            Manage
                                        </button>
                                    </div>
                                </div>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.sampleType}
                                    onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
                                    required
                                >
                                    <option value="">Select sample type...</option>
                                    {metaOptions.sampleTypes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Method
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openModal('method', 'Add New Method')}
                                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Method
                                        </button>
                                        <button
                                            type="button"
                                            title="Edit / Delete methods"
                                            onClick={() => { setShowMethodManager(true); setEditingMethod(null); setEditMethodError(''); }}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-600 transition-all"
                                        >
                                            <Settings className="w-3 h-3" />
                                            Manage
                                        </button>
                                    </div>
                                </div>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.method}
                                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                                >
                                    <option value="">Select method...</option>
                                    {metaOptions.methods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Unit
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openModal('unit', 'Add New Unit')}
                                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Unit
                                        </button>
                                        <button
                                            type="button"
                                            title="Edit / Delete units"
                                            onClick={() => { setShowUnitManager(true); setEditingUnit(null); }}
                                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 px-2 py-1 rounded-lg border border-slate-200 dark:border-gray-600 transition-all"
                                        >
                                            <Settings className="w-3 h-3" />
                                            Manage
                                        </button>
                                    </div>
                                </div>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer text-gray-700 dark:text-gray-300"
                                    value={formData.unit || ''}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="">Select unit...</option>
                                    {metaOptions.units?.map((u: string) => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Turnaround Time
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                                    value={formData.turnaroundTime}
                                    onChange={e => setFormData({ ...formData, turnaroundTime: e.target.value })}
                                >
                                    <option value="">Select turnaround time...</option>
                                    {metaOptions.turnaroundTimes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fastingRequired: !formData.fastingRequired })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${formData.fastingRequired ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData.fastingRequired ? 'border-orange-600 bg-orange-600' : 'border-gray-300'}`}>
                                        {formData.fastingRequired && <AlertCircle size={10} className="text-white" />}
                                    </div>
                                    <span className="text-sm font-medium">Fasting Required</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Normal Ranges */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Normal Reference Ranges</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Object.keys(formData.normalRanges) as Array<keyof typeof formData.normalRanges>).map((category) => (
                                <div key={category} className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800">
                                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 capitalize">{category}</h3>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            step="any"
                                            placeholder="Min"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={formData.normalRanges[category].min}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                if (val < 0) return;
                                                handleRangeChange(category, 'min', e.target.value);
                                            }}
                                            onWheel={e => (e.target as HTMLElement).blur()}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            step="any"
                                            placeholder="Max"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={formData.normalRanges[category].max}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                if (val < 0) return;
                                                handleRangeChange(category, 'max', e.target.value);
                                            }}
                                            onWheel={e => (e.target as HTMLElement).blur()}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                {/* Price */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Standard Price (₹) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₹</span>
                                <input
                                    type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    step="any"
                                    required
                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-2xl font-bold text-gray-900 dark:text-white"
                                    placeholder="0"
                                    value={formData.price}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        if (val < 0) return;
                                        setFormData({ ...formData, price: e.target.value });
                                    }}
                                    onWheel={e => (e.target as HTMLElement).blur()}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Charged to walk-in and inpatient billing</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                                Lab-to-Lab Price (₹)
                                <span className="text-xs font-normal text-gray-400 ml-1">(optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-purple-300">₹</span>
                                <input
                                    type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    step="any"
                                    className="w-full pl-10 pr-4 py-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 text-2xl font-bold text-purple-900 dark:text-purple-100"
                                    placeholder="—"
                                    value={formData.labPrice}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        if (val < 0) return;
                                        setFormData({ ...formData, labPrice: e.target.value });
                                    }}
                                    onWheel={e => (e.target as HTMLElement).blur()}
                                />
                            </div>
                            <p className="text-xs text-purple-500 mt-2">Discounted rate for referring labs. If empty, standard price applies.</p>
                        </div>
                    </div>
                </div>

                {/* Subtests */}
                <ResultParametersManager
                    parameters={formData.resultParameters}
                    onChange={(params) => setFormData({ ...formData, resultParameters: params })}
                />

                {/* Actions */}
                <div className="flex gap-4 items-center justify-end bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <button
                        type="button"
                        disabled={isNavigating}
                        onClick={() => startNavigation(() => router.back())}
                        className={`px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-colors ${isNavigating ? 'opacity-50' : ''}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={18} />
                                {isEditMode ? 'Save Changes' : 'Create Test'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Modal */}
            {modalState.type && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className={`px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between ${modalState.type === 'method' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                            <div className="flex items-center gap-3">
                                {modalState.type === 'method' && (
                                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                        <Database className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{modalState.title}</h3>
                                    {modalState.type === 'method' && (
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                            Will be added to the Method dropdown
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => { setModalState({ type: null, title: '' }); setNewItemName(''); }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {modalState.type === 'method' ? 'Method Name' : 'Name'}
                                </label>
                                {(() => {
                                    const isDuplicate = modalState.type === 'method' &&
                                        newItemName.trim() !== '' &&
                                        metaOptions.methods.some((m: string) =>
                                            m.trim().toLowerCase() === newItemName.trim().toLowerCase()
                                        );
                                    return (
                                        <>
                                            <input
                                                type="text"
                                                autoFocus
                                                className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg text-sm outline-none transition-all ${
                                                    isDuplicate
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                                                        : 'border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                                                }`}
                                                placeholder={
                                                    modalState.type === 'method'
                                                        ? 'e.g. Colorimetry, PCR, ELISA, Nephelometry...'
                                                        : 'Enter name...'
                                                }
                                                value={newItemName}
                                                onChange={e => setNewItemName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()}
                                            />
                                            {isDuplicate ? (
                                                <div className="mt-2 flex items-start gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                                                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-tight">
                                                        <span className="font-bold">&ldquo;{newItemName.trim()}&rdquo;</span> already exists in the Method list. Please try a different name.
                                                    </p>
                                                </div>
                                            ) : modalState.type === 'method' && (
                                                <p className="mt-1.5 text-xs text-gray-400">
                                                    Common methods: Automated, Manual, Colorimetry, ELISA, PCR, Nephelometry, Immunoassay, Flow Cytometry
                                                </p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setModalState({ type: null, title: '' }); setNewItemName(''); }}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddCustomItem}
                                    disabled={
                                        !newItemName.trim() ||
                                        (modalState.type === 'method' &&
                                            metaOptions.methods.some((m: string) =>
                                                m.trim().toLowerCase() === newItemName.trim().toLowerCase()
                                            ))
                                    }
                                    className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    {modalState.type === 'method' ? 'Add Method' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Method Manager Modal ── */}
            {showMethodManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-700 dark:bg-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Manage Methods</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Edit or delete existing methods</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowMethodManager(false); setEditingMethod(null); setEditMethodError(''); }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 max-h-[420px] overflow-y-auto space-y-2">
                            {metaOptions.methods.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No methods yet. Add one first.</p>
                                </div>
                            ) : (
                                metaOptions.methods.map((method: string, idx: number) => {
                                    const isEditing = editingMethod?.index === idx;
                                    const isDuplicateEdit = isEditing &&
                                        editingMethod!.value.trim() !== '' &&
                                        editingMethod!.value.trim().toLowerCase() !== method.toLowerCase() &&
                                        metaOptions.methods.some((m: string, i: number) =>
                                            i !== idx && m.trim().toLowerCase() === editingMethod!.value.trim().toLowerCase()
                                        );

                                    return (
                                        <div key={idx} className={`rounded-xl border transition-all ${isEditing ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:border-slate-200 dark:hover:border-gray-600'}`}>
                                            {isEditing ? (
                                                /* Edit Row */
                                                <div className="p-3 space-y-2">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingMethod!.value}
                                                        onChange={e => {
                                                            setEditingMethod({ index: idx, value: e.target.value });
                                                            setEditMethodError('');
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                // Confirm rename
                                                                const trimmed = editingMethod!.value.trim();
                                                                if (!trimmed) return;
                                                                if (isDuplicateEdit) return;
                                                                const updated = [...metaOptions.methods];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, methods: updated }));
                                                                // If this was the selected method, update selection
                                                                if (formData.method === oldName) {
                                                                    setFormData(prev => ({ ...prev, method: trimmed }));
                                                                }
                                                                persistMetaOptions({ methods: updated });
                                                                setEditingMethod(null);
                                                                setEditMethodError('');
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setEditingMethod(null);
                                                                setEditMethodError('');
                                                            }
                                                        }}
                                                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm outline-none transition-all ${
                                                            isDuplicateEdit
                                                                ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/20'
                                                                : 'border-indigo-300 dark:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                                                        }`}
                                                    />
                                                    {isDuplicateEdit && (
                                                        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                            <span>&ldquo;{editingMethod!.value.trim()}&rdquo; already exists. Use a different name.</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={!editingMethod!.value.trim() || isDuplicateEdit}
                                                            onClick={() => {
                                                                const trimmed = editingMethod!.value.trim();
                                                                if (!trimmed || isDuplicateEdit) return;
                                                                const updated = [...metaOptions.methods];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, methods: updated }));
                                                                if (formData.method === oldName) {
                                                                    setFormData(prev => ({ ...prev, method: trimmed }));
                                                                }
                                                                persistMetaOptions({ methods: updated });
                                                                setEditingMethod(null);
                                                                setEditMethodError('');
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingMethod(null); setEditMethodError(''); }}
                                                            className="flex-1 py-1.5 bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-gray-600 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Display Row */
                                                <div className="flex items-center justify-between px-4 py-3 group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{method}</span>
                                                        {formData.method === method && (
                                                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded">
                                                                selected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            title="Rename"
                                                            onClick={() => { setEditingMethod({ index: idx, value: method }); setEditMethodError(''); }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Delete"
                                                            onClick={() => {
                                                                const updated = metaOptions.methods.filter((_: string, i: number) => i !== idx);
                                                                setMetaOptions((prev: any) => ({ ...prev, methods: updated }));
                                                                // Clear selection if deleted method was selected
                                                                if (formData.method === method) {
                                                                    setFormData(prev => ({ ...prev, method: '' }));
                                                                }
                                                                persistMetaOptions({ methods: updated });
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 bg-slate-50 dark:bg-gray-700/30 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs text-gray-400">{metaOptions.methods.length} method{metaOptions.methods.length !== 1 ? 's' : ''} total</p>
                            <button
                                type="button"
                                onClick={() => { setShowMethodManager(false); setEditingMethod(null); setEditMethodError(''); }}
                                className="px-4 py-2 bg-slate-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-gray-500 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sample Type Manager Modal ── */}
            {showSampleManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-5 bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-700 dark:bg-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Manage Sample Types</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Edit or delete existing sample types</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowSampleManager(false); setEditingSample(null); }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 max-h-[420px] overflow-y-auto space-y-2">
                            {metaOptions.sampleTypes.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No sample types yet. Add one first.</p>
                                </div>
                            ) : (
                                metaOptions.sampleTypes.map((sample: string, idx: number) => {
                                    const isEditing = editingSample?.index === idx;
                                    const isDuplicateEdit = isEditing &&
                                        editingSample!.value.trim() !== '' &&
                                        editingSample!.value.trim().toLowerCase() !== sample.toLowerCase() &&
                                        metaOptions.sampleTypes.some((s: string, i: number) =>
                                            i !== idx && s.trim().toLowerCase() === editingSample!.value.trim().toLowerCase()
                                        );

                                    return (
                                        <div key={idx} className={`rounded-xl border transition-all ${isEditing ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:border-slate-200 dark:hover:border-gray-600'}`}>
                                            {isEditing ? (
                                                <div className="p-3 space-y-2">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingSample!.value}
                                                        onChange={e => { setEditingSample({ index: idx, value: e.target.value }); }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const trimmed = editingSample!.value.trim();
                                                                if (!trimmed || isDuplicateEdit) return;
                                                                const updated = [...metaOptions.sampleTypes];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, sampleTypes: updated }));
                                                                if (formData.sampleType === oldName) setFormData(prev => ({ ...prev, sampleType: trimmed }));
                                                                persistMetaOptions({ sampleTypes: updated });
                                                                setEditingSample(null);
                                                            }
                                                            if (e.key === 'Escape') { setEditingSample(null); }
                                                        }}
                                                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm outline-none transition-all ${isDuplicateEdit ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/20' : 'border-indigo-300 dark:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'}`}
                                                    />
                                                    {isDuplicateEdit && (
                                                        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                            <span>&ldquo;{editingSample!.value.trim()}&rdquo; already exists.</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={!editingSample!.value.trim() || isDuplicateEdit}
                                                            onClick={() => {
                                                                const trimmed = editingSample!.value.trim();
                                                                if (!trimmed || isDuplicateEdit) return;
                                                                const updated = [...metaOptions.sampleTypes];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, sampleTypes: updated }));
                                                                if (formData.sampleType === oldName) setFormData(prev => ({ ...prev, sampleType: trimmed }));
                                                                persistMetaOptions({ sampleTypes: updated });
                                                                setEditingSample(null);
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingSample(null); }}
                                                            className="flex-1 py-1.5 bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-gray-600 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between px-4 py-3 group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{sample}</span>
                                                        {formData.sampleType === sample && (
                                                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded">selected</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingSample({ index: idx, value: sample }); }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = metaOptions.sampleTypes.filter((_: string, i: number) => i !== idx);
                                                                setMetaOptions((prev: any) => ({ ...prev, sampleTypes: updated }));
                                                                if (formData.sampleType === sample) setFormData(prev => ({ ...prev, sampleType: '' }));
                                                                persistMetaOptions({ sampleTypes: updated });
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="px-5 py-4 bg-slate-50 dark:bg-gray-700/30 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs text-gray-400">{metaOptions.sampleTypes.length} type{metaOptions.sampleTypes.length !== 1 ? 's' : ''} total</p>
                            <button
                                type="button"
                                onClick={() => { setShowSampleManager(false); setEditingSample(null); }}
                                className="px-4 py-2 bg-slate-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-gray-500 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Unit Manager Modal ── */}
            {showUnitManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-5 bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-700 dark:bg-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Manage Units</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Edit or delete existing units</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowUnitManager(false); setEditingUnit(null); }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 max-h-[420px] overflow-y-auto space-y-2">
                            {metaOptions.units.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No units yet. Add one first.</p>
                                </div>
                            ) : (
                                metaOptions.units.map((unit: string, idx: number) => {
                                    const isEditing = editingUnit?.index === idx;
                                    const isDuplicateEdit = isEditing &&
                                        editingUnit!.value.trim() !== '' &&
                                        editingUnit!.value.trim().toLowerCase() !== unit.toLowerCase() &&
                                        metaOptions.units.some((u: string, i: number) =>
                                            i !== idx && u.trim().toLowerCase() === editingUnit!.value.trim().toLowerCase()
                                        );

                                    return (
                                        <div key={idx} className={`rounded-xl border transition-all ${isEditing ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:border-slate-200 dark:hover:border-gray-600'}`}>
                                            {isEditing ? (
                                                <div className="p-3 space-y-2">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingUnit!.value}
                                                        onChange={e => { setEditingUnit({ index: idx, value: e.target.value }); }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const trimmed = editingUnit!.value.trim();
                                                                if (!trimmed || isDuplicateEdit) return;
                                                                const updated = [...metaOptions.units];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, units: updated }));
                                                                if (formData.unit === oldName) setFormData(prev => ({ ...prev, unit: trimmed }));
                                                                persistMetaOptions({ units: updated });
                                                                setEditingUnit(null);
                                                            }
                                                            if (e.key === 'Escape') { setEditingUnit(null); }
                                                        }}
                                                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm outline-none transition-all ${isDuplicateEdit ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/20' : 'border-indigo-300 dark:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'}`}
                                                    />
                                                    {isDuplicateEdit && (
                                                        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                            <span>&ldquo;{editingUnit!.value.trim()}&rdquo; already exists.</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={!editingUnit!.value.trim() || isDuplicateEdit}
                                                            onClick={() => {
                                                                const trimmed = editingUnit!.value.trim();
                                                                if (!trimmed || isDuplicateEdit) return;
                                                                const updated = [...metaOptions.units];
                                                                const oldName = updated[idx];
                                                                updated[idx] = trimmed;
                                                                setMetaOptions((prev: any) => ({ ...prev, units: updated }));
                                                                if (formData.unit === oldName) setFormData(prev => ({ ...prev, unit: trimmed }));
                                                                persistMetaOptions({ units: updated });
                                                                setEditingUnit(null);
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingUnit(null); }}
                                                            className="flex-1 py-1.5 bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-gray-600 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between px-4 py-3 group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{unit}</span>
                                                        {formData.unit === unit && (
                                                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded">selected</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingUnit({ index: idx, value: unit }); }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = metaOptions.units.filter((_: string, i: number) => i !== idx);
                                                                setMetaOptions((prev: any) => ({ ...prev, units: updated }));
                                                                if (formData.unit === unit) setFormData(prev => ({ ...prev, unit: '' }));
                                                                persistMetaOptions({ units: updated });
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="px-5 py-4 bg-slate-50 dark:bg-gray-700/30 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs text-gray-400">{metaOptions.units.length} unit{metaOptions.units.length !== 1 ? 's' : ''} total</p>
                            <button
                                type="button"
                                onClick={() => { setShowUnitManager(false); setEditingUnit(null); }}
                                className="px-4 py-2 bg-slate-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-gray-500 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(ManageTestPage);


