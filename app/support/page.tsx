'use client';

import React from 'react';
import SelectionChat from '@/components/chat/SelectionChat';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

function SupportPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Navigation */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm uppercase tracking-widest"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Go Back
                </button>

                {/* Hero Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                        Support Center
                    </h1>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                        Get instant answers to your questions through our automated support assistant.
                        Simply select an option below to begin.
                    </p>
                </div>

                {/* Chat Component */}
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                    <div className="relative z-10">
                        <SelectionChat />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="text-center pt-8 border-t border-slate-200">
                    <p className="text-slate-400 text-sm font-medium">
                        Need more help? Contact us at <span className="text-blue-600 font-bold">support@curechain.health</span>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default React.memo(SupportPage);
