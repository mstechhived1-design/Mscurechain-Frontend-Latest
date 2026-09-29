"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  CalendarRange
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, Button } from "@/components/admin";
import { hospitalAdminService } from "@/lib/integrations";
import type { AttendanceRecord, AttendanceStats, AttendanceSummary } from "@/lib/integrations";
import { AttendancePDFPreview } from "./AttendancePDFPreview";
import type { AttendancePDFRow, AttendanceSummaryPDFRow } from "./AttendancePDFPreview";

const STATUS_CONFIG = {
  present: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Present" },
  absent: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Absent" },
  late: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50", label: "Late" },
  "half-day": { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", label: "Half Day" },
  "on-leave": { icon: Calendar, color: "text-blue-500", bg: "bg-blue-50", label: "On Leave" },
  "off-duty": { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Off Duty" },
  "auto-clock-out": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Auto Clock-Out" }
};

interface AttendanceClientProps {
  initialAttendance: AttendanceRecord[];
  initialStats: AttendanceStats;
  title?: string;
  roleFilter?: string;
}

// ============================================================================
// PERFORMANCE: Pagination Settings
// ============================================================================
const ITEMS_PER_PAGE = 20;

// ============================================================================
// PERFORMANCE: Memoized Attendance Row
// ============================================================================
// ============================================================================
// HELPERS: Safely resolve staff name / designation from any record shape.
// Backend returns different shapes: getMonthlyReport → staff.user.name,
// direct Attendance populate → user.name, virtual records → name directly.
// ============================================================================
const resolveStaffName = (record: any): string =>
  record?.staff?.user?.name ||
  record?.staff?.name ||
  record?.user?.name ||
  record?.name ||
  'Unknown Staff';

const resolveStaffDesignation = (record: any): string =>
  record?.staff?.designation ||
  record?.designation ||
  record?.staff?.user?.role ||
  record?.user?.role ||
  'Staff Member';

const AttendanceRow = React.memo(({
  record
}: {
  record: AttendanceRecord;
}) => {
  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.present;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} border`}>
        <Icon size={14} className={config.color} />
        <span className={config.color}>{config.label}</span>
      </div>
    );
  };

  const staffName = resolveStaffName(record);
  const staffDesignation = resolveStaffDesignation(record);
  const photoIn = (record as any).photoIn || (record as any).capturedPhoto || null;
  const photoOut = (record as any).photoOut || null;

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
      <td className="py-4 px-3 md:px-6">
        <div className="flex items-center gap-3">
          {photoIn ? (
            <div className="relative group cursor-pointer">
              <img 
                src={photoIn} 
                alt={staffName} 
                className="w-10 h-10 rounded-xl object-cover border border-emerald-200 shadow-sm" 
              />
              <div className="hidden group-hover:block absolute left-12 top-0 z-50 p-1 bg-white rounded-xl shadow-2xl border border-slate-200 w-32 h-32">
                <img src={photoIn} alt={staffName} className="w-full h-full object-cover rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-400">
              {staffName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{staffName}</p>
            <p className="text-[10px] text-gray-400 font-medium">{staffDesignation}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-sm font-medium text-gray-600 dark:text-gray-400">
        {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td className="py-4 px-3 md:px-6 text-[11px] font-medium text-emerald-600">
        {record.checkIn?.time ? formatTime(record.checkIn.time) : '--:--'}
      </td>
      <td className="py-4 px-3 md:px-6 text-[11px] font-medium text-rose-500">
        {record.checkOut?.time ? formatTime(record.checkOut.time) : '--:--'}
      </td>
      <td className="py-4 px-3 md:px-6">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {record.workingHours || 0}m
        </span>
      </td>
      <td className="py-4 px-3 md:px-6">
        {getStatusBadge(record.status)}
      </td>
    </tr>
  );
});

AttendanceRow.displayName = 'AttendanceRow';

// ============================================================================
// PERFORMANCE: Memoized Summary Row
// ============================================================================
const SummaryRow = React.memo(({
  data
}: {
  data: AttendanceSummary;
}) => {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG["off-duty"];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${config.bg} border border-transparent`}>
        <Icon size={12} className={config.color} />
        <span className={config.color}>{config.label}</span>
      </div>
    );
  };

  const percentage = Math.round((data.monthlyAttendedDays / (data.monthDaysTotal || 1)) * 100);

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
      <td className="py-4 px-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            {data.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {data.name || 'Unknown'}
            </p>
            <p className="text-[10px] font-medium text-gray-400">
              {/* Only show employeeId if it's a real value, not a backend placeholder */}
              {data.employeeId && !['N/A', 'EMP-N/A', '-'].includes(data.employeeId)
                ? data.employeeId
                : data.designation || ''}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6">
        <span className="text-xs font-medium text-gray-500">
          {data.designation || 'Staff'}
        </span>
      </td>
      <td className="py-4 px-3 md:px-6">
        {getStatusBadge(data.todayStatus)}
      </td>
      <td className="py-4 px-3 md:px-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex gap-1 items-baseline">
            <span className="text-sm font-bold text-indigo-600">{data.monthlyAttendedDays}</span>
            <span className="text-[10px] text-gray-400 font-medium">days</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-medium text-rose-500">{data.monthlyAbsentDays} Abs</span>
            <span className="text-[9px] font-medium text-amber-500">{data.monthlyLeaveDays} Lve</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex gap-1 items-baseline">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{data.yearlyAttendedDays}</span>
            <span className="text-[10px] text-gray-400 font-medium">days</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-medium text-rose-500">{data.yearlyAbsentDays} Abs</span>
            <span className="text-[9px] font-medium text-amber-500">{data.yearlyLeaveDays} Lve</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 md:px-6 text-right">
        <div className="flex flex-col text-[11px] font-medium">
          <span className="text-emerald-600">In: {formatTime(data.checkIn)}</span>
          <span className="text-gray-400">Out: {formatTime(data.checkOut)}</span>
        </div>
      </td>
    </tr>
  );
});

SummaryRow.displayName = 'SummaryRow';


// Helper to filter data by role — includes all roles (doctors, nurses, staff, helpdesk/frontdesk)
const rowFilterData = (data: any[], roleFilter?: string) => {
  return data.filter(item => {
    const role = (
      item.staff?.user?.role ||
      item.user?.role ||
      item.role ||
      ''
    ).toLowerCase();

    // If a specific role is requested, filter to that role only
    if (roleFilter) return role === roleFilter.toLowerCase();

    return true;
  });
};

function AttendanceClient({ initialAttendance, initialStats, title = "Staff Attendance", roleFilter }: AttendanceClientProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(rowFilterData(initialAttendance || [], roleFilter));

  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [stats, setStats] = useState<AttendanceStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'logs'>('summary');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customRange, setCustomRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // ── Hospital info for PDF header ──
  const [hospital, setHospital] = useState<any>({ name: '' });

  // ── PDF Preview state ──
  const [pdfPreview, setPdfPreview] = useState<{
    open: boolean;
    reportType: string;
    period: string;
    reportLabel: string;
    rows: AttendancePDFRow[] | AttendanceSummaryPDFRow[];
    isSummary: boolean;
  } | null>(null);

  useEffect(() => {
    hospitalAdminService.getHospital().then(r => {
      if (r?.hospital) setHospital(r.hospital);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchSummary();
  }, []);

  const fetchStaff = async () => {
    try {
      const [staffRes, drRes, nurseRes, helpRes] = await Promise.allSettled([
        hospitalAdminService.getStaff(),
        hospitalAdminService.getDoctors(),
        hospitalAdminService.getNurses(),
        hospitalAdminService.getHelpdesks(),
      ]);

      const allStaff: any[] = [];

      if (staffRes.status === 'fulfilled') allStaff.push(...(staffRes.value.staff || []));
      if (drRes.status === 'fulfilled') allStaff.push(...(drRes.value.doctors || []));
      if (nurseRes.status === 'fulfilled') allStaff.push(...(nurseRes.value.nurses || []));
      if (helpRes.status === 'fulfilled') {
          // Map helpdesk users to expected shape if needed, though they already have _id/name typically
          allStaff.push(...(helpRes.value.helpdesks || []));
      }

      // Always exclude admin; filter by explicit roleFilter if provided
      const filtered = allStaff.filter((s: any) => {
        const role = (s.user?.role || s.role || '').toLowerCase();
        if (role === 'hospital-admin') return false;
        if (roleFilter) return role === roleFilter.toLowerCase();
        return true;
      });

      // Deduplicate by user ID
      const uniqueStaff = Array.from(new Map(filtered.map(s => [s.user?._id || s._id, s])).values());
      setStaffList(uniqueStaff);
    } catch (e) {
      console.error("Staff fetch error", e);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await (hospitalAdminService as any).getAttendanceSummary();
      setSummary(rowFilterData(res.summary || [], roleFilter));
    } catch (e) {
      console.error("Summary fetch error", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus, filterStaff]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params: { date?: string; status?: string; staffId?: string } = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      if (filterStaff) params.staffId = filterStaff;

      const [attendanceResponse, statsResponse] = await Promise.all([
        hospitalAdminService.getAttendance(params),
        hospitalAdminService.getAttendanceStats()
      ]);

      setAttendance(rowFilterData(attendanceResponse.attendance || [], roleFilter));
      setStats(statsResponse.stats as any);
      setPage(1); // Reset page on filter change
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast.error(error.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };



  const exportSummaryReport = async () => {
    try {
      if (summary.length === 0) {
        toast.error("No summary data to export");
        return;
      }

      setLoading(true);
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Summary');

      // --- 1. Report Titles ---
      const titleRow = worksheet.addRow(['ATTENDANCE SUMMARY REPORT']);
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:K1');
      titleRow.height = 30;

      const orgRow = worksheet.addRow(['Attendance Summary Report']);
      orgRow.font = { name: 'Calibri', size: 12, bold: true };
      orgRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A2:K2');

      const periodRow = worksheet.addRow([`Report Generated: ${new Date().toLocaleDateString('en-GB')}`]);
      periodRow.font = { name: 'Calibri', size: 11, italic: true };
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A3:K3');

      worksheet.addRow([]); // Spacer

      // --- 2. Define Columns & Headers ---
      const headers = [
        "Staff Name", "Employee ID", "Designation", "Email",
        "Monthly Present", "Monthly Absent", "Monthly Leaves",
        "Yearly Present", "Yearly Absent", "Yearly Leaves",
        "Total Period Days"
      ];
      const headerRow = worksheet.addRow(headers);

      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0070C0' } },
          left: { style: 'thin', color: { argb: 'FF0070C0' } },
          bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
          right: { style: 'thin', color: { argb: 'FF0070C0' } }
        };
      });

      worksheet.columns = [
        { key: 'name', width: 25 },
        { key: 'empId', width: 15 },
        { key: 'designation', width: 20 },
        { key: 'email', width: 30 },
        { key: 'mPresent', width: 15 },
        { key: 'mAbsent', width: 15 },
        { key: 'mLeave', width: 15 },
        { key: 'yPresent', width: 15 },
        { key: 'yAbsent', width: 15 },
        { key: 'yLeave', width: 15 },
        { key: 'totalDays', width: 15 },
      ];

      // --- 3. Populate Data ---
      summary.forEach((s) => {
        const row = worksheet.addRow({
          name: s.name || 'Unknown',
          empId: s.employeeId || 'N/A',
          designation: s.designation || 'Staff',
          email: s.email || '-',
          mPresent: s.monthlyAttendedDays,
          mAbsent: s.monthlyAbsentDays,
          mLeave: s.monthlyLeaveDays,
          yPresent: s.yearlyAttendedDays,
          yAbsent: s.yearlyAbsentDays,
          yLeave: s.yearlyLeaveDays,
          totalDays: s.yearDaysTotal
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF0070C0' } },
            left: { style: 'thin', color: { argb: 'FF0070C0' } },
            bottom: { style: 'thin', color: { argb: 'FF0070C0' } },
            right: { style: 'thin', color: { argb: 'FF0070C0' } }
          };
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.click();
      toast.success("Consolidated summary report exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate summary report");
    } finally {
      setLoading(false);
    }
  };

  // ── Build PDF rows from fetched data ──
  const buildPDFRows = (data: any[]): AttendancePDFRow[] =>
    data.map(rec => ({
      name: rec.staff?.user?.name || rec.user?.name || 'Unknown',
      designation: rec.staff?.designation || rec.designation || 'Staff',
      employeeId: rec.staff?.employeeId || rec.employeeId || 'N/A',
      date: new Date(rec.date).toLocaleDateString('en-GB'),
      checkIn: rec.checkIn?.time ? new Date(rec.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      checkOut: rec.checkOut?.time ? new Date(rec.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      dutyHours: rec.workingHours ? `${Math.floor(rec.workingHours / 60)}h ${rec.workingHours % 60}m` : '0h 0m',
      status: rec.status || 'absent',
    }));

  const buildSummaryPDFRows = (data: any[]): AttendanceSummaryPDFRow[] =>
    data.map(s => ({
      name: s.name || 'Unknown',
      designation: s.designation || 'Staff',
      employeeId: s.employeeId || 'N/A',
      email: s.email || '-',
      monthlyPresent: s.monthlyAttendedDays,
      monthlyAbsent: s.monthlyAbsentDays,
      monthlyLeave: s.monthlyLeaveDays,
      yearlyPresent: s.yearlyAttendedDays,
      yearlyAbsent: s.yearlyAbsentDays,
      yearlyLeave: s.yearlyLeaveDays,
    }));

  // ── Main export dispatcher ──
  const handleExport = async (
    type: 'today' | 'weekly' | 'monthly' | 'yearly' | 'consolidated' | 'custom',
    format: 'pdf' | 'excel'
  ) => {
    setShowExportMenu(false);
    const now = new Date();

    // ── CONSOLIDATED SUMMARY ──
    if (type === 'consolidated') {
      if (summary.length === 0) { toast.error('No summary data available'); return; }
      if (format === 'pdf') {
        setPdfPreview({
          open: true,
          reportType: 'CONSOLIDATED SUMMARY',
          period: now.toLocaleDateString('en-GB'),
          reportLabel: 'Consolidated Summary',
          rows: buildSummaryPDFRows(summary),
          isSummary: true,
        });
      } else {
        exportSummaryReport();
      }
      return;
    }

    // ── CUSTOM: show picker ──
    if (type === 'custom') {
      setShowDateRangePicker(true);
      setShowExportMenu(true);
      return;
    }

    try {
      setLoading(true);
      const params: any = {};
      if (type === 'today') {
        params.date = now.toISOString().split('T')[0];
      } else if (type === 'weekly') {
        const last = new Date(); last.setDate(now.getDate() - 7);
        params.startDate = last.toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      } else if (type === 'monthly') {
        params.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else if (type === 'yearly') {
        params.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        params.endDate = now.toISOString().split('T')[0];
      }

      const res = await hospitalAdminService.getAttendance(params);
      const data = res.attendance || [];
      if (data.length === 0) { toast.error(`No records found for ${type}`); return; }

      const LABELS: Record<string, string> = {
        today: "Today's Attendance", weekly: 'Last 7 Days',
        monthly: 'Monthly Logs', yearly: 'Yearly Logs'
      };
      const PERIODS: Record<string, string> = {
        today: now.toLocaleDateString('en-GB'),
        weekly: `${new Date(Date.now() - 7*86400000).toLocaleDateString('en-GB')} – ${now.toLocaleDateString('en-GB')}`,
        monthly: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
        yearly: `Jan – Dec ${now.getFullYear()}`,
      };

      if (format === 'pdf') {
        setPdfPreview({
          open: true,
          reportType: type.toUpperCase(),
          period: PERIODS[type] || now.toLocaleDateString('en-GB'),
          reportLabel: LABELS[type] || type,
          rows: buildPDFRows(data),
          isSummary: false,
        });
      } else {
        await exportToExcel(data, type, now);
      }
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Custom date range export dispatcher ──
  const handleCustomExport = async (format: 'pdf' | 'excel') => {
    if (!customRange.from || !customRange.to) { toast.error('Select both dates'); return; }
    if (customRange.from > customRange.to) { toast.error('From date cannot be after To date'); return; }
    setShowExportMenu(false);
    setShowDateRangePicker(false);
    try {
      setLoading(true);
      const res = await hospitalAdminService.getAttendance({ startDate: customRange.from, endDate: customRange.to });
      const data = res.attendance || [];
      if (data.length === 0) { toast.error('No records in this range'); return; }
      const period = `${customRange.from} to ${customRange.to}`;
      if (format === 'pdf') {
        setPdfPreview({ open: true, reportType: 'CUSTOM RANGE', period, reportLabel: 'Custom Date Range', rows: buildPDFRows(data), isSummary: false });
      } else {
        await exportToExcel(data, 'custom', new Date(), period);
      }
    } catch (err) {
      console.error(err);
      toast.error('Custom export failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable Excel exporter ──
  const exportToExcel = async (data: any[], type: string, now: Date, customPeriod?: string) => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Attendance');
    const period = customPeriod || type.toUpperCase();

    const t = ws.addRow(['ATTENDANCE HISTORY LOGS']);
    t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells('A1:H1'); t.height = 30;
    const o = ws.addRow([hospital.name || 'ATTENDANCE REPORT']);
    o.font = { name: 'Calibri', size: 12, bold: true };
    o.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells('A2:H2');
    const p = ws.addRow([`Period: ${period} | Generated: ${now.toLocaleDateString('en-GB')}`]);
    p.font = { name: 'Calibri', size: 11, italic: true };
    p.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells('A3:H3');
    ws.addRow([]);

    const hdr = ws.addRow(['Personnel Name', 'Designation', 'Employee ID', 'Date', 'Check-In', 'Check-Out', 'Duty Hours', 'Status']);
    hdr.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
    });
    ws.columns = [
      { key: 'name', width: 25 }, { key: 'designation', width: 20 }, { key: 'empId', width: 15 },
      { key: 'date', width: 12 }, { key: 'in', width: 15 }, { key: 'out', width: 15 }, { key: 'hours', width: 15 }, { key: 'status', width: 15 },
    ];
    data.forEach((rec: any) => {
      const row = ws.addRow({
        name: rec.staff?.user?.name || rec.user?.name || 'Unknown',
        designation: rec.staff?.designation || 'Staff',
        empId: rec.staff?.employeeId || 'N/A',
        date: new Date(rec.date).toLocaleDateString('en-GB'),
        in: rec.checkIn?.time ? new Date(rec.checkIn.time).toLocaleTimeString() : '-',
        out: rec.checkOut?.time ? new Date(rec.checkOut.time).toLocaleTimeString() : '-',
        hours: Number((rec.workingHours || 0) / 60).toFixed(2),
        status: (rec.status || 'absent').toUpperCase(),
      });
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin', color: { argb: 'FF0070C0' } }, left: { style: 'thin', color: { argb: 'FF0070C0' } }, bottom: { style: 'thin', color: { argb: 'FF0070C0' } }, right: { style: 'thin', color: { argb: 'FF0070C0' } } };
        cell.font = { name: 'Calibri', size: 10 };
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${type}_${now.toISOString().split('T')[0]}.xlsx`);
    link.click();
    toast.success('Excel report downloaded');
  };

  // ✅ PERFORMANCE: Pagination Logic
  const paginatedAttendance = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return attendance.slice(start, start + ITEMS_PER_PAGE);
  }, [attendance, page]);

  const totalPages = Math.ceil(attendance.length / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Dynamic Header with Advanced Filters */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
         {/* Top Row: Identification & Stats */}
         <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
            {/* Heading */}
            <div className="shrink-0 flex items-center gap-2 px-1">
               <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Users className="w-5 h-5 md:w-6 md:h-6" />
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                     {title || "Staff Attendance"}
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                     {stats.totalStaff} Personnel
                  </p>
               </div>
            </div>

            {/* Miniature Stats Row */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                  <div className="p-1 bg-white rounded-md shadow-sm"><Users className="w-3.5 h-3.5 text-gray-500" /></div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total</span>
                     <span className="text-xs font-bold text-gray-700 leading-none">{stats.totalStaff}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
                  <div className="p-1 bg-white rounded-md shadow-sm"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /></div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">Present</span>
                     <span className="text-xs font-bold text-emerald-700 leading-none">{stats.today?.present || 0}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
                  <div className="p-1 bg-white rounded-md shadow-sm"><Clock className="w-3.5 h-3.5 text-amber-500" /></div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/70">Late</span>
                     <span className="text-xs font-bold text-amber-700 leading-none">{stats.today?.late || 0}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 rounded-lg border border-indigo-100 shrink-0">
                  <div className="p-1 bg-white rounded-md shadow-sm"><TrendingUp className="w-3.5 h-3.5 text-indigo-500" /></div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600/70">Avg</span>
                     <span className="text-xs font-bold text-indigo-700 leading-none">{stats.averageAttendance}%</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Bottom Row: Control Center (Tabs & Filters) */}
         <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-200 shrink-0">
               <button
                  onClick={() => setViewMode('summary')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
               >
                  <LayoutGrid size={14} className="shrink-0" /> <span className="truncate">Summary Report</span>
               </button>
               <button
                  onClick={() => setViewMode('logs')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
               >
                  <List size={14} className="shrink-0" /> <span className="truncate">History Logs</span>
               </button>
            </div>

            {/* Filters & Pagination */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
               
               {/* Export Button inside header */}
               <div className="relative shrink-0 sm:w-44">
                  <Button
                    variant="primary"
                    onClick={() => { setShowExportMenu(!showExportMenu); setShowDateRangePicker(false); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all h-[34px]"
                  >
                    <FileSpreadsheet size={14} />
                    Report
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                  </Button>

               {showExportMenu && (
                  <>
                     <div className="fixed inset-0 z-10" onClick={() => { setShowExportMenu(false); setShowDateRangePicker(false); }} />
                     <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden origin-top-left">

                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Select Report Type</p>
                    <p className="text-[9px] text-indigo-200 mt-0.5">Choose format: PDF preview or Excel download</p>
                  </div>

                  {/* Report rows with PDF / Excel buttons */}
                  <div className="py-1">
                    {[
                      { key: 'consolidated', label: 'Consolidated Summary', icon: '📊' },
                      { key: 'today',        label: "Today's Attendance",   icon: '📅' },
                      { key: 'weekly',       label: 'Last 7 Days',          icon: '📆' },
                      { key: 'monthly',      label: 'Monthly Logs',         icon: '🗓️' },
                      { key: 'yearly',       label: 'Yearly Logs',          icon: '📈' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between px-3 py-2 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors group">
                        <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-700">
                          <span>{item.icon}</span>{item.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleExport(item.key as any, 'pdf')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-100 hover:border-rose-600 rounded-lg text-[10px] font-bold transition-all"
                            title="Preview & Download PDF"
                          >
                            <FileText size={11} /> PDF
                          </button>
                          <button
                            onClick={() => handleExport(item.key as any, 'excel')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 border border-emerald-100 hover:border-emerald-600 rounded-lg text-[10px] font-bold transition-all"
                            title="Download Excel"
                          >
                            <FileSpreadsheet size={11} /> XLS
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Date Range */}
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setShowDateRangePicker(prev => !prev)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <CalendarRange size={13} /> Custom Date Range
                      <ChevronDown size={11} className={`ml-auto transition-transform ${showDateRangePicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showDateRangePicker && (
                      <div className="px-4 pb-4 space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
                            <input type="date" value={customRange.from} max={customRange.to}
                              onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                            <input type="date" value={customRange.to} max={new Date().toISOString().split('T')[0]}
                              onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleCustomExport('pdf')}
                            className="flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors">
                            <FileText size={12} /> PDF Preview
                          </button>
                          <button onClick={() => handleCustomExport('excel')}
                            className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors">
                            <FileSpreadsheet size={12} /> Excel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>

            {/* Optional Date Filter */}
            {viewMode === 'logs' && (
               <div className="relative shrink-0 sm:w-36">
                  <CalendarRange className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                     type="date"
                     value={filterDate}
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-[34px]"
                  />
               </div>
            )}

            {/* Status Filter */}
            <div className="relative shrink-0 sm:w-32">
               <AlertCircle className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer h-[34px]"
               >
                  <option value="">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half Day</option>
                  <option value="on-leave">On Leave</option>
               </select>
            </div>

            {/* Staff Member Search/Dropdown - Takes remaining width */}
            <div className="relative flex-1">
               <Users className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer h-[34px]"
               >
                  <option value="">All Personnel</option>
                  {staffList.map((s: any) => (
                     <option key={s.user?._id || s._id} value={s.user?._id || s._id}>
                        {s.user?.name || s.name}
                     </option>
                  ))}
               </select>
            </div>

            {/* Header Pagination */}
            {totalPages > 1 && viewMode === 'logs' && (
               <div className="flex items-center gap-2 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200 h-[34px]">
                  <button
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                     disabled={page === 1}
                     className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm h-full flex items-center"
                  >
                     <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-black tracking-widest text-gray-400 px-1">
                     {page} / {totalPages || 1}
                  </span>
                  <button
                     onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                     disabled={page >= totalPages}
                     className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm h-full flex items-center"
                  >
                     <ChevronRight size={16} />
                  </button>
               </div>
            )}
         </div>
      </div>
   </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 dark:bg-gray-950/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-bold text-indigo-600">Updating records...</p>
          </div>
        </div>
      )}

      {/* Data Representation */}
      <Card padding="p-0" className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          {viewMode === 'summary' ? (
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Staff Member</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Designation</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Today's Pulse</th>
                  <th className="py-4 px-3 md:px-6 text-center text-xs font-bold text-gray-400">Monthly Stats</th>
                  <th className="py-4 px-3 md:px-6 text-center text-xs font-bold text-gray-400">Yearly Stats</th>
                  <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Daily Timing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="text-gray-200 dark:text-gray-800 mb-4" size={48} />
                        <p className="text-xs font-bold text-gray-400">No staff found for this period</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary
                    .filter(s => (!filterStaff || s.userId === filterStaff) && (!filterStatus || s.todayStatus === filterStatus))
                    .map((s) => (
                      <SummaryRow key={s.userId} data={s} />
                    ))
                )}
              </tbody>
            </table></div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Staff Unit</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Date</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Check-In</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Check-Out</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Duration</th>
                    <th className="py-4 px-3 md:px-6 text-left text-xs font-bold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center">
                          <Calendar className="text-gray-200 mb-4" size={48} />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Nulled Records in this quadrant</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendance.map((record) => (
                      <AttendanceRow
                        key={record._id}
                        record={record}
                      />
                    ))
                  )}
                </tbody>
              </table></div>

            </div>
          )}
        </div>
      </Card>

      {/* ── PDF PREVIEW MODAL ── */}
      {pdfPreview?.open && (
        <AttendancePDFPreview
          hospital={hospital}
          reportType={pdfPreview.reportType}
          period={pdfPreview.period}
          reportLabel={pdfPreview.reportLabel}
          rows={pdfPreview.rows}
          isSummary={pdfPreview.isSummary}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  );
}

// ✅ PERFORMANCE: Memoized component
export default React.memo(AttendanceClient);
