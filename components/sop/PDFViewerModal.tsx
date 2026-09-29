'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Loader2 } from 'lucide-react';

interface PDFViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    sopName: string | null;
    onDownload: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    sopName,
    onDownload
}) => {
    console.log(`[VIEWER DEBUG] Final PDF URL for iframe: ${pdfUrl}`);
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 bg-[#020617]/80 backdrop-blur-xl animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-transparent"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-6xl h-full bg-white dark:bg-gray-900 rounded-t-[1rem] sm:rounded-[1rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-2 sm:px-3 py-1 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-1.5">
                                <div className="p-0.5 bg-emerald-500/10 text-emerald-500 rounded">
                                    <FileText size={10} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-[6px] sm:text-[7px] font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                                        {sopName || 'Document Preview'}
                                    </h3>
                                    <p className="text-[5px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        Official Hospital Protocol
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={onDownload}
                                    className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[5px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm leading-none"
                                >
                                    <Download size={8} />
                                    <span className="hidden sm:inline">Download</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-500 hover:text-white rounded transition-all active:scale-95 leading-none"
                                >
                                    <X size={8} className="sm:size-10" />
                                </button>
                            </div>
                        </div>

                        {/* PDF Content */}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-950 relative">
                            {pdfUrl ? (
                                <iframe
                                    src={`${pdfUrl}#toolbar=0`}
                                    className="w-full h-full border-none shadow-inner"
                                    title="SOP PDF Viewer"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 size={48} className="animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Loading Secured Content...</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Meta */}
                        <div className="px-2 py-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <p className="text-[5px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                Protocol Matrix Registry • Secure Institutional Data
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 text-[5px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    SECURED_VALIDATED
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
