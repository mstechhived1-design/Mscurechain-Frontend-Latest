'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, PackageOpen } from 'lucide-react';
import { Supplier } from '@/lib/integrations/types/supplier';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { SupplierService } from '@/lib/integrations/services/supplier.service';

interface SupplierProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
}

const SupplierProductsModal: React.FC<SupplierProductsModalProps> = ({ isOpen, onClose, supplier }) => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProducts = React.useCallback(async () => {
        if (!supplier) return;
        setLoading(true);
        try {
            const data = await SupplierService.getSupplierProducts(supplier._id);
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch supplier products:', error);
        } finally {
            setLoading(false);
        }
    }, [supplier]);

    useEffect(() => {
        if (isOpen && supplier) {
            fetchProducts();
        }
    }, [isOpen, supplier, fetchProducts]);

    if (!isOpen || !supplier) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-10 py-8 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 flex items-center justify-center">
                            <Package className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                                {supplier.name}
                            </h2>
                            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                {products.length} Products Supplied
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>


                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-gray-400 font-black uppercase text-[10px] tracking-[2px]">Fetching Inventory...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                            <PackageOpen className="w-16 h-16 text-gray-200 mb-4" />
                            <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 underline decoration-indigo-200 underline-offset-8">No products found</h3>
                            <p className="text-gray-400 font-medium max-w-xs">This supplier hasn't been linked to any products in your inventory yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 px-6 pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <div className="col-span-6">Brand Name / Strength</div>
                                <div className="col-span-2 text-center">Form</div>
                                <div className="col-span-2 text-center">Stock</div>
                                <div className="col-span-2 text-right">Price (MRP)</div>
                            </div>
                            <div className="space-y-3">
                                {products.map((product) => (
                                    <div key={product._id} className="grid grid-cols-12 items-center bg-gray-50/50 dark:bg-gray-800/40 border dark:border-gray-800 rounded-2xl px-6 py-4 hover:shadow-md hover:border-indigo-100 group">
                                        <div className="col-span-6">
                                            <div className="font-black text-gray-800 dark:text-gray-200 text-sm tracking-tight group-hover:text-indigo-600">
                                                {product.brandName}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                {product.genericName}
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border dark:border-gray-700 text-[10px] font-black text-gray-500">
                                                {product.form?.toUpperCase() || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="text-sm font-black text-gray-700 dark:text-gray-300">
                                                {Number(product.currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-sm font-black text-indigo-600">
                                                ₹{product.mrp.toFixed(2)}
                                            </div>
                                            {product.strength && (
                                                <div className="text-[10px] text-gray-400 font-bold">
                                                    {product.strength}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-6 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-[3px]">
                    <span>Inventory Summary</span>
                    <span className="text-indigo-500 underline decoration-2 underline-offset-4">{supplier.name} Vendor List</span>
                </div>
            </div>
        </div>
    );
};

export default SupplierProductsModal;
