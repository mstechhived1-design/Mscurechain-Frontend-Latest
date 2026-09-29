"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    Pill,
    ClipboardList,
    Utensils,
    Download,
    FileText,
    FileSpreadsheet,
    Search,
    User,
    ChevronDown,
    Clock,
    AlertCircle,
    Stethoscope,
    Thermometer,
    HeartPulse,
    Droplets,
    X,
    Printer,
    FlaskConical
} from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { Card } from '@/components/admin';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { generateNurseHourlyRecordHtml } from '@/lib/utils/nurse-print-vitals';

export default function NurseHourlyRecordClient() {
    const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printHtml, setPrintHtml] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Active Admissions
    const { data: admissions, isLoading: loadingAdmissions } = useQuery({
        queryKey: ['active-admissions'],
        queryFn: () => hospitalAdminService.getActiveAdmissions()
    });

    // 2. Fetch Hourly Monitoring Data
    const { data: hourlyData, isLoading: loadingData, refetch } = useQuery({
        queryKey: ['hourly-monitoring', selectedAdmissionId],
        queryFn: () => hospitalAdminService.getPatientHourlyRecord(selectedAdmissionId),
        enabled: !!selectedAdmissionId
    });

    // 3. Fetch Hospital Config (for printing)
    const { data: hospitalData } = useQuery({
        queryKey: ['hospital-config'],
        queryFn: () => hospitalAdminService.getHospital()
    });

    // 4. Click Outside Logic
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredAdmissions = useMemo(() => {
        if (!admissions) return [];
        return admissions.filter((adm: any) =>
            adm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.admissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adm.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [admissions, searchTerm]);

    const handlePrint = () => {
        if (!hourlyData?.data) return;
        const html = generateNurseHourlyRecordHtml({
            ...hourlyData.data,
            hospital: hospitalData?.hospital,
            returnUrl: window.location.pathname + (selectedAdmissionId ? `?admissionId=${selectedAdmissionId}` : '')
        });
        setPrintHtml(html);
        setShowPrintModal(true);
    };

    const handleExcelExport = async () => {
        if (!hourlyData?.data) return;

        const { admission, vitals, meds, diet, labOrders } = hourlyData.data;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Hourly Monitoring');

        // Column Config
        worksheet.columns = [
            { key: 'A', width: 20 },
            { key: 'B', width: 25 },
            { key: 'C', width: 15 },
            { key: 'D', width: 20 },
            { key: 'E', width: 25 },
            { key: 'F', width: 15 },
            { key: 'G', width: 15 },
            { key: 'H', width: 15 },
            { key: 'I', width: 15 },
            { key: 'J', width: 15 },
            { key: 'K', width: 15 },
        ];

        // 1. Report Headers
        worksheet.mergeCells('A1:K1');
        const mainTitle = worksheet.getCell('A1');
        mainTitle.value = 'PATIENT HOURLY MONITORING SUMMARY REPORT';
        mainTitle.font = { bold: true, size: 16, color: { argb: 'FF002060' } };
        mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        worksheet.mergeCells('A2:K2');
        const subTitle = worksheet.getCell('A2');
        subTitle.value = 'Clinical Observation Registry';
        subTitle.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 20;

        worksheet.mergeCells('A3:K3');
        const generatedCell = worksheet.getCell('A3');
        generatedCell.value = `Report Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
        generatedCell.font = { italic: true, size: 10, color: { argb: 'FF555555' } };
        generatedCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(3).height = 18;

        // Gap row
        worksheet.addRow([]);
        worksheet.getRow(4).height = 10;

        // 2. Metadata Grid (Rows 5-8)
        const labelStyle = {
            font: { bold: true, size: 10, color: { argb: 'FF002060' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
            border: {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            }
        };
        const valueStyle = {
            font: { bold: true, size: 10 },
            border: {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            }
        };

        const metadata = [
            { l1: 'Patient Name', v1: admission.patientName, l2: 'Admission ID', v2: admission.admissionId },
            { l1: 'Department', v1: admission.wardName || 'ICU-D', l2: 'Status', v2: admission.status },
            { l1: 'Adm Date', v1: format(new Date(admission.admissionDate), 'dd MMM yyyy, HH:mm'), l2: 'Length of Stay', v2: `${Math.max(0, differenceInCalendarDays(new Date(), new Date(admission.admissionDate)))} Days` },
            { l1: 'Primary Dr.', v1: admission.doctorName, l2: 'Ward Details', v2: `${admission.wardName} / ${admission.roomName || 'N/A'}` }
        ];

        metadata.forEach((row, i) => {
            const rowNum = 5 + i;
            worksheet.getRow(rowNum).height = 22;
            worksheet.getCell(`A${rowNum}`).value = row.l1;
            worksheet.getCell(`B${rowNum}`).value = row.v1;
            worksheet.getCell(`D${rowNum}`).value = row.l2;
            worksheet.getCell(`E${rowNum}`).value = row.v2;

            // Apply Styles
            ['A', 'D'].forEach(col => {
                const cell = worksheet.getCell(`${col}${rowNum}`);
                cell.font = labelStyle.font as any;
                cell.fill = labelStyle.fill as any;
                cell.border = labelStyle.border as any;
            });
            ['B', 'E'].forEach(col => {
                const cell = worksheet.getCell(`${col}${rowNum}`);
                cell.font = valueStyle.font as any;
                cell.border = valueStyle.border as any;
            });
        });

        // Gap before tables
        worksheet.addRow([]);
        worksheet.getRow(9).height = 15;

        // 3. Hourly Vitals Log
        const vitalsHeaderRowNum = worksheet.lastRow ? worksheet.lastRow.number + 1 : 10;
        worksheet.mergeCells(`A${vitalsHeaderRowNum}:K${vitalsHeaderRowNum}`);
        const vitalsHeaderTitle = worksheet.getCell(`A${vitalsHeaderRowNum}`);
        vitalsHeaderTitle.value = 'HOURLY VITALS LOG';
        vitalsHeaderTitle.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        vitalsHeaderTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
        vitalsHeaderTitle.alignment = { vertical: 'middle' };
        worksheet.getRow(vitalsHeaderRowNum).height = 25;

        // ADDED SPACE BETWEEN TITLE AND HEADER
        worksheet.addRow([]);

        const vitalsColumns = ['S.No', 'Date', 'Day', 'Time', 'Heart Rate', 'BP', 'SpO2', 'Temp (F)', 'Resp', 'Nurse', 'Status'];
        const vitalsHeaderRow = worksheet.getRow(vitalsHeaderRowNum + 2);
        vitalsHeaderRow.values = vitalsColumns;
        vitalsHeaderRow.height = 20;
        vitalsHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
            };
        });

        vitals.map((v: any, idx: number) => {
            const row = worksheet.addRow([
                idx + 1,
                format(new Date(v.timestamp), 'dd/MM/yyyy'),
                format(new Date(v.timestamp), 'EEEE'),
                format(new Date(v.timestamp), 'HH:mm'),
                v.heartRate,
                `${v.systolicBP}/${v.diastolicBP}`,
                `${v.spO2}%`,
                v.temperature,
                v.respiratoryRate || '--',
                v.recordedBy?.name,
                v.status
            ]);
            row.height = 18;
            row.eachCell(cell => {
                cell.font = { size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });
        });

        // 4. Medication Log
        worksheet.addRow([]); // Gap row
        const mStartRow = (worksheet.lastRow?.number || 12) + 1;
        worksheet.mergeCells(`A${mStartRow}:I${mStartRow}`);
        const medsHeaderTitle = worksheet.getCell(`A${mStartRow}`);
        medsHeaderTitle.value = 'MEDICATION ADMINISTRATION LOG';
        medsHeaderTitle.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        medsHeaderTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
        medsHeaderTitle.alignment = { vertical: 'middle' };
        worksheet.getRow(mStartRow).height = 25;

        // ADDED SPACE BETWEEN TITLE AND HEADER
        worksheet.addRow([]);

        const medsColumns = ['S.No', 'Drug Name', 'Route', 'Date', 'Time', 'Slot', 'Admin Nurse', 'Status'];
        const medsHeaderRow = worksheet.getRow(mStartRow + 2);
        medsHeaderRow.values = medsColumns;
        medsHeaderRow.height = 20;
        medsHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
            };
        });

        meds.map((m: any, idx: number) => {
            const rawDrugName = m.drugName || '';

            const row = worksheet.addRow([
                idx + 1,
                rawDrugName,
                m.route || '-',
                format(new Date(m.timestamp), 'dd/MM/yyyy'),
                format(new Date(m.timestamp), 'HH:mm'),
                m.timeSlot,
                m.administeredBy?.name,
                m.status
            ]);
            row.height = 18;
            row.eachCell(cell => {
                cell.font = { size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });
        });

        // 5. Dietary Intake Log
        worksheet.addRow([]); // Gap row
        const dStartRow = (worksheet.lastRow?.number || 20) + 1;
        worksheet.mergeCells(`A${dStartRow}:F${dStartRow}`);
        const dietHeaderTitle = worksheet.getCell(`A${dStartRow}`);
        dietHeaderTitle.value = 'DIETARY INTAKE LOG';
        dietHeaderTitle.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        dietHeaderTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
        dietHeaderTitle.alignment = { vertical: 'middle' };
        worksheet.getRow(dStartRow).height = 25;

        // ADDED SPACE BETWEEN TITLE AND HEADER
        worksheet.addRow([]);

        const dietColumns = ['S.No', 'Items', 'Category', 'Time', 'Date', 'Nurse'];
        const dietHeaderRow = worksheet.getRow(dStartRow + 2);
        dietHeaderRow.values = dietColumns;
        dietHeaderRow.height = 20;
        dietHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
            };
        });

        diet.map((d: any, idx: number) => {
            const row = worksheet.addRow([
                idx + 1,
                d.items?.map((i: any) => `${i.name || i}${i.quantity ? ` (${i.quantity})` : ''}`).join(', '),
                d.category,
                d.recordedTime,
                format(new Date(d.timestamp), 'dd/MM/yyyy'),
                d.recordedBy?.name
            ]);
            row.height = 18;
            row.eachCell(cell => {
                cell.font = { size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });
        });

        // 6. Lab Registry
        worksheet.addRow([]); // Gap row
        const lStartRow = (worksheet.lastRow?.number || 30) + 1;
        worksheet.mergeCells(`A${lStartRow}:F${lStartRow}`);
        const labHeaderTitle = worksheet.getCell(`A${lStartRow}`);
        labHeaderTitle.value = 'LAB INVESTIGATIONS REGISTRY';
        labHeaderTitle.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        labHeaderTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
        labHeaderTitle.alignment = { vertical: 'middle' };
        worksheet.getRow(lStartRow).height = 25;

        // ADDED SPACE BETWEEN TITLE AND HEADER
        worksheet.addRow([]);

        const labColumns = ['S.No', 'Date', 'Test Name', 'Status', 'Result', 'Unit'];
        const labHeaderRow = worksheet.getRow(lStartRow + 2);
        labHeaderRow.values = labColumns;
        labHeaderRow.height = 20;
        labHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
            };
        });

        labOrders.forEach((order: any, idx: number) => {
            order.tests?.forEach((test: any) => {
                // FIXED DATA FETCHING: Added subTests handling
                if (test.subTests && test.subTests.length > 0) {
                    test.subTests.forEach((st: any) => {
                        const row = worksheet.addRow([
                            idx + 1,
                            format(new Date(order.createdAt), 'dd/MM HH:mm'),
                            `${test.testName || test.test?.testName} - ${st.name}`,
                            order.status,
                            st.result || 'Pending',
                            st.unit || '-'
                        ]);
                        row.height = 18;
                        row.eachCell(cell => {
                            cell.font = { size: 10 };
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                            };
                        });
                    });
                } else {
                    const row = worksheet.addRow([
                        idx + 1,
                        format(new Date(order.createdAt), 'dd/MM HH:mm'),
                        test.testName || test.test?.testName,
                        order.status,
                        test.resultValue || 'Pending',
                        test.unit || '-'
                    ]);
                    row.height = 18;
                    row.eachCell(cell => {
                        cell.font = { size: 10 };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                        };
                    });
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Hourly_Record_${admission.patientName}_${format(new Date(), 'ddMMyy')}.xlsx`);
        toast.success('Excel Report Exported');
    };


    const handleDownload = () => {
        if (!selectedAdmissionId) {
            toast.error('Please select a patient first');
            return;
        }
        if (exportFormat === 'pdf') {
            handlePrint();
        } else {
            handleExcelExport();
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 justify-between items-center bg-white p-1.5 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-slate-200 shadow-sm transition-all duration-300">
                <div className="w-full md:w-96 space-y-2" ref={dropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient / Admission</label>
                    <div className="relative">
                        <div
                            onClick={() => setIsSelectOpen(!isSelectOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 cursor-pointer hover:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/20"
                        >
                            <div className="flex items-center gap-3">
                                <Search size={16} className="text-slate-400" />
                                <span className="">
                                    {selectedAdmissionId ?
                                        admissions?.find((a: any) => a.admissionId === selectedAdmissionId)?.patient?.name || 'Selected'
                                        : 'Search & Choose Patient...'}
                                </span>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isSelectOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                            placeholder="Type name, MRN or ADM number..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {filteredAdmissions.length > 0 ? (
                                        filteredAdmissions.map((adm: any) => (
                                            <div
                                                key={adm._id}
                                                onClick={() => {
                                                    setSelectedAdmissionId(adm.admissionId);
                                                    setIsSelectOpen(false);
                                                }}
                                                className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 ${selectedAdmissionId === adm.admissionId ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{adm.patient?.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{adm.patient?.mrn}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded uppercase">{adm.admissionId}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 uppercase">No matching patients found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setExportFormat('pdf')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportFormat === 'pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText size={14} />
                            PDF
                        </button>
                        <button
                            onClick={() => setExportFormat('excel')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportFormat === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileSpreadsheet size={14} />
                            Excel
                        </button>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={!selectedAdmissionId}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none group"
                    >
                        <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                        Download Report
                    </button>
                </div>
            </div>

            {loadingData ? (
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Compiling Patient History...</p>
                </div>
            ) : hourlyData?.data ? (
                <div className="space-y-3 sm:space-y-6 pt-1 sm:pt-2">
                    {/* Patient Card */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-6">
                        <div className="xl:col-span-2 space-y-2 sm:space-y-6">
                            <Card className="relative overflow-hidden group border-none shadow-xl bg-white rounded-2xl sm:rounded-[2.5rem]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                                <div className="relative z-10 p-2 sm:p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 mb-4 sm:mb-8">
                                        <div className="flex items-center gap-2 sm:gap-4">
                                            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform flex-shrink-0">
                                                <User size={20} className="sm:w-[28px] sm:h-[28px]" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">{hourlyData.data.admission.patientName}</h2>
                                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[8px] sm:text-xs font-bold text-slate-500 uppercase">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200">ID: {hourlyData.data.admission.admissionId}</span>
                                                    <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span className="text-blue-600 font-black">{hourlyData.data.admission.admissionType}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                                            <div className="flex items-center gap-1 sm:gap-2 px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] sm:text-[10px] font-black uppercase border border-emerald-100">
                                                <Activity size={10} className="sm:w-[12px] sm:h-[12px]" strokeWidth={3} />
                                                {hourlyData.data.admission.status}
                                            </div>
                                            <div className="sm:mt-3 flex flex-col items-start sm:items-end">
                                                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Adm: {format(new Date(hourlyData.data.admission.admissionDate), 'dd MMM, HH:mm')}
                                                </p>
                                                <div className="bg-blue-50 text-blue-700 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl inline-block mt-0.5 sm:mt-1 border border-blue-100 shadow-sm">
                                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                        <Clock size={8} className="sm:w-[10px] sm:h-[10px]" strokeWidth={3} />
                                                        Stay: {Math.max(0, differenceInCalendarDays(new Date(), new Date(hourlyData.data.admission.admissionDate)))} Days
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 pt-3 sm:pt-6 border-t border-slate-100">
                                        <div className="bg-slate-50/50 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                                            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1.5 flex items-center gap-1 sm:gap-1.5">
                                                <Stethoscope size={8} className="text-blue-500 sm:w-[10px] sm:h-[10px]" />
                                                Primary Doctor
                                            </p>
                                            <p className="text-[10px] sm:text-sm font-black text-slate-700">
                                                {hourlyData.data.admission.doctorName?.startsWith('Dr.') ? hourlyData.data.admission.doctorName : `Dr. ${hourlyData.data.admission.doctorName}`}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50/50 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                                            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1.5 flex items-center gap-1 sm:gap-1.5">
                                                <ClipboardList size={8} className="text-indigo-500 sm:w-[10px] sm:h-[10px]" />
                                                Ward Details
                                            </p>
                                            <p className="text-[10px] sm:text-sm font-black text-slate-700">
                                                {hourlyData.data.admission.wardName ? (
                                                    <span>
                                                        {hourlyData.data.admission.wardName}
                                                        {hourlyData.data.admission.roomName && `/${hourlyData.data.admission.roomName}`}
                                                    </span>
                                                ) : 'Transit'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 bg-slate-50/50 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                                            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase mb-1 sm:mb-2 flex items-center gap-1 sm:gap-1.5">
                                                <Activity size={8} className="text-rose-500 sm:w-[10px] sm:h-[10px]" />
                                                Vitals Snapshot
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-700">
                                                    <HeartPulse size={12} className="text-rose-500 sm:w-[14px] sm:h-[14px]" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.heartRate || '--'}
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-700">
                                                    <Thermometer size={12} className="text-orange-500 sm:w-[14px] sm:h-[14px]" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.temperature || '--'}
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-700">
                                                    <Droplets size={12} className="text-blue-500 sm:w-[14px] sm:h-[14px]" />
                                                    {hourlyData.data.vitals?.[hourlyData.data.vitals.length - 1]?.spO2 || '--'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <Card className="h-full p-3 sm:p-6 bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-xl text-white rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden">
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-3 sm:mb-6">
                                        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <Utensils size={14} className="sm:w-[18px] sm:h-[18px]" />
                                            Dietary Plan
                                        </h3>
                                        <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md">
                                            <Utensils size={14} />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4 sm:space-y-6">
                                        <div className="p-3 sm:p-5 bg-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                                            <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-2 tracking-widest opacity-80">Instructions</p>
                                            <p className="text-[11px] sm:text-sm font-black italic leading-tight sm:leading-relaxed">
                                                "{hourlyData.data.admission.diet || 'Standard nutrition applies.'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                    
                    {/* Bed Transfer History */}
                    {hourlyData.data.admission.bedHistory && hourlyData.data.admission.bedHistory.length > 1 && (
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-2 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1 sm:p-1.5 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl">
                                        <ClipboardList size={14} className="sm:w-[18px] sm:h-[18px]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">Bed Transfer History</h3>
                                        <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Room & Bed Movements</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                    Total Changes: <span className="text-indigo-600 font-black">{hourlyData.data.admission.bedHistory.length - 1}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward/Type</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Room</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bed ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Daily Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {hourlyData.data.admission.bedHistory.map((bh: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-slate-700 uppercase">{bh.ward}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs font-bold text-slate-700">{bh.room}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{bh.bed}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-700">{format(new Date(bh.startDate), 'dd MMM yyyy')}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(bh.startDate), 'HH:mm')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {bh.endDate === 'Current' ? (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">Active Now</span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-700">{format(new Date(bh.endDate), 'dd MMM yyyy')}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(bh.endDate), 'HH:mm')}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-black text-slate-700">₹{bh.rate}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* Vitals Log */}
                    <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-2 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-1 sm:p-1.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl">
                                    <Activity size={14} className="sm:w-[18px] sm:h-[18px]" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">Vitals Observation</h3>
                                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Monitoring History</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mr-4">
                                    Total Readings: <span className="text-blue-600 font-black">{hourlyData.data.vitals.length}</span>
                                </div>
                                {hourlyData.data.vitals.length > 0 && (
                                    <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200 shadow-sm no-print">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <ChevronDown size={14} className="rotate-90 text-slate-600" />
                                        </button>
                                        <div className="px-3 flex flex-col items-center">
                                            <span className="text-[10px] font-black text-blue-600 leading-none">{currentPage}</span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                                                {Math.max(0, Math.ceil(hourlyData.data.vitals.length / itemsPerPage) - currentPage)} more
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(hourlyData.data.vitals.length / itemsPerPage), prev + 1))}
                                            disabled={currentPage === Math.ceil(hourlyData.data.vitals.length / itemsPerPage) || hourlyData.data.vitals.length === 0}
                                            className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <ChevronDown size={14} className="-rotate-90 text-slate-600" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Time</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-center">HR</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-center">BP</th>
                                        <th className="px-1 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-center">SpO2</th>
                                        <th className="px-1 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-center">Temp</th>
                                        <th className="px-1 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-center text-rose-500">Resp</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Glucose</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Nurse</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {hourlyData.data.vitals.length > 0 ? (
                                        [...hourlyData.data.vitals].reverse().map((v: any, idx: number) => {
                                            const isPageRecord = idx >= (currentPage - 1) * itemsPerPage && idx < currentPage * itemsPerPage;
                                            return (
                                                <tr key={`${v._id || v.timestamp || idx}`} className={`hover:bg-slate-50/50 transition-colors group ${!isPageRecord ? 'hidden-on-ui' : ''}`}>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <span className="text-[10px] sm:text-xs font-black text-slate-700">{format(new Date(v.timestamp), 'HH:mm')}</span>
                                                        </div>
                                                        <div className="flex flex-col mt-0.5 sm:mt-0">
                                                            <span className="text-[7px] sm:text-[10px] font-black text-slate-500 uppercase">{format(new Date(v.timestamp), 'dd MMM')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                                                        <span className={`text-[11px] sm:text-sm font-black ${v.heartRate > 100 || v.heartRate < 60 ? 'text-rose-500' : 'text-slate-700'}`}>
                                                            {v.heartRate}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                                                        <span className="text-[10px] sm:text-xs font-black text-slate-700">
                                                            {v.systolicBP}/{v.diastolicBP}
                                                        </span>
                                                    </td>
                                                    <td className="px-1 sm:px-6 py-2 sm:py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-[10px] sm:text-sm font-black ${v.spO2 < 94 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                                                                {v.spO2}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-1 sm:px-6 py-2 sm:py-4 text-center">
                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-700">{v.temperature}°</span>
                                                    </td>
                                                    <td className="px-1 sm:px-6 py-2 sm:py-4 text-center">
                                                        <span className="text-[10px] sm:text-xs font-black text-rose-500">{v.respiratoryRate || '--'}</span>
                                                    </td>
                                                    <td className="hidden sm:table-cell px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">{v.glucose || '--'} mg/dL</span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{v.glucoseType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <div className="w-5 h-5 sm:w-7 sm:h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-[7px] sm:text-[10px] font-black uppercase border border-indigo-100">
                                                                {v.recordedBy?.name?.charAt(0)}
                                                            </div>
                                                            <span className="text-[9px] sm:text-xs font-bold text-slate-600 sm:max-w-none">{v.recordedBy?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                        <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-tighter border ${v.status === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            v.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            }`}>
                                                            {v.status?.charAt(0)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center">
                                                <div className="bg-slate-50 inline-flex p-4 rounded-3xl mb-4">
                                                    <Activity size={32} className="text-slate-300" />
                                                </div>
                                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No vitals logged yet</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                        {/* Medication Log */}
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-2 sm:p-6 border-b border-slate-100 flex items-center gap-2 sm:gap-3 bg-slate-50/50">
                                <div className="p-1 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl">
                                    <Pill size={14} className="sm:w-[20px] sm:h-[20px]" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">Med Administration</h3>
                                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Execution Record</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Drug Name</th>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Time</th>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Nurse</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {hourlyData.data.meds.length > 0 ? (
                                            [...hourlyData.data.meds].map((m: any, idx: number) => {
                                                const rawDrugName = m.drugName || '';
                                                return (
                                                    <tr key={`${m._id || m.timestamp || idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] sm:text-xs font-black text-slate-800">{rawDrugName}</span>
                                                                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500">{m.route || '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] sm:text-xs font-black text-slate-700">{format(new Date(m.timestamp), 'HH:mm')}</span>
                                                                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tighter ${m.timeSlot === 'Morning' ? 'text-amber-500' :
                                                                    m.timeSlot === 'Afternoon' ? 'text-blue-500' : 'text-indigo-600'
                                                                    }`}>{m.timeSlot}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                            <span className="text-[9px] sm:text-xs font-bold text-slate-600 block">{m.administeredBy?.name}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">No Medications Administered</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Diet Log */}
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-2 sm:p-6 border-b border-slate-100 flex items-center gap-2 sm:gap-3 bg-slate-50/50">
                                <div className="p-1 sm:p-2 bg-orange-50 text-orange-600 rounded-lg sm:rounded-xl">
                                    <Utensils size={14} className="sm:w-[20px] sm:h-[20px]" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">Dietary Intake Log</h3>
                                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Consumption</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Items</th>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest">Category</th>
                                            <th className="px-2 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter sm:tracking-widest text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {hourlyData.data.diet?.length > 0 ? (
                                            [...hourlyData.data.diet].map((d: any, idx: number) => (
                                                <tr key={`${d._id || idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] sm:text-xs font-black text-slate-800">
                                                                {d.items?.map((item: any) => `${item.name || item}`).join(', ')}
                                                            </span>
                                                            {d.items?.some((item: any) => item.calories) && (
                                                                <span className="text-[7px] font-bold text-amber-600 uppercase tracking-tighter sm:tracking-widest">
                                                                    {d.items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0), 0)} Kcal
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                        <span className="px-1.5 sm:px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[7px] sm:text-[9px] font-black uppercase tracking-tighter border border-orange-100">
                                                            {d.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] sm:text-xs font-black text-slate-700">{d.recordedTime}</span>
                                                            <span className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase">{d.recordedBy?.name}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">No Diet Logs Recorded</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Tests */}
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm lg:col-span-2">
                            <div className="p-2 sm:p-6 border-b border-slate-100 flex items-center gap-2 sm:gap-3 bg-slate-50/50">
                                <div className="p-1 sm:p-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl">
                                    <ClipboardList size={14} className="sm:w-[20px] sm:h-[20px]" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">Diagnostics</h3>
                                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Lab Results</p>
                                </div>
                            </div>
                            <div className="p-2 sm:p-6">
                                <div className="space-y-2 sm:space-y-4">
                                    {hourlyData.data.labOrders.length > 0 ? (
                                        <div className="space-y-2 sm:space-y-4 w-full">
                                            {hourlyData.data.labOrders.map((order: any, idx: number) => (
                                                <div key={order._id || idx} className="p-2 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2 sm:mb-4">
                                                        <div className="flex gap-2 sm:gap-3">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                                                <FlaskConical size={14} className="sm:w-[18px] sm:h-[18px]" />
                                                            </div>
                                                            <div>
                                                                <div className="flex flex-wrap gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                                                                    {order.tests?.map((t: any, tidx: number) => (
                                                                        <span key={`${t.testId || tidx}`} className="text-[9px] sm:text-xs font-black text-slate-800 bg-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-slate-200 shadow-sm">
                                                                            {t.testName || t.test?.testName || 'Lab investigation'}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    By {hourlyData.data.admission.doctorName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-tighter border ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                {order.status}
                                                            </span>
                                                            <p className="text-[7px] sm:text-[9px] font-bold text-slate-400 mt-0.5 sm:mt-1 uppercase">{format(new Date(order.createdAt), 'dd MMM, HH:mm')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Lab Results Detail Display */}
                                                    <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-slate-200/50 space-y-1 sm:space-y-3">
                                                        {order.tests?.map((test: any, testIdx: number) => (
                                                            <div key={`${testIdx}-${test.testName}`} className="space-y-1 sm:space-y-2">
                                                                {(test.subTests && test.subTests.length > 0) ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                                                                        {test.subTests.map((st: any, stIdx: number) => (
                                                                            st.result !== undefined && st.result !== null && st.result !== '' ? (
                                                                                <div key={`${st.name}-${stIdx}`} className="flex justify-between items-center bg-white/50 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-100 transition-colors hover:bg-white">
                                                                                    <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tight sm:max-w-none">{st.name}</span>
                                                                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                                                                        <span className="text-[10px] sm:text-xs font-black text-slate-900">{st.result}</span>
                                                                                        <span className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase">{st.unit || '-'}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null
                                                                        ))}
                                                                    </div>
                                                                ) : test.resultValue ? (
                                                                    <div className="flex justify-between items-center bg-white/50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-100">
                                                                        <span className="text-[9px] sm:text-[11px] font-black text-slate-600 uppercase tracking-wide">Result</span>
                                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                                            <span className="text-xs sm:text-sm font-black text-blue-600">{test.resultValue}</span>
                                                                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">{test.unit || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 sm:py-8">
                                            <AlertCircle size={20} className="text-slate-200 mx-auto mb-1 sm:mb-2" />
                                            <p className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase">No lab reports found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[450px] bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                    <Activity size={48} className="text-slate-200 mb-6" />
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Awaiting Patient Selection</h3>
                </div>
            )}

            {/* RESPONSIVE Nurse Print Preview Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full h-full sm:max-w-6xl sm:h-[92vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header - Responsive Padding */}
                        <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg">
                                    <FileText size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-xl font-black text-slate-900 uppercase tracking-tight">Preview</h2>
                                    <p className="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Hourly Monitoring Record</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                                        if (iframe?.contentWindow) {
                                            iframe.contentWindow.print();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all group"
                                >
                                    <Printer size={14} className="sm:w-4 sm:h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="hidden xs:inline">Print Document</span>
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="p-2 sm:p-3 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg sm:rounded-2xl transition-all"
                                >
                                    <X size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Responsive Padding */}
                        <div className="flex-1 bg-slate-100/50 p-2 sm:p-8 overflow-hidden">
                            <iframe
                                id="print-iframe"
                                srcDoc={printHtml}
                                className="w-full h-full bg-white sm:rounded-3xl shadow-inner border border-slate-200"
                                title="Print Preview"
                            />
                        </div>

                        {/* Modal Footer - Hidden on very small screens to save space */}
                        <div className="hidden sm:flex p-4 bg-white border-t border-slate-100 justify-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">MS CureChain Hospital Management System &bull; Secure Report Gateway</p>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 10mm;
                    }
                    .no-print { display: none !important; }
                    body { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 10pt;
                    }
                    .print-container { 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                    }
                    /* Force layout to be visible and properly spaced */
                    .grid { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; }
                    .lg\\:grid-cols-3 > :nth-child(1) { width: 65% !important; }
                    .lg\\:grid-cols-3 > :nth-child(2) { width: 32% !important; }
                    .lg\\:grid-cols-2 > * { width: 48% !important; }
                    
                    .Card, .bg-white {
                        border: 1px solid #f1f5f9 !important;
                        box-shadow: none !important;
                        border-radius: 12px !important;
                        margin-bottom: 12px !important;
                        break-inside: avoid;
                    }
                    
                    tbody { display: table-row-group !important; }
                    tr { page-break-inside: avoid !important; }
                    
                    /* Reset sticky for print */
                    .sticky { position: static !important; }
                    
                    /* Ensure all data shows in PDF */
                    .hidden-on-ui {
                        display: table-row !important;
                    }
                    
                    /* Tighten table spacing for "near near" look */
                    th, td {
                        padding: 6px 8px !important;
                    }
                    
                    /* Maintain colors */
                    .bg-blue-600 { background-color: #2563eb !important; border-radius: 8px !important; }
                    .text-white { color: white !important; }
                    .bg-emerald-500 { background-color: #10b981 !important; }
                }

                .hidden-on-ui {
                    display: none;
                }

                /* Custom Scrollbar for Dropdown */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
