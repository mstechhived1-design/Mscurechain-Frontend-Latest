'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Download,
  Pill,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calendar,
  IndianRupee,
  Package,
  ChevronLeft,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { HOSPITAL_ADMIN_ENDPOINTS } from '@/lib/integrations/config/endpoints';
import { useDoctorPharmaAudit } from '@/lib/integrations/hooks/useHospitalAdminQueries';
import ExcelJS from 'exceljs';

export default function DoctorPharmaRevenuePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hospitalId = (params?.hospitalId as string) || '';
  const initialDoctorId = searchParams?.get('doctorId') || 'all';
  const initialRange = searchParams?.get('range') || '30d';
  const initialStartDate = searchParams?.get('startDate') || '';
  const initialEndDate = searchParams?.get('endDate') || '';

  // Page States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId);
  const [range, setRange] = useState<string>(initialRange);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);

  // Doctor Search Dropdown State
  const [doctorSearchText, setDoctorSearchText] = useState('');
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  // Mobile Visibility Toggles (Cards & Filters OFF / Closed by default on mobile)
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [patientTypeFilter, setPatientTypeFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [costMissingFilter, setCostMissingFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'profit_desc' | 'selling_desc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<string, boolean>>({});

  // Close doctor dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setIsDoctorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 1. Fetch Doctors list for the searchable dropdown
  const { data: doctorsList = [] } = useQuery({
    queryKey: ['hospital-doctors-list-for-pharma', hospitalId],
    queryFn: async () => {
      const url = new URL(`${window.location.origin}${HOSPITAL_ADMIN_ENDPOINTS.DOCTOR_PERFORMANCE}`);
      url.searchParams.append('range', '30d');
      return await apiClient<any[]>(url.pathname + url.search);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Selected Doctor Object
  const currentDoctor = useMemo(() => {
    if (selectedDoctorId === 'all') {
      return { doctorId: 'all', name: 'All Doctors (Hospital Wide)', department: 'All Departments' };
    }
    return (
      doctorsList.find((d: any) => d.doctorId === selectedDoctorId) || {
        doctorId: selectedDoctorId,
        name: 'Doctor',
        department: 'Clinical',
      }
    );
  }, [doctorsList, selectedDoctorId]);

  // Filtered doctors list based on search text inside dropdown
  const filteredDoctors = useMemo(() => {
    const q = doctorSearchText.toLowerCase().trim();
    if (!q) return doctorsList;
    return doctorsList.filter(
      (doc: any) =>
        (doc.name || '').toLowerCase().includes(q) ||
        (doc.department || '').toLowerCase().includes(q)
    );
  }, [doctorsList, doctorSearchText]);

  // 2. Fetch Pharma Audit Data for the selected doctor
  const { data: auditData, isLoading, isFetching, isError, refetch } = useDoctorPharmaAudit(
    selectedDoctorId,
    {
      range,
      startDate,
      endDate,
    },
    !!selectedDoctorId
  );

  const summary = auditData?.summary || {
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
    if (!auditData?.prescriptions) return [];

    let list = auditData.prescriptions.filter((p: any) => {
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
        const docN = (p.doctorName || '').toLowerCase();
        const rxId = (p.prescriptionId || '').toLowerCase();
        const medMatch = (p.medicines || []).some(
          (m: any) =>
            (m.brandName || '').toLowerCase().includes(query) ||
            (m.genericName || '').toLowerCase().includes(query) ||
            (m.batchNo || '').toLowerCase().includes(query)
        );
        return (
          pName.includes(query) ||
          pMrn.includes(query) ||
          invNo.includes(query) ||
          docN.includes(query) ||
          rxId.includes(query) ||
          medMatch
        );
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
  }, [auditData?.prescriptions, patientTypeFilter, costMissingFilter, searchQuery, sortBy]);

  // Pagination Math
  const totalItems = filteredAndSortedPrescriptions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredAndSortedPrescriptions.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPrescriptions, safePage, pageSize]);

  // Toggle single prescription
  const togglePrescription = (id: string) => {
    setExpandedPrescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Expand all on current page
  const expandAllOnPage = () => {
    const next: Record<string, boolean> = {};
    paginatedPrescriptions.forEach((p) => {
      next[p.id] = true;
    });
    setExpandedPrescriptions(next);
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedPrescriptions({});
  };

  // Excel Export
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Doctor Pharma Audit');

      const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Title Row
      sheet.mergeCells('A1:K1');
      const titleRow = sheet.getRow(1);
      titleRow.getCell(1).value = 'DOCTOR-DRIVEN PHARMACY REVENUE & PROFITABILITY AUDIT';
      titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 28;

      // Doctor & Period Subtitle
      sheet.mergeCells('A2:K2');
      const subRow = sheet.getRow(2);
      subRow.getCell(1).value = `Doctor: ${currentDoctor.name} | Period: ${range.toUpperCase()} | Generated: ${new Date().toLocaleString('en-IN')}`;
      subRow.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      subRow.height = 20;

      sheet.addRow([]);

      // Headers Row
      const headers = [
        'Date & Time',
        'Doctor Name',
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
            idx === 0 ? (p.doctorName || currentDoctor.name) : '',
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
            if (colNum >= 9) {
              cell.numFmt = '₹#,##0.00';
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else if (colNum === 8) {
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
        if (colNum >= 9) {
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // Column widths
      sheet.getColumn(1).width = 18;
      sheet.getColumn(2).width = 20;
      sheet.getColumn(3).width = 22;
      sheet.getColumn(4).width = 15;
      sheet.getColumn(5).width = 10;
      sheet.getColumn(6).width = 28;
      sheet.getColumn(7).width = 14;
      sheet.getColumn(8).width = 8;
      sheet.getColumn(9).width = 16;
      sheet.getColumn(10).width = 16;
      sheet.getColumn(11).width = 16;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Doctor_Pharma_Audit_${currentDoctor.name.replace(/\s+/g, '_')}_${range}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Pharma Audit:', err);
      alert('Failed to generate Excel export.');
    }
  };

  return (
    <div className="w-full space-y-2 p-0">
      {/* ─── 1. COMPACT TOP HEADER ─── */}
      <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Link
            href={`/${hospitalId}/hospital-admin/analytics`}
            className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shrink-0"
            title="Back to Analytics"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 hidden xs:flex">
            <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 truncate">
                Pharma Revenue Audit
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
                Realized Sales
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 font-medium truncate">
              Financial attribution of doctor-prescribed medicines dispensed & paid
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Open KPI Cards Modal on Mobile/Tablet */}
          <button
            onClick={() => setIsCardsModalOpen(true)}
            className="lg:hidden flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg transition-colors"
            title="View Summary Cards"
          >
            <BarChart3 size={12} className="shrink-0" />
            <span>Cards</span>
          </button>

          {/* Toggle Filters on Mobile/Tablet */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`lg:hidden flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
              showMobileFilters
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
            title="Toggle Filters"
          >
            <SlidersHorizontal size={12} className="shrink-0" />
            <span>Filter</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-indigo-600' : ''} />
          </button>

          {/* Export Excel Button */}
          <button
            onClick={exportToExcel}
            disabled={isLoading || filteredAndSortedPrescriptions.length === 0}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 shrink-0"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SLEEK & COMPACT DOCTOR SELECTOR & DATE FILTER BAR (1 Row on Desktop, 2 Rows on Mobile) ─── */}
      <div
        className={`${
          showMobileFilters ? 'block' : 'hidden md:block'
        } bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          {/* A. SEARCHABLE DOCTOR DROPDOWN (Compact max-w-xs on Desktop, Full Width on Mobile) */}
          <div ref={doctorDropdownRef} className="relative flex-1 min-w-[200px] max-w-full md:max-w-xs">
            <button
              type="button"
              onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
              className="w-full h-8 px-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between gap-1.5 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Stethoscope size={13} className="text-indigo-600 shrink-0" />
                <span className="truncate text-slate-800">
                  {selectedDoctorId === 'all'
                    ? 'All Doctors (Hospital Wide)'
                    : `Dr. ${currentDoctor.name.replace(/^Dr\.\s*/i, '')} (${currentDoctor.department || 'General'})`}
                </span>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu Popover */}
            {isDoctorDropdownOpen && (
              <div className="absolute left-0 top-9 z-50 w-full sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1.5">
                {/* Search input inside doctor dropdown */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={doctorSearchText}
                    onChange={(e) => setDoctorSearchText(e.target.value)}
                    placeholder="Search doctor or specialty..."
                    autoFocus
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400"
                  />
                  {doctorSearchText && (
                    <button
                      onClick={() => setDoctorSearchText('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Doctor options list */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <button
                    onClick={() => {
                      setSelectedDoctorId('all');
                      setIsDoctorDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      selectedDoctorId === 'all'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>🌟 All Doctors (Hospital Wide)</span>
                    {selectedDoctorId === 'all' && <Check size={14} className="text-indigo-600" />}
                  </button>

                  {filteredDoctors.map((doc: any) => {
                    const isSelected = selectedDoctorId === doc.doctorId;
                    return (
                      <button
                        key={doc.doctorId}
                        onClick={() => {
                          setSelectedDoctorId(doc.doctorId);
                          setIsDoctorDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div>Dr. {doc.name.replace(/^Dr\.\s*/i, '')}</div>
                          <div className="text-[10px] text-slate-400">{doc.department || 'General'}</div>
                        </div>
                        {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredDoctors.length === 0 && (
                    <div className="py-3 text-center text-xs text-slate-400 font-medium">
                      No doctor matching &quot;{doctorSearchText}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* B. DATE FILTERS (Inline with Doctor on Desktop, Row 2 on Mobile) */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            {/* Predefined Pills: 7D, 30D, 90D */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8 shrink-0">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRange(r);
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className={`px-2 sm:px-2.5 h-7 text-[10px] sm:text-[11px] font-bold rounded-md uppercase transition-all ${
                    range === r
                      ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs (Interactive Native & Click-to-Open Date Picker) */}
            <div className="flex-1 md:flex-initial min-w-0 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 h-8">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRange('custom');
                  setCurrentPage(1);
                }}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="w-28 sm:w-32 bg-transparent text-[11px] sm:text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs shrink-0">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRange('custom');
                  setCurrentPage(1);
                }}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="w-28 sm:w-32 bg-transparent text-[11px] sm:text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                title="End Date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setRange('30d');
                    setCurrentPage(1);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0 text-xs font-bold"
                  title="Clear Dates"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. MOBILE & TABLET POPUP MODAL FOR KPI CARDS ─── */}
      {isCardsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsCardsModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-3 p-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Financial Summary & KPIs</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Realized revenue & profit breakdown</p>
                </div>
              </div>
              <button
                onClick={() => setIsCardsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Cards in 2x2 Grid inside the Modal */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Selling Revenue */}
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selling Amount
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 block truncate">
                    {formatCurrency(summary.totalSelling)}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">Billed sales</span>
                </div>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                  <IndianRupee size={14} />
                </div>
              </div>

              {/* Card 2: Purchase Cost */}
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Purchase Cost
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-800 block truncate">
                    {formatCurrency(summary.totalPurchasing)}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">Procurement cost</span>
                </div>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                  <Package size={14} />
                </div>
              </div>

              {/* Card 3: Net Profit */}
              <div className="bg-emerald-50/50 p-2.5 sm:p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Net Profit
                  </span>
                  <div className="flex items-baseline gap-1 truncate">
                    <span className="text-sm sm:text-base font-black text-emerald-600 truncate">
                      {formatCurrency(summary.netProfit)}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                      +{summary.profitMargin}%
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-700 block truncate">Realized margin</span>
                </div>
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <TrendingUp size={14} />
                </div>
              </div>

              {/* Card 4: Volume Dispensed */}
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Volume Dispensed
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 block truncate">
                    {summary.totalPrescriptions}{' '}
                    <span className="text-[10px] text-slate-500 font-semibold">Rx</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {summary.totalMedicines} medicine units
                  </span>
                </div>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <FileText size={14} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-1">
              <button
                onClick={() => setIsCardsModalOpen(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. DESKTOP KPI CARDS (Inline 4-column grid, hidden on mobile & tablet) ─── */}
      <div className="hidden lg:grid grid-cols-4 gap-2.5">
        {/* Card 1: Selling Revenue */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Selling Amount
            </span>
            <span className="text-lg font-black text-slate-900 block truncate">
              {formatCurrency(summary.totalSelling)}
            </span>
            <span className="text-[9px] text-slate-400 block truncate">Billed sales</span>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <IndianRupee size={15} />
          </div>
        </div>

        {/* Card 2: Purchase Cost */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Purchase Cost
            </span>
            <span className="text-lg font-black text-slate-800 block truncate">
              {formatCurrency(summary.totalPurchasing)}
            </span>
            <span className="text-[9px] text-slate-400 block truncate">Procurement cost</span>
          </div>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <Package size={15} />
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Net Profit
            </span>
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-lg font-black text-emerald-600 truncate">
                {formatCurrency(summary.netProfit)}
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                +{summary.profitMargin}%
              </span>
            </div>
            <span className="text-[9px] text-emerald-700 block truncate">Realized margin</span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <TrendingUp size={15} />
          </div>
        </div>

        {/* Card 4: Volume Dispensed */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Volume Dispensed
            </span>
            <span className="text-lg font-black text-slate-900 block truncate">
              {summary.totalPrescriptions}{' '}
              <span className="text-[10px] text-slate-500 font-semibold">Rx</span>
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              {summary.totalMedicines} medicine units
            </span>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <FileText size={15} />
          </div>
        </div>
      </div>

      {/* Missing Cost Notice Banner (Compact) */}
      {summary.costMissingCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] shadow-2xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>Cost Alert:</strong> {summary.costMissingCount} items have missing purchase cost.
            </span>
          </div>
          <button
            onClick={() => {
              setCostMissingFilter(!costMissingFilter);
              setCurrentPage(1);
            }}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-colors shrink-0 ${
              costMissingFilter
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {costMissingFilter ? 'Show All' : 'Filter Missing'}
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          4. COMBINED SEARCH, FILTERS, LIVE COUNT & TOP PAGINATION ROW
          (All unified in one single top bar)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          {/* Left Group: Search Bar + Patient Type (OPD/IPD) + Live Count Badge */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[140px] max-w-full sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patient, UHID, doctor, medicine, batch..."
                className="w-full pl-8 pr-6 h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Patient Type OPD / IPD Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8 shrink-0">
              {(['ALL', 'OPD', 'IPD'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setPatientTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  className={`px-2 h-7 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                    patientTypeFilter === type
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* LIVE COUNT BADGE */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 h-8 rounded-lg border border-slate-200 text-xs font-bold shrink-0">
              <span>{filteredAndSortedPrescriptions.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Prescriptions</span>
            </div>
          </div>

          {/* Right Group: Sort + TOP PAGINATION (Live in Header) + Expand/Collapse */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap shrink-0">
            {/* Live Count on Mobile */}
            <span className="sm:hidden text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
              {filteredAndSortedPrescriptions.length} Rx
            </span>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 h-8 text-xs shrink-0">
              <ArrowUpDown size={11} className="text-slate-400" />
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
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                onClick={expandAllOnPage}
                className="px-2 h-8 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg uppercase tracking-wider transition-colors"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="px-2 h-8 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg uppercase tracking-wider transition-colors"
              >
                Collapse
              </button>
            </div>

            {/* TOP PAGINATION CONTROLS (Live above list in same header row) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg h-8 shrink-0">
              {/* Rows Per Page */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10px] font-bold text-slate-700 outline-none px-1 cursor-pointer"
                title="Rows per page"
              >
                <option value={5}>5 / pg</option>
                <option value={10}>10 / pg</option>
                <option value={25}>25 / pg</option>
                <option value={50}>50 / pg</option>
              </select>

              <span className="text-slate-300">|</span>

              {/* Prev Page Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Indicator */}
              <span className="text-[11px] font-bold text-slate-800 px-1">
                {safePage} / {totalPages}
              </span>

              {/* Next Page Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. PRESCRIPTIONS & MEDICINES LIST
      ────────────────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="w-7 h-7 border-3 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Loading pharmacy audit records...
          </p>
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-100 shadow-xs text-rose-500 text-xs font-semibold">
          Failed to load pharma audit records. Please verify connectivity and try again.
        </div>
      ) : filteredAndSortedPrescriptions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
          <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Dispensed Prescriptions Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No pharmacy sales matched the selected filters for {currentDoctor.name} in this time period.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
                className={`bg-white rounded-xl border transition-all shadow-xs ${
                  isExpanded
                    ? 'border-emerald-300 ring-1 ring-emerald-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Prescription Group Header Card */}
                <div
                  onClick={() => togglePrescription(prescription.id)}
                  className="p-2 sm:p-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Patient Details */}
                  <div className="flex items-start sm:items-center gap-2">
                    <button
                      type="button"
                      className={`p-1 rounded-lg transition-transform shrink-0 ${
                        isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {prescription.patient?.name}
                        </span>
                        <span
                          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                            prescription.patient?.type === 'IPD'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {prescription.patient?.type}
                        </span>
                        {prescription.doctorName && (
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            Dr. {prescription.doctorName.replace(/^Dr\.\s*/i, '')}
                          </span>
                        )}
                        {prescription.totals?.hasCostMissing && (
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                            ⚠️ Missing Cost
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <Calendar size={11} className="text-slate-400" />
                          {dateStr} at {timeStr}
                        </span>
                        <span>•</span>
                        <span>
                          MRN: <strong className="text-slate-600 font-bold">{prescription.patient?.mrn}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Invoice: <strong className="text-slate-600 font-bold">{prescription.invoiceNo}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Medicines: <strong className="text-slate-600 font-bold">{prescription.medicines?.length || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Group Financial Summary */}
                  <div className="flex items-center gap-2.5 justify-between md:justify-end border-t md:border-t-0 pt-1.5 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                        Selling Price
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {formatCurrency(prescription.totals?.sellingAmount)}
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                        Purchase Cost
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-600">
                        {formatCurrency(prescription.totals?.purchasingAmount)}
                      </span>
                    </div>

                    <div className="text-right pl-2 border-l border-slate-200">
                      <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Net Profit
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs sm:text-sm font-black text-emerald-600">
                          {formatCurrency(prescription.totals?.profit)}
                        </span>
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                          {prescription.totals?.profitMargin}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Medicine Details Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3">
                    {/* Desktop & Tablet Table */}
                    <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5">#</th>
                            <th className="py-2 px-2.5">Medicine Name</th>
                            <th className="py-2 px-2.5">Form / Strength</th>
                            <th className="py-2 px-2.5">Batch / Expiry</th>
                            <th className="py-2 px-2.5 text-center">Qty</th>
                            <th className="py-2 px-2.5 text-right">Purchase Price</th>
                            <th className="py-2 px-2.5 text-right">Selling Price</th>
                            <th className="py-2 px-2.5 text-right">Profit & Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescription.medicines.map((med: any, mIdx: number) => {
                            const expStr = (() => {
                              if (!med.expiryDate) return '-';
                              const d = new Date(med.expiryDate);
                              if (isNaN(d.getTime())) return String(med.expiryDate);
                              const day = d.getUTCDate();
                              const month = d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
                              const year = d.getUTCFullYear();
                              return day > 1 ? `${day} ${month} ${year}` : `${month} ${year}`;
                            })();

                            return (
                              <tr key={med.id || mIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2 px-2.5 text-slate-400 font-semibold">{mIdx + 1}</td>
                                <td className="py-2 px-2.5">
                                  <div className="font-bold text-slate-900">{med.brandName}</div>
                                  {med.genericName && (
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      {med.genericName}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-slate-600 font-medium">
                                  <span className="inline-block px-1.5 py-0.2 bg-slate-100 rounded text-[9px] font-bold uppercase text-slate-700">
                                    {med.form}
                                  </span>
                                  {med.strength !== '-' && (
                                    <span className="text-[10px] ml-1 text-slate-500">{med.strength}</span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-slate-600">
                                  <div className="font-mono text-[10px] font-bold text-slate-700">
                                    {med.batchNo}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-medium">Exp: {expStr}</div>
                                </td>
                                <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                                  {med.quantity}
                                </td>
                                <td className="py-2 px-2.5 text-right font-medium">
                                  {med.costMissing ? (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                      Missing
                                    </span>
                                  ) : (
                                    <div>
                                      <div className="font-bold text-slate-800">
                                        {formatCurrency(med.totalPurchasePrice)}
                                      </div>
                                      <div className="text-[9px] text-slate-400 font-normal">
                                        {formatCurrency(med.unitPurchasePrice)} / unit
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-medium">
                                  <div className="font-bold text-slate-900">
                                    {formatCurrency(med.totalSellingPrice)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-normal">
                                    {formatCurrency(med.unitSellingPrice)} / unit
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 text-right">
                                  {med.costMissing ? (
                                    <span className="text-slate-400 text-xs italic">-</span>
                                  ) : (
                                    <div>
                                      <div className="font-black text-emerald-600">
                                        +{formatCurrency(med.profit)}
                                      </div>
                                      <span className="inline-block text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
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
                    <div className="sm:hidden space-y-1.5">
                      {prescription.medicines.map((med: any, mIdx: number) => (
                        <div
                          key={med.id || mIdx}
                          className="bg-white p-2 rounded-lg border border-slate-200 space-y-1.5 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{med.brandName}</div>
                              {med.genericName && (
                                <div className="text-[10px] text-slate-500">{med.genericName}</div>
                              )}
                            </div>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase">
                              {med.form}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 p-1 rounded">
                            <span>
                              Batch: <strong className="text-slate-700">{med.batchNo}</strong>
                              {med.expiryDate && (
                                <span className="ml-1 text-slate-400">
                                  (Exp: {(() => {
                                    const d = new Date(med.expiryDate);
                                    if (isNaN(d.getTime())) return String(med.expiryDate);
                                    const day = d.getUTCDate();
                                    const month = d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
                                    const year = d.getUTCFullYear();
                                    return day > 1 ? `${day} ${month} ${year}` : `${month} ${year}`;
                                  })()})
                                </span>
                              )}
                            </span>
                            <span>
                              Qty: <strong className="text-slate-900 font-bold">{med.quantity}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-center">
                            <div className="bg-slate-50 p-1 rounded">
                              <span className="text-[8px] font-bold text-slate-400 uppercase block">Purchase</span>
                              <span className="text-[11px] font-bold text-slate-700">
                                {med.costMissing ? 'Missing' : formatCurrency(med.totalPurchasePrice)}
                              </span>
                            </div>

                            <div className="bg-slate-50 p-1 rounded">
                              <span className="text-[8px] font-bold text-slate-400 uppercase block">Selling</span>
                              <span className="text-[11px] font-bold text-slate-900">
                                {formatCurrency(med.totalSellingPrice)}
                              </span>
                            </div>

                            <div className="bg-emerald-50 p-1 rounded border border-emerald-100">
                              <span className="text-[8px] font-bold text-emerald-700 uppercase block">Profit</span>
                              <span className="text-[11px] font-black text-emerald-600">
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
    </div>
  );
}
