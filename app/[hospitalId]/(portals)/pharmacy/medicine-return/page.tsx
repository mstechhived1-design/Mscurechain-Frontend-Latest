"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTenantLink } from "@/hooks/useTenantLink";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import {
    Search, RotateCcw, Fingerprint, Layers, ArrowRight
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function PharmaMedicineReturnPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink();
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleClear = () => {
        setSearch('');
        setStatusFilter('ALL');
        setCurrentPage(1);
    };

    // Fetch all returns
    const { data: allReturns = [], isLoading } = useQuery({
        queryKey: ["pharmacy", "medicine-returns", "all", { status: statusFilter }],
        queryFn: () => ipdIssuanceService.getAllReturns({ status: statusFilter === "ALL" ? undefined : statusFilter }),
        refetchInterval: 10000,
    });

    // Real-time socket updates
    useState(() => {
        if (typeof window !== 'undefined') {
            const setupSocket = async () => {
                try {
                    const { subscribeToSocket } = await import('@/lib/integrations/api/socket');
                    const handleRefresh = () => {
                        console.log("📡 Pharma Socket Refresh Event");
                        queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns"] });
                        queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance"] });
                    };

                    subscribeToSocket('medicine_return_requested', handleRefresh);
                    subscribeToSocket('medicine_return_approved', handleRefresh);
                    subscribeToSocket('medicine_return_rejected', handleRefresh);
                } catch (e) {
                    console.warn("Socket setup failed in Pharma Return Page:", e);
                }
            };
            setupSocket();
        }
        return null;
    });

    // Consolidate Returns by Admission
    const consolidatedReturns = useMemo(() => {
        const groups: Record<string, any> = {};

        allReturns.forEach((ret: any) => {
            const key = (ret.admissionId || ret._id || "").toString().trim();
            if (!key) return;

            if (!groups[key]) {
                groups[key] = {
                    ...ret,
                    requestCount: 1,
                    pendingCount: ret.status === 'PENDING' ? 1 : 0,
                    // Initialize aggregate totals
                    totalIssuance: ret.financials?.issuanceTotal || 0,
                    totalReturned: ret.financials?.thisReturnTotal || 0,
                };
            } else {
                groups[key].requestCount += 1;
                // Add to aggregate totals
                groups[key].totalIssuance += (ret.financials?.issuanceTotal || 0);
                groups[key].totalReturned += (ret.financials?.thisReturnTotal || 0);

                if (ret.status === 'PENDING') groups[key].pendingCount += 1;
                // Keep the most important status
                if (ret.status === 'PENDING') groups[key].status = 'PENDING';
            }
        });

        const grouped = Object.values(groups).map((group: any) => ({
            ...group,
            financials: {
                ...group.financials,
                issuanceTotal: group.totalIssuance,
                thisReturnTotal: group.totalReturned,
                netAmount: parseFloat(Math.max(0, group.totalIssuance - group.totalReturned).toFixed(2))
            }
        }));

        // Apply Search Filter on Grouped Data
        if (!search.trim()) return grouped;
        const q = search.toLowerCase();
        return grouped.filter((ret: any) =>
            ret.patient?.name?.toLowerCase().includes(q) ||
            ret.patient?.mrn?.toLowerCase().includes(q) ||
            ret.admissionId?.toLowerCase().includes(q)
        );
    }, [allReturns, search]);

    // Pagination Logic
    const totalPages = Math.ceil(consolidatedReturns.length / itemsPerPage) || 1;
    const paginatedReturns = consolidatedReturns.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 pt-2">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#111] p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-600">
                        <RotateCcw size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                            Return Management
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 md:mt-1">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                                {consolidatedReturns.length} Total Patients
                            </span>
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
                                Reconciliation & Stock Console
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-1 w-full lg:w-auto items-center gap-2 md:gap-3">
                    {/* Clear Button */}
                    <button 
                        onClick={handleClear}
                        className="px-2 py-1.5 md:px-3 md:py-2 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-bold text-rose-600 hover:bg-rose-100 uppercase tracking-wider transition-colors shrink-0 w-full sm:w-auto"
                    >
                        <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        Clear Form
                    </button>
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full min-w-[120px] group">
                        <Search className="w-3 h-3 md:w-3.5 md:h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            className="w-full pl-8 pr-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-[9px] md:text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-gray-400"
                            placeholder="Search Name or MRN..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-800 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                        {["ALL", "APPROVED", "PENDING", "REJECTED"].map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status);
                                    setCurrentPage(1);
                                }}
                                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all min-w-fit flex-1 sm:flex-none ${statusFilter === status
                                    ? "bg-white dark:bg-orange-600 text-orange-600 dark:text-white border border-gray-200 dark:border-orange-500 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Table Content */}
            <div className="bg-white dark:bg-[#111] rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                
                {/* Pagination Stats (Top) */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50/30 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 gap-4">
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest tabular-nums">
                        Showing {paginatedReturns.length} of {consolidatedReturns.length} admissions
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                        >
                            Prev
                        </button>
                        <div className="px-3 md:px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center">
                            <span className="text-[10px] md:text-[11px] font-black text-orange-600 tracking-tighter">{currentPage}</span>
                            <span className="text-[10px] md:text-[11px] font-black text-gray-400 mx-1">/</span>
                            <span className="text-[10px] md:text-[11px] font-black text-gray-400 tracking-tighter">{totalPages}</span>
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient / Reference</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Requests</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Doctor</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Issuance (₹)</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Return (₹)</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest text-right">Net Payable (₹)</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-16 md:py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Processing...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedReturns.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 md:py-20 text-center italic text-gray-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">
                                        No return records found
                                    </td>
                                </tr>
                            ) : (
                                paginatedReturns.map((ret: any) => (
                                    <tr key={ret.admissionId} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all group">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-600 border border-orange-100 dark:border-orange-800/50 font-black text-xs">
                                                    {ret.patient?.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{ret.patient?.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Fingerprint size={10} className="text-gray-400" />
                                                        <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                            MRN: {ret.patient?.mrn || 'N/A'}
                                                            <span className="mx-1 opacity-30">|</span>
                                                            ADM: {ret.admissionId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 md:py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                                <Layers size={10} />
                                                <span className="text-[9px] md:text-[10px] font-black tracking-widest">{ret.requestCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                                Dr. {ret.primaryDoctor || 'Not Assigned'}
                                            </p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <p className="text-[10px] md:text-[11px] font-bold text-gray-400 tabular-nums">₹{ret.financials?.issuanceTotal?.toLocaleString()}</p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <p className="text-[10px] md:text-[11px] font-black text-orange-600 tabular-nums">₹{ret.financials?.thisReturnTotal?.toLocaleString()}</p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <div className="inline-flex px-2 md:px-3 py-1 bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 rounded-full border border-teal-100 dark:border-teal-800/50">
                                                <p className="text-[10px] md:text-[11px] font-black tabular-nums">₹{ret.financials?.netAmount?.toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border ${ret.pendingCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                                                    ret.status === 'APPROVED' || ret.pendingCount === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        'bg-rose-50 text-rose-600 border-rose-200'
                                                    }`}>
                                                    {ret.pendingCount > 0 ? `${ret.pendingCount} PENDING` : 'CLEARED'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <button
                                                onClick={() => router.push(getPath(`/pharmacy/ipd-issuance?admissionId=${ret.admissionId}&patientName=${encodeURIComponent(ret.patient?.name || "")}`))}
                                                className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 transition-all rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 ml-auto border border-gray-200 dark:border-gray-700 hover:border-orange-500 shadow-sm"
                                            >
                                                <span>Manage</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls Removed from Bottom */}
            </div>
        </div>
    );
}
