'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function HospitalAdminLabsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/hospital-admin/labs/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest opacity-50">Initialising Lab Suite...</p>
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminLabsPage);
