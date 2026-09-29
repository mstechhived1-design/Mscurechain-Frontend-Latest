'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    TrendingDown,
    IndianRupee,
    Package,
    ShoppingCart,
    Users,
    Activity,
    RefreshCcw,
    Download,
    Clock,
    BarChart as BarChartIcon,
} from 'lucide-react';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart as RechartsPie,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { PharmacyAnalyticsService, PharmacyBillingService } from '@/lib/integrations/services';
import toast from 'react-hot-toast';
import { PharmacyAnalyticsSkeleton } from '@/components/ui/skeletons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuthStore } from '@/stores/authStore';

const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

const PharmacyAnalytics = () => {
    const { user } = useAuthStore();
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [range, setRange] = useState('30days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const shopDetails = {
        name: (user as any)?.shopName || user?.name || 'Pharmacy Store'
    };

    const handleExport = async () => {
        setIsExporting(true);
        const loadToast = toast.loading('Generating transactional summary...');
        try {
            // Determine dates based on range
            let finalStart = startDate;
            let finalEnd = endDate;

            if (range !== 'custom') {
                const now = new Date();
                const days = range === '7days' ? 7 : range === '30days' ? 30 : 90;
                const start = new Date();
                start.setDate(now.getDate() - days);
                finalStart = start.toISOString().split('T')[0];
                finalEnd = new Date().toISOString().split('T')[0];
            }

            const res = await PharmacyBillingService.getBills(1, 5000, '', 'All Methods', finalStart, finalEnd);
            const allBills = res.bills;

            if (allBills.length === 0) {
                toast.error('No transactions found for the selected period', { id: loadToast });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');

            // 1. Transaction Report Heading
            worksheet.mergeCells('A1:J1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'PHARMACY ANALYTICS REPORT';
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
            const dateText = `Analysis Period: ${finalStart} to ${finalEnd}`;
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
                { header: 'Total Amount', width: 15 },
                { header: 'Paid Amount', width: 15 },
                { header: 'Balance', width: 12 },
                { header: 'Status', width: 12 },
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

            let totalBillAmount = 0;
            let totalPaidAmount = 0;
            let totalBalanceAmount = 0;

            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;
            let mixedTotal = 0;

            // Add Data Rows
            allBills.forEach((bill, index) => {
                const mode = (bill.paymentSummary.paymentMode || 'CASH').toLowerCase();
                const amount = bill.paymentSummary.paidAmount;

                if (mode === 'cash') cashTotal += amount;
                else if (mode === 'card') cardTotal += amount;
                else if (mode === 'upi') upiTotal += amount;
                else if (mode === 'mixed') mixedTotal += amount;

                worksheet.addRow([
                    index + 1,
                    new Date(bill.createdAt).toLocaleDateString(),
                    bill.invoiceId,
                    bill.patientName || 'Walk-in',
                    bill.customerPhone || '-',
                    bill.paymentSummary.paymentMode?.toUpperCase() || 'CASH',
                    bill.paymentSummary.grandTotal,
                    bill.paymentSummary.paidAmount,
                    bill.paymentSummary.balanceDue,
                    bill.paymentSummary.status
                ]).eachCell((cell, colNumber) => {
                    if (colNumber <= 6 || colNumber === 10) {
                        cell.alignment = { horizontal: colNumber === 4 ? 'left' : 'center' };
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
                    if ([7, 8, 9].includes(colNumber)) {
                        cell.numFmt = '₹#,##0.00';
                    }
                });

                totalBillAmount += (bill.paymentSummary.grandTotal || 0);
                totalPaidAmount += (bill.paymentSummary.paidAmount || 0);
                totalBalanceAmount += (bill.paymentSummary.balanceDue || 0);
            });

            // Summary Totals Row
            worksheet.addRow([]); // Blank row
            const summaryRow = worksheet.addRow([
                '', '', '', '', '', 'TOTALS:',
                totalBillAmount,
                totalPaidAmount,
                totalBalanceAmount,
                ''
            ]);

            summaryRow.height = 25;
            summaryRow.eachCell((cell, colNumber) => {
                if (colNumber >= 6 && colNumber <= 9) {
                    cell.font = { bold: true };
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

            // Payment Mode Breakdown
            worksheet.addRow([]);
            worksheet.addRow(['', '', '', '', '', 'PAYMENT MODE BREAKDOWN']).getCell(6).font = { bold: true, underline: true };

            const modes = [
                ['Total Cash :', cashTotal],
                ['Total Card :', cardTotal],
                ['Total UPI :', upiTotal],
                ['Total Mixed :', mixedTotal]
            ];

            modes.forEach(m => {
                const r = worksheet.addRow(['', '', '', '', '', m[0], m[1]]);
                r.getCell(6).alignment = { horizontal: 'left' };
                r.getCell(7).alignment = { horizontal: 'right' };
                r.getCell(7).font = { bold: true };
                r.getCell(7).numFmt = '₹#,##0.00';
                r.getCell(7).border = { bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            worksheet.addRow([]);
            worksheet.addRow(['', '', '', '', '', '', '', '', 'Prepared By: Pharma Analytics']);

            // Auto Column Widths
            if (worksheet.columns) {
                worksheet.columns.forEach((column: any) => {
                    let maxLen = 0;
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        const value = cell.value ? cell.value.toString() : '';
                        if (value.length > maxLen) maxLen = value.length;
                    });
                    column.width = maxLen < 12 ? 12 : maxLen + 3;
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Pharma_Analytics_Report_${finalStart}_${finalEnd}.xlsx`);
            toast.success('Analytics report exported', { id: loadToast });
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Failed to generate report', { id: loadToast });
        } finally {
            setIsExporting(false);
        }
    };

    const fetchAnalytics = useCallback(async () => {
        if (range === 'custom') {
            if (!startDate || !endDate) return;
            if (new Date(startDate) > new Date(endDate)) {
                toast.error('Start date cannot be after end date');
                return;
            }
        }

        setIsLoading(true);
        try {
            const data = await PharmacyAnalyticsService.getAnalytics(range, startDate, endDate);
            setAnalyticsData(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setIsLoading(false);
        }
    }, [range, startDate, endDate]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('en-IN').format(val || 0);
    };

    if (isLoading && !analyticsData) {
        return <PharmacyAnalyticsSkeleton />;
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-20 max-w-[1400px] mx-auto px-4 md:px-0">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1 md:px-2 mt-4 md:mt-0">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 md:mb-1">
                        <div className="p-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-lg shrink-0">
                            <Activity size={14} className="md:size-4" />
                        </div>
                        <span className="text-[10px] md:text-xs font-black text-teal-600 uppercase tracking-[0.2em]">Business Intelligence</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Analytics</h1>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pharmacy performance & sales insights</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 md:p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar">
                        {[
                            { key: '7days', label: '7D' },
                            { key: '30days', label: '30D' },
                            { key: '90days', label: '90D' },
                            { key: 'custom', label: 'Custom' },
                        ].map((r) => (
                            <button
                                key={r.key}
                                onClick={() => {
                                    setRange(r.key);
                                    if (r.key !== 'custom') {
                                        setStartDate('');
                                        setEndDate('');
                                    }
                                }}
                                className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${range === r.key
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                title="Start Date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 md:px-3 py-2 text-[10px] md:text-xs font-black uppercase text-gray-600 outline-none w-full sm:w-auto"
                            />
                            <input
                                type="date"
                                title="End Date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 md:px-3 py-2 text-[10px] md:text-xs font-black uppercase text-gray-600 outline-none w-full sm:w-auto"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <button
                            onClick={() => { clearApiCache(); fetchAnalytics(); }}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-teal-600 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md disabled:opacity-50"
                        >
                            <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
                            {isExporting ? 'Exporting...' : 'Export Results'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {(analyticsData?.keyMetrics || []).map((metric: any, idx: number) => {
                    const Icon = metric.icon === 'dollar' ? IndianRupee :
                        metric.icon === 'cart' ? ShoppingCart :
                            metric.icon === 'package' ? Package : Users;

                    return (
                        <div key={`${metric.label}-${idx}`} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{metric.label}</p>
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">{metric.value}</h3>
                                </div>
                                <div className={`p-2.5 rounded-xl shrink-0 ${metric.color === 'emerald' || metric.color === 'teal' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/20' :
                                    metric.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                                        metric.color === 'purple' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' :
                                            'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                                    }`}>
                                    <Icon size={18} className="md:size-5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                <span className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest truncate mr-2">{metric.subtitle}</span>
                                <div className={`flex items-center gap-1 text-[10px] md:text-xs font-black shrink-0 ${metric.trend === 'up' ? 'text-teal-600' : metric.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                                    }`}>
                                    {metric.trend === 'up' ? <TrendingUp size={12} /> : metric.trend === 'down' ? <TrendingDown size={12} /> : null}
                                    {metric.change}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Big Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Revenue Trend */}
                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="p-2.5 md:p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-xl">
                            <BarChartIcon size={18} className="md:size-5" />
                        </div>
                        <div>
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Revenue Performance</h4>
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Daily earnings trend</p>
                        </div>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData?.revenueTrend || []}>
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '10px' }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Volume */}
                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="p-2.5 md:p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                            <ShoppingCart size={18} className="md:size-5" />
                        </div>
                        <div>
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Order Volume</h4>
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Daily invoice count</p>
                        </div>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData?.salesVolume || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '10px' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Middle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Payment Methods */}
                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-6">Payment Distribution</h4>
                    <div className="h-[220px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={analyticsData?.paymentDistribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(analyticsData?.paymentDistribution || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2.5 mt-4">
                        {(analyticsData?.paymentDistribution || []).map((entry: any, index: number) => (
                            <div key={`${entry.name}-${index}`} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{entry.name}</span>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-gray-900 dark:text-white font-mono">₹{formatNumber(entry.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Top Performing Products</h4>
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Highest grossing items</p>
                        </div>
                        <span className="hidden sm:inline-block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full">By Revenue</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {(analyticsData?.topProducts || []).slice(0, 8).map((product: any, idx: number) => (
                            <div key={`${product.name}-${idx}`} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-teal-200 hover:bg-teal-50/10 transition-all group">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-[10px] md:text-xs font-black text-gray-400 group-hover:text-teal-600 transition-colors shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] md:text-xs font-black text-gray-700 dark:text-gray-200 uppercase truncate leading-tight">{product.name}</p>
                                        <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{product.quantity} units sold</p>
                                    </div>
                                </div>
                                <span className="text-xs md:text-sm font-black text-teal-600 font-mono tracking-tight shrink-0">{formatCurrency(product.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Over Time */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 md:gap-4 mb-8">
                    <div className="p-2.5 md:p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl">
                        <Clock size={18} className="md:size-5" />
                    </div>
                    <div>
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Hourly System Load</h4>
                        <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Performance distribution throughout the day</p>
                    </div>
                </div>
                <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData?.hourlyPerformance || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
                            <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="transactions" stroke="#0d9488" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default PharmacyAnalytics;
