'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Package, IndianRupee, Calendar, ChevronDown, Search, Check } from 'lucide-react';
import { LabInventoryService } from '@/lib/integrations/services/labInventory.service';
import { toast } from 'react-hot-toast';

const DEFAULT_CATEGORIES = [
    'Reagent',
    'Test Kit',
    'Consumable',
    'Glassware',
    'Chemical',
    'General Item',
    'Other',
];

const DEFAULT_UNITS = [
    'Piece',
    'Box',
    'Bottle',
    'Pack',
    'Kit',
    'Tube',
    'Strip',
    'Pair',
    'Roll',
    'Liter',
    'mL',
    'Gram',
    'Kg',
];

function useLocalList(key: string, defaults: string[]) {
    const [items, setItems] = useState<string[]>(() => {
        if (typeof window === 'undefined') return defaults;
        try {
            const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
            return Array.from(new Set([...defaults, ...stored]));
        } catch {
            return defaults;
        }
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

function ManageInventoryItemPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const searchParams = useSearchParams() as any;
    const itemId = ((searchParams?.get('id') ?? null) ?? null);
    const isEditMode = !!itemId;

    const categories = useLocalList('inv_categories', DEFAULT_CATEGORIES);
    const units = useLocalList('inv_units', DEFAULT_UNITS);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [isNavigating, startNavigation] = useTransition();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'Reagent',
        unit: 'Piece',
        quantity: 0,
        purchasePrice: 0,
        mrp: 0,
        reorderLevel: 5,
        image: '',
        brand: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        description: '',
        notes: '',
    });

    useEffect(() => {
        if (isEditMode && itemId) {
            loadInitialData();
        }
    }, [itemId]);

    const loadInitialData = async () => {
        setInitialLoading(true);
        try {
            const data = await LabInventoryService.getInventoryById(itemId!);
            setFormData({
                name: data.name || '',
                code: data.code || '',
                category: data.category || 'Reagent',
                unit: data.unit || 'Piece',
                quantity: data.quantity ?? 0,
                purchasePrice: data.purchasePrice ?? 0,
                mrp: data.mrp ?? 0,
                reorderLevel: data.reorderLevel ?? 5,
                image: data.image || '',
                brand: data.brand || '',
                batchNumber: data.batchNumber || '',
                manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate).toISOString().split('T')[0] : '',
                expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString().split('T')[0] : '',
                description: data.description || '',
                notes: data.notes || '',
            });
        } catch (error) {
            console.error("Failed to load inventory item details", error);
            toast.error("Failed to load item details");
        } finally {
            setInitialLoading(false);
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) return 'Item Name is required';
        if (!formData.code.trim()) return 'Item Code is required';
        if (!formData.category) return 'Category is required';
        if (!formData.unit) return 'Unit is required';
        if (Number(formData.quantity) < 0) return 'Quantity cannot be less than 0';
        if (Number(formData.purchasePrice) < 0) return 'Purchase Price cannot be negative';
        if (Number(formData.mrp) < 0) return 'MRP cannot be negative';
        if (Number(formData.mrp) < Number(formData.purchasePrice)) return 'MRP cannot be less than Purchase Price';
        if (Number(formData.reorderLevel) < 0) return 'Reorder Level cannot be negative';

        if (formData.manufacturingDate && formData.expiryDate) {
            const mDate = new Date(formData.manufacturingDate);
            const eDate = new Date(formData.expiryDate);
            if (eDate <= mDate) return 'Expiry Date must be greater than Manufacturing Date';
        }

        return null;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const err = validateForm();
        if (err) {
            toast.error(err);
            return;
        }

        setLoading(true);
        const payload = {
            ...formData,
            quantity: Number(formData.quantity),
            purchasePrice: Number(formData.purchasePrice),
            mrp: Number(formData.mrp),
            reorderLevel: Number(formData.reorderLevel),
        };

        try {
            if (isEditMode && itemId) {
                await LabInventoryService.updateInventoryItem(itemId, payload);
                toast.success('Inventory item updated successfully');
            } else {
                await LabInventoryService.createInventoryItem(payload);
                toast.success('Inventory item created successfully');
            }
            startNavigation(() => {
                router.push(`/${hospitalId}/lab/inventory`);
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to save inventory item');
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
                            {isEditMode ? 'Edit Inventory Item' : 'Add Inventory Item'}
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                            {isEditMode ? 'Modify item specifications' : 'Configure new laboratory stock item'}
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
                    Save Item
                </button>
            </div>

            {initialLoading ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading details...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: Basic Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <Package className="w-4 h-4 text-indigo-600" />
                            Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Item Name */}
                            <div>
                                <label className={labelCls}>Item Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. EDTA Tube 4ml"
                                    className={inputCls}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Item Code */}
                            <div>
                                <label className={labelCls}>Item Code (Unique) <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. INV-EDTA-001"
                                    className={inputCls + ' uppercase font-mono'}
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            {/* Category picker */}
                            <DynamicPicker
                                label="Category" required
                                value={formData.category}
                                onChange={v => setFormData({ ...formData, category: v })}
                                items={categories.items}
                                onAdd={categories.add}
                                onRemove={categories.remove}
                                placeholder="Select category..."
                            />

                            {/* Brand */}
                            <div>
                                <label className={labelCls}>Brand (Optional)</label>
                                <input
                                    type="text" placeholder="e.g. BD Biosciences"
                                    className={inputCls}
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className={labelCls}>Description (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief specifications of the item..."
                                    className={inputCls}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Item Image */}
                            <div className="md:col-span-2">
                                <label className={labelCls}>Item Image (Optional)</label>
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
                                                    const res = await LabInventoryService.uploadImage(uploadData);
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

                    {/* SECTION 2: Stock & Unit Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <Plus className="w-4 h-4 text-indigo-600" />
                            Stock & Unit Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Quantity in stock */}
                            <div>
                                <label className={labelCls}>Quantity in Stock <span className="text-rose-500">*</span></label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} required
                                    className={inputCls + ' font-bold font-mono'}
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Unit Picker */}
                            <DynamicPicker
                                label="Unit" required
                                value={formData.unit}
                                onChange={v => setFormData({ ...formData, unit: v })}
                                items={units.items}
                                onAdd={units.add}
                                onRemove={units.remove}
                                placeholder="Select unit..."
                            />

                            {/* Reorder Level */}
                            <div>
                                <label className={labelCls}>Reorder Level (Alert Limit) <span className="text-rose-500">*</span></label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} required
                                    className={inputCls + ' font-bold font-mono'}
                                    value={formData.reorderLevel}
                                    onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Purchase & Price Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            Purchase & Pricing Information
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

                            {/* MRP */}
                            <div>
                                <label className={labelCls}>MRP (₹) <span className="text-rose-500">*</span></label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} required
                                    className={inputCls + ' font-bold font-mono'}
                                    value={formData.mrp}
                                    onChange={e => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Batch & Manufacturing Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            Batch & Expiry Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Batch Number */}
                            <div>
                                <label className={labelCls}>Batch Number (Optional)</label>
                                <input
                                    type="text" placeholder="e.g. BATCH-901"
                                    className={inputCls + ' font-mono'}
                                    value={formData.batchNumber}
                                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                                />
                            </div>

                            {/* Manufacturing Date */}
                            <div>
                                <label className={labelCls}>Manufacturing Date (Optional)</label>
                                <input
                                    type="date"
                                    className={inputCls + ' cursor-pointer'}
                                    value={formData.manufacturingDate}
                                    onChange={e => setFormData({ ...formData, manufacturingDate: e.target.value })}
                                />
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <label className={labelCls}>Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    className={inputCls + ' cursor-pointer'}
                                    value={formData.expiryDate}
                                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                />
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-3">
                                <label className={labelCls}>Internal Notes (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Storage instructions, special handling guidelines..."
                                    className={inputCls}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}

export default React.memo(ManageInventoryItemPage);
