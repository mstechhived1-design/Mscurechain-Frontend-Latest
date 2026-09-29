'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TicketDetailView from '@/components/support/TicketDetailView';

function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = React.use(params);

    return (
        <div className="max-w-7xl mx-auto">
            <TicketDetailView
                ticketId={resolvedParams.id}
                isAdmin
                onBack={() => router.back()}
            />
        </div>
    );
}

export default React.memo(AdminTicketDetailPage);
