/**
 * Domain Real-Time Stores
 *
 * Each store holds:
 *   - `items`          – the current list of records shown on screen
 *   - `setItems`       – called by the page's initial data fetch
 *   - `applySSEEvent`  – mutates `items` in-place based on an incoming SSE event
 *   - `pendingRefetch` – flips true when the SSE event signals new data that
 *                        requires a full server round-trip (e.g. 'created')
 *   - `clearRefetch`   – called by the page after isuing the refetch
 *
 * applySSEEvent contract (all domains):
 *   created        → set pendingRefetch (full refetch needed, ID-only payload)
 *   updated        → merge meta.status onto matching item in-place
 *   status_changed → same as updated
 *   deleted        → remove item from list by resourceId
 */

import { create } from 'zustand';
import type { SSEPayload, SSEEventType } from '@/hooks/useSSE';

// ─── Shared mutation logic ────────────────────────────────────────────────────

function applyMutation(
  items: any[],
  event: SSEPayload,
  eventType: SSEEventType,
): { items: any[]; pendingRefetch: boolean } {
  const id = event.resourceId;

  switch (eventType) {
    case 'created':
      return { items, pendingRefetch: true };

    case 'updated':
    case 'status_changed':
    case 'assigned':
    case 'completed': {
      if (!id) return { items, pendingRefetch: true };
      let changed = false;
      const updated = items.map((item: any) => {
        const itemId = (item._id ?? item.id)?.toString();
        if (itemId !== id) return item;
        changed = true;
        const patch: any = { _sseUpdatedAt: event.timestamp };
        if (event.meta?.status) patch.status = event.meta.status;
        return { ...item, ...patch };
      });
      return { items: updated, pendingRefetch: !changed };
    }

    case 'deleted': {
      if (!id) return { items, pendingRefetch: false };
      const filtered = items.filter((item: any) => {
        const itemId = (item._id ?? item.id)?.toString();
        return itemId !== id;
      });
      return { items: filtered, pendingRefetch: false };
    }

    default:
      return { items, pendingRefetch: true };
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────

export interface DomainStore {
  items: any[];
  pendingRefetch: boolean;
  setItems: (items: any[]) => void;
  clearRefetch: () => void;
  applySSEEvent: (event: SSEPayload) => void;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function createDomainStore() {
  return create<DomainStore>((set, get) => ({
    items: [],
    pendingRefetch: false,
    setItems: (items) => set({ items, pendingRefetch: false }),
    clearRefetch: () => set({ pendingRefetch: false }),
    applySSEEvent: (event) => {
      const result = applyMutation(get().items, event, event.type);
      set(result);
    },
  }));
}

// ─── Per-domain stores (one per SSE domain key) ───────────────────────────────

export const useAppointmentStore = createDomainStore();
export const usePatientStore     = createDomainStore();
export const useLabStore         = createDomainStore();
export const usePharmacyStore    = createDomainStore();
export const useBillingStore     = createDomainStore();
export const useEmergencyStore   = createDomainStore();
export const useAmbulanceStore   = createDomainStore();
export const useStaffStore       = createDomainStore();
export const useBedStore         = createDomainStore();
export const useInventoryStore   = createDomainStore();
export const useRadiologyStore   = createDomainStore();
export const useHRStore          = createDomainStore();
export const useHelpdeskStore    = createDomainStore();
export const useSystemStore      = createDomainStore();
