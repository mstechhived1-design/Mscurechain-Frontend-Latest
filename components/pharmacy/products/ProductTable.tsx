'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Info, Pill, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

// --- Dynamic Slideshow / Thumbnail Component for Table Row ---
const ProductImageSlideshow: React.FC<{ images?: string[]; productName: string }> = ({
    images = [],
    productName,
}) => {
    const validImages = (images || []).filter(Boolean);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isZoomOpen, setIsZoomOpen] = useState(false);

    // Auto slideshow every 2.5s if multiple images and not hovered
    useEffect(() => {
        if (validImages.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [validImages.length, isHovered]);

    if (validImages.length === 0) {
        return (
            <div
                className="w-14 h-10 md:w-16 md:h-11 rounded-xl bg-slate-100/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0 mx-auto"
                title="No image uploaded"
            >
                <Pill size={16} />
            </div>
        );
    }

    if (validImages.length === 1) {
        return (
            <>
                <div
                    onClick={() => setIsZoomOpen(true)}
                    className="w-14 h-10 md:w-16 md:h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-0.5 flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0 mx-auto group relative"
                    title="Click to zoom image"
                >
                    <img
                        src={validImages[0]}
                        alt={productName}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {isZoomOpen && (
                    <div
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setIsZoomOpen(false)}
                    >
                        <div
                            className="relative max-w-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-3 border border-gray-200 dark:border-gray-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white">
                                    {productName}
                                </h4>
                                <button
                                    onClick={() => setIsZoomOpen(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <img
                                src={validImages[0]}
                                alt={productName}
                                className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
                            />
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Multiple images: auto sliding thumbnail with pagination
    return (
        <>
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setIsZoomOpen(true)}
                className="relative w-14 h-10 md:w-16 md:h-11 rounded-xl overflow-hidden border-2 border-teal-500/50 bg-slate-50 dark:bg-slate-900/60 p-0.5 flex items-center justify-center shadow-xs cursor-pointer shrink-0 mx-auto group"
                title={`${validImages.length} images. Click to view gallery.`}
            >
                <img
                    src={validImages[currentIndex]}
                    alt={`${productName} view ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain transition-opacity duration-300"
                />

                {/* Badge count */}
                <div className="absolute top-0.5 right-0.5 bg-black/60 backdrop-blur-xs text-[8px] font-black text-white px-1 rounded-sm leading-tight">
                    {currentIndex + 1}/{validImages.length}
                </div>

                {/* Mini dots */}
                <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5 pointer-events-none">
                    {validImages.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${i === currentIndex ? 'bg-teal-400' : 'bg-white/50'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Gallery Zoom Modal */}
            {isZoomOpen && (
                <div
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
                    onClick={() => setIsZoomOpen(false)}
                >
                    <div
                        className="relative max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-4 border border-gray-200 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white">
                                    {productName}
                                </h4>
                                <span className="text-[10px] text-teal-600 font-bold">
                                    Photo {currentIndex + 1} of {validImages.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsZoomOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative aspect-4/3 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                            <img
                                src={validImages[currentIndex]}
                                alt={`${productName} view ${currentIndex + 1}`}
                                className="max-h-full max-w-full object-contain"
                            />
                            {validImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-transform active:scale-95"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentIndex((prev) => (prev + 1) % validImages.length);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-transform active:scale-95"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnail selector */}
                        <div className="flex items-center justify-center gap-2 mt-3 overflow-x-auto py-1">
                            {validImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                                        idx === currentIndex
                                            ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

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
                        <th className="px-2 md:px-3 py-2 md:py-3 text-[9px] md:text-xs font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest text-center leading-tight w-20">Image</th>
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
                            <td className="px-2 md:px-3 py-2 md:py-3 border-r border-gray-100 dark:border-gray-800 align-middle text-center">
                                <ProductImageSlideshow
                                    images={product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : [])}
                                    productName={product.brandName || product.genericName || 'Medicine'}
                                />
                            </td>
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
