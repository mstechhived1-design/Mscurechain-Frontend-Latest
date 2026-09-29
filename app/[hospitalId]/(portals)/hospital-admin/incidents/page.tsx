'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '@/lib/integrations/services/incident.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import {
    AlertTriangle,
    Search,
    MessageSquare,
    ShieldCheck,
    Clock,
    User,
    Building,
    Loader2,
    X,
    CheckCircle2,
    AlertCircle,
    Pill,
    Calendar,
    Download,
    FileSpreadsheet,
    TrendingUp,
    ChevronDown,
    Package,
    ImageIcon,
} from 'lucide-react';
import { format} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Incident } from '@/lib/integrations/types/incident';

export default function HospitalAdminIncidentPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [responseMsg, setResponseMsg] = useState("");
    const [actionTaken, setActionTaken] = useState("");
    const [newStatus, setNewStatus] = useState<string>("");

    // Filter States
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [deptFilter, setDeptFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['admin-incidents', startDate, endDate, deptFilter, statusFilter],
        queryFn: () => incidentService.getIncidents({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            department: deptFilter !== 'all' ? deptFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined
        })
    });

    const { data: hospitalDepartments = [] } = useQuery({
        queryKey: ['ipd-departments'],
        queryFn: () => ipdService.getIPDDepartments()
    });

    const respondMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => incidentService.respondToIncident(id, data),
        onSuccess: () => {
            toast.success('Response recorded successfully');
            setSelectedIncident(null);
            setResponseMsg("");
            setActionTaken("");
            setNewStatus("");
            queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to record response');
        }
    });

    const filteredIncidents = useMemo(() => {
        return incidents.filter(i =>
            i.incidentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.incidentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.reportedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [incidents, searchTerm]);

    // Summary Metrics Calculation
    const summaryMetrics = useMemo(() => {
        const deptStats: Record<string, number> = {};
        const monthlyStats: Record<string, number> = {};
        let openCount = 0;
        let closedCount = 0;

        incidents.forEach(i => {
            // Dept stats
            deptStats[i.department] = (deptStats[i.department] || 0) + 1;

            // Monthly stats
            const month = format(new Date(i.incidentDate), 'MMMM yyyy');
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;

            // Simple status stats
            if (i.status === 'CLOSED') closedCount++;
            else openCount++;
        });

        // Top Department
        const topDept = Object.entries(deptStats).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

        return {
            deptStats,
            monthlyStats,
            openCount,
            closedCount,
            topDept
        };
    }, [incidents]);

    const handleRespond = () => {
        if (!selectedIncident) return;
        if (!responseMsg || !newStatus) {
            toast.error("Please provide a response message and update the status");
            return;
        }

        respondMutation.mutate({
            id: selectedIncident.incidentId,
            data: {
                message: responseMsg,
                actionTaken,
                status: newStatus
            }
        });
    };

    const exportToExcel = async () => {
        if (filteredIncidents.length === 0) {
            toast.error("No data to export");
            return;
        }
        setIsExporting(true);
        const toastId = toast.loading("Preparing Excel export...");
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Incident Reports');

            // 0. Set Column Definitions (Crucial: NO 'header' property to prevent auto-row 1 generation)
            worksheet.columns = [
                { key: 'id', width: 22 },
                { key: 'date', width: 15 },
                { key: 'dept', width: 15 },
                { key: 'type', width: 25 },
                { key: 'severity', width: 12 },
                { key: 'reporter', width: 20 },
                { key: 'role', width: 15 },
                { key: 'contact', width: 18 },
                { key: 'status', width: 15 },
                { key: 'desc', width: 50 }
            ];

            // 1. Add Title
            worksheet.mergeCells('A2:H2');
            const titleCell = worksheet.getCell('A2');
            titleCell.value = 'Incident Records';
            titleCell.font = { name: 'Arial Black', size: 24, bold: true, color: { argb: 'FF1C4E80' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // 2. Add Subtitle
            worksheet.mergeCells('A3:H3');
            const subtitleCell = worksheet.getCell('A3');
            subtitleCell.value = 'Track and manage hospital incidents';
            subtitleCell.font = { name: 'Arial', size: 12, italic: true, color: { argb: 'FF808080' } };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // 3. Add Filter Info (Consolidated in columns A & B)
            const filterInfo = [
                ['Report Date Range', startDate || 'All Time'],
                ['Department', deptFilter === 'all' ? 'All Departments' : `${deptFilter}`],
                ['Status', statusFilter === 'all' ? 'All' :
                    statusFilter === 'OPEN' ? 'Open Cases' :
                        statusFilter === 'IN REVIEW' ? 'In Review' : 'Closed Cases']
            ];

            filterInfo.forEach((info, idx) => {
                const rowNum = 5 + idx;
                const labelCell = worksheet.getCell(`A${rowNum}`);
                const valueCell = worksheet.getCell(`B${rowNum}`);
                labelCell.value = info[0];
                labelCell.font = { bold: true, color: { argb: 'FF1C4E80' } };
                valueCell.value = info[1];
            });

            // 3.5 Add Monthly Volume Stats (Starting Row 5, Column D)
            const statsStartRow = 5;
            const statsHeaderCell = worksheet.getCell(`D${statsStartRow}`);
            statsHeaderCell.value = 'TOTAL INCIDENTS';
            statsHeaderCell.font = { bold: true, color: { argb: 'FF1C4E80' }, size: 12 };

            Object.entries(summaryMetrics.monthlyStats).forEach(([month, count], idx) => {
                const rowNum = statsStartRow + 1 + idx;
                const monthCell = worksheet.getCell(`D${rowNum}`);
                const countCell = worksheet.getCell(`E${rowNum}`);
                monthCell.value = month;
                monthCell.font = { bold: true };
                countCell.value = count;
                countCell.alignment = { horizontal: 'center' };

                // Add minor border for the mini-table
                monthCell.border = { bottom: { style: 'hair' } };
                countCell.border = { bottom: { style: 'hair' } };
            });

            // 4. Set Headers for Data Table (Starting Row shifted to accommodate stats if many)
            const headerRowNumber = Math.max(10, 5 + Object.keys(summaryMetrics.monthlyStats).length + 2);
            const headerRow = worksheet.getRow(headerRowNumber);
            headerRow.values = [
                'INCIDENT_ID', 'TIMESTAMP', 'DEPARTMENT', 'TYPE', 'SEVERITY', 'REPORTER_NAME', 'ROLE', 'CONTACT_NUMBER', 'STATUS', 'DESCRIPTION'
            ];

            // Style Header Row
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1C2434' } // Darkest blue for contrast
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // 5. Add Data Rows
            filteredIncidents.forEach((i) => {
                const row = worksheet.addRow([
                    i.incidentId,
                    format(new Date(i.incidentDate), 'dd/MM/yyyy'),
                    i.department,
                    i.incidentType,
                    i.severity,
                    i.reportedBy.name,
                    i.reportedBy.role,
                    i.reportedBy.mobile || 'N/A',
                    i.status,
                    i.description
                ]);

                // Alignment and borders for data cells
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Incident_Records_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Excel Export Complete", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Export failed", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = async () => {
        if (filteredIncidents.length === 0) {
            toast.error("No data to export");
            return;
        }
        setIsExporting(true);
        const toastId = toast.loading("Generating PDF report...");
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('l', 'mm', 'a4');

            // Header
            doc.setFontSize(22);
            doc.setTextColor(220, 38, 38); // red-600
            doc.setFont('helvetica', 'bold');
            doc.text('INCIDENT MANAGEMENT', 14, 20);

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${format(new Date(), 'PPPP p')}`, 14, 28);

            doc.setDrawColor(220);
            doc.setLineWidth(0.5);
            doc.line(14, 38, 283, 38);

            // Monthly Stats Summary Table
            let y = 45;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(28, 78, 128); // Professional blue
            doc.text('TOTAL INCIDENTS', 14, y);
            y += 5;

            doc.setFontSize(8);
            doc.setTextColor(0);
            const months = Object.keys(summaryMetrics.monthlyStats);
            const colWidth = 40;

            months.forEach((month, idx) => {
                const xPos = 14 + (idx % 6) * colWidth;
                const rowOffset = Math.floor(idx / 6) * 10;

                doc.setFillColor(245, 245, 245);
                doc.rect(xPos, y + rowOffset, colWidth - 2, 8, 'F');
                doc.setDrawColor(200);
                doc.rect(xPos, y + rowOffset, colWidth - 2, 8, 'S');

                doc.setFont('helvetica', 'bold');
                doc.text(month, xPos + 2, y + rowOffset + 5);
                doc.setFont('helvetica', 'normal');
                doc.text(`: ${summaryMetrics.monthlyStats[month]}`, xPos + colWidth - 12, y + rowOffset + 5);
            });

            y += Math.ceil(months.length / 6) * 10 + 5;

            // Table Header with Borders
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);

            // Header Background
            doc.setFillColor(245, 245, 245);
            doc.rect(14, y - 6, 269, 10, 'F');

            // Header Text Alignment
            const cols = [
                { title: 'ID', x: 14, w: 32 },
                { title: 'Date', x: 46, w: 22 },
                { title: 'Dept', x: 68, w: 15 },
                { title: 'Type', x: 83, w: 40 },
                { title: 'Sev', x: 123, w: 18 },
                { title: 'Reporter', x: 141, w: 35 },
                { title: 'Role', x: 176, w: 25 },
                { title: 'Phone', x: 201, w: 32 },
                { title: 'Status', x: 233, w: 50 }
            ];

            cols.forEach(col => {
                doc.text(col.title, col.x + 2, y);
            });

            // Header Top/Bottom Borders
            doc.setDrawColor(180);
            doc.setLineWidth(0.2);
            doc.line(14, y - 6, 283, y - 6); // Top
            doc.line(14, y + 4, 283, y + 4); // Bottom

            y += 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5); // Slightly smaller to fit

            filteredIncidents.forEach((i, idx) => {
                if (y > 185) {
                    doc.addPage();
                    y = 20;
                    // Redraw headers on new page if needed (simplified for now)
                }

                // Horizontal Line for each row
                doc.setDrawColor(230);
                doc.line(14, y + 2, 283, y + 2);

                // Vertical Column Separators
                doc.setDrawColor(240);
                let currentX = 14;
                doc.line(currentX, y - 6, currentX, y + 2); // Start
                cols.forEach(col => {
                    currentX += col.w;
                    doc.line(currentX, y - 6, currentX, y + 2);
                });

                // Row Data
                doc.text(i.incidentId, 16, y);
                doc.text(format(new Date(i.incidentDate), 'MM/dd/yy'), 48, y);
                doc.text(i.department, 70, y);
                doc.text(i.incidentType.substring(0, 22), 85, y);
                doc.text(i.severity, 125, y);
                doc.text(i.reportedBy.name.substring(0, 18), 143, y);
                doc.text(i.reportedBy.role.substring(0, 12), 178, y);
                doc.text(i.reportedBy.mobile || 'N/A', 203, y);
                doc.text(i.status, 235, y);

                y += 8;
            });

            // Final Bottom Border
            doc.setDrawColor(180);
            doc.line(14, y - 6, 283, y - 6);

            doc.save(`Incident_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
            toast.success("PDF Export Complete", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("PDF Export failed", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Dynamic Header */}
            <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
                
                {/* Top Row: Title, Minibadges, Action Button */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                
                    <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
                        <div className="shrink-0 flex items-center gap-2 px-1">
                            <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                    Incident Management
                                </h1>
                                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                                    Track and manage hospital incidents
                                </p>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-100">
                            {[
                                { label: "Total Incidents", value: Object.values(summaryMetrics.monthlyStats)[0] || 0, color: "text-gray-900", bg: "bg-gray-100" },
                                { label: "Open Cases", value: summaryMetrics.openCount, color: "text-rose-600", bg: "bg-rose-50" },
                                { label: "Closed Cases", value: summaryMetrics.closedCount, color: "text-emerald-600", bg: "bg-emerald-50" },
                                { label: "High-Risk Dept", value: summaryMetrics.topDept[0], color: "text-indigo-600", bg: "bg-indigo-50" }
                            ].map((stat, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${stat.bg} ${stat.color} border border-slate-100/50`}>
                                    <span className="text-[8px] font-bold uppercase tracking-widest">{stat.label}</span>
                                    <span className="text-xs font-black">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end w-full xl:w-auto shrink-0 relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={isExporting}
                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 bg-primary-theme text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all h-[34px] shadow-sm whitespace-nowrap"
                        >
                            <Download size={14} className="shrink-0" /> Export
                            <ChevronDown size={14} className={`ml-1 transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                            {showExportMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowExportMenu(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 5, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20"
                                    >
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => {
                                                    exportToExcel();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-700 dark:text-gray-300 rounded-xl transition-colors group"
                                            >
                                                <div className="p-2 shrink-0 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileSpreadsheet size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-wider">Excel Format</p>
                                                    <p className="text-[8px] font-bold opacity-50">Download .xlsx file</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    exportToPDF();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl transition-colors group"
                                            >
                                                <div className="p-2 shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Download size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-wider">PDF Report</p>
                                                    <p className="text-[8px] font-bold opacity-50">Download .pdf audit</p>
                                                </div>
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bottom Row: Control Center (Search, Filters, View Toggles) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-gray-50 pt-4">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full lg:flex-1">
                        
                        {/* Search Bar - Takes remaining width */}
                        <div className="relative flex-1 w-full lg:w-auto">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Search incidents..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5 h-[34px]">
                                <Calendar size={14} className="text-gray-400 mx-2" />
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold text-gray-700 outline-none w-[90px] px-1 cursor-pointer" />
                                <span className="text-gray-300">-</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold text-gray-700 outline-none w-[90px] px-1 cursor-pointer" />
                            </div>
                            
                            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 outline-none px-2 h-[34px] min-w-[120px] cursor-pointer appearance-none">
                                <option value="all">All Departments</option>
                                {hospitalDepartments.map((dept: any) => (
                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>

                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 outline-none px-2 h-[34px] min-w-[100px] cursor-pointer appearance-none">
                                <option value="all">All Statuses</option>
                                <option value="OPEN">Open Cases</option>
                                <option value="IN REVIEW">In Review</option>
                                <option value="CLOSED">Closed Cases</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interface */}
            <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col lg:flex-row">

                {/* List Side */}
                <div className={`flex-1 border-r border-gray-100 dark:border-gray-700 flex flex-col ${selectedIncident ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-3 md:p-8 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-black uppercase font-semibold">Incident List</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 max-h-[700px] hide-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-emerald-500" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Incidents...</p>
                            </div>
                        ) : filteredIncidents.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <AlertCircle className="mx-auto text-gray-200" size={48} />
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">No incidents found</p>
                            </div>
                        ) : (
                            filteredIncidents.map((incident) => (
                                <button
                                    key={incident._id}
                                    onClick={() => setSelectedIncident(incident)}
                                    className={`w-full text-left p-3 md:p-6 rounded-[1rem] transition-all border-2 ${selectedIncident?._id === incident._id
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500'
                                        : 'bg-white dark:bg-gray-800/50 border-transparent hover:border-gray-100 dark:hover:border-gray-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{incident.incidentId}</span>
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${incident.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                                            incident.status === 'IN REVIEW' ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {incident.status}
                                        </div>
                                    </div>
                                    <h4 className="font-black text-gray-900 dark:text-white  font-thin">{incident.incidentType}</h4>

                                    <div className="mt-3 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <User size={10} className="text-gray-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[120px]">{incident.reportedBy.name}</span>
                                                    <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[7px] font-black rounded uppercase tracking-tighter">
                                                        {incident.reportedBy.role}
                                                    </span>
                                                </div>
                                                {incident.reportedBy.mobile && (
                                                    <span className="text-[8px] font-bold text-gray-400 font-mono tracking-tight">{incident.reportedBy.mobile}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pt-1 opacity-60">
                                            <div className="flex items-center gap-1.5">
                                                <Building size={10} />
                                                <span className="text-[9px] font-bold uppercase">{incident.department}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={10} />
                                                <span className="text-[9px] font-bold">{format(new Date(incident.createdAt), 'MMM dd')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Details Side */}
                <div className={`lg:w-[600px] bg-gray-50 dark:bg-gray-900/50 flex flex-col ${selectedIncident ? 'flex' : 'hidden lg:flex items-center justify-center'}`}>
                    {selectedIncident ? (
                        <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Detail Header */}
                            <div className="p-3 md:p-8 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedIncident(null)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                                        <X size={20} />
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-black font-thin uppercase">{selectedIncident.incidentId}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase ">Incident Details</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase ${selectedIncident.severity === 'High' ? 'bg-red-600' :
                                    selectedIncident.severity === 'Medium' ? 'bg-amber-500' :
                                        'bg-emerald-500'
                                    }`}>
                                    Severity: {selectedIncident.severity}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 md:p-4 md:p-8 space-y-8 hide-scrollbar">
                                {/* Core Info Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-2 md:p-4 bg-white dark:bg-gray-800 rounded-[0.5rem] ">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Incident Type</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedIncident.incidentType}</p>
                                    </div>
                                    <div className="p-2 md:p-4 bg-white dark:bg-gray-800 rounded-[0.5rem] ">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Department</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase ">{selectedIncident.department}</p>
                                    </div>
                                </div>

                                {/* Reporter Profile */}
                                <div className="p-2 md:p-6 bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center text-gray-400 font-black ">
                                            {selectedIncident.reportedBy.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{selectedIncident.reportedBy.name}</p>
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{selectedIncident.reportedBy.role}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-2 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Narrative / Description</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{selectedIncident.description}</p>
                                    </div>
                                </div>

                                {/* Conditional Data Blocks */}
                                {(selectedIncident.incidentType === 'Patient Fall' && selectedIncident.patientFallDetails) && (
                                    <div className="p-2 md:p-6 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                                <Building size={16} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase  text-emerald-700 dark:text-emerald-400">Patient Details</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black text-emerald-600/60 uppercase">Patient Name</p>
                                                <p className="text-xs font-bold">{selectedIncident.patientFallDetails.patientName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-emerald-600/60 uppercase">MRN Number</p>
                                                <p className="text-xs font-bold">{selectedIncident.patientFallDetails.mrnNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-emerald-600/60 uppercase">Bed / Room</p>
                                                <p className="text-xs font-bold">{selectedIncident.patientFallDetails.bedNumber} / {selectedIncident.patientFallDetails.roomNumber}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(selectedIncident.incidentType === 'Medication Error' && selectedIncident.medicationErrorDetails) && (
                                    <div className="p-2 md:p-6 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-indigo-500 text-white rounded-lg">
                                                <Pill size={16} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase  text-indigo-700 dark:text-indigo-400">Medication Details</h4>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-indigo-600/60 uppercase">Drug / Prescription Detail</p>
                                            <p className="text-xs font-bold">{selectedIncident.medicationErrorDetails.prescriptionOrDrugName}</p>
                                        </div>
                                    </div>
                                )}

                                {(selectedIncident.incidentType === 'Equipment Failure' && selectedIncident.equipmentFailureDetails) && (
                                    <div className="p-2 md:p-6 bg-amber-50 dark:bg-amber-500/5 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-amber-500 text-white rounded-lg">
                                                <Package size={16} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase  text-amber-700 dark:text-amber-400">Equipment Details</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black text-amber-600/60 uppercase">Asset / Equipment Name</p>
                                                <p className="text-xs font-bold">{selectedIncident.equipmentFailureDetails.equipmentName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-amber-600/60 uppercase">Probable Cause of Failure</p>
                                                <p className="text-xs font-bold">{selectedIncident.equipmentFailureDetails.causeOfFailure}</p>
                                            </div>
                                        </div>
                                    </div>
                                )

                                }

                                {/* Photo Evidence Section */}
                                {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                                    <div className="p-2 md:p-6 bg-purple-50 dark:bg-purple-500/5 rounded-3xl border border-purple-100 dark:border-purple-500/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-purple-500 text-white rounded-lg">
                                                <ImageIcon size={16} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">Photo Evidence</h4>
                                            <span className="ml-auto text-[10px] font-bold text-purple-600/60">
                                                {selectedIncident.attachments.length} {selectedIncident.attachments.length === 1 ? 'Image' : 'Images'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-3">
                                            {selectedIncident.attachments.map((attachment: any, index: number) => (
                                                <a
                                                    key={attachment._id || index}
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-purple-100 dark:border-purple-500/20 hover:border-purple-500 transition-all hover:scale-105"
                                                >
                                                    <img
                                                        src={attachment.url}
                                                        alt={attachment.fileName || `Evidence ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="p-2 bg-white rounded-lg">
                                                                <Download size={16} className="text-gray-900" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {attachment.fileName && (
                                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                                            <p className="text-[8px] font-bold text-white truncate">
                                                                {attachment.fileName}
                                                            </p>
                                                        </div>
                                                    )}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                        

                                {/* Admin Response Matrix */}
                                {selectedIncident.status === 'CLOSED' && selectedIncident.adminResponse ? (
                                    <div className="p-3 md:p-8 bg-blue-600 rounded-[0.5rem] text-white">
                                        <div className="flex items-center gap-3 mb-6">
                                            <CheckCircle2 size={24} />
                                            <h3 className="text-sm md:text-lg font-black uppercase">Incident Resolved</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Response</p>
                                                <p className="text-sm font-bold ">"{selectedIncident.adminResponse.message}"</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Action Taken</p>
                                                <p className="text-sm font-bold uppercase">{selectedIncident.adminResponse.actionTaken}</p>
                                            </div>
                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                                <p className="text-[8px] font-bold text-white/40 uppercase">Handled By: {selectedIncident.adminResponse.adminId.name}</p>
                                                <p className="text-[8px] font-bold text-white/40 uppercase">{format(new Date(selectedIncident.adminResponse.respondedAt), 'MMM dd, yyyy HH:mm')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 md:p-8 bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                                <MessageSquare size={18} />
                                            </div>
                                            <h3 className="text-sm md:text-lg font-black uppercase">Admin Action</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Update Status</label>
                                                <div className="flex gap-2">
                                                    {['OPEN', 'IN REVIEW', 'CLOSED'].map((s) => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setNewStatus(s)}
                                                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${newStatus === s
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'
                                                                }`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Response</label>
                                                <textarea
                                                    value={responseMsg}
                                                    onChange={(e) => setResponseMsg(e.target.value)}
                                                    rows={3}
                                                    placeholder="Enter response..."
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none text-sm font-bold"
                                                ></textarea>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Action Taken</label>
                                                <input
                                                    type="text"
                                                    value={actionTaken}
                                                    onChange={(e) => setActionTaken(e.target.value)}
                                                    placeholder="e.g. Staff re-training, Equipment repair..."
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none text-sm font-bold"
                                                />
                                            </div>

                                            <button
                                                onClick={handleRespond}
                                                disabled={respondMutation.isPending}
                                                className="w-full py-4 bg-primary-theme dark:bg-white text-white dark:text-black rounded-2xl font-black  tracking-[0.2em] text-[10px]  active:scale-95 transition-all flex items-center justify-center gap-3 group overflow-hidden relative"
                                            >
                                                <div className="absolute inset-0 bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {respondMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                                                    Submit Response
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-10 space-y-6">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[2rem] mx-auto flex items-center justify-center text-gray-300">
                                <AlertTriangle size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase ">Select Incident</h3>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Select an incident from the list to view details</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}