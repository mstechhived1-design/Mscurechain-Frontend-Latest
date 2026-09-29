'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, AlertTriangle, Calendar, ShieldAlert, Package, Info, FileSpreadsheet, IndianRupee } from 'lucide-react';
import { LabInventoryService } from '@/lib/integrations/services/labInventory.service';
import { LabInventory } from '@/lib/integrations/types/labInventory';
import { toast } from 'react-hot-toast';

function InventoryDetailsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const itemId = params?.id as string;

    const [item, setItem] = useState<LabInventory | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNavigating, startNavigation] = useTransition();

    useEffect(() => {
        if (itemId) {
            loadItem();
        }
    }, [itemId]);

    const loadItem = async () => {
        setLoading(true);
        try {
            const data = await LabInventoryService.getInventoryById(itemId);
            setItem(data);
        } catch (error) {
            console.error("Failed to load inventory item details", error);
            toast.error("Failed to fetch item details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading item specifications...</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h2 className="text-md font-bold text-gray-900 dark:text-white">Item Not Found</h2>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Calculations for highlights
    const now = new Date();
    const isExpired = item.expiryDate && new Date(item.expiryDate) < now;
    const isLow = item.quantity <= item.reorderLevel;
    const isExpiringSoon = item.expiryDate && !isExpired && new Date(item.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const getStatusStyle = () => {
        if (isExpired) return 'bg-rose-500/10 text-rose-600 border-rose-200';
        if (item.quantity === 0) return 'bg-slate-100 text-gray-600 border-slate-200';
        if (isLow) return 'bg-amber-500/10 text-amber-600 border-amber-200';
        return 'bg-emerald-55/10 text-emerald-600 border-emerald-200';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl transition-colors border border-slate-200 dark:border-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {item.name}
                            <span className="text-[10px] font-mono bg-slate-100 text-gray-600 px-2 py-0.5 rounded border">
                                {item.code}
                            </span>
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                            Inventory Item Details Specification
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/inventory/manage?id=${item._id}`))}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                >
                    <Edit className="w-4 h-4" />
                    Edit Item
                </button>
            </div>

            {/* Warning Banners */}
            {isExpired && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <div>
                        <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">Critical: Stock Expired</h4>
                        <p className="text-xs text-rose-700 dark:text-rose-500 mt-1 font-semibold">
                            This item expired on {new Date(item.expiryDate!).toLocaleDateString()}. Please dispose of expired stock safely and restock as needed.
                        </p>
                    </div>
                </div>
            )}

            {!isExpired && isExpiringSoon && (
                <div className="bg-amber-55/10 border border-amber-200/50 p-4 rounded-2xl flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Warning: Approaching Expiry</h4>
                        <p className="text-xs text-amber-700 mt-1 font-semibold">
                            This item is expiring within 30 days ({new Date(item.expiryDate!).toLocaleDateString()}). Prioritize usage of this batch.
                        </p>
                    </div>
                </div>
            )}

            {isLow && (
                <div className="bg-amber-55/10 border border-amber-200/50 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Alert: Low Stock</h4>
                        <p className="text-xs text-amber-700 mt-1 font-semibold">
                            Current quantity in stock ({item.quantity} {item.unit}) is at or below the reorder level threshold ({item.reorderLevel}). Consider placing a reorder soon.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image Section */}
                <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-40 h-40 rounded-2xl overflow-hidden bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as any).src = "https://placehold.co/200x200?text=Item"; }}
                            />
                        ) : (
                            <Package className="w-16 h-16 text-gray-300" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">{item.code}</p>
                    </div>
                </div>

                {/* Section Details Grid */}
                <div className="md:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <Info className="w-4 h-4 text-indigo-600" />
                            Basic Specifications
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Category</span>
                                <span className="text-xs font-semibold text-gray-850 dark:text-gray-200">{item.category}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Brand</span>
                                <span className="text-xs font-semibold text-gray-850 dark:text-gray-200">{item.brand || '—'}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Description</span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-semibold leading-relaxed">
                                    {item.description || 'No description provided.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stock Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                            Stock & Unit Specifications
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Quantity In Stock</span>
                                <span className="text-xs font-black text-gray-950 dark:text-white font-mono">{item.quantity}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Unit</span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.unit}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Reorder Level</span>
                                <span className="text-xs font-bold text-gray-800 font-mono">{item.reorderLevel}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Current Status</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-1 ${getStatusStyle()}`}>
                                    {item.quantity === 0 ? "Out of Stock" : (isExpired ? "Expired" : (isLow ? "Low Stock" : "In Stock"))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Purchase Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            Pricing Information
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Purchase Price</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white font-mono">₹{item.purchasePrice.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">MRP</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white font-mono">₹{item.mrp.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Batch Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            Batch & Date Specifications
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Batch Number</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono">{item.batchNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Manufacturing Date</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono">
                                    {item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString() : '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Expiry Date</span>
                                <span className={`text-xs font-bold font-mono ${isExpired ? 'text-rose-600 dark:text-rose-450' : 'text-gray-850 dark:text-gray-200'}`}>
                                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Storage / Internal Notes</span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-semibold leading-relaxed">
                                    {item.notes || 'No storage notes recorded.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(InventoryDetailsPage);
