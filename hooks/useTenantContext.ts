"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

/**
 * useTenantContext
 *
 * Extracts the hospitalId from the URL params (for tenant-prefixed routes like /[hospitalId]/doctor).
 * Syncs the hospitalId to localStorage so the apiClient can pick it up.
 *
 * Usage:
 *   const { hospitalId, isTenantRoute } = useTenantContext();
 */
export function useTenantContext() {
  const params = useParams();

  // The hospitalId comes from the [hospitalId] dynamic segment
  const hospitalId = (params?.hospitalId as string) || null;

  // Sync to localStorage for apiClient to pick up
  useEffect(() => {
    if (hospitalId && typeof window !== "undefined") {
      localStorage.setItem("activeHospitalId", hospitalId);
    }
  }, [hospitalId]);

  return {
    hospitalId,
    isTenantRoute: !!hospitalId,
  };
}
