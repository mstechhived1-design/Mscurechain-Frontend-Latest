'use client';

import { useEffect, useCallback } from 'react';
import { useOnlineStore } from '@/stores/onlineStore';
import { toast } from 'react-hot-toast';

/**
 * OfflineDetector — Global Connectivity Monitor
 * 
 * Logic:
 * 1. Synchronize `navigator.onLine` with the Zustand store.
 * 2. Listen for 'online' and 'offline' browser events.
 * 3. Use a lightweight ping to verify actual internet connectivity when 'online' event fires.
 */
export default function OfflineDetector() {
  const { setOnline, setShowBackOnline } = useOnlineStore();

  const checkConnectivity = useCallback(async () => {
    // 0. Fast fail if the browser natively knows it's offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    // 📡 TRUE Internet Ping (Bypasses Localhost Loopback Illusion)
    // We ping an official infrastructure URL (Google's captive portal check) to verify WAN connectivity.
    // Unlike cdn-cgi/trace, generate_204 is a zero-byte response that ad-blockers (like Brave Shields) do not block,
    // thereby preventing false offline states in privacy browsers.
    try {
      const response = await fetch(`https://clients3.google.com/generate_204?t=${new Date().getTime()}`, {
        method: 'GET',
        mode: 'no-cors', 
        cache: 'no-store',
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleOnline = useCallback(async () => {
    // 0. Immediate optimistic update if browser says we're online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        if (!useOnlineStore.getState().isOnline) {
            setOnline(true);
            setShowBackOnline(true);
            setTimeout(() => setShowBackOnline(false), 4000);
        }
    }

    const isActuallyOnline = await checkConnectivity();
    if (!isActuallyOnline) {
      if (useOnlineStore.getState().isOnline) {
        console.warn('[Network] ⚠️ Browser says Online, but internet is unreachable.');
        setOnline(false);
      }
    } else {
       console.log('%c[Network] 📡 Connectivity Verified', 'color: #10b981; font-weight: bold');
    }
  }, [checkConnectivity, setOnline, setShowBackOnline]);

  const handleOffline = useCallback(() => {
    if (useOnlineStore.getState().isOnline) {
      console.warn('%c[Network] 📡 Offline Mode (Immediate)', 'color: #f59e0b; font-weight: bold');
      setOnline(false);
      setShowBackOnline(false);
    }
  }, [setOnline, setShowBackOnline]);

  // Robust Heartbeat Poller for Real-World Network Outages
  useEffect(() => {
    // Poll the network every 3 seconds (faster than 5s) to catch silent failures 
    const interval = setInterval(async () => {
      const isActuallyOnline = await checkConnectivity();
      const currentlyOnline = useOnlineStore.getState().isOnline;

      if (!isActuallyOnline && currentlyOnline) {
        handleOffline();
      } else if (isActuallyOnline && !currentlyOnline) {
        handleOnline();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [checkConnectivity, handleOffline, handleOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    checkConnectivity().then(isOnline => {
      if (!isOnline) {
        handleOffline();
      } else {
        setOnline(true);
      }
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 🛡️ NAVIGATION GUARD: Prevent clicking <a> tags while offline
    const handleNavigationAttempt = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('a');
      
      if (anchor && !useOnlineStore.getState().isOnline) {
        e.preventDefault();
        e.stopPropagation();
        
        toast.error("Offline: Navigation blocked to prevent data loss.", {
          id: 'offline-nav-blocked',
          duration: 3000,
          position: 'top-center'
        });
      }
    };

    // 🛡️ HARD NAVIGATION GUARD: Patch window.history to block programmatic navigation (router.push)
    // This is the "failsafe" to ensure no dinosaur page ever appears.
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      if (!useOnlineStore.getState().isOnline) {
        console.warn('[Network] 🛡️ Blocked history.pushState while offline');
        toast.error("Connectivity Lost: Staying on current page.", { id: 'offline-history-blocked' });
        return; 
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function(...args) {
      if (!useOnlineStore.getState().isOnline) {
         console.warn('[Network] 🛡️ Blocked history.replaceState while offline');
         return; 
      }
      return originalReplaceState.apply(this, args);
    };

    window.addEventListener('click', handleNavigationAttempt, true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('click', handleNavigationAttempt, true);
      // Restore original history methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [handleOnline, handleOffline, setOnline]);

  return null; // Side-effect component, renders nothing
}
