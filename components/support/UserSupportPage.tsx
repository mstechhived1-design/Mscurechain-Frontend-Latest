'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supportService } from '@/lib/integrations/services/support.service';
import { SupportTicket } from '@/lib/integrations/types/support';
import TicketList from '@/components/support/TicketList';
import CreateTicketModal from '@/components/support/CreateTicketModal';
import { Plus, LifeBuoy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';

interface UserSupportPageProps {
    basePath?: string;
    title?: string;
}

export default function UserSupportPage({ basePath, title }: UserSupportPageProps) {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const effectiveBasePath = basePath || pathname;
    const effectiveTitle = title || "Support Center";
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            const data = await supportService.getMyTickets();
            setTickets(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);


    // Called by the modal after a ticket is successfully created
    const handleTicketCreated = useCallback(async () => {
        setIsCreateModalOpen(false);
        // Reload the ticket list immediately
        await loadTickets();
        // Also bust Next.js route cache so navigating away and back still shows fresh data
        router.refresh();
    }, [loadTickets, router]);

    return (
        <div className="max-w-7xl mx-auto space-y-3 pb-24 pt-2 sm:pt-4 px-1 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-1">
                    <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                        <LifeBuoy size={20} className="text-blue-600" /> {effectiveTitle}
                    </h1>
                    <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-widest opacity-70">Raise tickets and track their status directly from here.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                >
                    <Plus size={16} /> New Ticket
                </button>
            </div>

            <TicketList
                tickets={tickets}
                isAdmin={false}
                loading={loading}
                onView={(id) => router.push(getPath(`${effectiveBasePath}/${id}`))}
            />

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleTicketCreated}
                basePath={effectiveBasePath}
            />
        </div>
    );
}

