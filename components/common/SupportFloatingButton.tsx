'use client';

import React from 'react';
import { Headset } from 'lucide-react';
import { motion } from 'framer-motion';

interface SupportFloatingButtonProps {
    onClick: () => void;
    label?: string;
}

const SupportFloatingButton: React.FC<SupportFloatingButtonProps> = ({ onClick, label = "HELP & SUPPORT" }) => {
    const [showBadge, setShowBadge] = React.useState(true);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem("showSupportBadge");
            setShowBadge(stored !== "false");

            const handleStorageChange = () => {
                const current = localStorage.getItem("showSupportBadge");
                setShowBadge(current !== "false");
            };
            window.addEventListener("storage", handleStorageChange);
            window.addEventListener("support-badge-toggle", handleStorageChange);

            return () => {
                window.removeEventListener("storage", handleStorageChange);
                window.removeEventListener("support-badge-toggle", handleStorageChange);
            };
        }
    }, []);

    if (!showBadge) return null;

    return (
        <motion.div 
            drag
            dragConstraints={{ 
                left: -window.innerWidth + 100, 
                right: 0, 
                top: -window.innerHeight + 100, 
                bottom: 0 
            }}
            whileDrag={{ scale: 1.1, cursor: "grabbing" }}
            initial={{ x: 0, y: 0 }}
            className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] flex items-center justify-center group touch-none"
        >
            {/* Rotating Text Outside the Button */}
            <div className="absolute w-12 h-12 sm:w-20 sm:h-20 animate-[spin_12s_linear_infinite] pointer-events-none origin-center">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                        <path
                            id="supportCirclePath"
                            d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                        />
                    </defs>
                    <text className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-[0.2em] fill-black dark:fill-white opacity-60">
                        <textPath xlinkHref="#supportCirclePath">
                            {label} • {label} •
                        </textPath>
                    </text>
                </svg>
            </div>

            <button
                onClick={onClick}
                className="relative w-8 h-8 sm:w-12 sm:h-12 bg-primary-theme rounded-full flex items-center justify-center text-white transform hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl shadow-primary-theme/40 z-10"
                aria-label="Support and Feedback"
            >
                {/* Background Animation Effect */}
                <div className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform duration-500 rounded-full overflow-hidden" />

                {/* Pulse Effect */}
                <div className="absolute inset-0 animate-pulse bg-primary-theme/20 rounded-full pointer-events-none" />

                <div className="relative flex flex-col items-center">
                    <Headset className="w-4 h-4 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
            </button>
        </motion.div>
    );
};

export default SupportFloatingButton;
