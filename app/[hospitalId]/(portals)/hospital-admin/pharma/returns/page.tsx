'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PackageX, Search, Stethoscope, FileText, Undo2, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { getSocket } from '@/lib/integrations/api/socket';
import toast from 'react-hot-toast';

export default function ReturnedStockPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'IPD' | 'OPD'>('ALL');

    const fetchReturns = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiClient('/pharmacy/returns/unified') as any;
            if (response.success) {
                setReturns(response.data);
            }
        } catch (error: any) {
            console.error("Failed to fetch returns", error);
            toast.error("Failed to load returned stock");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    // Real-time: Listen for return events via Socket.IO
    useEffect(() => {
        let socket: any = null;

        const setupSocket = async () => {
            socket = await getSocket();
            if (!socket) return;

            // Listen for OPD/General returns
            socket.on('general_return_processed', (data: any) => {
                toast.success(`New return processed: ${data.invoiceNo || 'Invoice'} — ₹${data.refundAmount?.toFixed(2)}`, { icon: '🔄' });
                fetchReturns();
            });

            // Listen for IPD returns
            socket.on('medicine_return_approved', () => {
                toast.success('IPD medicine return approved', { icon: '🔄' });
                fetchReturns();
            });

            socket.on('medicine_return_requested', () => {
                fetchReturns();
            });
        };

        setupSocket();

        return () => {
            if (socket) {
                socket.off('general_return_processed');
                socket.off('medicine_return_approved');
                socket.off('medicine_return_requested');
            }
        };
    }, [fetchReturns]);

    const filteredReturns = returns.filter((ret) => {
        const matchesSource = sourceFilter === 'ALL' || ret.source === sourceFilter;
        const matchesSearch = 
            ret.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ret.referenceId?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSource && matchesSearch;
    });

    const totalRefund = filteredReturns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const ipdCount = returns.filter(r => r.source === 'IPD').length;
    const opdCount = returns.filter(r => r.source === 'OPD').length;

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Undo2 size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Returned Stock Overview</h1>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Live
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 ml-13">Unified view of all returned medicines from IPD and OPD</p>
                </div>
                
                <div className="flex gap-3 items-center">
                    <button
                        onClick={fetchReturns}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <div className="bg-gray-50 flex rounded-xl p-1 border border-gray-200">
                        {(['ALL', 'IPD', 'OPD'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSourceFilter(filter)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    sourceFilter === filter
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {filter}
                                {filter === 'IPD' && <span className="ml-1 text-xs text-gray-400">({ipdCount})</span>}
                                {filter === 'OPD' && <span className="ml-1 text-xs text-gray-400">({opdCount})</span>}
                                {filter === 'ALL' && <span className="ml-1 text-xs text-gray-400">({returns.length})</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Returns</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{filteredReturns.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Refund Value</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">-₹{totalRefund.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sources</p>
                    <div className="flex gap-3 mt-1">
                        <span className="text-sm font-bold text-blue-600">{ipdCount} IPD</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm font-bold text-emerald-600">{opdCount} OPD</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[250px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by patient name or reference ID..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient / Ref ID</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Items Returned</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Refund Value</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading returns...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReturns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <PackageX size={32} className="text-gray-300 mb-2" />
                                            <p className="font-medium text-gray-600">No returns found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReturns.map((ret) => (
                                    <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(ret.date).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(ret.date).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                                ret.source === 'IPD' 
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            }`}>
                                                {ret.source === 'IPD' ? <Stethoscope size={12} /> : <FileText size={12} />}
                                                {ret.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{ret.patientName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{ret.referenceId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm">
                                                {ret.itemsCount}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-black text-rose-600">
                                                -₹{ret.refundAmount?.toFixed(2) || '0.00'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                                                ret.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                ret.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                ret.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {ret.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
