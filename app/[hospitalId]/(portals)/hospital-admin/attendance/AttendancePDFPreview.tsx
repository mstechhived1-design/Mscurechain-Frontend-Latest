"use client";

import React, { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import MainHeader from "@/components/printers/MainHeader";
import MainFooter from "@/components/printers/MainFooter";
import { usePrintStore } from "@/stores/printStore";

export interface AttendancePDFRow {
  name: string;
  designation: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  dutyHours: string;
  status: string;
}

export interface AttendanceSummaryPDFRow {
  name: string;
  designation: string;
  employeeId: string;
  email: string;
  monthlyPresent: number;
  monthlyAbsent: number;
  monthlyLeave: number;
  yearlyPresent: number;
  yearlyAbsent: number;
  yearlyLeave: number;
}

interface HospitalInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

interface AttendancePDFPreviewProps {
  hospital: HospitalInfo;
  reportType: string;
  period: string;
  reportLabel: string;
  rows: AttendancePDFRow[] | AttendanceSummaryPDFRow[];
  isSummary?: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  present: "#16a34a",
  late: "#d97706",
  absent: "#dc2626",
  "on-leave": "#2563eb",
  "off-duty": "#6b7280",
  "half-day": "#ea580c",
};

function buildAttendanceHtml(opts: {
  headerHtml: string;
  footerHtml: string;
  reportLabel: string;
  reportType: string;
  period: string;
  rows: AttendancePDFRow[] | AttendanceSummaryPDFRow[];
  isSummary: boolean;
}): string {
  const { headerHtml, footerHtml, reportLabel, reportType, period, rows, isSummary } = opts;
  const now = new Date();
  const generated = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    + " at " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }).toLowerCase();

  // ── PAGINATION LOGIC ──
  // A4 portrait is height ~297mm. With margins/header/footer, we can fit ~22-25 rows per page safely.
  const ROWS_PER_PAGE = 22;
  const pageChunks: any[][] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pageChunks.push(rows.slice(i, i + ROWS_PER_PAGE));
  }
  const totalPages = pageChunks.length;

  const tableHeader = isSummary
    ? `<thead><tr>
        <th style="width:30px">#</th><th>Staff Name</th><th>Dept/Role</th><th style="width:70px">Emp ID</th>
        <th>Present</th><th>Absent</th><th>Leave</th>
        <th>Year Pr.</th><th>Year Ab.</th><th>Year Lv.</th>
       </tr></thead>`
    : `<thead><tr>
        <th style="width:30px">#</th><th>Personnel Name</th><th>Designation</th><th style="width:80px">Employee ID</th>
        <th style="width:80px">Date</th><th style="width:65px">In</th><th style="width:65px">Out</th><th style="width:65px">Hours</th><th style="width:80px text-align:center">Status</th>
       </tr></thead>`;

  const renderRow = (r: any, absoluteIndex: number) => {
    if (isSummary) {
      const sr = r as AttendanceSummaryPDFRow;
      return `
        <tr class="${absoluteIndex % 2 === 0 ? "even" : "odd"}">
          <td class="num">${absoluteIndex + 1}</td>
          <td class="bold">${sr.name}</td>
          <td class="accent">${sr.designation}</td>
          <td>${sr.employeeId}</td>
          <td class="green bold">${sr.monthlyPresent}</td>
          <td class="red bold">${sr.monthlyAbsent}</td>
          <td class="blue">${sr.monthlyLeave}</td>
          <td class="green">${sr.yearlyPresent}</td>
          <td class="red">${sr.yearlyAbsent}</td>
          <td class="blue">${sr.yearlyLeave}</td>
        </tr>`;
    } else {
      const hr = r as AttendancePDFRow;
      const statusColor = STATUS_COLORS[hr.status.toLowerCase()] || "#6b7280";
      return `
        <tr class="${absoluteIndex % 2 === 0 ? "even" : "odd"}">
          <td class="num">${absoluteIndex + 1}</td>
          <td class="bold">${hr.name}</td>
          <td class="accent" style="white-space:nowrap">${hr.designation}</td>
          <td>${hr.employeeId}</td>
          <td style="white-space:nowrap">${hr.date}</td>
          <td class="green bold">${hr.checkIn}</td>
          <td class="red">${hr.checkOut}</td>
          <td>${hr.dutyHours}</td>
          <td style="text-align:center"><span class="badge" style="background:${statusColor}">${hr.status.toUpperCase()}</span></td>
        </tr>`;
    }
  };

  const pagesHtml = pageChunks.map((chunk, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === totalPages - 1;
    const startIdx = pageIdx * ROWS_PER_PAGE;

    return `
      <div class="a4-page">
        ${isFirstPage ? `
          <div class="header-container">${headerHtml}</div>
          <div class="report-meta-section">
            <div class="report-meta-left">
              <div class="report-label">${reportLabel}</div>
              <div class="report-subtitle">Attendance Report</div>
            </div>
            <div class="report-meta-right">
              <div class="period-line">Period: ${period}</div>
              <div class="generated-line">Generated: ${generated}</div>
              <div class="report-type-badge">${reportType}</div>
            </div>
          </div>
        ` : `<div style="margin-top:20px"></div>`}

        <div class="table-container">
          <table>
            ${tableHeader}
            <tbody>
              ${chunk.map((r, i) => renderRow(r, startIdx + i)).join("")}
            </tbody>
          </table>
        </div>

        ${isLastPage ? `
          <div class="totals-row">
            <span>Total Records: <strong>${rows.length}</strong></span>
            <span style="color:#94a3b8; margin-left: auto;">Confidential — For Internal HR & Management Only</span>
          </div>
          <div class="footer-container" style="margin-top: auto">${footerHtml}</div>
        ` : `
          <div class="page-number">Page ${pageIdx + 1} of ${totalPages}</div>
        `}
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Attendance Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page { 
      size: A4 portrait; 
      margin: 0; 
    }

    body {
      font-family: 'Inter', sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .a4-page {
      width: 210mm;
      height: 297mm;
      padding: 15mm 15mm 15mm;
      margin: 10mm auto;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    @media print {
      body { background: white; padding: 0; }
      .a4-page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
    }

    /* ── REPORT META ── */
    .report-meta-section {
      display: flex;
      justify-content: space-between;
      padding: 12px 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 15px 0;
    }
    .report-label { font-size: 18px; font-weight: 800; color: #1e3a8a; }
    .report-subtitle { font-size: 11px; color: #64748b; font-weight: 600; }
    .report-meta-right { text-align: right; }
    .period-line { font-size: 11px; font-weight: 700; color: #475569; }
    .generated-line { font-size: 9px; color: #94a3b8; }
    .report-type-badge {
      display: inline-block;
      padding: 2px 10px;
      background: #1e3a8a;
      color: #fff;
      font-size: 8px;
      font-weight: 900;
      border-radius: 12px;
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* ── TABLE ── */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead th {
      background: #1e293b; color: #fff;
      padding: 8px 10px; text-align: left;
      font-size: 9px; font-weight: 800;
      text-transform: uppercase;
    }
    tbody td {
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
      vertical-align: middle;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    tr.even { background: #f8fafc; }
    .num { color: #94a3b8; width: 30px; }
    .bold { font-weight: 700; color: #000; }
    .accent { color: #4f46e5; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .blue { color: #2563eb; }
    .badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 7px; font-weight: 900;
      color: #fff;
    }

    .totals-row {
      margin-top: 15px;
      padding: 10px 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 10px;
      display: flex;
    }
    .page-number {
      margin-top: auto;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

export function AttendancePDFPreview({
  hospital,
  reportType,
  period,
  reportLabel,
  rows,
  isSummary = false,
  onClose,
}: AttendancePDFPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { printWithHeader } = usePrintStore();

  useEffect(() => {
    const headerHtml = renderToStaticMarkup(
      <MainHeader initialDetails={{
        name: hospital.name || "",
        address: hospital.address || "",
        phone: hospital.phone || "",
        email: hospital.email || "",
        logo: hospital.logo,
      }} />
    );

    const footerHtml = renderToStaticMarkup(
      <MainFooter initialDetails={{
        name: hospital.name || "",
        address: hospital.address || "",
        phone: hospital.phone || "",
        email: hospital.email || "",
      }} />
    );

    const html = buildAttendanceHtml({
      headerHtml, footerHtml, reportLabel, reportType, period, rows, isSummary,
    });

    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      // Strip auto-print from rendered output
      const safe = html
        .replace(/onload="window\.print\(\);"/gi, "")
        .replace(/<script>[\s\S]*?<\/script>/gi, "");
      doc.open();
      doc.write(safe);
      doc.close();
    }
  }, [hospital, reportLabel, reportType, period, rows, isSummary, printWithHeader]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

        {/* ── TOOLBAR ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-indigo-600" />
            <span className="text-sm font-black text-slate-500 uppercase tracking-widest hidden sm:inline">PDF Preview</span>
            <span className="text-[10px] text-slate-400 ml-1">· {reportLabel} · {period}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── IFRAME PREVIEW ── */}
        <div className="flex-1 bg-slate-50 p-4 overflow-auto flex justify-center items-start">
          <iframe
            ref={iframeRef}
            title="Attendance PDF Preview"
            className="bg-white w-full origin-top shadow-none border-none"
            style={{ minHeight: "900px", height: "auto" }}
          />
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-400">
            {rows.length} records · Use <strong>Print / Save PDF</strong> to download
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 font-bold hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
