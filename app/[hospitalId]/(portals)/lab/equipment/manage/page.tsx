'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Cpu, IndianRupee, ChevronDown, Search, Check } from 'lucide-react';
import { LabEquipmentService } from '@/lib/integrations/services/labEquipment.service';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────
   Default seed lists  (merged with anything stored locally)
───────────────────────────────────────────────────────── */
const DEFAULT_CATEGORIES = [
    'Analyzer', 'Microscope', 'Centrifuge', 'Incubator', 'Autoclave',
    'Refrigerator', 'Freezer', 'Water Bath', 'Hot Air Oven', 'PCR Machine',
    'ELISA Reader', 'Laminar Air Flow', 'Blood Gas Analyzer',
    'Electrolyte Analyzer', 'Urine Analyzer', 'HbA1c Analyzer',
    'Hematology Analyzer', 'Biochemistry Analyzer', 'Coagulation Analyzer',
    'Immunoassay Analyzer', 'Other',
];
const DEFAULT_UNITS = [
    'Pcs', 'Units', 'Set', 'Box', 'Kit', 'Pair', 'Roll', 'Pack', 'Bottle', 'Litre',
];

function useLocalList(key: string, defaults: string[]) {
    const [items, setItems] = useState<string[]>(() => {
        if (typeof window === 'undefined') return defaults;
        try {
            const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
            const merged = Array.from(new Set([...defaults, ...stored]));
            return merged;
        } catch { return defaults; }
    });

    const add = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || items.includes(trimmed)) return false;
        const next = [...items, trimmed];
        setItems(next);
        try {
            const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
            localStorage.setItem(key, JSON.stringify(Array.from(new Set([...stored, trimmed]))));
        } catch { /* ignore */ }
        return true;
    };

    const remove = (value: string) => {
        setItems(prev => prev.filter(i => i !== value));
        try {
            const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
            localStorage.setItem(key, JSON.stringify(stored.filter((i: string) => i !== value)));
        } catch { /* ignore */ }
    };

    return { items, add, remove };
}

/* ─────────────────────────────────────────────────────────
   Reusable searchable-dropdown with inline add & delete
───────────────────────────────────────────────────────── */
interface DynamicPickerProps {
    label: string;
    required?: boolean;
    value: string;
    onChange: (v: string) => void;
    items: string[];
    onAdd: (v: string) => boolean;
    onRemove: (v: string) => void;
    placeholder?: string;
}

function DynamicPicker({ label, required, value, onChange, items, onAdd, onRemove, placeholder }: DynamicPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [newVal, setNewVal] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

    const handleAdd = () => {
        if (!newVal.trim()) return;
        const added = onAdd(newVal.trim());
        if (added) {
            onChange(newVal.trim());
            setOpen(false);
        } else {
            toast.error(`"${newVal.trim()}" already exists`);
        }
        setNewVal('');
    };

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setSearch(''); }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold flex items-center justify-between cursor-pointer"
            >
                <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {value || placeholder || `Select ${label}`}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-gray-700">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                        />
                    </div>

                    {/* List */}
                    <div className="max-h-44 overflow-y-auto">
                        {filtered.length === 0 && (
                            <p className="text-xs text-gray-400 px-3 py-2.5 text-center">No results</p>
                        )}
                        {filtered.map(item => (
                            <div
                                key={item}
                                className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer group"
                                onClick={() => { onChange(item); setOpen(false); }}
                            >
                                <span className={`text-xs font-semibold ${item === value ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {item}
                                </span>
                                <div className="flex items-center gap-1">
                                    {item === value && <Check className="w-3 h-3 text-indigo-500" />}
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); onRemove(item); if (value === item) onChange(''); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-50 text-rose-400 transition-opacity"
                                        title="Remove"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add new */}
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-gray-700">
                        <input
                            type="text"
                            value={newVal}
                            onChange={e => setNewVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                            placeholder={`Add new ${label.toLowerCase()}...`}
                            className="flex-1 text-xs bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────── */
function ManageEquipmentPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const searchParams = useSearchParams() as any;
    const equipmentId = ((searchParams?.get('id') ?? null) ?? null);
    const isEditMode = !!equipmentId;

    const categories = useLocalList('eq_categories', DEFAULT_CATEGORIES);
    const units = useLocalList('eq_units', DEFAULT_UNITS);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [isNavigating, startNavigation] = useTransition();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'Analyzer',
        department: '',
        brand: '',
        model: '',
        quantity: 1,
        unit: 'Pcs',
        purchasePrice: 0,
        purchaseDate: '',
        status: 'Working' as string,
        image: '',
    });

    useEffect(() => {
        loadInitialData();
    }, [equipmentId]);

    const loadInitialData = async () => {
        setInitialLoading(true);
        try {
            const depts = await DepartmentService.getDepartments();
            setDepartments(depts);

            if (!isEditMode && depts.length > 0) {
                setFormData(prev => ({ ...prev, department: depts[0]._id }));
            }

            if (isEditMode && equipmentId) {
                const data = await LabEquipmentService.getEquipmentById(equipmentId);
                const deptId = typeof data.department === 'object' ? (data.department as any)._id : data.department;
                setFormData({
                    name: data.name || '',
                    code: data.code || '',
                    category: data.category || 'Analyzer',
                    department: deptId || '',
                    brand: data.brand || '',
                    model: data.model || '',
                    quantity: data.quantity ?? 1,
                    unit: data.unit || 'Pcs',
                    purchasePrice: data.purchasePrice ?? 0,
                    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate).toISOString().split('T')[0] : '',
                    status: data.status || 'Working',
                    image: data.image || '',
                });
            }
        } catch (error) {
            console.error('Failed to load form details', error);
            toast.error('Failed to load initial form data');
        } finally {
            setInitialLoading(false);
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) return 'Equipment Name is required';
        if (!formData.code.trim()) return 'Equipment Code is required';
        if (!formData.category) return 'Category is required';
        if (!formData.brand.trim()) return 'Brand is required';
        if (!formData.model.trim()) return 'Model is required';
        if (Number(formData.quantity) < 0) return 'Quantity cannot be less than 0';
        if (!formData.unit.trim()) return 'Unit is required';
        if (Number(formData.purchasePrice) < 0) return 'Purchase Price cannot be negative';
        if (!formData.purchaseDate) return 'Purchase Date is required';
        return null;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const err = validateForm();
        if (err) { toast.error(err); return; }

        setLoading(true);
        const payload = {
            ...formData,
            quantity: Number(formData.quantity),
            purchasePrice: Number(formData.purchasePrice),
        };

        try {
            if (isEditMode && equipmentId) {
                await LabEquipmentService.updateEquipment(equipmentId, payload as any);
                toast.success('Equipment updated successfully');
            } else {
                await LabEquipmentService.createEquipment(payload as any);
                toast.success('Equipment created successfully');
            }
            startNavigation(() => { router.push(`/${hospitalId}/lab/equipment`); });
        } catch (error: any) {
            toast.error(error.message || 'Failed to save equipment');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold';
    const labelCls = 'block text-xs font-medium text-gray-500 mb-1.5';

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl transition-colors border border-slate-200 dark:border-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEditMode ? 'Edit Lab Equipment' : 'Add New Equipment'}
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                            {isEditMode ? 'Modify record details' : 'Configure new laboratory asset'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || initialLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all uppercase tracking-wider disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    Save Asset
                </button>
            </div>

            {initialLoading ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading details...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── SECTION 1: Basic Information ── */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <Cpu className="w-4 h-4 text-indigo-600" />
                            Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Equipment Name */}
                            <div>
                                <label className={labelCls}>Equipment Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. PCR Thermocycler"
                                    className={inputCls}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Equipment Code */}
                            <div>
                                <label className={labelCls}>Equipment Code (Unique) <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. EQ-PCR-001"
                                    className={inputCls + ' uppercase font-mono'}
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            {/* Category — Dynamic Picker */}
                            <DynamicPicker
                                label="Category" required
                                value={formData.category}
                                onChange={v => setFormData({ ...formData, category: v })}
                                items={categories.items}
                                onAdd={categories.add}
                                onRemove={categories.remove}
                                placeholder="Select category..."
                            />

                            {/* Department */}
                            <div>
                                <label className={labelCls}>Department <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                                <select
                                    className={inputCls + ' cursor-pointer'}
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="">Select department...</option>
                                    {departments.map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Brand */}
                            <div>
                                <label className={labelCls}>Brand <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. Bio-Rad"
                                    className={inputCls}
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>

                            {/* Model */}
                            <div>
                                <label className={labelCls}>Model <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. T100"
                                    className={inputCls}
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className={labelCls}>Quantity <span className="text-rose-500">*</span></label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} required
                                    className={inputCls + ' font-bold font-mono'}
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Unit — Dynamic Picker */}
                            <DynamicPicker
                                label="Unit" required
                                value={formData.unit}
                                onChange={v => setFormData({ ...formData, unit: v })}
                                items={units.items}
                                onAdd={units.add}
                                onRemove={units.remove}
                                placeholder="Select unit..."
                            />

                            {/* Equipment Image */}
                            <div className="md:col-span-2">
                                <label className={labelCls}>Equipment Image (Optional)</label>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl">
                                    {formData.image ? (
                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-gray-700 shrink-0">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow transition-colors"
                                                title="Remove Image"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-slate-100 dark:bg-gray-800 border border-dashed border-slate-300 dark:border-gray-600 flex items-center justify-center text-gray-400 shrink-0">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const uploadData = new FormData();
                                                uploadData.append('image', file);
                                                const loadingToast = toast.loading('Uploading image...');
                                                try {
                                                    const res = await LabEquipmentService.uploadImage(uploadData);
                                                    setFormData({ ...formData, image: res.url });
                                                    toast.success('Image uploaded successfully', { id: loadingToast });
                                                } catch (err: any) {
                                                    toast.error(err.message || 'Image upload failed', { id: loadingToast });
                                                }
                                            }}
                                            className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 dark:file:bg-indigo-950/30 dark:file:text-indigo-400 cursor-pointer"
                                        />
                                        <p className="text-[10px] text-gray-400 font-medium">Supports JPG, PNG, GIF up to 5MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 2: Purchase Details ── */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            Purchase Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Purchase Price */}
                            <div>
                                <label className={labelCls}>Purchase Price (₹) <span className="text-rose-500">*</span></label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} required
                                    className={inputCls + ' font-bold font-mono'}
                                    value={formData.purchasePrice}
                                    onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Purchase Date */}
                            <div>
                                <label className={labelCls}>Purchase Date <span className="text-rose-500">*</span></label>
                                <input
                                    type="date" required
                                    className={inputCls + ' cursor-pointer'}
                                    value={formData.purchaseDate}
                                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                />
                            </div>

                            {/* Current Status */}
                            <div>
                                <label className={labelCls}>Current Status <span className="text-rose-500">*</span></label>
                                <select
                                    required
                                    className={inputCls + ' cursor-pointer'}
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    {['Working', 'Under Maintenance', 'Repairing', 'Out of Service', 'Inactive', 'Disposed'].map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                </form>
            )}
        </div>
    );
}

export default React.memo(ManageEquipmentPage);

