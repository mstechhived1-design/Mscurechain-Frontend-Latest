'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TicketDetailView from '@/components/support/TicketDetailView';

interface Props {
    params: Promise<{ id: string }>;
}

export default function UserSupportDetailPage({ params }: Props) {
    const router = useRouter();
    const resolvedParams = React.use(params);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <TicketDetailView
                ticketId={resolvedParams.id} // Updated to satisfy type
                isAdmin={false}
                onBack={() => router.back()}
            />
        </div>
    );
}
