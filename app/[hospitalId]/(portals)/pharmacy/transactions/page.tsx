'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Printer,
    Eye,
    ChevronLeft,
    Download,
    Hash,
    Calendar,
    RefreshCcw,
    FileText,
    Package,
    LayoutTemplate,
    X,
    Filter
} from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import PharmacyBillPrint, { ShopDetails } from '@/components/pharmacy/billing/PharmacyBillPrint';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';
import { useAuthStore } from '@/stores/authStore';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PharmacyDashboardService, PharmacyDashboardStats } from '@/lib/integrations/services/pharmacyDashboard.service';

const TransactionsPage = () => {
    const { user } = useAuthStore();
    const { printWithHeader, setPrintWithHeader } = usePrintStore();
    const [bills, setBills] = useState<PharmacyBill[]>([]);
    const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBills, setTotalBills] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All Methods');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [selectedBill, setSelectedBill] = useState<PharmacyBill | null>(null);
    const [billToPrint, setBillToPrint] = useState<PharmacyBill | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const shopDetails: ShopDetails = {
        name: (user as any)?.shopName || user?.name || 'Pharmacy Store',
        address: (user as any)?.address || 'No Address Provided',
        phone: (user as any)?.mobile || (user as any)?.phone || '-',
        email: (user as any)?.email || '-',
        gstin: (user as any)?.gstin || '-',
        dlNo: (user as any)?.licenseNo || (user as any)?.dlNo || '',
        fssai: (user as any)?.fssai || '',
        logo: (user as any)?.image || (user as any)?.logo || (user as any)?.avatar || (user as any)?.profilePic,
        pharmacyTerms: user?.pharmacyTerms || []
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: billToPrint ? `Invoice_${billToPrint.invoiceId}` : 'Invoice',
    });

    const fetchBills = React.useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await PharmacyBillingService.getBills(
                page,
                10,
                searchTerm,
                paymentFilter,
                startDate,
                endDate
            );
            setBills(data.bills);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
            setTotalBills(data.totalBills);
        } catch (error) {
            console.error('Failed to fetch bills:', error);
            toast.error('Failed to load transaction records');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, paymentFilter, startDate, endDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBills(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchBills]);

    useEffect(() => {
        fetchBills(currentPage);
    }, [currentPage, fetchBills]);

    const onPrintClick = (bill: PharmacyBill) => {
        setBillToPrint(bill);
        setTimeout(() => {
            handlePrint();
        }, 1000);
    };

    const handleDownloadPDF = async () => {
        if (!modalPrintRef.current || !selectedBill) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(modalPrintRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const styles = clonedDoc.getElementsByTagName('style');
                    const links = clonedDoc.getElementsByTagName('link');
                    while (styles.length > 0) styles[0].remove();
                    for (let i = links.length - 1; i >= 0; i--) {
                        if (links[i].rel === 'stylesheet') links[i].remove();
                    }
                    clonedDoc.body.style.backgroundColor = '#ffffff';
                    clonedDoc.body.style.color = '#000000';
                }
            });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${selectedBill.invoiceId}.pdf`);
            toast.success('PDF Downloaded');
        } catch (error) {
            console.error('PDF Gen Error:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsDownloading(false);
        }
    };



    const handleExportExcel = async () => {
        if (bills.length === 0) {
            toast.error('No transaction records to export');
            return;
        }
        setIsExporting(true);
        try {
            const exportData = await PharmacyBillingService.getBills(1, 2000, searchTerm, paymentFilter, startDate, endDate);
            const allBills = exportData.bills;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');

            // 1. Transaction Report Heading
            worksheet.mergeCells('A1:J1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'PHARMACY TRANSACTION SUMMARY REPORT';
            titleRow.getCell(1).font = { size: 16, bold: true, name: 'Arial', color: { argb: '1E293B' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 35;

            // 2. Hospital/Shop Name
            worksheet.mergeCells('A2:J2');
            const hospitalRow = worksheet.getRow(2);
            hospitalRow.getCell(1).value = shopDetails.name;
            hospitalRow.getCell(1).font = { size: 12, bold: true, color: { argb: '475569' } };
            hospitalRow.getCell(1).alignment = { horizontal: 'center' };

            // 3. Date Range Info
            worksheet.mergeCells('A3:J3');
            const dateRangeRow = worksheet.getRow(3);
            const dateText = (startDate || endDate)
                ? `Period: ${startDate || ''} to ${endDate || ''}`
                : `Report Date: ${new Date().toLocaleDateString()}`;
            dateRangeRow.getCell(1).value = dateText;
            dateRangeRow.getCell(1).font = { size: 10, italic: true };
            dateRangeRow.getCell(1).alignment = { horizontal: 'center' };

            worksheet.addRow([]); // Spacer

            // Define Columns
            const columns = [
                { header: 'S.No', width: 8 },
                { header: 'Date', width: 12 },
                { header: 'Invoice ID', width: 15 },
                { header: 'Patient Name', width: 25 },
                { header: 'Mobile', width: 15 },
                { header: 'Payment Mode', width: 15 },
                { header: 'Original Amount', width: 15 },
                { header: 'Refund Amount', width: 15 },
                { header: 'Final Paid', width: 15 },
                { header: 'Balance', width: 12 },
                { header: 'Status', width: 12 },
                { header: 'Returned Items', width: 40 },
            ];

            // Header Row Styling
            const headerRow = worksheet.addRow(columns.map(c => c.header));
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }; // Slate-800
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'thin' },
                    bottom: { style: 'medium' },
                    right: { style: 'thin' }
                };
            });

            let totalOriginalAmount = 0;
            let totalRefundAmount = 0;
            let totalPaidAmount = 0;
            let totalBalanceAmount = 0;

            // Payment Mode Wise Totals
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            // Add Data Rows
            allBills.forEach((bill, index) => {
                const mode = (bill.paymentSummary.paymentMode || 'CASH').toLowerCase();
                const amount = bill.paymentSummary.paidAmount || 0;

                if (mode === 'cash') cashTotal += amount;
                else if (mode === 'card') cardTotal += amount;
                else if (mode === 'upi') upiTotal += amount;
                else if (mode === 'mixed') mixedTotal += amount;

                let refundAmount = 0;
                let returnedItemsText: string[] = [];
                
                (bill.items || []).forEach(item => {
                    if (item.returnedQty && item.returnedQty > 0) {
                        const itemRefund = item.returnedQty * (item.rate || item.unitRate || 0);
                        refundAmount += itemRefund;
                        returnedItemsText.push(`${item.itemName} (${item.returnedQty})`);
                    }
                });

                // If fully returned legacy logic
                if (bill.paymentSummary.status === 'RETURN' || bill.paymentSummary.status.toUpperCase() === 'RETURN') {
                     // For legacy full returns, if refundAmount is 0, recalculate
                     if (refundAmount === 0 && bill.items) {
                         bill.items.forEach(item => {
                             const itemRefund = (item.qty) * (item.rate || item.unitRate || 0);
                             refundAmount += itemRefund;
                             returnedItemsText.push(`${item.itemName} (${item.qty})`);
                         });
                     }
                }

                const originalAmount = bill.paymentSummary.grandTotal + refundAmount;
                const returnedItemsStr = returnedItemsText.length > 0 ? returnedItemsText.join(', ') : '-';

                const formattedDate = new Date(bill.createdAt).toLocaleDateString();
                const formattedTime = new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const row = worksheet.addRow([
                    index + 1,
                    `${formattedDate} ${formattedTime}`,
                    bill.invoiceId,
                    bill.patientName || 'Walk-in',
                    bill.customerPhone || '-',
                    bill.paymentSummary.paymentMode?.toUpperCase() || 'CASH',
                    originalAmount,
                    refundAmount > 0 ? -refundAmount : 0,
                    bill.paymentSummary.paidAmount || 0,
                    bill.paymentSummary.balanceDue || 0,
                    bill.paymentSummary.status,
                    returnedItemsStr
                ]);

                totalOriginalAmount += originalAmount;
                totalRefundAmount += refundAmount;
                totalPaidAmount += (bill.paymentSummary.paidAmount || 0);
                totalBalanceAmount += (bill.paymentSummary.balanceDue || 0);

                // Style data cells
                row.eachCell((cell, colNumber) => {
                    if (colNumber <= 6 || colNumber === 11 || colNumber === 12) {
                        cell.alignment = { horizontal: (colNumber === 4 || colNumber === 12) ? 'left' : 'center' };
                    } else {
                        cell.alignment = { horizontal: 'right' };
                    }

                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
                    }

                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    if ([7, 8, 9, 10].includes(colNumber)) {
                        cell.numFmt = '₹#,##0.00';
                        if (colNumber === 8 && refundAmount > 0) {
                             cell.font = { color: { argb: 'EF4444' } }; // Red for refund
                        }
                    }
                });
            });

            // Summary Totals Row
            worksheet.addRow([]); // Blank row
            const summaryRow = worksheet.addRow([
                '', '', '', '', '', 'TOTALS:',
                totalOriginalAmount,
                totalRefundAmount > 0 ? -totalRefundAmount : 0,
                totalPaidAmount,
                totalBalanceAmount,
                '', ''
            ]);

            summaryRow.height = 25;
            summaryRow.eachCell((cell, colNumber) => {
                if (colNumber >= 6 && colNumber <= 10) {
                    cell.font = { bold: true, color: colNumber === 8 ? { argb: 'EF4444' } : undefined };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
                    cell.border = {
                        top: { style: 'medium' },
                        left: { style: 'thin' },
                        bottom: { style: 'medium' },
                        right: { style: 'thin' }
                    };
                    if (colNumber > 6) cell.numFmt = '₹#,##0.00';
                }
            });

            // Payment Mode Breakdown Section
            worksheet.addRow([]); // Spacer
            const breakdownTitle = worksheet.addRow(['', '', '', '', '', 'PAYMENT MODE BREAKDOWN']);
            breakdownTitle.getCell(6).font = { bold: true, underline: true };

            const cashRow = worksheet.addRow(['', '', '', '', '', 'Total Cash :', cashTotal]);
            const cardRow = worksheet.addRow(['', '', '', '', '', 'Total Card :', cardTotal]);
            const upiRow = worksheet.addRow(['', '', '', '', '', 'Total UPI :', upiTotal]);
            const mixedRow = worksheet.addRow(['', '', '', '', '', 'Total Mixed :', mixedTotal]);
            const dueRow = worksheet.addRow(['', '', '', '', '', 'Total Due :', totalBalanceAmount]);

            [cashRow, cardRow, upiRow, mixedRow, dueRow].forEach((row, idx) => {
                row.getCell(6).alignment = { horizontal: 'left' };
                row.getCell(7).alignment = { horizontal: 'right' };
                row.getCell(7).font = { bold: true };
                row.getCell(7).numFmt = '₹#,##0.00';
                
                // Add top border to the 'Total Due' row to separate it
                if (idx === 4) {
                     row.getCell(6).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                     row.getCell(7).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                } else {
                     row.getCell(7).border = {
                         bottom: { style: 'thin' },
                         right: { style: 'thin' }
                     };
                }
            });

            worksheet.addRow([]); // Spacer
            worksheet.addRow([]); // Spacer

            // Preparation Info
            const prepRow = worksheet.addRow(['', '', '', '', '', '', '', '', 'Prepared By: Pharma Staff']);
            prepRow.getCell(9).font = { bold: true, italic: true };

            // Set Column Widths
            worksheet.columns.forEach((col, i) => {
                col.width = columns[i].width;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Pharma_Transactions_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Sales ledger exported');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await PharmacyDashboardService.getStats('today');
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        fetchStats();
    }, []);



    return (
        <div className="space-y-4 md:space-y-6 lg:space-y-8 text-gray-900 dark:text-white w-full max-w-[100vw] overflow-x-hidden pt-2">
            
            {/* Unified Top Action Bar */}
            <div className="flex flex-col gap-2 mx-1">
                {/* Main Action Row */}
                <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap lg:flex-nowrap items-center gap-2 md:gap-3">
                    
                    {/* Heading */}
                    <div className="shrink-0 flex flex-col justify-center min-w-max px-1">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none">Sales History</h1>
                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Pharmacy Ledger</p>
                    </div>

                    <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

                    {/* Compact Stats */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Txn:</span>
                            <span className="text-xs font-black text-gray-900 dark:text-white">{stats?.todayStats.billCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 px-2 py-1.5 rounded-lg border border-teal-100 dark:border-teal-900/30">
                            <span className="text-[9px] font-bold text-teal-600/70 uppercase tracking-wider">Rev:</span>
                            <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                                ₹{Math.round(stats?.todayStats.revenue || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-2 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
                            <span className="text-[9px] font-bold text-purple-600/70 uppercase tracking-wider">Items:</span>
                            <span className="text-xs font-black text-purple-700 dark:text-purple-400">{stats?.todayStats.itemsSold || 0}</span>
                        </div>
                    </div>

                    <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

                    {/* Search Bar - Flex 1 */}
                    <div className="relative flex-1 min-w-[140px] md:min-w-[180px]">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search patient, mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-6 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Toggle Filters Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg border text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
                            showFilters 
                            ? 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:border-teal-900/30' 
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-700/50 dark:border-gray-600'
                        }`}
                        title="Toggle Filters"
                    >
                        <Filter size={14} />
                        <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
                    </button>

                    {/* Pagination */}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-1 py-1 shrink-0">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-0.5 text-gray-500 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous Page"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 min-w-[28px] text-center">
                            {currentPage}/{totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-0.5 text-gray-500 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Next Page"
                        >
                            <ChevronLeft size={14} className="rotate-180" />
                        </button>
                    </div>

                    {/* Actions: Export & Refresh */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="p-1.5 bg-teal-50 text-teal-600 border border-teal-100 rounded-lg hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-900/30 transition-colors"
                            title="Export Excel"
                        >
                            <Download size={14} />
                        </button>
                        <button
                            onClick={() => { clearApiCache(); fetchBills(currentPage); }}
                            className="p-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:text-teal-600 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Secondary Filters Row */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Start Date & End Date */}
                        <div className="flex items-center gap-1 shrink-0">
                            <div className="relative">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    className="w-28 md:w-32 pl-6 pr-1 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">-</span>
                            <div className="relative">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                    className="w-28 md:w-32 pl-6 pr-1 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Payment Filter */}
                        <div className="shrink-0 relative">
                            <select
                                className="w-32 md:w-40 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500 dark:text-white cursor-pointer appearance-none"
                                value={paymentFilter}
                                onChange={e => setPaymentFilter(e.target.value)}
                            >
                                <option>All Methods</option>
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>Mixed</option>
                                <option>Credit</option>
                            </select>
                            <ChevronLeft className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions Table */}
            {loading ? (
                <PharmacyTableSkeleton rows={8} />
            ) : (
                <div className="w-full max-w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm mx-1">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Invoice ID</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Patient</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Items</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-right text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-4 md:px-8 py-4 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest md:w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {bills.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <FileText className="w-12 h-12 opacity-10" />
                                                <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    bills.map((bill) => {
                                        let refundAmount = 0;
                                        let returnedCount = 0;
                                        (bill.items || []).forEach(item => {
                                            if (item.returnedQty && item.returnedQty > 0) {
                                                refundAmount += (item.returnedQty * (item.rate || item.unitRate || 0));
                                                returnedCount += item.returnedQty;
                                            }
                                        });

                                        if ((bill.paymentSummary.status === 'RETURN' || bill.paymentSummary.status.toUpperCase() === 'RETURN') && refundAmount === 0) {
                                             if (bill.items) {
                                                 bill.items.forEach(item => {
                                                     refundAmount += ((item.qty) * (item.rate || item.unitRate || 0));
                                                     returnedCount += item.qty;
                                                 });
                                             }
                                        }

                                        const originalAmount = bill.paymentSummary.grandTotal + refundAmount;

                                        return (
                                        <tr key={bill._id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-6 md:px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl">
                                                        <Hash size={14} />
                                                    </div>
                                                    <span className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">{bill.invoiceId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 md:px-8 py-5">
                                                <span className="font-bold text-xs text-gray-500 uppercase">{bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : '-'}</span>
                                                <span className="block text-[10px] font-black text-gray-400">{bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString() : ''}</span>
                                            </td>
                                            <td className="px-6 md:px-8 py-5">
                                                <div>
                                                    <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">{bill.patientName || 'Walk-in'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{bill.customerPhone || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 md:px-8 py-5">
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-[10px] font-black text-gray-500 uppercase inline-block">
                                                    {bill.items?.length || 0} SKUS
                                                </span>
                                                {returnedCount > 0 && (
                                                    <span className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full text-[10px] font-black uppercase inline-block ml-2 mt-1 sm:mt-0">
                                                        {returnedCount} Returned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 md:px-8 py-5 text-right">
                                                <p className="font-black text-sm text-gray-900 dark:text-white">₹{Math.round(originalAmount || 0).toLocaleString()}</p>
                                                {refundAmount > 0 ? (
                                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-0.5">-₹{Math.round(refundAmount).toLocaleString()} (Refund)</p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{bill.paymentSummary?.paymentMode || 'CASH'}</p>
                                                )}
                                            </td>
                                            <td className="px-6 md:px-8 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${bill.paymentSummary?.status === 'Paid'
                                                    ? 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-900/20 dark:border-teal-900/30'
                                                    : bill.paymentSummary?.status === 'Partial'
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30'
                                                    : bill.paymentSummary?.status?.toUpperCase() === 'RETURN'
                                                    ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${bill.paymentSummary?.status === 'Paid' ? 'bg-teal-500' : bill.paymentSummary?.status === 'Partial' ? 'bg-blue-500' : bill.paymentSummary?.status?.toUpperCase() === 'RETURN' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                    {bill.paymentSummary?.status || 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedBill(bill)}
                                                        className="p-2 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100"
                                                        title="View Invoice"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls Removed from Bottom */}
                </div>
            )}

            {/* Hidden Print Component - Optimized for react-to-print */}
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
                <div ref={printRef}>
                    {billToPrint && (
                        <PharmacyBillPrint
                            billData={billToPrint}
                            shopDetails={shopDetails}
                        />
                    )}
                </div>
            </div>

            {/* View Modal */}
            {
                selectedBill && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col relative overflow-hidden">
                            {/* Header */}
                            <div className="bg-white border-b z-10 p-3 md:p-4 shrink-0 flex flex-wrap justify-between items-center gap-3 text-black">
                                <h3 className="font-black uppercase tracking-wider text-sm">Invoice Details</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Header & Footer Toggle */}
                                    <button
                                        onClick={() => setPrintWithHeader(!printWithHeader)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                            printWithHeader
                                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                        }`}
                                        title={printWithHeader ? 'Header & Footer ON – click to toggle off' : 'Header & Footer OFF – click to toggle on'}
                                    >
                                        <LayoutTemplate size={13} />
                                        <span>Header &amp; Footer</span>
                                        <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-black ${
                                            printWithHeader ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-500'
                                        }`}>{printWithHeader ? 'ON' : 'OFF'}</span>
                                    </button>

                                    {/* Print Now Button */}
                                    <button
                                        onClick={() => { if (selectedBill) onPrintClick(selectedBill); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                        title="Print Invoice"
                                    >
                                        <Printer size={13} />
                                        <span>Print Now</span>
                                    </button>

                                    <button
                                        onClick={() => setSelectedBill(null)}
                                        className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-black"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Area */}
                            <div className="flex-1 overflow-auto bg-gray-50">
                                <div className="w-full min-w-max p-2 md:p-8">
                                    <div className="bg-white shadow-lg" style={{ width: '210mm', margin: '0 auto' }} ref={modalPrintRef}>
                                        <PharmacyBillPrint
                                            billData={selectedBill}
                                            shopDetails={shopDetails}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default TransactionsPage;

