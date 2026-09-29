'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TicketDetailView from '@/components/support/TicketDetailView';

function HA_TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = React.use(params);

    return (
        <div className="p-1 sm:p-2 md:p-3 max-w-5xl mx-auto">
            {/* Wrapper to maintain some sci-fi spacing/feel if needed, or just standard view */}
            <div className="bg-transparent">
                <TicketDetailView
                    ticketId={resolvedParams.id}
                    isAdmin
                    onBack={() => router.back()}
                />
            </div>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HA_TicketDetailPage);
