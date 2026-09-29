'use client';

import React, { useState, useRef, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    Download,
    Info,
    FileSpreadsheet,
    ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LabInventoryService } from '@/lib/integrations/services/labInventory.service';
import { InventoryImportResponse, InventoryImportError } from '@/lib/integrations/types/labInventory';
import { toast } from 'react-hot-toast';

function BulkImportInventoryPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;

    const [file, setFile] = useState<File | null>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState<InventoryImportResponse | null>(null);
    const [isNavigating, startNavigation] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Download sample Excel template
    const downloadTemplate = () => {
        const headers = [
            "name",
            "code",
            "category",
            "unit",
            "brand",
            "quantity",
            "purchasePrice",
            "mrp",
            "reorderLevel",
            "batchNumber",
            "manufacturingDate",
            "expiryDate",
            "description",
            "notes"
        ];

        const sampleRow = {
            name: "EDTA Tubes 4ml",
            code: "INV-EDTA-001",
            category: "Consumable",
            unit: "Piece",
            brand: "BD Biosciences",
            quantity: "100",
            purchasePrice: "12",
            mrp: "15",
            reorderLevel: "20",
            batchNumber: "BATCH-EDTA-892",
            manufacturingDate: "2026-01-10",
            expiryDate: "2028-01-10",
            description: "Purple top hematology tubes containing EDTA anticoagulant",
            notes: "Store at room temperature away from direct sunlight"
        };

        const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Lab_Inventory_Import_Template.xlsx");
        toast.success("Import template downloaded");
    };

    // CSV parser helper
    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        if (lines.length === 0) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const currentline = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const obj: any = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j];
            }
            result.push(obj);
        }
        return result;
    };

    // Handle uploader changes
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setImportResult(null);

        const reader = new FileReader();
        if (selectedFile.name.endsWith('.csv')) {
            reader.onload = (evt) => {
                const text = evt.target?.result as string;
                const parsed = parseCSV(text);
                setRecords(parsed);
                toast.success(`${parsed.length} items parsed from CSV`);
            };
            reader.readAsText(selectedFile);
        } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
            reader.onload = (evt) => {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const parsed = XLSX.utils.sheet_to_json(worksheet);
                setRecords(parsed);
                toast.success(`${parsed.length} items parsed from Excel`);
            };
            reader.readAsBinaryString(selectedFile);
        } else {
            toast.error("Unsupported file format. Please upload .xlsx or .csv");
            setFile(null);
            setRecords([]);
        }
    };

    const handleImportSubmit = async () => {
        if (records.length === 0) {
            toast.error("Please upload a file containing inventory records");
            return;
        }

        setLoading(true);
        try {
            const res = await LabInventoryService.bulkImport(records);
            setImportResult(res);

            if (res.summary.success > 0) {
                toast.success(`Successfully imported ${res.summary.success} inventory items`);
            }
            if (res.summary.failed > 0) {
                toast.error(`Import failed for ${res.summary.failed} items. Check error details below.`);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to import inventory register");
        } finally {
            setLoading(false);
        }
    };

    const clearSelection = () => {
        setFile(null);
        setRecords([]);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl transition-colors border border-slate-200 dark:border-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                            Bulk Import Inventory Catalog
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                            Upload Excel or CSV inventory stock register
                        </p>
                    </div>
                </div>
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold shadow-sm transition-all border border-slate-200 dark:border-gray-600 hover:bg-slate-200 uppercase tracking-wider"
                >
                    <Download className="w-4 h-4" />
                    Download Template
                </button>
            </div>

            {/* Dropzone & Import Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left panel: Uploader */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx,.csv"
                            className="hidden"
                        />
                        {!file ? (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center text-center gap-3 group"
                            >
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl group-hover:scale-105 transition-transform border border-indigo-100 dark:border-indigo-850">
                                    <Upload className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">Upload Register Sheet</span>
                                    <p className="text-[10px] text-gray-400 mt-1">Accepts Excel (.xlsx) & CSV files</p>
                                </div>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center w-full">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-850 mb-3">
                                    <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                                </div>
                                <span className="text-xs font-bold text-gray-950 dark:text-white truncate max-w-[180px]">
                                    {file.name}
                                </span>
                                <p className="text-[10px] text-gray-400 mt-1">({records.length} parsed items)</p>

                                <div className="flex items-center gap-2 mt-4 w-full">
                                    <button
                                        onClick={clearSelection}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        disabled={loading}
                                        onClick={handleImportSubmit}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "Submit"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right panel: Summary */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm min-h-[220px] flex flex-col justify-between">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider border-b pb-2 mb-4">
                            Import Summary
                        </h3>

                        {importResult ? (
                            <div className="grid grid-cols-2 gap-4 my-auto">
                                <div className="p-4 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-850 rounded-xl flex flex-col justify-center">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase">Total Checked</span>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{importResult.summary.total}</span>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex flex-col justify-center">
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">Successfully Saved</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{importResult.summary.success}</span>
                                </div>
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex flex-col justify-center">
                                    <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase">Failed validation</span>
                                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{importResult.summary.failed}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-850 rounded-xl flex flex-col justify-center">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase">Skipped Duplicates</span>
                                    <span className="text-2xl font-black text-gray-500 font-mono">{importResult.summary.skipped}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center my-auto text-gray-400 gap-2">
                                <Info className="w-8 h-8 text-slate-300" />
                                <p className="text-xs font-semibold">Upload file and click Submit to run validations and view import stats</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Validation Log */}
            {importResult && importResult.errors.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2 text-rose-600 dark:text-rose-450">
                        <ShieldAlert className="w-4 h-4" />
                        Row-wise Validation Logs
                    </h3>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {importResult.errors.map((rowErr, index) => (
                            <div key={index} className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-xl flex gap-3">
                                <span className="font-bold text-xs bg-rose-600 text-white w-6 h-6 flex items-center justify-center rounded-lg font-mono shrink-0">
                                    R{rowErr.row}
                                </span>
                                <div className="text-xs text-rose-700 dark:text-rose-400 font-semibold space-y-1">
                                    {rowErr.errors.map((msg, idx) => (
                                        <p key={idx}>• {msg}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(BulkImportInventoryPage);
