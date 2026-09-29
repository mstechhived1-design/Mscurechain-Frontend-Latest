'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const StaffSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;

    const handleClick = () => {
        if (pathname === '/staff/support') {
            router.push('/staff');
        } else {
            router.push('/staff/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default StaffSupportFloatingBox;
