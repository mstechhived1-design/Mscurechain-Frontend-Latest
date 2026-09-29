'use client';

import React from 'react';
import { Toaster, ToastBar, toast, Toast, useToasterStore } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * SwipeableToaster
 * A global toast handler that adds swipe-to-dismiss functionality
 * using framer-motion and react-hot-toast.
 */
const SwipeableToaster = () => {
    const { toasts } = useToasterStore();
    const processedToasts = useRef<Set<string>>(new Set());

    useEffect(() => {
        toasts.forEach((t) => {
            if (t.visible && !processedToasts.current.has(t.id)) {
                processedToasts.current.add(t.id);
                // Play notification sound safely
                try {
                    const soundFile = t.type === 'error' ? '/assets/emergency.mp3' : '/assets/nurse.mp3';
                    // Append query param to potentially bypass service worker cache issues (ERR_CACHE_OPERATION_NOT_SUPPORTED) on 206 Partial Content
                    const audio = new Audio(soundFile + "?cb=" + Date.now());
                    audio.volume = 0.5; // Set volume to 50% so it's not too loud
                    
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(() => {
                            // Silently ignore autoplay restrictions instead of logging
                        });
                    }
                } catch (error) {
                    // completely silent
                }
            }
        });
        
        // Cleanup old toasts to prevent memory leaks
        const visibleIds = new Set(toasts.filter(t => t.visible).map(t => t.id));
        for (const id of processedToasts.current) {
            if (!visibleIds.has(id)) {
                // We don't remove it immediately because it might still be animating out, 
                // but keeping it in the set is fine since it's just a set of strings.
            }
        }
    }, [toasts]);

    return (
        <Toaster
            position="top-center"
            toastOptions={{
                // Maintain existing styles or provide decent defaults
                duration: 4000,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#1f2937',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    fontSize: '14px',
                    fontWeight: 500,
                    maxWidth: '400px',
                },
            }}
        >
            {(t: Toast) => (
                <motion.div
                    layout
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, x: t.height ? 100 : 0, transition: { duration: 0.2 } }}
                    drag="x"
                    dragConstraints={{ left: -100, right: 100 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                        // If dragged more than 80px in either direction, dismiss it
                        if (Math.abs(info.offset.x) > 80) {
                            toast.dismiss(t.id);
                        }
                    }}
                    className="cursor-grab active:cursor-grabbing pointer-events-auto"
                >
                    <ToastBar toast={t}>
                        {({ icon, message }) => (
                            <div className="flex items-center gap-2 p-1">
                                {icon}
                                <div className="flex-1 min-w-0 pr-2">
                                    {message}
                                </div>
                                {t.type !== 'loading' && (
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
                                        aria-label="Close"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </ToastBar>
                </motion.div>
            )}
        </Toaster>
    );
};

export default SwipeableToaster;
