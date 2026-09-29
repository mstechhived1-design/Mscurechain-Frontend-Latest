'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Tag, IndianRupee, Calendar as CalendarIcon, Loader2, Trash2, History } from 'lucide-react';
import { ipdService, hospitalAdminService} from '@/lib/integrations';
import toast from 'react-hot-toast';

interface AddClinicalChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    onSuccess?: () => void;
}

const DEFAULT_CATEGORIES = ["Consultation", "Procedure", "Pharmacy", "Laboratory", "Radiology", "Nursing", "Equipments", "Other"];

export default function AddClinicalChargeModal({ isOpen, onClose, admissionId, onSuccess }: AddClinicalChargeModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [formData, setFormData] = useState({
        category: 'Consultation',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [recentCharges, setRecentCharges] = useState<any[]>([]);
    const [totalApplied, setTotalApplied] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            fetchRecentCharges();
        }
    }, [isOpen, admissionId]);



    const fetchCategories = async () => {
        try {
            const res = await hospitalAdminService.getHospitalMetadata();
            if (res.success && res.data.billingCategories) {
                setCategories(res.data.billingCategories);
                if (!res.data.billingCategories.includes(formData.category)) {
                    setFormData(prev => ({ ...prev, category: res.data.billingCategories[0] || 'Other' }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    const fetchRecentCharges = async () => {
        try {
            const res = await ipdService.getBillSummary(admissionId);
            if (res && res.extraCharges) {
                setRecentCharges(res.extraCharges.items || []);
                setTotalApplied(res.extraCharges.total || 0);
            }
        } catch (error) {
            console.error("Failed to fetch recent charges", error);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        if (categories.includes(newCategory.trim())) {
            toast.error("Category already exists");
            return;
        }
        const updated = [...categories, newCategory.trim()];
        try {
            await hospitalAdminService.updateBillingCategories(updated);
            setCategories(updated);
            setNewCategory('');
            toast.success("Category added");
        } catch (error) {
            toast.error("Failed to add category");
        }
    };

    const handleDeleteCategory = async (cat: string) => {
        const updated = categories.filter(c => c !== cat);
        try {
            await hospitalAdminService.updateBillingCategories(updated);
            setCategories(updated);
            if (formData.category === cat) {
                setFormData(prev => ({ ...prev, category: updated[0] || 'Other' }));
            }
            toast.success("Category removed");
        } catch (error) {
            toast.error("Failed to remove category");
        }
    };

    const handleAmountChange = (val: string) => {
        // Smart 0 handling: eliminate on backspace if it's just '0'
        if (val === '0' && formData.amount === '') {
            setFormData(prev => ({ ...prev, amount: '0' }));
            return;
        }

        const num = Number(val);
        if (num < 0) return; // No negative values

        setFormData(prev => ({ ...prev, amount: val }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || formData.amount === '') {
            toast.error("Please fill all required fields");
            return;
        }

        try {
            setSubmitting(true);
            await ipdService.addExtraCharge({
                admissionId,
                category: formData.category,
                description: formData.description,
                amount: Number(formData.amount),
                date: new Date(formData.date)
            });
            toast.success("Charge added successfully");
            fetchRecentCharges(); // Refresh history
            // onSuccess?.(); // Keep open if they want to add more, or close? 
            // User likely wants to see it added.
            // Reset form for next entry
            setFormData(prev => ({
                ...prev,
                description: '',
                amount: ''
            }));
        } catch (error: any) {
            toast.error(error.message || "Failed to add charge");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Plus size={20} className="text-teal-600" />
                            Add Clinical Charge
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Record service or procedure fee</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Category */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Category</label>
                            <button
                                type="button"
                                onClick={() => setIsManagingCategories(!isManagingCategories)}
                                className="text-[9px] font-black text-teal-600 uppercase hover:underline"
                            >
                                {isManagingCategories ? "Done" : "Manage"}
                            </button>
                        </div>

                        {isManagingCategories ? (
                            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value.slice(0, 30))}
                                        placeholder="New Category..."
                                        className="flex-1 px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-teal-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="px-3 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black"
                                    >
                                        ADD
                                    </button>
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {categories.map((cat) => (
                                        <div key={cat} className="flex justify-between items-center group">
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{cat}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCategory(cat)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all appearance-none cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Particulars</label>
                            <span className={`text-[8px] font-bold ${formData.description.length >= 100 ? 'text-rose-500' : 'text-slate-300'}`}>
                                {formData.description.length}/100
                            </span>
                        </div>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.slice(0, 100) }))}
                            placeholder="e.g., Emergency Consultation, Wound Dressing..."
                            rows={2}
                            className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border ${formData.description.length >= 100 ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800'} rounded-2xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all resize-none placeholder:text-slate-300`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                            <div className="relative group">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
                                <input
                                    required
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Date</label>
                            <div className="relative group">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-bold uppercase outline-none focus:border-teal-500 transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || isManagingCategories}
                        className="w-full py-4 bg-slate-900 text-white dark:bg-teal-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <Plus size={14} /> Add Charge
                            </>
                        )}
                    </button>
                    {isManagingCategories && (
                        <p className="text-[8px] font-bold text-rose-400 uppercase text-center animate-pulse">
                            Please finish managing categories before adding a charge
                        </p>
                    )}
                </form>

                {/* Recent Charges History */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between items-center sticky top-0 bg-transparent py-1 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-slate-400" />
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Recent Applied Charges</h3>
                        </div>
                        <div className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[8px] font-black uppercase">
                            Total: ₹{totalApplied.toLocaleString()}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {recentCharges.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">No prior clinical charges found</p>
                            </div>
                        ) : (
                            recentCharges.slice(0, 5).map((charge, i) => (
                                <div key={charge._id || i} className="flex justify-between items-center p-3 bg-white dark:bg-[#151515] border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm transition-all hover:shadow-md group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                            <Tag size={12} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none">{charge.description}</p>
                                                <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-[6px] font-black text-slate-400 rounded uppercase">{charge.category}</span>
                                            </div>
                                            <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                                                {new Date(charge.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">₹{charge.amount.toLocaleString()}</p>
                                            <p className="text-[6px] font-black text-emerald-500 uppercase mt-0.5 tracking-widest">Applied</p>
                                        </div>
                                        {/* Remove button - only show for actual charges, not virtual admission fees */}
                                        {charge._id && !charge._id.toString().startsWith('base-fee-') && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!confirm(`Remove charge: ${charge.description} (₹${charge.amount})?`)) return;
                                                    try {
                                                        await ipdService.removeExtraCharge(charge._id);
                                                        toast.success("Charge removed successfully");
                                                        fetchRecentCharges(); // Refresh list
                                                    } catch (error: any) {
                                                        toast.error(error.message || "Failed to remove charge");
                                                    }
                                                }}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove charge"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {recentCharges.length > 5 && (
                            <p className="text-[7px] font-black text-slate-400 uppercase text-center bg-slate-100 dark:bg-slate-800 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
                                + {recentCharges.length - 5} more entries in full ledger
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
