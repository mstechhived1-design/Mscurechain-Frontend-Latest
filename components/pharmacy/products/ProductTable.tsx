'use client';

import React from 'react';
import { Edit2, Trash2, Info } from 'lucide-react';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

interface ProductTableProps {
    products: PharmacyProduct[];
    onEdit: (product: PharmacyProduct) => void | Promise<void>;
    onDelete: (id: string, name: string) => void | Promise<void>;
    isLoading: boolean;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete, isLoading }) => {

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'In Stock':
                return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
            case 'Low Stock':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'Out of Stock':
                return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400';
        }
    };

    const getExpiryStyle = (expiryDate: string | Date | undefined) => {
        if (!expiryDate) return 'text-gray-600 dark:text-gray-400';
        const date = new Date(expiryDate);
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        if (date < threeMonthsFromNow) {
            return 'text-red-600 font-bold';
        }
        return 'text-green-600 font-bold';
    };

    if (isLoading) {
        return <PharmacyTableSkeleton rows={8} />;
    }

    if (products.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-900 p-12 text-center">
                <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No products found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or add a new product.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800">
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Brand Name</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Composition</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Sch</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Expiry</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">MRP</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Stock</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Units</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Status</th>
                        <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {products.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 group transition-colors">
                            <td className="px-2 md:px-4 py-2 md:py-3 border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className="font-black text-slate-900 dark:text-white text-[10px] md:text-[13px] uppercase leading-tight">
                                    {product.brandName}
                                </div>
                                <div className="text-[9px] md:text-[11px] text-slate-400 dark:text-gray-400 font-bold mt-0.5 uppercase">
                                    {product.strength} | {product.form?.toUpperCase()}
                                </div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className="text-[10px] md:text-[13px] text-slate-600 dark:text-gray-300 font-bold leading-tight max-w-[120px] md:max-w-[180px] truncate uppercase">
                                    {product.genericName}
                                </div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <span className="text-[10px] md:text-[13px] font-black text-slate-800 dark:text-gray-200 uppercase">
                                    {product.schedule?.split(' ')[0] || '-'}
                                </span>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className={`text-[10px] md:text-[13px] font-black ${getExpiryStyle(product.expiryDate)}`}>
                                    {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-GB') : '-'}
                                </div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className="text-[10px] md:text-[13px] text-slate-700 dark:text-gray-300 font-black">
                                    ₹{product.mrp.toFixed(2)}
                                </div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className="text-[10px] md:text-[13px] font-black text-slate-900 dark:text-white">
                                    {Math.round(product.currentStock * 100) / 100}
                                </div>
                                <div className="text-[8px] md:text-[10px] text-slate-400 mt-1 whitespace-nowrap font-bold uppercase tracking-tighter">{product.unitsPerPack || 1} / Pack</div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <div className="text-[10px] md:text-[13px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded inline-block">
                                    {Math.round((product.unitsPerPack || 1) * product.currentStock).toLocaleString()}
                                </div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-center border-r border-gray-100 dark:border-gray-800 align-top">
                                <span className={`px-2 py-0.5 rounded text-[8px] md:text-[10px] font-black whitespace-nowrap uppercase tracking-widest ${getStatusStyles(product.status)}`}>
                                    {product.status}
                                </span>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 align-top">
                                <div className="flex items-center justify-center gap-1.5 md:gap-3">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors p-1 md:p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        title="Edit Product"
                                    >
                                        <Edit2 size={14} className="md:w-4 md:h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(product._id, product.brandName)}
                                        className="text-red-500 hover:text-red-700 transition-colors p-1 md:p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        title="Delete Product"
                                    >
                                        <Trash2 size={14} className="md:w-4 md:h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProductTable;
