"use client";

import React from 'react';
import { usePrintStore } from '@/stores/printStore';
import { Printer } from 'lucide-react';

export default function PrinterSettingsCard() {
    const { printWithHeader, setPrintWithHeader } = usePrintStore();

    return (
        <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                    <Printer size={15} />
                </div>
                <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-900">Printer Settings</h3>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => setPrintWithHeader(!printWithHeader)}>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.1em] group-hover:text-blue-600 transition-colors">Print with Header & Footer</p>
                    <p className="text-[9px] font-medium text-slate-400">Toggle off to print on pre-printed letterheads</p>
                </div>
                <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${printWithHeader ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${printWithHeader ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </div>
        </div>
    );
}
