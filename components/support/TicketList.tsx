import React, { useState, useMemo } from 'react';
import { SupportTicket } from '@/lib/integrations/types/support';
import { Eye, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';

interface TicketListProps {
    tickets: SupportTicket[];
    isAdmin?: boolean;
    onView: (id: string) => void;
    loading?: boolean;
}

function TicketList({ tickets, isAdmin, onView, loading }: TicketListProps) {
    const [activeTab, setActiveTab] = useState('Unresolved');
    const [search, setSearch] = useState('');

    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(ticket => {
            if (activeTab === 'Resolved' && !['resolved', 'closed'].includes(ticket.status)) return false;
            const ticketType = (ticket.type || ticket.category || '').toLowerCase();

            if (activeTab === 'Unresolved' && (['resolved', 'closed'].includes(ticket.status) || ticketType === 'feedback')) return false;
            if (activeTab === 'Feedback' && ticketType !== 'feedback') return false;

            if (search.trim() === '') return true;
            const searchLower = search.toLowerCase();
            return (
                ticket.subject.toLowerCase().includes(searchLower) ||
                ticket.message.toLowerCase().includes(searchLower) ||
                (ticket.requester?.name || ticket.name || '').toLowerCase().includes(searchLower)
            );
        });
    }, [tickets, activeTab, search]);

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Support Stream...</p>
                </div>
            </div>
        );
    }

    const tabs = ['Unresolved', 'Resolved', 'Feedback'];

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white dark:bg-[#0a0a0a] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex p-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab
                                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72 px-1 md:px-0">
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                    />
                </div>
            </div>

            {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 sm:p-24 bg-gray-50/50 dark:bg-gray-900/10 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 text-center">
                    <div className="p-5 bg-white dark:bg-gray-900 rounded-3xl shadow-sm mb-4">
                        <User size={32} className="text-gray-200" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">No Assistance Tickets Synchronized</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                                    {isAdmin && (
                                        <>
                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                        </>
                                    )}
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Category</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Updated</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket._id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                                        {isAdmin && (
                                            <>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                                                            {ticket.requester?.name || ticket.name || 'Unknown'}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                            {ticket.requester?.email || 'No Email'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-900 text-gray-500 border border-gray-100 dark:border-gray-800`}>
                                                        {ticket.requester?.role || ticket.role || 'N/A'}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="py-5 px-6">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">{ticket.subject}</p>
                                            <p className="text-[11px] text-gray-400 font-medium truncate max-w-[250px] mt-0.5 italic">"{ticket.message}"</p>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <CategoryBadge category={ticket.type || ticket.category} />
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <StatusBadge status={ticket.status} />
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                    {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd, yy') : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <button
                                                onClick={() => onView(ticket._id)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <Eye size={14} /> Open
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden grid grid-cols-1 gap-3">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket._id} className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 transition-transform active:scale-[0.98]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <StatusBadge status={ticket.status} />
                                            <CategoryBadge category={ticket.type || ticket.category} />
                                        </div>
                                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight mb-1 truncate">{ticket.subject}</h3>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 font-medium italic opacity-80 leading-relaxed">"{ticket.message}"</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        <Calendar size={12} className="text-blue-500/50" />
                                        {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd') : 'N/A'}
                                    </div>
                                    <button
                                        onClick={() => onView(ticket._id)}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        <Eye size={14} /> Open
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function CategoryBadge({ category }: { category: string }) {
    const normalize = (str: string) => str?.toLowerCase().trim() || '';
    let style = 'bg-slate-50 text-slate-400 border border-slate-100';

    if (normalize(category) === 'complaint') style = 'bg-rose-50 text-rose-600 border border-rose-100';
    else if (normalize(category) === 'bug') style = 'bg-rose-50 text-rose-600 border border-rose-100';
    else if (normalize(category) === 'feedback') style = 'bg-teal-50 text-teal-600 border border-teal-100';
    else if (normalize(category) === 'inquiry') style = 'bg-slate-50 text-slate-600 border border-slate-200';

    return (
        <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${style}`}>
            {category || 'Node'}
        </span>
    );
}

export default React.memo(TicketList);
