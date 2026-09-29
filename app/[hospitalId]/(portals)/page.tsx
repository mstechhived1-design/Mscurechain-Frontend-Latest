'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTenantLink } from '@/hooks/useTenantLink';

/**
 * Tenant-Aware Portal Home Redirect
 *
 * This page handles routes like /{hospitalId}/
 * It:
 * 1. Extracts the hospitalId from the URL
 * 2. Stores it in localStorage for the apiClient
 * 3. Redirects the user to their respective portal (doctor, nurse, etc.)
 */
export default function TenantPortalRedirect() {
  const params = useParams() as any;
  const router = useRouter();
  const hospitalId = params?.hospitalId as string;
  const { getPath } = useTenantLink();

  useEffect(() => {
    if (hospitalId && typeof window !== 'undefined') {
      // Store hospitalId for apiClient
      localStorage.setItem('activeHospitalId', hospitalId);
    }
  }, [hospitalId]);

  useEffect(() => {
    // 🚀 Instant redirect using cookie role — no need to wait for auth store init
    const cookieMatch = document.cookie.match(/userRole=([^;]*)/);
    const cookieRole = cookieMatch ? cookieMatch[1] : null;

    if (cookieRole) {
      const portalMap: Record<string, string> = {
        'doctor': '/doctor',
        'hospital-admin': '/hospital-admin',
        'helpdesk': '/helpdesk',
        'nurse': '/nurse',
        'lab': '/lab/dashboard',
        'pharmacy': '/pharmacy/dashboard',
        'patient': '/patient',
        'staff': '/staff',
        'hr': '/hr',
      };

      const targetPath = portalMap[cookieRole] || '/auth/login';
      router.replace(getPath(targetPath));
    } else {
      router.replace('/auth/login');
    }
  }, [router, getPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Initializing Tenant Context...
        </p>
      </div>
    </div>
  );
}
