"use client";

import React, { useState, useMemo } from 'react';
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { clearApiCache } from "@/lib/integrations/api/apiClient";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Search,
  CreditCard,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

function TransactionContent() {
  const searchParams = useSearchParams() as any;
  const initialType = ((searchParams?.get('type') ?? null) ?? null)?.toLowerCase() || "opd"; // Default to OPD as per request

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [ipdPaymentType, setIpdPaymentType] = useState<'all' | 'advance' | 'discharge'>('all'); // New filter for IPD payments
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Map frontend filter values to backend transaction types
  const getBackendTypeFilter = (filterValue: string): string | undefined => {
    if (filterValue === 'all') return undefined;

    const typeMap: Record<string, string> = {
      'opd': 'appointment_booking,consultation',
      'ipd': ipdPaymentType === 'advance' ? 'ipd_advance,ipd_refund' : ipdPaymentType === 'discharge' ? 'ipd_final_settlement,ipd_bill_payment' : 'ipd_advance,ipd,ipd_refund,ipd_bill_payment,ipd_admission_fee',
      'package': 'package',
    };

    return typeMap[filterValue] || filterValue;
  };

  // ✅ CRITICAL FIX: Use React Query instead of useState + useEffect
  const { data, isLoading: loading, error, refetch } = useQuery<any>({
    queryKey: ['hospital-admin-transactions', dateFilter, typeFilter, ipdPaymentType, startDate, endDate, page],
    queryFn: async () => {
      const apiStartTime = performance.now();
      console.log(`[API] Starting transactions fetch with filter: ${dateFilter}`);
      try {
        const mappedType = getBackendTypeFilter(typeFilter);
        // Pass startDate, endDate, mapped type, page, and limit to service
        const data = await hospitalAdminService.getTransactions(
          dateFilter !== 'all' ? dateFilter : undefined,
          startDate || undefined,
          endDate || undefined,
          mappedType,
          page,
          10 // limit
        );

        let transactionsArray: any[] = [];
        let totalRecords = 0;
        let totalRev = 0;

        if (Array.isArray(data)) {
          console.warn("[API] Unexpected array response, pagination data missing");
          transactionsArray = data;
          totalRecords = data.length;
        } else if (data && typeof data === 'object') {
          transactionsArray = (data as any).transactions || (data as any).data || [];
          totalRecords = (data as any).pagination?.total || (data as any).total || 0;
          totalRev = (data as any).totalRevenue || 0;
        }

        const apiEndTime = performance.now();
        console.log(`[API] Transactions fetch completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms, returned ${transactionsArray.length} items, total ${totalRecords}`);

        return { transactions: transactionsArray, total: totalRecords, totalRevenue: totalRev };
      } catch (error: any) {
        console.error("Failed to fetch transactions:", error);
        toast.error(error.message || "Failed to load transactions");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const transactionsData = data as any;
  const transactionsList = transactionsData?.transactions || [];
  const totalCount = transactionsData?.total || 0;
  const totalGlobalRevenue = transactionsData?.totalRevenue || 0;

  // Safety check: ensure transactions is an array before filtering
  const filteredTransactions = Array.isArray(transactionsList)
    ? transactionsList.filter((t: any) => {
      // Logic for filtering by SEARCH term (client-side)
      // Note: Date/Type filtering is handled by backend API
      const matchesSearch = t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.referenceId?.mrn?.toLowerCase().includes(searchTerm.toLowerCase());

      // We rely on backend for type filter, but if 'all' we match everything
      // Only filter strictly if needed, but here simple search check is enough
      return matchesSearch;
    })
    : [];

  // Calculate stats based on FILTERED transactions (reactive to date/type filters)
  const totalRevenue = Array.isArray(filteredTransactions)
    ? filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    : 0;

  // Excel export function
  const handleExport = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    setIsExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions Registry');

      // --- 1. Report Titles ---
      // Row 1: Main Title
      const titleRow = worksheet.addRow(['HOSPITAL TRANSACTION SUMMARY REPORT']);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } }; // Dark Blue Text
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:J1');
      titleRow.height = 30;

      // Row 2: Organization Name
      const orgRow = worksheet.addRow(['Helpdesk Transaction Registry']);
      orgRow.font = { name: 'Calibri', size: 12, bold: true };
      orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A2:J2');

      // Row 3: Period
      const periodText = `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'Inicio'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
      const periodRow = worksheet.addRow([periodText]);
      periodRow.font = { name: 'Calibri', size: 11, italic: true };
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A3:J3');

      // Spacer
      worksheet.addRow([]);

      // --- 2. Define Columns & Headers ---
      const headers = [
        'S.No',
        'Date',
        'Invoice ID',
        'Patient Name',
        'Mobile',
        'Payment Mode',
        'Total Amount',
        'Status'
      ];
      const headerRow = worksheet.addRow(headers);

      // Styling Header Row
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F2937' } // Dark Gray/Black Background
        };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0070C0' } }, // Blue Border (ARGB FF0070C0)
          left: { style: 'thin', color: { argb: 'FF0070C0' } },
          bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
          right: { style: 'thin', color: { argb: 'FF0070C0' } }
        };
      });

      worksheet.columns = [
        { key: 'sno', width: 8 },
        { key: 'date', width: 12 },
        { key: 'invoiceId', width: 20 },
        { key: 'patient', width: 25 },
        { key: 'mobile', width: 15 },
        { key: 'mode', width: 15 },
        { key: 'total', width: 15 },
        { key: 'status', width: 15 },
      ];

      // --- 3. Populate Data ---
      let grandTotal = 0;

      // Payment Mode Totals
      let cashTotal = 0;
      let cardTotal = 0;
      let upiTotal = 0;
      let mixedTotal = 0;

      filteredTransactions.forEach((tx, index) => {
        const dateObj = new Date(tx.transactionTime);
        const total = Number(tx.amount) || 0;

        grandTotal += total;

        const pMode = tx.paymentMethod || 'Cash';
        if (pMode.toLowerCase() === 'cash') cashTotal += total;
        else if (pMode.toLowerCase() === 'card') cardTotal += total;
        else if (pMode.toLowerCase() === 'upi') upiTotal += total;
        else mixedTotal += total;

        const row = worksheet.addRow({
          sno: index + 1,
          date: dateObj.toLocaleDateString('en-GB'),
          invoiceId: tx.referenceId?.invoiceId || tx.id || '-',
          patient: (tx.patientName || 'ANONYMOUS').toUpperCase(),
          mobile: tx.patientMobile || tx.referenceId?.mobile || '-',
          mode: pMode.toUpperCase(),
          total: total,
          status: (tx.status || 'Paid').toUpperCase(),
        });

        // Styling Data Rows
        row.eachCell((cell, colIdx) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } }, // Blue Border
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
          };
          cell.font = { name: 'Calibri', size: 10 };

          // Numeric Formatting
          if (colIdx === 7) { // Total Amount
            cell.numFmt = '₹#,##0.00';
            cell.alignment = { horizontal: 'right' };
            cell.font = { bold: true };
          }
        });
      });

      // Spacer
      worksheet.addRow([]);

      // --- 4. Footer Totals ---
      const footerRow = worksheet.addRow([
        '', '', '', '', '', 'TOTALS:', grandTotal, ''
      ]);

      // Style Header-like footer
      footerRow.eachCell((cell, colIdx) => {
        if (colIdx >= 6 && colIdx <= 7) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; // Light Blue
          cell.font = { bold: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
          };
          if (colIdx === 7) {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '₹#,##0.00';
          }
        }
      });

      // Spacer
      worksheet.addRow([]);

      // --- 5. Payment Breakdown ---
      const breakdownHeader = worksheet.addRow(['', '', '', '', '', 'PAYMENT MODE BREAKDOWN']);
      breakdownHeader.getCell(6).font = { bold: true, underline: true };

      const addBreakdownRow = (label: string, value: number) => {
        const r = worksheet.addRow(['', '', '', '', '', label, value]);
        r.getCell(6).alignment = { horizontal: 'left' };
        r.getCell(7).alignment = { horizontal: 'right' };
        r.getCell(7).numFmt = '₹#,##0.00';
        r.getCell(7).font = { bold: true };
      };

      addBreakdownRow('Total Cash :', cashTotal);
      addBreakdownRow('Total Card :', cardTotal);
      addBreakdownRow('Total UPI :', upiTotal);
      addBreakdownRow('Total Mixed :', mixedTotal);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Hospital_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Professional Audit Ledger Exported`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Financial Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Transactions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 space-y-4 md:space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mt-4 md:mt-6">
        
        {/* Top Row: Title, Stats, Action Badge */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full xl:w-auto">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Transactions
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                  Track payments and billing records
                </p>
              </div>
            </div>

            {/* Compact Stats in Top Row */}
            <div className="flex flex-wrap items-center gap-3 md:gap-6 px-3 py-1.5 md:px-4 md:py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                {[
                    { label: "Revenue", value: `₹${Math.round(totalGlobalRevenue).toLocaleString()}`, icon: IndianRupee, color: "text-blue-600" },
                    { label: "Transactions", value: totalCount, icon: TrendingUp, color: "text-indigo-600" },
                    { label: "Avg Bill", value: `₹${totalCount > 0 ? (totalGlobalRevenue / totalCount).toFixed(0) : 0}`, icon: CreditCard, color: "text-emerald-600" }
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-2 md:gap-2.5">
                        <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 ${stat.color}`}>
                            <stat.icon size={14} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">{stat.label}</p>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 leading-none">{stat.value}</h3>
                        </div>
                        {i < 2 && <div className="hidden md:block w-px h-6 bg-slate-200/60 ml-2 md:ml-4" />}
                    </div>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-end w-full xl:w-auto shrink-0 gap-3 relative">
            {/* Pagination Controls inside the header Top Row */}
            {filteredTransactions.length > 0 && (
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 shrink-0">
                    <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
                    >
                    <ChevronLeft size={14} />
                    </button>
                    <div className="px-2 py-1 text-[10px] font-black text-slate-900 bg-white rounded min-w-[28px] text-center leading-none">
                    {page}
                    </div>
                    <button
                    onClick={() => setPage(p => p + 1)}
                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-slate-900 transition-all"
                    >
                    <ChevronRight size={14} />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">System Verified</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Control Center (Search, Filters, Export) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-gray-50 pt-4">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
            {/* Search Bar */}
            <div className="relative flex-1 w-full lg:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient name or method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Date Picker */}
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-gray-300 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Category Toggle */}
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-inner">
              <button
                onClick={() => {
                  setTypeFilter('opd');
                  setIpdPaymentType('all');
                }}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'opd' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                OPD
              </button>
              <button
                onClick={() => setTypeFilter('ipd')}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'ipd' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                IPD
              </button>
              <button
                onClick={() => {
                  setTypeFilter('package');
                  setIpdPaymentType('all');
                }}
                className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'package' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                PKG
              </button>
            </div>

            {/* IPD Payment Type Filter */}
            {typeFilter === 'ipd' && (
              <div className="flex bg-rose-50 p-1 rounded-lg border border-rose-100 shadow-inner animate-in slide-in-from-left-2 duration-300">
                <button
                  onClick={() => setIpdPaymentType('all')}
                  className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${ipdPaymentType === 'all' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setIpdPaymentType('advance')}
                  className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${ipdPaymentType === 'advance' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-400'}`}
                >
                  Adv
                </button>
                <button
                  onClick={() => setIpdPaymentType('discharge')}
                  className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${ipdPaymentType === 'discharge' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-300 hover:text-rose-400'}`}
                >
                  Dis
                </button>
              </div>
            )}
            
            {/* Actions: Refresh & Export */}
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto shrink-0">
              <button
                onClick={() => {
                  clearApiCache();
                  refetch();
                }}
                className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-slate-900 transition-all font-black h-[32px] w-[32px] flex items-center justify-center shadow-sm"
                title="Refresh"
              >
                <RefreshCw size={14} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 transition-all disabled:opacity-50 h-[32px] shadow-sm whitespace-nowrap"
              >
                {isExporting ? <RefreshCw size={12} strokeWidth={3} className="animate-spin" /> : <FileSpreadsheet size={12} strokeWidth={3} />}
                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>

            </div>

          </div>
        </div>
      </div>

      {/* Removed standalone stats grid since it's now in the header */}

      {/* Clean Transactions Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis / Service Details</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-2 md:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((tx) => {
                // Map transaction type to human-readable format
                const typeMapping: Record<string, string> = {
                  'appointment_booking': 'OPD',
                  'opd': 'OPD',
                  'ipd': 'IPD',
                  'ipd_advance': 'IPD',
                  'ipd_refund': 'IPD',
                  'ipd_bill_payment': 'IPD',
                  'ipd_final_settlement': 'IPD',
                  'discharge': 'Discharge',
                  'package': 'Package',
                };
                const rawType = tx.type || 'appointment_booking';
                const serviceType = typeMapping[rawType.toLowerCase()] || 'OPD';

                // Get clinical detail from populated referenceId (appointment/admission data)
                const appointmentData = tx.referenceId || {};
                const isDischargeTransaction = rawType.toLowerCase() === 'discharge' || rawType.toLowerCase() === 'ipd_final_settlement' || rawType.toLowerCase() === 'ipd_bill_payment';
                const isAdvancePayment = rawType.toLowerCase() === 'ipd_advance';

                // 🔧 FIX: Prioritize 'reason' over 'diagnosis' for discharge transactions
                // For discharge: reason > disease > symptoms (skip diagnosis)
                // For others: reason > disease > diagnosis > symptoms
                const clinicalDetail = isDischargeTransaction
                  ? (appointmentData.reason ||
                    appointmentData.disease ||
                    (appointmentData.symptoms && appointmentData.symptoms.length > 0 ? appointmentData.symptoms.join(', ') : null) ||
                    '-')
                  : (appointmentData.reason ||
                    appointmentData.disease ||
                    appointmentData.diagnosis ||
                    (appointmentData.symptoms && appointmentData.symptoms.length > 0 ? appointmentData.symptoms.join(', ') : null) ||
                    '-');

                // 🔧 FIX: Amount display logic based on filter type
                // - Only show Discharge totals when "Discharge Only" filter is explicitly selected
                // - In all other cases (Global view, All IPD), hide the discharge specific totals
                const displayAmount = isDischargeTransaction
                  ? (ipdPaymentType === 'discharge' ? (appointmentData.totalBillAmount || tx.amount) : null)
                  : tx.amount;

                // 🔧 FIX: Removed strict filter that was hiding discharge transactions
                // Let all transactions flow through and be rendered based on their available data

                // 🔧 FIX: Console log when doctor names are IDs (ObjectIds)
                const doctorName = appointmentData.primaryDoctor || appointmentData.suggestedDoctorName;
                if (doctorName && doctorName.length === 24 && /^[a-f0-9]{24}$/i.test(doctorName)) {
                  console.error('⚠️ DOCTOR ID INSTEAD OF NAME:', {
                    transactionId: tx._id || tx.id,
                    type: rawType,
                    doctorId: doctorName,
                    patientName: tx.patientName,
                    referenceId: tx.referenceId
                  });
                }


                // 🔍 DEBUG LOGGING - Track transaction data structure
                if (isDischargeTransaction) {
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  console.log('🔍 DISCHARGE TRANSACTION DEBUG:', {
                    transactionId: tx.id || tx._id,
                    patientName: tx.patientName,
                    rawType: rawType,
                    isDischargeTransaction: isDischargeTransaction,
                    transactionAmount: tx.amount,
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

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 md:px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase">
                          {tx.patientName?.charAt(0)}
                        </div>
                        <span className="font-thin text-slate-900 text-xs ">{tx.patientName}</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${serviceType === 'IPD' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          serviceType === 'OPD' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            serviceType === 'Package' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                              serviceType === 'Discharge' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                          {serviceType}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{clinicalDetail}</span>
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      <div className="space-y-1">
                        {appointmentData.primaryDoctor || appointmentData.suggestedDoctorName ? (
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                            {appointmentData.primaryDoctor || appointmentData.suggestedDoctorName}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">N/A</p>
                        )}
                        {appointmentData.conditionAtDischarge && (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${appointmentData.conditionAtDischarge === 'Stable' || appointmentData.conditionAtDischarge === 'Improved'
                              ? 'bg-emerald-500'
                              : appointmentData.conditionAtDischarge === 'Critical'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                              }`} />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              {appointmentData.conditionAtDischarge}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        {tx.paymentMethod === 'cash' ? <IndianRupee size={12} strokeWidth={3} /> : <CreditCard size={12} strokeWidth={3} />}
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      {isDischargeTransaction && (ipdPaymentType === 'discharge' || ipdPaymentType === 'all') ? (
                        <div className="flex flex-row items-center gap-2 justify-start">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold whitespace-nowrap">
                            <span className="text-slate-500 uppercase">Adv:</span>
                            <span className="text-blue-700">₹{Math.round(appointmentData.advanceAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 border border-rose-100 rounded text-[10px] font-bold whitespace-nowrap">
                            <span className="text-rose-600 uppercase">Due:</span>
                            <span className="text-rose-700">₹{Math.round(appointmentData.dueAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-thin text-slate-900 ">
                          {displayAmount !== null ? `₹${Math.round(displayAmount).toLocaleString()}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-thin text-slate-900 leading-none">
                          {new Date(tx.transactionTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                          {new Date(tx.transactionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 md:px-8 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 hover:bg-slate-900 hover:text-white rounded-lg text-slate-300 transition-all"
                      >
                        <ArrowUpRight size={16} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <CreditCard className="text-slate-200 w-8 h-8" />
            </div>
            <h3 className="text-sm md:text-lg font-black text-slate-900 ">No Transactions Found</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[240px] mx-auto">
              No records match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl p-3 md:p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 ">Payment Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</span>
                <span className="text-sm font-black text-slate-900">{selectedTransaction.patientName}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</span>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedTransaction.type === 'IPD' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  selectedTransaction.type === 'OPD' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                  {selectedTransaction.type || selectedTransaction.source}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</span>
                <span className="text-sm md:text-lg font-black text-slate-900 ">₹{Math.round(Number(selectedTransaction.amount)).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                <span className="text-sm font-black text-slate-900 uppercase">{selectedTransaction.paymentMethod}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</span>
                <span className="text-sm font-black text-slate-900">
                  {new Date(selectedTransaction.transactionTime).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Time</span>
                <span className="text-sm font-black text-slate-900">
                  {new Date(selectedTransaction.transactionTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                {(() => {
                  const isPaid = selectedTransaction.status === 'Paid' ||
                    selectedTransaction.referenceId?.paymentStatus === 'paid' ||
                    selectedTransaction.referenceId?.payment?.paymentStatus === 'paid';
                  const displayStatus = isPaid ? 'Paid' : (selectedTransaction.status || 'Pending');
                  const statusClasses = isPaid
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100';

                  return (
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusClasses}`}>
                      {displayStatus}
                    </span>
                  );
                })()}
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ ROOT COMPONENT: Wraps content in Suspense for useSearchParams
function HospitalAdminTransactions() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    }>
      <TransactionContent />
    </Suspense>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminTransactions);
