'use client';

/**
 * useRealtimeRefetch
 *
 * Watches a domain store's `pendingRefetch` flag and calls `refetch()` once
 * whenever a real-time event signals that the server has new data (e.g. a
 * `created` event where the SSE payload contained only an ID, not the full
 * object).
 *
 * Usage in a page:
 *   const { fetchAppointments } = useSomeFetch();
 *   useRealtimeRefetch(useAppointmentStore, fetchAppointments);
 *
 * The page's own `fetchAppointments` function is called automatically whenever
 * an SSE event for the appointments domain arrives while the page is mounted.
 */

import { useEffect, useRef } from 'react';
import type { DomainStore } from '@/stores/domainStores';
import type { StoreApi, UseBoundStore } from 'zustand';

type AnyDomainStore = UseBoundStore<StoreApi<DomainStore>>;

export function useRealtimeRefetch(
  store: AnyDomainStore,
  refetch: () => void | Promise<void>,
): void {
  // Keep a stable ref to refetch so the subscription never needs to re-run
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.pendingRefetch && !prev.pendingRefetch) {
        store.getState().clearRefetch();
        refetchRef.current();
      }
    });
    return unsubscribe;
  }, [store]);
}
