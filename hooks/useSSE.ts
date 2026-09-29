'use client';

/**
 * useSSE — Shared Server-Sent Events hook
 *
 * ARCHITECTURE:
 * - One SSE connection per browser tab, shared across all components via a
 *   module-level singleton.  Multiple calls to useSSE() from different
 *   components on the same page all share the same EventSource instance.
 * - Each call registers a (domain, handler) pair.  When an event arrives,
 *   only handlers whose domain matches the event domain are called.
 * - The actual EventSource is only closed when ALL registered handlers have
 *   been removed (every component using the hook has unmounted).
 * - The handler is wrapped with useRef so callers can pass inline functions
 *   without causing the effect to re-run on every render.
 *
 * USAGE in a page component:
 *   useSSE('appointments', useAppointmentStore.getState().applySSEEvent);
 */

import { useEffect, useRef } from 'react';
import { getAccessToken } from '@/lib/integrations';
import { API_CONFIG } from '@/lib/integrations/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SSEDomain =
  | 'appointments' | 'patients' | 'lab' | 'pharmacy' | 'billing'
  | 'emergency' | 'ambulance' | 'staff' | 'beds' | 'inventory'
  | 'radiology' | 'hr' | 'helpdesk' | 'system';

export type SSEEventType = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'completed';

export interface SSEPayload {
  tenantId: string;
  hospitalId: string;
  domain: SSEDomain;
  type: SSEEventType;
  roles: string[];
  resourceId?: string;
  resourceType?: string;
  meta?: Record<string, string | number | boolean>;
  timestamp: string;
}

export type SSEHandler = (event: SSEPayload) => void;

// ─── Singleton connection state ───────────────────────────────────────────────

interface HandlerEntry {
  id: symbol;
  domain: SSEDomain;
  handler: SSEHandler;
}

let _eventSource: EventSource | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const _handlers: HandlerEntry[] = [];

function getBaseUrl(): string {
  // Use the same dynamic base URL as the rest of the API client.
  // This ensures network access (via IP) works for SSE too.
  return API_CONFIG.BASE_URL.replace(/\/api$/, "");
}

function buildSSEUrl(): string {
  // EventSource sends all cookies automatically (including the accessToken HttpOnly cookie)
  // No manual Authorization header possible from browser EventSource — cookie auth is used.
  return `${getBaseUrl()}/api/sse/events`;
}

function dispatchEvent(payload: SSEPayload): void {
  for (const entry of _handlers) {
    if (entry.domain === payload.domain) {
      try {
        entry.handler(payload);
      } catch (e) {
        console.error('[SSE] handler error:', e);
      }
    }
  }
}

function openConnection(): void {
  if (_eventSource && _eventSource.readyState !== EventSource.CLOSED) return;
  if (typeof window === 'undefined') return;

  const url = buildSSEUrl();
  _eventSource = new EventSource(url, { withCredentials: true });

  _eventSource.onopen = () => {
    console.log('[SSE] Connection established');
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = null;
    }
  };

  _eventSource.onmessage = (e) => {
    try {
      const payload: SSEPayload = JSON.parse(e.data);
      // Ignore the initial connection confirmation event
      if ((payload as any).type === 'connected') return;
      dispatchEvent(payload);
    } catch {
      // Heartbeat comments (": heartbeat") are not JSON — silently ignore
    }
  };

  _eventSource.onerror = () => {
    // EventSource reconnects automatically; we just log
    console.warn('[SSE] Connection error — browser will auto-reconnect');
  };
}

function maybeCloseConnection(): void {
  if (_handlers.length === 0 && _eventSource) {
    _eventSource.close();
    _eventSource = null;
    console.log('[SSE] Connection closed (no active listeners)');
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param domain - The SSE domain key this component cares about
 * @param handler - Called for every incoming event matching `domain`.
 *                  Tip: pass a stable function reference (e.g. from Zustand
 *                  store.getState().applySSEEvent) to avoid re-subscriptions.
 */
export function useSSE(domain: SSEDomain, handler: SSEHandler): void {
  // Wrap the latest handler in a ref so we never need to re-subscribe just
  // because an inline function was recreated by the parent component.
  const handlerRef = useRef<SSEHandler>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler: SSEHandler = (ev) => handlerRef.current(ev);
    const id = Symbol();

    const entry: HandlerEntry = { id, domain, handler: stableHandler };
    _handlers.push(entry);

    // Ensure connection is open
    openConnection();

    return () => {
      // Remove this component's handler
      const idx = _handlers.findIndex((h) => h.id === id);
      if (idx !== -1) _handlers.splice(idx, 1);

      // Close SSE connection if nobody is listening anymore
      maybeCloseConnection();
    };
  }, [domain]); // domain never changes for a given page
}
