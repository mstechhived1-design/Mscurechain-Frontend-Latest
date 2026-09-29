'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { TestParameter } from '@/lib/integrations/types/labTest';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { LabSample, SampleTestResult } from '@/lib/integrations/types/labSample';
// Dynamic result parameters - loaded from test configuration
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import LabReportTemplate from '@/components/lab/LabReportTemplate';
import { toast } from 'react-hot-toast';
import { LabSettingsService } from '@/lib/integrations/services/labSettings.service';
import { Download, ArrowLeft, Printer, FileText, Send, Edit3 } from 'lucide-react';
import { invalidateCachePattern } from '@/lib/integrations/api/apiClient';
import { API_CONFIG } from '@/lib/integrations/config/api-config';

export default function LabResultEntryPage() {
    const params = useParams() as any;
    const id = params?.id as string;
    const router = useRouter();

    const [sample, setSample] = useState<LabSample | null>(null);
    const [labInfo, setLabInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showReport, setShowReport] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form values from existing data (Moved Hook to Top Level)
    const [formValues, setFormValues] = useState<Record<number, Record<string, string>>>({});

    const isCompleted = sample?.status?.toLowerCase() === 'completed';
    const printRef = useRef<HTMLDivElement>(null);

    // Sync form values when sample data is loaded
    useEffect(() => {
        if (sample && sample.tests) {
            const initial: Record<number, Record<string, string>> = {};
            sample.tests.forEach((test, idx) => {
                // Use dynamic resultParameters from test configuration
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                initial[idx] = {};

                if (resultParams && resultParams.length > 0) {
                    resultParams.forEach((param: any) => {
                        // Find existing result in subtests
                        const existing = test.subTests?.find(st => st.name === param.label);
                        if (existing) {
                            initial[idx][param.label] = existing.result || '';
                        }
                    });
                } else {
                    // Fallback for single-value tests
                    initial[idx]['main_result'] = test.resultValue || '';
                }
            });

            // Merge with local draft if exists
            if (typeof window !== 'undefined' && id) {
                const draft = localStorage.getItem(`curechain_lab_result_entry_draft_${id}`);
                if (draft) {
                    try {
                        const parsed = JSON.parse(draft);
                        Object.keys(parsed).forEach(testIdx => {
                            const tIdx = Number(testIdx);
                            if (initial[tIdx]) {
                                initial[tIdx] = { ...initial[tIdx], ...parsed[testIdx] };
                            }
                        });
                    } catch (e) {
                        console.error("Error parsing results entry draft:", e);
                    }
                }
            }

            setFormValues(initial);
        }
    }, [sample, id]);

    useEffect(() => {
        if (typeof window === 'undefined' || !id) return;
        if (Object.keys(formValues).length > 0) {
            localStorage.setItem(`curechain_lab_result_entry_draft_${id}`, JSON.stringify(formValues));
        }
    }, [formValues, id]);

    // Memoized print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Lab_Report_${sample?.sampleId || 'Unknown'}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 10mm;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    background: #fff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body > * { visibility: visible !important; }
                * { visibility: visible !important; box-sizing: border-box !important; }

                .print-content {
                    display: block !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    position: static !important;
                    overflow: visible !important;
                    background: #fff !important;
                }

                .report-body {
                    display: block !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                    position: static !important;
                    overflow: visible !important;
                }

                .lab-print-footer {
                    display: block !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                .lab-patient-grid {
                    display: table !important;
                    width: 100% !important;
                    table-layout: fixed !important;
                    margin: 16px 0 !important;
                    font-size: 12px !important;
                }
                .lab-patient-grid > div {
                    display: table-cell !important;
                    width: 50% !important;
                    vertical-align: top !important;
                }

                .lab-test-title {
                    font-size: 18px !important;
                    text-align: center !important;
                    border-bottom: 2px solid #ddd !important;
                    padding-bottom: 5px !important;
                    margin: 16px 0 10px !important;
                }

                .lab-test-table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    font-size: 12px !important;
                }
                .lab-test-table th, .lab-test-table td {
                    border: 1px solid #d0d0d0 !important;
                    padding: 7px 10px !important;
                    text-align: left !important;
                    vertical-align: top !important;
                    word-wrap: break-word !important;
                }
                .lab-test-table th {
                    background: rgba(242,246,251,0.8) !important;
                    font-weight: 600 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .lab-test-table th:nth-child(1), .lab-test-table td:nth-child(1) { width: 40% !important; }
                .lab-test-table th:nth-child(2), .lab-test-table td:nth-child(2) { width: 35% !important; }
                .lab-test-table th:nth-child(3), .lab-test-table td:nth-child(3) { width: 25% !important; }

                .test-section {
                    page-break-inside: avoid !important;
                    margin-bottom: 24px !important;
                }

                table { page-break-inside: auto !important; }
                tr    { page-break-inside: avoid !important; page-break-after: auto !important; }
                thead { display: table-header-group !important; }
                tfoot { display: table-footer-group !important; }
                thead tr * {
                    position: static !important;
                    z-index: auto !important;
                    transform: none !important;
                }
            }
        `,
    });

    const handleDownload = async () => {
        const element = printRef.current;
        if (!element) {
            toast.error('Report element not found');
            return;
        }

        const toastId = toast.loading('Generating PDF...');
        try {
            // ── Dimensions ──────────────────────────────────────────────────
            // Print uses @page { margin: 8mm }
            //   → A4 printable area = 210 - 16 = 194mm wide, 297 - 16 = 281mm tall
            // At 96dpi: 1mm = 3.7795px
            // 194mm × 3.7795 ≈ 733px   ← capture width
            // 281mm × 3.7795 ≈ 1063px  ← minimum height (1 full page)
            // ────────────────────────────────────────────────────────────────
            const PX_PER_MM = 3.7795;
            const CONTENT_W_PX = Math.round(194 * PX_PER_MM); // 733px
            const MIN_H_PX    = Math.round(281 * PX_PER_MM);  // 1063px

            // The SAME CSS rules used in useReactToPrint pageStyle
            // (no @media print wrapper — canvas runs in screen mode)
            const CAPTURE_CSS = `
                * { box-sizing: border-box !important; font-family: "Segoe UI", Arial, sans-serif !important; }

                .print-content {
                    display: flex !important;
                    flex-direction: column !important;
                    width: ${CONTENT_W_PX}px !important;
                    max-width: ${CONTENT_W_PX}px !important;
                    min-height: ${MIN_H_PX}px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 3px solid #000 !important;
                    box-sizing: border-box !important;
                    position: relative !important;
                    overflow: visible !important;
                    background: #fff !important;
                    color: #000 !important;
                }

                .report-body {
                    flex: 1 1 auto !important;
                    padding: 16px 20px !important;
                    box-sizing: border-box !important;
                    position: relative !important;
                    overflow: visible !important;
                }

                .lab-print-footer {
                    flex-shrink: 0 !important;
                    margin-top: auto !important;
                    position: relative !important;
                    bottom: auto !important;
                    left: auto !important;
                    right: auto !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                .lab-patient-grid {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 15px !important;
                    margin: 16px 0 !important;
                    font-size: 12px !important;
                    width: 100% !important;
                }

                .lab-test-title {
                    font-size: 18px !important;
                    text-align: center !important;
                    border-bottom: 2px solid #ddd !important;
                    padding-bottom: 5px !important;
                    margin: 16px 0 10px !important;
                }

                .lab-test-table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    font-size: 12px !important;
                }
                .lab-test-table th, .lab-test-table td {
                    border: 1px solid #d0d0d0 !important;
                    padding: 7px 10px !important;
                    text-align: left !important;
                    vertical-align: top !important;
                    word-wrap: break-word !important;
                }
                .lab-test-table th {
                    background: rgba(242,246,251,0.8) !important;
                    font-weight: 600 !important;
                }
                .lab-test-table th:nth-child(1), .lab-test-table td:nth-child(1) { width: 40% !important; }
                .lab-test-table th:nth-child(2), .lab-test-table td:nth-child(2) { width: 35% !important; }
                .lab-test-table th:nth-child(3), .lab-test-table td:nth-child(3) { width: 25% !important; }

                .test-section { margin-bottom: 24px !important; }

                table { page-break-inside: auto; width: 100% !important; }
                tr    { page-break-inside: avoid; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            `;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 15000,
                scrollX: 0,
                scrollY: 0,
                windowWidth: CONTENT_W_PX,
                onclone: (_clonedDoc: Document, clonedElement: HTMLElement) => {
                    // 1. Remove Tailwind / global CSS with lab()/oklch() colors
                    _clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
                    _clonedDoc.querySelectorAll('head style, body > style').forEach(el => {
                        if (el.textContent?.includes('lab(') || el.textContent?.includes('oklch(')) {
                            el.remove();
                        }
                    });

                    // 2. Inject the same CSS rules as useReactToPrint pageStyle
                    const styleEl = _clonedDoc.createElement('style');
                    styleEl.textContent = CAPTURE_CSS;
                    _clonedDoc.head.appendChild(styleEl);

                    // 3. Constrain outer wrapper to content width (no extra whitespace)
                    clonedElement.style.cssText = `
                        width: ${CONTENT_W_PX}px !important;
                        max-width: ${CONTENT_W_PX}px !important;
                        min-width: ${CONTENT_W_PX}px !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        overflow: visible !important;
                        height: auto !important;
                    `;
                }
            });

            // ── Build PDF — margin:8mm matches print's @page{margin:8mm} ──
            const pdf = new jsPDF('p', 'mm', 'a4');
            const PAGE_W = pdf.internal.pageSize.getWidth();   // 210mm
            const PAGE_H = pdf.internal.pageSize.getHeight();  // 297mm
            const MARGIN = 8; // mm — same as @page margin

            const usableW = PAGE_W - MARGIN * 2; // 194mm
            const usableH = PAGE_H - MARGIN * 2; // 281mm

            // canvas.width = CONTENT_W_PX * scale = 733 * 2 = 1466px → fits 194mm
            const pxPerMm = canvas.width / usableW;
            const totalImgH = canvas.height / pxPerMm;
            // Subtract 1mm to prevent rounding overflow from creating a blank second page
            const totalPages = Math.max(1, Math.ceil((totalImgH - 1) / usableH));

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) pdf.addPage();

                const srcY = Math.round(page * usableH * pxPerMm);
                const srcH = Math.min(Math.round(usableH * pxPerMm), canvas.height - srcY);
                if (srcH <= 0) break;

                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = srcH;
                const ctx = pageCanvas.getContext('2d')!;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

                const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN, usableW, srcH / pxPerMm);
            }

            pdf.save(`Lab_Report_${sample?.sampleId || 'download'}.pdf`);
            toast.success('PDF Downloaded Successfully!', { id: toastId });

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF. Please try again.', { id: toastId });
        }
    };

    const handleNotifyDoctor = async () => {
        if (!sample || !sample._id) {
            toast.error('Sample information not available');
            return;
        }

        const toastId = toast.loading('Notifying doctor...');
        try {
            const data = await LabSampleService.notifyDoctor(sample._id);
            toast.success('Doctor notified successfully! 📧', { id: toastId });
        } catch (error: any) {
            console.error('Notify doctor error:', error);
            toast.error(error.message || 'Failed to send notification', { id: toastId });
        }
    };

    useEffect(() => {
        if (id) {
            // Parallel data fetching for better performance
            Promise.all([fetchSample(), fetchLabInfo()]);
        }
    }, [id]);

    const fetchLabInfo = async () => {
        try {
            const settings = await LabSettingsService.getSettings();
            if (settings) setLabInfo(settings);
        } catch (error) {
            console.error('Failed to load lab settings', error);
        }
    };

    const fetchSample = async (skipCache = false) => {
        setLoading(true);
        try {
            const data = await LabSampleService.getSampleById(id, skipCache);
            setSample(data);

            if (data.status?.toLowerCase() === 'completed') {
                setShowReport(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load sample details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (testIndex: number, key: string, value: string) => {
        setFormValues(prev => ({
            ...prev,
            [testIndex]: {
                ...prev[testIndex],
                [key]: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!sample) return;
        setSubmitting(true);
        const toastId = toast.loading('Saving results...');

        try {
            // Reconstruct the tests array with new values
            const updatedTests = sample.tests.map((test, idx) => {
                // Use dynamic resultParameters from test
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                const values = formValues[idx] || {};

                if (resultParams && resultParams.length > 0) {
                    // Map result params to subtests
                    const subTests = resultParams.map((param: any) => ({
                        name: param.label,
                        result: values[param.label] || '',
                        unit: param.unit || '',
                        range: param.normalRange || ''
                    }));

                    return {
                        ...test,
                        subTests: subTests,
                        resultValue: values['main_result'],
                        remarks: values['remarks'],
                        status: 'Completed' as const
                    };
                } else {
                    // Single value update
                    return {
                        ...test,
                        resultValue: values['main_result'],
                        remarks: values['remarks'],
                        status: 'Completed' as const
                    };
                }
            });

            // Check if all tests are completed
            const payload = {
                tests: updatedTests,
                status: 'Completed',
                reportDate: new Date().toISOString()
            };

            await LabSampleService.updateResults(sample._id, payload);

            if (typeof window !== 'undefined' && id) {
                localStorage.removeItem(`curechain_lab_result_entry_draft_${id}`);
            }

            invalidateCachePattern('/lab/dashboard-stats');
            window.dispatchEvent(new Event('refresh-lab-data'));

            toast.success('Results saved successfully!', { id: toastId });
            await fetchSample(true);
            setSubmitting(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save results', { id: toastId });
            setSubmitting(false);
        }
    };

    // Conditional Renders (Must come after all hooks)
    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 animate-pulse">Loading report...</p>
        </div>
    );

    if (!sample) return <div className="p-20 text-center text-rose-500 font-semibold">Sample Not Found</div>;

    if (showReport && isCompleted) {
        return (
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-12 px-2 sm:px-4 md:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1">
                            <button
                                onClick={() => router.push('/lab/samples')}
                                className="p-2 sm:p-2.5 bg-slate-100 dark:bg-gray-700 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div className="p-2 sm:p-2.5 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 dark:shadow-none shrink-0 hidden xs:flex">
                                <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xs sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">Lab Report</h1>
                                <p className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">Sample ID: {sample.sampleId}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setShowReport(false)}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Edit Results
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold text-[10px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                            >
                                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Print
                            </button>
                            {/* <button
                                onClick={handleDownload}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Download Report
                            </button> */}
                            {/* Show Send to Doctor for doctor-referred tests */}
                            {(sample.referredBy || !sample.isWalkIn) && (
                                <button
                                    onClick={handleNotifyDoctor}
                                    className="col-span-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95"
                                >
                                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Notify Doctor
                                </button>
                            )}
                            <button
                                onClick={() => router.push('/lab/samples')}
                                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-[10px] sm:text-xs md:text-sm hover:bg-slate-200 dark:hover:bg-gray-600 transition-all active:scale-95 border border-slate-200 dark:border-gray-600 flex items-center justify-center gap-1.5 sm:gap-2 ${!(sample.referredBy || !sample.isWalkIn) ? 'col-span-1' : ''}`}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 p-2 sm:p-4 md:p-8 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="w-full">
                        <LabReportTemplate ref={printRef} sample={sample} labInfo={labInfo} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-8 pb-12 px-2 sm:px-4 md:px-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">Result Entry</h1>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">Sample #{sample.sampleId} • {sample.patientDetails.name}</p>
                </div>
            </div>

            {sample.tests.map((test, idx) => {
                // Use dynamic resultParameters from test configuration
                const testData = (test as any);
                const resultParams = testData.resultParameters || [];
                const hasParams = resultParams && resultParams.length > 0;

                return (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="w-1 h-5 sm:w-1.5 sm:h-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{test.testName}</h2>
                        </div>

                        {hasParams ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 lg:gap-x-8 gap-y-4 lg:gap-y-8">
                                {resultParams.map((param: any, paramIdx: number) => (
                                    <div key={paramIdx} className={`${param.fieldType === 'textarea' ? 'md:col-span-2' : ''}`}>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            {param.label} {param.unit && <span className="text-gray-400 normal-case">({param.unit})</span>}
                                            {param.isRequired && <span className="text-rose-500 ml-1">*</span>}
                                        </label>
                                        {param.normalRange && (
                                            <p className="text-xs text-gray-400 mb-1">Range: {param.normalRange}</p>
                                        )}
                                        {param.example && (
                                            <p className="text-xs text-indigo-500 mb-1">Example: {param.example}</p>
                                        )}

                                        <div className="relative">
                                            {param.fieldType === 'boolean' ? (
                                                <select
                                                    value={formValues[idx]?.[param.label] || ''}
                                                    onChange={(e) => handleInputChange(idx, param.label, e.target.value)}
                                                    required={param.isRequired}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 dark:text-white cursor-pointer"
                                                >
                                                    <option value="">Select result...</option>
                                                    <option value="Negative">Negative</option>
                                                    <option value="Positive">Positive</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    inputMode={param.fieldType === 'number' ? 'text' : undefined}
                                                    value={formValues[idx]?.[param.label] || ''}
                                                    onChange={(e) => handleInputChange(idx, param.label, e.target.value)}
                                                    placeholder={param.example || `Enter ${param.label}`}
                                                    required={param.isRequired}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                                                />
                                            )}
                                            {param.unit && param.fieldType !== 'boolean' && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                                    {param.unit}
                                                </span>
                                            )}
                                        </div>
                                        {param.remarks && (
                                            <p className="text-xs text-gray-500 mt-1 italic">{param.remarks}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 sm:py-12 px-4 sm:px-6 bg-slate-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-gray-700">
                                <div className="mb-3">
                                    <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Subtests Configured</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    This test doesn't have any subtests configured.
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Please edit the test in Test Master and add subtests using the "Subtests" section.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Overall Remarks (Optional)
                            </label>
                            <textarea
                                value={formValues[idx]?.['remarks'] || ''}
                                onChange={(e) => handleInputChange(idx, 'remarks', e.target.value)}
                                placeholder="Any additional observations..."
                                rows={3}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-none ring-1 ring-gray-100 dark:ring-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm resize-none"
                            />
                        </div>
                    </div>
                );
            })}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting Report...
                        </>
                    ) : (
                        'Report Submission'
                    )}
                </button>

                {/* Only show Send to Doctor if: 1) has doctor, 2) results submitted */}
                {(sample.referredBy || !sample.isWalkIn) && (sample.status?.toLowerCase() === 'completed' || sample.status?.toLowerCase() === 'processing') && (
                    <button
                        onClick={handleNotifyDoctor}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2"
                    >
                        <Send size={16} className="sm:w-5 sm:h-5" />
                        Notify Doctor
                    </button>
                )}
            </div>
        </div>
    );
}
