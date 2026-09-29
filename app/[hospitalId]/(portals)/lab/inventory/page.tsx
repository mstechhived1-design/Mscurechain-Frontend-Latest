'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Plus,
    Search,
    Trash2,
    SlidersHorizontal,
    FileSpreadsheet,
    Download,
    AlertTriangle,
    Eye,
    Edit2,
    Calendar,
    Package,
    ShieldAlert,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    X,
} from 'lucide-react';
import { LabInventoryService } from '@/lib/integrations/services/labInventory.service';
import { LabInventory } from '@/lib/integrations/types/labInventory';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const CATEGORIES = [
    'Reagent',
    'Test Kit',
    'Consumable',
    'Glassware',
    'Chemical',
    'General Item',
    'Other',
];

const STATUSES = [
    'In Stock',
    'Low Stock',
    'Out of Stock',
    'Expired',
];

function InventoryListPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;

    const [items, setItems] = useState<LabInventory[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
    const [loading, setLoading] = useState(false);
    const [isNavigating, startNavigation] = useTransition();

    // Filters & States
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    // Bulk selection — checkboxes only render/occupy space once this is toggled on
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Overview counters
    const [stats, setStats] = useState({
        total: 0,
        lowStock: 0,
        expired: 0,
        expiringSoon: 0,
    });

    // Debounce the search input so typing triggers a fetch automatically
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset to page 1 whenever the effective search/filter criteria changes
    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, category, status]);

    // Single source of truth for fetching data — always uses the latest committed filters
    useEffect(() => {
        loadData(debouncedSearch, page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, category, status, sortBy, sortOrder, page]);

    const loadData = async (searchTerm: string = debouncedSearch, pageNum: number = page) => {
        setLoading(true);
        try {
            const { data, pagination: pag } = await LabInventoryService.getInventory({
                search: searchTerm,
                category,
                status,
                sortBy,
                sortOrder,
                page: pageNum,
                limit: 10,
            });
            setItems(data);
            setPagination(pag);

            // Compute counts for local display / warnings
            let low = 0;
            let exp = 0;
            let soon = 0;
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            data.forEach(item => {
                if (item.quantity <= item.reorderLevel) low++;
                if (item.expiryDate) {
                    const eDate = new Date(item.expiryDate);
                    if (eDate < now) {
                        exp++;
                    } else if (eDate <= thirtyDaysFromNow) {
                        soon++;
                    }
                }
            });

            setStats({
                total: pag.total,
                lowStock: low,
                expired: exp,
                expiringSoon: soon,
            });
        } catch (error) {
            console.error("Failed to load inventory", error);
            toast.error("Failed to fetch inventory records");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Commit the search immediately instead of waiting on the debounce timer
        setDebouncedSearch(search);
        setPage(1);
        loadData(search, 1);
    };

    const handleReset = () => {
        setSearch('');
        setDebouncedSearch('');
        setCategory('');
        setStatus('');
        setPage(1);
        loadData('', 1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this inventory item?")) return;
        try {
            await LabInventoryService.deleteInventoryItem(id);
            toast.success("Inventory item deleted successfully");
            loadData();
        } catch (error) {
            toast.error("Failed to delete inventory item");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;
        try {
            await LabInventoryService.bulkDelete(selectedIds);
            toast.success("Selected items deleted successfully");
            setSelectedIds([]);
            loadData();
        } catch (error) {
            toast.error("Failed to perform bulk deletion");
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(items.map(item => item._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectionMode = () => {
        setSelectionMode(prev => {
            // Turning selection mode off clears any selected rows
            if (prev) setSelectedIds([]);
            return !prev;
        });
    };

    // Export helper (single export button — Excel only)
    const exportExcel = () => {
        const dataToExport = items.map(item => ({
            "Item Code": item.code,
            "Item Name": item.name,
            "Category": item.category,
            "Brand": item.brand || 'N/A',
            "Quantity": item.quantity,
            "Unit": item.unit,
            "Purchase Price (₹)": item.purchasePrice,
            "MRP (₹)": item.mrp,
            "Expiry Date": item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, "Lab_Inventory.xlsx");
        toast.success("Exported to Excel");
    };

    const getStatusStyle = (item: LabInventory) => {
        const now = new Date();
        if (item.expiryDate && new Date(item.expiryDate) < now) {
            return {
                bg: 'bg-rose-50 dark:bg-rose-950/20',
                text: 'text-rose-600 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-900/30',
                label: 'Expired'
            };
        }
        if (item.quantity === 0) {
            return {
                bg: 'bg-slate-100 dark:bg-gray-800',
                text: 'text-gray-600 dark:text-gray-400',
                border: 'border-slate-200 dark:border-gray-700',
                label: 'Out of Stock'
            };
        }
        if (item.quantity <= item.reorderLevel) {
            return {
                bg: 'bg-amber-50 dark:bg-amber-950/20',
                text: 'text-amber-600 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-900/30',
                label: 'Low Stock'
            };
        }
        return {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-900/30',
            label: 'In Stock'
        };
    };

    // Compact mini stat card used inside the header row
    const StatMiniCard = ({
        icon,
        label,
        value,
        iconBg,
        iconText,
        valueText,
    }: {
        icon: React.ReactNode;
        label: string;
        value: number;
        iconBg: string;
        iconText: string;
        valueText: string;
    }) => (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 min-w-[120px]">
            <div className={`p-1.5 rounded-lg ${iconBg} ${iconText}`}>
                {icon}
            </div>
            <div>
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">{label}</span>
                <h4 className={`text-sm font-black font-mono mt-0.5 leading-none ${valueText}`}>{value}</h4>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header: Title + Compact Stat Cards + Actions all in one row */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-wrap">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                <Package className="w-5 h-5 text-indigo-600" />
                                Lab Inventory Management
                            </h1>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                                Manage reagents, test kits, consumables and glassware stocks
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <StatMiniCard
                                icon={<Package className="w-4 h-4" />}
                                label="Total Items"
                                value={stats.total}
                                iconBg="bg-indigo-50 dark:bg-indigo-950/30"
                                iconText="text-indigo-600 dark:text-indigo-400"
                                valueText="text-gray-900 dark:text-white"
                            />
                            <StatMiniCard
                                icon={<AlertTriangle className="w-4 h-4" />}
                                label="Low Stock"
                                value={stats.lowStock}
                                iconBg="bg-amber-50 dark:bg-amber-950/30"
                                iconText="text-amber-600 dark:text-amber-400"
                                valueText="text-amber-600"
                            />
                            <StatMiniCard
                                icon={<ShieldAlert className="w-4 h-4" />}
                                label="Expired"
                                value={stats.expired}
                                iconBg="bg-rose-50 dark:bg-rose-950/30"
                                iconText="text-rose-600 dark:text-rose-400"
                                valueText="text-rose-600"
                            />
                            <StatMiniCard
                                icon={<Calendar className="w-4 h-4" />}
                                label="Expiring 30 Days"
                                value={stats.expiringSoon}
                                iconBg="bg-blue-50 dark:bg-blue-950/30"
                                iconText="text-blue-600 dark:text-blue-400"
                                valueText="text-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            onClick={exportExcel}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-all border border-slate-200 dark:border-gray-600"
                            title="Export to Excel"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/inventory/bulk-import`))}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-gray-600 transition-all uppercase tracking-wider"
                        >
                            <Download className="w-4 h-4" />
                            Import
                        </button>

                        <button
                            onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/inventory/manage`))}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Panel & Search */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, code, or brand..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters(f => !f)}
                        className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-indigo-55/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-gray-700 border-slate-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={toggleSelectionMode}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                            selectionMode
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                                : 'bg-slate-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600'
                        }`}
                    >
                        {selectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                        {selectionMode ? 'Cancel' : 'Select'}
                    </button>
                </form>

                {selectionMode && selectedIds.length > 0 && (
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl px-4 py-2.5">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                            {selectedIds.length} items selected
                        </span>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Bulk Delete
                        </button>
                    </div>
                )}

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-gray-750">
                        {/* Category filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Category</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold cursor-pointer"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Status</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold cursor-pointer"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {STATUSES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                        {/* Reset filters */}
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="w-full py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-gray-600 transition-all uppercase tracking-wider"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table / List Records */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-gray-900 border-b border-slate-150 dark:border-gray-750">
                                {selectionMode && (
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                            checked={items.length > 0 && selectedIds.length === items.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Image</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Item Code</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[200px]">Item Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Brand</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Qty</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Unit</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Price</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">MRP</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Expiry</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-750">
                            {loading ? (
                                <tr>
                                    <td colSpan={selectionMode ? 13 : 12} className="px-6 py-12 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                                        <span className="text-xs text-gray-400">Loading catalog items...</span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={selectionMode ? 13 : 12} className="px-6 py-12 text-center text-gray-400 text-xs font-semibold">
                                        No inventory records found.
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => {
                                    const st = getStatusStyle(item);
                                    const isLow = item.quantity <= item.reorderLevel;
                                    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                                    const isExpiringSoon = item.expiryDate && !isExpired && new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                    return (
                                        <tr
                                            key={item._id}
                                            className={`hover:bg-slate-50/50 dark:hover:bg-gray-750 transition-colors ${
                                                isExpired ? 'bg-rose-500/5' : (isLow ? 'bg-amber-500/5' : '')
                                            }`}
                                        >
                                            {selectionMode && (
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                        checked={selectedIds.includes(item._id)}
                                                        onChange={() => handleSelectItem(item._id)}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                            onError={e => { (e.target as any).src = "https://placehold.co/100x100?text=Item"; }}
                                                        />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {item.code}
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                                                    {item.name}
                                                    {isExpired && (
                                                        <span className="px-1.5 py-0.5 text-[8px] bg-rose-600 text-white rounded font-black uppercase tracking-wider whitespace-nowrap">Expired</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {item.category}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {item.brand || '—'}
                                            </td>
                                            <td className={`px-6 py-4 text-xs font-black text-right font-mono whitespace-nowrap ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                                                {item.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                {item.unit}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-right text-gray-900 dark:text-white whitespace-nowrap">
                                                ₹{item.purchasePrice.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-right text-gray-900 dark:text-white whitespace-nowrap">
                                                ₹{item.mrp.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap ${st.bg} ${st.text} ${st.border}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap">
                                                {item.expiryDate ? (
                                                    <span className={`flex items-center gap-1 font-mono ${isExpired ? 'text-rose-600 dark:text-rose-400' : (isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500')}`}>
                                                        {new Date(item.expiryDate).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/inventory/${item._id}`))}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-500 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/inventory/manage?id=${item._id}`))}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                                                        title="Edit Item"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="bg-slate-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-gray-750">
                        <span className="text-xs text-gray-500">
                            Showing page <strong className="font-bold text-gray-900 dark:text-white font-mono">{pagination.page}</strong> of <strong className="font-bold text-gray-900 dark:text-white font-mono">{pagination.pages}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === pagination.pages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(InventoryListPage);