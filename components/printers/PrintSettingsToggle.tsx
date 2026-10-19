import React from 'react';
import { usePrintStore } from '@/stores/printStore';

interface PrintSettingsToggleProps {
    className?: string;
    style?: React.CSSProperties;
    labelClassName?: string;
}

const PrintSettingsToggle: React.FC<PrintSettingsToggleProps> = ({ className = '', style, labelClassName = '' }) => {
    const { printWithHeader, setPrintWithHeader, showHonorificInReceipts, setShowHonorificInReceipts } = usePrintStore();

    return (
        <div className={`print-settings-toggle-wrapper flex items-center gap-2 flex-wrap shrink-0 ${className}`} style={style}>
            <div 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer select-none transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        setPrintWithHeader(!printWithHeader);
                    }
                }}
            >
                <label className={`text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2 m-0 select-none whitespace-nowrap ${labelClassName}`}>
                    <input 
                        type="checkbox" 
                        checked={printWithHeader}
                        onChange={(e) => setPrintWithHeader(e.target.checked)}
                        className="cursor-pointer rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-teal-600"
                    />
                    <span>Header &amp; Footer</span>
                </label>
            </div>

            <div 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer select-none transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        setShowHonorificInReceipts(!showHonorificInReceipts);
                    }
                }}
            >
                <label className={`text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-2 m-0 select-none whitespace-nowrap ${labelClassName}`}>
                    <input 
                        type="checkbox" 
                        checked={showHonorificInReceipts}
                        onChange={(e) => setShowHonorificInReceipts(e.target.checked)}
                        className="cursor-pointer rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 sm:w-4 sm:h-4 accent-teal-600"
                    />
                    <span>Show Title</span>
                </label>
            </div>
        </div>
    );
};

export default PrintSettingsToggle;
