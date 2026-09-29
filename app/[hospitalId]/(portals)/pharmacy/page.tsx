'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Pharmacy Root Redirect
 * Redirects /[hospitalId]/pharmacy to /[hospitalId]/pharmacy/dashboard
 */
export default function PharmacyRootPage() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;

    useEffect(() => {
        if (hospitalId) {
            router.replace(`/${hospitalId}/pharmacy/dashboard`);
        } else {
            router.replace('/pharmacy/dashboard');
        }
    }, [router, hospitalId]);

    return null;
}
