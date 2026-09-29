'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const AmbulanceSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;

    const handleClick = () => {
        if (pathname === '/ambulance/support') {
            router.push('/ambulance');
        } else {
            router.push('/ambulance/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default AmbulanceSupportFloatingBox;
