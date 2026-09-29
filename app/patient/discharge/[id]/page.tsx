'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Activity,
    FileText,
    ShieldCheck,
    Stethoscope,
    Pill
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/integrations/api';

// Minimal types matching schema
interface DischargeRecord {
    _id: string;
    patientName: string;
    mrn: string;
    admissionId: string;
    documentId?: string;
    admissionDate?: string;
    dischargeDate?: string;
    hospitalName?: string;
    hospitalRegNo?: string;
    primaryDoctor?: string;
    specialistType?: string;
    reasonForAdmission?: string;
    diagnosis?: string;
    medicationsPrescribed?: string;
    adviceAtDischarge?: string;
    followUpDate?: string;
    vitals?: any;
    [key: string]: any;
}

export default function PatientDischargeView() {
    const params = useParams() as any;
    const router = useRouter();
    const identifier = params.id as string;

    const [record, setRecord] = useState<DischargeRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const componentRef = useRef<HTMLDivElement>(null);



    useEffect(() => {
        const fetchRecord = async () => {
            try {
                // Using apiClient function directly
                const response = await apiClient<{ success: boolean; data: DischargeRecord }>(`/discharge/records/patient-view/${identifier}`);
                if (response.success) {
                    setRecord(response.data);
                } else {
                    setError('Record not found or unauthorized access.');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load discharge summary. Please verify you are logged in using the correct mobile number.');
            } finally {
                setLoading(false);
            }
        };

        if (identifier) {
            fetchRecord();
        }
    }, [identifier]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="animate-spin text-teal-600" size={32} />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Retrieving Medical Record...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
                    <ShieldCheck size={32} />
                </div>
                <h1 className="text-xl font-black text-slate-900 uppercase mb-2">Access Denied</h1>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">{error}</p>
                <button
                    onClick={() => router.push('/patient/dashboard')}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (!record) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* COMPACT PAGE HEADER */}
            <div className="bg-white/40 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 sm:relative sm:top-auto z-10 sm:z-0">
                <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 group transition-all">
                    <ArrowLeft size={18} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Discharge Summary</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Medical Record</p>
                </div>
                <div className="w-10"></div> {/* Spacer for symmetry */}
            </div>

            {/* CONTENT CONTAINER */}
            <div className="pt-6 px-4 max-w-4xl mx-auto space-y-4">

                {/* PDF PRINTABLE AREA */}
                <div ref={componentRef} className="bg-white p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm ring-1 ring-slate-100 print:shadow-none print:rounded-none print:p-0 print:ring-0">

                    {/* HOSPITAL HEADER */}
                    <div className="text-center border-b-2 border-slate-100 pb-6 mb-6">
                        <div className="flex flex-col items-center gap-2">
                            {/* Placeholder Logo if needed */}
                            <Activity size={32} className="text-teal-600 mb-2 print:text-black" />
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight print:text-3xl">{record.hospitalName || "Hospital Name"}</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-600">
                                Reg No: {record.hospitalRegNo || 'N/A'}
                            </p>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex gap-3 print:text-slate-600">
                                <span>{new Date().toLocaleDateString()}</span>
                                <span>•</span>
                                <span>Doc ID: {record.documentId || record._id.slice(-8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* PATIENT INFO */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-xs">
                        <div className="col-span-2 md:col-span-1">
                            <Label>Patient Name</Label>
                            <Value>{record.patientTitle} {record.patientName}</Value>
                        </div>
                        <div className="col-span-1">
                            <Label>MRN</Label>
                            <Value>{record.mrn}</Value>
                        </div>
                        <div className="col-span-1">
                            <Label>Age / Gender</Label>
                            <Value>{record.age} / {record.gender}</Value>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <Label>Contact</Label>
                            <Value>{record.phone || 'N/A'}</Value>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <Label>Address</Label>
                            <Value>{record.address || 'N/A'}</Value>
                        </div>
                        <div className="col-span-1">
                            <Label>Admission ID</Label>
                            <Value>{record.admissionId}</Value>
                        </div>
                        <div className="col-span-1">
                            <Label>Room / Bed</Label>
                            <Value>{record.roomType || '-'} / {record.bedNo || '-'}</Value>
                        </div>
                    </div>

                    <Divider />

                    {/* DATES & DOCTOR */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl print:bg-transparent print:p-0 print:border print:border-slate-200">
                            <Label>Admission Date</Label>
                            <Value className="text-teal-700 print:text-black">{record.admissionDate ? new Date(record.admissionDate).toLocaleDateString() : 'N/A'}</Value>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl print:bg-transparent print:p-0 print:border print:border-slate-200">
                            <Label>Discharge Date</Label>
                            <Value className="text-rose-700 print:text-black">{record.dischargeDate ? new Date(record.dischargeDate).toLocaleDateString() : 'N/A'}</Value>
                        </div>
                        <div className="col-span-2">
                            <Label>Primary Consultant</Label>
                            <Value className="text-lg">{record.primaryDoctor || 'N/A'}</Value>
                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{record.specialistType || 'Specialist'}</div>
                        </div>
                    </div>

                    <Divider />

                    {/* CLINICAL SUMMARY */}
                    <Section title="Clinical Summary" icon={<FileText size={14} />}>
                        <Field label="Diagnosis" value={record.diagnosis} />
                        <Field label="Chief Complaints" value={record.chiefComplaints} />
                        <Field label="History of Present Illness" value={record.historyOfPresentIllness} />
                        <Field label="Past Medical History" value={record.pastMedicalHistory} />
                        <Field label="Allergies" value={record.allergyHistory} highlight />
                    </Section>

                    {/* VITALS */}
                    {record.vitals && (
                        <Section title="Vitals at Discharge" icon={<Activity size={14} />}>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {Object.entries(record.vitals).map(([key, val]) => (
                                    <div key={key} className="text-center p-2 bg-slate-50 rounded-lg print:border print:border-slate-100">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">{key}</p>
                                        <p className="text-xs font-black text-slate-900">{val as React.ReactNode || '-'}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* TREATMENT & COURSE */}
                    <Section title="Hospital Course & Treatment" icon={<Stethoscope size={14} />}>
                        <Field label="Treatment Given" value={record.treatmentGiven} />
                        <Field label="Hospital Course" value={record.hospitalCourse} />
                        <Field label="Condition at Discharge" value={record.conditionAtDischarge} />
                        <Field label="Investigations Performed" value={record.investigationsPerformed} />
                    </Section>

                    {/* ADVICE */}
                    <Section title="Discharge Advice" icon={<Pill size={14} />}>
                        <Field label="Medications Prescribed" value={record.medicationsPrescribed} className="whitespace-pre-wrap" />
                        <Field label="Diet Instructions" value={record.dietInstructions} />
                        <Field label="Activity Restrictions" value={record.activityRestrictions} />
                        <Field label="Follow-up Instructions" value={record.followUpInstructions} />
                        <Field label="Follow-up Date" value={record.followUpDate ? new Date(record.followUpDate).toLocaleDateString() : ''} />
                        <Field label="Emergency Warning Signs" value={record.warningSigns} highlight />
                    </Section>

                    {/* FOOTER */}
                    <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end print:mt-20">
                        <div className="text-[9px] font-bold text-slate-400 max-w-[200px]">
                            Generated on {new Date().toLocaleString()}<br />
                            This is a computer generated document.
                        </div>
                        <div className="text-right">
                            <div className="h-10 border-b border-dashed border-slate-300 w-32 mb-2 lg:mb-4"></div>
                            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Authorized Signature</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// Sub-components for cleaner code
const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{children}</p>
);

const Value = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <p className={`text-xs font-bold text-slate-900 uppercase break-words ${className}`}>{children}</p>
);

const Divider = () => <div className="h-px bg-slate-100 my-6 print:border-b print:border-slate-100" />;

const Section = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="mb-8 break-inside-avoid">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <div className="text-teal-600 print:text-black">{icon}</div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Field = ({ label, value, className = "", highlight = false }: { label: string, value?: string, className?: string, highlight?: boolean }) => {
    if (!value || value === 'N/A') return null;
    return (
        <div className={`${highlight ? 'p-3 bg-amber-50 rounded-lg border border-amber-100 print:bg-transparent print:border-none print:p-0' : ''}`}>
            <Label>{label}</Label>
            <p className={`text-xs text-slate-700 leading-relaxed ${className}`}>{value}</p>
        </div>
    );
};
