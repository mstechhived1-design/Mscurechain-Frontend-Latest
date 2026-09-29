'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';
import { useTenantLink } from '@/hooks/useTenantLink';

const NurseSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    const handleClick = () => {
        const supportPath = getPath('/nurse/support');
        const nursePath = getPath('/nurse');

        if (pathname === supportPath) {
            router.push(nursePath);
        } else {
            router.push(supportPath);
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default NurseSupportFloatingBox;
