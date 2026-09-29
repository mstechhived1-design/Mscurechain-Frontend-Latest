'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CurechainPaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export const CurechainPagination: React.FC<CurechainPaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const prevCount = (currentPage - 1) * itemsPerPage;
    const nextCount = Math.max(0, totalItems - (currentPage * itemsPerPage));

    return (
        <div className="flex items-center justify-center gap-3 py-1 px-4 bg-white dark:bg-[#111] rounded-xl border border-slate-100 dark:border-gray-800 shadow-xs w-fit mx-auto select-none">
            {/* Left Prev Column */}
            <div className="flex flex-col items-center gap-0.5">
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-900 dark:bg-slate-800 hover:bg-primary-theme text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all disabled:opacity-30 disabled:hover:bg-slate-900 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                >
                    <ChevronLeft size={9} />
                    Prev
                </button>
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    {prevCount} Records
                </span>
            </div>

            {/* Middle Current Page Info */}
            <div className="flex items-center justify-center self-start mt-0.5">
                <span className="px-2 py-0.5 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-100 dark:border-gray-700 leading-none">
                    Page {currentPage} of {totalPages}
                </span>
            </div>

            {/* Right Next Column */}
            <div className="flex flex-col items-center gap-0.5">
                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-900 dark:bg-slate-800 hover:bg-primary-theme text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all disabled:opacity-30 disabled:hover:bg-slate-900 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                >
                    Next
                    <ChevronRight size={9} />
                </button>
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    {nextCount} Remaining
                </span>
            </div>
        </div>
    );
};

export default CurechainPagination;
