'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CreateTicketForm from '@/components/support/CreateTicketForm';
import { ArrowLeft, LifeBuoy } from 'lucide-react';
import { useTenantLink } from '@/hooks/useTenantLink';

function HA_CreateTicketPage() {
    const router = useRouter();
    const { getPath } = useTenantLink();

    return (
        <div className="p-1 sm:p-2 md:p-3 space-y-6 md:space-y-10 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 md:gap-6">
                <button onClick={() => router.back()} className="p-2 md:p-3 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 group">
                    <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300 group-hover:-translate-x-1" />
                </button>
                <div>
                    <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase">Initialize Ticket</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                        <LifeBuoy className="w-3 h-3 text-blue-500" />
                        Submit Diagnostic Report
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-blue-600 h-2 w-full"></div>
                <div className="p-6 md:p-10 lg:p-16">
                    <CreateTicketForm basePath="/hospital-admin/support" />
                </div>
            </div>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HA_CreateTicketPage);
