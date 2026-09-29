"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, ArrowLeft, ExternalLink, Calendar, User, RefreshCw, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { useHelpdeskPatients } from "@/lib/integrations";
import { sanitizePatientName, formatPatientDisplayName } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function TransactionHistoryPage() {
    const router = useRouter();
    const params = useParams() as any;

    // Patient search
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;
    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: patientsRaw, isLoading: patientsLoading, isFetching } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        undefined,
        undefined,
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);

    const totalPages = Math.ceil(total / limit);

    // Selected patient & their reports
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientReports, setPatientReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // All reports (shown when no patient is selected)
    const [allReports, setAllReports] = useState<any[]>([]);
    const [allReportsLoading, setAllReportsLoading] = useState(true);

    // Delete Modal State
    const [reportToDelete, setReportToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const confirmDelete = async () => {
        if (!reportToDelete) return;
        try {
            setIsDeleting(true);
            await helpdeskService.deleteTransactionReport(reportToDelete._id);
            toast.success("Report deleted successfully");
            
            // Refresh list
            setAllReports(prev => prev.filter(r => r._id !== reportToDelete._id));
            if (selectedPatient) {
                setPatientReports(prev => prev.filter(r => r._id !== reportToDelete._id));
            }
            setReportToDelete(null);
        } catch (error) {
            console.error("Failed to delete report:", error);
            toast.error("Failed to delete report");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filters & Pagination for All Reports
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [doctorName, setDoctorName] = useState("");
    const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
    const [reportPage, setReportPage] = useState(1);
    const reportsLimit = 15;

    useEffect(() => {
        fetchAllReports();
    }, []);

    const fetchAllReports = async () => {
        try {
            setAllReportsLoading(true);
            const data = await helpdeskService.getAllTransactionReports();
            setAllReports(data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setAllReportsLoading(false);
        }
    };

    const handleSelectPatient = async (patient: any) => {
        const pId = patient.user?._id || patient._id || patient.id;
        setSelectedPatient({
            ...patient,
            _id: pId,
            name: patient.user?.name || patient.name,
            mobile: patient.user?.mobile || patient.profile?.contactNumber || patient.mobile || 'N/A',
            mrn: patient.mrn || patient.profile?.mrn || 'N/A',
        });
        setLoadingReports(true);
        try {
            // Fetch both saved reports AND dynamic IPD bill in parallel
            const [savedReports, dynamicBill] = await Promise.allSettled([
                helpdeskService.getPatientTransactionReports(pId),
                helpdeskService.getIPDFinalBill(pId).catch(() => []),
            ]);

            const saved = savedReports.status === 'fulfilled' ? (savedReports.value || []) : [];
            const dynamic = dynamicBill.status === 'fulfilled' ? (dynamicBill.value || []) : [];

            // Merge: dynamic (auto-generated) bills first, then saved reports
            const merged = [...(Array.isArray(dynamic) ? dynamic : []), ...(Array.isArray(saved) ? saved : [])];
            setPatientReports(merged);

            if (merged.length === 0) {
                toast("No billing data found for this patient.", { icon: "📋" });
            }
        } catch (error) {
            console.error("Failed to fetch patient reports:", error);
            toast.error("Failed to load patient reports");
            setPatientReports([]);
        } finally {
            setLoadingReports(false);
        }
    };

    const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const isReportIPD = (report: any) => {
        // If explicitly set (like in dynamic bills)
        if (report.isOPD === true) return false;
        if (report.isOPD === false) return true;
        
        // Also check if there's an active admission object (which implies IPD)
        if (report.admission && Object.keys(report.admission).length > 0) {
            return true;
        }

        // Smarter fallback for legacy reports:
        // Check if there are room admissions, BUT make sure it's not a manual OPD charge.
        // Manual OPD room charges usually have admissionId explicitly set to "".
        if (report.reportData?.admissions && Array.isArray(report.reportData.admissions) && report.reportData.admissions.length > 0) {
            const hasRealAdmission = report.reportData.admissions.some((a: any) => a.admissionId !== "");
            if (hasRealAdmission) {
                return true;
            }
        }

        // Otherwise default to OPD
        return false;
    };

    // Client-side filtering for allReports
    const filteredAllReports = useMemo(() => {
        const filtered = allReports.filter(report => {
            let matches = true;

            // Date Range
            if (startDate) {
                const rDate = new Date(report.date || report.createdAt);
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                if (rDate < sDate) matches = false;
            }
            if (endDate && matches) {
                const rDate = new Date(report.date || report.createdAt);
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                if (rDate > eDate) matches = false;
            }

            // Doctor Filter (deep search in reportData)
            if (doctorName && matches) {
                const searchDoc = doctorName.toLowerCase();
                const docString = JSON.stringify(report.reportData?.doctors || []).toLowerCase();
                if (!docString.includes(searchDoc)) matches = false;
            }

            // Type Filter (IPD/OPD)
            if (typeFilter !== 'ALL' && matches) {
                const isIPD = isReportIPD(report);
                if (typeFilter === 'OPD' && isIPD) matches = false;
                if (typeFilter === 'IPD' && !isIPD) matches = false;
            }

            return matches;
        });

        // Price Sort
        if (priceSort === "asc") {
            filtered.sort((a: any, b: any) => (a.totals?.grandTotal || 0) - (b.totals?.grandTotal || 0));
        } else if (priceSort === "desc") {
            filtered.sort((a: any, b: any) => (b.totals?.grandTotal || 0) - (a.totals?.grandTotal || 0));
        }

        return filtered;
    }, [allReports, startDate, endDate, priceSort, doctorName, typeFilter]);

    const totalReportPages = Math.ceil(filteredAllReports.length / reportsLimit);
    const paginatedAllReports = filteredAllReports.slice(
        (reportPage - 1) * reportsLimit,
        reportPage * reportsLimit
    );

    // Decide which reports to display
    let displayReports = selectedPatient ? patientReports : paginatedAllReports;
    if (selectedPatient && typeFilter !== 'ALL') {
        displayReports = displayReports.filter((r: any) => {
            const isIPD = isReportIPD(r);
            if (typeFilter === 'OPD' && isIPD) return false;
            if (typeFilter === 'IPD' && !isIPD) return false;
            return true;
        });
    }
    const isLoadingDisplay = selectedPatient ? loadingReports : allReportsLoading;

    return (
        <div className="w-full max-w-[98%] mx-auto space-y-4 pb-16 animate-in fade-in duration-500">
            {/* Compact Header Row with Filters & Pagination */}
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                <button
                    onClick={() => selectedPatient ? setSelectedPatient(null) : router.back()}
                    className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> {selectedPatient ? "Back" : "Back"}
                </button>

                <div className="relative group flex-1 mr-auto min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="Search patient..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="pl-8 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl w-full text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                    />
                </div>

                {!selectedPatient && (
                    <>
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        {/* Date Filter */}
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setReportPage(1); }}
                                className="px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:border-indigo-500 outline-none w-[115px]"
                            />
                            <span className="text-slate-300">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setReportPage(1); }}
                                className="px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:border-indigo-500 outline-none w-[115px]"
                            />
                        </div>

                        {/* Doctor Filter */}
                        <div className="flex items-center">
                            <input
                                type="text"
                                placeholder="Doctor..."
                                value={doctorName}
                                onChange={e => { setDoctorName(e.target.value); setReportPage(1); }}
                                className="px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 outline-none w-[160px]"
                            />
                        </div>

                        {/* Price Filter */}
                        <div className="flex items-center">
                            <select
                                value={priceSort}
                                onChange={e => { setPriceSort(e.target.value as any); setReportPage(1); }}
                                className="px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:border-indigo-500 outline-none w-[110px]"
                            >
                                <option value="none">Price Sort</option>
                                <option value="asc">Low to High</option>
                                <option value="desc">High to Low</option>
                            </select>
                        </div>

                        {(searchTerm || startDate || endDate || doctorName || priceSort !== "none") && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setStartDate("");
                                    setEndDate("");
                                    setDoctorName("");
                                    setPriceSort("none");
                                    setReportPage(1);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors"
                                title="Clear All Filters"
                            >
                                <RefreshCw size={12} /> Clear
                            </button>
                        )}

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        {/* Pagination */}
                        <div className="flex items-center gap-2 bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setReportPage(Math.max(1, reportPage - 1))}
                                disabled={reportPage <= 1}
                                className="p-1 rounded text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-black text-slate-500 min-w-[50px] text-center">
                                {reportPage} / {totalReportPages || 1}
                            </span>
                            <button
                                onClick={() => setReportPage(Math.min(totalReportPages, reportPage + 1))}
                                disabled={reportPage >= totalReportPages || totalReportPages === 0}
                                className="p-1 rounded text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Patient Search Results — show when user is typing */}
            {searchTerm.length >= 2 && !selectedPatient && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden mb-2">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            {isFetching ? "Searching..." : `${total} Patient${total !== 1 ? "s" : ""} Found`}
                        </p>
                    </div>
                    {patientsLoading ? (
                        <div className="py-10 text-center">
                            <RefreshCw className="animate-spin text-indigo-400 mx-auto mb-3" size={24} />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching patients...</p>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="py-10 text-center">
                            <User size={36} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-400 font-bold text-xs">No patients found for &quot;{searchTerm}&quot;</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Gender</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {patients.map((p: any) => {
                                        const name = formatPatientDisplayName(p);
                                        const mrn = p.mrn || p.profile?.mrn || "N/A";
                                        const mobile = p.user?.mobile || p.profile?.contactNumber || p.mobile || "N/A";
                                        const dob = p.user?.dateOfBirth || p.profile?.dob || p.dateOfBirth;
                                        const age = dob ? calculateAge(dob) : "--";
                                        const gender = p.user?.gender || p.profile?.gender || p.gender || "--";

                                        return (
                                            <tr
                                                key={p._id || p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800">{name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{mrn}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{mobile}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{age} / {gender}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View Reports →
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                                    <p className="text-[10px] font-bold text-slate-400">Page {page} of {totalPages}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page <= 1}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page >= totalPages}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white transition-colors"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Selected Patient Banner */}
            {selectedPatient && (
                <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 rounded-2xl border border-indigo-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg">
                            {(selectedPatient.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900">{selectedPatient.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                MRN: {selectedPatient.mrn} &bull; Mobile: {selectedPatient.mobile}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setSelectedPatient(null); setPatientReports([]); setSearchTerm(""); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-white transition-colors"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {selectedPatient ? `${selectedPatient.name.split(' ')[0]}'s Reports` : "Total Patient Transaction Reports"}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Previously saved financial statements
                            </p>
                        </div>
                    </div>
                    
                    {/* OPD/IPD Toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                        {['ALL', 'OPD', 'IPD'].map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setTypeFilter(type as any);
                                    if (!selectedPatient) setReportPage(1);
                                }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    typeFilter === type
                                        ? type === 'OPD' 
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : type === 'IPD'
                                                ? 'bg-rose-500 text-white shadow-md'
                                                : 'bg-white text-slate-800 shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoadingDisplay ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading...</p>
                    </div>
                ) : displayReports.length === 0 ? (
                    <div className="py-20 text-center">
                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            {selectedPatient ? "No saved reports for this patient" : "No transaction reports found"}
                        </p>
                        {!selectedPatient && (
                            <p className="text-slate-400 font-medium text-xs mt-2">
                                Use the search bar above to find a patient by name, MRN, or mobile number
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Grand Total</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Paid</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                    <th className="px-4 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.values(displayReports.reduce((acc: any, report: any) => {
                                    const pId = report.patient?._id || report.patient?.id || report.patientId || selectedPatient?._id || "unknown";
                                    if (!acc[pId]) acc[pId] = [];
                                    acc[pId].push(report);
                                    return acc;
                                }, {}) as { [key: string]: any[] }).map((group: any[]) => {
                                    const first = group[0];
                                    const patientName = formatPatientDisplayName(first.patient || selectedPatient);
                                    const patientMrn = first.patient?.mrn || first.patient?.profile?.mrn || selectedPatient?.mrn || 'N/A';
                                    
                                    return (
                                        <React.Fragment key={first.patient?._id || first.patientId || Math.random()}>
                                            <tr className="bg-indigo-50/40 border-t border-slate-100">
                                                <td colSpan={6} className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-indigo-500" />
                                                        <span className="text-xs font-black text-slate-800">{patientName}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 ml-2">MRN: {patientMrn}</span>
                                                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-auto">
                                                            {group.length} Report{group.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {group.map((report: any) => (
                                                <tr key={report._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 pl-8">
                                                        <div className="text-xs font-bold text-slate-700">
                                                            {new Date(report.date || report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                            {new Date(report.date || report.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-slate-300">-</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-black text-slate-700">{fmt(report.totals?.grandTotal || 0)}</td>
                                                    <td className="px-4 py-3 text-xs font-bold text-emerald-600">
                                                        {(() => {
                                                            let calcPaid = report.totals?.totalPaid || 0;
                                                            if (calcPaid === 0) {
                                                                const payments = report.reportData?.payments || report.receipts || [];
                                                                payments.forEach((p: any) => {
                                                                    if (!p.status || p.status === 'Paid' || p.status === 'Completed') {
                                                                        calcPaid += Number(p.amount || 0);
                                                                    }
                                                                });
                                                            }
                                                            return fmt(calcPaid);
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-black text-rose-500">
                                                        {(() => {
                                                            let calcPaid = report.totals?.totalPaid || 0;
                                                            if (calcPaid === 0) {
                                                                const payments = report.reportData?.payments || report.receipts || [];
                                                                payments.forEach((p: any) => {
                                                                    if (!p.status || p.status === 'Paid' || p.status === 'Completed') {
                                                                        calcPaid += Number(p.amount || 0);
                                                                    }
                                                                });
                                                            }
                                                            const grand = report.totals?.grandTotal || 0;
                                                            const bal = grand - calcPaid;
                                                            return fmt(bal < 0 ? 0 : bal);
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const patientId = report.patient?._id || selectedPatient?._id || report.patientId;
                                                                    router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${patientId}&loadReport=${report._id}`);
                                                                }}
                                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm"
                                                                title="Open Report"
                                                            >
                                                                <FileText size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setReportToDelete(report)}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shadow-sm"
                                                                title="Delete Report"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {reportToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Report</h3>
                            <p className="text-sm font-bold text-slate-500 mb-6">
                                Are you sure you want to delete this transaction report? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setReportToDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>          
                </div>
            )}
        </div>
    );
}
