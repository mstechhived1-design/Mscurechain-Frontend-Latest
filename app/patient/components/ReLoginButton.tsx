'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import LogoutModal from '@/components/auth/LogoutModal';
import { useState } from 'react';
import { ArrowRight, LogOut } from 'lucide-react';

export default function ReLoginButton() {
    const { logout } = useAuthStore();
    const router = useRouter();

    const handleReLogin = async () => {
        await logout();
        router.push('/auth/login');
    };

    return (
        <button
            onClick={handleReLogin}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 group"
        >
            <LogOut size={16} />
            Terminate & Re-login
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
    );
}
