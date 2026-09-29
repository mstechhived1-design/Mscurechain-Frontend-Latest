'use client';

import React from 'react';
import DischargeHistory from '@/app/[hospitalId]/(portals)/discharge/components/DischargeHistory';

export default function NurseDischargeHistoryPage() {
    return (
        <div>
            <DischargeHistory basePath="/nurse/discharge" />
        </div>
    );
}
