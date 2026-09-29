'use client';

import React, { useState } from 'react';

import { MessageSquare, X } from 'lucide-react';
import SelectionChat from './SelectionChat';

import { usePathname } from 'next/navigation';

const FloatingChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname() as string;

    // Define allowed routes (Landing & Marketing pages only)
    const allowedRoutes = ['/about', '/features', '/pricing', '/solutions', '/portals'];
    const isAllowed = pathname === '/' || allowedRoutes.some(route => pathname.startsWith(route));

    if (!isAllowed) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
            {/* Chat Window */}

            {isOpen && (
                <div
                    className="w-[400px] max-w-[calc(100vw-2rem)] rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
                >
                    <SelectionChat onClose={() => setIsOpen(false)} />
                </div>
            )}


            {/* Toggle Button */}
            <button
                type="button"
                suppressHydrationWarning
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ${isOpen ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >

                {isOpen ? (
                    <div
                        key="close"
                    >
                        <X className="w-6 h-6" />
                    </div>
                ) : (
                    <div
                        key="chat"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </div>
                )}


                {/* Pulsing Notification Dot */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default FloatingChat;
