'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download, Trash2, Edit3, Save } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'react-hot-toast';

interface ColumnConfig {
    key: string;
    label: string;
    required?: boolean;
    width?: number;
    editable?: boolean;
    format?: (val: any) => any;
}

interface GenericBulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    config: {
        title: string;
        description?: string;
        entityName?: string;
        templateName?: string;
        templateColumns?: string[];
        sampleRows?: any[];
        columns?: ColumnConfig[];
        onImport: (data: any[]) => Promise<{ addedCount: number; errorCount: number; errors: any[] }>;
    };
}

const GenericBulkImportModal: React.FC<GenericBulkImportModalProps> = ({ isOpen, onClose, onSuccess, config }) => {
    // Determine effective columns
    const effectiveColumns: ColumnConfig[] = config.columns || (config.templateColumns || []).map(col => ({
        key: col,
        label: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        required: true,
        editable: true,
        width: 20
    }));

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState<{ addedCount: number; errorCount: number; errors: any[] } | null>(null);
    const [visibleRows, setVisibleRows] = useState(10);
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setPreviewData([]);
            setUploadResults(null);
            setEditingRowIndex(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsParsing(true);
        setUploadResults(null);
        setVisibleRows(10);

        try {
            const data = await parseFile(selectedFile);
            setPreviewData(data);
        } catch (error: any) {
            console.error('File parsing error:', error);
            toast.error(error.message || 'Failed to parse file');
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const parseFile = async (file: File): Promise<any[]> => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'xlsx' || extension === 'xls') {
            return parseExcel(file);
        } else if (extension === 'csv') {
            return parseCSV(file);
        } else {
            throw new Error('Unsupported file format. Please use .xlsx or .csv');
        }
    };

    const parseExcel = async (file: File): Promise<any[]> => {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('No worksheet found');

        // Identify column mapping from headers
        const headerRow = worksheet.getRow(1);
        const colMap: { [key: number]: string } = {};
        headerRow.eachCell((cell, colId) => {
            const headerText = String(cell.value || '').toLowerCase().replace(/\*/g, '').trim();
            const col = effectiveColumns.find(c =>
                c.label.toLowerCase() === headerText ||
                c.key.toLowerCase() === headerText
            );
            if (col) colMap[colId] = col.key;
        });

        const rows: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rowData: any = {};
            let hasData = false;

            // First pass: try mapped columns from header
            Object.entries(colMap).forEach(([colId, key]) => {
                let val = row.getCell(Number(colId)).value;
                if (val && typeof val === 'object' && 'result' in val) val = val.result;
                if (val && typeof val === 'object' && 'text' in val) val = (val as any).text;
                rowData[key] = val !== null && val !== undefined ? String(val).trim() : '';
            });

            // Second pass: fill missing required columns by index as fallback
            effectiveColumns.forEach((col, idx) => {
                if (rowData[col.key] === undefined) {
                    let val = row.getCell(idx + 1).value;
                    if (val && typeof val === 'object' && 'result' in val) val = val.result;
                    if (val && typeof val === 'object' && 'text' in val) val = (val as any).text;
                    rowData[col.key] = val !== null && val !== undefined ? String(val).trim() : '';
                }
                if (rowData[col.key]) hasData = true;
            });

            if (hasData) rows.push(rowData);
        });

        return rows;
    };

    const parseCSV = async (file: File): Promise<any[]> => {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        const rows: any[] = [];

        const headerLine = lines[0].toLowerCase().replace(/\*/g, '').trim();
        const headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));

        const colMap: { [key: number]: string } = {};
        headers.forEach((h, idx) => {
            const col = effectiveColumns.find(c =>
                c.label.toLowerCase() === h ||
                c.key.toLowerCase() === h
            );
            if (col) colMap[idx] = col.key;
        });

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

            const rowData: any = {};
            let hasData = false;

            // Map by header
            Object.entries(colMap).forEach(([idx, key]) => {
                const val = cols[Number(idx)];
                rowData[key] = val !== undefined ? val : '';
            });

            // Index fallback
            effectiveColumns.forEach((col, idx) => {
                if (rowData[col.key] === undefined) {
                    const val = cols[idx];
                    rowData[col.key] = val !== undefined ? val : '';
                }
                if (rowData[col.key]) hasData = true;
            });

            if (hasData) rows.push(rowData);
        }
        return rows;
    };

    const handleUpload = async () => {
        if (!previewData || previewData.length === 0) return;

        setIsUploading(true);
        try {
            const result = await config.onImport(previewData);
            setUploadResults(result);
            if (result.errorCount === 0) {
                toast.success(`Successfully imported ${result.addedCount} records`);
                onSuccess();
                setTimeout(onClose, 2000);
            } else {
                toast.error(`Completed with ${result.errorCount} errors`);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to import data');
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');

        worksheet.columns = effectiveColumns.map(col => ({
            header: `${col.label}${col.required ? '*' : ''}`,
            key: col.key,
            width: col.width || 20
        }));

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Add sample rows if provided
        if (config.sampleRows && Array.isArray(config.sampleRows) && config.sampleRows.length > 0) {
            config.sampleRows.forEach(row => {
                worksheet.addRow(row);
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        a.download = `${config.templateName || config.title}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleEditRow = (index: number) => {
        setEditingRowIndex(index);
        setEditValues({ ...previewData[index] });
    };

    const handleSaveRow = () => {
        if (editingRowIndex === null) return;
        const newData = [...previewData];
        newData[editingRowIndex] = editValues;
        setPreviewData(newData);
        setEditingRowIndex(null);
        setEditValues(null);
        toast.success('Row updated');
    };

    const handleDeleteRow = (index: number) => {
        const confirmDelete = window.confirm("Are you sure you want to remove this record from the preview?");
        if (!confirmDelete) return;

        setPreviewData(prev => prev.filter((_, i) => i !== index));
        if (editingRowIndex === index) {
            setEditingRowIndex(null);
            setEditValues(null);
        }
        toast.success('Row removed');
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-slate-50 bg-slate-50/50 shrink-0">
                    <div className="min-w-0 pr-4">
                        <h2 className="text-base md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3 truncate">
                            <Upload className="w-5 h-5 md:w-6 md:h-6 text-blue-600 shrink-0" />
                            {config.title}
                        </h2>
                        <p className="text-[9px] md:text-xs font-bold text-blue-600/60 mt-0.5 md:mt-1 uppercase tracking-widest truncate">{config.description || `Bulk Import ${config.entityName || 'Records'}`}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-xl md:rounded-2xl transition-all group shrink-0">
                        <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-rose-500 group-hover:rotate-90 transition-all" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-8 space-y-4 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    {!file ? (
                        <div className="space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div
                                    className="p-6 md:p-10 bg-blue-50/50 rounded-2xl md:rounded-[32px] border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-center space-y-3 md:space-y-4 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="p-4 md:p-5 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">Select Data Source</h3>
                                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Upload .XLSX or .CSV file</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />
                                </div>
                                <div className="p-6 md:p-10 bg-emerald-50/50 rounded-2xl md:rounded-[32px] border-2 border-emerald-100 flex flex-col justify-center space-y-3 md:space-y-4">
                                    <h3 className="text-sm md:text-lg font-black text-emerald-800 flex items-center gap-2 uppercase tracking-tight">
                                        <Download size={18} className="md:w-6 md:h-6" />
                                        Template Guide
                                    </h3>
                                    <p className="text-[10px] md:text-xs font-bold text-emerald-600/70 uppercase tracking-widest leading-relaxed">
                                        Use our verified template structure to ensure seamless node synchronization. Fields with (*) are mandatory.
                                    </p>
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 bg-white text-emerald-600 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest border border-emerald-100 hover:bg-emerald-50 shadow-sm transition-all active:scale-95"
                                    >
                                        <FileSpreadsheet size={16} className="md:w-5 md:h-5" />
                                        Download Template
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl md:rounded-[24px] border border-slate-100 p-4 md:p-6 space-y-3 md:space-y-4 shadow-sm overflow-x-auto no-scrollbar">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Structure Protocols</p>
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                    {effectiveColumns.map(col => (
                                        <span key={col.key} className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${col.required ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                            {col.label}{col.required && '*'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* File Info */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-3 rounded-xl shadow-sm">
                                        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{file.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {(file.size / 1024).toFixed(1)} KB • {previewData?.length || 0} records detected
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setPreviewData([]); setUploadResults(null); }}
                                    className="px-6 py-2 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl uppercase tracking-widest transition-all"
                                >
                                    Choose Another
                                </button>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-slate-100 rounded-[24px] overflow-hidden shadow-sm bg-white">
                                <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-slate-900 text-white z-10">
                                            <tr>
                                                {effectiveColumns.map(col => (
                                                    <th key={col.key} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap min-w-[150px]">
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(previewData || []).slice(0, visibleRows).map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-blue-50/30 transition-colors group">
                                                    {effectiveColumns.map(col => (
                                                        <td key={col.key} className="px-6 py-4">
                                                            {editingRowIndex === rowIndex ? (
                                                                <input
                                                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                                    value={editValues[col.key]}
                                                                    onChange={(e) => setEditValues({ ...editValues, [col.key]: e.target.value })}
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                                                    {row[col.key] || <span className="text-[9px] font-black text-slate-300">Empty</span>}
                                                                </span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {editingRowIndex === rowIndex ? (
                                                                <button
                                                                    onClick={handleSaveRow}
                                                                    className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                                                >
                                                                    <Save size={14} />
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEditRow(rowIndex)}
                                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteRow(rowIndex)}
                                                                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {(previewData?.length || 0) > visibleRows && (
                                        <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-50">
                                            <button
                                                onClick={() => setVisibleRows(v => Math.min(v + 10, previewData?.length || 0))}
                                                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                                            >
                                                Load More Results
                                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                    +{Math.min(10, (previewData?.length || 0) - visibleRows)}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Results Summary */}
                            {uploadResults && (
                                <div className={`p-4 md:p-8 rounded-2xl md:rounded-[32px] border-2 animate-in slide-in-from-bottom-4 duration-500 ${uploadResults.errorCount === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
                                        <div className={`p-4 rounded-xl md:rounded-[20px] shrink-0 ${uploadResults.errorCount === 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white shadow-lg shadow-rose-200'}`}>
                                            {uploadResults.errorCount === 0 ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                                        </div>
                                        <div className="flex-1 space-y-4 w-full">
                                            <h4 className={`text-base md:text-xl font-black uppercase tracking-tight text-center sm:text-left ${uploadResults.errorCount === 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                                                {uploadResults.errorCount === 0 ? 'Synchronization Successful' : 'Synchronization Incomplete'}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl border border-white flex flex-col items-center sm:items-start">
                                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes Added</span>
                                                    <span className="text-xl md:text-2xl font-black text-slate-900">{uploadResults.addedCount}</span>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl border border-white flex flex-col items-center sm:items-start">
                                                    <span className="text-[9px] md:text-[10px] font-black text-rose-400 uppercase tracking-widest">Errors Found</span>
                                                    <span className="text-xl md:text-2xl font-black text-slate-900">{uploadResults.errorCount}</span>
                                                </div>
                                            </div>
                                            {uploadResults.errors && Array.isArray(uploadResults.errors) && uploadResults.errors.length > 0 && (
                                                <div className="mt-4 bg-white/40 rounded-xl md:rounded-2xl p-3 md:p-4 max-h-40 overflow-y-auto custom-scrollbar border border-white/50">
                                                    <p className="text-[9px] md:text-[10px] font-black text-rose-700 uppercase tracking-widest mb-3">Failure Logs</p>
                                                    <ul className="space-y-2">
                                                        {uploadResults.errors.map((err, i) => (
                                                            <li key={i} className="text-[10px] md:text-[11px] font-bold text-rose-800 flex items-center justify-between bg-white/60 p-2 rounded-lg gap-2">
                                                                <span className="shrink-0">Record #{i + 1}</span>
                                                                <span className="bg-rose-100 px-2 py-1 rounded-md text-[8px] md:text-[9px] font-black uppercase text-right">{err?.message || 'Validation Failed'}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 md:px-8 py-4 md:py-6 border-t border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white text-slate-600 font-black text-[9px] md:text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        {uploadResults ? 'Close Inventory' : 'Cancel Operation'}
                    </button>
                    {!uploadResults && file && (
                        <button
                            onClick={handleUpload}
                            disabled={isUploading || isParsing || previewData.length === 0}
                            className="w-full sm:w-auto px-6 md:px-12 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Synchronizing...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} className="md:w-5 md:h-5 group-hover:-translate-y-1 transition-transform" />
                                    Authorize {previewData?.length || 0} {config.entityName || 'Nodes'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GenericBulkImportModal;
