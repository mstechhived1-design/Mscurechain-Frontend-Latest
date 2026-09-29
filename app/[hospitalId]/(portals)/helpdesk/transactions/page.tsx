'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    CreditCard,
    Search,
    ArrowLeft,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Activity,
    Printer,
    FlaskConical,
    Banknote,
    BadgeIndianRupee,
    IndianRupee,
    TrendingUp,
    Download,
    Package,
    Calendar,
} from "lucide-react";
import { helpdeskService, ipdService } from "@/lib/integrations";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import toast from "react-hot-toast";
import Link from "next/link";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useTransactions } from "@/lib/integrations/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import EditTransactionModal from './EditTransactionModal';
import { formatTime12Hr } from '@/lib/print-utils';
import { getDateRangeForPreset } from '@/lib/utils/date-utils';

export const formatPaymentMode = (tx: any) => {
    const mode = (tx.paymentMethod || tx.paymentMode || 'CASH').toUpperCase();
    if (mode === 'MIXED') {
        const details = [];
        // Search deeply for payment details
        const detailsObj = tx.paymentDetails || 
                          tx.payment?.paymentDetails || 
                          tx.referenceId?.paymentDetails || 
                          tx.referenceId?.payment?.paymentDetails || 
                          {};

        const cash = Number(detailsObj.cash) || 0;
        const card = Number(detailsObj.card) || 0;
        const upi = Number(detailsObj.upi) || 0;
        const bank = Number(detailsObj.bankTransfer || detailsObj.bank) || 0;
        
        if (cash > 0) details.push(`Cash: ₹${cash.toLocaleString('en-IN')}`);
        if (upi > 0) details.push(`UPI: ₹${upi.toLocaleString('en-IN')}`);
        if (card > 0) details.push(`Card: ₹${card.toLocaleString('en-IN')}`);
        if (bank > 0) details.push(`Bank: ₹${bank.toLocaleString('en-IN')}`);
        
        if (details.length > 0) {
            return `MIXED (${details.join(', ')})`;
        }
    }
    return mode;
};

const getPatientNameWithPrefix = (tx: any) => {
    const rawPatientName = tx.patientName || tx.patient?.name || tx.referenceId?.patientName || "Unknown";
    const honorific = tx.patient?.honorific || tx.patient?.profile?.honorific || tx.referenceId?.honorific || tx.referenceId?.patientHonorific || tx.honorific || "";
    if (honorific) {
        const up = honorific.toUpperCase();
        const prefix = ["MR", "MRS", "MS", "DR"].includes(up) ? `${up}.` : up;
        return `${prefix} ${rawPatientName.toUpperCase()}`.trim();
    }
    return rawPatientName.toUpperCase();
};
export default function TransactionsPage() {
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [page, setPage] = useState(1);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all"); // Default to 'all' as requested
    const [ipdPaymentType, setIpdPaymentType] = useState<'all' | 'advance' | 'discharge'>('all');
    const [datePreset, setDatePreset] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [hospital, setHospital] = useState<any>(null);
    const [showEditedOnly, setShowEditedOnly] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);

    // Fetch hospital branding for receipts
    useEffect(() => {
        hospitalAdminService.getHospital().then(res => setHospital(res?.hospital)).catch(() => {});
    }, []);

    // Helper: switch tabs without page reload
    const switchTab = (tab: string) => {
        setTypeFilter(tab);
        setPage(1);
    };
    const limit = 10;

    // Map frontend filter values to backend transaction types
    const getBackendTypeFilter = (filterValue: string): string | undefined => {
        if (filterValue === 'all') {
            return 'appointment_booking,consultation,ipd_advance,ipd,ipd_refund,ipd_admission_fee,ipd_bill_payment,ipd_final_settlement,discharge,lab_test';
        }

        const typeMap: Record<string, string> = {
            'opd': 'appointment_booking,consultation',
            'ipd': ipdPaymentType === 'advance' ? 'ipd_advance,ipd_refund' : ipdPaymentType === 'discharge' ? 'discharge,ipd_final_settlement,ipd_bill_payment' : 'ipd_advance,ipd,ipd_refund,ipd_admission_fee,ipd_bill_payment,ipd_final_settlement,discharge',
            'lab': 'lab_test',
        };

        return typeMap[filterValue] || filterValue;
    };

    const { data: txRaw, isLoading, isFetching, refetch } = useTransactions(
        page,
        limit,
        undefined,
        false,
        startDate,
        endDate,
        getBackendTypeFilter(typeFilter),
        showEditedOnly,
        debouncedSearch
    );

    // 🔄 LIVE UPDATE: Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { refetch(); }, 30000);
        return () => clearInterval(interval);
    }, [refetch]);

    // ✅ DEBUG LOGGING: Track filtering and data retrieval
    React.useEffect(() => {
        console.log("[Transactions] Type Filter:", typeFilter, "IPD Type:", ipdPaymentType);
        console.log("[Transactions] Backend Filter Query:", getBackendTypeFilter(typeFilter));
    }, [typeFilter, ipdPaymentType]);

    const { transactions, total, totalRevenue } = useMemo(() => {
        const raw: any = txRaw;
        if (!raw) return { transactions: [] as any[], total: 0, totalRevenue: 0 };

        console.log("[Transactions] Raw Data Received:", {
            resultCount: Array.isArray(raw) ? raw.length : (raw.data?.length || 0),
            totalInDB: raw.pagination?.total
        });

        if (Array.isArray(raw)) return { transactions: raw, total: raw.length, totalRevenue: 0 };
        return {
            transactions: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
            totalRevenue: raw.totalRevenue || 0
        };
    }, [txRaw]);

    const handleExport = async (range: "daily" | "weekly" | "monthly" | "all") => {
        try {
            setExporting(true);
            setShowExportMenu(false);

            // Fetch ALL transactions for the selected range, passing date range and type filters from UI
            const data = await helpdeskService.getTransactions(
                1,
                1000,
                range === "all" ? undefined : range,
                true,
                startDate || undefined,
                endDate || undefined,
                getBackendTypeFilter(typeFilter)
            );
            let exportData = Array.isArray(data) ? data : (data.data || []);
            exportData = exportData.filter((tx: any) => {
                const isCancelled = tx.status?.toLowerCase() === 'cancelled' || tx.referenceId?.status?.toLowerCase() === 'cancelled';
                const isPharmacy = tx.type?.toLowerCase().includes('pharma') || tx.type?.toLowerCase().includes('pharmacy');
                return !isCancelled && !isPharmacy;
            });

            if (exportData.length === 0) {
                toast.error("No data found for the selected period");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Transactions");

            // Define Columns
            worksheet.columns = [
                { header: "DATE", key: "date" },
                { header: "PATIENT NAME", key: "patient" },
                { header: "MOBILE", key: "mobile" },
                { header: "SERVICE TYPE", key: "type" },
                { header: "AMOUNT (INR)", key: "amount" },
                { header: "PAYMENT MODE", key: "mode" },
                { header: "STATUS", key: "status" }
            ];

            // 1. BRANDING HEADER
            worksheet.mergeCells("A1:G1");
            const titleCell = worksheet.getCell("A1");
            titleCell.value = `${(hospital?.name || "CureChain").toUpperCase()} REVENUE LEDGER`;
            titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
            titleCell.alignment = { vertical: "middle", horizontal: "center" };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } } as ExcelJS.Fill;
            worksheet.getRow(1).height = 40;

            // 2. REPORT METADATA
            worksheet.mergeCells("A2:G2");
            const metaCell = worksheet.getCell("A2");
            const finalStart = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "INCEPTION";
            const finalEnd = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
            const periodText = `PERIOD: ${finalStart} TO ${finalEnd}`;
            const typeText = `SCOPE: ${typeFilter.toUpperCase()} CHANNEL`;
            const generatedText = `GENERATED ON: ${new Date().toLocaleString()}`;
            metaCell.value = `${periodText}  |  ${typeText}  |  ${generatedText}`;
            metaCell.font = { bold: true, size: 10, color: { argb: "475569" } };
            metaCell.alignment = { vertical: "middle", horizontal: "center" };
            metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } } as ExcelJS.Fill;
            worksheet.getRow(2).height = 25;

            // Spacer
            worksheet.getRow(3).height = 10;

            // 3. TABLE HEADERS (Row 4)
            const headerRow = worksheet.getRow(4);
            headerRow.values = ["DATE", "PATIENT NAME", "MOBILE", "SERVICE TYPE", "AMOUNT (INR)", "PAYMENT MODE", "STATUS"];
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } } as ExcelJS.Fill;
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });
            headerRow.height = 30;

            // 4. ADD DATA & APPLY ALTERNATING COLORS
            exportData.forEach((tx: any, index: number) => {
                const txDate = tx.date || tx.createdAt || tx.transactionTime;
                const formattedDate = txDate
                    ? new Date(txDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                const typeMapping: Record<string, string> = {
                    'appointment_booking': 'OPD Consultation',
                    'opd': 'OPD Consultation',
                    'ipd': 'IPD Admission',
                    'ipd_advance': 'IPD Advance Payment',
                    'ipd_final_settlement': 'IPD Final Settlement',
                    'discharge': 'Discharge Settlement',
                    'package': 'Package Billed'
                };
                const rawType = tx.type || 'appointment_booking';
                const serviceType = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                const row = worksheet.addRow({
                    date: formattedDate,
                    patient: getPatientNameWithPrefix(tx),
                    mobile: tx.patientMobile || tx.mobile || "N/A",
                    type: serviceType,
                    amount: tx.amount || 0,
                    mode: (tx.paymentMethod || tx.paymentMode || "CASH").toUpperCase(),
                    status: tx.status.toUpperCase()
                });

                row.eachCell((cell, colNumber) => {
                    cell.font = { size: 10, color: { argb: "1E293B" } };
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                    } else {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                    }
                    if (colNumber === 7) {
                        cell.alignment = { vertical: "middle", horizontal: "center" };
                    }
                });
            });

            // 5. CALCULATE STATS & BREAKDOWNS
            const stats = exportData.reduce((acc: any, tx: any) => {
                const amount = tx.amount || 0;
                const rawMethod = (tx.paymentMethod || tx.paymentMode || 'CASH').toUpperCase();
                
                if (rawMethod === "CASH") acc.cashRevenue += amount;
                else if (["UPI", "GPAY", "PHONEPE"].includes(rawMethod)) acc.upiRevenue += amount;
                else if (["CARD", "VISA", "MASTERCARD"].includes(rawMethod)) acc.cardRevenue += amount;
                else acc.otherRevenue += amount;
                
                acc.totalRevenue += amount;

                const rawType = (tx.type || 'appointment_booking').toLowerCase();
                if (rawType.includes('opd') || rawType.includes('appointment')) acc.opdCount++;
                else if (rawType.includes('ipd') || rawType.includes('discharge')) acc.ipdCount++;
                else if (rawType.includes('lab')) acc.labCount++;
                else acc.otherCount++;

                return acc;
            }, { totalRevenue: 0, cashRevenue: 0, upiRevenue: 0, cardRevenue: 0, otherRevenue: 0, opdCount: 0, ipdCount: 0, labCount: 0, otherCount: 0 });

            // 6. SUMMARY DASHBOARD
            worksheet.addRow({});
            const lastRowNum = worksheet.lastRow?.number || 0;
            const summaryStartRow = lastRowNum + 1;
            worksheet.mergeCells(`A${summaryStartRow}:G${summaryStartRow}`);
            const summaryTitle = worksheet.getCell(`A${summaryStartRow}`);
            summaryTitle.value = "FINANCIAL & OPERATIONAL SUMMARY";
            summaryTitle.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
            summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } } as ExcelJS.Fill;
            summaryTitle.alignment = { horizontal: "center" };

            const summaryRows = [
                ["GROSS TOTAL REVENUE", stats.totalRevenue, "", "OPD CONSULTATIONS", stats.opdCount, "CASES", ""],
                ["CASH REVENUE", stats.cashRevenue, "", "IPD ADMISSIONS/BILLS", stats.ipdCount, "CASES", ""],
                ["UPI REVENUE", stats.upiRevenue, "", "LAB DIAGNOSTICS", stats.labCount, "CASES", ""],
                ["CARD REVENUE", stats.cardRevenue, "", "OTHER SERVICES", stats.otherCount, "CASES", ""],
                ["OTHER REVENUE", stats.otherRevenue, "", "", "", "", ""]
            ];

            summaryRows.forEach((rowData) => {
                const row = worksheet.addRow(rowData);
                
                // Left side styling (Financial)
                const finLabelCell = row.getCell(1);
                const finValCell = row.getCell(2);
                if (finLabelCell.value) {
                    finLabelCell.font = { bold: true, size: 10, color: { argb: "475569" } };
                    finValCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                    finValCell.numFmt = '"₹"#,##0.00';
                    
                    if (finLabelCell.value.toString().includes("GROSS")) {
                        finLabelCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                        finLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                        finValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                    }
                }
                
                // Right side styling (Operational)
                const opLabelCell = row.getCell(4);
                const opValCell = row.getCell(5);
                if (opLabelCell.value) {
                    opLabelCell.font = { bold: true, size: 10, color: { argb: "475569" } };
                    opValCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                }
            });

            // 7. DYNAMIC COLUMN WIDTHS
            worksheet.columns.forEach((column: any) => {
                let maxLen = 0;
                column.eachCell({ includeEmpty: true }, (cell: any) => {
                    if (cell.row < 4) return; // Skip title and metadata rows
                    const value = cell.value ? cell.value.toString() : '';
                    if (value.length > maxLen) {
                        maxLen = value.length;
                    }
                });
                column.width = maxLen < 12 ? 12 : maxLen + 3;
            });

            // Generate File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `CureChain_Revenue_${range.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`${range.toUpperCase()} manifest exported successfully`);
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Export Failed");
        } finally {
            setExporting(false);
        }
    };

    const handleExportCategorized = async (range: "daily" | "weekly" | "monthly" | "all") => {
        try {
            setExporting(true);
            setShowExportMenu(false);

            // Fetch ALL transactions for the selected range, passing date range and type filters from UI
            const data = await helpdeskService.getTransactions(
                1,
                1000,
                range === "all" ? undefined : range,
                true,
                startDate || undefined,
                endDate || undefined,
                getBackendTypeFilter(typeFilter)
            );
            let exportData = Array.isArray(data) ? data : (data.data || []);
            exportData = exportData.filter((tx: any) => {
                const isCancelled = tx.status?.toLowerCase() === 'cancelled' || tx.referenceId?.status?.toLowerCase() === 'cancelled';
                const isPharmacy = tx.type?.toLowerCase().includes('pharma') || tx.type?.toLowerCase().includes('pharmacy');
                return !isCancelled && !isPharmacy;
            });

            if (exportData.length === 0) {
                toast.error("No data found for the selected period");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Categorized Transactions");

            // Define Columns
            worksheet.columns = [
                { header: "DATE", key: "date" },
                { header: "PATIENT NAME", key: "patient" },
                { header: "MOBILE", key: "mobile" },
                { header: "SERVICE TYPE", key: "type" },
                { header: "AMOUNT (INR)", key: "amount" },
                { header: "PAYMENT MODE", key: "mode" },
                { header: "STATUS", key: "status" }
            ];

            // 1. BRANDING HEADER
            worksheet.mergeCells("A1:G1");
            const titleCell = worksheet.getCell("A1");
            titleCell.value = `${(hospital?.name || "CureChain").toUpperCase()} CATEGORIZED REVENUE LEDGER`;
            titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
            titleCell.alignment = { vertical: "middle", horizontal: "center" };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } } as ExcelJS.Fill;
            worksheet.getRow(1).height = 40;

            // 2. REPORT METADATA
            worksheet.mergeCells("A2:G2");
            const metaCell = worksheet.getCell("A2");
            const finalStart = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "INCEPTION";
            const finalEnd = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
            const periodText = `PERIOD: ${finalStart} TO ${finalEnd}`;
            const typeText = `SCOPE: CATEGORIZED CHANNELS`;
            const generatedText = `GENERATED ON: ${new Date().toLocaleString()}`;
            metaCell.value = `${periodText}  |  ${typeText}  |  ${generatedText}`;
            metaCell.font = { bold: true, size: 10, color: { argb: "475569" } };
            metaCell.alignment = { vertical: "middle", horizontal: "center" };
            metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } } as ExcelJS.Fill;
            worksheet.getRow(2).height = 25;

            // Spacer
            worksheet.addRow({});
            worksheet.getRow(3).height = 10;

            // Split Data into Categories
            const opdData: any[] = [];
            const ipdData: any[] = [];
            const labData: any[] = [];
            const pharmaData: any[] = [];

            const typeMapping: Record<string, string> = {
                'appointment_booking': 'OPD Consultation',
                'opd': 'OPD Consultation',
                'ipd': 'IPD Admission',
                'ipd_advance': 'IPD Advance Payment',
                'ipd_bill_payment': 'IPD Due Amount',
                'ipd_final_settlement': 'IPD Final Settlement',
                'discharge': 'Discharge Settlement',
                'lab_test': 'Lab Test',
                'package': 'Package Billed',
            };

            exportData.forEach((tx: any) => {
                const rawType = (tx.type || 'appointment_booking').toLowerCase();
                if (rawType.includes('opd') || rawType.includes('appointment')) {
                    opdData.push(tx);
                } else if (rawType.includes('ipd') || rawType.includes('discharge') || rawType.includes('admission') || rawType.includes('package') || rawType.includes('bill_payment')) {
                    ipdData.push(tx);
                } else if (rawType.includes('lab')) {
                    labData.push(tx);
                } else {
                    pharmaData.push(tx);
                }
            });

            const getGroupStats = (group: any[]) => {
                let total = 0;
                let cash = 0;
                let upi = 0;
                let card = 0;
                let other = 0;
                group.forEach(tx => {
                    const amount = tx.amount || 0;
                    total += amount;
                    const mode = (tx.paymentMethod || tx.paymentMode || "CASH").toUpperCase();
                    if (mode === "CASH") cash += amount;
                    else if (["UPI", "GPAY", "PHONEPE"].includes(mode)) upi += amount;
                    else if (["CARD", "VISA", "MASTERCARD"].includes(mode)) card += amount;
                    else other += amount;
                });
                return { total, cash, upi, card, other };
            };

            const addCategoryBlock = (title: string, data: any[], grandStats?: any) => {
                if (data.length === 0) return;

                // Category Title Row
                const blockTitleRow = worksheet.addRow([`${title} PAYMENTS`]);
                worksheet.mergeCells(`A${blockTitleRow.number}:G${blockTitleRow.number}`);
                const blockTitleCell = blockTitleRow.getCell(1);
                blockTitleCell.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
                blockTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "334155" } } as ExcelJS.Fill;
                blockTitleCell.alignment = { horizontal: "center", vertical: "middle" };
                blockTitleRow.height = 28;

                // Headers Row
                const headerRow = worksheet.addRow(["DATE", "PATIENT NAME", "MOBILE", "SERVICE TYPE", "AMOUNT (INR)", "PAYMENT MODE", "STATUS"]);
                headerRow.eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "475569" } } as ExcelJS.Fill;
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                });
                headerRow.height = 24;

                // Data Rows
                data.forEach((tx: any, index: number) => {
                    const txDate = tx.date || tx.createdAt || tx.transactionTime;
                    const formattedDate = txDate
                        ? new Date(txDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'N/A';

                    const rawType = tx.type || 'appointment_booking';
                    const serviceType = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();
                    const amount = tx.amount || 0;
                    const rawStatus = tx.payment?.status || tx.status || "completed";
                    const appointmentPaid = tx.referenceId?.paymentStatus === 'paid' || tx.referenceId?.payment?.paymentStatus === 'paid';
                    const status = (rawStatus.toLowerCase() === 'paid' || rawStatus.toLowerCase() === 'completed' || appointmentPaid) ? 'PAID' : 'PENDING';

                    const row = worksheet.addRow({
                        date: formattedDate,
                        patient: (tx.patientName || tx.patient?.name || tx.referenceId?.patientName || 'Unknown').toUpperCase(),
                        mobile: tx.patientMobile || tx.mobile || "N/A",
                        type: serviceType,
                        amount: amount,
                        mode: (tx.paymentMethod || tx.paymentMode || "CASH").toUpperCase(),
                        status: status
                    });

                    row.eachCell((cell, colNumber) => {
                        cell.font = { size: 9, color: { argb: "1E293B" } };
                        cell.alignment = { vertical: "middle", horizontal: "left" };
                        if (index % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                        } else {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        }
                        if (colNumber === 7) {
                            cell.alignment = { vertical: "middle", horizontal: "center" };
                        }
                    });
                });

                // Spacing Row
                worksheet.addRow({});

                // Stats Dashboard
                const stats = getGroupStats(data);
                const statsRows = [
                    [
                        grandStats ? "GRAND TOTAL REVENUE" : "",
                        grandStats ? grandStats.total : "",
                        "",
                        "TOTAL CATEGORY REVENUE",
                        stats.total,
                        "",
                        ""
                    ],
                    [
                        grandStats ? "GRAND TOTAL CASH" : "",
                        grandStats ? grandStats.cash : "",
                        "",
                        "CASH PAYMENTS",
                        stats.cash,
                        "",
                        ""
                    ],
                    [
                        grandStats ? "GRAND TOTAL UPI" : "",
                        grandStats ? grandStats.upi : "",
                        "",
                        "UPI PAYMENTS",
                        stats.upi,
                        "",
                        ""
                    ],
                    [
                        grandStats ? "GRAND TOTAL CARD" : "",
                        grandStats ? grandStats.card : "",
                        "",
                        "CARD PAYMENTS",
                        stats.card,
                        "",
                        ""
                    ],
                    [
                        grandStats ? "GRAND TOTAL OTHER" : "",
                        grandStats ? grandStats.other : "",
                        "",
                        "OTHER PAYMENTS",
                        stats.other,
                        "",
                        ""
                    ]
                ];

                statsRows.forEach((rowData) => {
                    const row = worksheet.addRow(rowData);
                    
                    // Left side styling (Grand Totals)
                    const grandLabelCell = row.getCell(1);
                    const grandValCell = row.getCell(2);
                    if (grandLabelCell.value) {
                        grandLabelCell.font = { bold: true, size: 9, color: { argb: "0F172A" } };
                        grandValCell.font = { bold: true, size: 10, color: { argb: "0F172A" } };
                        grandValCell.numFmt = '"₹"#,##0.00';
                        if (grandLabelCell.value.toString().includes("REVENUE")) {
                            grandLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } } as ExcelJS.Fill;
                            grandValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } } as ExcelJS.Fill;
                        }
                    }

                    // Right side styling (Category Stats)
                    const labelCell = row.getCell(4);
                    const valCell = row.getCell(5);
                    if (labelCell.value) {
                        labelCell.font = { bold: true, size: 9, color: { argb: "475569" } };
                        valCell.font = { bold: true, size: 10, color: { argb: "0F172A" } };
                        valCell.numFmt = '"₹"#,##0.00';
                        if (labelCell.value.toString().includes("TOTAL")) {
                            labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                            valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } as ExcelJS.Fill;
                        }
                    }
                });

                // Two rows gap
                worksheet.addRow({});
                worksheet.addRow({});
            };

            const grandStats = getGroupStats(exportData);
            const activeCategories: { title: string; data: any[] }[] = [
                { title: "OPD Consultation", data: opdData },
                { title: "IPD Admission", data: ipdData },
                { title: "Lab Test", data: labData },
                { title: "Pharmacy & Other", data: pharmaData }
            ].filter(cat => cat.data.length > 0);

            activeCategories.forEach((cat, index) => {
                const isLast = index === activeCategories.length - 1;
                addCategoryBlock(cat.title, cat.data, isLast ? grandStats : undefined);
            });

            // Dynamic Column Widths
            worksheet.columns.forEach((column: any) => {
                let maxLen = 0;
                column.eachCell({ includeEmpty: true }, (cell: any) => {
                    if (cell.row < 4) return; // Skip title and metadata
                    const val = cell.value ? cell.value.toString() : '';
                    if (val.includes("PAYMENTS") || val.includes("REVENUE") || val.includes("SUMMARY")) return;
                    if (val.length > maxLen) {
                        maxLen = val.length;
                    }
                });
                column.width = maxLen < 12 ? 12 : maxLen + 3;
            });

            // Generate File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `CureChain_Revenue_Categorized_${range.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`Categorized manifest exported successfully`);
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Export Failed");
        } finally {
            setExporting(false);
        }
    };

    const filteredTransactions = transactions.filter((tx: any) => {
        const isCancelled = tx.status?.toLowerCase() === 'cancelled' || tx.referenceId?.status?.toLowerCase() === 'cancelled';
        const isPharmacy = tx.type?.toLowerCase().includes('pharma') || tx.type?.toLowerCase().includes('pharmacy');
        return !isCancelled && !isPharmacy;
    });

    // Calculate stats based on filtered transactions
    const stats = useMemo(() => {
        const grossRevenue = totalRevenue;
        const operationVolume = total;
        const quantumDensity = total > 0 ? (totalRevenue / total) : 0;
        return { grossRevenue, operationVolume, quantumDensity };
    }, [totalRevenue, total]);

    // 🖨️ PRINT: Single transaction receipt
    const handlePrintTransaction = async (tx: any) => {
        const win = window.open('', '_blank');
        if (!win) { toast.error('Please allow popups to print'); return; }

        const h = hospital || {};
        const honorific = tx.patient?.honorific || tx.patient?.profile?.honorific || tx.referenceId?.honorific || tx.referenceId?.patientHonorific || tx.honorific || tx.patientPrefix || tx.patientDetails?.honorific || "";
        const rawPatientName = tx.patientName || tx.patient?.name || tx.referenceId?.patientName || "Unknown";
        const upHonorific = honorific ? honorific.toUpperCase() : "";
        const prefixStr = ["MR", "MRS", "MS", "DR"].includes(upHonorific) ? `${upHonorific}.` : upHonorific;
        const patientName = `${prefixStr} ${rawPatientName}`.trim().toUpperCase();
        
        const pAge = tx.patientDetails?.age || tx.patientId?.age || tx.patient?.age || tx.patient?.profile?.age;
        const pDob = tx.patientDetails?.dateOfBirth || tx.patientId?.dateOfBirth || tx.patient?.dob || tx.patient?.profile?.dob;
        const patientAgeRaw = pAge || (pDob ? Math.floor((Date.now() - new Date(pDob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : '');
        const patientGenderRaw = tx.patientDetails?.gender || tx.patientId?.gender || tx.patient?.gender || tx.patient?.profile?.gender || '';
        const patientGender = patientGenderRaw ? patientGenderRaw.charAt(0).toUpperCase() + patientGenderRaw.slice(1) : '';
        const ageGenderDisplay = [patientAgeRaw ? `${patientAgeRaw}Y` : '', patientGender].filter(Boolean).join(" / ") || "N/A";
        
        const amount = tx.payment?.amount || tx.amount || 0;
        const rawType = tx.type || 'appointment_booking';
        const typeMapping: Record<string, string> = {
            'appointment_booking': 'OPD Consultation',
            'opd': 'OPD Consultation',
            'ipd': 'IPD Admission',
            'ipd_advance': 'IPD Advance Payment',
            'ipd_bill_payment': 'IPD Bill Payment',
            'ipd_final_settlement': 'IPD Final Settlement',
            'discharge': 'Discharge Settlement',
            'lab_test': 'Lab Diagnostic',
            'package': 'Package Billed',
        };
        const serviceType = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();
        const isIPD = rawType.toLowerCase().includes('ipd') || rawType.toLowerCase() === 'discharge';
        const isLab = rawType.toLowerCase() === 'lab_test';
        const apptData = tx.referenceId || {};
        const headerHtml = renderToStaticMarkup(
            <MainHeader initialDetails={{ name: h.name || 'Hospital', address: h.address || '', phone: h.phone || h.mobile || '', email: h.email || '', logo: h.logo }} />
        );
        const footerHtml = renderToStaticMarkup(
            <MainFooter initialDetails={{ name: h.name || 'Hospital', address: h.address || '', phone: h.phone || h.mobile || '', email: h.email || '' }} />
        );
        const explicitTime = tx.appointmentTime || tx.time || apptData.appointmentTime || apptData.time || apptData.startTime;
        const rawDate = tx.createdAt || apptData.createdAt || apptData.bookedAt || tx.bookedAt || tx.payment?.date || tx.transactionTime || tx.date || new Date();
        const dateObj = new Date(rawDate);

        let formattedDate = 'N/A';
        if (!isNaN(dateObj.getTime())) {
            const datePart = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            let timePart = '';
            if (explicitTime) {
                timePart = formatTime12Hr(explicitTime);
            } else {
                const isMidnightUtc = dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0;
                if (!isMidnightUtc) {
                    timePart = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                } else {
                    timePart = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                }
            }
            formattedDate = `${datePart}, ${timePart}`;
        }

        // Auto-detect discount: from stored fields OR by comparing test totals vs amount paid
        let computedTestsTotal = 0;
        let missingCostCount = 0;
        if (isLab) {
            const testsArray = apptData.tests || tx.tests || [];
            if (testsArray.length > 0) {
                testsArray.forEach((t: any) => {
                     const c = t.cost || t.price || t.unitCost || t.amount || 0;
                     if (c > 0) computedTestsTotal += c;
                     else missingCostCount++;
                });
            }
        }
        const storedDiscount = tx.discountAmount || apptData.discountAmount || 0;
        const inferredDiscount = (computedTestsTotal > 0 && computedTestsTotal > amount) ? Math.round(computedTestsTotal - amount) : 0;
        const txDiscount = storedDiscount > 0 ? storedDiscount : inferredDiscount;
        const txSubtotal = tx.subtotal || apptData.subtotal || (txDiscount > 0 ? (amount + txDiscount) : amount);
        const txDiscountReason = tx.discountReason || apptData.discountReason || '';

        let labTestsHtml = '';
        if (isLab) {
            const testsArray = apptData.tests || tx.tests || [];
            if (testsArray.length > 0) {
                const remainingAmount = Math.max(0, txSubtotal - computedTestsTotal);
                const distributedCost = missingCostCount > 0 ? (remainingAmount / missingCostCount) : 0;

                labTestsHtml = `<div style="margin:15px 0;"><p style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">Test Details (Total: ${testsArray.length})</p>`;
                testsArray.forEach((t: any) => {
                    const tName = t.name || t.testName || t.investigationName || 'Unknown Test';
                    let tCost = t.cost || t.price || t.unitCost || t.amount || 0;
                    if (tCost === 0) tCost = distributedCost;
                    if(tName) {
                       labTestsHtml += `<div class="breakdown-row"><span>${tName}</span><span style="font-weight: 900;">${tCost > 0 ? `₹${Math.round(tCost).toLocaleString('en-IN')}` : '-'}</span></div>`;
                    }
                });
                labTestsHtml += `</div>`;
            } else {
                const fallbackTestName = apptData.testName || apptData.labTest?.name || apptData.description || 'Lab Diagnostics';
                labTestsHtml = `<div style="margin:15px 0;"><p style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">Test Details (Total: 1)</p>
                <div class="breakdown-row"><span>${fallbackTestName}</span><span style="font-weight: 900;">₹${Math.round(amount).toLocaleString('en-IN')}</span></div></div>`;
            }
        }

        let ipdBreakdownHtml = '';
        if (isIPD && apptData.admissionId) {
            try {
                // We dynamically fetch the latest actual IPD bill summary for accurate breakdown
                const summary = await ipdService.getBillSummary(apptData.admissionId);
                if (summary && summary.financials) {
                    const f = summary.financials;
                    ipdBreakdownHtml = `
                    <div style="margin:15px 0;"><p style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">IPD Financial Breakdown</p>
                        <div class="breakdown-row"><span>Total Bill Amount</span><span>₹${Math.round(f.totalBill || 0).toLocaleString('en-IN')}</span></div>
                        <div class="breakdown-row"><span>Advance Paid</span><span style="color:#16a34a;">₹${Math.round(f.totalAdvance || 0).toLocaleString('en-IN')}</span></div>
                        ${f.discount > 0 ? `<div class="breakdown-row"><span>Discount</span><span style="color:#16a34a;">₹${Math.round(f.discount || 0).toLocaleString('en-IN')}</span></div>` : ''}
                        <div class="breakdown-row total" style="padding-top:12px;border-top:1px solid #f1f5f9;"><span>${f.balance < 0 ? 'Overpaid' : 'Balance Due'}</span><span style="color:${f.balance > 0 ? '#e11d48' : '#16a34a'};">₹${Math.round(Math.abs(f.balance || 0)).toLocaleString('en-IN')}</span></div>
                    </div>`;
                }
            } catch (err) {
                console.error("Failed to fetch IPD summary for receipt", err);
            }
        }
        
        // Fallback if fetch fails or is older transaction style
        if (!ipdBreakdownHtml && isIPD && (apptData.totalBillAmount || apptData.advanceAmount || apptData.dueAmount)) {
            ipdBreakdownHtml = `
            <div style="margin:15px 0;"><p style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">IPD Financial Breakdown</p>
                ${apptData.totalBillAmount ? `<div class="breakdown-row"><span>Total Bill Amount</span><span>₹${Math.round(apptData.totalBillAmount || 0).toLocaleString('en-IN')}</span></div>` : ''}
                ${apptData.advanceAmount ? `<div class="breakdown-row"><span>Advance Paid</span><span style="color:#16a34a;">₹${Math.round(apptData.advanceAmount || 0).toLocaleString('en-IN')}</span></div>` : ''}
                ${apptData.dueAmount ? `<div class="breakdown-row total" style="padding-top:12px;border-top:1px solid #f1f5f9;"><span>Balance Due</span><span style="color:#e11d48;">₹${Math.round(apptData.dueAmount || 0).toLocaleString('en-IN')}</span></div>` : ''}
            </div>`;
        }

        const doctorNameToPrint = apptData.doctorName || apptData.primaryDoctor || apptData.suggestedDoctorName || apptData.prescribingDoctor || apptData.referredBy || tx.doctorName || '';
        const isValidDoctor = doctorNameToPrint && doctorNameToPrint !== '-' && doctorNameToPrint.toLowerCase() !== 'n/a' && !/^[a-f0-9]{24}$/i.test(doctorNameToPrint);

        let financialBreakdownHtml = '';
        if (txDiscount > 0) {
            financialBreakdownHtml = `
            <div style="margin: 15px 0; padding: 12px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px;">
                <div class="breakdown-row"><span>Subtotal</span><span style="font-weight: 700;">₹${Math.round(txSubtotal).toLocaleString('en-IN')}</span></div>
                <div class="breakdown-row" style="color: #059669; font-weight: 700;">
                    <span>Discount ${txDiscountReason ? `(${txDiscountReason})` : ''}</span>
                    <span>- ₹${Math.round(txDiscount).toLocaleString('en-IN')}</span>
                </div>
                <div class="breakdown-row total" style="padding-top: 8px; border-top: 1.5px solid #cbd5e1; font-weight: 900;">
                    <span>Net Amount Paid</span>
                    <span style="color: #059669; font-size: 14px;">₹${Math.round(amount).toLocaleString('en-IN')}</span>
                </div>
            </div>`;
        }

        const receiptHtml = `<!DOCTYPE html><html><head><title>Receipt - ${patientName}</title><style>
            body{font-family:'Segoe UI',system-ui,sans-serif;padding:20px;color:#1e293b;background:#fff;font-size:12px;}
            .badge{display:inline-block;padding:4px 10px;border-radius:6px;font-weight:900;font-size:10px;text-transform:uppercase;letter-spacing:1px;}
            .badge-opd{background:#f0fdf4;color:#16a34a;border:1px solid #dcfce7;}
            .badge-ipd{background:#fff1f2;color:#e11d48;border:1px solid #ffe4e6;}
            .badge-lab{background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;}
            .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:15px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;margin:20px 0;}
            .info-item .label{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:1px;}
            .info-item .value{font-size:13px;font-weight:900;color:#1e293b;margin-top:2px;}
            .amount-box{background:#0f172a;color:#fff;border-radius:12px;padding:20px;text-align:center;margin:20px 0;}
            .amount-box .label{font-size:10px;color:rgba(255,255,255,0.5);font-weight:900;text-transform:uppercase;letter-spacing:2px;}
            .amount-box .amount{font-size:36px;font-weight:900;letter-spacing:-1px;color:#2dd4bf;margin:6px 0;}
            .breakdown-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:11px;}
            .breakdown-row.total{font-weight:900;font-size:13px;color:#0f172a;border-bottom:none;}
            .mode-badge{display:inline-block;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:4px 10px;border-radius:6px;font-weight:900;font-size:10px;text-transform:uppercase;}
            @media print{body{padding:0;}@page{margin:1cm;}}
        </style></head><body>
        <div id="print-header">${headerHtml}</div>
        <div style="text-align:center;margin:15px 0 20px;"><h2 style="font-size:18px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:2px;">Payment Receipt</h2><span class="badge badge-${isIPD ? 'ipd' : isLab ? 'lab' : 'opd'}">${serviceType}</span></div>
        <div class="info-grid">
            <div class="info-item"><div class="label">Patient Name</div><div class="value">${patientName}</div></div>
            <div class="info-item"><div class="label">Age/Sex</div><div class="value">${ageGenderDisplay}</div></div>
            <div class="info-item"><div class="label">Reference / ID</div><div class="value" style="font-family:monospace;font-size:11px;">${tx.transactionId || tx.receiptNumber || apptData.transactionId || apptData.admissionId || apptData.appointmentId || '—'}</div></div>
            <div class="info-item"><div class="label">Date & Time</div><div class="value">${formattedDate}</div></div>
            <div class="info-item"><div class="label">Payment Mode</div><div class="value"><span class="mode-badge">${formatPaymentMode(tx)}</span></div></div>
            ${apptData.admissionId ? `<div class="info-item"><div class="label">Admission ID</div><div class="value">${apptData.admissionId}</div></div>` : ''}
            ${isValidDoctor ? `<div class="info-item"><div class="label">Doctor Name</div><div class="value">Dr. ${doctorNameToPrint.replace(/^Dr\.\s*/i, '')}</div></div>` : ''}
        </div>
        ${labTestsHtml}
        ${financialBreakdownHtml}
        <div class="amount-box">
            <div class="label">Amount Paid</div>
            <div class="amount">₹${Math.round(amount).toLocaleString('en-IN')}</div>
        </div>
        ${ipdBreakdownHtml}
        <div id="print-footer" style="margin-top:30px">${footerHtml}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
        </body></html>`;
        win.document.write(receiptHtml);
        win.document.close();
    };

    // 🖨️ PRINT ALL: Print current page of transactions
    const handlePrintAll = () => {
        if (filteredTransactions.length === 0) { toast.error('No transactions to print'); return; }
        const win = window.open('', '_blank');
        if (!win) { toast.error('Please allow popups to print'); return; }
        const h = hospital || {};
        const headerHtml = renderToStaticMarkup(
            <MainHeader initialDetails={{ name: h.name || 'Hospital', address: h.address || '', phone: h.phone || h.mobile || '', email: h.email || '', logo: h.logo }} />
        );
        const footerHtml = renderToStaticMarkup(
            <MainFooter initialDetails={{ name: h.name || 'Hospital', address: h.address || '', phone: h.phone || h.mobile || '', email: h.email || '' }} />
        );
        const tabLabel = typeFilter === 'ipd' ? 'IPD Payments' : typeFilter === 'lab' ? 'Lab Payments' : 'OPD Payments';
        const rows = filteredTransactions.map((tx: any) => {
            const amount = tx.payment?.amount || tx.amount || 0;
            const patientName = getPatientNameWithPrefix(tx);
            const rawType = tx.type || 'appointment_booking';
            const typeMapping: Record<string, string> = {
                'appointment_booking': 'OPD', 'opd': 'OPD',
                'ipd': 'IPD Admission', 'ipd_advance': 'IPD Advance',
                'ipd_bill_payment': 'IPD Bill', 'ipd_final_settlement': 'IPD Settlement',
                'discharge': 'Discharge', 'lab_test': 'Lab',
                'package': 'Package',
            };
            const type = typeMapping[rawType.toLowerCase()] || rawType;
            const apptData = tx.referenceId || {};
            const txDate = tx.date || tx.createdAt;
            const formattedDate = txDate ? new Date(txDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const rawStatus = tx.payment?.status || tx.status || 'completed';
            const status = (rawStatus.toLowerCase() === 'paid' || rawStatus.toLowerCase() === 'completed') ? 'PAID' : 'PENDING';
            const isDischarge = rawType.toLowerCase() === 'discharge' || rawType.toLowerCase() === 'ipd_final_settlement' || rawType.toLowerCase() === 'ipd_bill_payment';
            const amountDisplay = isDischarge
                ? `₹${Math.round(apptData.totalBillAmount || amount).toLocaleString('en-IN')} (Adv: ₹${Math.round(apptData.advanceAmount||0).toLocaleString('en-IN')}, Due: ₹${Math.round(apptData.dueAmount||0).toLocaleString('en-IN')})`
                : `₹${Math.round(amount).toLocaleString('en-IN')}`;
            return `<tr><td>${formattedDate}</td><td>${patientName}</td><td>${type}</td><td style="font-weight:900;">${amountDisplay}</td><td>${(tx.paymentMethod || 'CASH').toUpperCase()}</td><td style="color:${status==='PAID'?'#16a34a':'#e11d48'};font-weight:900;">${status}</td></tr>`;
        }).join('');
        const totalAmount = filteredTransactions.reduce((s: number, tx: any) => s + (tx.payment?.amount || tx.amount || 0), 0);
        const html = `<!DOCTYPE html><html><head><title>${tabLabel} - Transaction List</title><style>
            body{font-family:'Segoe UI',system-ui,sans-serif;padding:20px;color:#1e293b;background:#fff;font-size:11px;}
            table{width:100%;border-collapse:collapse;margin:20px 0;}
            th{background:#0f172a;color:#fff;padding:10px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px;}
            td{padding:8px;border-bottom:1px solid #f1f5f9;}
            tr:nth-child(even){background:#f8fafc;}
            .summary{margin-top:20px;text-align:right;font-size:14px;font-weight:900;color:#0f172a;}
            @media print{body{padding:0;}@page{margin:1cm;}}
        </style></head><body>
        <div id="print-header">${headerHtml}</div>
        <h2 style="text-align:center;margin:15px 0;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">${tabLabel} — Statement</h2>
        <table><thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Amount</th><th>Mode</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="summary">Total Revenue: ₹${Math.round(totalAmount).toLocaleString('en-IN')}</div>
        <div id="print-footer" style="margin-top:30px">${footerHtml}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
        </body></html>`;
        win.document.write(html);
        win.document.close();
    };

    const totalPages = Math.ceil(total / limit);

    const showInitialLoading = isLoading && !txRaw;


    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* CONSOLIDATED HEADER & COMPACT CONTROLS */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 max-w-full mx-auto">
                {/* ROW 1: TOP BAR (Title, Live Badge, Compact Stats, Quick Actions) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                    {/* Left: Back & Title */}
                    <div className="flex items-center gap-2.5">
                        <Link href="/helpdesk" className="p-1.5 bg-slate-100/80 rounded-lg text-slate-400 hover:text-teal-600 transition-all shadow-sm shrink-0">
                            <ArrowLeft size={16} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                                Transactions
                            </h1>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 border border-teal-100 rounded-full text-[8px] font-black text-teal-600 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                Live
                            </span>
                        </div>
                    </div>

                    {/* Center: Sleek Compact Stats Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-inner">
                        <div className="flex items-center gap-1.5 px-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Revenue:</span>
                            <span className="text-[11px] font-black text-blue-600">₹{Math.round(totalRevenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <div className="flex items-center gap-1.5 px-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Count:</span>
                            <span className="text-[11px] font-black text-teal-600">{total.toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <div className="flex items-center gap-1.5 px-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg:</span>
                            <span className="text-[11px] font-black text-indigo-600">₹{total > 0 ? Math.round((totalRevenue || 0) / total).toLocaleString('en-IN') : 0}</span>
                        </div>
                    </div>

                    {/* Right: Compact Actions */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleExport("all")}
                            disabled={exporting}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:text-green-600 hover:border-green-200 shadow-sm active:scale-95 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                            title="Export All to Excel"
                        >
                            {exporting ? <RefreshCw size={12} className="animate-spin text-green-600" /> : <Download size={12} />}
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => handleExport("all")}
                            disabled={exporting}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:text-blue-600 hover:border-blue-200 shadow-sm active:scale-95 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                            title="Categorized Export by Service"
                        >
                            {exporting ? <RefreshCw size={12} className="animate-spin text-blue-600" /> : <Download size={12} />}
                            <span>Categorized</span>
                        </button>
                        <button 
                            onClick={() => {
                                refetch();
                                toast.success('Records refreshed', { duration: 1500 });
                            }} 
                            className="p-1 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg hover:text-teal-600 hover:border-teal-200 shadow-sm active:scale-95 transition-all"
                            title="Refresh Ledger"
                        >
                            <RefreshCw size={14} className={`${isFetching ? 'animate-spin text-teal-600' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* ROW 2: UNIFIED COMPACT CONTROL STRIP */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Left Side: Category Tabs + Search + Date Filters */}
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Category Segment Tabs */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shadow-inner shrink-0">
                            <button
                                onClick={() => switchTab('all')}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => switchTab('opd')}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'opd' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                OPD
                            </button>
                            <button
                                onClick={() => switchTab('ipd')}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'ipd' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                IPD
                            </button>
                            <button
                                onClick={() => switchTab('lab')}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'lab' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Lab
                            </button>
                        </div>

                        {/* IPD Sub-filters */}
                        {typeFilter === 'ipd' && (
                            <div className="flex bg-rose-50 p-0.5 rounded-lg border border-rose-100 shadow-inner animate-in fade-in duration-200 shrink-0">
                                <button
                                    onClick={() => setIpdPaymentType('all')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ipdPaymentType === 'all' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-500'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setIpdPaymentType('advance')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ipdPaymentType === 'advance' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-500'}`}
                                >
                                    Advance
                                </button>
                                <button
                                    onClick={() => setIpdPaymentType('discharge')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ipdPaymentType === 'discharge' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-500'}`}
                                >
                                    Discharge
                                </button>
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative group w-40 sm:w-48 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 size-3" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="SEARCH NAME OR ID..."
                                className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* Date Preset Dropdown */}
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
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-700 uppercase tracking-wider outline-none focus:border-teal-500 shadow-sm cursor-pointer shrink-0"
                        >
                            <option value="all">📅 All Time</option>
                            <option value="today">📅 Today</option>
                            <option value="yesterday">📅 Yesterday</option>
                            <option value="last_week">📅 Last Week</option>
                            <option value="this_month">📅 This Month</option>
                            <option value="last_month">📅 Last Month</option>
                            <option value="2_months_back">📅 2M Back</option>
                            <option value="3_months_back">📅 3M Back</option>
                            <option value="6_months_back">📅 6M Back</option>
                            <option value="1_year_back">📅 1Y Back</option>
                            <option value="custom">📅 Custom</option>
                        </select>

                        {/* Start & End Dates */}
                        <div className="flex items-center gap-1 shrink-0">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { 
                                    setStartDate(e.target.value); 
                                    setDatePreset('custom');
                                    setPage(1); 
                                }}
                                className="w-28 sm:w-32 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                            />
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { 
                                    setEndDate(e.target.value); 
                                    setDatePreset('custom');
                                    setPage(1); 
                                }}
                                className="w-28 sm:w-32 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-teal-500 shadow-sm"
                            />
                            {(startDate || endDate || datePreset !== 'all') && (
                                <button
                                    onClick={() => { 
                                        setStartDate(""); 
                                        setEndDate(""); 
                                        setDatePreset("all");
                                        setPage(1); 
                                    }}
                                    title="Clear date filter"
                                    className="px-1.5 py-1 bg-rose-50 border border-rose-200 text-rose-500 rounded-lg text-[8px] font-black hover:bg-rose-100 active:scale-95 transition-all whitespace-nowrap"
                                >✕</button>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Show Edited + Pagination + Pool Count */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={showEditedOnly}
                                onChange={(e) => {
                                    setShowEditedOnly(e.target.checked);
                                    setPage(1);
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 size-3"
                            />
                            Edited Only
                        </label>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                >
                                    <ChevronLeft size={12} />
                                </button>
                                <div className="px-1.5 py-0.5 text-[9px] font-black text-slate-900 bg-white rounded shadow-sm border border-slate-100 min-w-[38px] text-center">
                                    {page}/{totalPages}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                >
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col border-l border-slate-200 pl-2">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Pool</span>
                            <span className="text-[9px] font-black text-teal-600 uppercase tracking-tight mt-0.5">{filteredTransactions.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    {showInitialLoading ? (
                        <div className="py-40 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Revenue Ledger...</p>
                        </div>
                    ) : filteredTransactions.length > 0 ? (
                        <table className="w-full min-w-[800px] table-auto text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider sm:tracking-widest whitespace-nowrap">
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Reference Node</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Service Type</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-bold">Reason / Test</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-bold">Doctor / Condition</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Amount (INR)</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Status</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Mode</th>
                                    <th className="min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-center">Print</th>
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
                                    const patientName = getPatientNameWithPrefix(tx);

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
                                        'package': 'Package Billed',
                                    };
                                    const type = typeMapping[rawType.toLowerCase()] || rawType.toUpperCase();

                                    // Get clinical detail from populated referenceId (appointment/admission data)
                                    const appointmentData = tx.referenceId || {};
                                    const isDischargeTransaction = rawType.toLowerCase() === 'discharge' || rawType.toLowerCase() === 'ipd_final_settlement' || rawType.toLowerCase() === 'ipd_bill_payment';
                                    const isAdvancePayment = rawType.toLowerCase() === 'ipd_advance' || rawType.toLowerCase() === 'ipd_advance_payment';
                                    const isLabTest = rawType.toLowerCase() === 'lab_test';
                                    const isPackage = rawType.toLowerCase() === 'package' || rawType.toLowerCase() === 'package_item';

                                    // 🔧 Clinical detail: test name for lab, reason for others
                                    let clinicalDetail = '-';
                                    if (isDischargeTransaction) {
                                        clinicalDetail = appointmentData.reason || appointmentData.disease ||
                                            (appointmentData.symptoms?.length > 0 ? appointmentData.symptoms.join(', ') : null) || 'IPD Discharge';
                                    } else if (isLabTest) {
                                        // Show test name(s) if available
                                        const testNames = appointmentData.testName ||
                                            appointmentData.tests?.map((t: any) => t.name || t.testName).filter(Boolean).join(', ') ||
                                            appointmentData.labTest?.name || appointmentData.description ||
                                            'Lab Diagnostics';
                                        clinicalDetail = testNames;
                                    } else if (rawType.toLowerCase() === 'package') {
                                        clinicalDetail = appointmentData.name || 'Health Package';
                                    } else {
                                        clinicalDetail = appointmentData.reason || appointmentData.disease ||
                                            appointmentData.diagnosis ||
                                            (appointmentData.symptoms?.length > 0 ? appointmentData.symptoms.join(', ') : null) || '-';
                                    }

                                    // ✅ FIX: Always show amount for all transaction types
                                    const displayAmount = amount;

                                    // 🔧 FIX: Sanitize doctor name — never show raw ObjectId
                                    const rawDoctorName = appointmentData.primaryDoctor || appointmentData.suggestedDoctorName;
                                    const isObjectId = rawDoctorName && rawDoctorName.length === 24 && /^[a-f0-9]{24}$/i.test(rawDoctorName);
                                    const resolvedDoctorName = isObjectId ? null : rawDoctorName;

                                    return (
                                        <tr key={tx._id || index} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all flex items-center justify-center font-bold text-xs sm:text-base shadow-sm border shrink-0 ${tx.patientMRN && tx.patientMRN !== 'Resolving...'
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white border-slate-100'
                                                        }`}>
                                                        {patientName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] sm:text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[130px] sm:max-w-[200px] leading-tight">{patientName}</p>
                                                        <p className={`text-[7.5px] sm:text-[9.5px] font-black uppercase tracking-tight mt-0.5 px-1.5 py-0.5 rounded border leading-tight ${tx.referenceId?.transactionId?.startsWith('OPD') || tx.referenceId?.transactionId?.startsWith('APT')
                                                            ? 'bg-teal-50 text-teal-600 border-teal-100/50'
                                                            : tx.referenceId?.transactionId?.startsWith('IPD') || tx.referenceId?.admissionId
                                                                ? 'bg-rose-50 text-rose-600 border-rose-100/50'
                                                                : isLabTest
                                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50'
                                                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                                            }`}>
                                                            {tx.transactionId || tx.receiptNumber || tx.invoiceNumber || tx.referenceId?.appointmentId || tx.referenceId?.transactionId || tx.referenceId?.admissionId || (isLabTest && (tx.referenceId?.sampleId || tx.referenceId?.orderId)) || (tx.patientMRN && tx.patientMRN !== 'Resolving...' ? `#${tx.patientMRN}` : "—")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <div className={`inline-flex px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider border ${(tx.registrationType === 'IPD' || type.includes('IPD'))
                                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                    : isLabTest
                                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        : 'bg-teal-50 text-teal-600 border-teal-100'
                                                    }`}>
                                                    {(tx.registrationType === 'IPD' || type.includes('IPD')) ? 'IPD' : isLabTest ? 'LAB' : isPackage ? 'PKG' : 'OPD'}
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">{clinicalDetail}</p>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                <div className="space-y-0.5">
                                                    {resolvedDoctorName ? (
                                                        <p className="text-[9px] sm:text-[10px] font-black text-teal-600 uppercase tracking-wider leading-tight">
                                                            {resolvedDoctorName}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-wider leading-tight">N/A</p>
                                                    )}
                                                    {appointmentData.conditionAtDischarge && (
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${appointmentData.conditionAtDischarge === 'Stable' || appointmentData.conditionAtDischarge === 'Improved'
                                                                ? 'bg-emerald-500'
                                                                : appointmentData.conditionAtDischarge === 'Critical'
                                                                    ? 'bg-rose-500'
                                                                    : 'bg-amber-500'
                                                                }`} />
                                                            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                                                                {appointmentData.conditionAtDischarge}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* AMOUNT COLUMN */}
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                {isDischargeTransaction ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                                            ₹{Math.round(displayAmount || appointmentData.totalBillAmount || 0).toLocaleString('en-IN')}
                                                        </p>
                                                        <div className="flex items-center gap-1">
                                                            {Number(appointmentData.advanceAmount) > 0 && (
                                                                <span className="px-1 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap">
                                                                    Adv ₹{Math.round(appointmentData.advanceAmount).toLocaleString('en-IN')}
                                                                </span>
                                                            )}
                                                            <span className="px-1 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap">
                                                                Settlement
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : isLabTest ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <FlaskConical size={11} className="text-indigo-500" />
                                                            <p className="text-xs sm:text-sm font-black text-slate-900">₹{Math.round(displayAmount).toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <span className="text-[7.5px] sm:text-[8px] font-bold text-indigo-500 uppercase tracking-wider">Lab Bill</span>
                                                    </div>
                                                ) : isAdvancePayment ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <Banknote size={11} className="text-rose-500" />
                                                            <p className="text-xs sm:text-sm font-black text-slate-900">₹{Math.round(displayAmount).toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <span className="text-[7.5px] sm:text-[8px] font-bold text-rose-500 uppercase tracking-wider">IPD Advance</span>
                                                    </div>
                                                ) : isPackage ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <Package size={11} className="text-emerald-500" />
                                                            <p className="text-xs sm:text-sm font-black text-slate-900">₹{Math.round(displayAmount).toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <span className="text-[7.5px] sm:text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Package Bill</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <BadgeIndianRupee size={11} className="text-teal-500" />
                                                        <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                                                            ₹{Math.round(displayAmount).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            {/* STATUS COLUMN */}
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <div className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed'
                                                    ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed' ? 'bg-teal-500' : 'bg-rose-500'}`} />
                                                    {status}
                                                </div>
                                            </td>
                                            {/* PAYMENT MODE COLUMN */}
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-slate-100 text-slate-600 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm">
                                                        <CreditCard size={11} className="text-slate-400" />
                                                        {formatPaymentMode(tx)}
                                                    </div>
                                                    {tx.isEdited && (
                                                        <div className="text-[7.5px] sm:text-[8.5px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                            <Activity size={9} /> Edited
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* ACTION COLUMN */}
                                            <td className="min-w-[80px] sm:min-w-[100px] px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                    <button
                                                        onClick={() => setEditingTx(tx)}
                                                        className="p-1 sm:p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-100"
                                                        title="Edit Transaction"
                                                    >
                                                        <Activity size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintTransaction(tx)}
                                                        className="p-1 sm:p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                                        title="Print Receipt"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
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

            {editingTx && (
                <EditTransactionModal 
                    tx={editingTx} 
                    onClose={() => setEditingTx(null)} 
                />
            )}

        </div >
    );
}