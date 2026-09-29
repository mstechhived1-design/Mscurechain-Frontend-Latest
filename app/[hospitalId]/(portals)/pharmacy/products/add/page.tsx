'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Save,
    Info,
    Warehouse,
    IndianRupee,
    Calendar,
    Box,
    Pill,
    Tag,
    Hash,
    ChevronDown
} from 'lucide-react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { PharmacyProductPayload } from '@/lib/integrations/types/product';
import { Supplier } from '@/lib/integrations/types/supplier';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';

// --- Predefined form factor options ---
const FORM_OPTIONS = [
    'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT',
    'DROPS', 'POWDER', 'SUSPENSION', 'GEL', 'LOTION', 'INHALER',
    'SPRAY', 'PATCH', 'SACHET', 'SUPPOSITORY', 'SOLUTION',
    'SR TAB', 'SR CAP', 'GRANULES', 'RESPULES', 'CHEWABLE',
];

// --- Custom Combobox for Form Factor ---
const FormCombobox = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = FORM_OPTIONS.filter(opt =>
        opt.toLowerCase().includes((search || value).toLowerCase())
    );

    // Show all options when dropdown opens with empty search
    const displayOptions = search === '' && open ? FORM_OPTIONS : filtered;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={open ? search : value}
                    placeholder="Type or select form…"
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none pr-10"
                    onFocus={() => { setOpen(true); setSearch(''); }}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setOpen(true);
                        // If user types a brand-new custom value, update immediately
                        onChange(e.target.value.toUpperCase());
                    }}
                />
                <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => { setOpen(!open); inputRef.current?.focus(); }}
                    tabIndex={-1}
                >
                    <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {open && displayOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                    {displayOptions.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors ${opt === value ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                            onClick={() => {
                                onChange(opt);
                                setSearch('');
                                setOpen(false);
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
            {open && search && !FORM_OPTIONS.some(o => o === search.toUpperCase()) && (
                <p className="text-[10px] font-semibold text-teal-600 mt-1 pl-1">
                    ✨ Custom form factor: <span className="font-bold">{search.toUpperCase()}</span>
                </p>
            )}
        </div>
    );
};

// --- Main Page ---
const AddProductPage = () => {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [formData, setFormData] = useState<PharmacyProductPayload>({
        sku: '',
        name: '',
        genericName: '',
        brandName: '',
        strength: '',
        form: 'TABLET',
        schedule: 'OTC',
        mrp: 0,
        unitCost: 0,
        gst: 12,
        currentStock: 0,
        minStockLevel: 10,
        unitsPerPack: 1,
        supplier: '',
        hsnCode: '',
        batchNumber: '',
        expiryDate: '',
    });

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await SupplierService.getSuppliers();
                setSuppliers(data);
            } catch {
                console.error('Failed to fetch suppliers');
            }
        };
        fetchSuppliers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.sku) { toast.error('SKU is required'); return; }
        if (!formData.brandName) { toast.error('Brand name is required'); return; }
        if (!formData.genericName) { toast.error('Generic name is required'); return; }
        if (!formData.form) { toast.error('Form factor is required'); return; }
        if (!formData.strength) { toast.error('Strength is required'); return; }
        if (!formData.supplier) { toast.error('Please select a supplier'); return; }

        setLoading(true);
        try {
            const cleanedData: PharmacyProductPayload = {
                ...formData,
                mrp: Number(formData.mrp) || 0,
                unitCost: Number(formData.unitCost) || 0,
                gst: Number(formData.gst) || 0,
                currentStock: Number(formData.currentStock) || 0,
                minStockLevel: Number(formData.minStockLevel) || 10,
                unitsPerPack: Number(formData.unitsPerPack) || 1,
            };
            await ProductService.addProduct(cleanedData);
            toast.success('Medicine registered successfully');
            router.push(getPath('/pharmacy/products'));
        } catch (error: any) {
            toast.error(error.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none";
    const labelClasses = "text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-2";

    return (
        <div className="max-w-7xl mx-auto pb-20 pt-8 px-4">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
            >
                <ChevronLeft size={16} />
                Back to Registry
            </button>

            <div className="mb-10">
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">Register New Medicine</h1>
                <p className="text-sm text-gray-500">Add detailed information to register a new product in your pharmacy inventory.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* ============ SECTION 1: Basic Identification ============ */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-teal-600">
                        <Info size={18} />
                        <h3 className="font-bold">Identification</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        {/* SKU */}
                        <div>
                            <label className={labelClasses}><Hash size={14} /> SKU / Item Code <span className="text-red-400">*</span></label>
                            <input name="sku" value={formData.sku} onChange={handleChange} required placeholder="e.g. MED-001" className={inputClasses} />
                        </div>

                        {/* Brand */}
                        <div>
                            <label className={labelClasses}><Tag size={14} /> Brand Name <span className="text-red-400">*</span></label>
                            <input name="brandName" value={formData.brandName} onChange={handleChange} required placeholder="e.g. Crocin" className={inputClasses} />
                        </div>

                        {/* Generic */}
                        <div>
                            <label className={labelClasses}>Generic Name <span className="text-red-400">*</span></label>
                            <input name="genericName" value={formData.genericName} onChange={handleChange} required placeholder="e.g. Paracetamol IP" className={inputClasses} />
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className={labelClasses}>Display Name <span className="text-gray-400 text-[10px] font-normal">(auto-generated if blank)</span></label>
                            <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Crocin 500mg Tablet" className={inputClasses} />
                        </div>

                        {/* Form Factor - Customizable Combobox */}
                        <div>
                            <label className={labelClasses}><Pill size={14} /> Form Factor <span className="text-red-400">*</span></label>
                            <FormCombobox
                                value={formData.form || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, form: val }))}
                            />
                        </div>

                        {/* Strength */}
                        <div>
                            <label className={labelClasses}>Strength <span className="text-red-400">*</span></label>
                            <input name="strength" value={formData.strength} onChange={handleChange} required placeholder="e.g. 500mg" className={inputClasses} />
                        </div>

                        {/* Schedule */}
                        <div>
                            <label className={labelClasses}>Schedule</label>
                            <select name="schedule" value={formData.schedule} onChange={handleChange} className={inputClasses}>
                                <option value="OTC">OTC (Over the Counter)</option>
                                <option value="H">H (Schedule H)</option>
                                <option value="H1">H1 (Schedule H1)</option>
                                <option value="X">X (Schedule X)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ============ SECTION 2: Pricing & Taxation ============ */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-emerald-600">
                        <IndianRupee size={18} />
                        <h3 className="font-bold">Pricing & Taxation</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                        {/* MRP */}
                        <div>
                            <label className={labelClasses}>MRP (₹) <span className="text-red-400">*</span></label>
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="mrp" value={formData.mrp || ''} onChange={handleChange} required step="0.01" placeholder="0.00" className={inputClasses} />
                        </div>

                        {/* Unit Cost */}
                        <div>
                            <label className={labelClasses}>Unit Cost / Purchase Price (₹)</label>
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="unitCost" value={formData.unitCost || ''} onChange={handleChange} step="0.01" placeholder="0.00" className={inputClasses} />
                        </div>

                        {/* GST */}
                        <div>
                            <label className={labelClasses}>GST (%)</label>
                            <select name="gst" value={formData.gst} onChange={handleChange} className={inputClasses}>
                                {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                            </select>
                        </div>

                        {/* HSN Code */}
                        <div>
                            <label className={labelClasses}>HSN / SAC Code</label>
                            <input name="hsnCode" value={formData.hsnCode} onChange={handleChange} placeholder="e.g. 3004" className={inputClasses} />
                        </div>
                    </div>
                </div>

                {/* ============ SECTION 3: Inventory & Supply Chain ============ */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                        <Warehouse size={18} />
                        <h3 className="font-bold">Inventory & Supply Chain</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        {/* Batch Number */}
                        <div>
                            <label className={labelClasses}>Batch Number</label>
                            <input name="batchNumber" value={formData.batchNumber} onChange={handleChange} placeholder="e.g. BATCH-2026-01" className={inputClasses} />
                        </div>

                        {/* Expiry Date */}
                        <div>
                            <label className={labelClasses}><Calendar size={14} /> Expiry Date</label>
                            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputClasses} />
                        </div>

                        {/* Opening Stock */}
                        <div>
                            <label className={labelClasses}><Box size={14} /> Opening Stock</label>
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="currentStock" value={formData.currentStock || ''} onChange={handleChange} placeholder="0" className={inputClasses} />
                        </div>

                        {/* Min Stock */}
                        <div>
                            <label className={labelClasses}>Min Stock Alert Level</label>
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="minStockLevel" value={formData.minStockLevel || ''} onChange={handleChange} placeholder="10" className={inputClasses} />
                        </div>

                        {/* Units Per Pack */}
                        <div>
                            <label className={labelClasses}>Units Per Pack</label>
                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="unitsPerPack" value={formData.unitsPerPack || ''} onChange={handleChange} placeholder="1" className={inputClasses} />
                        </div>

                        {/* Supplier */}
                        <div>
                            <label className={labelClasses}>Supplier / Distributor <span className="text-red-400">*</span></label>
                            <select name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses}>
                                <option value="">Select a supplier</option>
                                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ============ Actions ============ */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={16} />
                                Register Medicine
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProductPage;
