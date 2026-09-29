'use client';

import { ReactNode } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';
import GeofenceGuard from '@/components/auth/GeofenceGuard';

/**
 * [hospitalId] Tenant Layout
 * 
 * This layout wraps all tenant-specific portal routes.
 * It uses useTenantContext to ensure the activeHospitalId is synced
 * to localStorage for the apiClient to pick up.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  // ✅ SYNC: This hook ensures hospitalId from URL is synced to localStorage
  useTenantContext();
  
  return (
    <GeofenceGuard>
      {children}
    </GeofenceGuard>
  );
}
