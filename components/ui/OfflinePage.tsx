'use client';

import React, { useState } from 'react';

import { motion } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStore } from '@/stores/onlineStore';

/**
 * OfflinePage — Premium Full-Screen Connectivity State
 * 
 * Inspired by YouTube's clean "Connect to the Internet" layout.
 * Features:
 *   - Custom 3D Astronaut Illustration
 *   - Retry functionality with loading state
 *   - Responsive, dark-mode compatible design
 */
const OfflinePage = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const { setOnline, setShowBackOnline } = useOnlineStore();

  const handleRetry = async () => {
    setIsRetrying(true);

    // 0. Fast fail if the browser natively knows it's offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       setTimeout(() => setIsRetrying(false), 1000);
       return;
    }

    // 📡 TRUE Internet Ping (Bypasses Localhost Illusion)
    try {
      // Use an infrastructure URL instead of a tracker endpoint to bypass Brave Shields
      const response = await fetch(`https://clients3.google.com/generate_204?t=${new Date().getTime()}`, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
      });

      // If we don't throw an error, network is reachable
      setOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 4000);
    } catch {
      // Still offline
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 text-center bg-white dark:bg-gray-950 transition-colors duration-500">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="max-w-md w-full flex flex-col items-center"
      >
        {/* Premium Illustration (Inline SVG completely avoids network dependencies) */}
        <div className="relative w-64 h-64 mb-12 select-none pointer-events-none flex items-center justify-center">
          {/* Subtle glowing background pulse */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"
          />

          <div className="relative z-10 p-8 bg-white dark:bg-gray-900 rounded-full shadow-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center w-32 h-32">
            <WifiOff className="w-16 h-16 text-blue-600 dark:text-blue-500 drop-shadow-md" strokeWidth={1.5} />

            {/* Decorative orbit/rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-full scale-[1.5]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dotted border-blue-200 dark:border-blue-900/50 rounded-full scale-[1.25]"
            />

            {/* Orbiting dots */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 scale-[1.5]"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </motion.div>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Connect to the Internet
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-12 max-w-sm mx-auto text-base leading-relaxed">
          You&apos;re currently in offline mode. Please check your network connection and try again.
        </p>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="group relative flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                     text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-blue-500/25 
                     overflow-hidden active:scale-95"
        >
          {isRetrying ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <WifiOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
          <span>{isRetrying ? 'Checking...' : 'Retry'}</span>

          {/* Subtle shine effect */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-[shine_0.75s_ease-out]" />
        </button>

        {/* Helpful Tip */}
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          Ensure your Wi-Fi or mobile data is turned on
        </p>
      </motion.div>
    </div>
  );
};

export default OfflinePage;
