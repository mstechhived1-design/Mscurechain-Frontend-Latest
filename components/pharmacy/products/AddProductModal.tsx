'use client';

import React, { useState } from 'react';
import {
    X,
    IndianRupee,
    Save
} from 'lucide-react';
import { PharmacyProduct, PharmacyProductPayload } from '@/lib/integrations/types/product';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { Supplier } from '@/lib/integrations/types/supplier';
import { toast } from 'react-hot-toast';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PharmacyProductPayload) => Promise<void>;
    initialData?: PharmacyProduct | null;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const defaultFormData: PharmacyProductPayload = {
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
    };

    const [formData, setFormData] = React.useState<PharmacyProductPayload>(defaultFormData);
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                sku: initialData.sku || '',
                name: initialData.name || '',
                genericName: initialData.genericName || '',
                brandName: initialData.brandName || '',
                strength: initialData.strength || '',
                form: initialData.form || 'Tablet',
                schedule: initialData.schedule || 'OTC - Over the Counter',
                mrp: initialData.mrp || 0,
                unitCost: initialData.unitCost || 0,
                gst: initialData.gst !== undefined ? initialData.gst : 12,
                currentStock: initialData.currentStock || 0,
                minStockLevel: initialData.minStockLevel || 10,
                unitsPerPack: initialData.unitsPerPack || 1,
                supplier: typeof initialData.supplier === 'object' && initialData.supplier !== null
                    ? (initialData.supplier as any)._id
                    : (initialData.supplier || ''),
                hsnCode: initialData.hsnCode || '',
                batchNumber: initialData.batchNumber || '',
                expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : '',
            });
        } else {
            setFormData(defaultFormData);
        }
    }, [initialData, isOpen]);

    React.useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await SupplierService.getSuppliers();
                setSuppliers(data);
            } catch (error) {
                console.error('Failed to fetch suppliers', error);
            }
        };
        if (isOpen) fetchSuppliers();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validations
        if (!formData.genericName.trim() || !formData.brandName.trim()) {
            return toast.error('Medicine name and brand are required');
        }

        const mrpValue = Number(formData.mrp) || 0;
        if (mrpValue <= 0) return toast.error('MRP must be greater than zero');
        
        const currentStockValue = Number(formData.currentStock) || 0;
        if (currentStockValue < 0) return toast.error('Stock cannot be negative');
        
        const minStockValue = Number(formData.minStockLevel) || 0;
        if (minStockValue < 0) return toast.error('Min stock level cannot be negative');

        setLoading(true);
        try {
            const cleanedData: PharmacyProductPayload = {
                ...formData,
                mrp: mrpValue,
                unitCost: Number(formData.unitCost) || 0,
                gst: Number(formData.gst) || 0,
                currentStock: currentStockValue,
                minStockLevel: minStockValue,
                unitsPerPack: Number(formData.unitsPerPack) || 1,
            };
            await onSubmit(cleanedData);
            onClose();
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none";
    const labelClasses = "text-[10px] md:text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 md:mb-1.5 block";

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 md:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 w-full max-w-xl rounded-xl md:rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] sm:max-h-[90vh]">
                {/* Fixed Header */}
                <div className="px-5 md:px-6 py-3 md:py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {initialData ? 'Edit Medicine' : 'Add New Medicine'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X size={18} className="md:w-5 md:h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Medicine Name (Generic)</label>
                            <input name="genericName" value={formData.genericName} onChange={handleChange} required placeholder="e.g. Paracetamol IP" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Brand Name</label>
                            <input name="brandName" value={formData.brandName} onChange={handleChange} required placeholder="Crocin" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Display Name (Optional)</label>
                            <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="e.g. Crocin 500mg TABLET" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>SKU Code</label>
                            <input name="sku" value={formData.sku} onChange={handleChange} required placeholder="SKU-123" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Strength</label>
                            <input name="strength" value={formData.strength} onChange={handleChange} required placeholder="500mg" className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Form</label>
                            <select name="form" value={formData.form} onChange={handleChange} required className={inputClasses}>
                                <option value="TABLET">Tablet</option>
                                <option value="CAPSULE">Capsule</option>
                                <option value="SYRUP">Syrup</option>
                                <option value="INJECTION">Injection</option>
                                <option value="DROPS">Drops</option>
                                <option value="OINTMENT">Ointment</option>
                                <option value="LOTION">Lotion</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Schedule</label>
                            <select name="schedule" value={formData.schedule} onChange={handleChange} className={inputClasses}>
                                <option value="OTC">OTC - Over the Counter</option>
                                <option value="H">Schedule H</option>
                                <option value="H1">Schedule H1</option>
                                <option value="X">Schedule X</option>
                                <option value="G">Schedule G</option>
                            </select>
                        </div>
                    </div>

                    {/* Commercials */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl space-y-4 border border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClasses}>Price (MRP)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input type="number" name="mrp" value={formData.mrp} onChange={handleChange} required step="0.01" className={`${inputClasses} !pl-9`} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>Unit Cost</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input type="number" name="unitCost" value={formData.unitCost || 0} onChange={handleChange} step="0.01" className={`${inputClasses} !pl-9`} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>GST %</label>
                                <select name="gst" value={formData.gst} onChange={handleChange} className={inputClasses}>
                                    {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>HSN Code</label>
                                <input name="hsnCode" value={formData.hsnCode || ''} onChange={handleChange} placeholder="e.g. 3004" className={inputClasses} />
                            </div>
                        </div>
                    </div>

                    {/* Stock & Supplier */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClasses}>Current Stock (Packs)</label>
                                <input type="number" name="currentStock" value={formData.currentStock} onChange={handleChange} step="0.01" className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Min Alert Level</label>
                                <input type="number" name="minStockLevel" value={formData.minStockLevel} onChange={handleChange} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Units per Pack</label>
                                <input type="number" name="unitsPerPack" value={formData.unitsPerPack || 1} onChange={handleChange} min="1" className={inputClasses} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Batch Number</label>
                                <input name="batchNumber" value={formData.batchNumber || ''} onChange={handleChange} placeholder="e.g. BT-001" className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Expiry Date</label>
                                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputClasses} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>Supplier</label>
                            <select name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses}>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </form>

                {/* Fixed Footer */}
                <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">
                        Cancel
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={loading}
                        className="px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save size={16} />
                                {initialData ? 'Update Item' : 'Register Item'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;
