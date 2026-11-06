'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[MSCureChain ErrorBoundary Caught]:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-5 shadow-sm">
                    <AlertCircle size={32} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                    Application Error
                </span>

                <h2 className="text-xl font-black text-slate-800 mt-3 mb-2 tracking-tight">
                    Something went wrong
                </h2>

                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                    {error?.message || "An unexpected error occurred while rendering this page."}
                </p>

                {error?.digest && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[10px] font-mono text-slate-400 mb-6 border border-slate-100">
                        Error ID: {error.digest}
                    </div>
                )}

                <div className="flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                        <RefreshCw size={14} />
                        <span>Try Again</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.location.href = '/'}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Home size={14} />
                        <span>Return to Main Dashboard</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

