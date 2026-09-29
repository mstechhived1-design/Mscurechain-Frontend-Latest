'use client';

import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/integrations/api/apiClient';
import { toast } from 'react-hot-toast';
import {
    Upload, FileSpreadsheet, ChevronLeft, Download, CheckCircle2,
    AlertTriangle, SkipForward, X, FlaskConical, Building2, ArrowRight,
    Info, RefreshCw, ChevronDown, ChevronRight, Package, Beaker
} from 'lucide-react';

type ImportMode = 'tests' | 'departments';

interface PreviewRow {
    [key: string]: any;
}

interface GroupedTest {
    testCode: string;
    testName: string;
    price: number;
    departmentName: string;
    sampleType: string;
    subTests: {
        subTestName: string;
        subTestCode: string;
        unit: string;
        normalRange: string;
        resultType: string;
        mandatory: boolean;
    }[];
}

// ─── column header normaliser ───────────────────────────────────────────────
const TEST_COLUMNS: Record<string, string> = {
    testname: 'testName', 'test name': 'testName',
    price: 'price',
    unit: 'unit',
    sampletype: 'sampleType', 'sample type': 'sampleType',
    testcode: 'testCode', 'test code': 'testCode',
    shortname: 'shortName', 'short name': 'shortName',
    category: 'category',
    methodology: 'methodology', mentionto: 'methodology', method: 'methodology',
    turnaroundtime: 'turnaroundTime', 'turnaround time': 'turnaroundTime', tat: 'turnaroundTime',
    departmentname: 'departmentName', 'department name': 'departmentName', department: 'departmentName',
    fastingrequired: 'fastingRequired', fasting: 'fastingRequired',
    isactive: 'isActive',
    // New sub-test columns
    subtestcode: 'subTestCode', 'sub test code': 'subTestCode', 'subtest code': 'subTestCode',
    subtestname: 'subTestName', 'sub test name': 'subTestName', 'subtest name': 'subTestName',
    normalrange: 'normalRange', 'normal range': 'normalRange', range: 'normalRange',
    resulttype: 'resultType', 'result type': 'resultType',
    mandatory: 'mandatory', required: 'mandatory',
    displayorder: 'displayOrder', 'display order': 'displayOrder',
    criticallow: 'criticalLow', 'critical low': 'criticalLow',
    criticalhigh: 'criticalHigh', 'critical high': 'criticalHigh',
};

const DEPT_COLUMNS: Record<string, string> = {
    name: 'name',
    code: 'code',
    description: 'description',
    isactive: 'isActive',
};

function normaliseKey(raw: string, map: Record<string, string>): string {
    const lower = raw.trim().toLowerCase();
    return map[lower] || raw.trim();
}

function normaliseRow(row: Record<string, any>, map: Record<string, string>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
        if (/^(result_|Result_|label_|unit_|range_|type_|required_)/i.test(k)) {
            out[k] = v;
        } else {
            out[normaliseKey(k, map)] = v;
        }
    }
    return out;
}

// ─── Result type config ─────────────────────────────────────────────────────
const RESULT_TYPES = [
    { value: 'NUMBER', label: 'Number', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { value: 'TEXT', label: 'Text', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    { value: 'POSITIVE_NEGATIVE', label: '+/−', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { value: 'TRUE_FALSE', label: 'T/F', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    { value: 'DROPDOWN', label: 'Drop', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
    { value: 'MULTISELECT', label: 'Multi', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    { value: 'FORMULA', label: 'Fx', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
];

function getResultTypeBadge(type: string) {
    const found = RESULT_TYPES.find(r => r.value === type?.toUpperCase());
    if (!found) return { label: type || 'TEXT', color: 'bg-gray-100 text-gray-600' };
    return found;
}

// ─── download template helpers ──────────────────────────────────────────────
function downloadTestTemplate() {
    const headers = [
        'testCode', 'testName', 'shortName', 'departmentName', 'category',
        'sampleType', 'methodology', 'turnaroundTime', 'price',
        'fastingRequired', 'isActive',
        'subTestCode', 'subTestName', 'unit', 'normalRange',
        'criticalLow', 'criticalHigh', 'resultType', 'mandatory', 'displayOrder',
    ];
    const examples = [
        // CBC — 3 sub-tests
        ['CBC001', 'Complete Blood Count', 'CBC', 'Hematology', 'Hematology', 'Blood', 'Automated', '4 Hours', 500, 'FALSE', 'TRUE',
            'CBC001-HB', 'Haemoglobin', 'g/dL', '12-16', 10, 20, 'NUMBER', 'TRUE', 1],
        ['CBC001', '', '', '', '', '', '', '', '', '', '',
            'CBC001-WBC', 'WBC Count', 'cells/µL', '4500-11000', 3000, 15000, 'NUMBER', 'TRUE', 2],
        ['CBC001', '', '', '', '', '', '', '', '', '', '',
            'CBC001-PLT', 'Platelets', 'cells/µL', '150000-400000', 100000, 500000, 'NUMBER', 'TRUE', 3],
        ['CBC001', '', '', '', '', '', '', '', '', '', '',
            'CBC001-RBC', 'RBC Count', 'million/µL', '4.5-5.5', 3, 7, 'NUMBER', 'FALSE', 4],
        ['CBC001', '', '', '', '', '', '', '', '', '', '',
            'CBC001-HCT', 'Hematocrit', '%', '36-46', 25, 55, 'NUMBER', 'FALSE', 5],
        // LFT — 3 sub-tests
        ['LFT001', 'Liver Function Test', 'LFT', 'Biochemistry', 'Biochemistry', 'Blood', 'Enzymatic', '6 Hours', 800, 'TRUE', 'TRUE',
            'LFT001-SGPT', 'SGPT (ALT)', 'U/L', '7-56', 0, 100, 'NUMBER', 'TRUE', 1],
        ['LFT001', '', '', '', '', '', '', '', '', '', '',
            'LFT001-SGOT', 'SGOT (AST)', 'U/L', '10-40', 0, 80, 'NUMBER', 'TRUE', 2],
        ['LFT001', '', '', '', '', '', '', '', '', '', '',
            'LFT001-BIL', 'Total Bilirubin', 'mg/dL', '0.1-1.2', 0, 5, 'NUMBER', 'FALSE', 3],
        // Simple test — single row
        ['BS001', 'Blood Sugar (Fasting)', 'BSF', 'Biochemistry', 'Biochemistry', 'Blood', 'GOD-POD', '2 Hours', 200, 'TRUE', 'TRUE',
            'BS001-FBS', 'Fasting Blood Sugar', 'mg/dL', '70-100', 40, 400, 'NUMBER', 'TRUE', 1],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Lab_Tests_Enterprise');
    XLSX.writeFile(wb, 'lab_test_enterprise_template.xlsx');
}

function downloadLegacyTestTemplate() {
    const headers = [
        'testName', 'price', 'unit', 'sampleType', 'testCode', 'shortName',
        'category', 'methodology', 'turnaroundTime', 'departmentName',
        'fastingRequired', 'isActive',
        'Result_1', 'Result_1_Unit', 'Result_1_Range', 'Result_1_type', 'Result_1_Required',
        'Result_2', 'Result_2_Unit', 'Result_2_Range', 'Result_2_type', 'Result_2_Required',
        'Result_3', 'Result_3_Unit', 'Result_3_Range', 'Result_3_type', 'Result_3_Required',
    ];
    const example = [
        'Complete Blood Count', 400, 'mg/dL', 'Blood', 'CBC01', 'CBC',
        'Hematology', 'Automated', '17 Hours', 'Hematology',
        'FALSE', 'TRUE',
        'Hemoglobin', 'g/dL', '11.8-17.2', 'number', 'TRUE',
        'WBC Count', 'cells/µL', '4500-11000', 'number', 'FALSE',
        'Platelets', 'cells/µL', '150000-400000', 'number', 'FALSE',
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Lab_Test_Legacy');
    XLSX.writeFile(wb, 'lab_test_legacy_template.xlsx');
}

function downloadDeptTemplate() {
    const headers = ['Name', 'Code', 'Description', 'IsActive'];
    const examples = [
        ['Biochemistry', 'BIO01', 'Handles blood chemistry and metabolic panels', 'TRUE'],
        ['Hematology', 'HEM01', 'Handles blood cell counts and coagulation', 'TRUE'],
        ['Microbiology', 'MIC01', 'Deals with cultures and infectious diseases', 'TRUE'],
        ['Pathology', 'PAT01', 'General disease diagnosis through lab analysis', 'TRUE'],
        ['Immunology', 'IMM01', 'Handles immune system related testing', 'TRUE'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, 'lab_departments_template.xlsx');
}

// ─── Detect format ──────────────────────────────────────────────────────────
function detectFormat(rows: PreviewRow[]): 'enterprise' | 'legacy' {
    return rows.some(r =>
        (r.subTestName || r.SubTestName || r['sub test name'] || '').toString().trim() !== ''
    ) ? 'enterprise' : 'legacy';
}

// ─── Group rows by testCode ─────────────────────────────────────────────────
function groupByTestCode(rows: PreviewRow[]): GroupedTest[] {
    const map = new Map<string, GroupedTest>();
    const order: string[] = [];

    for (const row of rows) {
        const testCode = (row.testCode || '').toString().trim();
        if (!testCode) continue;

        if (!map.has(testCode)) {
            order.push(testCode);
            map.set(testCode, {
                testCode,
                testName: (row.testName || '').toString().trim(),
                price: parseFloat(row.price || '0') || 0,
                departmentName: (row.departmentName || '').toString().trim(),
                sampleType: (row.sampleType || '').toString().trim(),
                subTests: [],
            });
        }

        const subTestName = (row.subTestName || '').toString().trim();
        if (subTestName) {
            map.get(testCode)!.subTests.push({
                subTestName,
                subTestCode: (row.subTestCode || '').toString().trim(),
                unit: (row.unit || '').toString().trim(),
                normalRange: (row.normalRange || '').toString().trim(),
                resultType: (row.resultType || 'TEXT').toString().toUpperCase().trim(),
                mandatory: (row.mandatory || 'FALSE').toString().toUpperCase() === 'TRUE',
            });
        }
    }

    return order.map(k => map.get(k)!);
}


export default function BulkImportPage() {
    const router = useRouter();
    const [mode, setMode] = useState<ImportMode>('tests');
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const [previewCols, setPreviewCols] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(false);
    const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
    const [result, setResult] = useState<{
        created: number;
        updated?: number;
        skipped: number;
        subTestsCreated?: number;
        errors: string[];
    } | null>(null);

    const format = useMemo(() => (rows.length > 0 && mode === 'tests' ? detectFormat(rows) : null), [rows, mode]);
    const groupedTests = useMemo(() => (format === 'enterprise' ? groupByTestCode(rows) : []), [rows, format]);

    const toggleExpand = (testCode: string) => {
        setExpandedTests(prev => {
            const next = new Set(prev);
            if (next.has(testCode)) next.delete(testCode);
            else next.add(testCode);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedTests(new Set(groupedTests.map(g => g.testCode)));
    };
    const collapseAll = () => setExpandedTests(new Set());

    const processFile = (file: File) => {
        setResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

                const colMap = mode === 'tests' ? TEST_COLUMNS : DEPT_COLUMNS;
                const normalised = jsonRows.map(r => normaliseRow(r, colMap));
                setRows(normalised);

                const allKeys = Object.keys(normalised[0] || {});

                if (mode === 'tests') {
                    const detected = detectFormat(normalised);
                    if (detected === 'enterprise') {
                        setPreviewCols(['testCode', 'testName', 'subTestName', 'unit', 'normalRange', 'resultType']);
                        // Expand all by default
                        const codes = new Set<string>();
                        normalised.forEach(r => {
                            const code = (r.testCode || '').toString().trim();
                            if (code) codes.add(code);
                        });
                        setExpandedTests(codes);
                    } else {
                        const primaryKeys = ['testName', 'price', 'unit', 'sampleType', 'departmentName', 'methodology', 'turnaroundTime', 'isActive'];
                        const visibleKeys = primaryKeys.filter(k => allKeys.includes(k));
                        setPreviewCols(visibleKeys.length > 0 ? visibleKeys : allKeys.slice(0, 8));
                    }
                } else {
                    const primaryKeys = ['name', 'code', 'description', 'isActive'];
                    const visibleKeys = primaryKeys.filter(k => allKeys.includes(k));
                    setPreviewCols(visibleKeys.length > 0 ? visibleKeys : allKeys.slice(0, 8));
                }

                setFileName(file.name);
                toast.success(`Loaded ${normalised.length} rows from ${file.name}`);
            } catch (err) {
                toast.error('Failed to parse file. Make sure it is a valid .xlsx or .csv file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [mode]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleImport = async () => {
        if (rows.length === 0) { toast.error('No data to import'); return; }
        setImporting(true);
        const toastId = toast.loading(`Importing ${rows.length} ${mode}...`);
        try {
            let res: any;
            if (mode === 'tests') {
                res = await apiClient('/lab/tests/bulk', {
                    method: 'POST',
                    body: JSON.stringify({ tests: rows, forceUpdate }),
                });
            } else {
                res = await apiClient('/lab/departments/bulk', {
                    method: 'POST',
                    body: JSON.stringify({ departments: rows }),
                });
            }
            setResult(res);
            const parts: string[] = [];
            parts.push(`Created: ${res.created}`);
            if ((res.updated ?? 0) > 0) parts.push(`Updated: ${res.updated}`);
            parts.push(`Skipped: ${res.skipped}`);
            if ((res.subTestsCreated ?? 0) > 0) parts.push(`Sub-tests: ${res.subTestsCreated}`);
            if (res.debug) parts.push(`(Debug: forceUpdate=${res.debug.forceUpdate})`);
            toast.success(`Done! ${parts.join(', ')}`, { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Import failed', { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    const reset = () => {
        setRows([]);
        setFileName('');
        setResult(null);
        setPreviewCols([]);
        setExpandedTests(new Set());
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise Bulk Import</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Import lab tests with unlimited sub-tests, or departments</p>
                            </div>
                        </div>
                    </div>

                    {/* Download Templates */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button
                            onClick={downloadDeptTemplate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Dept Template
                        </button>
                        <button
                            onClick={downloadTestTemplate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Enterprise Template
                        </button>
                        <button
                            onClick={downloadLegacyTestTemplate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Legacy
                        </button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 mt-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => { setMode('departments'); reset(); }}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'departments'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Import Departments
                        </button>
                        <div className="hidden sm:flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                        <button
                            onClick={() => { setMode('tests'); reset(); }}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'tests'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <FlaskConical className="w-4 h-4" />
                            Import Lab Tests
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-bold w-full md:w-auto">
                        <Info className="w-4 h-4 shrink-0" />
                        Import departments first, then tests
                    </div>
                </div>

                {/* Force Update Toggle — only for tests */}
                {mode === 'tests' && (
                    <div className="mt-4 flex items-center gap-3">
                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all w-full sm:w-auto ${
                            forceUpdate
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                : 'bg-white dark:bg-gray-700/50 border-slate-200 dark:border-gray-700 hover:border-slate-300'
                        }`}>
                            <input
                                type="checkbox"
                                checked={forceUpdate}
                                onChange={e => setForceUpdate(e.target.checked)}
                                className="w-4 h-4 rounded accent-orange-500 shrink-0"
                            />
                            <div className="flex items-center gap-2">
                                <RefreshCw className={`w-4 h-4 shrink-0 ${forceUpdate ? 'text-orange-500' : 'text-gray-400'}`} />
                                <span className={`text-sm font-bold ${forceUpdate ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                    Force Update existing tests
                                </span>
                            </div>
                        </label>
                        {forceUpdate && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                                    Existing tests and sub-tests will be overwritten
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Column Guide */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">
                    {mode === 'departments' ? 'Departments Template Columns' : 'Enterprise Lab Tests Template'}
                </p>
                {mode === 'departments' ? (
                    <div className="flex flex-wrap gap-2">
                        {['Name *', 'Code', 'Description', 'IsActive (TRUE/FALSE)'].map(c => (
                            <span key={c} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-mono font-semibold text-blue-800 dark:text-blue-300">
                                {c}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Package className="w-3 h-3" /> Parent Test Columns
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {['testCode *', 'testName *', 'shortName', 'departmentName', 'category', 'sampleType', 'methodology', 'turnaroundTime', 'price *', 'fastingRequired', 'isActive'].map(c => (
                                    <span key={c} className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded text-[10px] font-mono font-semibold text-blue-800 dark:text-blue-300">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Beaker className="w-3 h-3" /> Sub-Test Columns (one row per sub-test)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {['subTestCode', 'subTestName *', 'unit', 'normalRange', 'criticalLow', 'criticalHigh', 'resultType', 'mandatory', 'displayOrder'].map(c => (
                                    <span key={c} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded text-[10px] font-mono font-semibold text-indigo-800 dark:text-indigo-300">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Result Types:</span>
                            {RESULT_TYPES.map(rt => (
                                <span key={rt.value} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rt.color}`}>
                                    {rt.value}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-blue-500 dark:text-blue-500 font-medium italic">
                            Same testCode on multiple rows → first row = parent test, all rows = sub-tests. Legacy Result_1/Result_2 format also supported.
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Zone */}
            {rows.length === 0 ? (
                <label
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full min-h-[240px] rounded-2xl border-2 border-dashed cursor-pointer transition-all
                        ${dragging
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                            : 'border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                        }`}
                >
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
                    <div className={`p-5 rounded-2xl mb-4 transition-all ${dragging ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-gray-700'}`}>
                        <Upload className={`w-10 h-10 transition-colors ${dragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">
                        Drop your Excel / CSV file here
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        or <span className="text-indigo-600 font-semibold">click to browse</span> — .xlsx, .xls, .csv supported
                    </p>
                    <p className="text-xs text-gray-400 mt-3 font-medium">
                        Download the template above ↑ and fill it in
                    </p>
                </label>
            ) : (
                <div className="space-y-4">
                    {/* File info bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:px-6 sm:py-4 shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 break-all">{fileName}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 font-medium">{rows.length} rows ready</p>
                                    {format && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            format === 'enterprise'
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                            {format === 'enterprise' ? `📦 ${groupedTests.length} parent tests` : '📋 Legacy format'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
                            >
                                {importing ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
                                ) : (
                                    <><Upload className="w-4 h-4" />Import {rows.length} Rows</>
                                )}
                            </button>
                            <button
                                onClick={reset}
                                className="p-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl border border-slate-200 dark:border-gray-700 transition-all shadow-sm"
                                title="Cancel Import"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Result banner */}
                    {result && (
                        <div className={`flex flex-wrap items-center gap-6 px-6 py-4 rounded-xl border text-sm font-semibold ${
                            result.errors.length > 0
                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            }`}>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Created: <strong>{result.created}</strong></span>
                            {(result.updated ?? 0) > 0 && (
                                <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Updated: <strong>{result.updated}</strong></span>
                            )}
                            <span className="flex items-center gap-1.5"><SkipForward className="w-4 h-4" /> Skipped: <strong>{result.skipped}</strong></span>
                            {(result.subTestsCreated ?? 0) > 0 && (
                                <span className="flex items-center gap-1.5"><Beaker className="w-4 h-4" /> Sub-tests: <strong>{result.subTestsCreated}</strong></span>
                            )}
                            {result.errors.length > 0 && (
                                <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Errors: <strong>{result.errors.length}</strong></span>
                            )}
                            {result.errors.length > 0 && (
                                <details className="w-full mt-2 text-xs">
                                    <summary className="cursor-pointer font-bold">Show error details</summary>
                                    <ul className="mt-2 space-y-1">
                                        {result.errors.map((e, i) => <li key={i} className="text-rose-600">• {e}</li>)}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}

                    {/* Preview — Enterprise Tree View */}
                    {format === 'enterprise' && groupedTests.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Parent → Sub-Test Preview</p>
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold">
                                        {groupedTests.length} tests · {groupedTests.reduce((s, g) => s + g.subTests.length, 0)} sub-tests
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={expandAll} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                        Expand All
                                    </button>
                                    <button onClick={collapseAll} className="text-[10px] font-bold text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Collapse
                                    </button>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-gray-700/50">
                                {groupedTests.map((group, gi) => {
                                    const isExpanded = expandedTests.has(group.testCode);
                                    return (
                                        <div key={group.testCode}>
                                            {/* Parent Test Row */}
                                            <button
                                                onClick={() => toggleExpand(group.testCode)}
                                                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors text-left"
                                            >
                                                <span className="text-xs text-gray-400 font-mono w-6 shrink-0">{gi + 1}</span>
                                                {isExpanded
                                                    ? <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />
                                                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                                }
                                                <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                                                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{group.testCode}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{group.testName}</span>
                                                {group.price > 0 && (
                                                    <span className="text-xs text-emerald-600 font-bold shrink-0">₹{group.price}</span>
                                                )}
                                                {group.departmentName && (
                                                    <span className="hidden sm:inline px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-medium text-gray-500 shrink-0">{group.departmentName}</span>
                                                )}
                                                <span className="ml-auto px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    {group.subTests.length} sub-test{group.subTests.length !== 1 ? 's' : ''}
                                                </span>
                                            </button>

                                            {/* Sub-Test Rows */}
                                            {isExpanded && (
                                                <div className="bg-slate-25 dark:bg-gray-800/50">
                                                    {group.subTests.map((sub, si) => {
                                                        const badge = getResultTypeBadge(sub.resultType);
                                                        const isLast = si === group.subTests.length - 1;
                                                        return (
                                                            <div
                                                                key={si}
                                                                className="flex items-center gap-3 pl-[72px] pr-5 py-2.5 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors border-l-2 border-indigo-200 dark:border-indigo-800 ml-[42px]"
                                                            >
                                                                <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0">{isLast ? '└─' : '├─'}</span>
                                                                <Beaker className="w-3 h-3 text-gray-400 shrink-0" />
                                                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate min-w-0">{sub.subTestName}</span>
                                                                {sub.unit && (
                                                                    <span className="text-[10px] text-gray-500 font-medium shrink-0">{sub.unit}</span>
                                                                )}
                                                                {sub.normalRange && (
                                                                    <span className="hidden sm:inline text-[10px] text-gray-400 font-mono shrink-0">[{sub.normalRange}]</span>
                                                                )}
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${badge.color}`}>
                                                                    {badge.label}
                                                                </span>
                                                                {sub.mandatory && (
                                                                    <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded text-[9px] font-bold shrink-0">REQ</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Preview — Legacy Table View */
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Preview (first 20 rows)</p>
                                <span className="text-xs text-gray-400 font-medium">{rows.length} total rows</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                            {previewCols.map(col => (
                                                <th key={col} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                        {rows.slice(0, 20).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                                                {previewCols.map(col => (
                                                    <td key={col} className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                                                        {row[col] !== undefined && row[col] !== '' ? String(row[col]) : <span className="text-gray-300">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {rows.length > 20 && (
                                    <div className="px-6 py-3 bg-slate-50 dark:bg-gray-900/30 border-t border-slate-100 dark:border-gray-700 text-xs text-gray-400 text-center font-medium">
                                        +{rows.length - 20} more rows not shown in preview
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
