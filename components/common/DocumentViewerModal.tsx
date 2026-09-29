import React from 'react';
import { FileText, X, CheckCircle2, UploadCloud } from 'lucide-react';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

export const DocumentViewerModal = ({ isOpen, onClose, url, title }: DocumentViewerModalProps) => {
    if (!isOpen) return null;

    const getViewUrl = (originalUrl: string) => {
        if (!originalUrl) return '';
        if (originalUrl.includes('cloudinary.com')) {
            return originalUrl
                .replace('/upload/fl_attachment/', '/upload/')
                .replace('/upload/', '/upload/fl_attachment:false/');
        }
        return originalUrl;
    };

    const viewUrl = getViewUrl(url);

    const isImage = viewUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ||
        (viewUrl.includes('cloudinary.com') && viewUrl.includes('/image/upload/'));

    return (
        <div className="fixed top-[72px] lg:left-[272px] left-4 bottom-4 right-4 z-[1000] flex flex-col items-center justify-start p-2 sm:p-4 bg-[#020617]/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-300 rounded-2xl overflow-hidden">

            {/* Container - Transparent Body */}
            <div className="w-full max-w-5xl h-full flex flex-col items-center gap-4">

                {/* Header - Solid Background */}
                <div className="w-full bg-white dark:bg-[#0a0a09] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 flex-shrink-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-4">
                        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 shadow-sm shrink-0">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[6px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">Secure Preview</p>
                                <h3 className="text-[9px] sm:text-sm font-black text-gray-900 dark:text-white whitespace-normal line-clamp-2 sm:whitespace-nowrap sm:truncate uppercase tracking-[0.1em] leading-tight">
                                    {title}
                                </h3>
                            </div>
                        </div>
                        <div className="shrink-0 flex items-center">
                            <button
                                onClick={onClose}
                                className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all active:scale-95 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                            >
                                <X size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Viewer Body - Floating/Transparent */}
                <div className="flex-1 w-full flex items-center justify-center relative min-h-0 bg-transparent">
                    {(!isImage && (viewUrl?.toLowerCase().includes('.pdf') || viewUrl?.toLowerCase().includes('raw') || viewUrl?.toLowerCase().includes('pdf'))) ? (
                        <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-white/95 dark:bg-[#050505]">
                            <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`}
                                className="w-full h-full border-none"
                                title={title}
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="relative group p-2 flex items-center justify-center w-full h-full animate-in fade-in zoom-in duration-300">
                            <img
                                src={viewUrl}
                                alt={title}
                                className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded-xl border border-white/30"
                            />
                            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 pointer-events-none" />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
