'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';
import { useTenantLink } from '@/hooks/useTenantLink';

const DoctorSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();

    const handleClick = () => {
        const supportPath = getPath('/doctor/support');
        const doctorPath = getPath('/doctor');

        if (pathname === supportPath) {
            router.push(doctorPath);
        } else {
            router.push(supportPath);
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default DoctorSupportFloatingBox;
