'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const PatientSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;

    const handleClick = () => {
        // Patient portal routes to top-level support
        if (pathname === '/support') {
            router.push('/patient');
        } else {
            router.push('/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default PatientSupportFloatingBox;
