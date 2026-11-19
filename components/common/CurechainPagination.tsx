'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CurechainPaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    compact?: boolean;
}

export const CurechainPagination: React.FC<CurechainPaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    compact = false
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const prevCount = (currentPage - 1) * itemsPerPage;
    const nextCount = Math.max(0, totalItems - (currentPage * itemsPerPage));

    return (
        <div className={`flex items-center justify-center select-none w-fit mx-auto ${
            compact 
                ? 'gap-1 py-0.5 px-1.5 bg-white dark:bg-[#111] rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-xs'
                : 'gap-1.5 sm:gap-3 py-0.5 sm:py-1 px-2 sm:px-4 bg-white dark:bg-[#111] rounded-lg sm:rounded-xl border border-slate-100 dark:border-gray-800 shadow-xs'
        }`}>
            {/* Left Prev Column */}
            <div className={`flex items-center ${compact ? '' : 'sm:flex-col sm:items-center sm:gap-0.5'}`}>
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 bg-slate-900 dark:bg-slate-800 hover:bg-primary-theme text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all disabled:opacity-30 disabled:hover:bg-slate-900 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                    title="Previous page"
                >
                    <ChevronLeft size={9} />
                    <span className={compact ? 'hidden' : 'hidden sm:inline'}>Prev</span>
                </button>
                {!compact && (
                    <span className="hidden sm:block text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                        {prevCount} Records
                    </span>
                )}
            </div>

            {/* Middle Current Page Info */}
            <div className="flex items-center justify-center">
                <span className="px-1.5 sm:px-2 py-0.5 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-100 dark:border-gray-700 leading-none whitespace-nowrap">
                    <span className={compact ? 'inline' : 'sm:hidden'}>{currentPage}/{totalPages}</span>
                    <span className={compact ? 'hidden' : 'hidden sm:inline'}>Page {currentPage} of {totalPages}</span>
                </span>
            </div>

            {/* Right Next Column */}
            <div className={`flex items-center ${compact ? '' : 'sm:flex-col sm:items-center sm:gap-0.5'}`}>
                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 bg-slate-900 dark:bg-slate-800 hover:bg-primary-theme text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all disabled:opacity-30 disabled:hover:bg-slate-900 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                    title="Next page"
                >
                    <span className={compact ? 'hidden' : 'hidden sm:inline'}>Next</span>
                    <ChevronRight size={9} />
                </button>
                {!compact && (
                    <span className="hidden sm:block text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                        {nextCount} Remaining
                    </span>
                )}
            </div>
        </div>
    );
};

export default CurechainPagination;
