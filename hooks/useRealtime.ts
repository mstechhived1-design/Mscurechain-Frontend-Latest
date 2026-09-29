'use client';

/**
 * useRealtime — Portal-level real-time subscription
 *
 * Called once inside each portal layout.  Subscribes to every domain
 * store that is relevant for that portal and triggers a page-level refetch
 * (via React Query's queryClient.invalidateQueries) whenever an SSE event
 * arrives for any of those domains.
 *
 * This approach gives every page in the portal automatic real-time updates
 * without touching individual page components.  Pages that already call
 * useRealtimeRefetch directly get a second (faster) signal, but there is no
 * double-fetch risk because React Query deduplicates concurrent requests.
 *
 * Usage inside a layout:
 *   useRealtime(['appointments', 'patients', 'beds', 'emergency']);
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SSEPayload } from '@/hooks/useSSE';
import {
  useAppointmentStore,
  usePatientStore,
  useLabStore,
  usePharmacyStore,
  useBillingStore,
  useEmergencyStore,
  useAmbulanceStore,
  useStaffStore,
  useBedStore,
  useInventoryStore,
  useRadiologyStore,
  useHRStore,
  useHelpdeskStore,
  useSystemStore,
  type DomainStore,
} from '@/stores/domainStores';
import type { StoreApi, UseBoundStore } from 'zustand';

type AnyDomainStore = UseBoundStore<StoreApi<DomainStore>>;

// Domain → store lookup
const DOMAIN_STORE_MAP: Record<string, AnyDomainStore> = {
  appointments: useAppointmentStore,
  patients:     usePatientStore,
  lab:          useLabStore,
  pharmacy:     usePharmacyStore,
  billing:      useBillingStore,
  emergency:    useEmergencyStore,
  ambulance:    useAmbulanceStore,
  staff:        useStaffStore,
  beds:         useBedStore,
  inventory:    useInventoryStore,
  radiology:    useRadiologyStore,
  hr:           useHRStore,
  helpdesk:     useHelpdeskStore,
  system:       useSystemStore,
};

// Domain → React Query key prefixes to invalidate
const DOMAIN_QUERY_KEYS: Record<string, string[]> = {
  appointments: ['appointments', 'bookings', 'doctor-appointments', 'helpdesk', 'hospital', 'frontdesk'],
  patients:     ['patients', 'admissions', 'ipd', 'discharge', 'helpdesk', 'hospital'],
  lab:          ['lab', 'lab-orders', 'lab-results', 'walk-in'],
  pharmacy:     ['pharmacy', 'invoices', 'prescriptions', 'pharma'],
  billing:      ['billing', 'transactions', 'invoices'],
  emergency:    ['emergency', 'emergency-requests'],
  ambulance:    ['ambulance', 'transits'],
  staff:        ['staff', 'attendance', 'shifts'],
  beds:         ['beds', 'ward', 'inpatients', 'doctor-inpatients'],
  inventory:    ['inventory', 'products', 'suppliers'],
  radiology:    ['radiology', 'imaging'],
  hr:           ['hr', 'payroll', 'leaves', 'recruitment'],
  helpdesk:     ['helpdesk', 'frontdesk', 'support'],
  system:       ['hospital', 'hospital-admin', 'announcements', 'notifications'],
};

export type RealtimeDomain = keyof typeof DOMAIN_STORE_MAP;

/**
 * @param domains - List of SSE domains this portal needs to watch.
 *                  Pass all domains relevant to the portal's roles.
 */
export function useRealtime(domains: RealtimeDomain[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    for (const domain of domains) {
      const store = DOMAIN_STORE_MAP[domain];
      if (!store) continue;

      const unsub = store.subscribe((state, prev) => {
        if (state.pendingRefetch && !prev.pendingRefetch) {
          // Clear the flag immediately so we don't loop
          store.getState().clearRefetch();

          // Invalidate all React Query keys for this domain
          const keys = DOMAIN_QUERY_KEYS[domain] ?? [];
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        }
      });

      unsubscribers.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [domains, queryClient]); // domains is a stable literal array in each layout
}
