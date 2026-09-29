'use client';

import React, { useEffect, useState } from 'react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { AlertTriangle, PackageOpen, Loader2 } from 'lucide-react';

const LowStockList = () => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLowStock = async () => {
            try {
                setIsLoading(true);
                const data = await ProductService.getProducts({ status: 'Low Stock', limit: 5 });
                setProducts(data.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch low stock items", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLowStock();
    }, []);

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-teal-500 mb-2" size={24} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Inventory Registry...</p>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="p-12 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Levels Healthy</p>
                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-1">No critical stock alerts at this node</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {products.map((product) => {
                const isCritical = product.currentStock <= product.minStockLevel;
                return (
                    <div key={product._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all group gap-3 sm:gap-0">
                        <div className="flex flex-col">
                            <span className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-teal-600 transition-colors">
                                {product.brandName}
                            </span>
                            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {product.genericName}
                            </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 border-t sm:border-none border-gray-100 dark:border-gray-800 pt-2 sm:pt-0 mt-1 sm:mt-0 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Available</div>
                                <div className={`text-xs md:text-sm font-black ${isCritical ? 'text-red-500' : 'text-teal-600'}`}>
                                    {Number(product.currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[8px] md:text-[9px] font-bold text-gray-400">UNIT</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Registry Status</div>
                                <span className={`${isCritical ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-teal-500/10 text-teal-600 border-teal-500/20'} text-[8px] font-black px-2 py-0.5 rounded uppercase border`}>
                                    {isCritical ? 'Critical' : 'Stable'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LowStockList;
