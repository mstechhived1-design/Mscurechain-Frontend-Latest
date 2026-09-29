"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HospitalAdminHospital() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hospital-admin/hospital/details');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
