'use client';

import React from 'react';
import { Play, Pause, X, Volume2, Mic } from 'lucide-react';

interface FloatingAudioPlayerProps {
    isPlaying: boolean;
    togglePlay: () => void;
    progress: number;
    onClose: () => void;
    visible: boolean;
}

function FloatingAudioPlayer({
    isPlaying,
    togglePlay,
    progress,
    onClose,
    visible
}: FloatingAudioPlayerProps) {
    return (
        <>
            {visible && (
                <div
                    className="fixed bottom-6 left-6 z-50 bg-white rounded-2xl shadow-2xl p-4 border-l-4 border-primary-theme max-w-[300px]"
                >
                    <div className="flex items-start gap-4">
                        <button
                            type="button"
                            suppressHydrationWarning
                            onClick={onClose}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-slate-100"
                        >
                            <X size={14} className="text-slate-400" />
                        </button>

                        <div className="w-12 h-12 rounded-xl bg-primary-theme/10 flex items-center justify-center shrink-0">
                            {isPlaying ? (
                                <Volume2 size={24} className="text-primary-theme" />
                            ) : (
                                <Mic size={24} className="text-primary-theme" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight mb-0.5">Founder's Vision</h4>
                            <p className="text-xs text-slate-500 mb-3 truncate">Listen to the future of healthcare.</p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    suppressHydrationWarning
                                    onClick={togglePlay}
                                    className="w-8 h-8 rounded-lg bg-primary-theme text-white flex items-center justify-center hover:scale-105 active:scale-95"
                                >
                                    {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                                </button>

                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-theme"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default React.memo(FloatingAudioPlayer);
