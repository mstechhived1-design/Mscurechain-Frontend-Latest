'use client';

import React from 'react';
import { useOnlineStore } from '@/stores/onlineStore';
import OfflinePage from '@/components/ui/OfflinePage';
import { usePathname } from 'next/navigation';

/**
 * MainContentWrapper — Content Connectivity Guard
 * 
 * Logic:
 * - If the app is online, render the children normally.
 * - If the app is offline:
 *    - Landing: Show full-screen OfflinePage.
 *    - Portal: Keep Sidebar/Navbar visible (z-35) but cover the content area.
 */
export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline } = useOnlineStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const pathname = usePathname() as string;

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOnline && isMounted) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = 'unset';
      document.body.style.overflow = 'unset';
    }
    return () => { 
      document.documentElement.style.overflow = 'unset';
      document.body.style.overflow = 'unset'; 
    };
  }, [isOnline, isMounted]);

  // Detect if we are in a portal or a landing page
  const isPortal = pathname.startsWith('/admin') || 
                   pathname.startsWith('/patient') || 
                   pathname.startsWith('/doctor') || 
                   pathname.startsWith('/hospital-admin') || 
                   pathname.startsWith('/hospital admin') ||
                   pathname.startsWith('/helpdesk') || 
                   pathname.startsWith('/hr') || 
                   pathname.startsWith('/lab') || 
                   pathname.startsWith('/pharmacy') || 
                   pathname.startsWith('/ambulance') || 
                   pathname.startsWith('/emergency') || 
                   pathname.startsWith('/nurse') || 
                   pathname.startsWith('/frontdesk') ||
                   /^\/[^/]+\/(admin|hospital[- ]admin|doctor|patient|hr|pharmacy|pharma|pharmacist|pharma-owner|lab|staff|ambulance|emergency|helpdesk|frontdesk|nurse)/.test(pathname);

  // During SSR and first hydration pass, assume we are online and mounted
  const finalOnline = !isMounted || isOnline;

  return (
    <div className="relative min-h-screen">
      {/* 
          Keep the children always mounted to prevent losing state.
          We disable interaction on the main content when offline.
      */}
      <div 
        className={`transition-all duration-150 ${!finalOnline ? "pointer-events-none grayscale-[0.6] opacity-80" : ""}`}
        suppressHydrationWarning
      >
        {children}
      </div>

      {/* 
          OFFLINE OVERLAY LOGIC
          
          Goal: 
          1. Landing: Full screen overlay.
          2. Portal: Sidebar/Navbar visible. OfflinePage in content area.
      */}
      {!finalOnline && isMounted && (
        <>
          {/* ✅ CLICK SHIELD: Prevents interaction with the covered content area */}
          <div className="fixed inset-0 z-[5] bg-transparent cursor-not-allowed pointer-events-auto" title="Offline Mode: Content Protected" />

          {/* ✅ OFFLINE CONTENT: Positioned based on layout */}
          {!isPortal ? (
            <div className="fixed inset-0 bg-white dark:bg-gray-950 z-[10] flex items-center justify-center p-6 animate-in fade-in duration-150">
               <OfflinePage />
            </div>
          ) : (
            <div className={`
              fixed z-[10] bg-white dark:bg-gray-950/95 
              /* Sidebar is usually 14rem (w-56) on lg. Navbar is 4rem (h-16) on all screens. */
              inset-0 top-16 lg:left-56
              flex items-center justify-center p-6
              animate-in fade-in zoom-in duration-150
            `}>
               <OfflinePage />
            </div>
          )}
        </>
      )}
    </div>
  );
}
