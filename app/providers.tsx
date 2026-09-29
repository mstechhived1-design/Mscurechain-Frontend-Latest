'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { clearLegacyAuthData } from '@/lib/utils/auth-cleanup';
import { useAuthStore } from '@/stores/authStore';
import { SSEProvider } from '@/components/SSEProvider';

function Providers({ children }: { children: ReactNode }) {
  // ✅ MULTI-TAB AUTH: Only bootstrap session if THIS tab has explicitly logged in.
  // New tabs must always enter fresh credentials — they don't inherit cookies automatically.
  useEffect(() => {
    // Ensure axios sends cookies
    import('axios').then(({ default: axios }) => {
      axios.defaults.withCredentials = true;
    }).catch(() => { });

    const { initializeAuth, initEvents } = useAuthStore.getState();
    initEvents();

    // ✅ SESSION RECOVERY: Restore session on every tab refresh/mount (Standard Production Practice)
    // 1 Browser = 1 User Session. No more tab isolation checks that break on refresh.
    initializeAuth();

    clearLegacyAuthData();
  }, []);

  // ⚡ SUPER-FAST PERFORMANCE: Cache-first strategy for instant navigation (<1.5s)
  // Individual hooks override these defaults when real-time updates are needed
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,        // ⚡ Cache data 30s — prevents refetch on every route change
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,  // ⚡ Medical dashboards don't need auto-refresh on tab focus
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: 1,
        networkMode: 'online',
      },
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <SSEProvider />
      {children}
    </QueryClientProvider>
  );
}

export default Providers;
