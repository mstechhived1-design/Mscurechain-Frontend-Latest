'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Lab Root Redirect
 * Redirects /[hospitalId]/lab to /[hospitalId]/lab/dashboard
 */
export default function LabRootPage() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;

    useEffect(() => {
        if (hospitalId) {
            router.replace(`/${hospitalId}/lab/dashboard`);
        } else {
            router.replace('/lab/dashboard');
        }
    }, [router, hospitalId]);

    return null;
}
