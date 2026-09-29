'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SupportFloatingButton from '@/components/common/SupportFloatingButton';

const AdminSupportFloatingBox = () => {
    const router = useRouter();
    const pathname = usePathname() as string;

    const handleClick = () => {
        if (pathname === '/admin/support') {
            router.push('/admin');
        } else {
            router.push('/admin/support');
        }
    };

    return <SupportFloatingButton onClick={handleClick} />;
};

export default AdminSupportFloatingBox;
