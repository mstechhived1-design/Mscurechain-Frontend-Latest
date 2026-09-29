'use client';

/**
 * SSEProvider — Global Real-Time Event Bridge
 *
 * Mounted once at the app root level (in providers.tsx).  It opens a single
 * shared SSE connection and fans out incoming events to every domain Zustand
 * store.  Pages do NOT need to call useSSE individually — they only need to
 * observe their store's `pendingRefetch` flag (via useRealtimeRefetch) to
 * know when to reload data.
 *
 * This component is intentionally a leaf — it renders nothing.  It only
 * manages side-effects (EventSource lifecycle + store updates).
 *
 * SECURITY:
 *   - The SSE endpoint authenticates via the accessToken cookie (HttpOnly,
 *     set by the backend).  The browser sends it automatically.
 *   - No sensitive data is ever in the event payload.
 *   - Role filtering is enforced on the server; the client trusts whatever
 *     the server sends (already filtered).
 *
 * RECONNECT:
 *   The native EventSource API reconnects automatically on network drops.
 *   We do NOT implement manual reconnect logic — the browser handles it.
 */

import { useEffect, useRef } from 'react';
import { API_CONFIG } from '@/lib/integrations/config';
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
} from '@/stores/domainStores';

// ─── Domain → store dispatch map ──────────────────────────────────────────────

// Built lazily so we can access store.getState() at dispatch time (avoids stale closures)
const DOMAIN_DISPATCH: Record<string, (ev: SSEPayload) => void> = {
  appointments: (ev) => useAppointmentStore.getState().applySSEEvent(ev),
  patients:     (ev) => usePatientStore.getState().applySSEEvent(ev),
  lab:          (ev) => useLabStore.getState().applySSEEvent(ev),
  pharmacy:     (ev) => usePharmacyStore.getState().applySSEEvent(ev),
  billing:      (ev) => useBillingStore.getState().applySSEEvent(ev),
  emergency:    (ev) => useEmergencyStore.getState().applySSEEvent(ev),
  ambulance:    (ev) => useAmbulanceStore.getState().applySSEEvent(ev),
  staff:        (ev) => useStaffStore.getState().applySSEEvent(ev),
  beds:         (ev) => useBedStore.getState().applySSEEvent(ev),
  inventory:    (ev) => useInventoryStore.getState().applySSEEvent(ev),
  radiology:    (ev) => useRadiologyStore.getState().applySSEEvent(ev),
  hr:           (ev) => useHRStore.getState().applySSEEvent(ev),
  helpdesk:     (ev) => useHelpdeskStore.getState().applySSEEvent(ev),
  system:       (ev) => useSystemStore.getState().applySSEEvent(ev),
};

// ─── SSEProvider component ────────────────────────────────────────────────────

export function SSEProvider() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function connect() {
      // EventSource sends cookies automatically (withCredentials: true)
      // The backend SSE controller validates the accessToken cookie.
      const url = `${API_CONFIG.BASE_URL}/sse/events`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        console.log('[SSEProvider] ✅ Real-time connection established');
      };

      es.onmessage = (e) => {
        try {
          const payload: SSEPayload = JSON.parse(e.data);

          // Skip the initial connection-confirmation message
          if ((payload as any).type === 'connected') return;

          const dispatch = DOMAIN_DISPATCH[payload.domain];
          if (dispatch) {
            dispatch(payload);
          } else {
            console.warn('[SSEProvider] Unknown domain:', payload.domain);
          }
        } catch {
          // ": heartbeat" comment lines are not JSON — silently skip
        }
      };

      es.onerror = () => {
        // The browser EventSource API automatically reconnects on error.
        // We only log to help with debugging.
        console.warn('[SSEProvider] Connection error — browser will auto-reconnect');
      };
    }

    // Wait until the user is authenticated before opening the connection.
    // Re-check every 2s until the accessToken cookie is present.
    const POLL_INTERVAL = 2000;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const tryConnect = () => {
      // Check if the accessToken cookie exists (set by the backend after login)
      const hasAuth =
        document.cookie.includes('accessToken') ||
        // Also check suffixed variants used in multi-tenant mode
        document.cookie.split(';').some((c) => c.trim().startsWith('accessToken'));

      if (hasAuth) {
        if (pollTimer) clearInterval(pollTimer);
        connect();
      }
    };

    // Try immediately, then poll
    tryConnect();
    pollTimer = setInterval(tryConnect, POLL_INTERVAL);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
        console.log('[SSEProvider] Connection closed (component unmounted)');
      }
    };
  }, []);

  return null; // Render nothing — this is a pure side-effect component
}
