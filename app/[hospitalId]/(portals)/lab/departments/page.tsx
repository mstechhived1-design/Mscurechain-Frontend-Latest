'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Search, Building2, Edit3, X, FlaskConical, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, SkipForward, Info } from 'lucide-react';
import { DepartmentService } from '@/lib/integrations/services/department.service';
import { Department } from '@/lib/integrations/types/department';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { apiClient } from '@/lib/integrations/api/apiClient';

// ─── helpers ─────────────────────────────────────────────────────────────────
function downloadDeptTemplate() {
    const headers = ['Name', 'Code', 'Description', 'IsActive'];
    const examples = [
        ['Biochemistry', 'BIO01', 'Handles blood chemistry and metabolic panels', 'TRUE'],
        ['Hematology', 'HEM01', 'Handles blood cell counts and coagulation', 'TRUE'],
        ['Microbiology', 'MIC01', 'Deals with cultures and infectious diseases', 'TRUE'],
        ['Pathology', 'PAT01', 'General disease diagnosis through lab analysis', 'TRUE'],
        ['Immunology', 'IMM01', 'Handles immune system related testing', 'TRUE'],
        ['Serology', 'SER01', 'Tests for antibodies and antigens in blood', 'TRUE'],
        ['Molecular Diagnostics', 'MOL01', 'Performs DNA and RNA based diagnostic tools', 'TRUE'],
        ['Cytology', 'CYT01', 'Studies cells for disease diagnosis', 'TRUE'],
        ['Histopathology', 'HIS01', 'Examines tissue under microscope', 'TRUE'],
        ['Clinical Chemistry', 'CHE01', 'Analyses chemical components of blood', 'TRUE'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = headers.map(() => ({ wch: 26 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, 'lab_departments_template.xlsx');
}

// ─── component ───────────────────────────────────────────────────────────────
function DepartmentMasterPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [suggestedDepts, setSuggestedDepts] = useState<string[]>([]);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Draft persistence
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const draft = localStorage.getItem('curechain_lab_departments_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                if (parsed.name || parsed.description) {
                    setFormData(parsed);
                }
            } catch (e) {
                console.error("Error loading department draft:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('curechain_lab_departments_draft', JSON.stringify(formData));
    }, [formData]);

    // Bulk import state
    const [showBulk, setShowBulk] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [bulkFileName, setBulkFileName] = useState('');
    const [bulkRows, setBulkRows] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [deptData, meta] = await Promise.all([
                DepartmentService.getDepartments(),
                DepartmentService.getMeta()
            ]);
            setDepartments(deptData);
            if (meta?.departmentNames) {
                setSuggestedDepts(meta.departmentNames);
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await DepartmentService.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        setLoading(true);
        try {
            if (editingId) {
                await DepartmentService.updateDepartment(editingId, formData);
                toast.success("Department updated successfully!");
            } else {
                await DepartmentService.addDepartment(formData);
                toast.success("Department created successfully!");
            }
            setFormData({ name: '', description: '' });
            if (typeof window !== 'undefined') {
                localStorage.removeItem('curechain_lab_departments_draft');
            }
            setEditingId(null);
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this department? Active tests in this department might be affected.")) return;
        try {
            await DepartmentService.deleteDepartment(id);
            toast.success("Department deleted successfully");
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete department");
        }
    };

    // ── bulk file processing ──────────────────────────────────────────────────
    const processFile = useCallback((file: File) => {
        setImportResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
                // Normalise keys
                const normalised = rows.map(row => {
                    const out: any = {};
                    for (const [k, v] of Object.entries(row)) {
                        const lk = k.trim().toLowerCase();
                        if (lk === 'name') out.name = v;
                        else if (lk === 'code') out.code = v;
                        else if (lk === 'description') out.description = v;
                        else if (lk === 'isactive') out.isActive = String(v).toUpperCase() !== 'FALSE';
                        else out[k] = v;
                    }
                    return out;
                });
                setBulkRows(normalised);
                setBulkFileName(file.name);
                toast.success(`Loaded ${normalised.length} rows from ${file.name}`);
            } catch {
                toast.error('Failed to parse file. Use .xlsx or .csv.');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleBulkImport = async () => {
        if (bulkRows.length === 0) { toast.error('No data to import'); return; }
        setImporting(true);
        const toastId = toast.loading(`Importing ${bulkRows.length} departments...`);
        try {
            const res: any = await apiClient('/lab/departments/bulk', {
                method: 'POST',
                body: JSON.stringify({ departments: bulkRows }),
            });
            setImportResult(res);
            toast.success(`Done! Created: ${res.created}, Skipped: ${res.skipped}`, { id: toastId });
            fetchDepartments(); // refresh list
        } catch (err: any) {
            toast.error(err.message || 'Import failed', { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    const resetBulk = () => {
        setBulkRows([]);
        setBulkFileName('');
        setImportResult(null);
    };

    // ── derived ───────────────────────────────────────────────────────────────
    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const totalTests = departments.reduce((sum, dept) => sum + (dept.testCount || 0), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-700">

            {/* ── Header ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight">Laboratory Divisions</h1>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Manage department configurations and test mappings</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-gray-700/50 rounded-lg border border-slate-100 dark:border-gray-600 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total Units:</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{departments.length}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Active Tests:</p>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{totalTests}</p>
                        </div>

                        {/* Bulk Import toggle */}
                        <button
                            onClick={() => { setShowBulk(v => !v); resetBulk(); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm ${showBulk
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100 dark:shadow-none'
                                : 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Bulk Import
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Bulk Import Panel ── */}
            {showBulk && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                            <div>
                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Bulk Import Departments</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400">Upload an Excel / CSV file to import multiple departments at once</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={downloadDeptTemplate}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Template
                            </button>
                            <button onClick={() => { setShowBulk(false); resetBulk(); }} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-white/60 dark:hover:bg-gray-700 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Column guide */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold"><Info className="w-3.5 h-3.5" /> Required columns:</span>
                            {['Name *', 'Code', 'Description', 'IsActive (TRUE/FALSE)'].map(c => (
                                <span key={c} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono font-semibold text-blue-800 dark:text-blue-300">{c}</span>
                            ))}
                        </div>

                        {bulkRows.length === 0 ? (
                            /* Drop Zone */
                            <label
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-slate-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10'
                                    }`}
                            >
                                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
                                <Upload className={`w-8 h-8 mb-3 transition-colors ${dragging ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Drop your file here or <span className="text-emerald-600">click to browse</span></p>
                                <p className="text-xs text-gray-400">.xlsx, .xls, .csv accepted</p>
                            </label>
                        ) : (
                            <div className="space-y-4">
                                {/* File info + action bar */}
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-900/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{bulkFileName}</p>
                                            <p className="text-xs text-gray-500">{bulkRows.length} rows ready</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleBulkImport}
                                            disabled={importing}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                                        >
                                            {importing ? (
                                                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
                                            ) : (
                                                <><Upload className="w-3.5 h-3.5" />Import {bulkRows.length} Departments</>
                                            )}
                                        </button>
                                        <button onClick={resetBulk} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg border border-slate-200 dark:border-gray-700 transition-all">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Result banner */}
                                {importResult && (
                                    <div className={`flex flex-wrap items-center gap-5 px-5 py-3 rounded-xl border text-sm font-semibold ${importResult.errors.length > 0
                                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                        : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                        }`}>
                                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Created: <strong>{importResult.created}</strong></span>
                                        <span className="flex items-center gap-1.5"><SkipForward className="w-4 h-4" /> Skipped: <strong>{importResult.skipped}</strong></span>
                                        {importResult.errors.length > 0 && (
                                            <details className="w-full mt-1 text-xs">
                                                <summary className="cursor-pointer font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {importResult.errors.length} errors — click to expand</summary>
                                                <ul className="mt-2 space-y-1">
                                                    {importResult.errors.map((e, i) => <li key={i} className="text-rose-600">• {e}</li>)}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                )}

                                {/* Preview table */}
                                <div className="rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/40 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Preview (first 15 rows)</span>
                                        <span className="text-xs text-gray-400">{bulkRows.length} total</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-gray-900/30">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                                    {['name', 'code', 'description', 'isActive'].map(col => (
                                                        <th key={col} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                                {bulkRows.slice(0, 15).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors">
                                                        <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                                                        {['name', 'code', 'description', 'isActive'].map(col => (
                                                            <td key={col} className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                                                {row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {bulkRows.length > 15 && (
                                            <div className="px-4 py-2 bg-slate-50 dark:bg-gray-900/30 border-t border-slate-100 dark:border-gray-700 text-center text-xs text-gray-400">
                                                +{bulkRows.length - 15} more rows not shown
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm sticky top-24">
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                {editingId ? 'Edit Division' : 'Add New Division'}
                            </h2>
                            <span className="px-2 py-1 bg-slate-100 dark:bg-gray-700 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-md">
                                {editingId ? 'Updating' : 'Creating'}
                            </span>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddDepartment} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Division Name <span className="text-rose-500">*</span></label>
                                    {suggestedDepts.length > 0 && !editingId && (
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all mb-3"
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            value={formData.name}
                                        >
                                            <option value="">Select a template...</option>
                                            {suggestedDepts.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="e.g. Hematology, Biochemistry..."
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        placeholder="Brief description of the department's function..."
                                        rows={4}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setFormData({ name: '', description: '' }); }}
                                            className="flex-1 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            editingId ? 'Save Changes' : 'Create Division'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Explorer Panel */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[600px]">
                        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Department List</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {filteredDepartments.length} active departments found
                                </p>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search departments..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            {filteredDepartments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <Building2 className="w-5 h-5 text-indigo-100 shrink-0" />
                                    </div>
                                    <h3 className="text-gray-900 dark:text-white font-medium mb-1">No departments found</h3>
                                    <p className="text-sm text-gray-500 max-w-xs">
                                        Add a department manually or use <strong>Bulk Import</strong> to upload many at once.
                                    </p>
                                    <button
                                        onClick={() => setShowBulk(true)}
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" /> Open Bulk Import
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Department</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Tests</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                            {filteredDepartments.map((dept) => (
                                                <tr
                                                    key={dept._id}
                                                    className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors cursor-pointer group"
                                                    onClick={() => setSelectedDepartment(dept)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                                                                {dept.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
                                                                {dept.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 max-w-md">
                                                            {dept.description || 'No description provided'}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                            {dept.testCount || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Active
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingId(dept._id); setFormData({ name: dept.name, description: dept.description || '' }); }}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(dept._id); }}
                                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Department Detail Modal ── */}
            {selectedDepartment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedDepartment(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-gray-700 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md">
                                    {selectedDepartment.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDepartment.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Department Details</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDepartment(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="mb-8">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">About Division</h4>
                                <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {selectedDepartment.description || 'No detailed description available for this department.'}
                                </div>
                            </div>

                            {selectedDepartment.tests && selectedDepartment.tests.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Associated Tests</h4>
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">{selectedDepartment.tests.length} Total</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedDepartment.tests.map((test: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-gray-400 w-5">{String(i + 1).padStart(2, '0')}</span>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{test.testName}</span>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600">₹{test.price.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-xl">
                                    <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No tests assigned to this department yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 text-center rounded-b-2xl">
                            <p className="text-xs text-gray-400 font-mono">ID: {selectedDepartment._id}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(DepartmentMasterPage);
