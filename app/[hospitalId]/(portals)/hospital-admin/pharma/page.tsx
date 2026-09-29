"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

function HospitalAdminPharma() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hospital-admin/pharma/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="opacity-50 flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full dark:bg-blue-900/30"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Routing to Pharma Hub...</p>
      </div>
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminPharma);
