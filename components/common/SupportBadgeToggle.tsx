'use client';

import React, { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, Headset } from 'lucide-react';

export const SupportBadgeToggle: React.FC = () => {
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem("showSupportBadge");
            setEnabled(stored !== "false");
        }
    }, []);

    const handleToggle = () => {
        const nextState = !enabled;
        setEnabled(nextState);
        localStorage.setItem("showSupportBadge", String(nextState));
        // Dispatch custom event for real-time reactivity across same-window components
        window.dispatchEvent(new Event("support-badge-toggle"));
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-theme/10 rounded-xl text-primary-theme flex items-center justify-center">
                    <Headset size={18} />
                </div>
                <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Help &amp; Support Badge</h4>
                    <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Toggle the floating help widget on the screen</p>
                </div>
            </div>
            <button onClick={handleToggle} className="focus:outline-none transition-transform duration-200 active:scale-95" type="button">
                {enabled ? (
                    <ToggleRight className="w-10 h-10 text-primary-theme" />
                ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-300" />
                )}
            </button>
        </div>
    );
};

export default SupportBadgeToggle;
