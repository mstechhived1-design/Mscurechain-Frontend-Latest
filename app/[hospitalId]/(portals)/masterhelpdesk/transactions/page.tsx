'use client';

import React, { useMemo, useState } from "react";
import {
    CreditCard,
    Download,
    Search,
    TrendingUp,
    Filter,
    Loader2,
    ArrowLeft,
    RefreshCw,
    FileText,
    ChevronLeft,
    ChevronRight,
    Activity,
    Shield,
    IndianRupee,
    X
} from "lucide-react";
import { helpdeskService, masterHelpdeskService } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useMasterTransactions, useMasterDashboard, useMasterDoctors } from "@/lib/integrations/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { getDateRangeForPreset } from "@/lib/utils/date-utils";

export default function TransactionsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [showExportCard, setShowExportCard] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportType, setExportType] = useState('all');
    const [typeFilter] = useState("opd"); // Locked to 'opd'
    const [paymentModeFilter, setPaymentModeFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [datePreset, setDatePreset] = useState<string>("today");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [doctorIdFilter, setDoctorIdFilter] = useState<string>("all");
    const limit = 10;

    const debouncedSearch = useDebounce(searchTerm, 500);

    const { data: dashboardData } = useMasterDashboard(hospitalId);
    const { data: doctorsData } = useMasterDoctors(hospitalId);
    const doctors = Array.isArray(doctorsData) 
        ? doctorsData 
        : (doctorsData as any)?.doctors || (doctorsData as any)?.data || [];
    const hospitalName = dashboardData?.hospital?.name || "CureChain";
    
    // ✅ RESET PAGE ON FILTER CHANGE: Ensure user doesn't get stuck on an empty high-number page
    React.useEffect(() => {
        setPage(1);
    }, [debouncedSearch, startDate, endDate, paymentModeFilter, doctorIdFilter]);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        } catch (e) {
            return dateStr;
        }
    };

    // Map frontend filter values to backend transaction types
    const getBackendTypeFilter = (filterValue: string): string | undefined => {
        if (filterValue === 'all') return undefined;

        const typeMap: Record<string, string> = {
            'opd': 'appointment_booking,consultation,opd,opd_consultation',
        };

        return typeMap[filterValue] || filterValue;
    };

    const { data: txRaw, isLoading, isFetching, refetch } = useMasterTransactions(
        page,
        limit,
        hospitalId,
        startDate || undefined,
        endDate || undefined,
        getBackendTypeFilter(typeFilter),
        debouncedSearch || undefined,
        paymentModeFilter !== 'all' ? paymentModeFilter : undefined,
        doctorIdFilter !== 'all' ? doctorIdFilter : undefined
    );

    // ✅ DEBUG LOGGING: Track filtering and data retrieval
    React.useEffect(() => {
        console.log("[Transactions] Type Filter:", typeFilter);
        console.log("[Transactions] Backend Filter Query:", getBackendTypeFilter(typeFilter));
    }, [typeFilter]);

    const { transactions, total, totalRevenue, backendStats } = useMemo(() => {
        const raw: any = txRaw;
        if (!raw) return { transactions: [], total: 0, totalRevenue: 0, backendStats: null };

        console.log("[Transactions] Raw Data Received:", {
            resultCount: Array.isArray(raw) ? raw.length : (raw.data?.length || 0),
            totalInDB: raw.pagination?.total,
            stats: raw.stats
        });

        if (Array.isArray(raw)) return { transactions: raw, total: raw.length, totalRevenue: 0, backendStats: null };
        return {
            transactions: raw.transactions || raw.data || [],
            total: raw.pagination?.total || raw.total || (raw.transactions?.length || raw.data?.length || 0),
            totalRevenue: raw.stats?.totalRevenue || raw.totalRevenue || 0,
            backendStats: raw.stats || null
        };
    }, [txRaw]);

    const handleExport = async () => {
        try {
            setExporting(true);
            setShowExportCard(false);

            // Use export specific dates if they were set in modal, else fallback to UI filters
            const finalStartDate = exportStartDate || startDate;
            const finalEndDate = exportEndDate || endDate;

            // Fetch ALL transactions for the selected range (nopage=true)
            const response = await masterHelpdeskService.getTransactions(
                1,
                5000, // Large limit for export
                hospitalId,
                finalStartDate || undefined,
                finalEndDate || undefined,
                getBackendTypeFilter(typeFilter),
                debouncedSearch || undefined
            );
            let exportData = Array.isArray(response) ? response : (response.data || []);

            // ✅ CLIENT-SIDE FILTERING: Ensure we respect the Online/Offline selection
            if (exportType !== 'all') {
                exportData = exportData.filter((tx: any) => {
                    const rawMethod = (tx.paymentMethod || tx.paymentMode || 'CASH').toUpperCase();
                    const txType = (tx.type || 'appointment_booking').toLowerCase();

                    // Categorize based on payment method (Digital = Online, Cash = Offline)
                    const isOfflineCategory = ['CASH', 'OFFLINE'].includes(rawMethod);

                    if (exportType === 'online') {
                        return !isOfflineCategory && ['UPI', 'CARD', 'ONLINE', 'NETBANKING', 'RAZORPAY', 'DIGITAL'].includes(rawMethod);
                    } else if (exportType === 'offline') {
                        return isOfflineCategory;
                    }
                    return true;
                });
            }

            exportData = exportData.filter((tx: any) => tx.status?.toLowerCase() !== 'cancelled' && tx.referenceId?.status?.toLowerCase() !== 'cancelled');

            if (exportData.length === 0) {
                toast.error("No data found for the selected period");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Revenue Ledger");

            // Define Columns First
            worksheet.columns = [
                { header: "DATE & TIME", key: "date", width: 22 },
                { header: "PATIENT IDENTITY", key: "name", width: 28 },
                { header: "REFERENCE ID", key: "id", width: 24 },
                { header: "CONTACT", key: "mobile", width: 15 },
                { header: "SERVICE CATEGORY", key: "type", width: 22 },
                { header: "REVENUE (INR)", key: "amount", width: 16 },
                { header: "PAYMENT MODE", key: "mode", width: 18 },
                { header: "SETTLEMENT", key: "status", width: 15 }
            ];

            // 1. BRANDING HEADER
            worksheet.mergeCells("A1:H1");
            const titleCell = worksheet.getCell("A1");
            titleCell.value = `${hospitalName.toUpperCase()} FINANCIAL REVENUE LEDGER`;
            titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" }, name: 'Arial' };
            titleCell.alignment = { vertical: "middle", horizontal: "center" };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } } as ExcelJS.Fill;
            worksheet.getRow(1).height = 40;

            // 2. REPORT METADATA
            worksheet.mergeCells("A2:H2");
            const metaCell = worksheet.getCell("A2");
            const periodText = `PERIOD: ${formatDate(exportStartDate)} TO ${formatDate(exportEndDate)}`;
            const typeText = `SCOPE: ${exportType === 'all' ? 'FULL INSTITUTIONAL' : exportType.toUpperCase() + ' CHANNEL'}`;
            const generatedText = `GENERATED ON: ${new Date().toLocaleString()}`;
            metaCell.value = `${periodText}  |  ${typeText}  |  ${generatedText}`;
            metaCell.font = { bold: true, size: 10, color: { argb: "475569" } };
            metaCell.alignment = { vertical: "middle", horizontal: "center" };
            metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } } as ExcelJS.Fill;
            worksheet.getRow(2).height = 25;

            // 3. TABLE HEADERS (Row 4 - leaving a gap)
            worksheet.getRow(3).height = 10; // Spacer
            const headerRow = worksheet.getRow(4);
            headerRow.values = worksheet.columns?.map(c => c.header as string) || [];
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } } as ExcelJS.Fill;
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'medium' },
                    right: { style: 'thin' }
                };
            });
            headerRow.height = 30;

            // 4. DATA POPULATION
            exportData.forEach((tx: any, index: number) => {
                const txDate = tx.date || tx.createdAt || tx.transactionTime;
                const formattedDate = txDate
                    ? new Date(txDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()
                    : 'N/A';

                const typeMapping: Record<string, string> = {
                    'appointment_booking': 'OPD CONSULTATION',
                    'opd': 'OPD CONSULTATION',
                    'consultation': 'OPD CONSULTATION',
                    'ipd': 'IPD ADMISSION',
                    'ipd_advance': 'IPD ADVANCE',
                    'ipd_final_settlement': 'IPD SETTLEMENT',
                    'discharge': 'DISCHARGE DUES'
                };
                const rawType = tx.type || 'appointment_booking';
                const serviceType = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                const txId = tx.transactionId || tx.receiptNumber || tx.invoiceNumber || tx.referenceId?.appointmentId || tx.referenceId?.transactionId || tx.referenceId?.admissionId || (tx.patientMRN && tx.patientMRN !== 'Resolving...' ? `#${tx.patientMRN}` : "—");

                const row = worksheet.addRow({
                    date: formattedDate,
                    name: (
                        tx.patientName || 
                        getSafeName(tx.patient) || 
                        getSafeName(tx.patientDetails) || 
                        getSafeName(tx.referenceId) || 
                        getSafeName(tx.referenceId?.patient) || 
                        getSafeName(tx.patientId) ||
                        "UNKNOWN"
                    ).toUpperCase(),
                    id: (txId || "—").toUpperCase(),
                    mobile: (
                        tx.patientMobile || 
                        getSafeMobile(tx.patient) || 
                        getSafeMobile(tx.referenceId) || 
                        getSafeMobile(tx.referenceId?.patient) || 
                        getSafeMobile(tx.patientId) ||
                        "N/A"
                    ),
                    type: serviceType,
                    amount: tx.amount || 0,
                    mode: (tx.paymentMethod || tx.paymentMode || "CASH").toUpperCase(),
                    status: tx.status.toUpperCase()
                });

                // Styling row
                row.eachCell((cell, colNumber) => {
                    cell.font = { size: 10, color: { argb: "1E293B" } };
                    cell.alignment = { vertical: "middle", horizontal: colNumber === 6 ? "right" : "left" };
                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                    }
                    if (colNumber === 8) { // Status column
                        const isPaid = cell.value === "PAID" || cell.value === "COMPLETED";
                        cell.font = { bold: true, color: { argb: isPaid ? "059669" : "DC2626" }, size: 9 };
                        cell.alignment = { vertical: "middle", horizontal: "center" };
                    }
                });
            });

            // 5. SUMMARY DASHBOARD
            worksheet.addRow({}); // Spacer
            const lastRowNum = worksheet.lastRow?.number || 0;
            const summaryStartRow = lastRowNum + 1;
            
            worksheet.mergeCells(`A${summaryStartRow}:H${summaryStartRow}`);
            const summaryTitle = worksheet.getCell(`A${summaryStartRow}`);
            summaryTitle.value = "FINANCIAL PERFORMANCE SUMMARY";
            summaryTitle.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
            summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } } as ExcelJS.Fill;
            summaryTitle.alignment = { horizontal: "center" };

            // Accurate Calculations
            const stats = exportData.reduce((acc: any, tx: any) => {
                const rawMethod = (tx.paymentMethod || tx.paymentMode || 'CASH').toUpperCase();
                const txType = (tx.type || 'appointment_booking').toLowerCase();
                const amount = tx.amount || 0;

                // Sync with UI categorization logic
                // Sync with UI categorization logic (Digital vs Cash)
                const isOfflineCategory = ['CASH', 'OFFLINE'].includes(rawMethod);
                
                if (isOfflineCategory) {
                    acc.offlineRevenue += amount;
                    acc.offlineCount++;
                } else {
                    acc.onlineRevenue += amount;
                    acc.onlineCount++;
                }

                if (rawMethod === "CASH") acc.cashRevenue += amount;
                else if (["UPI", "GPAY", "PHONEPE"].includes(rawMethod)) acc.upiRevenue += amount;
                else if (["CARD", "VISA", "MASTERCARD"].includes(rawMethod)) acc.cardRevenue += amount;
                else acc.otherRevenue += amount;

                acc.totalRevenue += amount;
                return acc;
            }, { 
                totalRevenue: 0, offlineRevenue: 0, onlineRevenue: 0, 
                offlineCount: 0, onlineCount: 0,
                cashRevenue: 0, upiRevenue: 0, cardRevenue: 0, otherRevenue: 0 
            });

            const summaryRows = [
                ["", "", "", "", "GROSS TOTAL REVENUE", stats.totalRevenue, "", ""],
                ["", "", "", "", "OFFLINE CHANNEL TOTAL", stats.offlineRevenue, "COUNT:", stats.offlineCount],
                ["", "", "", "", "ONLINE CHANNEL TOTAL", stats.onlineRevenue, "COUNT:", stats.onlineCount],
                ["", "", "", "", "", "", "", ""],
                ["", "", "", "", "CASH SETTLEMENTS", stats.cashRevenue, "", ""],
                ["", "", "", "", "UPI/DIGITAL SETTLEMENTS", stats.upiRevenue, "", ""],
                ["", "", "", "", "CARD SETTLEMENTS", stats.cardRevenue, "", ""],
                ["", "", "", "", "OTHER SETTLEMENTS", stats.otherRevenue, "", ""]
            ];

            summaryRows.forEach((rowData) => {
                const row = worksheet.addRow(rowData);
                const labelCell = row.getCell(5);
                const valCell = row.getCell(6);
                
                if (labelCell.value) {
                    labelCell.font = { bold: true, size: 10, color: { argb: "475569" } };
                    valCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                    valCell.numFmt = '"₹"#,##0.00';
                    
                    if (labelCell.value.toString().includes("GROSS")) {
                        labelCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                    }
                }
            });

            // 6. FOOTER / SIGNATURE
            worksheet.addRow({});
            worksheet.addRow({});
            const footerRow = worksheet.addRow(["", "REPORT VERIFIED BY:", "________________________", "", "", "INSTITUTIONAL STAMP:", "________________________", ""]);
            footerRow.font = { size: 9, italic: true, color: { argb: "64748B" } };

            // Generate and Save
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `CureChain_Revenue_Report_${exportType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`PROFESSIONAL REPORT GENERATED SUCCESSFULLY`);
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Professional Export Failed");
        } finally {
            setExporting(false);
        }
    };

    const getSafeName = (obj: any) => {
        if (!obj) return null;
        if (typeof obj === 'string') return null;
        return obj.name || obj.patientName || (obj.firstName ? `${obj.firstName} ${obj.lastName || ''}` : null) || (obj.user?.name) || (obj.profile?.name) || (obj.profile?.firstName ? `${obj.profile.firstName} ${obj.profile.lastName || ''}` : null);
    };

    const getSafeMobile = (obj: any) => {
        if (!obj) return null;
        if (typeof obj === 'string') return null;
        return obj.mobile || obj.patientMobile || obj.contact || (obj.user?.mobile) || (obj.profile?.mobile);
    };

    // Re-fetch on search if needed or filter client-side for immediate feedback
    // Realistically with server pagination, search should also be server-side
    // Filter transactions based on search term (frontend filtering for better UX)
    // Filter transactions based on search term and payment mode
    const filteredTransactions = transactions.filter((tx: any) => {
        const name = tx.patient?.name || tx.patientName || "";
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        const isCancelled = tx.status?.toLowerCase() === 'cancelled' || tx.referenceId?.status?.toLowerCase() === 'cancelled';

        return matchesSearch && !isCancelled;
    });

    // Calculate stats based on filtered transactions
    const stats = useMemo(() => {
        // Use global revenue from backend stats to ensure it doesn't filter out context
        const grossRevenue = backendStats?.totalRevenue || totalRevenue;

        // Use global operation volume (Online + Offline) instead of filtered total
        const operationVolume = (backendStats?.onlineCount || 0) + (backendStats?.offlineCount || 0) || total;

        const quantumDensity = operationVolume > 0 ? (grossRevenue / operationVolume) : 0;

        return { grossRevenue, operationVolume, quantumDensity };
    }, [totalRevenue, total, backendStats]);

    const totalPages = Math.ceil(total / limit);

    const showInitialLoading = isLoading && !txRaw;

    if (showInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Revenue Ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">

            {/* CONSOLIDATED HEADER & CONTROLS */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-full mx-auto">
                {/* TOP BAR: TITLE & ACTIONS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.back()} className="flex-none p-2 sm:p-2.5 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                                Transactions
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Financial Revenue Ledger</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => router.push(`/${hospitalId}/masterhelpdesk/transactions/summary?startDate=${startDate}&endDate=${endDate}`)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 text-[11px] font-bold uppercase tracking-widest"
                        >
                            <TrendingUp size={16} />
                            <span>Summary</span>
                        </button>
                        <button
                            onClick={() => setShowExportCard(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 active:scale-95 text-[11px] font-bold uppercase tracking-widest"
                        >
                            <Download size={16} />
                            <span>Export Excel</span>
                        </button>
                        <button 
                            onClick={() => {
                                refetch();
                                toast.success('Records refreshed', { duration: 1500 });
                            }} 
                            className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-teal-600 shadow-sm active:scale-95 transition-all"
                            title="Refresh Ledger"
                        >
                            <RefreshCw size={18} className={`${isFetching ? 'animate-spin text-teal-600' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* REVENUE SUMMARY CARDS */}
                {backendStats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                        {/* TOTAL REVENUE - FULL WIDTH ON MOBILE */}
                        <div className="col-span-2 md:col-span-1 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-slate-100 group-hover:text-slate-200 transition-all">
                                <TrendingUp size={80} className="sm:size-[100px]" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                                <div className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-xl shadow-md shadow-slate-900/10">
                                    <IndianRupee size={18} className="sm:size-[22px]" />
                                </div>
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 sm:mb-1">Total Revenue</p>
                                    <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">₹{Math.round(totalRevenue).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* OFFLINE REVENUE - HALF WIDTH ON MOBILE */}
                        <div className="col-span-1 bg-emerald-50/50 p-2 sm:p-4 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-emerald-100/30 group-hover:text-emerald-200/30 transition-all">
                                <Activity size={80} className="sm:size-[100px]" />
                            </div>
                            <div className="relative z-10 flex items-center gap-2 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/10 shrink-0">
                                    <CreditCard size={14} className="sm:size-[22px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[7px] sm:text-[9px] font-black text-emerald-600/60 uppercase tracking-[0.2em] truncate">Offline</p>
                                    <p className="text-sm sm:text-xl font-black text-slate-900 tracking-tight truncate">₹{Math.round(backendStats.offlineRevenue || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* ONLINE REVENUE - HALF WIDTH ON MOBILE */}
                        <div className="col-span-1 bg-indigo-50/50 p-2 sm:p-4 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-indigo-100/30 group-hover:text-indigo-200/30 transition-all">
                                <Shield size={80} className="sm:size-[100px]" />
                            </div>
                            <div className="relative z-10 flex items-center gap-2 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/10 shrink-0">
                                    <TrendingUp size={14} className="sm:size-[22px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[7px] sm:text-[9px] font-black text-indigo-600/60 uppercase tracking-[0.2em] truncate">Online</p>
                                    <p className="text-sm sm:text-xl font-black text-slate-900 tracking-tight truncate">₹{Math.round(backendStats.onlineRevenue || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEARCH & FILTER BAR */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-t border-slate-100 pt-6 px-1">
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                        {/* SEARCH BAR */}
                        <div className="relative group w-full sm:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or ID..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* DATE PRESETS DROPDOWN & DATE RANGE */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <select
                                value={datePreset}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDatePreset(val);
                                    if (val !== 'custom') {
                                        const range = getDateRangeForPreset(val);
                                        setStartDate(range.start);
                                        setEndDate(range.end);
                                        setPage(1);
                                    }
                                }}
                                className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase tracking-wider outline-none focus:border-teal-500 shadow-sm cursor-pointer"
                            >
                                <option value="all">📅 All Time</option>
                                <option value="today">📅 Today</option>
                                <option value="yesterday">📅 Yesterday</option>
                                <option value="last_week">📅 Last Week (7 Days)</option>
                                <option value="this_month">📅 This Month</option>
                                <option value="last_month">📅 Last Month</option>
                                <option value="2_months_back">📅 2 Months Back</option>
                                <option value="3_months_back">📅 3 Months Back</option>
                                <option value="6_months_back">📅 6 Months Back</option>
                                <option value="1_year_back">📅 1 Year Back</option>
                                <option value="custom">📅 Custom Range</option>
                            </select>

                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setDatePreset('custom');
                                        setPage(1);
                                    }}
                                    className="flex-1 sm:w-36 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                                />
                                <span className="text-slate-300 font-bold">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setDatePreset('custom');
                                        setPage(1);
                                    }}
                                    className="flex-1 sm:w-36 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                                />
                            </div>
                        </div>
                        {/* DOCTOR FILTER */}
                        <div className="relative group w-full sm:w-60">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                            <select
                                value={doctorIdFilter}
                                onChange={(e) => setDoctorIdFilter(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm appearance-none"
                            >
                                <option value="all">All Doctors</option>
                                {doctors.map((doc: any) => (
                                    <option key={doc._id} value={doc._id}>
                                        {doc.name || doc.user?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
                        {/* Payment Mode (Online / Offline) Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                            {['all', 'online', 'offline'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPaymentModeFilter(mode as any)}
                                    className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                                        paymentModeFilter === mode 
                                            ? 'bg-white text-slate-900 shadow-md' 
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-6 xl:border-l xl:border-slate-100 xl:pl-6">
                            {/* PAGINATION */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="px-4 py-1.5 text-[11px] font-black text-slate-900 bg-white rounded-lg shadow-sm border border-slate-100 min-w-[60px] text-center">
                                        {page} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                            
                            <div className="flex flex-col shrink-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Total</span>
                                <span className="text-xs font-black text-teal-600 uppercase tracking-tight">{stats.operationVolume} ENTRIES</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    {filteredTransactions.length > 0 ? (
                        <table className="w-full min-w-[1000px] sm:min-w-0 text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-6 text-left">Date</th>
                                    <th className="px-6 py-6 text-left">Time</th>
                                    <th className="px-6 py-6 text-left">Patient Name</th>
                                    <th className="px-6 py-6 text-left">Patient ID</th>
                                    <th className="px-6 py-6 text-left font-bold">Doctor</th>
                                    <th className="px-6 py-6 text-right">Amount (INR)</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-right pr-6">Mode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map((tx: any, index: number) => {
                                    const amount = tx.payment?.amount || tx.amount || 0;
                                    const rawStatus = tx.payment?.status || tx.status || "completed";

                                    // Map payment status: 'paid' or 'completed' -> show as PAID, anything else -> PENDING
                                    // CRITICAL FIX: Also check the populated appointment status (tx.referenceId)
                                    const appointmentPaid = tx.referenceId?.paymentStatus === 'paid' || tx.referenceId?.payment?.paymentStatus === 'paid';
                                    const status = (rawStatus.toLowerCase() === 'paid' || rawStatus.toLowerCase() === 'completed' || appointmentPaid) ? 'completed' : 'pending';

                                    const rawType = tx.type || "appointment_booking";
                                    // 🔧 FIX: Don't use "Emergency Patient" fallback
                                    const patientName = (tx.patientName || tx.patient?.name || tx.referenceId?.patientName || "").toUpperCase();

                                    // Map transaction type to human-readable format
                                    const typeMapping: Record<string, string> = {
                                        'appointment_booking': 'OPD Consultation',
                                        'opd': 'OPD Consultation',
                                        'ipd': 'IPD Admission',
                                        'ipd_advance': 'IPD Advance Payment',
                                        'ipd_bill_payment': 'IPD Due Amount',
                                        'ipd_final_settlement': 'IPD Final Settlement',
                                        'discharge': 'Discharge Settlement',
                                        'lab_test': 'Lab Test',
                                    };
                                    const type = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                                    // Get clinical detail from populated referenceId (appointment/admission data)
                                    const appointmentData = tx.referenceId || {};
                                    const isDischargeTransaction = rawType.toLowerCase() === 'discharge' || rawType.toLowerCase() === 'ipd_final_settlement' || rawType.toLowerCase() === 'ipd_bill_payment';
                                    const isAdvancePayment = rawType.toLowerCase() === 'ipd_advance';

                                    // 🔧 FIX: Prioritize 'reason' over 'diagnosis' for discharge transactions
                                    // For discharge: reason > disease > symptoms (skip diagnosis)
                                    // For others: reason > disease > diagnosis > symptoms

                                    // 🔧 FIX: Amount display logic based on filter type
                                    // - Only show Discharge totals when "Discharge Only" filter is explicitly selected
                                    const displayAmount = amount;

                                    // 🔧 FIX: Removed strict filter that was hiding discharge transactions
                                    // Let all transactions flow through and be rendered based on their available data

                                    // 🔧 FIX: Sanitize doctor name — never show raw ObjectId
                                    const rawDoctorName = tx.doctorName || appointmentData.primaryDoctor || appointmentData.suggestedDoctorName;
                                    const isObjectId = rawDoctorName && rawDoctorName.length === 24 && /^[a-f0-9]{24}$/i.test(rawDoctorName);
                                    const resolvedDoctorName = isObjectId ? null : rawDoctorName;

                                    // 🔍 DEBUG LOGGING - Track transaction data structure
                                    if (isDischargeTransaction) {
                                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                        console.log('🔍 HELPDESK DISCHARGE TRANSACTION DEBUG:', {
                                            transactionId: tx._id || tx.id,
                                            patientName: patientName,
                                            rawType: rawType,
                                            isDischargeTransaction: isDischargeTransaction,
                                            transactionAmount: amount,
                                            referenceIdExists: !!tx.referenceId,
                                            referenceIdType: typeof tx.referenceId,
                                            referenceIdKeys: tx.referenceId ? Object.keys(tx.referenceId) : [],
                                            totalBillAmount: appointmentData.totalBillAmount,
                                            displayAmount: displayAmount,
                                            primaryDoctor: appointmentData.primaryDoctor,
                                            suggestedDoctorName: appointmentData.suggestedDoctorName,
                                            conditionAtDischarge: appointmentData.conditionAtDischarge,
                                            fullReferenceId: tx.referenceId
                                        });
                                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                    }

                                    const txDate = tx.date || tx.createdAt || tx.transactionTime;
                                    const dateStr = txDate ? new Date(txDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                                    const timeStr = txDate ? new Date(txDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

                                    return (
                                        <tr key={tx._id || index} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">{dateStr}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{timeStr}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center font-bold text-sm shadow-sm border shrink-0 ${tx.patientMRN && tx.patientMRN !== 'Resolving...'
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white border-slate-100'
                                                        }`}>
                                                        {patientName.charAt(0)}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[150px]">{patientName}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md inline-block border ${tx.referenceId?.transactionId?.startsWith('OPD') || tx.referenceId?.transactionId?.startsWith('APT')
                                                    ? 'bg-teal-50 text-teal-600 border-teal-100/50'
                                                    : tx.referenceId?.transactionId?.startsWith('IPD') || tx.referenceId?.admissionId
                                                        ? 'bg-rose-50 text-rose-600 border-rose-100/50'
                                                        : 'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {tx.transactionId || tx.receiptNumber || tx.invoiceNumber || tx.referenceId?.appointmentId || tx.referenceId?.transactionId || tx.referenceId?.admissionId || (tx.patientMRN && tx.patientMRN !== 'Resolving...' ? `#${tx.patientMRN}` : "—")}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {resolvedDoctorName ? (
                                                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
                                                            {resolvedDoctorName}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">N/A</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-bold text-slate-900 tracking-tight">
                                                    {amount !== null ? `₹${Math.round(amount).toLocaleString()}` : '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed'
                                                    ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed' ? 'bg-teal-500' : 'bg-rose-500'}`} />
                                                    {status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200 shadow-sm">
                                                    <CreditCard size={12} className="text-slate-400" />
                                                    {tx.paymentMode || tx.paymentMethod || 'CASH'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20 text-center">
                            <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No financial objects indexed</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* EXPORT MODAL */}
            {showExportCard && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Export Ledger</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Date Range & Type</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExportCard(false)}
                                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Date Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['all', 'online', 'offline'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setExportType(t)}
                                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${exportType === t
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => handleExport()}
                                    disabled={exporting}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {exporting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            GENERATING SHEET...
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={18} />
                                            DOWNLOAD EXCEL SHEET
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 px-6 py-4 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">System optimized for high-volume ledger exports</p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}