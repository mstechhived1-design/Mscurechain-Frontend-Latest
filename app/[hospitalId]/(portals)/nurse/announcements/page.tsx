'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Megaphone, Search, ChevronLeft, ChevronRight, Clock, Filter, Info } from 'lucide-react';
import { notificationService } from '@/lib/integrations';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const announcementsPerPage = 10;

    const loadAnnouncements = async () => {
        try {
            // Only show primary loader on first fetch
            if (announcements.length === 0) setLoading(true);
            const data = await notificationService.getAnnouncements();
            setAnnouncements(data.announcements || []);
        } catch (error: any) {
            console.error("Failed to load announcements", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
        // Enable real-time updates via polling (every 30 seconds)
        const interval = setInterval(loadAnnouncements, 30000);
        return () => clearInterval(interval);
    }, []);

    // Filtered announcements
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(ann => {
            const matchesSearch = (ann.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (ann.content?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesPriority = filterPriority === 'all' || ann.priority === filterPriority;

            // Frontend Filter: Only show if 'all' or 'nurse' is in targetRoles
            const matchesRole = !ann.targetRoles ||
                ann.targetRoles.includes('all') ||
                ann.targetRoles.includes('nurse');

            return matchesSearch && matchesPriority && matchesRole;
        });
    }, [announcements, searchQuery, filterPriority]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAnnouncements.length / announcementsPerPage);
    const paginatedAnnouncements = filteredAnnouncements.slice(
        (currentPage - 1) * announcementsPerPage,
        currentPage * announcementsPerPage
    );

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Broadcasts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-[0.5rem] p-4 sm:p-6 bg-white border border-slate-100 shadow-sm">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-theme rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3 shrink-0">
                            <Megaphone size={16} className="sm:size-[20px] text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2 uppercase">Announcements</h1>
                            <p className="text-slate-400 text-[7px] sm:text-xs font-bold uppercase tracking-widest mt-1">Hospital-wide broadcasts.</p>
                        </div>
                    </div>

                    {/* SEARCH & FILTER BAR */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto p-1 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="relative group flex-1 sm:min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-theme transition-colors sm:size-[14px]" size={12} />
                            <input
                                placeholder="Search broadcasts..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-1.5 bg-transparent border-none text-[9px] sm:text-[10px] font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                            />
                        </div>
                        <div className="w-full sm:w-px h-px sm:h-6 bg-slate-200 self-center"></div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none sm:size-[12px]" size={10} />
                            <select
                                value={filterPriority}
                                onChange={(e) => {
                                    setFilterPriority(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full sm:w-auto pl-8 pr-8 py-1.5 bg-transparent border-none text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer appearance-none min-w-[100px]"
                            >
                                <option value="all">Priority: All</option>
                                <option value="high">High Only</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN FEED - TABLE FORMAT */}
            <div className="flex flex-col gap-6">
                <div className="overflow-hidden bg-white rounded-xl sm:rounded-[0.5rem] border border-slate-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-4 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Metadata</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Message Content</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Priority</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Posted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedAnnouncements.length > 0 ? (
                                    paginatedAnnouncements.map((ann) => (
                                        <tr key={ann._id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-black text-emerald-600 border border-emerald-100">
                                                        {ann.author?.name?.[0] || 'A'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 leading-none mb-1">
                                                            {format(new Date(ann.createdAt), 'MMM dd, yyyy')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {ann.author?.name || 'Admin'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p
                                                    className="text-xs font-black text-slate-900 truncate group-hover:text-emerald-600 transition-colors cursor-help"
                                                    title={ann.title}
                                                >
                                                    {ann.title}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 max-w-[300px]">
                                                <p
                                                    className="text-xs font-medium text-slate-500 line-clamp-1 group-hover:text-slate-700 transition-colors cursor-help italic"
                                                    title={ann.content}
                                                >
                                                    "{ann.content}"
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${ann.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    ann.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {ann.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    <Clock size={10} className="text-slate-400" />
                                                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Info size={32} className="text-slate-200" />
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching broadcasts</h3>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* TABLE PAGINATION FOOTER */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-emerald-600">{(currentPage - 1) * announcementsPerPage + 1}</span> to <span className="text-emerald-600">{Math.min(currentPage * announcementsPerPage, filteredAnnouncements.length)}</span> of {filteredAnnouncements.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-1">
                                {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                                            ? 'bg-primary-theme text-white shadow-lg shadow-slate-900/20'
                                            : 'bg-white text-slate-400 hover:text-emerald-600 border border-slate-200'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                )) : (
                                    <button
                                        disabled
                                        className="w-8 h-8 rounded-lg text-[10px] font-black bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                    >
                                        1
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
