'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supportService } from '@/lib/integrations/services/support.service';
import { SupportTicket } from '@/lib/integrations/types/support';
import { toast } from 'react-hot-toast';
import {
    Search, Filter, Building2, User, AlertTriangle, Bug,
    MessageSquare, CheckCircle2, Clock, TrendingUp,
    ChevronDown, Eye, RefreshCw, Inbox, BadgeAlert, Zap,
    Building
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Status & Category Configs ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    'open': { label: 'Open', color: 'bg-rose-50 text-rose-600 border border-rose-200', dot: 'bg-rose-500' },
    'in-progress': { label: 'In Progress', color: 'bg-amber-50 text-amber-600 border border-amber-200', dot: 'bg-amber-500' },
    'resolved': { label: 'Resolved', color: 'bg-emerald-50 text-emerald-600 border border-emerald-200', dot: 'bg-emerald-500' },
    'closed': { label: 'Closed', color: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'bug': { label: 'Bug', color: 'bg-rose-50 text-rose-600 border border-rose-200', icon: <Bug size={11} /> },
    'complaint': { label: 'Complaint', color: 'bg-orange-50 text-orange-600 border border-orange-200', icon: <AlertTriangle size={11} /> },
    'feedback': { label: 'Feedback', color: 'bg-teal-50 text-teal-600 border border-teal-200', icon: <MessageSquare size={11} /> },
    'other': { label: 'Other', color: 'bg-slate-50 text-slate-500 border border-slate-200', icon: <Zap size={11} /> },
};

const ROLE_COLORS: Record<string, string> = {
    'doctor': 'bg-teal-500',
    'hospital-admin': 'bg-indigo-500',
    'helpdesk': 'bg-blue-500',
    'nurse': 'bg-pink-500',
    'lab': 'bg-violet-500',
    'pharma-owner': 'bg-cyan-500',
    'staff': 'bg-slate-500',
    'ambulance': 'bg-red-500',
    'patient': 'bg-green-500',
    'DISCHARGE': 'bg-orange-500',
    'emergency': 'bg-rose-600',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
        </div>
    );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type?: string }) {
    const key = (type || 'other').toLowerCase();
    const config = TYPE_CONFIG[key] || TYPE_CONFIG['other'];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['open'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}

// ─── Role Chip ────────────────────────────────────────────────────────────────
function RoleChip({ role }: { role?: string }) {
    const color = ROLE_COLORS[role || ''] || 'bg-slate-400';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-white ${color}`}>
            {role || 'N/A'}
        </span>
    );
}

// ─── Hospital Badge ───────────────────────────────────────────────────────────
function HospitalBadge({ hospital }: { hospital?: SupportTicket['hospital'] }) {
    if (!hospital?.name) return <span className="text-[10px] text-slate-400 italic">Unknown Hospital</span>;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            <Building size={11} className="shrink-0" />
            {hospital.name}
        </span>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN SUPPORT PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function AdminSupportPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [hospitalFilter, setHospitalFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadTickets(); }, []);

    const loadTickets = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await supportService.getAllTickets();
            setTickets(data);
        } catch {
            toast.error('Failed to load support tickets');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ─── Derived data ────────────────────────────────────────────────────────
    const hospitals = useMemo(() => {
        const map = new Map<string, string>();
        tickets.forEach(t => {
            if (t.hospital?._id) map.set(t.hospital._id, t.hospital.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [tickets]);

    const roles = useMemo(() => {
        const set = new Set<string>();
        tickets.forEach(t => { if (t.requester?.role || t.role) set.add(t.requester?.role || t.role || ''); });
        return Array.from(set);
    }, [tickets]);

    const stats = useMemo(() => ({
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        bugs: tickets.filter(t => (t.type || t.category || '').toLowerCase() === 'bug').length,
    }), [tickets]);

    const filtered = useMemo(() => {
        return tickets.filter(ticket => {
            if (statusFilter !== 'all') {
                if (statusFilter === 'active' && !['open', 'in-progress'].includes(ticket.status)) return false;
                if (statusFilter === 'resolved' && !['resolved', 'closed'].includes(ticket.status)) return false;
                if (!['active', 'resolved'].includes(statusFilter) && ticket.status !== statusFilter) return false;
            }
            if (typeFilter !== 'all') {
                const t = (ticket.type || ticket.category || '').toLowerCase();
                if (t !== typeFilter) return false;
            }
            if (hospitalFilter !== 'all') {
                if (ticket.hospital?._id !== hospitalFilter) return false;
            }
            if (roleFilter !== 'all') {
                const r = ticket.requester?.role || ticket.role || '';
                if (r !== roleFilter) return false;
            }
            if (search.trim()) {
                const q = search.toLowerCase();
                const hay = [
                    ticket.subject,
                    ticket.message,
                    ticket.requester?.name || ticket.name || '',
                    ticket.requester?.email || '',
                    ticket.hospital?.name || '',
                    ticket.requester?.role || ticket.role || '',
                ].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [tickets, statusFilter, typeFilter, hospitalFilter, roleFilter, search]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Support Centre...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:p-8 space-y-8 max-w-[1400px] mx-auto">

            {/* ─── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Support Centre</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Monitor and manage all hospital support requests across the platform</p>
                </div>
                <button
                    onClick={() => loadTickets(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ─── Stats ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Total Tickets" value={stats.total} icon={<Inbox size={20} />} color="bg-slate-700" />
                <StatCard label="Open" value={stats.open} icon={<BadgeAlert size={20} />} color="bg-rose-500" />
                <StatCard label="In Progress" value={stats.inProgress} icon={<Clock size={20} />} color="bg-amber-500" />
                <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 size={20} />} color="bg-emerald-500" />
                <StatCard label="Bug Reports" value={stats.bugs} icon={<Bug size={20} />} color="bg-violet-600" />
            </div>

            {/* ─── Filters ───────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by subject, user, hospital, email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-teal-500 transition-colors dark:text-white"
                        />
                    </div>

                    {/* Status filter */}
                    <FilterSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'active', label: 'Active (Open + In Progress)' },
                            { value: 'open', label: 'Open' },
                            { value: 'in-progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved / Closed' },
                        ]}
                        icon={<Filter size={14} />}
                    />

                    {/* Type filter */}
                    <FilterSelect
                        value={typeFilter}
                        onChange={setTypeFilter}
                        options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'bug', label: '🪲 Bug Reports' },
                            { value: 'complaint', label: '⚠️ Complaints' },
                            { value: 'feedback', label: '💬 Feedback' },
                            { value: 'other', label: 'Other' },
                        ]}
                        icon={<Bug size={14} />}
                    />

                    {/* Hospital filter */}
                    {hospitals.length > 0 && (
                        <FilterSelect
                            value={hospitalFilter}
                            onChange={setHospitalFilter}
                            options={[
                                { value: 'all', label: 'All Hospitals' },
                                ...hospitals.map(h => ({ value: h.id, label: h.name })),
                            ]}
                            icon={<Building2 size={14} />}
                        />
                    )}

                    {/* Role filter */}
                    {roles.length > 0 && (
                        <FilterSelect
                            value={roleFilter}
                            onChange={setRoleFilter}
                            options={[
                                { value: 'all', label: 'All Roles' },
                                ...roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
                            ]}
                            icon={<User size={14} />}
                        />
                    )}
                </div>

                {/* Result count */}
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">
                    Showing {filtered.length} of {tickets.length} tickets
                    {search && ` • "${search}"`}
                </p>
            </div>

            {/* ─── Ticket Table ──────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700">
                    <Inbox size={36} className="text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-400">No tickets match your filters</p>
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setHospitalFilter('all'); setRoleFilter('all'); }}
                        className="mt-3 text-xs text-teal-600 font-bold hover:underline">Clear all filters</button>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-gray-800/60 border-b border-slate-100 dark:border-gray-700 text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                                    <th className="py-4 px-5">Hospital</th>
                                    <th className="py-4 px-5">Requester</th>
                                    <th className="py-4 px-5">Issue</th>
                                    <th className="py-4 px-5">Type</th>
                                    <th className="py-4 px-5">Status</th>
                                    <th className="py-4 px-5">Received</th>
                                    <th className="py-4 px-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {filtered.map(ticket => (
                                    <tr key={ticket._id} className="group hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors">
                                        {/* Hospital */}
                                        <td className="px-5 py-4 min-w-[160px]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <Building size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                                                        {ticket.hospital?.name || 'Unknown'}
                                                    </p>
                                                    {ticket.hospital?.hospitalId && (
                                                        <p className="text-[9px] text-slate-400 font-mono">{ticket.hospital.hospitalId}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Requester */}
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                    {ticket.requester?.name || ticket.name || 'Unknown'}
                                                </span>
                                                <span className="text-[9px] text-slate-400">{ticket.requester?.email || '—'}</span>
                                                <RoleChip role={ticket.requester?.role || ticket.role} />
                                            </div>
                                        </td>

                                        {/* Issue */}
                                        <td className="px-5 py-4 max-w-xs">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</p>
                                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ticket.message}</p>
                                            {ticket.replies?.length > 0 && (
                                                <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-teal-600 font-bold">
                                                    <MessageSquare size={10} /> {ticket.replies.length} repl{ticket.replies.length === 1 ? 'y' : 'ies'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Type */}
                                        <td className="px-5 py-4">
                                            <TypeBadge type={ticket.type || ticket.category} />
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <StatusBadge status={ticket.status} />
                                        </td>

                                        {/* Received */}
                                        <td className="px-5 py-4">
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy') : '—'}
                                            </span>
                                            <br />
                                            <span className="text-[9px] text-slate-400">
                                                {ticket.createdAt ? format(new Date(ticket.createdAt), 'hh:mm a') : ''}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => router.push(`/admin/support/${ticket._id}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <Eye size={12} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {filtered.map(ticket => (
                            <div key={ticket._id}
                                className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm"
                                onClick={() => router.push(`/admin/support/${ticket._id}`)}
                            >
                                {/* Hospital strip */}
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-50 dark:border-gray-800">
                                    <Building size={13} className="text-indigo-500" />
                                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                        {ticket.hospital?.name || 'Unknown Hospital'}
                                    </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            <StatusBadge status={ticket.status} />
                                            <TypeBadge type={ticket.type || ticket.category} />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</h3>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{ticket.message}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-gray-800">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                            {ticket.requester?.name || ticket.name || '—'}
                                        </span>
                                        <RoleChip role={ticket.requester?.role || ticket.role} />
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, hh:mm a') : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Filter Select 
function FilterSelect({ value, onChange, options, icon }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    icon: React.ReactNode;
}) {
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer transition-colors"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
    );
}

export default React.memo(AdminSupportPage);
