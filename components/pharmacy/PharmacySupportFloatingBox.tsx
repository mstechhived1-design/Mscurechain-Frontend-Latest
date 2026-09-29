'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';
import { useTenantLink } from '@/hooks/useTenantLink';

const PharmacySupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    const handleClick = () => {
        const supportPath = getPath('/pharmacy/support');
        const dashboardPath = getPath('/pharmacy/dashboard');

        if (pathname === supportPath) {
            router.push(dashboardPath);
        } else {
            router.push(supportPath);
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default PharmacySupportFloatingBox;
