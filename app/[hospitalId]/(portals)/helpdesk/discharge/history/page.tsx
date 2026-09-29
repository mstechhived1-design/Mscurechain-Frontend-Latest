'use client';

import React from 'react';
import DischargeHistory from '@/app/[hospitalId]/(portals)/discharge/components/DischargeHistory';

export default function HelpdeskDischargeHistoryPage() {
    return (
        <div className="px-0 lg:px-2">
            <DischargeHistory basePath="/helpdesk/discharge" />
        </div>
    );
}
