'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  Pill,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Building2,
  FileText,
  DollarSign,
  Percent,
  CheckCircle2,
  Package,
  ChevronLeft,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useDoctorPharmaAudit } from '@/lib/integrations/hooks/useHospitalAdminQueries';
import ExcelJS from 'exceljs';

interface DoctorPharmaAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: {
    doctorId: string;
    name: string;
    department?: string;
  };
  range: string;
  startDate: string;
  endDate: string;
  formatCurrency: (val: number) => string;
}

export const DoctorPharmaAuditModal: React.FC<DoctorPharmaAuditModalProps> = ({
  isOpen,
  onClose,
  doctor,
  range: initialRange,
  startDate: initialStartDate,
  endDate: initialEndDate,
  formatCurrency,
}) => {
  // Modal Local Filters & Controls
  const [modalRange, setModalRange] = useState(initialRange || '30d');
  const [modalStartDate, setModalStartDate] = useState(initialStartDate || '');
  const [modalEndDate, setModalEndDate] = useState(initialEndDate || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [patientTypeFilter, setPatientTypeFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [costMissingFilter, setCostMissingFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'profit_desc' | 'selling_desc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useDoctorPharmaAudit(
    doctor?.doctorId,
    {
      range: modalRange,
      startDate: modalStartDate,
      endDate: modalEndDate,
    },
    isOpen && !!doctor?.doctorId
  );

  const summary = data?.summary || {
    totalSelling: 0,
    totalPurchasing: 0,
    netProfit: 0,
    profitMargin: 0,
    totalPrescriptions: 0,
    totalMedicines: 0,
    costMissingCount: 0,
  };

  // Filter & Sort Prescriptions
  const filteredAndSortedPrescriptions: any[] = useMemo(() => {
    if (!data?.prescriptions) return [];

    let list = data.prescriptions.filter((p: any) => {
      // Filter by OPD/IPD
      if (patientTypeFilter !== 'ALL' && p.patient?.type !== patientTypeFilter) {
        return false;
      }
      // Filter by Cost Missing
      if (costMissingFilter && !p.totals?.hasCostMissing) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const pName = (p.patient?.name || '').toLowerCase();
        const pMrn = (p.patient?.mrn || '').toLowerCase();
        const invNo = (p.invoiceNo || '').toLowerCase();
        const rxId = (p.prescriptionId || '').toLowerCase();
        const medMatch = (p.medicines || []).some(
          (m: any) =>
            (m.brandName || '').toLowerCase().includes(query) ||
            (m.genericName || '').toLowerCase().includes(query) ||
            (m.batchNo || '').toLowerCase().includes(query)
        );
        return pName.includes(query) || pMrn.includes(query) || invNo.includes(query) || rxId.includes(query) || medMatch;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'profit_desc') return (b.totals?.profit || 0) - (a.totals?.profit || 0);
      if (sortBy === 'selling_desc') return (b.totals?.sellingAmount || 0) - (a.totals?.sellingAmount || 0);
      return 0;
    });

    return list;
  }, [data?.prescriptions, patientTypeFilter, costMissingFilter, searchQuery, sortBy]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedPrescriptions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredAndSortedPrescriptions.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPrescriptions, safePage, pageSize]);

  const togglePrescription = (id: string) => {
    setExpandedPrescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllOnPage = () => {
    const allExpanded: Record<string, boolean> = { ...expandedPrescriptions };
    paginatedPrescriptions.forEach((p) => {
      allExpanded[p.id] = true;
    });
    setExpandedPrescriptions(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPrescriptions({});
  };

  // Export to Excel with Professional Hospital Theme
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Pharma Revenue Audit');

      const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Title Row
      sheet.mergeCells('A1:J1');
      const titleRow = sheet.getRow(1);
      titleRow.getCell(1).value = 'DOCTOR-DRIVEN PHARMACY REVENUE & PROFITABILITY AUDIT';
      titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 28;

      // Doctor & Period Subtitle
      sheet.mergeCells('A2:J2');
      const subRow = sheet.getRow(2);
      subRow.getCell(1).value = `Doctor: ${doctor.name} (${doctor.department || 'General'}) | Period: ${modalRange.toUpperCase()} | Generated: ${new Date().toLocaleString('en-IN')}`;
      subRow.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      subRow.height = 20;

      sheet.addRow([]);

      // Headers Row
      const headers = [
        'Date & Time',
        'Patient Name',
        'UHID / MRN',
        'Type',
        'Medicine (Brand / Generic)',
        'Batch No',
        'Qty',
        'Purchase Cost (₹)',
        'Selling Price (₹)',
        'Net Profit (₹)',
      ];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderThin;
      });

      let grandTotalPurchase = 0;
      let grandTotalSelling = 0;
      let grandTotalProfit = 0;

      filteredAndSortedPrescriptions.forEach((p) => {
        const dateStr = new Date(p.date).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        p.medicines.forEach((m: any, idx: number) => {
          const medDesc = m.genericName ? `${m.brandName} (${m.genericName})` : m.brandName;
          const r = sheet.addRow([
            idx === 0 ? dateStr : '',
            idx === 0 ? p.patient?.name : '',
            idx === 0 ? p.patient?.mrn : '',
            idx === 0 ? p.patient?.type : '',
            medDesc,
            m.batchNo,
            m.quantity,
            m.totalPurchasePrice,
            m.totalSellingPrice,
            m.profit,
          ]);

          grandTotalPurchase += m.totalPurchasePrice;
          grandTotalSelling += m.totalSellingPrice;
          grandTotalProfit += m.profit;

          r.eachCell((cell, colNum) => {
            cell.font = { name: 'Calibri', size: 9 };
            cell.border = borderThin;
            if (colNum >= 8) {
              cell.numFmt = '₹#,##0.00';
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else if (colNum === 7) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
          });
        });
      });

      // Totals Row
      const totalRow = sheet.addRow([
        'TOTALS',
        '',
        '',
        '',
        '',
        '',
        '',
        grandTotalPurchase,
        grandTotalSelling,
        grandTotalProfit,
      ]);
      totalRow.height = 24;
      totalRow.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = borderThin;
        if (colNum >= 8) {
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // Column widths
      sheet.getColumn(1).width = 18;
      sheet.getColumn(2).width = 22;
      sheet.getColumn(3).width = 15;
      sheet.getColumn(4).width = 10;
      sheet.getColumn(5).width = 30;
      sheet.getColumn(6).width = 14;
      sheet.getColumn(7).width = 8;
      sheet.getColumn(8).width = 16;
      sheet.getColumn(9).width = 16;
      sheet.getColumn(10).width = 16;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Pharma_Audit_${doctor.name.replace(/\s+/g, '_')}_${modalRange}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export Pharma Audit:', err);
      alert('Failed to generate Excel export.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Pill className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Pharma Revenue Audit
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Realized Sales
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Prescriptions by <span className="font-bold text-slate-800">{doctor.name}</span> ({doctor.department || 'General'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={exportToExcel}
              disabled={isLoading || filteredAndSortedPrescriptions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/30">
          {/* Date Filter Bar inside Modal */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Period:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['7d', '30d', '90d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setModalRange(r);
                      setModalStartDate('');
                      setModalEndDate('');
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all ${
                      modalRange === r
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Custom:</span>
              <input
                type="date"
                value={modalStartDate}
                onChange={(e) => {
                  setModalStartDate(e.target.value);
                  setModalRange('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10px] font-bold text-slate-700 outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={modalEndDate}
                onChange={(e) => {
                  setModalEndDate(e.target.value);
                  setModalRange('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10px] font-bold text-slate-700 outline-none"
              />
              {(modalStartDate || modalEndDate) && (
                <button
                  onClick={() => {
                    setModalStartDate('');
                    setModalEndDate('');
                    setModalRange('30d');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Range Indicator */}
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>Showing:</span>
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {modalRange === 'custom' ? `${modalStartDate || 'Start'} to ${modalEndDate || 'Today'}` : `Past ${modalRange}`}
              </span>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Selling Revenue */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Selling Amount
                </span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-base sm:text-xl font-black text-slate-900">
                  {formatCurrency(summary.totalSelling)}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Realized billing revenue</p>
              </div>
            </div>

            {/* 2. Purchasing Cost */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Purchase Cost
                </span>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Package size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-base sm:text-xl font-black text-slate-900">
                  {formatCurrency(summary.totalPurchasing)}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Procurement / unit cost</p>
              </div>
            </div>

            {/* 3. Net Profit */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Net Profit
                </span>
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-base sm:text-xl font-black text-emerald-600">
                  {formatCurrency(summary.netProfit)}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                    +{summary.profitMargin}% Margin
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Volume / Stats */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Volume Dispensed
                </span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText size={14} />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-xl font-black text-slate-900">
                    {summary.totalPrescriptions}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">Prescriptions</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {summary.totalMedicines} medicine units dispensed
                </p>
              </div>
            </div>
          </div>

          {/* Missing Cost Notice Banner */}
          {summary.costMissingCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Missing Cost Alert: </span>
                {summary.costMissingCount} medicine units have no recorded purchase cost in inventory.
                Profit is calculated accurately without artificially assuming 100% margin on untracked stock.
              </div>
              <button
                onClick={() => {
                  setCostMissingFilter(!costMissingFilter);
                  setCurrentPage(1);
                }}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border transition-colors ${
                  costMissingFilter
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {costMissingFilter ? 'Show All' : 'Filter Missing'}
              </button>
            </div>
          )}

          {/* Search, Filters & Sorting Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patient name, UHID, medicine brand, generic formula, batch..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills & Sorting */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Patient Type OPD / IPD */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                {(['ALL', 'OPD', 'IPD'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setPatientTypeFilter(type);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      patientTypeFilter === type
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs shrink-0">
                <ArrowUpDown size={12} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] font-bold text-slate-700 outline-none uppercase cursor-pointer"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="profit_desc">Highest Profit</option>
                  <option value="selling_desc">Highest Revenue</option>
                </select>
              </div>

              {/* Expand / Collapse All */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={expandAllOnPage}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md uppercase tracking-wider transition-colors"
                >
                  Expand Page
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md uppercase tracking-wider transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* Prescriptions List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border border-slate-200">
              <div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Loading itemized pharmacy audit...
              </p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center bg-white rounded-xl border border-rose-100 text-rose-500 text-xs font-semibold">
              Failed to load pharma audit records. Please try again.
            </div>
          ) : filteredAndSortedPrescriptions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Dispensed Prescriptions Found</p>
              <p className="text-xs text-slate-400 mt-1">
                No pharmacy sales matched the selected filters for this doctor and time range.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedPrescriptions.map((prescription) => {
                const isExpanded = !!expandedPrescriptions[prescription.id];
                const dateObj = new Date(prescription.date);
                const dateStr = dateObj.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const timeStr = dateObj.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={prescription.id}
                    className={`bg-white rounded-xl border transition-all ${
                      isExpanded
                        ? 'border-emerald-300 shadow-sm ring-1 ring-emerald-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Prescription Card Header / Summary Row */}
                    <div
                      onClick={() => togglePrescription(prescription.id)}
                      className="p-3.5 sm:p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg mt-0.5 sm:mt-0 transition-colors ${
                            isExpanded
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {prescription.patient?.name}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                prescription.patient?.type === 'IPD'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {prescription.patient?.type}
                            </span>
                            {prescription.totals?.hasCostMissing && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                ⚠️ Missing Cost
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {dateStr} at {timeStr}
                            </span>
                            <span>•</span>
                            <span>MRN: <strong className="text-slate-600">{prescription.patient?.mrn}</strong></span>
                            <span>•</span>
                            <span>Invoice: <strong className="text-slate-600">{prescription.invoiceNo}</strong></span>
                            <span>•</span>
                            <span>Medicines: <strong className="text-slate-600">{prescription.medicines?.length || 0}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Header Financial Pills */}
                      <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Selling Price
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {formatCurrency(prescription.totals?.sellingAmount)}
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Purchase Cost
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-600">
                            {formatCurrency(prescription.totals?.purchasingAmount)}
                          </span>
                        </div>

                        <div className="text-right pl-2 border-l border-slate-200">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Net Profit
                          </span>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs sm:text-sm font-black text-emerald-600">
                              {formatCurrency(prescription.totals?.profit)}
                            </span>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              {prescription.totals?.profitMargin}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Medicine Details Table */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4 animate-in slide-in-from-top-1 duration-150">
                        {/* Desktop & Tablet Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">Medicine Name</th>
                                <th className="py-2.5 px-3">Form / Strength</th>
                                <th className="py-2.5 px-3">Batch / Expiry</th>
                                <th className="py-2.5 px-3 text-center">Qty</th>
                                <th className="py-2.5 px-3 text-right">Purchase Price</th>
                                <th className="py-2.5 px-3 text-right">Selling Price</th>
                                <th className="py-2.5 px-3 text-right">Profit & Margin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {prescription.medicines.map((med: any, mIdx: number) => {
                                const expStr = med.expiryDate
                                  ? new Date(med.expiryDate).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      year: '2-digit',
                                    })
                                  : '-';

                                return (
                                  <tr key={med.id || mIdx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2.5 px-3 text-slate-400 font-semibold">{mIdx + 1}</td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-slate-900">{med.brandName}</div>
                                      {med.genericName && (
                                        <div className="text-[10px] text-slate-500 font-medium">{med.genericName}</div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-700">
                                        {med.form}
                                      </span>
                                      {med.strength !== '-' && (
                                        <span className="text-[11px] ml-1.5 text-slate-500">{med.strength}</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      <div className="font-mono text-[11px] font-bold text-slate-700">{med.batchNo}</div>
                                      <div className="text-[10px] text-slate-400">Exp: {expStr}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                      {med.quantity}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-medium">
                                      {med.costMissing ? (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                          Cost Missing
                                        </span>
                                      ) : (
                                        <div>
                                          <div className="font-bold text-slate-800">
                                            {formatCurrency(med.totalPurchasePrice)}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-normal">
                                            @{formatCurrency(med.unitPurchasePrice)}/unit
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-medium">
                                      <div className="font-bold text-slate-900">
                                        {formatCurrency(med.totalSellingPrice)}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-normal">
                                        @{formatCurrency(med.unitSellingPrice)}/unit
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {med.costMissing ? (
                                        <span className="text-slate-400 text-xs italic">-</span>
                                      ) : (
                                        <div>
                                          <div className="font-black text-emerald-600">
                                            +{formatCurrency(med.profit)}
                                          </div>
                                          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                                            {med.profitMargin}%
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Card View */}
                        <div className="sm:hidden space-y-2.5">
                          {prescription.medicines.map((med: any, mIdx: number) => (
                            <div
                              key={med.id || mIdx}
                              className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-bold text-slate-900">{med.brandName}</div>
                                  {med.genericName && (
                                    <div className="text-[10px] text-slate-500">{med.genericName}</div>
                                  )}
                                </div>
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-700">
                                  {med.form}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                                <div>
                                  <span className="text-slate-400">Batch: </span>
                                  <strong className="text-slate-700 font-mono">{med.batchNo}</strong>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-400">Qty: </span>
                                  <strong className="text-slate-900">{med.quantity}</strong>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100 text-center">
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Purchase</span>
                                  <span className="font-bold text-slate-700 text-xs">
                                    {med.costMissing ? 'Missing' : formatCurrency(med.totalPurchasePrice)}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Selling</span>
                                  <span className="font-black text-slate-900 text-xs">
                                    {formatCurrency(med.totalSellingPrice)}
                                  </span>
                                </div>
                                <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100">
                                  <span className="text-[9px] text-emerald-700 uppercase font-bold block">Profit</span>
                                  <span className="font-black text-emerald-600 text-xs">
                                    {med.costMissing ? '-' : `+${formatCurrency(med.profit)}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredAndSortedPrescriptions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-400">
                  Showing {(safePage - 1) * pageSize + 1} -{' '}
                  {Math.min(safePage * pageSize, filteredAndSortedPrescriptions.length)} of{' '}
                  <strong>{filteredAndSortedPrescriptions.length}</strong> prescriptions
                </span>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total <strong className="text-slate-800">{filteredAndSortedPrescriptions.length}</strong> prescriptions found
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
