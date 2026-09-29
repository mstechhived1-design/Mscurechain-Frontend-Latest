'use client';

import React from 'react';
import DischargeHistory from '@/app/[hospitalId]/(portals)/discharge/components/DischargeHistory';
import { useTenantLink } from '@/hooks/useTenantLink';

export default function HospitalAdminDischargeHistoryPage() {
    const { getPath } = useTenantLink();
    return (
        <div className="">
            <DischargeHistory basePath={getPath("/hospital-admin/dashboard")} />
        </div>
    );
}
