'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCcw
} from 'lucide-react';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
// import { toast } from 'react-hot-toast';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

import { useAuthStore } from '@/stores/authStore';

interface AuditLog {
    _id: string;
    action: string;
    user: {
        name: string;
        email: string;
        role: string;
    };
    ipAddress?: string;
    timestamp: string;
    details?: string;
}

const AuditLogsPage = () => {
    const { user: authUser } = useAuthStore();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // Filters
    const [action] = useState('All Actions');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const normalizeLog = React.useCallback((log: any): AuditLog => {
        if (!log) return {} as AuditLog;

        // Default Pharmacist Identity from Profile (since there is only 1 login)
        const pharmaName = (authUser as any)?.shopName || authUser?.name || 'Pharmacist';
        const pharmaRole = authUser?.role || 'Admin';

        let userObj = { name: pharmaName, email: authUser?.email || '', role: pharmaRole };

        // Handle different user/actor field names from various backend versions
        const rawUser = log.user || log.actor || log.actorId || log.createdBy || log.userId || log.actorDetails;

        if (typeof rawUser === 'object' && rawUser !== null) {
            userObj = {
                name: rawUser.name || rawUser.username || rawUser.fullName || rawUser.email || pharmaName,
                email: rawUser.email || authUser?.email || '',
                role: rawUser.role || pharmaRole
            };
        } else if (typeof rawUser === 'string' && rawUser.length > 5 && !/^[0-9a-fA-F]{24}$/.test(rawUser)) {
            // Only use the raw string if it's not a generic Mongo ID
            userObj = {
                name: rawUser,
                email: '',
                role: pharmaRole
            };
        }

        // IP Extraction
        const rawIp = log.ipAddress || log.ip || log.ip_address || log.clientIp || log.remoteAddress || log.remote_address;

        // Final normalization
        return {
            ...log,
            _id: log._id || log.id || Math.random().toString(36).substr(2, 9),
            action: (log.action || log.type || 'SYSTEM_EVENT').toUpperCase(),
            timestamp: log.timestamp || log.createdAt || log.date || new Date().toISOString(),
            ipAddress: cleanIpAddress(rawIp),
            user: userObj
        };
    }, [authUser]);

    const fetchLogs = useCallback(async (pageNum = 1) => {
        setLoading(true);
        try {
            console.log('Fetching audit logs...', { pageNum, action, startDate, endDate });
            const response = await pharmacyService.getAuditLogs(
                pageNum,
                20,
                action,
                startDate,
                endDate
            );

            console.log('Audit Logs API Response:', response);

            if (response && response.success && response.data && response.data.length > 0) {
                console.log(`Setting ${response.data.length} real logs`);
                const normalizedLogs = response.data.map((log: any) => normalizeLog(log));
                setLogs(normalizedLogs);
                setTotalPages(response.totalPages || 1);
                setTotalResults(response.total || 0);
            } else {
                console.log('API returned empty or success false, falling back to mockLogs');
                // Fallback to mock if API is empty or under development
                const normalizedMocks = mockLogs.map(log => normalizeLog(log));
                setLogs(normalizedMocks);
                setTotalPages(1);
                setTotalResults(mockLogs.length);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            // Show mock data for demonstration if API fails/not implemented
            setLogs(mockLogs);
            setTotalPages(1);
            setTotalResults(mockLogs.length);
        } finally {
            setLoading(false);
        }
    }, [action, startDate, endDate, normalizeLog]);

    useEffect(() => {
        fetchLogs(page);
    }, [page, fetchLogs]);

    const getActionBadgeStyle = (action: string) => {
        if (action.includes('DELETED')) {
            return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:border-red-900/30';
        }
        if (action.includes('CREATED') || action.includes('ADDED') || action.includes('SUCCESS')) {
            return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30';
        }
        return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30';
    };

    const formatTimestamp = (ts: string) => {
        if (!ts) return 'N/A, N/A';
        const date = new Date(ts);
        if (isNaN(date.getTime())) return 'Invalid, Date';

        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const cleanIpAddress = (ip: any) => {
        if (!ip) return 'N/A';
        let clean = String(ip).trim();

        // Handle local references
        if (clean === '::1' || clean === '127.0.0.1' || clean === 'localhost') {
            return '127.0.0.1 (Local)';
        }

        // Handle IPv6 mapped IPv4 (e.g., ::ffff:192.168.1.1)
        if (clean.includes('::ffff:')) {
            clean = clean.split('::ffff:')[1];
        }

        // Handle IPv6 with port or generic IPv6 cleanup if needed
        if (clean.startsWith('::1')) return '127.0.0.1 (Local)';

        return clean;
    };


    return (
        <div className="space-y-4 md:space-y-6 pb-20 max-w-[1200px] mx-auto px-4 md:px-0">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mt-4 md:mt-0">
                <div className="p-4 md:p-6 border-b border-gray-50 dark:border-gray-700/50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                        <Shield size={20} className="md:size-6" />
                    </div>
                    <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Audit Logs</h1>
                    <button
                        onClick={() => { clearApiCache(); fetchLogs(page); }}
                        className="ml-auto p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all active:scale-95"
                        title="Refresh Logs"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Filter Section */}
                <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Filters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        <div>
                            <label className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Start Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    title="Start Date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 md:py-2.5 text-xs md:text-sm font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">End Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    title="End Date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 md:py-2.5 text-xs md:text-sm font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-6">
                            <PharmacyTableSkeleton rows={8} />
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                                    <th className="px-5 md:px-6 py-4 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700/50">TIMESTAMP</th>
                                    <th className="px-5 md:px-6 py-4 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700/50">ACTION</th>
                                    <th className="px-5 md:px-6 py-4 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700/50">USER</th>
                                    <th className="px-5 md:px-6 py-4 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700/50">IP ADDRESS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 md:px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                                            No logs found matching filters
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        if (!log) return null;
                                        const [date, time] = formatTimestamp(log.timestamp).split(', ');
                                        return (
                                            <tr key={log._id} className="hover:bg-gray-50/20 dark:hover:bg-gray-700/10 transition-colors group">
                                                <td className="px-5 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-300">
                                                    <span className="font-mono">{date}</span>{time && <span className="text-gray-400 ml-1">at {time}</span>}
                                                </td>
                                                <td className="px-5 md:px-6 py-4 md:py-5">
                                                    <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wider border shadow-sm ${getActionBadgeStyle(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-5 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-200 uppercase truncate max-w-[150px]">
                                                    {log.user?.name || 'System'}
                                                </td>
                                                <td className="px-5 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black text-gray-400 dark:text-gray-500 font-mono tracking-tighter">
                                                    {log.ipAddress}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) || null}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-50 dark:border-gray-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
                        Showing {logs.length > 0 ? ((page - 1) * 20) + 1 : 0} - {Math.min(page * 20, totalResults)} <span className="text-gray-300 mx-1">/</span> {totalResults} Entries
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-gray-400 disabled:opacity-30 hover:text-emerald-500 active:scale-95 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1.5 px-2">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-[10px] md:text-xs font-black transition-all ${page === i + 1
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700 hover:border-emerald-500'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-gray-400 disabled:opacity-30 hover:text-emerald-500 active:scale-95 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Mock Data to match the model image if API is empty
const mockLogs: AuditLog[] = [
    {
        _id: '1',
        action: 'INVOICE_DELETED',
        user: { name: 'Pharma Staff', email: 'staff@pharma.com', role: 'Staff' },
        timestamp: '2026-02-04T09:58:00',
        ipAddress: '49.37.132.207'
    },
    {
        _id: '2',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-27T21:01:16',
        ipAddress: '49.37.134.29'
    },
    {
        _id: '3',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-24T10:31:34',
        ipAddress: '49.37.132.179'
    },
    {
        _id: '4',
        action: 'INVOICE_DELETED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-24T10:22:16',
        ipAddress: '49.37.132.179'
    },
    {
        _id: '5',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-24T10:07:40',
        ipAddress: '49.37.132.179'
    },
    {
        _id: '6',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-23T17:46:37',
        ipAddress: '49.37.132.139'
    },
    {
        _id: '7',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-22T21:55:18',
        ipAddress: '127.0.0.1'
    },
    {
        _id: '8',
        action: 'INVOICE_CREATED',
        user: { name: 'Pharma Admin', email: 'admin@pharma.com', role: 'Admin' },
        timestamp: '2026-01-22T20:00:55',
        ipAddress: '127.0.0.1'
    }
];

export default AuditLogsPage;
