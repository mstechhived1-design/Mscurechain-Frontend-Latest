'use client';

import React, { useState } from 'react';
import { LogOut, X, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    // userName is kept optional to maintain compatibility with existing usages, 
    // even though the new design doesn't use it explicitly in the same way.
    userName?: string;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (!isOpen) return null;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        
        // Ensure the button shows "Logging out..." for at least 4 seconds to mask transition
        const startTime = Date.now();
        const minWait = 4000; 

        try {
            // Initiate logout logic
            await onConfirm();
            
            // Wait for remaining time to avoid abrupt transition/white screen
            const elapsed = Date.now() - startTime;
            if (elapsed < minWait) {
                await new Promise(resolve => setTimeout(resolve, minWait - elapsed));
            }
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all duration-700 ${
                isLoggingOut 
                    ? "bg-white dark:bg-slate-950 opacity-100" 
                    : "bg-black/50 backdrop-blur-sm"
            }`}
            onClick={!isLoggingOut ? onClose : undefined}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800 transition-all duration-500 ${
                    isLoggingOut ? "scale-95 opacity-50 blur-[2px]" : "scale-100 opacity-100"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                            <LogOut size={18} />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Logout
                        </h2>
                    </div>

                    {!isLoggingOut && (
                        <button
                            onClick={onClose}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-center sm:text-left">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {isLoggingOut ? "Securing your session and redirecting..." : "Are you sure you want to log out? You will need to log in again to access your account."}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                    {!isLoggingOut && (
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`rounded-lg px-4 py-2 text-sm font-black text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center gap-2 min-w-[100px] justify-center transition-all ${
                            isLoggingOut ? "opacity-100 w-full" : "opacity-100"
                        }`}
                    >
                        {isLoggingOut ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Logging out...</span>
                            </>
                        ) : (
                            "Logout"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
