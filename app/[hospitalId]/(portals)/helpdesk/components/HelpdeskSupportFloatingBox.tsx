'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const HelpdeskSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;

    const handleClick = () => {
        if (pathname === '/helpdesk/support') {
            router.push('/helpdesk');
        } else {
            router.push('/helpdesk/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default HelpdeskSupportFloatingBox;
