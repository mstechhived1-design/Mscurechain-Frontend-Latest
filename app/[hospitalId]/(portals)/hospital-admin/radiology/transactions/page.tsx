'use client';

import React, { useState } from 'react';
import {
    Search,
    CreditCard,
    TrendingUp,
    IndianRupee,
    RefreshCw,
    FileSpreadsheet,
    Activity
} from "lucide-react";
import { toast } from 'react-hot-toast';

function RadiologyTransactionsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    
    // Mock data since Radiology billing is not yet implemented
    const bills: any[] = []; 
    const loading = false;
    const totalGlobalRevenue = 0;

    const handleExport = async () => {
        toast.error('Radiology module is pending backend integration');
    };

    const fetchBills = () => {
        toast.success('System up to date. Waiting for Radiology backend integration.');
    };

    return (
        <div className="space-y-4 bg-slate-50/50 min-h-screen">
            {/* Ultra-Compact Dynamic Header */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-white p-2 md:p-3 rounded-2xl border border-gray-100 shadow-sm shrink-0 mt-4 md:mt-6">
                
                {/* 1. Icon + Title */}
                <div className="flex items-center gap-2 pr-2 md:pr-4 border-r border-slate-100">
                    <div className="p-1 md:p-1.5 bg-blue-50 rounded-lg text-blue-600">
                        <Activity className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-[11px] md:text-sm font-bold text-gray-900 leading-none uppercase">
                            Radiology
                        </h1>
                    </div>
                </div>

                {/* 2. Compact Stats */}
                <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] font-black text-slate-900">{`₹${Math.round(totalGlobalRevenue).toLocaleString()}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-indigo-600" />
                        <span className="text-[10px] font-black text-slate-900">{bills.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] font-black text-slate-900">{`₹0`}</span>
                    </div>
                </div>

                {/* 3. Search Bar */}
                <div className="relative flex-1 min-w-[120px] max-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>

                {/* 4. Date Picker */}
                <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-1.5 py-1 bg-transparent text-[9px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    />
                    <span className="text-gray-300 font-bold">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-1.5 py-1 bg-transparent text-[9px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    />
                </div>

                {/* 5. Actions (Refresh, Export, Pagination, Verified) */}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <button
                        onClick={() => fetchBills()}
                        className="p-1.5 bg-gray-50 text-slate-400 border border-gray-200 rounded-lg hover:text-slate-900 hover:bg-white transition-all font-black shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={14} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
                    >
                        {isExporting ? <RefreshCw size={12} strokeWidth={3} className="animate-spin" /> : <FileSpreadsheet size={12} strokeWidth={3} />}
                        <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export XLS'}</span>
                    </button>

                    <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Verified</span>
                    </div>
                </div>
            </div>

            {/* Clean Transactions Registry */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/30">
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <tr>
                                <td colSpan={7} className="p-20 text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <Activity className="text-blue-500 w-8 h-8" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-black text-slate-900">Radiology Integration Pending</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[280px] mx-auto leading-relaxed">
                                        The Radiology billing module is currently under development. Transactions will appear here once the backend is linked.
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table></div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(RadiologyTransactionsPage);
