"use client";

import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { printHtmlContent } from '@/lib/print-utils';

interface PrintReceiptPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string | null;
    title?: string;
    subtitle?: string;
}

export default function PrintReceiptPreviewModal({
    isOpen,
    onClose,
    htmlContent,
    title = 'Document Print Preview',
    subtitle = 'A4 Standard Layout • Live Document Preview'
}: PrintReceiptPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    if (!isOpen || !htmlContent) return null;

    const handlePrint = () => {
        if (iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
                return;
            } catch (e) {
                console.warn('[PrintPreview] Direct iframe print failed, falling back:', e);
            }
        }
        printHtmlContent(htmlContent);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                            <Printer size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800">{title}</h3>
                            <p className="text-[10px] text-slate-500 font-bold">{subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-200 transition-all cursor-pointer"
                            title="Print Document"
                        >
                            <Printer size={14} />
                            <span>Print</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                            title="Close Preview"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Live A4 Document Preview Frame */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-200/60 flex justify-center">
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300 w-full max-w-[794px] min-h-[500px]">
                        <iframe
                            ref={iframeRef}
                            srcDoc={htmlContent}
                            title="Receipt Detailed Preview"
                            className="w-full h-[640px] border-none bg-white block"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Preview matches exact printed final receipt</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-teal-500/25 transition-all cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print Final Receipt</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

