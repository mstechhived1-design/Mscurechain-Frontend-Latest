'use client';

import React from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';

export type ReportTemplateFormat = 'standard' | 'discharge';

interface ReportFormatToggleProps {
    format: ReportTemplateFormat;
    onChange: (format: ReportTemplateFormat) => void;
    className?: string;
}

export default function ReportFormatToggle({
    format,
    onChange,
    className = ''
}: ReportFormatToggleProps) {
    return (
        <div className={`inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs ${className}`}>
            <button
                type="button"
                onClick={() => onChange('standard')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                    format === 'standard'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Standard Financial Statement / Detailed Itemized Bill"
            >
                <FileSpreadsheet size={13} className={format === 'standard' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Detailed Bill</span>
            </button>

            <button
                type="button"
                onClick={() => onChange('discharge')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                    format === 'discharge'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Professional Discharge Summary Format (Dhruva Hospital Template)"
            >
                <FileText size={13} className={format === 'discharge' ? 'text-white' : 'text-slate-400'} />
                <span>Discharge Summary</span>
            </button>
        </div>
    );
}
