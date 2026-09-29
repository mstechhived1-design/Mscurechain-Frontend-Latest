'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Phone, Mail, Package, MapPin, ChevronDown, ChevronUp, Loader2, PackageOpen } from 'lucide-react';
import { Supplier } from '@/lib/integrations/types/supplier';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

interface SupplierTableProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (id: string, name: string) => void;
    isLoading: boolean;
}

const SupplierProductsInline = ({ supplierId }: { supplierId: string }) => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await SupplierService.getSupplierProducts(supplierId);
                setProducts(data);
            } catch (error) {
                console.error('Failed to fetch supplier products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [supplierId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Inventory...</span>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <PackageOpen className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-gray-400 font-bold text-xs uppercase tracking-tight">No products linked to this vendor</p>
            </div>
        );
    }

    return (
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden mt-2 mb-4 mx-2 sm:mx-6 md:mx-8 xl:mx-12 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="bg-teal-50/10 dark:bg-teal-500/5 px-4 md:px-6 py-3 border-b dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-teal-500" />
                    <span className="text-[10px] md:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Onboarded Inventory</span>
                </div>
                <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded text-[10px] md:text-xs font-black uppercase tracking-wider border border-teal-500/20 self-start sm:self-auto">
                    {products.length} SKUs
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                    <thead>
                        <tr className="bg-gray-50/20 dark:bg-gray-800/10 border-b border-gray-50 dark:border-gray-800/50">
                            <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest center">Product Name</th>
                            <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest center">Generic Registry</th>
                            <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Available</th>
                            <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">MRP (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50 dark:divide-gray-800/30">
                        {products.map((p) => (
                            <tr key={p._id} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">{p.brandName}</div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{p.strength} | {p.form}</div>
                                </td>
                                <td className="px-6 py-3 text-xs font-bold text-gray-500/70 dark:text-gray-400/70 uppercase">{p.genericName}</td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-black ${p.currentStock <= p.minStockLevel ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-teal-500/10 text-teal-600 border border-teal-500/20'}`}>
                                        {Number(p.currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-black text-teal-600 dark:text-teal-400 text-xs">₹{p.mrp.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SupplierTable: React.FC<SupplierTableProps> = ({ suppliers, onEdit, onDelete, isLoading }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (isLoading) {
        return <PharmacyTableSkeleton rows={8} />;
    }

    if (suppliers.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-900 p-12 text-center">
                <PackageOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 tracking-tight">No vendors registered</h3>
                <p className="text-gray-500 dark:text-gray-400">Start by onboarding your first supplier to the network.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800">
                        <th className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest text-left">Supplier Name</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest text-left">Contact Details</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest text-left">Location</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest text-center">Business Info</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {suppliers.map((supplier) => (
                        <React.Fragment key={supplier._id}>
                            <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 group transition-colors ${expandedId === supplier._id ? 'bg-teal-50/10 dark:bg-teal-900/10' : ''}`}>
                                <td className="px-4 md:px-6 py-4 md:py-5 border-r border-gray-100 dark:border-gray-800/50 align-top">
                                    <div
                                        className="font-bold text-gray-900 dark:text-white group-hover:text-teal-600 text-xs md:text-sm tracking-tight cursor-pointer flex items-center gap-3 uppercase"
                                        onClick={() => toggleExpand(supplier._id)}
                                    >
                                        {supplier.name}
                                        {expandedId === supplier._id ? (
                                            <ChevronUp size={14} className="text-teal-500 transition-transform shrink-0" />
                                        ) : (
                                            <ChevronDown size={14} className="text-gray-300 group-hover:text-teal-400 transition-transform shrink-0" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                                        ID: {supplier._id.slice(-8).toUpperCase()}
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 border-r border-gray-100 dark:border-gray-800/50 align-top">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2.5 text-[11px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                                            <div className="p-1 bg-teal-50 text-teal-600 rounded-md">
                                                <Phone size={12} />
                                            </div>
                                            {supplier.phone}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-[11px] md:text-xs font-bold text-gray-500 lowercase tracking-wider">
                                            <div className="p-1 bg-gray-50 text-gray-400 rounded-md">
                                                <Mail size={12} className="shrink-0" />
                                            </div>
                                            {supplier.email || 'N/A'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 border-r border-gray-100 dark:border-gray-800/50 align-top">
                                    <div className="flex items-start gap-2.5 text-[11px] md:text-xs font-bold text-gray-500 dark:text-gray-400 max-w-[200px]">
                                        <div className="p-1 bg-gray-50 text-gray-400 rounded-md shrink-0">
                                            <MapPin size={12} />
                                        </div>
                                        <span className="line-clamp-3 uppercase leading-relaxed mt-0.5">{supplier.address || 'No location'}</span>
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 border-r border-gray-100 dark:border-gray-800/50 text-center align-top">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
                                        GSTIN Registry
                                    </div>
                                    <div className="text-[11px] md:text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest bg-gray-50 dark:bg-gray-800 inline-block px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                        {supplier.gstNumber || 'UNREGISTERED'}
                                    </div>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 align-top">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(supplier)}
                                            className="text-blue-600 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                                            title="Edit Vendor"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(supplier._id, supplier.name)}
                                            className="text-rose-500 hover:text-rose-600 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                                            title="Terminate Vendor"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {expandedId === supplier._id && (
                                <tr>
                                    <td colSpan={5} className="p-0 bg-gray-50/30 dark:bg-gray-900/40 border-b dark:border-gray-800">
                                        <div className="py-2">
                                            <SupplierProductsInline supplierId={supplier._id} />
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SupplierTable;
