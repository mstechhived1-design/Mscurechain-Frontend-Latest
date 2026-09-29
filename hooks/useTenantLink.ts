"use client";

import { useParams } from "next/navigation";

/**
 * useTenantLink
 *
 * Generates tenant-aware paths by prepending the current hospitalId from the URL.
 *
 * Usage:
 *   const { getPath, hospitalId } = useTenantLink();
 *   <Link href={getPath('/doctor/patients')}>Patients</Link>
 *   // → /abc123.../doctor/patients
 *
 * If not in a tenant route (e.g., /admin), returns the path as-is.
 */
export function useTenantLink() {
  const params = useParams();
  const hospitalId = (params?.hospitalId as string) || null;

  /**
   * Get a tenant-prefixed path.
   * @param internalPath - The path relative to the portal root (e.g., '/doctor/patients')
   * @returns The full path with hospitalId prefix if available
   */
  const getPath = (internalPath: string): string => {
    const cleanPath = internalPath.startsWith("/")
      ? internalPath
      : `/${internalPath}`;

    // ✅ GLOBAL ROUTES: NEVER prefix these with hospitalId
    const globalRoots = [
      "/ambulance",
      "/patient",
      "/emergency",
      "/auth",
      "/portals",
      "/admin",
      "/super-admin",
      "/nurse/login",
      "/doctor/login",
      "/staff/login",
      "/hospital-admin/login",
      "/hr/login",
      "/pharmacy/login",
      "/lab/login",
    ];
    if (globalRoots.some(root => cleanPath === root || cleanPath.startsWith(`${root}/`))) {
      return cleanPath;
    }

    if (hospitalId) {
      // ✅ PREVENT DOUBLE PREFIXING
      // If the path already starts with /hospitalId/ or is exactly /hospitalId, return as-is.
      if (cleanPath === `/${hospitalId}` || cleanPath.startsWith(`/${hospitalId}/`)) {
        return cleanPath;
      }
      return `/${hospitalId}${cleanPath}`;
    }

    // Fallback: try localStorage (only if NOT a global route)
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("activeHospitalId");
      if (storedId) {
        return `/${storedId}${cleanPath}`;
      }
    }

    // No hospitalId — return path as-is (legacy mode)
    return cleanPath;
  };

  return { getPath, hospitalId };
}
