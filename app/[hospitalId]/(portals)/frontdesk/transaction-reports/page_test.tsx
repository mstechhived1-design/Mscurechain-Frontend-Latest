'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Stethoscope, Bed, Pill, Wrench, FlaskConical, CreditCard, Printer, Calendar, Search, Activity, RefreshCw, UserCheck } from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { generateTransactionReportHTML } from '@/lib/utils/print-transaction-report';
import { formatPatientNameWithPrefix, formatPatientDisplayName } from '@/lib/utils/name-utils';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import PatientSearchDropdown from '@/components/shared/PatientSearchDropdown';

interface DoctorCharge { id: string; doctorName: string; specialization: string; rate: number; visits: number; }
interface AdmissionCharge { id: string; chargeType: string; description: string; rate: number; days: number; }
interface MedCharge { id: string; medicineName: string; rate: number; quantity: number; }
interface ServiceCharge { id: string; serviceName: string; rate: number; quantity: number; }
interface DiagCharge { id: string; testName: string; rate: number; quantity: number; }
interface Payment { id: string; receiptNo: string; date: string; mode: string; status: string; amount: number; }

const uid = () => Math.random().toString(36).slice(2, 9);
const genReceipt = () => 'RCP-' + Date.now().toString().slice(-7);
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const cleanString = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '[object Object]' || trimmed === 'object Object') return fallback;
        return trimmed;
    }
    if (typeof val === 'object') {
        return (
            cleanString(val.testName) ||
            cleanString(val.name) ||
            cleanString(val.title) ||
            cleanString(val.description) ||
            cleanString(val.serviceName) ||
            cleanString(val.medicineName) ||
            cleanString(val.doctorName) ||
            cleanString(val.chargeType) ||
            fallback
        );
    }
    return String(val);
};

export const normalizeDoctor = (d: any): DoctorCharge => ({
    id: d?.id || d?._id || uid(),
    doctorName: cleanString(d?.doctorName || d?.name || d?.serviceName, 'Doctor Consultation'),
    specialization: cleanString(d?.specialization, 'Consultant'),
    rate: Number(d?.rate !== undefined ? d?.rate : (d?.amount || 0)),
    visits: Number(d?.visits !== undefined ? d?.visits : (d?.quantity || 1)),
});

export const normalizeAdmission = (a: any): AdmissionCharge => ({
    id: a?.id || a?._id || uid(),
    chargeType: cleanString(a?.chargeType, 'Admission'),
    description: cleanString(a?.description || a?.chargeType, ''),
    rate: Number(a?.rate !== undefined ? a?.rate : (a?.amount || 0)),
    days: Number(a?.days !== undefined ? a?.days : (a?.quantity || 1)),
});

export const normalizeMed = (m: any): MedCharge => ({
    id: m?.id || m?._id || uid(),
    medicineName: cleanString(m?.medicineName || m?.name || m?.description, 'Medicine'),
    rate: Number(m?.rate !== undefined ? m?.rate : (m?.cost || m?.price || m?.amount || 0)),
    quantity: Number(m?.quantity !== undefined ? m?.quantity : 1),
});

export const normalizeService = (s: any): ServiceCharge => ({
    id: s?.id || s?._id || uid(),
    serviceName: cleanString(s?.serviceName || s?.name || s?.description, 'Service Charge'),
    rate: Number(s?.rate !== undefined ? s?.rate : (s?.amount || 0)),
    quantity: Number(s?.quantity !== undefined ? s?.quantity : 1),
});

export const normalizeDiag = (d: any): DiagCharge => ({
    id: d?.id || d?._id || uid(),
    testName: cleanString(d?.testName || d?.name || d?.description || d?.serviceName || d?.test, 'Lab Test'),
    rate: Number(d?.rate !== undefined ? d?.rate : (d?.cost !== undefined ? d?.cost : (d?.amount !== undefined ? d?.amount : 0))),
    quantity: Number(d?.quantity !== undefined ? d?.quantity : 1),
});

// Professional Input Styling for Tables
const tableInputClass = "w-full bg-slate-50 border-0 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20";
const thClass = "text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-3 border-b-2 border-slate-100";
const tableSelectClass = "w-full bg-slate-50 border-0 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20";

const DelBtn = ({ onClick }: { onClick(): void }) => (
    <button type="button" onClick={onClick} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all print:hidden">
        <Trash2 size={14} />
    </button>
);

const AddBtn = ({ onClick }: { onClick(): void }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
    >
        <Plus size={12} className="group-hover:scale-110 transition-transform" />
        Add
    </button>
);

interface CardProps {
    icon: React.ReactNode;
    title: string;
    color: string;
    children: React.ReactNode;
    onAdd: () => void;
    total?: number;
}

const Card = ({ icon, title, color, children, onAdd, total }: CardProps) => {
    const colorMap: any = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100',
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border ${colorMap[color] || colorMap.slate}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{title}</h2>
                        {total !== undefined && (
                            <p className="text-[9px] font-bold text-slate-400">
                                Subtotal: <span className="text-indigo-600 font-black">{fmt(total)}</span>
                            </p>
                        )}
                    </div>
                </div>
                <AddBtn onClick={onAdd} />
            </div>
            <div className="overflow-x-auto p-2">
                {children}
            </div>
        </div>
    );
};

export default function TransactionReportsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const searchParams = useSearchParams() as any;
    const patientId = ((searchParams?.get('patientId') ?? null) ?? null);
    const loadReportId = ((searchParams?.get('loadReport') ?? null) ?? null);

    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [printConfig, setPrintConfig] = useState({
        consultations: true,
        investigations: true,
        wards: true,
        radiology: true,
        services: true,
        pharmacy: true,
        receipts: true
    });

    const [doctors, setDoctors] = useState<DoctorCharge[]>([]);
    const [admissions, setAdmis] = useState<AdmissionCharge[]>([]);
    const [meds, setMeds] = useState<MedCharge[]>([]);
    const [services, setServices] = useState<ServiceCharge[]>([]);
    const [diags, setDiags] = useState<DiagCharge[]>([]);
    const [payments, setPay] = useState<Payment[]>([]);
    const [hospital, setHospital] = useState<any>(null);
    const [patient, setPatient] = useState<any>(null);
    const [admission, setAdmission] = useState<any>(null);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [totalAdmissionsCount, setTotalAdmissionsCount] = useState<number>(0);
    const [hasActiveAdmission, setHasActiveAdmission] = useState<boolean>(true);
    const [isLoadingActive, setIsLoadingActive] = useState<boolean>(false);

    // Persistence: Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`txn_report_${patientId || 'draft'}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setDoctors((data.doctors || []).map(normalizeDoctor));
                setAdmis((data.admissions || []).map(normalizeAdmission));
                setMeds((data.meds || []).map(normalizeMed));
                setServices((data.services || []).map(normalizeService));
                setDiags((data.diags || []).map(normalizeDiag));
                setPay(data.payments || []);
            } catch (e) { console.error("Failed to parse saved draft", e); }
        }
    }, [patientId]);

    // Persistence: Save to localStorage
    useEffect(() => {
        const data = { doctors, admissions, meds, services, diags, payments };
        localStorage.setItem(`txn_report_${patientId || 'draft'}`, JSON.stringify(data));
    }, [doctors, admissions, meds, services, diags, payments, patientId]);

    useEffect(() => {
        hospitalAdminService.getHospital().then(res => setHospital(res?.hospital)).catch(() => { });

        if (patientId) {
            setIsLoadingActive(true);
            setHasActiveAdmission(true);

            helpdeskService.getPatientById(patientId)
                .then(res => setPatient(res))
                .catch(err => {
                    console.error("Failed to fetch patient:", err);
                    toast.error("Could not load patient details");
                });

            Promise.allSettled([
                helpdeskService.getPatientIPDAdmissions(patientId),
                helpdeskService.getPatientVisitHistory(patientId)
            ]).then(([ipdRes, opdRes]) => {
                const ipds = ipdRes.status === 'fulfilled' ? (ipdRes.value?.admissions || (Array.isArray(ipdRes.value) ? ipdRes.value : [])) : [];
                const opds = opdRes.status === 'fulfilled' ? (opdRes.value?.data || (Array.isArray(opdRes.value) ? opdRes.value : [])) : [];
                
                setTotalAdmissionsCount(ipds.length + opds.length);

                if (ipds.length > 0 || opds.length > 0) {
                    if (ipds.length > 0) {
                        const latest = ipds.sort((a: any, b: any) => {
                            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.admissionDate).getTime();
                            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.admissionDate).getTime();
                            return dateB - dateA;
                        })[0];
                        setAdmission(latest);
                    }
                    setHasActiveAdmission(true);

                    if (!loadReportId) {
                        helpdeskService.getIPDFinalBill(patientId).then(res => {
                            if (Array.isArray(res) && res.length > 0) {
                                const r = res[0]; 
                                setDoctors((r.reportData?.doctors || []).map(normalizeDoctor));
                                setAdmis((r.reportData?.admissions || []).map(normalizeAdmission));
                                setMeds((r.reportData?.meds || []).map(normalizeMed));
                                setServices((r.reportData?.services || []).map(normalizeService));
                                setDiags((r.reportData?.diags || []).map(normalizeDiag));
                                setPay(r.reportData?.payments || []);
                            }
                        }).catch(err => console.error("Failed to auto-fetch active bill:", err))
                        .finally(() => setIsLoadingActive(false));
                    } else {
                        setIsLoadingActive(false);
                    }
                } else {
                    setHasActiveAdmission(false);
                    setIsLoadingActive(false);
                }
            });
        }
    }, [patientId, loadReportId]);

    const fetchHistory = useCallback(() => {
        if (!patientId) return;

        const fetchStandard = helpdeskService.getPatientTransactionReports(patientId);
        const fetchAuto = loadReportId?.startsWith('AUTO_BILL_')
            ? helpdeskService.getIPDFinalBill(patientId).catch(() => [])
            : Promise.resolve([]);

        Promise.all([fetchStandard, fetchAuto])
            .then(([standardReports, autoReports]) => {
                const combinedReports = [...standardReports, ...(autoReports as any[])];
                setSavedReports(combinedReports);

                if (loadReportId) {
                    const r = combinedReports.find((x: any) => x._id === loadReportId);
                    if (r) {
                        setDoctors((r.reportData?.doctors || []).map(normalizeDoctor));
                        setAdmis((r.reportData?.admissions || []).map(normalizeAdmission));
                        setMeds((r.reportData?.meds || []).map(normalizeMed));
                        setServices((r.reportData?.services || []).map(normalizeService));
                        setDiags((r.reportData?.diags || []).map(normalizeDiag));
                        setPay(r.reportData?.payments || []);
                        toast.success("Report data loaded from history!");
                    } else {
                        toast.error("Could not find the specified report.");
                    }
                }
            })
            .catch(err => console.error("Failed to fetch history:", err));
    }, [patientId, loadReportId]);

    useEffect(() => {
        if (!patientId) return;
        fetchHistory();
    }, [patientId, fetchHistory]);

    const totDoc = doctors.reduce((s, r) => s + r.rate * r.visits, 0);
    const totAdm = admissions.reduce((s, r) => s + r.rate * r.days, 0);
    const totMed = meds.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totSvc = services.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totDiag = diags.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totPaid = payments.filter(p => p.status === 'Paid' || p.status === 'Completed').reduce((s, r) => s + r.amount, 0);
    const grand = totDoc + totAdm + totMed + totSvc + totDiag;
    const balance = grand - totPaid;

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to print');
            return;
        }

        const h = hospital || { name: 'Hospital Name', address: 'Hospital Address', phone: 'Contact Info' };

        const docRef = 
            patient?.doctorReference || 
            patient?.referredBy || 
            patient?.profile?.doctorReference || 
            patient?.profile?.referredBy || 
            patient?.lastVisit?.doctorReference ||
            patient?.lastVisit?.patientDetails?.doctorReference ||
            patient?.patientDetails?.doctorReference ||
            admission?.doctorReference ||
            admission?.referredBy ||
            '';

        const reportData = { 
            doctors, admissions, meds, services, diags, payments,
            doctorReference: docRef,
            referredBy: docRef,
        };
        const totals = { grandTotal: grand, totalPaid: totPaid, balance: balance, discount: 0 };

        const html = generateTransactionReportHTML(h, patient || {}, admission || {}, reportData, totals, printConfig);

        win.document.write(html);
        win.document.close();

        // Let the iframe/window load resources before printing
        setTimeout(() => {
            win.print();
            win.onafterprint = function () { win.close(); }
        }, 500);
    };

    const isManualReport = loadReportId && !loadReportId.startsWith('AUTO_BILL_');

    const handleSaveReport = async () => {
        if (!patientId) {
            toast.error("Please select a patient first");
            return;
        }

        try {
            setIsSaving(true);
            const reportData = { doctors, admissions, meds, services, diags, payments };
            const totals = { grandTotal: grand, totalPaid: totPaid, balance: balance };

            if (isManualReport) {
                await helpdeskService.updateTransactionReport(loadReportId, {
                    reportData,
                    totals,
                });
                toast.success("Transaction report updated successfully!");
            } else {
                await helpdeskService.saveTransactionReport({
                    patientId,
                    reportData,
                    totals,
                    generatedBy: "frontdesk"
                });
                toast.success("Transaction report saved successfully!");
            }

            fetchHistory();
            localStorage.removeItem(`txn_report_${patientId || 'draft'}`);
        } catch (error) {
            console.error("Failed to save report:", error);
            toast.error("Failed to store report in database");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteReport = async () => {
        if (!isManualReport) return;
        if (!confirm("Are you sure you want to delete this manual report? This cannot be undone.")) return;

        try {
            setIsDeleting(true);
            await helpdeskService.deleteTransactionReport(loadReportId);
            toast.success("Report deleted successfully!");
            router.push(`/${params.hospitalId}/frontdesk/transaction-history`);
        } catch (error) {
            console.error("Failed to delete report:", error);
            toast.error("Failed to delete report");
        } finally {
            setIsDeleting(false);
        }
    };

    const updD = (i: number, k: keyof DoctorCharge, v: any) => setDoctors(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updA = (i: number, k: keyof AdmissionCharge, v: any) => setAdmis(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updM = (i: number, k: keyof MedCharge, v: any) => setMeds(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updS = (i: number, k: keyof ServiceCharge, v: any) => setServices(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updDiag = (i: number, k: keyof DiagCharge, v: any) => setDiags(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const updP = (i: number, k: keyof Payment, v: any) => setPay(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

    return (
        <div className="w-full max-w-[98%] mx-auto space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Financial Statement</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {patient && (
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100/80">
                                    {formatPatientDisplayName(patient)}
                                </span>
                            )}
                            {patientId && totalAdmissionsCount > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                    Admissions: {totalAdmissionsCount} (Showing Latest)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowPatientSearch(!showPatientSearch)}
                            className="h-9 px-3 bg-white text-indigo-600 font-black text-xs rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            {patient ? "Change Patient" : "Select Patient"}
                        </button>
                        {showPatientSearch && (
                            <PatientSearchDropdown
                                onSelect={(p: any) => {
                                    setShowPatientSearch(false);
                                    router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${p._id}`);
                                }}
                                onCancel={() => setShowPatientSearch(false)}
                            />
                        )}
                    </div>
                    <button
                        onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-history`)}
                        className="h-9 px-3 bg-white text-slate-600 font-bold text-xs rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2"
                    >
                        <Search className="w-3.5 h-3.5" />
                        History
                    </button>

                    {isManualReport && (
                        <button
                            onClick={handleDeleteReport}
                            disabled={isDeleting}
                            className="h-9 px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-black text-xs rounded-lg transition-all flex items-center gap-2"
                        >
                            {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                        </button>
                    )}

                    <button
                        onClick={handleSaveReport}
                        disabled={isSaving}
                        className="h-9 px-4 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-xs rounded-lg transition-all flex items-center gap-2"
                    >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isManualReport ? "Update" : "Save"}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="h-9 px-4 bg-indigo-600 text-white hover:bg-indigo-700 font-black text-xs rounded-lg shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                    </button>
                </div>
            </div>

            {!hasActiveAdmission && patientId && !isLoadingActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center animate-in fade-in mt-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UserCheck className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-black text-amber-800 mb-1">No Admission Found</h3>
                    <p className="text-sm font-bold text-amber-600">
                        No admission found so no charges found. Only registered this patient in your hospital.
                    </p>
                </div>
            )}

            {isLoadingActive && (
                <div className="py-20 flex flex-col items-center justify-center mt-6">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fetching active charges...</p>
                </div>
            )}

            {(hasActiveAdmission || !patientId) && !isLoadingActive && (
                <div className="space-y-4">
            {/* Print Configuration Panel */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Config:</div>
                {[
                    { key: 'consultations', label: 'Consultations' },
                    { key: 'investigations', label: 'Investigations' },
                    { key: 'wards', label: 'Wards' },
                    { key: 'radiology', label: 'Radiology' },
                    { key: 'services', label: 'Services' },
                    { key: 'pharmacy', label: 'Pharmacy' },
                    { key: 'receipts', label: 'Receipts' },
                ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-slate-100">
                        <input
                            type="checkbox"
                            checked={printConfig[opt.key as keyof typeof printConfig]}
                            onChange={(e) => setPrintConfig(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                            className="w-3 h-3 rounded text-indigo-600 border-slate-300"
                        />
                        <span className="text-[10px] font-bold text-slate-600">{opt.label}</span>
                    </label>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Card icon={<Stethoscope className="w-4 h-4" />} title="Doctor Consultation Charges" color="indigo" total={totDoc} onAdd={() => setDoctors(p => [...p, { id: uid(), doctorName: '', specialization: '', rate: 0, visits: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Doctor Name', 'Specialization', 'Rate (₹)', 'Visits', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {doctors.map((d, i) => (
                                <tr key={i}>
                                    <td className="p-1"><input value={cleanString(d.doctorName, '')} onChange={(e) => updD(i, 'doctorName', e.target.value)} className={tableInputClass} placeholder="Doctor Name" /></td>
                                    <td className="p-1"><input value={cleanString(d.specialization, '')} onChange={(e) => updD(i, 'specialization', e.target.value)} className={tableInputClass} placeholder="Specialization" /></td>
                                    <td className="p-1"><input type="number" min={0} value={d.rate === 0 ? '' : d.rate} onChange={(e) => updD(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1"><input type="number" min={0} value={d.visits === 0 ? '' : d.visits} onChange={(e) => updD(i, 'visits', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(d.rate * d.visits)}</td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setDoctors(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Bed className="w-4 h-4" />} title="Admission & ICU Stay" color="indigo" total={totAdm} onAdd={() => setAdmis(p => [...p, { id: uid(), chargeType: 'Stay', description: '', rate: 0, days: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Charge Type', 'Description', 'Rate (₹)', 'Days', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {admissions.map((a, i) => (
                                <tr key={i}>
                                    <td className="p-1">
                                        <select value={cleanString(a.chargeType, 'Admission')} onChange={(e) => updA(i, 'chargeType', e.target.value)} className={tableSelectClass}>
                                            {['Admission', 'ICU', 'Ward', 'Emergency', 'OT'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-1"><input value={cleanString(a.description, '')} onChange={(e) => updA(i, 'description', e.target.value)} className={tableInputClass} placeholder="Description" /></td>
                                    <td className="p-1"><input type="number" min={0} value={a.rate === 0 ? '' : a.rate} onChange={(e) => updA(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1"><input type="number" min={0} value={a.days === 0 ? '' : a.days} onChange={(e) => updA(i, 'days', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(a.rate * a.days)}</td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setAdmis(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Pill className="w-4 h-4" />} title="Pharmacy" color="indigo" total={totMed} onAdd={() => setMeds(p => [...p, { id: uid(), medicineName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Medicine Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {meds.map((m, i) => (
                                <tr key={i}>
                                    <td className="p-1"><input value={cleanString(m.medicineName, '')} onChange={(e) => updM(i, 'medicineName', e.target.value)} className={tableInputClass} placeholder="Medicine Name" /></td>
                                    <td className="p-1"><input type="number" min={0} value={m.rate === 0 ? '' : m.rate} onChange={(e) => updM(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1"><input type="number" min={0} value={m.quantity === 0 ? '' : m.quantity} onChange={(e) => updM(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(m.rate * m.quantity)}</td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setMeds(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<Wrench className="w-4 h-4" />} title="Services" color="indigo" total={totSvc} onAdd={() => setServices(p => [...p, { id: uid(), serviceName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Service Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {services.map((s, i) => (
                                <tr key={i}>
                                    <td className="p-1"><input value={cleanString(s.serviceName, '')} onChange={(e) => updS(i, 'serviceName', e.target.value)} className={tableInputClass} placeholder="Service Name" /></td>
                                    <td className="p-1"><input type="number" min={0} value={s.rate === 0 ? '' : s.rate} onChange={(e) => updS(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1"><input type="number" min={0} value={s.quantity === 0 ? '' : s.quantity} onChange={(e) => updS(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(s.rate * s.quantity)}</td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setServices(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<FlaskConical className="w-4 h-4" />} title="Diagnostics" color="indigo" total={totDiag} onAdd={() => setDiags(p => [...p, { id: uid(), testName: '', rate: 0, quantity: 1 }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Test Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {diags.map((d, i) => (
                                <tr key={i}>
                                    <td className="p-1"><input value={cleanString(d.testName, '')} onChange={(e) => updDiag(i, 'testName', e.target.value)} className={tableInputClass} placeholder="Test Name" /></td>
                                    <td className="p-1"><input type="number" min={0} value={d.rate === 0 ? '' : d.rate} onChange={(e) => updDiag(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1"><input type="number" min={0} value={d.quantity === 0 ? '' : d.quantity} onChange={(e) => updDiag(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(d.rate * d.quantity)}</td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setDiags(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card icon={<CreditCard className="w-4 h-4" />} title="Payments" color="emerald" total={totPaid} onAdd={() => setPay(p => [...p, { id: uid(), receiptNo: genReceipt(), date: new Date().toLocaleDateString(), amount: 0, mode: 'Cash', status: 'Paid' }])}>
                    <table className="w-full text-left">
                        <thead><tr>{['Receipt No.', 'Date', 'Payment Mode', 'Status', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                        <tbody>
                            {payments.map((p, i) => (
                                <tr key={i}>
                                    <td className="p-1"><span className="px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black font-mono tracking-tight border border-indigo-100 flex items-center justify-center">{p.receiptNo}</span></td>
                                    <td className="p-1"><input value={p.date} onChange={(e) => updP(i, 'date', e.target.value)} className={tableInputClass} /></td>
                                    <td className="p-1">
                                        <select value={p.mode} onChange={(e) => updP(i, 'mode', e.target.value)} className={tableSelectClass}>
                                            {['Cash', 'Card', 'UPI', 'Bank'].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-1">
                                        <select value={p.status} onChange={(e) => updP(i, 'status', e.target.value)} className={tableSelectClass}>
                                            {['Paid', 'Pending', 'Failed'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-1"><input type="number" min={0} value={p.amount === 0 ? '' : p.amount} onChange={(e) => updP(i, 'amount', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                    <td className="p-1 text-right"><DelBtn onClick={() => setPay(p => p.filter((_, j) => j !== i))} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform hover:scale-110 duration-700 opacity-50"></div>
                    <div className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                            {[
                                ['Doctors', totDoc, 'indigo'], ['Admissions', totAdm, 'emerald'], ['Pharmacy', totMed, 'rose'],
                                ['Services', totSvc, 'slate'], ['Lab Tests', totDiag, 'indigo'], ['Total Paid', totPaid, 'emerald']
                            ].map(([l, v, c]) => (
                                <div key={l as string} className="bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{l as string}</p>
                                    <p className={`text-sm font-black text-slate-700 group-hover:text-${c as string}-600 transition-colors`}>{fmt(v as number)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest leading-none">Final Balance Amount</p>
                                <p className={`text-4xl font-black tracking-tighter ${balance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(balance)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Statement Reconciliation Summary</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            )}
        </div>
    );
}
