'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, CheckCircle2 } from 'lucide-react';
import { useOnlineStore } from '@/stores/onlineStore';

/**
 * OfflineBanner — Premium Offline/Online Notification Overlay
 * 
 * Design: High-contrast, non-intrusive, sticky at the top.
 * State: 
 *   - Offline: Persistent Red/Amber notification.
 *   - Back Online: Success notification that fades after a few seconds.
 */
export default function OfflineBanner() {
  const { isOnline, showBackOnline } = useOnlineStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none flex justify-center p-2 sm:p-4">
      <AnimatePresence mode="wait">
        {/* Removed 'Network Disconnected' banner as per user request to keep UI clean during outages */}

        {/* Scenario 2: Connection Restored (Temporary success message) */}
        {isOnline && showBackOnline && (
          <motion.div
            key="online-banner"
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-2 sm:px-6 
                       bg-emerald-600 dark:bg-emerald-500 text-white rounded-full 
                       shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-emerald-400/30 
                       backdrop-blur-md"
          >
            <div className="flex-shrink-0 bg-white/20 p-1.5 rounded-full">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col pr-2">
              <span className="text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5">
                Connection Restored
                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
              </span>
              <p className="text-[10px] sm:text-xs text-white/90 leading-tight">
                Welcome back! All systems are operational.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
