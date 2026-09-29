'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    IndianRupee,
    Package,
    AlertTriangle,
    AlertCircle,
    Boxes,
    ShieldAlert,
    Receipt,
    FileText,
    ChevronRight,
    PlusCircle,
    TrendingUp,
    TrendingDown,
    Wallet,
    Activity,
    Clock,
    RefreshCcw
} from 'lucide-react';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import { PharmacyDashboardService, PharmacyDashboardStats } from '@/lib/integrations/services/pharmacyDashboard.service';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ExpiryAlertsModal from '@/components/pharmacy/dashboard/ExpiryAlertsModal';
import toast from 'react-hot-toast';
import StockAlertsCard from '@/components/pharmacy/dashboard/StockAlertsCard';
import LowStockList from '@/components/pharmacy/dashboard/LowStockList';
import { PharmacyDashboardSkeleton } from '@/components/ui/skeletons';

const PharmacyDashboard = () => {
    const { hospitalId } = useParams() as any;
    // const { user: authUser } = useAuthStore();
    const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
    const [range, setRange] = useState('7days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const getMetricDetails = (stat: any, idx: number) => {
        const details = {
            0: {
                title: 'Sales Details',
                items: [
                    { label: 'Net Profit', value: formatCurrency((stats?.requestedStats.revenue || 0) * 0.22) },
                    { label: 'Sales Change', value: '+4.2%' },
                    { label: 'Avg Bill/Hour', value: '₹12,450' },
                    { label: 'Refund Rate', value: '0.1%' }
                ],
                insight: 'Sales are on track for the daily target. High sales expected in the evening.'
            },
            1: {
                title: 'Medicine Stock',
                items: [
                    { label: 'Total Medicines', value: stats?.inventoryStats.totalProducts || 0 },
                    { label: 'Unused Stock', value: '0' },
                    { label: 'Avg Shelf Life', value: '180d' },
                    { label: 'New Medicines', value: '12' }
                ],
                insight: 'Medicine stock is healthy. 12 new medicines added this morning.'
            },
            2: {
                title: 'Stock Alerts',
                items: [
                    { label: 'Low Stock', value: stats?.inventoryStats.lowStockCount || 0 },
                    { label: 'Out of Stock', value: stats?.inventoryStats.outOfStockCount || 0 },
                    { label: 'Expiring in 30d', value: stats?.inventoryStats.expiringSoonCount || 0 },
                    { label: 'Need Reorder', value: '12' }
                ],
                insight: '4 medicines need urgent reordering. Check expiry dates for old stock.'
            },
            3: {
                title: 'Billing Details',
                items: [
                    { label: 'Digital Bills', value: '92%' },
                    { label: 'Total Bills', value: stats?.requestedStats.billCount || 0 },
                    { label: 'Errors/Voids', value: '0' },
                    { label: 'Success Rate', value: '100%' }
                ],
                insight: 'Billing is running smoothly. UPI is the most used payment method today.'
            }
        };
        return details[idx as keyof typeof details] || details[0];
    };

    const fetchStats = useCallback(async (targetRange = range) => {
        if (targetRange === 'custom') {
            if (!startDate || !endDate) return;
            if (new Date(startDate) > new Date(endDate)) {
                toast.error('Start date cannot be after end date');
                return;
            }
        }

        setIsLoading(true);
        try {
            const data = await PharmacyDashboardService.getStats(targetRange, startDate, endDate);
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [range, startDate, endDate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    if (isLoading && !stats) {
        return <PharmacyDashboardSkeleton />;
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Offline</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">Unable to establish connection with the analytics node</p>
                <button
                    onClick={() => fetchStats()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Ultra-Compact Dynamic Header */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-white p-2 md:p-3 rounded-2xl border border-gray-100 shadow-sm shrink-0 mt-4 md:mt-6">
                
                {/* 1. Icon + Title */}
                <div className="flex items-center gap-2 pr-2 md:pr-4 border-r border-slate-100 shrink-0">
                    <div className="p-1 md:p-1.5 bg-blue-50 rounded-lg text-blue-600">
                        <Activity className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-[11px] md:text-sm font-bold text-gray-900 leading-none uppercase">
                            Pharmacy
                        </h1>
                    </div>
                </div>

                {/* 2. Range Selector */}
                <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { key: 'today', label: 'Today' },
                        { key: '7days', label: '7D' },
                        { key: '1month', label: '30D' },
                        { key: 'custom', label: 'Custom' },
                    ].map((r) => (
                        <button
                            key={`range-${r.key}`}
                            onClick={() => {
                                setRange(r.key);
                                if (r.key !== 'custom') {
                                    setStartDate('');
                                    setEndDate('');
                                }
                                fetchStats(r.key);
                            }}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${range === r.key
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* 3. Date Picker (if custom) */}
                {range === 'custom' && (
                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200 shrink-0 animate-in fade-in slide-in-from-right-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-1.5 py-1 bg-transparent text-[9px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-teal-500 rounded"
                        />
                        <span className="text-gray-300 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-1.5 py-1 bg-transparent text-[9px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-teal-500 rounded"
                        />
                    </div>
                )}

                {/* 4. Actions (Refresh, Alerts, Verified) */}
                <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
                    <button
                        onClick={() => { clearApiCache(); fetchStats(); }}
                        className="p-1.5 bg-gray-50 text-slate-400 border border-gray-200 rounded-lg hover:text-slate-900 hover:bg-white transition-all font-black shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCcw size={14} strokeWidth={3} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => setIsExpiryModalOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-black uppercase hover:bg-red-100 transition-all relative shadow-sm"
                    >
                        <AlertCircle size={12} strokeWidth={3} />
                        <span className="hidden sm:inline">Alerts</span>
                        {stats && stats.inventoryStats.expiringSoonCount ? (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shadow-sm">
                                {stats.inventoryStats.expiringSoonCount}
                            </span>
                        ) : null}
                    </button>

                    <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Verified</span>
                    </div>
                </div>
            </div>

            <ExpiryAlertsModal
                isOpen={isExpiryModalOpen}
                onClose={() => setIsExpiryModalOpen(false)}
            />

            {/* Top Stats - Clean Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Total Sales", value: formatCurrency(stats?.requestedStats.revenue || 0), sub: `${stats?.requestedStats.billCount || 0} Bills Generated`, icon: IndianRupee, color: "teal", detail: "Daily Target: 92%" },
                    { label: "Available Medicines", value: stats?.inventoryStats.totalProducts.toString() || "0", sub: "Total Medicines", icon: Package, color: "teal", detail: "New Medicines Added" },
                    { label: "Low Stock Items", value: stats?.inventoryStats.lowStockCount.toString() || "0", sub: stats?.inventoryStats.outOfStockCount ? `${stats.inventoryStats.outOfStockCount} Out of Stock` : "Stock levels normal", icon: AlertCircle, color: "red", detail: "Needs reorder" },
                    { label: "Total Bills", value: stats?.requestedStats.billCount.toString() || "0", sub: "Bills Generated", icon: FileText, color: "teal", detail: "Processed today" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    const details = getMetricDetails(stat, idx);
                    return (
                        <div
                            key={`stat-card-${idx}`}
                            className="relative group h-full"
                            onMouseEnter={() => setHoveredCard(idx)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="h-full bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="min-w-0">
                                        <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase mb-1 truncate">{stat.label}</p>
                                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">{stat.value}</h3>
                                    </div>
                                    <div className={`p-2.5 rounded-xl shrink-0 ${stat.color === 'red' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20'}`}>
                                        <Icon size={18} className="md:size-5" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                    <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase truncate mr-2">{stat.sub}</span>
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded uppercase shrink-0 ${stat.color === 'red' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' : 'text-teal-600 bg-teal-50 dark:bg-teal-950/20'}`}>
                                        {stat.detail}
                                    </span>
                                </div>
                            </div>

                            {/* Popup Detail Card - Hidden on touch devices typically or requires interaction */}
                            {hoveredCard === idx && (
                                <div className="absolute top-full left-0 right-0 z-50 pt-2 animate-in fade-in slide-in-from-top-2 duration-200 hidden md:block">
                                    <div className="bg-white/98 dark:bg-gray-900/98 rounded-xl border border-teal-500 shadow-2xl p-5 backdrop-blur-md">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{details.title}</h4>
                                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {details.items.map((item: any, i: number) => (
                                                <div key={`detail-item-${i}`} className="bg-gray-50/50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100/50 dark:border-gray-700/50">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{item.label}</p>
                                                    <p className="text-[11px] font-black text-gray-900 dark:text-white">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-lg border border-teal-100/50 dark:border-teal-900/30">
                                            <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 leading-relaxed uppercase tracking-tighter">💡 {details.insight}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions - Modern Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                    { title: "Billing", desc: "Create Bill", icon: PlusCircle, href: `/${hospitalId}/pharmacy/billing`, label: "NEW BILL" },
                    { title: "Medicine Inventory", desc: "Manage Medicines", icon: Boxes, href: `/${hospitalId}/pharmacy/products`, label: "MEDICINES" },
                    { title: "Sales History", desc: "View Transactions", icon: TrendingUp, href: `/${hospitalId}/pharmacy/transactions`, label: "HISTORY" },
                ].map((action, i) => (
                    <Link key={`quick-action-${i}`} href={action.href} className="group">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-teal-500 hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                    <action.icon size={20} className="md:size-[22px]" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{action.title}</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{action.desc}</p>
                                </div>
                            </div>
                            <div className="shrink-0 bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase group-hover:bg-teal-600 group-hover:text-white transition-all">
                                {action.label}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Alerts & Low Stock Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="h-full">
                    <StockAlertsCard
                        lowStockCount={stats?.inventoryStats.lowStockCount || 0}
                        expiringSoonCount={stats?.inventoryStats.expiringSoonCount || 0}
                        onViewAlerts={() => setIsExpiryModalOpen(true)}
                    />
                </div>
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                        <div className="p-4 md:px-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={14} className="text-red-500 animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Urgent Low Stock</span>
                            </div>
                            <Link href={`/${hospitalId}/pharmacy/products`}>
                                <span className="text-[10px] font-black text-teal-600 hover:underline cursor-pointer uppercase tracking-widest">View Medicines</span>
                            </Link>
                        </div>
                        <div className="p-2 overflow-x-auto no-scrollbar">
                            <LowStockList />
                        </div>
                    </div>
                </div>
            </div>

            {/* Insight Grid: Operational Highlights & Top Products */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Revenue & Payments Node (Left 3 cols) */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Revenue Node Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <Receipt size={18} className="text-teal-600" />
                                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Sales Summary</h4>
                            </div>
                            <div className="p-6 flex-1 space-y-5">
                                {[
                                    { label: "Total Sales", value: formatCurrency(stats?.requestedStats.revenue || 0), progress: 100 },
                                    { label: "Total Bills", value: stats?.requestedStats.billCount.toString() || "0", progress: 85 },
                                    { label: "Items Sold", value: stats?.requestedStats.itemsSold.toString() || "0", progress: 78 },
                                    { label: "Average Bill Value", value: formatCurrency(stats?.requestedStats.avgBillValue || 0), progress: 92 },
                                ].map((item, idx) => (
                                    <div key={`revenue-stat-${idx}`} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                                            <span className="text-xs md:text-sm font-black text-gray-900 dark:text-white tracking-tight">{item.value}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-teal-50/20 dark:bg-teal-900/10 border-t border-gray-50 dark:border-gray-700">
                                <p className="text-[9px] md:text-[10px] font-black text-teal-600 uppercase tracking-widest">💡 High sales expected soon</p>
                            </div>
                        </div>

                        {/* Payment Method Network */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/20 dark:bg-gray-800/10">
                                <Wallet size={18} className="text-teal-600" />
                                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Payment Summary</h4>
                            </div>
                            <div className="p-5 md:p-6 flex-1 grid grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { label: "Cash Payments", value: stats?.paymentBreakdown.Cash || 0, color: "teal" },
                                    { label: "UPI Payments", value: stats?.paymentBreakdown.UPI || 0, color: "teal" },
                                    { label: "Card Payments", value: stats?.paymentBreakdown.Card || 0, color: "teal" },
                                    { label: "Credit Payments", value: stats?.paymentBreakdown.Credit || 0, color: "orange" },
                                ].map((p, i) => (
                                    <div key={`payment-mode-${i}`} className={`p-3 md:p-4 rounded-2xl border ${p.color === 'teal' ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-teal-500' : 'bg-orange-50/30 dark:bg-orange-950/20 border-orange-100/30 dark:border-orange-900/30'} transition-all group`}>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 group-hover:text-teal-600 transition-colors truncate">{p.label}</p>
                                        <p className="text-sm md:text-base font-black text-gray-900 dark:text-white truncate">{formatCurrency(p.value)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="m-5 md:m-6 mt-0 p-4 rounded-2xl bg-teal-600 text-white flex justify-between items-center shadow-lg shadow-teal-500/20">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase opacity-80 tracking-widest">Total Revenue</p>
                                    <p className="text-base md:text-lg font-black truncate">{formatCurrency(stats?.paymentBreakdown.Mixed || 0)}</p>
                                </div>
                                <RefreshCcw size={18} className="opacity-40 shrink-0 ml-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Slow Movers + Near Expiry (Right 2 cols) */}
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col overflow-hidden hover:shadow-md transition-all">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-amber-50/30 dark:bg-amber-950/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
                                    <TrendingDown size={18} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Slow Movers · Near Expiry</h4>
                                    <p className="text-[9px] font-bold text-amber-500 uppercase mt-0.5 tracking-tight">Least Sold · Expiring 6–9 Months</p>
                                </div>
                            </div>
                            <Link href={`/${hospitalId}/pharmacy/products`}>
                                <span className="text-[9px] font-black text-teal-600 hover:underline cursor-pointer uppercase tracking-widest">View All</span>
                            </Link>
                        </div>
                        <div className="p-2 md:p-3 flex-1 overflow-y-auto max-h-[420px] no-scrollbar">
                            {stats.leastSellingProducts && stats.leastSellingProducts.length > 0 ? (
                                <div className="space-y-1">
                                    {stats.leastSellingProducts.map((product, i) => {
                                        const expiry = new Date(product.expiryDate);
                                        const monthsLeft = Math.ceil(
                                            (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                                        );
                                        const expiryColor =
                                            monthsLeft <= 6
                                                ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'
                                                : monthsLeft <= 7
                                                    ? 'bg-orange-50 text-orange-500 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30';
                                        return (
                                            <div
                                                key={`slow-mover-${product.name}-${i}`}
                                                className="p-2.5 md:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-all flex items-center justify-between group border border-transparent hover:border-amber-100 dark:hover:border-amber-900/30"
                                            >
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center border border-amber-100 dark:border-amber-800/40 group-hover:bg-amber-500 transition-all shrink-0">
                                                        <span className="text-[9px] md:text-[10px] font-black text-amber-500 group-hover:text-white">{i + 1}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] md:text-xs font-black text-gray-700 dark:text-gray-200 uppercase truncate mb-0.5">{product.name}</p>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {product.brand && (
                                                                <span className="text-[8px] font-bold text-gray-400 uppercase whitespace-nowrap">{product.brand}</span>
                                                            )}
                                                            <span className="text-[8px] font-bold text-gray-300">·</span>
                                                            <span className="text-[8px] font-bold text-teal-500 uppercase whitespace-nowrap">{product.qtySold} Sold</span>
                                                            <span className="text-[8px] font-bold text-gray-300">·</span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase whitespace-nowrap">{product.stock} In Stock</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                                    <span className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${expiryColor}`}>
                                                        <Clock size={8} />
                                                        {monthsLeft}M
                                                    </span>
                                                    <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 font-mono">₹{product.mrp}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-16 text-gray-300 dark:text-gray-600 opacity-50">
                                    <TrendingDown size={36} strokeWidth={1.5} className="mb-3" />
                                    <p className="text-xs font-black uppercase tracking-[0.3em]">No slow movers</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-gray-400">All medicines selling well</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Invoices - Professional Audit Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-4 md:p-6 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30 dark:bg-gray-800/20">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Recent Transactions</h4>
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Live transactions</p>
                        </div>
                    </div>
                    <Link href={`/${hospitalId}/pharmacy/transactions`} className="group flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-teal-600 dark:bg-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-white dark:text-gray-900 hover:scale-105 transition-all shadow-md">
                        View All Transactions
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Invoice ID</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Date & Time</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Staff</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-6 md:px-8 py-4 md:py-5 text-right text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {stats.recentInvoices?.length > 0 ? (
                                stats.recentInvoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all group">
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] md:text-[12px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight truncate">{inv.invoiceNumber}</span>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">#{inv._id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] md:text-[12px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                                                    {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] md:text-[11px] font-bold text-gray-400">
                                                    {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center border border-teal-100 dark:border-teal-800 shrink-0">
                                                    <span className="text-[11px] font-black text-teal-600">{inv.createdBy?.name?.charAt(0) || 'S'}</span>
                                                </div>
                                                <span className="text-[11px] md:text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight truncate max-w-[120px]">{inv.createdBy?.name || 'Pharmacist'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5">
                                            <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest border shadow-sm ${inv.status === 'PAID'
                                                ? 'bg-teal-50 text-teal-600 border-teal-100/50 dark:bg-teal-900/20 dark:text-teal-400'
                                                : 'bg-orange-50 text-orange-600 border-orange-100/50 dark:bg-orange-950/20'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-5 text-right">
                                            <span className="text-[11px] md:text-sm font-black text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors font-mono">
                                                {formatCurrency(inv.netPayable)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 md:px-8 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <RefreshCcw size={40} className="text-gray-400" />
                                            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">No Transactions Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
