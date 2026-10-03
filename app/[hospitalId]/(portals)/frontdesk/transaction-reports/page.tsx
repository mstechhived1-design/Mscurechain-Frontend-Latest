'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Stethoscope, Bed, Pill, Wrench, FlaskConical, CreditCard, Printer, Calendar, Search, Activity, RefreshCw, UserCheck, Save } from 'lucide-react';
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
import { apiClient } from '@/lib/integrations/api/apiClient';

interface DoctorCharge { id: string; code?: string; doctorName: string; specialization: string; rate: number; visits: number; amount?: number; }
interface AdmissionCharge { id: string; code?: string; chargeType: string; description: string; rate: number; days: number; amount?: number; }
interface MedCharge { id: string; code?: string; medicineName: string; rate: number; quantity: number; amount?: number; }
interface ServiceCharge { id: string; code?: string; serviceName: string; rate: number; quantity: number; amount?: number; }
interface DiagCharge { id: string; code?: string; testName: string; rate: number; quantity: number; amount?: number; category?: 'investigation' | 'radiology'; }
interface Payment { id: string; receiptNo: string; date: string; mode: string; status: string; amount: number; paymentDetails?: { cash?: number; upi?: number; card?: number; bankTransfer?: number; }; }

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

export const normalizeDoctor = (d: any, idx: number = 0): DoctorCharge => ({
    id: d?.id || d?._id || uid(),
    code: cleanString(d?.code || d?.serviceCode || (d?._id ? `DOC${d._id.toString().slice(-6).toUpperCase()}` : `DOC${idx + 1}`)),
    doctorName: cleanString(d?.doctorName || d?.name || d?.serviceName, 'Doctor Consultation'),
    specialization: cleanString(d?.specialization, 'Consultant'),
    rate: Number(d?.rate !== undefined ? d?.rate : (d?.amount || 0)),
    visits: Number(d?.visits !== undefined ? d?.visits : (d?.quantity || 1)),
    amount: Number(d?.amount !== undefined ? d?.amount : (Number(d?.rate || 0) * Number(d?.visits || d?.quantity || 1))),
});

export const normalizeAdmission = (a: any, idx: number = 0): AdmissionCharge => ({
    id: a?.id || a?._id || uid(),
    code: cleanString(a?.code || a?.chargeCode || (a?._id ? `BED${a._id.toString().slice(-6).toUpperCase()}` : `BED${idx + 1}`)),
    chargeType: cleanString(a?.chargeType, 'Admission'),
    description: cleanString(a?.description || a?.roomType || a?.bedType, 'Stay Charges'),
    rate: Number(a?.rate !== undefined ? a?.rate : (a?.amount || 0)),
    days: Number(a?.days !== undefined ? a?.days : (a?.quantity || 1)),
    amount: Number(a?.amount !== undefined ? a?.amount : (Number(a?.rate || 0) * Number(a?.days || a?.quantity || 1))),
});

export const normalizeMed = (m: any, idx: number = 0): MedCharge => ({
    id: m?.id || m?._id || uid(),
    code: cleanString(m?.code || m?.itemCode || (m?._id ? `MED${m._id.toString().slice(-6).toUpperCase()}` : `MED${idx + 1}`)),
    medicineName: cleanString(m?.medicineName || m?.name, 'Medicine'),
    rate: Number(m?.rate !== undefined ? m?.rate : (m?.amount || 0)),
    quantity: Number(m?.quantity !== undefined ? m?.quantity : 1),
    amount: Number(m?.amount !== undefined ? m?.amount : (Number(m?.rate || 0) * Number(m?.quantity || 1))),
});

export const normalizeService = (s: any, idx: number = 0): ServiceCharge => ({
    id: s?.id || s?._id || uid(),
    code: cleanString(s?.code || s?.serviceCode || (s?._id ? `SVC${s._id.toString().slice(-6).toUpperCase()}` : `SVC${idx + 1}`)),
    serviceName: cleanString(s?.serviceName || s?.name || s?.description, 'Service Charge'),
    rate: Number(s?.rate !== undefined ? s?.rate : (s?.amount || 0)),
    quantity: Number(s?.quantity !== undefined ? s?.quantity : 1),
    amount: Number(s?.amount !== undefined ? s?.amount : (Number(s?.rate || 0) * Number(s?.quantity || 1))),
});

export const normalizeDiag = (d: any, idx: number = 0, defaultCategory: 'investigation' | 'radiology' = 'investigation'): DiagCharge => {
    const isRad = defaultCategory === 'radiology' ||
        d?.category === 'radiology' ||
        d?.isRadiology ||
        /x-ray|xray|mri|ct\s|scan|ultrasound|usg|radiology/i.test(d?.testName || d?.name || '');
    return {
        id: d?.id || d?._id || uid(),
        code: cleanString(d?.code || d?.testCode || (d?._id ? (isRad ? `RAD${d._id.toString().slice(-6).toUpperCase()}` : `LAB${d._id.toString().slice(-6).toUpperCase()}`) : (isRad ? `RAD${idx + 1}` : `LAB${idx + 1}`))),
        testName: cleanString(d?.testName || d?.name || d?.description || d?.serviceName || d?.test, isRad ? 'Radiology Scan' : 'Lab Test'),
        rate: Number(d?.rate !== undefined ? d?.rate : (d?.cost !== undefined ? d?.cost : (d?.amount !== undefined ? d?.amount : 0))),
        quantity: Number(d?.quantity !== undefined ? d?.quantity : 1),
        amount: Number(d?.amount !== undefined ? d?.amount : (Number(d?.rate || d?.cost || 0) * Number(d?.quantity || 1))),
        category: isRad ? 'radiology' : 'investigation',
    };
};

// Professional Input Styling for Tables
const tableInputClass = "w-full bg-slate-50 border-0 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20";
const thClass = "text-left text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 sm:px-3 py-2 sm:py-3 border-b-2 border-slate-100";
const tableSelectClass = "w-full bg-slate-50 border-0 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20";

const DelBtn = ({ onClick }: { onClick(): void }) => (
    <button type="button" onClick={onClick} className="p-1 sm:p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all print:hidden">
        <Trash2 size={13} />
    </button>
);

const AddBtn = ({ onClick }: { onClick(): void }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 border-2 border-dashed border-slate-200 text-slate-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-lg hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
    >
        <Plus size={11} className="group-hover:scale-110 transition-transform" />
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
            <div className="p-2.5 sm:p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-xs border ${colorMap[color] || colorMap.slate}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider">{title}</h2>
                        {total !== undefined && (
                            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400">Subtotal: <span className="text-indigo-600 font-extrabold">{fmt(total)}</span></p>
                        )}
                    </div>
                </div>
                <AddBtn onClick={onAdd} />
            </div>
            <div className="overflow-x-auto p-1.5 sm:p-2">
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
    const [discount, setDiscount] = useState<number>(0);
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

    // Edit Doctor State
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
    const [isUpdatingDoctor, setIsUpdatingDoctor] = useState(false);

    const openDoctorModal = async () => {
        if (!admission || !admission._id) {
            toast.error("No active appointment/admission to update.");
            return;
        }
        try {
            const res = await hospitalAdminService.getDoctors() as any;
            setAvailableDoctors(res.doctors || res.data || res || []);
            setShowDoctorModal(true);
        } catch (error) {
            toast.error("Failed to fetch doctors");
        }
    };

    const handleDoctorUpdate = async (doctorId: string) => {
        if (!doctorId) return;
        setIsUpdatingDoctor(true);
        try {
            if (patientType === 'IPD' && admission?._id) {
                await apiClient(`/ipd/admissions/${admission._id}`, { method: 'PATCH', body: JSON.stringify({ primaryDoctor: doctorId }) });
            } else if (patientType === 'OPD' && admission?._id) {
                await apiClient(`/appointments/${admission._id}/doctor`, { method: 'PATCH', body: JSON.stringify({ doctorId }) });
            } else {
                toast.error("Cannot determine appointment type.");
                return;
            }
            toast.success("Attending doctor updated successfully!");
            setShowDoctorModal(false);
            
            // Update local state so UI reflects it immediately
            const selectedDoc = availableDoctors.find(d => (d._id || d.id) === doctorId);
            if (selectedDoc) {
                const newDocName = selectedDoc.user?.name || selectedDoc.name;
                setDoctors(prev => {
                    const newDocs = [...prev];
                    if (newDocs.length > 0) {
                        newDocs[0].doctorName = newDocName;
                        newDocs[0].specialization = selectedDoc.specialization || newDocs[0].specialization;
                    }
                    return newDocs;
                });
                if (admission) {
                    setAdmission({
                        ...admission,
                        primaryDoctor: selectedDoc,
                        doctor: selectedDoc,
                        doctorReference: newDocName
                    });
                }
            }
            
            fetchHistory(); // Refresh to pull updated history if applicable
        } catch (error) {
            toast.error("Failed to update doctor");
            console.error(error);
        } finally {
            setIsUpdatingDoctor(false);
        }
    };
    const [patientType, setPatientType] = useState<'IPD' | 'OPD' | null>(null);
    const [availableEncounters, setAvailableEncounters] = useState<{
        ipd: any | null;
        opd: any | null;
    }>({ ipd: null, opd: null });
    const [activeEncounterType, setActiveEncounterType] = useState<'IPD' | 'OPD'>('IPD');

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
                setDiags([...(data.diags || []), ...(data.rads || [])].map((x: any, i: number) => normalizeDiag(x, i, x.category || 'investigation')));
                setPay(data.payments || []);
                setDiscount(data.discount || 0);
                if (data.printConfig) setPrintConfig(prev => ({ ...prev, ...data.printConfig }));
            } catch (e) { console.error("Failed to parse saved draft", e); }
        }
    }, [patientId]);

    // Persistence: Save to localStorage
    useEffect(() => {
        const data = { doctors, admissions, meds, services, diags, payments, discount, printConfig };
        localStorage.setItem(`txn_report_${patientId || 'draft'}`, JSON.stringify(data));
    }, [doctors, admissions, meds, services, diags, payments, discount, printConfig, patientId]);

    const loadEncounterData = useCallback(async (type: 'IPD' | 'OPD', ipdRecord?: any) => {
        if (!patientId) return;
        setIsLoadingActive(true);
        setActiveEncounterType(type);
        setPatientType(type);

        if (type === 'IPD') {
            const targetAdmission = ipdRecord || availableEncounters.ipd;
            if (targetAdmission) setAdmission(targetAdmission);
            try {
                const ipdBill = await helpdeskService.getIPDFinalBill(patientId);
                if (Array.isArray(ipdBill) && ipdBill.length > 0) {
                    const r = ipdBill[0];
                    setDoctors((r.reportData?.doctors || []).map(normalizeDoctor));
                    setAdmis((r.reportData?.admissions || []).map(normalizeAdmission));
                    setMeds((r.reportData?.meds || []).map(normalizeMed));
                    setServices((r.reportData?.services || []).map(normalizeService));
                    setDiags([
                        ...(r.reportData?.diags || []).map((x: any, i: number) => normalizeDiag(x, i, 'investigation')),
                        ...(r.reportData?.rads || []).map((x: any, i: number) => normalizeDiag(x, i, 'radiology'))
                    ]);
                    setPay(r.reportData?.payments || []);
                    setDiscount(r.totals?.discount || 0);
                    if (r.admission) setAdmission(r.admission);
                } else {
                    setDoctors([]);
                    setAdmis([]);
                    setMeds([]);
                    setServices([]);
                    setDiags([]);
                    setPay([]);
                    setDiscount(0);
                }
            } catch (err) {
                console.error("Failed to load IPD bill:", err);
            } finally {
                setIsLoadingActive(false);
            }
        } else {
            // OPD
            setAdmission(null);
            try {
                const opdBill = await helpdeskService.getOPDFinalBill(patientId, true);
                if (Array.isArray(opdBill) && opdBill.length > 0) {
                    const r = opdBill[0];
                    setDoctors((r.reportData?.doctors || []).map(normalizeDoctor));
                    setAdmis([]);
                    setMeds((r.reportData?.meds || []).map(normalizeMed));
                    setServices((r.reportData?.services || []).map(normalizeService));
                    setDiags([
                        ...(r.reportData?.diags || []).map((x: any, i: number) => normalizeDiag(x, i, 'investigation')),
                        ...(r.reportData?.rads || []).map((x: any, i: number) => normalizeDiag(x, i, 'radiology'))
                    ]);
                    setPay(r.reportData?.payments || []);
                    setDiscount(r.totals?.discount || 0);
                } else {
                    setDoctors([]);
                    setAdmis([]);
                    setMeds([]);
                    setServices([]);
                    setDiags([]);
                    setPay([]);
                    setDiscount(0);
                }
            } catch (err) {
                console.error("Failed to load OPD bill:", err);
            } finally {
                setIsLoadingActive(false);
            }
        }
    }, [patientId, availableEncounters.ipd]);

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

                let latestIPD: any = null;
                if (ipds.length > 0) {
                    latestIPD = ipds.sort((a: any, b: any) => {
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.admissionDate).getTime();
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.admissionDate).getTime();
                        return dateB - dateA;
                    })[0];
                }

                let latestOPD: any = null;
                if (opds.length > 0) {
                    latestOPD = opds.sort((a: any, b: any) => {
                        const dateB = b.date ? new Date(b.date).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                        const dateA = a.date ? new Date(a.date).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                        return dateB - dateA;
                    })[0];
                }

                setAvailableEncounters({ ipd: latestIPD, opd: latestOPD });

                if (!loadReportId) {
                    if (latestIPD) {
                        // Patient is admitted in IPD -> Load IPD only
                        loadEncounterData('IPD', latestIPD);
                    } else {
                        // Patient is OPD -> Load latest OPD only
                        loadEncounterData('OPD');
                    }
                } else {
                    setIsLoadingActive(false);
                }
            });
        }
    }, [patientId, loadReportId, loadEncounterData]);

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
                        setDiags([
                            ...(r.reportData?.diags || []).map((x: any, i: number) => normalizeDiag(x, i, 'investigation')),
                            ...(r.reportData?.rads || []).map((x: any, i: number) => normalizeDiag(x, i, 'radiology'))
                        ]);
                        setPay(r.reportData?.payments || []);
                        setDiscount(r.totals?.discount || 0);
                        if (r.reportData?.printConfig) setPrintConfig(prev => ({ ...prev, ...r.reportData.printConfig }));
                        if (r.admission) setAdmission(r.admission);
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

    const totDoc = doctors.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.visits), 0);
    const totAdm = admissions.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.days), 0);
    const totMed = meds.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.quantity), 0);
    const totSvc = services.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.quantity), 0);
    const totDiag = diags.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.quantity), 0);
    const totPaid = payments.filter(p => !p.status || p.status === 'Paid' || p.status === 'Completed').reduce((s, r) => s + Number(r.amount || 0), 0);

    const visibleDiags = diags.filter(d =>
        d.category === 'radiology' ? printConfig.radiology : printConfig.investigations
    );
    const totDiagActive = visibleDiags.reduce((s, r) => s + (r.amount != null ? r.amount : r.rate * r.quantity), 0);

    const activeTotDoc = printConfig.consultations ? totDoc : 0;
    const activeTotAdm = (patientType !== 'OPD' && printConfig.wards) ? totAdm : 0;
    const activeTotMed = printConfig.pharmacy ? totMed : 0;
    const activeTotSvc = printConfig.services ? totSvc : 0;
    const activeTotDiag = totDiagActive;
    const activeTotPaid = printConfig.receipts ? totPaid : 0;

    const grand = activeTotDoc + activeTotAdm + activeTotMed + activeTotSvc + activeTotDiag;
    const rawBalance = grand - discount - activeTotPaid;
    const balance = (rawBalance < 0 && rawBalance > -1) ? 0 : rawBalance;

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) {
            alert('Please allow popups to print');
            return;
        }

        const h = hospital || { name: 'Hospital Name', address: 'Hospital Address', phone: 'Contact Info' };

        const currentAdm = activeEncounterType === 'IPD' ? (admission || availableEncounters.ipd || {}) : (admission || {});

        const docRef =
            patient?.doctorReference ||
            patient?.referredBy ||
            patient?.profile?.doctorReference ||
            patient?.profile?.referredBy ||
            patient?.lastVisit?.doctorReference ||
            patient?.lastVisit?.patientDetails?.doctorReference ||
            patient?.patientDetails?.doctorReference ||
            currentAdm?.doctorReference ||
            currentAdm?.referredBy ||
            '';

        const activeDiags = diags.filter(d =>
            d.category === 'radiology' ? printConfig.radiology : printConfig.investigations
        );
        const reportData = {
            doctors: printConfig.consultations ? doctors : [],
            admissions: (patientType !== 'OPD' && printConfig.wards) ? admissions : [],
            meds: printConfig.pharmacy ? meds : [],
            services: printConfig.services ? services : [],
            diags: printConfig.investigations ? activeDiags.filter(d => d.category !== 'radiology') : [],
            rads: printConfig.radiology ? activeDiags.filter(d => d.category === 'radiology') : [],
            payments: printConfig.receipts ? payments : [],
            doctorReference: docRef,
            referredBy: docRef,
        };
        const totals = { grandTotal: grand, totalPaid: activeTotPaid, balance: balance, discount: discount };
        const html = generateTransactionReportHTML(h, patient || {}, currentAdm, reportData, totals, printConfig);

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
                isOPD: patientType === 'OPD',
                printConfig,
                doctorReference: docRef,
                referredBy: docRef,
            };
            const totals = { grandTotal: grand, totalPaid: activeTotPaid, balance: balance, discount: discount };

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

    const updD = (i: number, k: keyof DoctorCharge, v: any) => setDoctors(p => p.map((x, j) => { if (j !== i) return x; const nx = { ...x, [k]: v }; if (k === 'rate' || k === 'visits') nx.amount = nx.rate * nx.visits; return nx; }));
    const updA = (i: number, k: keyof AdmissionCharge, v: any) => setAdmis(p => p.map((x, j) => { if (j !== i) return x; const nx = { ...x, [k]: v }; if (k === 'rate' || k === 'days') nx.amount = nx.rate * nx.days; return nx; }));
    const updM = (i: number, k: keyof MedCharge, v: any) => setMeds(p => p.map((x, j) => { if (j !== i) return x; const nx = { ...x, [k]: v }; if (k === 'rate' || k === 'quantity') nx.amount = nx.rate * nx.quantity; return nx; }));
    const updS = (i: number, k: keyof ServiceCharge, v: any) => setServices(p => p.map((x, j) => { if (j !== i) return x; const nx = { ...x, [k]: v }; if (k === 'rate' || k === 'quantity') nx.amount = nx.rate * nx.quantity; return nx; }));
    const updDiag = (i: number, k: keyof DiagCharge, v: any) => setDiags(p => p.map((x, j) => { if (j !== i) return x; const nx = { ...x, [k]: v }; if (k === 'rate' || k === 'quantity') nx.amount = nx.rate * nx.quantity; return nx; }));
    const updP = (i: number, k: keyof Payment, v: any) => setPay(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

    return (
        <div className="w-full max-w-[98%] mx-auto space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="bg-white p-2.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3.5">
                {/* Main Top Row: Title, Badges, and Action Buttons Toolbar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-4">
                    {/* Title & Badges */}
                    <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                        <div className="w-8 h-8 sm:w-11 sm:h-11 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-xs sm:shadow-md shadow-indigo-500/20 shrink-0">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h1 className="text-xs sm:text-xl font-black text-slate-900 tracking-tight leading-none">Financial Statement</h1>
                            {patient && (
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 sm:px-2.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-indigo-100/80">
                                    {formatPatientDisplayName(patient)}
                                </span>
                            )}
                            {patientType && (
                                <span className={`px-1.5 sm:px-2.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-wider border ${patientType === 'IPD' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                    {patientType}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Toolbar (PhonePe / Swiggy App Style Compact Pill Action Bar) */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 py-0.5 w-full xl:w-auto shrink-0 relative z-30">
                        {patientId && (
                            <button
                                onClick={() => {
                                    setPatient(null);
                                    setAdmission(null);
                                    setDoctors([]);
                                    setAdmis([]);
                                    setMeds([]);
                                    setServices([]);
                                    setDiags([]);
                                    setPay([]);
                                    setDiscount(0);
                                    setTotalAdmissionsCount(0);
                                    setPatientType(null);
                                    router.push(`/${params.hospitalId}/frontdesk/transaction-reports`);
                                }}
                                className="h-7 sm:h-9 px-2 sm:px-3 bg-white text-rose-600 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl border border-rose-200 hover:bg-rose-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            >
                                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Clear</span>
                            </button>
                        )}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowPatientSearch(!showPatientSearch)}
                                className="h-7 sm:h-9 px-2 sm:px-3.5 bg-white text-indigo-600 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                                <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>{patient ? "Change" : "Select"}</span>
                                <span className="hidden sm:inline">Patient</span>
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
                        {patientId && (
                            <button
                                onClick={openDoctorModal}
                                className="h-7 sm:h-9 px-2 sm:px-3.5 bg-white text-emerald-600 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                                <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Change Doctor</span>
                            </button>
                        )}
                        <button
                            onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-history`)}
                            className="h-7 sm:h-9 px-2 sm:px-3.5 bg-white text-slate-700 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        >
                            <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>History</span>
                        </button>

                        {isManualReport && (
                            <button
                                onClick={handleDeleteReport}
                                disabled={isDeleting}
                                className="h-7 sm:h-9 px-2 sm:px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            >
                                {isDeleting ? <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                <span>Delete</span>
                            </button>
                        )}

                        <button
                            onClick={handleSaveReport}
                            disabled={isSaving}
                            className="h-7 sm:h-9 px-2.5 sm:px-4 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl transition-all flex items-center gap-1 shrink-0 shadow-2xs shadow-emerald-600/20 cursor-pointer"
                        >
                            {isSaving ? <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            <span>{isManualReport ? "Update" : "Save"}</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            className="h-7 sm:h-9 px-2.5 sm:px-4.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[9px] sm:text-xs rounded-lg sm:rounded-xl shadow-2xs shadow-indigo-600/20 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                            <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>Print</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Row (Second Header): Encounter Tabs, Dynamic Status in Center, and Visit Stats */}
                {patientId && (availableEncounters.ipd || availableEncounters.opd || totalAdmissionsCount > 0) && (
                    <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 sm:gap-3">
                        {/* Left: Encounter Switcher */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Encounter:</span>
                            {availableEncounters.ipd && availableEncounters.opd ? (
                                <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-100 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => loadEncounterData('IPD', availableEncounters.ipd)}
                                        className={`flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeEncounterType === 'IPD'
                                                ? 'bg-rose-600 text-white shadow-2xs ring-1 ring-rose-500'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                            }`}
                                    >
                                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${activeEncounterType === 'IPD' ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
                                        <span>IPD Stay <span className="hidden sm:inline">({availableEncounters.ipd.admissionId || 'Admission'})</span></span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => loadEncounterData('OPD')}
                                        className={`flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeEncounterType === 'OPD'
                                                ? 'bg-orange-600 text-white shadow-2xs ring-1 ring-orange-500'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                            }`}
                                    >
                                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${activeEncounterType === 'OPD' ? 'bg-white animate-pulse' : 'bg-orange-500'}`} />
                                        <span>OPD Visit ({new Date(availableEncounters.opd.date || availableEncounters.opd.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})</span>
                                    </button>
                                </div>
                            ) : availableEncounters.ipd ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500" />
                                    <span>IPD Stay ({availableEncounters.ipd.admissionId || 'Admission'})</span>
                                </span>
                            ) : availableEncounters.opd ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-orange-500" />
                                    <span>OPD Visit ({new Date(availableEncounters.opd.date || availableEncounters.opd.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})</span>
                                </span>
                            ) : null}
                        </div>

                        {/* Center: Dynamic Discharge / Active Status Badge */}
                        <div className="flex items-center justify-center">
                            {patientType === 'IPD' && (() => {
                                const currentAdm = admission || availableEncounters.ipd;
                                const isDischarged = currentAdm?.status === 'Discharged';
                                const isDischargeInitiated = currentAdm?.status === 'Discharge Initiated' && !isDischarged;
                                const dischargeDateFormatted = currentAdm?.dischargeDate
                                    ? new Date(currentAdm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : (currentAdm?.updatedAt && isDischarged ? new Date(currentAdm.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

                                if (isDischarged) {
                                    return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                            <span>Discharge Complete {dischargeDateFormatted ? `(${dischargeDateFormatted})` : ''}</span>
                                        </span>
                                    );
                                }
                                if (isDischargeInitiated) {
                                    return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span>Discharge Initiated <span className="hidden sm:inline">(Pending Processing)</span></span>
                                        </span>
                                    );
                                }
                                return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Active IPD {currentAdm?.bedNumber ? `(Bed ${currentAdm.bedNumber})` : ''}</span>
                                    </span>
                                );
                            })()}

                            {patientType === 'OPD' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                    <span>Active OPD (Outpatient)</span>
                                </span>
                            )}
                        </div>

                        {/* Right: Total Visits Count */}
                        {totalAdmissionsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200/80 shadow-2xs">
                                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500" />
                                <span>Visits: <strong className="font-black text-slate-800">{totalAdmissionsCount}</strong> <span className="hidden sm:inline">(Showing Latest Only)</span></span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {patient && !isLoadingActive && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex items-start gap-2.5 sm:gap-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs sm:shadow-md shadow-emerald-500/20 mt-0.5">
                        <Save className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-[9px] sm:text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                                Notice &bull; Save Report
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 text-[8px] sm:text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                                Archive
                            </span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-semibold text-emerald-900 leading-snug sm:leading-relaxed">
                            Once all transactions and charges are finalized, please make sure to click <strong className="font-black text-emerald-950 underline decoration-emerald-500">Save</strong> to permanently record this report under <strong className="font-black text-emerald-950">History</strong>.
                        </p>
                    </div>
                </div>
            )}

            {!hasActiveAdmission && patientId && !isLoadingActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-center animate-in fade-in mt-4 sm:mt-6">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                    </div>
                    <h3 className="text-sm sm:text-lg font-black text-amber-800 mb-0.5">No Admission Found</h3>
                    <p className="text-xs sm:text-sm font-bold text-amber-600">
                        No IPD admission found, but you can add OPD charges below.
                    </p>
                </div>
            )}

            {isLoadingActive && (
                <div className="py-12 sm:py-20 flex flex-col items-center justify-center mt-4 sm:mt-6">
                    <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 animate-spin mb-2 sm:mb-3" />
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Fetching active charges...</p>
                </div>
            )}

            {(hasActiveAdmission || !patientId) && !isLoadingActive && (
                <div className="space-y-3 sm:space-y-4">
                    {/* Print Configuration Panel */}
                    <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200/60 shadow-2xs flex flex-wrap gap-1.5 sm:gap-3 items-center">
                        <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Config:</div>
                        {[
                            { key: 'consultations', label: 'Consultations' },
                            { key: 'investigations', label: 'Investigations' },
                            { key: 'wards', label: 'Wards' },
                            { key: 'radiology', label: 'Radiology' },
                            { key: 'services', label: 'Services' },
                            { key: 'pharmacy', label: 'Pharmacy' },
                            { key: 'receipts', label: 'Receipts' },
                        ].map(opt => {
                            const isChecked = printConfig[opt.key as keyof typeof printConfig];
                            return (
                                <label
                                    key={opt.key}
                                    className={`flex items-center gap-1 sm:gap-1.5 cursor-pointer px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-all select-none ${isChecked
                                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-2xs font-bold'
                                            : 'bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 font-medium'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => setPrintConfig(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                                    />
                                    <span className="text-[9px] sm:text-[10px]">{opt.label}</span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {printConfig.consultations && (
                            <Card icon={<Stethoscope className="w-4 h-4" />} title="Doctor Consultation Charges" color="indigo" total={totDoc} onAdd={() => setDoctors(p => [...p, { id: uid(), code: `DOC${p.length + 1}`, doctorName: '', specialization: '', rate: 0, visits: 1 }])}>
                                <table className="w-full text-left">
                                    <thead><tr>{['Doctor Name', 'Specialization', 'Rate (₹)', 'Visits', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {doctors.map((d, i) => (
                                            <tr key={i}>
                                                <td className="p-1"><input value={d.doctorName || ''} onChange={(e) => updD(i, 'doctorName', e.target.value)} className={tableInputClass} placeholder="Doctor Name" /></td>
                                                <td className="p-1"><input value={d.specialization || ''} onChange={(e) => updD(i, 'specialization', e.target.value)} className={tableInputClass} placeholder="Specialization" /></td>
                                                <td className="p-1"><input type="number" min={0} value={d.rate === 0 ? '' : d.rate} onChange={(e) => updD(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                                <td className="p-1"><input type="number" min={0} value={d.visits === 0 ? '' : d.visits} onChange={(e) => updD(i, 'visits', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                                <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(d.amount != null ? d.amount : d.rate * d.visits)}</td>
                                                <td className="p-1 text-right"><DelBtn onClick={() => setDoctors(p => p.filter((_, j) => j !== i))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {patientType !== 'OPD' && printConfig.wards && (
                            <Card icon={<Bed className="w-4 h-4" />} title="Admission & ICU Stay" color="indigo" total={totAdm} onAdd={() => setAdmis(p => [...p, { id: uid(), code: `BED${p.length + 1}`, chargeType: 'Stay', description: '', rate: 0, days: 1 }])}>
                                <table className="w-full text-left">
                                    <thead><tr>{['Charge Type', 'Description', 'Rate (₹)', 'Days', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {admissions.map((a, i) => (
                                            <tr key={i}>
                                                <td className="p-1">
                                                    <select value={a.chargeType || 'Admission'} onChange={(e) => updA(i, 'chargeType', e.target.value)} className={tableSelectClass}>
                                                        {['Admission', 'ICU', 'Ward', 'Emergency', 'OT'].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-1"><input value={a.description || ''} onChange={(e) => updA(i, 'description', e.target.value)} className={tableInputClass} placeholder="Description" /></td>
                                                <td className="p-1"><input type="number" min={0} value={a.rate === 0 ? '' : a.rate} onChange={(e) => updA(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                                <td className="p-1"><input type="number" min={0} value={a.days === 0 ? '' : a.days} onChange={(e) => updA(i, 'days', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                                <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(a.amount != null ? a.amount : a.rate * a.days)}</td>
                                                <td className="p-1 text-right"><DelBtn onClick={() => setAdmis(p => p.filter((_, j) => j !== i))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {printConfig.pharmacy && (
                            <Card icon={<Pill className="w-4 h-4" />} title="Pharmacy" color="indigo" total={totMed} onAdd={() => setMeds(p => [...p, { id: uid(), code: `MED${p.length + 1}`, medicineName: '', rate: 0, quantity: 1 }])}>
                                <table className="w-full text-left">
                                    <thead><tr>{['Medicine Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {meds.map((m, i) => (
                                            <tr key={i}>
                                                <td className="p-1"><input value={m.medicineName || ''} onChange={(e) => updM(i, 'medicineName', e.target.value)} className={tableInputClass} placeholder="Medicine Name" /></td>
                                                <td className="p-1"><input type="number" min={0} value={m.rate === 0 ? '' : m.rate} onChange={(e) => updM(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                                <td className="p-1"><input type="number" min={0} value={m.quantity === 0 ? '' : m.quantity} onChange={(e) => updM(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                                <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(m.amount != null ? m.amount : m.rate * m.quantity)}</td>
                                                <td className="p-1 text-right"><DelBtn onClick={() => setMeds(p => p.filter((_, j) => j !== i))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {printConfig.services && (
                            <Card icon={<Wrench className="w-4 h-4" />} title="Services" color="indigo" total={totSvc} onAdd={() => setServices(p => [...p, { id: uid(), code: `SVC${p.length + 1}`, serviceName: '', rate: 0, quantity: 1 }])}>
                                <table className="w-full text-left">
                                    <thead><tr>{['Service Name', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {services.map((s, i) => (
                                            <tr key={i}>
                                                <td className="p-1"><input value={s.serviceName || ''} onChange={(e) => updS(i, 'serviceName', e.target.value)} className={tableInputClass} placeholder="Service Name" /></td>
                                                <td className="p-1"><input type="number" min={0} value={s.rate === 0 ? '' : s.rate} onChange={(e) => updS(i, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                                <td className="p-1"><input type="number" min={0} value={s.quantity === 0 ? '' : s.quantity} onChange={(e) => updS(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                                <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(s.amount != null ? s.amount : s.rate * s.quantity)}</td>
                                                <td className="p-1 text-right"><DelBtn onClick={() => setServices(p => p.filter((_, j) => j !== i))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {(printConfig.investigations || printConfig.radiology) && (
                            <Card icon={<FlaskConical className="w-4 h-4" />} title={`Diagnostics ${!printConfig.investigations ? '(Radiology Only)' : !printConfig.radiology ? '(Investigations Only)' : ''}`} color="indigo" total={totDiagActive} onAdd={() => setDiags(p => [...p, { id: uid(), code: printConfig.investigations ? `LAB${p.length + 1}` : `RAD${p.length + 1}`, testName: '', rate: 0, quantity: 1, category: printConfig.investigations ? 'investigation' : 'radiology' }])}>
                                <table className="w-full text-left">
                                    <thead><tr>{['Test / Scan Name', 'Type', 'Rate (₹)', 'Quantity', 'Amount', ''].map(h => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {visibleDiags.map((d, i) => {
                                            const realIndex = diags.findIndex(item => item.id === d.id);
                                            const idx = realIndex >= 0 ? realIndex : i;
                                            return (
                                                <tr key={d.id || i}>
                                                    <td className="p-1"><input value={d.testName || ''} onChange={(e) => updDiag(idx, 'testName', e.target.value)} className={tableInputClass} placeholder="Test Name" /></td>
                                                    <td className="p-1">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${d.category === 'radiology' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                            {d.category === 'radiology' ? 'Radiology' : 'Investigation'}
                                                        </span>
                                                    </td>
                                                    <td className="p-1"><input type="number" min={0} value={d.rate === 0 ? '' : d.rate} onChange={(e) => updDiag(idx, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" /></td>
                                                    <td className="p-1"><input type="number" min={0} value={d.quantity === 0 ? '' : d.quantity} onChange={(e) => updDiag(idx, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="1" /></td>
                                                    <td className="p-1 px-3 text-xs font-black text-slate-700">{fmt(d.amount != null ? d.amount : d.rate * d.quantity)}</td>
                                                    <td className="p-1 text-right"><DelBtn onClick={() => setDiags(p => p.filter(item => item.id !== d.id))} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {printConfig.receipts && (
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
                                                        {['Cash', 'Card', 'UPI', 'Bank', 'Mixed'].map(m => <option key={m}>{m}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-1">
                                                    <select value={p.status} onChange={(e) => updP(i, 'status', e.target.value)} className={tableSelectClass}>
                                                        {['Paid', 'Pending', 'Failed'].map(s => <option key={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-1 align-top">
                                                    <input type="number" min={0} value={p.amount === 0 ? '' : p.amount} onChange={(e) => updP(i, 'amount', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className={tableInputClass} placeholder="0" />
                                                    {p.mode === 'Mixed' && (
                                                        <div className="grid grid-cols-2 gap-1 mt-1 p-1 bg-slate-50 border border-slate-100 rounded-md">
                                                            <div><label className="text-[8px] text-slate-400 font-bold ml-0.5">CASH</label><input type="number" value={p.paymentDetails?.cash || ''} onChange={(e) => { const nd = { ...(p.paymentDetails || { cash: 0, upi: 0, card: 0, bankTransfer: 0 }), cash: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setPay(prev => prev.map((x, j) => j === i ? { ...x, paymentDetails: nd, amount: (nd.cash || 0) + (nd.upi || 0) + (nd.card || 0) + (nd.bankTransfer || 0) } : x)); }} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
                                                            <div><label className="text-[8px] text-slate-400 font-bold ml-0.5">UPI</label><input type="number" value={p.paymentDetails?.upi || ''} onChange={(e) => { const nd = { ...(p.paymentDetails || { cash: 0, upi: 0, card: 0, bankTransfer: 0 }), upi: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setPay(prev => prev.map((x, j) => j === i ? { ...x, paymentDetails: nd, amount: (nd.cash || 0) + (nd.upi || 0) + (nd.card || 0) + (nd.bankTransfer || 0) } : x)); }} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
                                                            <div><label className="text-[8px] text-slate-400 font-bold ml-0.5">CARD</label><input type="number" value={p.paymentDetails?.card || ''} onChange={(e) => { const nd = { ...(p.paymentDetails || { cash: 0, upi: 0, card: 0, bankTransfer: 0 }), card: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setPay(prev => prev.map((x, j) => j === i ? { ...x, paymentDetails: nd, amount: (nd.cash || 0) + (nd.upi || 0) + (nd.card || 0) + (nd.bankTransfer || 0) } : x)); }} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
                                                            <div><label className="text-[8px] text-slate-400 font-bold ml-0.5">BANK</label><input type="number" value={p.paymentDetails?.bankTransfer || ''} onChange={(e) => { const nd = { ...(p.paymentDetails || { cash: 0, upi: 0, card: 0, bankTransfer: 0 }), bankTransfer: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setPay(prev => prev.map((x, j) => j === i ? { ...x, paymentDetails: nd, amount: (nd.cash || 0) + (nd.upi || 0) + (nd.card || 0) + (nd.bankTransfer || 0) } : x)); }} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" /></div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-1 text-right"><DelBtn onClick={() => setPay(p => p.filter((_, j) => j !== i))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {!printConfig.consultations && !(patientType !== 'OPD' && printConfig.wards) && !printConfig.pharmacy && !printConfig.services && !(printConfig.investigations || printConfig.radiology) && !printConfig.receipts && (
                            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center">
                                <p className="text-sm font-bold text-slate-500">All charge categories are currently turned off in Config.</p>
                                <p className="text-xs text-slate-400 mt-1">Check one or more categories above to display charges and compute statement totals.</p>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/60 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform hover:scale-110 duration-700 opacity-50"></div>
                            <div className="relative space-y-3 sm:space-y-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-3">
                                    {[
                                        ['Doctors', totDoc, 'indigo', printConfig.consultations],
                                        ['Admissions', totAdm, 'emerald', patientType !== 'OPD' && printConfig.wards],
                                        ['Pharmacy', totMed, 'rose', printConfig.pharmacy],
                                        ['Services', totSvc, 'slate', printConfig.services],
                                        ['Lab & Radio', totDiagActive, 'indigo', printConfig.investigations || printConfig.radiology],
                                        ['Discount', discount, 'rose', true],
                                        ['Total Paid', totPaid, 'emerald', printConfig.receipts]
                                    ].map(([l, v, c, isIncluded]) => (
                                        <div key={l as string} className={`p-2 sm:p-3 rounded-xl border transition-all ${isIncluded ? 'bg-slate-50 border-slate-100 group hover:bg-white hover:border-indigo-100' : 'bg-slate-100/40 border-dashed border-slate-200/80 opacity-50'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">{l as string}</p>
                                                {!isIncluded && <span className="text-[7px] font-bold text-slate-400 uppercase bg-slate-200/60 px-1 py-0.5 rounded leading-none">Off</span>}
                                            </div>
                                            <p className={`text-xs sm:text-sm font-black transition-colors ${isIncluded ? 'text-slate-700' : 'line-through text-slate-400'}`}>{fmt(v as number)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pt-3 sm:pt-6 border-t border-slate-100">
                                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                        <div>
                                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest leading-none">Discount / Adjustment (₹)</p>
                                            <input
                                                type="number"
                                                min={0}
                                                value={discount === 0 ? '' : discount}
                                                onChange={(e) => setDiscount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                                onFocus={(e) => e.target.select()}
                                                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 w-28 sm:w-32 animate-in fade-in"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest leading-none">Final Balance Amount</p>
                                            <p className={`text-2xl sm:text-4xl font-black tracking-tighter ${balance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(balance)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:items-end text-left sm:text-right">
                                        <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Statement Reconciliation Summary</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Inline Doctor Change Modal */}
            {showDoctorModal && (() => {
                const currentAdm = activeEncounterType === 'IPD' ? (admission || availableEncounters.ipd || {}) : (admission || {});
                const currentDocObj = currentAdm?.primaryDoctor || currentAdm?.doctor;
                const currentDoctorId = typeof currentDocObj === 'object' && currentDocObj !== null ? (currentDocObj._id || currentDocObj.id) : currentDocObj;
                const fallbackDocName = doctors.length > 0 ? doctors[0].doctorName : '';
                const currentDocNameStr = patient?.doctorReference || patient?.referredBy || currentAdm?.doctorReference || fallbackDocName || '';

                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                                    Change Attending Doctor
                                </h3>
                                <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none">×</button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="text-xs text-slate-500 font-medium">
                                    <p>Select the new doctor to assign to this {patientType} encounter.</p>
                                    {currentDocNameStr && <p className="mt-1 text-slate-700 font-bold">Currently: <span className="text-indigo-600">{currentDocNameStr}</span></p>}
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {availableDoctors.map((doc: any) => {
                                        const docId = doc._id || doc.id;
                                        const docName = doc.user?.name || doc.name;
                                        const safeDocName = String(docName).trim().toLowerCase();
                                        const safeCurrentDocName = String(currentDocNameStr).trim().toLowerCase();
                                        const isCurrent = (currentDoctorId && docId === currentDoctorId) || (safeCurrentDocName && (safeDocName === safeCurrentDocName || safeDocName.includes(safeCurrentDocName) || safeCurrentDocName.includes(safeDocName)));
                                        return (
                                            <button
                                                key={docId}
                                                onClick={() => handleDoctorUpdate(docId)}
                                                disabled={isUpdatingDoctor || isCurrent}
                                                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between group disabled:opacity-70 ${isCurrent ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${isCurrent ? 'text-emerald-800' : 'text-slate-800 group-hover:text-emerald-700'}`}>{docName}</span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isCurrent ? 'text-emerald-600/70' : 'text-slate-400'}`}>{doc.specialization}</span>
                                                </div>
                                                {isCurrent && <span className="text-[9px] font-black uppercase bg-emerald-200/50 text-emerald-800 px-1.5 py-0.5 rounded">Current</span>}
                                            </button>
                                        );
                                    })}
                                    {availableDoctors.length === 0 && (
                                        <div className="text-center py-4 text-sm text-slate-400 font-bold">No doctors found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
