'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CreateTicketForm from '@/components/support/CreateTicketForm';
import { ArrowLeft } from 'lucide-react';

function DoctorCreateTicketPage() {
    const router = useRouter();

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Support Ticket</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                <CreateTicketForm basePath="/nurse/support" />
            </div>
        </div>
    );
}

export default React.memo(DoctorCreateTicketPage);
