'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Calendar, Package } from 'lucide-react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct } from '@/lib/integrations/types/product';

interface ExpiryAlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExpiryAlertsModal: React.FC<ExpiryAlertsModalProps> = ({ isOpen, onClose }) => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchExpilingProducts();
        }
    }, [isOpen]);

    const fetchExpilingProducts = async () => {
        setIsLoading(true);
        try {
            const data = await ProductService.getProducts({ expiryStatus: 'Expiring Soon (30 days)' });
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch expiring products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border dark:border-gray-800 flex flex-col">
                {/* Header */}
                <div className="p-4 md:p-6 border-b dark:border-gray-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl md:rounded-2xl">
                            <AlertTriangle size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Expiry Alerts (Short-term)</h2>
                            <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-0">Products expiring within the next 30 days</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg md:rounded-xl text-gray-500"
                    >
                        <X size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 md:p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 md:py-20 gap-3 md:gap-4">
                            <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-red-500 animate-spin" />
                            <p className="text-[11px] md:text-sm font-medium text-gray-500">Scanning inventory for expiry dates...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16 md:py-20">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                <Package size={24} className="md:w-8 md:h-8" />
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">All Clear!</h3>
                            <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-1 md:mt-0">No products are expiring in the next 30 days.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl md:rounded-2xl border dark:border-gray-800 shadow-sm">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Brand / SKU</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Generic Name</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Batch</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Expiry</th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {products.map((product) => {
                                        const expiry = product.expiryDate ? new Date(product.expiryDate) : null;
                                        const isExpiringThisWeek = expiry ? (expiry.getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000 : false;

                                        return (
                                            <tr key={product._id} className="hover:bg-red-50/30 dark:hover:bg-red-950/5 group">
                                                <td className="px-4 md:px-6 py-3 md:py-4 align-top">
                                                    <div className="font-bold text-[11px] md:text-sm text-gray-900 dark:text-white group-hover:text-red-600 leading-tight">
                                                        {product.brandName}
                                                    </div>
                                                    <div className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-500 font-mono mt-0.5">
                                                        {product.sku}
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 align-top">
                                                    <div className="text-[11px] md:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                                                        {product.genericName}
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center text-[11px] md:text-xs text-gray-500 dark:text-gray-500 align-top">
                                                    {product.batchNumber || '-'}
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center align-top">
                                                    <div className={`flex items-center justify-center gap-1.5 md:gap-2 text-[11px] md:text-sm font-bold ${isExpiringThisWeek ? 'text-red-600' : 'text-amber-600'}`}>
                                                        <Calendar size={14} className="md:w-4 md:h-4" />
                                                        {expiry ? expiry.toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center align-top">
                                                    <div className="text-[11px] md:text-sm font-bold text-gray-900 dark:text-white">
                                                        {Number(product.currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] md:text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiryAlertsModal;
