'use client';

import React, { useState, useEffect } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';

export const PrintableDischargeSummary = React.forwardRef<HTMLDivElement, { data: any, consultants: string[] }>(({ data, consultants }, ref) => {
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const res = await hospitalAdminService.getHospital();
                setHospitalInfo(res.hospital);
            } catch (error) {
                console.error("Failed to fetch hospital info for print", error);
            }
        };
        fetchHospital();
    }, []);

    if (!data) return null;

    // 4. Clinical Information
    const clinicalSections = [
        { label: 'Provisional Diagnosis / ICD-10', value: `${data.provisionalDiagnosis || ''} ${data.icdCode ? `(ICD: ${data.icdCode})` : ''}`.trim() },
        { label: 'Final Diagnosis', value: data.diagnosis },
        { label: 'Reason for Admission', value: data.reasonForAdmission },
        { label: 'Chief Complaints', value: data.chiefComplaints },
        { label: 'Past Medical History', value: data.pastMedicalHistory },
        { label: 'Allergy History', value: data.allergyHistory },
    ];

    // 5. Treatment & Procedures
    const treatmentSections = [
        { label: 'General Appearance', value: data.generalAppearance },
        { label: 'Treatment Summary', value: data.treatmentGiven },
        { label: 'Surgical / Procedural Details', value: data.surgicalProcedures || data.surgeryNotes },
        { label: 'Investigations Performed', value: data.investigationsPerformed },
        { label: 'Hospital Course', value: data.hospitalCourse },
        { label: 'Condition at Discharge', value: data.conditionAtDischarge },
    ];

    // 6. Discharge Advice
    const adviceSections = [
        { label: 'Discharge Medications', value: data.medicationsPrescribed },
        { label: 'Advice & Activity Restrictions', value: `${data.adviceAtDischarge || ''}\n${data.activityRestrictions || ''}`.trim() },
        { label: 'Dietary Instructions', value: data.dietInstructions || data.diet },
        { label: 'Warning Signs / Red Flags', value: data.warningSigns },
        {
            label: 'Follow-up Details',
            value: data.followUpInstructions,
            subSections: [
                { label: 'Next Appointment', value: data.followUpDate ? new Date(data.followUpDate).toLocaleString() : '' },
                { label: 'Department / Doctor', value: data.suggestedDoctorName || data.primaryDoctor }
            ]
        },
    ];

    return (
        <div ref={ref} className="bg-white text-[#1e293b] font-sans text-[11px] leading-relaxed w-full">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    
                    @media print {
                        @page {
                            size: A4;
                            margin: 6mm 10mm;
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-container {
                            padding: 0 !important;
                            display: block !important;
                            min-height: auto !important;
                        }
                        .content-page-buffer {
                            padding-top: 0;
                            display: block !important;
                        }
                        .print-wrapper {
                            display: block !important;
                            min-height: auto !important;
                        }
                    }
                    
                    .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, inherit; }
                    
                    .section-header {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        margin-bottom: 8px;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 4px;
                        color: #334155;
                        letter-spacing: 0.8px;
                    }

                    .info-card {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 10px;
                        position: relative;
                        overflow: hidden;
                    }

                    .info-card-badge {
                        position: absolute;
                        top: 0;
                        right: 0;
                        background: #1e293b;
                        color: white;
                        padding: 2px 8px;
                        border-bottom-left-radius: 6px;
                        font-size: 8px;
                        font-weight: 900;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }

                    .vitals-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 5px;
                    }

                    .vitals-table td, .vitals-table th {
                        border: 1px solid #f1f5f9;
                        padding: 6px 10px;
                        text-align: left;
                        font-size: 10px;
                    }

                    .vitals-table th {
                        background-color: #f8fafc;
                        color: #64748b;
                        font-weight: 700;
                        text-transform: uppercase;
                        font-size: 9px;
                        width: 25%;
                    }

                    .clinical-sub-label {
                        font-weight: 800;
                        color: #475569;
                        font-size: 9px;
                        text-transform: uppercase;
                        letter-spacing: 0.4px;
                        margin-bottom: 2px;
                        display: block;
                    }

                    .clinical-value {
                        color: #1e293b;
                        font-weight: 500;
                        margin-bottom: 12px;
                        padding-left: 2px;
                        line-height: 1.5;
                    }

                    .billing-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .billing-table td {
                        padding: 6px 10px;
                        border: 1px solid #f1f5f9;
                    }
                    .billing-label {
                        font-weight: 700;
                        color: #64748b;
                        background-color: #f8fafc;
                        font-size: 9px;
                        text-transform: uppercase;
                        width: 25%;
                    }
                `}
            </style>

            <div className="p-0 min-h-screen flex flex-col relative content-page-buffer print-container !block">
                <div className="flex-1 flex flex-col min-h-0 relative print-wrapper !block">

                    {/* 1. Header Section */}
                    <div className="mb-4">
                        <MainHeader
                            initialDetails={{
                                name: hospitalInfo?.name || data.hospitalName || 'Hospital Name',
                                address: (() => {
                                    const parts = [
                                        hospitalInfo?.street,
                                        hospitalInfo?.landmark,
                                        hospitalInfo?.area,
                                        hospitalInfo?.city,
                                        hospitalInfo?.state
                                    ].filter(Boolean);
                                    const uniqueParts = Array.from(new Set(parts));
                                    return uniqueParts.length > 0
                                        ? uniqueParts.join(', ')
                                        : (hospitalInfo?.address || data.hospitalAddress || '');
                                })(),
                                phone: hospitalInfo?.phone || data.hospitalPhone || '',
                                email: hospitalInfo?.email || data.hospitalEmail || '',
                                logo: hospitalInfo?.logo || data.hospitalLogo
                            }}
                        />
                    </div>

                    {/* Title Banner */}
                    <div className="bg-slate-900 text-white py-2 px-10 text-center mb-6 relative z-10 rounded-md">
                        <h2 className="text-[15px] font-black uppercase tracking-[0.2em]">Clinical Discharge Summary</h2>
                    </div>

                    {/* 2 & 3. Patient & Admission Meta Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                        {/* Patient Identity Card */}
                        <div className="info-card">
                            <div className="info-card-badge">Patient Identity</div>
                            <div className="text-[14px] font-black text-slate-900 uppercase mb-3 pr-20">
                                {data.patientTitle} {data.patientName}
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                <div>
                                    <div className="clinical-sub-label">MRN / UHID</div>
                                    <div className="font-bold text-slate-700">{data.mrn}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label">Gender / Blood Group</div>
                                    <div className="font-bold text-slate-700">{data.gender} {data.bloodGroup ? `(${data.bloodGroup})` : ''}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label">Age / DOB</div>
                                    <div className="font-bold text-slate-700">{data.age} / {data.dob ? new Date(data.dob).toLocaleDateString('en-GB') : 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label">Guardian Contact</div>
                                    <div className="font-bold text-slate-700">{data.phone || data.attendantPhone || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Admission Details Card */}
                        <div className="info-card !bg-blue-50/30 !border-blue-100">
                            <div className="info-card-badge !bg-blue-700">Admission Data</div>
                            <div className="text-[14px] font-black text-blue-900 uppercase mb-3 pr-20 truncate">
                                {data.admissionId}
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                <div>
                                    <div className="clinical-sub-label !text-blue-700">Primary Doctor</div>
                                    <div className="font-bold text-blue-900 truncate">{data.primaryDoctor || data.suggestedDoctorName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label !text-blue-700">Room / Bed</div>
                                    <div className="font-bold text-blue-900">{data.roomNo} / {data.bedNo || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label !text-blue-700">Admitted On</div>
                                    <div className="font-bold text-blue-900">{data.admissionDate ? new Date(data.admissionDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="clinical-sub-label !text-blue-700">Discharged On</div>
                                    <div className="font-bold text-emerald-700">{data.dischargeDate ? new Date(data.dischargeDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vitals & History Details */}
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        {/* 4. Vital Signs */}
                        {data.vitals && (
                            <div className="break-inside-avoid shadow-sm rounded-xl border border-slate-100 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200">
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Vital Signs at Discharge</h3>
                                </div>
                                <table className="vitals-table">
                                    <tbody>
                                        <tr>
                                            <th>Height / Weight</th><td>{data.vitals.height || '-'} cm / {data.vitals.weight || '-'} kg</td>
                                            <th>Blood Pressure</th><td>{data.vitals.bloodPressure || '-'} mmHG</td>
                                        </tr>
                                        <tr>
                                            <th>Temp / Pulse</th><td>{data.vitals.temperature || '-'} °F / {data.vitals.pulse || '-'} bpm</td>
                                            <th>Resp / SpO2</th><td>{data.vitals.respiratoryRate || '-'} /min / {data.vitals.spO2 || '-'}%</td>
                                        </tr>
                                        <tr>
                                            <th>Glucose / Sugar</th><td>{data.vitals.glucose || data.vitals.sugar || '-'} {data.vitals.glucoseType ? `(${data.vitals.glucoseType})` : ''}</td>
                                            <th>Final Condition</th><td className="font-bold text-emerald-700 uppercase">{data.vitals.condition || data.conditionAtDischarge || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 5. Transfer History (If any) */}
                        {data.bedHistory && data.bedHistory.length > 0 && (
                            <div className="break-inside-avoid shadow-sm rounded-xl border border-slate-100 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200">
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Bed Occupancy & Transfers</h3>
                                </div>
                                <table className="w-full border-collapse">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">Ward/Room</th>
                                            <th className="px-4 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">Bed</th>
                                            <th className="px-4 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">Stay Period</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px]">
                                        {data.bedHistory.map((bh: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-50">
                                                <td className="px-4 py-2 font-bold text-slate-700">{bh.ward} {bh.room && `/ R-${bh.room}`}</td>
                                                <td className="px-4 py-2 font-black text-blue-600">{bh.bed}</td>
                                                <td className="px-4 py-2 text-slate-500 font-medium">
                                                    {new Date(bh.startDate).toLocaleDateString('en-GB')} to {bh.endDate === 'Current' ? 'Till Discharge' : new Date(bh.endDate).toLocaleDateString('en-GB')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* 6. Clinical Findings & Treatment */}
                    <div className="space-y-6 relative z-10 mb-6">
                        {/* Clinical Information */}
                        <div className="break-inside-avoid">
                            <div className="section-header">Clinical Information</div>
                            <div className="pl-2 mt-2">
                                {clinicalSections.map((s, idx) => s.value && (
                                    <div key={idx}>
                                        <span className="clinical-sub-label">{s.label}</span>
                                        <div className="clinical-value whitespace-pre-wrap">{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Treatment Summary */}
                        <div className="break-inside-auto">
                            <div className="section-header">Treatment & Hospital Course</div>
                            <div className="pl-2 mt-2">
                                {treatmentSections.map((s, idx) => s.value && (
                                    <div key={idx}>
                                        <span className="clinical-sub-label">{s.label}</span>
                                        <div className="clinical-value whitespace-pre-wrap">{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Discharge Advice & Medication */}
                        <div className="break-inside-auto">
                            <div className="section-header">Discharge Advice & Medication</div>
                            <div className="grid grid-cols-1 gap-4 mt-2">
                                {adviceSections.map((s, idx) => (s.value || s.subSections) && (
                                    <div key={idx} className={`p-4 rounded-xl border ${s.label.includes('Medication') ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                        <span className={`clinical-sub-label ${s.label.includes('Medication') ? 'text-emerald-700' : ''}`}>{s.label}</span>
                                        {s.value && <div className={`clinical-value !mb-0 whitespace-pre-wrap ${s.label.includes('Medication') ? 'font-bold' : ''}`}>{s.value}</div>}
                                        {s.subSections && (
                                            <div className="mt-3 grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                                                {s.subSections.map((sub, sIdx) => sub.value && (
                                                    <div key={sIdx}>
                                                        <span className="clinical-sub-label text-[8px]">{sub.label}</span>
                                                        <div className="font-bold text-slate-900">{sub.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 7. Final Verification & Billing */}
                    <div className="mb-8 relative z-10 break-inside-avoid">
                        <div className="section-header">Final Settlement Summary</div>
                        <div className="grid grid-cols-2 gap-4">
                            <table className="billing-table">
                                <tbody>
                                    <tr>
                                        <td className="billing-label">Insurance / TPA</td>
                                        <td className="font-bold text-slate-700">{data.insuranceName || 'Self Financed (Personal)'}</td>
                                    </tr>
                                    <tr>
                                        <td className="billing-label">Payment Mode</td>
                                        <td className="font-bold text-slate-700">{data.paymentMode || 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table className="billing-table">
                                <tbody>
                                    <tr className="bg-slate-900 border-slate-900">
                                        <td className="billing-label !bg-transparent !text-slate-400">Total Settled</td>
                                        <td className="font-black text-white text-[13px]">₹{Math.round(data.totalPaidAmount || (data.advanceAmount + (data.remainingAmount || 0))).toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-slate-100 border-slate-200">
                                        <td className="billing-label !bg-transparent">Total Bill</td>
                                        <td className="font-black text-slate-900">₹{Math.round(data.totalBillAmount || 0).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 8. Signature & Footer */}
                    <div className="mt-auto relative z-10 pt-10">
                        <div className="flex justify-between items-end mb-8 px-4">
                            <div className="text-center">
                                <div className="w-40 border-b-2 border-slate-200 mb-2"></div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical Officer</div>
                            </div>
                            <div className="text-center">
                                <div className="w-40 border-b-2 border-slate-200 mb-2"></div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Consultant</div>
                            </div>
                            <div className="text-center">
                                <div className="w-40 border-b-2 border-slate-200 mb-2"></div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Signatory</div>
                            </div>
                        </div>

                        <MainFooter
                            initialDetails={{
                                name: hospitalInfo?.name || data.hospitalName || 'Hospital Name',
                                address: hospitalInfo?.address || data.hospitalAddress || '',
                                phone: hospitalInfo?.phone || data.hospitalPhone || '',
                                email: hospitalInfo?.email || data.hospitalEmail || '',
                            }}
                        />
                        <div className="bg-slate-50 rounded-lg p-3 text-center text-[9px] font-bold text-slate-500 mt-4 border border-slate-100 flex items-center justify-center gap-4">
                            <span>• PLEASE RETAIN THIS SUMMARY FOR ALL FUTURE CONSULTATIONS</span>
                            <span className="text-slate-300">|</span>
                            <span>• REPORT TO EMERGENCY IF RED FLAGS ARE OBSERVED</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintableDischargeSummary.displayName = 'PrintableDischargeSummary';
