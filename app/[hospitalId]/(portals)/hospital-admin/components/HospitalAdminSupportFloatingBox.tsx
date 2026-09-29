'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';
import { useTenantLink } from '@/hooks/useTenantLink';

const HospitalAdminSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    const handleClick = () => {
        const supportPath = getPath('/hospital-admin/support');
        const dashboardPath = getPath('/hospital-admin');

        if (pathname === supportPath) {
            router.push(dashboardPath);
        } else {
            router.push(supportPath);
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default HospitalAdminSupportFloatingBox;
