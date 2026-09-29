'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Wrench,
    Download,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    Filter,
    ArrowLeftRight,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Eye,
    ShieldAlert,
    Cpu,
    Calendar,
    DollarSign,
    Layers,
    UserCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LabEquipmentService } from '@/lib/integrations/services/labEquipment.service';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { LabEquipment } from '@/lib/integrations/types/labEquipment';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';

function EquipmentListPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const { user } = useAuthStore();
    const isAdmin = ['super-admin', 'hospital-admin'].includes(user?.role || '');

    const [equipment, setEquipment] = useState<LabEquipment[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNavigating, startNavigation] = useTransition();

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [deletedFilter, setDeletedFilter] = useState<'false' | 'true' | 'only'>('false');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;

    // Selection & Bulk actions
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showBulkActions, setShowBulkActions] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [categoryFilter, deptFilter, statusFilter, brandFilter, deletedFilter, currentPage, sortBy, sortOrder]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [equipmentRes, depts] = await Promise.all([
                LabEquipmentService.getEquipment({
                    search: searchTerm,
                    category: categoryFilter || undefined,
                    department: deptFilter || undefined,
                    status: statusFilter || undefined,
                    brand: brandFilter || undefined,
                    showDeleted: deletedFilter !== 'false' ? deletedFilter : undefined,
                    sortBy,
                    sortOrder,
                    page: currentPage,
                    limit: itemsPerPage,
                }),
                DepartmentService.getDepartments(),
            ]);

            setEquipment(equipmentRes.data);
            setTotalPages(equipmentRes.pagination.pages || 1);
            setDepartments(depts);
        } catch (error) {
            console.error("Failed to fetch equipment", error);
            toast.error("Failed to load equipment catalog");
        } finally {
            setLoading(false);
        }
    };

    // Handle Search Submit / Debounce trigger
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchInitialData();
    };

    // Individual actions
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to deactivate/soft-delete this equipment?")) return;
        try {
            await LabEquipmentService.deleteEquipment(id);
            toast.success("Equipment soft deleted");
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await LabEquipmentService.restoreEquipment(id);
            toast.success("Equipment restored successfully");
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to restore");
        }
    };

    // Bulk operations
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(equipment.map(item => item._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to soft-delete ${selectedIds.length} items?`)) return;
        try {
            await LabEquipmentService.bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} items soft deleted`);
            setSelectedIds([]);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to perform bulk delete");
        }
    };

    const handleBulkRestore = async () => {
        if (!confirm(`Are you sure you want to restore ${selectedIds.length} items?`)) return;
        try {
            await LabEquipmentService.bulkRestore(selectedIds);
            toast.success(`${selectedIds.length} items restored`);
            setSelectedIds([]);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to perform bulk restore");
        }
    };

    const handleBulkStatusUpdate = async (status: string) => {
        if (!status) return;
        try {
            await LabEquipmentService.bulkStatusUpdate(selectedIds, status);
            toast.success(`Status updated to ${status} for ${selectedIds.length} items`);
            setSelectedIds([]);
            setBulkStatus('');
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        }
    };

    // Date checkers for Alerts/Warnings
    const getAlerts = (item: LabEquipment) => {
        const alerts: Array<{ type: 'warranty' | 'service' | 'calibration'; daysLeft: number }> = [];
        const today = new Date();

        if (item.warrantyExpiry) {
            const wDate = new Date(item.warrantyExpiry);
            const diffTime = wDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 30) {
                alerts.push({ type: 'warranty', daysLeft: diffDays });
            }
        }

        if (item.nextServiceDate) {
            const sDate = new Date(item.nextServiceDate);
            const diffTime = sDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 15) {
                alerts.push({ type: 'service', daysLeft: diffDays });
            }
        }

        if (item.calibrationDueDate) {
            const cDate = new Date(item.calibrationDueDate);
            const diffTime = cDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 15) {
                alerts.push({ type: 'calibration', daysLeft: diffDays });
            }
        }

        return alerts;
    };

    // Active alerts overview for notification banners
    const criticalAlertsSummary = useMemo(() => {
        let warrantyCount = 0;
        let serviceCount = 0;
        let calibrationCount = 0;

        equipment.forEach(item => {
            const itemAlerts = getAlerts(item);
            itemAlerts.forEach(a => {
                if (a.type === 'warranty') warrantyCount++;
                if (a.type === 'service') serviceCount++;
                if (a.type === 'calibration') calibrationCount++;
            });
        });

        return { warrantyCount, serviceCount, calibrationCount };
    }, [equipment]);

    // Dynamic Options derived from data (for unique filters)
    const uniqueBrands = useMemo(() => {
        return Array.from(new Set(equipment.map(item => item.brand).filter(Boolean)));
    }, [equipment]);

    // Export formats
    const exportToExcel = () => {
        const dataToExport = equipment.map(item => ({
            "Code": item.code,
            "Name": item.name,
            "Category": item.category,
            "Department": typeof item.department === 'object' ? item.department.name : item.department,
            "Brand": item.brand,
            "Model": item.model,
            "Quantity": item.quantity,
            "Purchase Price": item.purchasePrice,
            "Status": item.status,
            "Next Service": item.nextServiceDate ? new Date(item.nextServiceDate).toLocaleDateString() : 'N/A',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Equipment List");
        XLSX.writeFile(workbook, "Lab_Equipment_Report.xlsx");
        toast.success("Excel exported successfully");
    };

    const exportToCSV = () => {
        const headers = ["Code", "Name", "Category", "Department", "Brand", "Model", "Quantity", "Purchase Price", "Status", "Next Service"];
        const rows = equipment.map(item => [
            item.code,
            item.name,
            item.category,
            typeof item.department === 'object' ? item.department.name : item.department,
            item.brand,
            item.model,
            item.quantity,
            item.purchasePrice,
            item.status,
            item.nextServiceDate ? new Date(item.nextServiceDate).toLocaleDateString() : 'N/A',
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Lab_Equipment_Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exported successfully");
    };

    const triggerPrint = () => {
        window.print();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-700 print:p-0">
            {/* Maintenance Alerts Banner */}
            {(criticalAlertsSummary.warrantyCount > 0 || criticalAlertsSummary.serviceCount > 0 || criticalAlertsSummary.calibrationCount > 0) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">Equipment Reminders Due</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                You have {criticalAlertsSummary.warrantyCount} warranty expiries (30 days), {criticalAlertsSummary.serviceCount} service schedules (15 days), and {criticalAlertsSummary.calibrationCount} calibration cycles (15 days) due.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                            <Cpu className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                Lab Equipment Management
                            </h1>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">
                                Asset Registry & Maintenance Control
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-1 max-w-md mx-4">
                        <form onSubmit={handleSearch} className="w-full relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by name, code, brand..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </form>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-50 transition-all uppercase tracking-wider"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Excel
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-50 transition-all uppercase tracking-wider"
                        >
                            <Download className="w-3.5 h-3.5" />
                            CSV
                        </button>
                        <button
                            onClick={triggerPrint}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-50 transition-all uppercase tracking-wider"
                        >
                            <Download className="w-3.5 h-3.5" />
                            PDF / Print
                        </button>
                        <button
                            onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/equipment/bulk-import`))}
                            disabled={isNavigating}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Import
                        </button>
                        <button
                            onClick={() => startNavigation(() => router.push(`/${hospitalId}/lab/equipment/manage`))}
                            disabled={isNavigating}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Equipment
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Categories</option>
                        {["Analyzer", "Microscope", "Centrifuge", "Incubator", "Autoclave", "Refrigerator", "Freezer", "Water Bath", "Hot Air Oven", "PCR Machine", "ELISA Reader", "Laminar Air Flow", "Blood Gas Analyzer", "Electrolyte Analyzer", "Urine Analyzer", "HbA1c Analyzer", "Other"].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Statuses</option>
                        {["Working", "Under Maintenance", "Repairing", "Out of Service", "Inactive", "Disposed"].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                        value={brandFilter}
                        onChange={(e) => { setBrandFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Brands</option>
                        {uniqueBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                        value={deletedFilter}
                        onChange={(e) => { setDeletedFilter(e.target.value as any); setCurrentPage(1); }}
                    >
                        <option value="false">Active Records Only</option>
                        {isAdmin && (
                            <>
                                <option value="true">Show All (Incl. Archived)</option>
                                <option value="only">Archived / Deleted Only</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedIds.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 px-4 py-3 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 print:hidden">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {selectedIds.length} items selected
                    </span>
                    <div className="flex items-center gap-2">
                        <select
                            value={bulkStatus}
                            onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                            className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                        >
                            <option value="">Change Status...</option>
                            {["Working", "Under Maintenance", "Repairing", "Out of Service", "Inactive", "Disposed"].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm uppercase tracking-wider"
                        >
                            Delete Selected
                        </button>
                        {isAdmin && deletedFilter !== 'false' && (
                            <button
                                onClick={handleBulkRestore}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm uppercase tracking-wider"
                            >
                                Restore Selected
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Registry Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Retrieving asset registry...</p>
                    </div>
                ) : equipment.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full animate-pulse">
                            <Cpu size={48} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No equipment matching query found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px] w-16">Image</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px] min-w-[130px]">Code</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px] min-w-[200px]">Name</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Category</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Department</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Brand & Model</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Qty</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Price (₹)</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px] min-w-[150px]">Status</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Next Service</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px] text-right print:hidden">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                    {equipment.map((item) => {
                                        const alerts = getAlerts(item);
                                        return (
                                            <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 group transition-colors">
                                                <td className="px-4 py-4">
                                                    <img
                                                        src={item.image || '/images/equipment-placeholder.png'}
                                                        alt={item.name}
                                                        className="w-10 h-10 object-contain rounded-lg border border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f3f4f6/374151?text=Equipment';
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-xs font-semibold text-gray-900 dark:text-white uppercase font-mono">
                                                    {item.code}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                                                        {item.name}
                                                    </div>
                                                    {alerts.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {alerts.map((al, idx) => (
                                                                <span key={idx} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[8px] font-black uppercase tracking-wider">
                                                                    {al.type} due ({al.daysLeft}d)
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                                    {item.category}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                                    {typeof item.department === 'object' ? item.department.name : 'General'}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                                    {item.brand} / {item.model}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-900 dark:text-white font-mono">
                                                    {item.quantity} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-gray-900 dark:text-white font-mono">
                                                    ₹{item.purchasePrice.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                                                        item.status === 'Working'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                                                            : item.status === 'Under Maintenance' || item.status === 'Repairing'
                                                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                                                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-xs font-medium font-mono ${
                                                    alerts.some(a => a.type === 'service') ? 'text-amber-600 font-bold' : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    {item.nextServiceDate ? new Date(item.nextServiceDate).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right print:hidden">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => router.push(`/${hospitalId}/lab/equipment/${item._id}`)}
                                                            className="p-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {item.isActive ? (
                                                            <>
                                                                <button
                                                                    onClick={() => router.push(`/${hospitalId}/lab/equipment/manage?id=${item._id}`)}
                                                                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm transition-all"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(item._id)}
                                                                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-rose-50 text-rose-500 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm transition-all"
                                                                    title="Deactivate / Soft Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            isAdmin && (
                                                                <button
                                                                    onClick={() => handleRestore(item._id)}
                                                                    className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg border border-emerald-200 text-[10px] font-bold"
                                                                    title="Restore"
                                                                >
                                                                    Restore
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50 print:hidden mt-auto">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Showing <span className="font-semibold text-gray-900 dark:text-white">{equipment.length}</span> items
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                            Prev
                                        </button>
                                        <span className="text-xs text-gray-500 font-bold">
                                            {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(EquipmentListPage);
