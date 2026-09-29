'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Filter,
    Download,
    FileSpreadsheet,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    Trash2,
    Package
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clearApiCache } from '@/lib/integrations/api/apiClient';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyProduct, PharmacyProductPayload } from '@/lib/integrations/types/product';
import ProductTable from '@/components/pharmacy/products/ProductTable';
import AddProductModal from '@/components/pharmacy/products/AddProductModal';
import BulkProductUploadModal from '@/components/pharmacy/products/BulkProductUploadModal';
import { ConfirmModal } from '@/components/admin/Modal';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ProductsPage = () => {
    const [products, setProducts] = useState<PharmacyProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<PharmacyProduct | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const searchParams = useSearchParams() as any;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Stock');
    const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
    const [expiryStatusFilter, setExpiryStatusFilter] = useState(((searchParams?.get('expiryStatus') ?? null) ?? null) || 'All');

    const fetchProducts = React.useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const data = await ProductService.getProductsPaginated(
                page,
                20, // Limit
                {
                    search: searchTerm,
                    status: statusFilter === 'All Stock' ? undefined : statusFilter,
                    supplier: supplierFilter === 'All Suppliers' ? undefined : supplierFilter,
                    expiryStatus: expiryStatusFilter === 'All' ? undefined : expiryStatusFilter
                }
            );
            setProducts(data.products);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
            setTotalProducts(data.totalProducts);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load inventory data');
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, statusFilter, supplierFilter, expiryStatusFilter]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchProducts]);

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage, fetchProducts]);

    const handleSaveProduct = async (data: PharmacyProductPayload) => {
        try {
            if (editingProduct) {
                await ProductService.updateProduct(editingProduct._id, data);
                toast.success('Product updated');
            } else {
                await ProductService.addProduct(data);
                toast.success('Medicine added');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
        } catch (error: any) {
            console.error('Failed to save product:', error);
            toast.error(error.message || 'Failed to save product');
            throw error;
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Deregister SKU",
            message: `Warning: This will permanently remove the SKU "${name}" from the registry. Continue?`,
            onConfirm: async () => {
                setDeletingId(id);
                try {
                    await ProductService.deleteProduct(id);
                    toast.success('SKU deregistered');
                    fetchProducts();
                } catch (error) {
                    console.error('Failed to delete product:', error);
                    toast.error('Deregistration failed');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDeleteAllProducts = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Delete All Products",
            message: "CRITICAL WARNING: This will permanently delete ALL products and their associated stock/batches from your pharmacy. This action cannot be undone. Are you sure you want to proceed?",
            onConfirm: async () => {
                setDeletingId('all');
                try {
                    await ProductService.deleteAllProducts();
                    toast.success('All products deleted successfully');
                    fetchProducts(1);
                } catch (error) {
                    console.error('Failed to delete all products:', error);
                    toast.error('Failed to delete all products');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleEditProduct = (product: PharmacyProduct) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleExportExcel = async () => {
        const loadToast = toast.loading('Generating catalog manifest...');
        try {
            // Fetch all products (high limit) instead of just current page
            const allProducts = await ProductService.getProducts({ limit: 5000 });

            if (allProducts.length === 0) {
                toast.error('No registry data to export', { id: loadToast });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Inventory Report');

            // 1. Transaction Report Heading
            worksheet.mergeCells('A1:M1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'Full Catalog Audit';
            titleRow.getCell(1).font = { size: 16, bold: true, name: 'Arial', color: { argb: '1E293B' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 35;

            // 2. Export Date
            worksheet.getCell('A3').value = 'Export Date:';
            worksheet.getCell('B3').value = new Date().toLocaleDateString('en-GB');
            worksheet.getCell('A3').font = { bold: true };

            worksheet.addRow([]); // Spacer

            // Comprehensive Columns (Match to User Image)
            const columns = [
                { header: 'SKU', width: 15 },
                { header: 'Generic Name', width: 25 },
                { header: 'Brand Name', width: 25 },
                { header: 'Strength', width: 15 },
                { header: 'Form *', width: 12 },
                { header: 'Schedule *', width: 12 },
                { header: 'MRP (₹) *', width: 12 },
                { header: 'GST %', width: 10 },
                { header: 'Current Stock', width: 15 },
                { header: 'Units Per Pack', width: 15 },
                { header: 'HSN Code', width: 15 },
                { header: 'Batch Number', width: 15 },
                { header: 'Expiry Date', width: 15 },
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

            // Add Data Rows
            allProducts.forEach((product, index) => {
                const row = worksheet.addRow([
                    product.sku,
                    product.genericName,
                    product.brandName,
                    product.strength || '-',
                    product.form || '-',
                    product.schedule || 'OTC',
                    product.mrp,
                    product.gst || 0,
                    product.currentStock,
                    product.unitsPerPack || 1,
                    product.hsnCode || '-',
                    product.batchNumber || '-',
                    product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-GB') : '-'
                ]);

                // Style data cells
                row.eachCell((cell, colNumber) => {
                    // Standard alignment
                    if (colNumber <= 6 || colNumber >= 11) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    }

                    // Zebra striping
                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
                    }

                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    // Format Amount columns
                    if (colNumber === 7) {
                        cell.numFmt = '₹#,##0.00';
                    }
                });
            });

            // Calculate inventory stats
            const totalProductsCount = allProducts.length;
            let totalCurrentStock = 0;
            let outOfStockCount = 0;
            let totalInventoryValue = 0;

            allProducts.forEach(product => {
                const stock = product.currentStock || 0;
                totalCurrentStock += stock;
                if (stock <= 0) {
                    outOfStockCount++;
                }
                totalInventoryValue += (product.mrp || 0) * stock;
            });

            // 5. SUMMARY DASHBOARD
            worksheet.addRow({}); // Blank spacer
            const lastRowNum = worksheet.lastRow?.number || 0;
            const summaryStartRow = lastRowNum + 1;
            worksheet.mergeCells(`A${summaryStartRow}:G${summaryStartRow}`);
            const summaryTitle = worksheet.getCell(`A${summaryStartRow}`);
            summaryTitle.value = "INVENTORY SUMMARY";
            summaryTitle.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
            summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
            summaryTitle.alignment = { horizontal: "center" };

            const summaryRows = [
                ["", "", "", "TOTAL SKU COUNT", totalProductsCount, "", ""],
                ["", "", "", "TOTAL CURRENT STOCK", totalCurrentStock, "UNITS", ""],
                ["", "", "", "OUT OF STOCK PRODUCTS", outOfStockCount, "ITEMS", ""],
                ["", "", "", "TOTAL ESTIMATED VALUE (MRP)", totalInventoryValue, "", ""]
            ];

            summaryRows.forEach((rowData) => {
                const row = worksheet.addRow(rowData);
                const labelCell = row.getCell(4);
                const valCell = row.getCell(5);
                const unitCell = row.getCell(6);
                if (labelCell.value) {
                    labelCell.font = { bold: true, size: 10, color: { argb: "475569" } };
                    valCell.font = { bold: true, size: 11, color: { argb: "0F172A" } };
                    if (labelCell.value.toString().includes("VALUE")) {
                        valCell.numFmt = '"₹"#,##0.00';
                    }
                }
            });

            // Auto Column Widths
            if (worksheet.columns) {
                worksheet.columns.forEach((column: any) => {
                    let maxLen = 0;
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        if (cell.row < 4) return; // Skip title and metadata rows
                        const value = cell.value ? cell.value.toString() : '';
                        if (value.length > maxLen) {
                            maxLen = value.length;
                        }
                    });
                    column.width = maxLen < 12 ? 12 : maxLen + 3;
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, `Pharmacy_Catalog_Complete_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Exported ${allProducts.length} products successfully`, { id: loadToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export catalog', { id: loadToast });
        }
    };

    const suppliers = ['All Suppliers', ...Array.from(new Set(products.map(p => {
        if (typeof p.supplier === 'object' && p.supplier !== null) {
            return (p.supplier as any).name;
        }
        return p.supplier;
    }))).filter(Boolean)];

    return (
        <div className="space-y-4 md:space-y-6 pb-20 w-full max-w-7xl mx-auto overflow-x-hidden pt-2 md:pt-4">
            {/* Unified Top Action Bar */}
            <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 mb-2">
                
                {/* Heading */}
                <div className="shrink-0 flex items-center gap-2 px-1">
                    <div className="p-1.5 md:p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
                        <Package className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                            Products
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1.5 md:mt-1">
                            Inventory & Catalog
                        </p>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="w-full flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between xl:justify-end">
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full min-w-[180px] group">
                        <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-teal-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, brand, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-teal-500 outline-none dark:text-white shadow-sm placeholder:text-gray-400 transition-all"
                        />
                    </div>

                    {/* Filter & Actions Wrapper */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
                        
                        <Link
                            href="/pharmacy/products/add"
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 md:py-2 bg-teal-600 text-white rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors shadow-sm shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Add Product</span>
                        </Link>

                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center justify-center p-1.5 md:p-2 rounded-lg transition-colors shadow-sm shrink-0 ${isFilterOpen ? 'text-blue-600 border border-blue-200 bg-blue-50' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700'}`}
                            title="Filters"
                        >
                            <Filter className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center justify-center p-1.5 md:p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
                            title="Export to Excel"
                        >
                            <Download className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>

                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center justify-center p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm shrink-0"
                            title="Import Data"
                        >
                            <FileSpreadsheet className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>

                        <button
                            onClick={handleDeleteAllProducts}
                            className="flex items-center justify-center p-1.5 md:p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-sm shrink-0"
                            title="Delete All Products"
                        >
                            <Trash2 className="w-4 h-4 md:w-4.5 md:h-4.5" />
                        </button>
                        
                        <div className="hidden sm:block h-7 w-px bg-gray-200 dark:bg-gray-700 shrink-0 mx-1" />

                        {/* Pagination Box */}
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm px-1 py-1 shrink-0">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || isLoading}
                                className="p-1 rounded-md text-gray-500 hover:text-teal-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <div className="bg-teal-500 text-white px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold min-w-[40px] text-center">
                                {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || isLoading}
                                className="p-1 rounded-md text-gray-500 hover:text-teal-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                            >
                                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => { clearApiCache(); fetchProducts(currentPage); }}
                            className="p-1.5 md:py-2 md:px-2.5 bg-gray-50 dark:bg-gray-800/50 text-gray-500 hover:text-teal-600 rounded-lg border border-gray-200 dark:border-gray-700 transition-all shadow-sm shrink-0"
                            title="Refresh List"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Section (Optional/Expandable) */}
            {isFilterOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mx-1 md:mx-2">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Stock Status</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All Stock</option>
                            <option>In Stock</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Supplier</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                        >
                            {suppliers.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Expiry Timeline</label>
                        <select
                            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={expiryStatusFilter}
                            onChange={(e) => setExpiryStatusFilter(e.target.value)}
                        >
                            <option>All</option>
                            <option>Expired</option>
                            <option>Expiring Soon (30 days)</option>
                            <option>Expiring in 3 months</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table Container with Pagination Info at Top */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mx-1 md:mx-2 overflow-hidden mt-2">
                <ProductTable
                    products={products}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    isLoading={isLoading}
                />
            </div>

            {/* Modals */}
            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                }}
                onSubmit={handleSaveProduct}
                initialData={editingProduct}
            />

            <BulkProductUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={fetchProducts}
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

export default ProductsPage;
