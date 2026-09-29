'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Truck,
    RefreshCw,
    ShoppingCart,
    Calendar,
    Package,
    Hash,
    FileText,
} from 'lucide-react';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { Supplier } from '@/lib/integrations/types/supplier';
import SupplierTable from '@/components/pharmacy/suppliers/SupplierTable';
import AddSupplierModal from '@/components/pharmacy/suppliers/AddSupplierModal';
import { ConfirmModal } from '@/components/admin/Modal';
import { toast } from 'react-hot-toast';
import { PharmacyTableSkeleton } from '@/components/ui/skeletons';

// ==== Purchase Transactions Tab Component ====
interface PurchaseTransaction {
    _id: string;
    batchNo: string;
    grnDate: string;
    product: {
        _id: string;
        name?: string;
        brand?: string;
        generic?: string;
        sku?: string;
        mrp?: number;
        form?: string;
        strength?: string;
    } | null;
    supplier: {
        _id: string;
        name?: string;
        phone?: string;
        email?: string;
    } | null;
    qtyReceived: number;
    qtySold: number;
    unitCost: number;
    unitGst: number;
    totalCost: number;
    totalWithGst: number;
    expiry: string;
    invoiceNo?: string;
    createdAt: string;
}

const PurchaseTransactionsTab = ({ suppliers }: { suppliers: Supplier[] }) => {
    const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchTransactions = React.useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await SupplierService.getSupplierPurchases({
                supplier: supplierFilter,
                search: searchTerm,
                startDate,
                endDate,
                page,
                limit: 15,
            });
            setTransactions(data.data);
            setTotalPages(data.totalPages);
            setTotalRecords(data.total);
            setCurrentPage(data.currentPage);
        } catch (error) {
            console.error('Failed to fetch purchase transactions:', error);
            toast.error('Failed to load purchase transactions');
        } finally {
            setLoading(false);
        }
    }, [supplierFilter, searchTerm, startDate, endDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTransactions(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchTransactions]);

    useEffect(() => {
        fetchTransactions(currentPage);
    }, [currentPage, fetchTransactions]);

    const formatCurrency = (amt: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Calculate summary
    const totalValue = transactions.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const totalQty = transactions.reduce((sum, t) => sum + (t.qtyReceived || 0), 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Records</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{totalRecords}</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                            <FileText size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Qty (This Page)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{totalQty.toLocaleString()}</h3>
                        <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
                            <Package size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Purchase Value (This Page)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(totalValue)}</h3>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                            <ShoppingCart size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col lg:flex-row w-full gap-3 items-stretch lg:items-center">
                    {/* Supplier Filter */}
                    <div className="relative w-full lg:w-auto md:min-w-[200px]">
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl px-4 py-2.5 md:py-3 text-[11px] md:text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-2 focus:ring-teal-500 dark:text-white cursor-pointer appearance-none"
                            value={supplierFilter}
                            onChange={e => setSupplierFilter(e.target.value)}
                        >
                            <option value="all">All Suppliers</option>
                            {suppliers.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-row w-full lg:w-auto gap-3">
                        {/* Date Filters */}
                        <div className="relative w-full md:w-auto lg:min-w-[150px]">
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-9 md:pl-10 pr-2 md:pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-[11px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                            />
                        </div>
                        <div className="relative w-full md:w-auto lg:min-w-[150px]">
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-9 md:pl-10 pr-2 md:pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-[11px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="h-10 w-px bg-gray-100 dark:bg-gray-700 hidden lg:block" />

                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by batch no or invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-[11px] md:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchTransactions(1)}
                        className="p-2.5 md:py-3 md:px-4 w-full md:w-auto flex justify-center bg-gray-50 dark:bg-gray-700/50 text-gray-500 rounded-xl hover:text-teal-500 border border-gray-100 dark:border-gray-700 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <PharmacyTableSkeleton rows={8} />
            ) : (
                <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">GRN Date</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Batch No</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Product</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Supplier</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Qty</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-right text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Unit Cost</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-right text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Total</th>
                                    <th className="px-4 md:px-5 py-3 md:py-4 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <ShoppingCart className="w-12 h-12 opacity-10" />
                                                <p className="text-xs font-black uppercase tracking-widest">No Purchase Records Found</p>
                                                <p className="text-xs text-gray-400 font-medium">Purchase transactions will appear here when products are added with stock and batch info.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((txn) => (
                                        <tr key={txn._id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                            <td className="px-4 md:px-5 py-4 align-top">
                                                <span className="font-bold text-[11px] md:text-xs text-gray-700 dark:text-gray-300">{formatDate(txn.grnDate)}</span>
                                            </td>
                                            <td className="px-4 md:px-5 py-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 md:p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                                                        <Hash size={12} className="md:w-3.5 md:h-3.5" />
                                                    </div>
                                                    <span className="font-black text-[11px] md:text-sm text-gray-900 dark:text-white uppercase tracking-tight">{txn.batchNo}</span>
                                                </div>
                                                {txn.invoiceNo && (
                                                    <p className="text-[10px] text-gray-400 font-bold mt-1 ml-7 md:ml-8">INV: {txn.invoiceNo}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 align-top">
                                                <p className="font-black text-[11px] md:text-xs text-gray-900 dark:text-white uppercase tracking-tight">
                                                    {txn.product?.brand || txn.product?.name || 'N/A'}
                                                </p>
                                                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                    {txn.product?.generic || ''} {txn.product?.strength ? `• ${txn.product.strength}` : ''} {txn.product?.form ? `• ${txn.product.form}` : ''}
                                                </p>
                                                {txn.product?.sku && (
                                                    <p className="text-[9px] font-semibold text-gray-400 mt-0.5">SKU: {txn.product.sku}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 align-top">
                                                <p className="font-bold text-[11px] md:text-xs text-gray-700 dark:text-gray-300 uppercase leading-snug">{txn.supplier?.name || 'Unknown'}</p>
                                                {txn.supplier?.phone && (
                                                    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold mt-0.5">{txn.supplier.phone}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 text-center align-top">
                                                <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg text-[11px] md:text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                    {txn.qtyReceived}
                                                </span>
                                                {txn.qtySold > 0 && (
                                                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 mt-1">Sold: {txn.qtySold}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 text-right align-top">
                                                <p className="font-bold text-[11px] md:text-xs text-gray-700 dark:text-gray-300">{formatCurrency(txn.unitCost)}</p>
                                                {txn.unitGst > 0 && (
                                                    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold mt-0.5">+GST {formatCurrency(txn.unitGst)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 text-right align-top">
                                                <p className="font-black text-[12px] md:text-sm text-gray-900 dark:text-white tabular-nums leading-none">{formatCurrency(txn.totalCost)}</p>
                                                {txn.totalWithGst > txn.totalCost && (
                                                    <p className="text-[9px] md:text-[10px] font-bold text-teal-600 mt-1 uppercase tracking-wider">in. GST: {formatCurrency(txn.totalWithGst)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-5 py-4 text-center align-top">
                                                {txn.expiry ? (
                                                    <span className={`text-[10px] md:text-xs font-black tracking-wide ${new Date(txn.expiry) < new Date() ? 'text-red-500' : new Date(txn.expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? 'text-amber-500' : 'text-gray-500'}`}>
                                                        {formatDate(txn.expiry)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && transactions.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 md:p-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700/50 dark:text-gray-300"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700/50 dark:text-gray-300"
                                >
                                    Next
                                </button>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Page <span className="text-teal-600">{currentPage}</span> of {totalPages} &middot; {totalRecords} records
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==== Main Page ====
const SUPPLIERS_PER_PAGE = 10;

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSuppliers, setTotalSuppliers] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const fetchSuppliers = React.useCallback(async (page: number = 1) => {
        setLoading(true);
        try {
            const data = await SupplierService.getSuppliersPaginated(page, SUPPLIERS_PER_PAGE, debouncedSearch || undefined);
            setSuppliers(data.suppliers);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
            setTotalSuppliers(data.total);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
            toast.error('Failed to load supplier network');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        fetchSuppliers(currentPage);
    }, [fetchSuppliers, currentPage]);

    const handleDelete = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Terminate Vendor",
            message: `Warning: Deleting ${name} will unlink them from all associated SKUs in the registry. Proceed?`,
            onConfirm: async () => {
                setDeletingId(id);
                try {
                    await SupplierService.deleteSupplier(id);
                    toast.success('Vendor profile terminated');
                    fetchSuppliers(currentPage);
                } catch (error) {
                    toast.error('Operation failed');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsAddModalOpen(true);
    };

    const filteredSuppliers = suppliers;

    const tabs = [
        { id: 'suppliers' as const, label: 'Suppliers', icon: Truck },
        { id: 'purchases' as const, label: 'Purchase Transactions', icon: ShoppingCart },
    ];

    return (
        <div className="space-y-6 md:space-y-8 pb-20 w-full max-w-7xl mx-auto overflow-x-hidden">
            {/* Unified Top Action Bar */}
            <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-4">
                
                {/* Heading */}
                <div className="shrink-0 flex flex-col justify-center px-1">
                    <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-none">Suppliers</h1>
                    <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 md:mt-1">
                        Vendor Management & Network
                    </p>
                </div>

                {/* Actions Row */}
                <div className="w-full lg:w-auto flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 justify-between lg:justify-end">
                    {activeTab === 'suppliers' && (
                        <>
                            {/* Search Bar */}
                            <div className="relative flex-1 w-full min-w-[180px] md:min-w-[250px] max-w-lg group">
                                <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-teal-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search suppliers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-teal-500 outline-none dark:text-white shadow-sm placeholder:text-gray-400 transition-all"
                                />
                            </div>

                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center justify-center gap-1.5 px-4 py-1.5 md:py-2 bg-teal-600 text-white rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors shadow-sm shrink-0 w-full sm:w-auto"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Vendor
                            </button>
                        </>
                    )}

                    <div className="hidden sm:block h-7 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

                    <button
                        onClick={() => fetchSuppliers()}
                        className="px-3 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-teal-600 transition-all shadow-sm flex items-center justify-center shrink-0 w-full sm:w-auto"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 w-full md:w-fit custom-scrollbar">
                <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/50 p-1 md:p-1.5 rounded-xl md:rounded-2xl min-w-max border border-gray-100 dark:border-gray-700/50">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-sm border border-gray-100 dark:border-gray-600'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <Icon size={14} className="md:w-[16px] md:h-[16px]" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'suppliers' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Supplier Network</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Total <span className="text-teal-600">{totalSuppliers}</span> Vendors
                            </span>
                        </div>
                    </div>

                    <div className="w-full">
                        <SupplierTable
                            suppliers={filteredSuppliers}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isLoading={loading}
                        />
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Page <span className="text-teal-600">{currentPage}</span> of {totalPages} &middot; {totalSuppliers} vendors
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Previous
                                </button>
                                <span className="px-3 py-2 bg-teal-600 text-white text-[10px] font-black rounded-xl">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages || loading}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'purchases' && (
                <PurchaseTransactionsTab suppliers={suppliers} />
            )}

            {/* Modals */}
            <AddSupplierModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                }}
                onSuccess={() => fetchSuppliers(1)}
                initialData={editingSupplier}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                loading={!!deletingId}
            />
        </div>
    );
};

export default SuppliersPage;
