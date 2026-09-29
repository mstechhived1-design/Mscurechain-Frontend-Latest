'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Activity, FileText, Clock, CreditCard, X, Printer, Loader2, Beaker, Globe, Building2} from 'lucide-react';
import Link from 'next/link';
import { getDoctorPatientDetailsAction, getDoctorProfileAction, getAllAppointmentsAction, getDoctorInpatientsAction, getPatientHistoryAction } from '@/lib/integrations/actions/doctor.actions';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { ipdIssuanceService } from '@/lib/integrations/services/pharmacy.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { PrescriptionDocument } from '@/components/documents/PrescriptionDocument';
import { DermatologyPrescriptionDocument } from '@/components/documents/DermatologyPrescriptionDocument';
import { CardiologyPrescriptionDocument } from '@/components/documents/CardiologyPrescriptionDocument';
import LabReportTemplate from '@/components/lab/LabReportTemplate';
import toast from 'react-hot-toast';
import { useVitalsSocket } from '@/lib/hooks/useVitalsSocket';
import { useTenantLink } from '@/hooks/useTenantLink';

const MonitoringTimer = ({ lastRecorded, nextDue, status }: { lastRecorded?: string | Date; nextDue?: string | Date; status?: string }): any => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!lastRecorded && !nextDue) return;
        if (status === 'Stable') return;

        const updateTimer = () => {
            const now = Date.now();
            let targetMs: number;

            if (nextDue) {
                targetMs = new Date(nextDue).getTime();
            } else {
                // Fallback logic if nextDue is missing
                const last = new Date(lastRecorded!).getTime();
                const intervalHours = status === 'Critical' ? 1 : 8;
                targetMs = last + (intervalHours * 60 * 60 * 1000);
            }

            const diffMs = targetMs - now;

            if (diffMs <= 0) {
                setIsOverdue(true);
                const overdueMs = Math.abs(diffMs);
                const hours = Math.floor(overdueMs / (1000 * 60 * 60));
                const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`Overdue ${hours}h ${mins}m`);
            } else {
                setIsOverdue(false);
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                if (hours === 0 && mins === 0) {
                    setTimeLeft("Due Now");
                } else {
                    setTimeLeft(`Due in ${hours}h ${mins}m`);
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastRecorded, nextDue, status]);

    if (status === 'Stable' || (!lastRecorded && !nextDue)) return null;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/20 text-white backdrop-blur-md border border-white/10'}`}>
            <Clock size={12} />
            {timeLeft}
        </div>
    );
};

function PatientDetailsPage() {
    const { getPath } = useTenantLink();
    const params = useParams() as any;
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [billSummary, setBillSummary] = useState<any>(null); // NEW: Billing data
    const [patientHistory, setPatientHistory] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
    const [doctorUserId, setDoctorUserId] = useState<string | null>(null);

    // Prescription View State
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [selectedDermData, setSelectedDermData] = useState<any>(null);
    const [selectedCardioData, setSelectedCardioData] = useState<any>(null);
    const [isPivoting, setIsPivoting] = useState(false);
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    
    // Lab View State
    const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
    const [isLabModalOpen, setIsLabModalOpen] = useState(false);
    const labPrintRef = React.useRef<HTMLDivElement>(null);

    // Cross-hospital history toggle
    const [crossHospitalScope, setCrossHospitalScope] = useState(false);
    const [isRefetchingHistory, setIsRefetchingHistory] = useState(false);

    // ✅ Summary of Issued Medicines
    const currentMedications = React.useMemo(() => {
        const medsMap = new Map();
        issuances.forEach(issuance => {
            issuance.items?.forEach((item: any) => {
                const identifier = item.productId?._id || item.productId || item.medicineName;
                if (!identifier) return; // Skip items without any identification

                const key = identifier.toString();
                if (!medsMap.has(key)) {
                    medsMap.set(key, {
                        name: item.medicineName || 'Unknown Medicine',
                        issued: 0,
                        returned: 0
                    });
                }
                const existing = medsMap.get(key);
                existing.issued += item.quantity || 0;
                existing.returned += item.returnedQty || 0;
            });
        });
        return Array.from(medsMap.values());
    }, [issuances]);

    // ✅ NEW: WebSocket for real-time vitals updates and high-priority alerts
    useVitalsSocket(patient?.user?._id || patient?._id, (newVitals) => {
        console.log('⚡ Vitals updated in real-time!', newVitals);

        // Update patient state with new vitals instantly
        setPatient((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                admission: {
                    ...prev.admission,
                    vitals: newVitals
                }
            };
        });
    }, doctorUserId);

    useEffect(() => {
        const fetchDoctorId = async () => {
            const res = await getDoctorProfileAction();
            if (res.success && res.data) {
                setCurrentDoctorId(res.data._id || res.data.id);
                setDoctorUserId(res.data.user?._id || res.data.user?.id);
            }
        };
        fetchDoctorId();

        if (params.id) {
            loadPatientData(params.id as string);
        }
    }, [params.id]);

    // Re-fetch history when cross-hospital toggle changes (skip initial mount)
    const isInitialMount = React.useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (!params.id) return;
        const refetchHistory = async () => {
            setIsRefetchingHistory(true);
            try {
                const scope = crossHospitalScope ? 'all' : 'hospital';
                const historyRes = await getPatientHistoryAction(params.id as string, scope);
                if (historyRes.success && historyRes.data) {
                    setPatientHistory(historyRes.data);
                }
            } catch (err) {
                console.error('Failed to refetch history:', err);
            } finally {
                setIsRefetchingHistory(false);
            }
        };
        refetchHistory();
    }, [crossHospitalScope]);

    const loadPatientData = async (id: string) => {
        setIsLoading(true);
        try {
            // ── PHASE 1: Critical path — get patient profile ASAP ──
            const profileRes = await getDoctorPatientDetailsAction(id);

            if (!profileRes.success || !profileRes.data) {
                toast.error(profileRes.error || "Failed to load patient details");
                setIsLoading(false);
                return;
            }

            let patientData = profileRes.data;
            setPatient(patientData); // Show patient profile immediately
            setIsLoading(false);     // Unblock rendering NOW

            // ── PHASE 2: Non-critical data — load in background without blocking UI ──
            const [appointmentsResult, inpatientsResult, historyResult] = await Promise.allSettled([
                getAllAppointmentsAction({ limit: 100 }),
                getDoctorInpatientsAction(),
                getPatientHistoryAction(id)
            ]);

            // --- Handle Inpatients (enrich patient data with admission info) ---
            const inpatientsRes = inpatientsResult.status === 'fulfilled' ? inpatientsResult.value : { success: false, data: [] };

            if (inpatientsRes.success && inpatientsRes.data) {
                const pId = patientData._id || patientData.id;
                const pUserId = patientData.user?._id || patientData.user?.id;

                const activeAdmission = inpatientsRes.data.find((adm: any) => {
                    const admPId = adm.patient?._id || adm.patient?.id || adm.patient;
                    return admPId === pId || admPId === pUserId ||
                        String(admPId) === String(pId) || String(admPId) === String(pUserId);
                });

                if (activeAdmission && patientData.admission) {
                    patientData = {
                        ...patientData,
                        admission: {
                            ...patientData.admission,
                            bed: activeAdmission.bed || patientData.admission.bed,
                            vitals: patientData.admission.vitals
                        }
                    };
                } else if (activeAdmission && !patientData.admission) {
                    patientData = { ...patientData, admission: activeAdmission };
                }
                // Update patient with enriched admission data
                setPatient(patientData);
            }

            // --- Handle Pharmacy and Bill data ONLY for confirmed active IPD admissions ---
            // Check if the admission is a real active IPD record (not a stub from appointment data)
            const hasRealActiveAdmission = (() => {
                if (!patientData.admission?.admissionId) return false;
                // Verify via inpatients list (most reliable source of truth)
                const inpData = inpatientsRes.success && inpatientsRes.data ? inpatientsRes.data : [];
                const pId = patientData._id || patientData.id;
                const pUserId = patientData.user?._id || patientData.user?.id;
                const confirmedInIpd = inpData.some((adm: any) => {
                    const admPId = adm.patient?._id || adm.patient?.id || adm.patient;
                    return admPId === pId || admPId === pUserId ||
                        String(admPId) === String(pId) || String(admPId) === String(pUserId);
                });
                // Also allow if the admission object itself has an explicit Active status
                const hasActiveStatus = patientData.admission.status === 'Active' || patientData.admission.status === 'active';
                return confirmedInIpd || hasActiveStatus;
            })();

            if (hasRealActiveAdmission) {
                const admId = patientData.admission!.admissionId;

                ipdIssuanceService.getIssuancesByAdmission(admId)
                    .then((data: any) => setIssuances(data || []))
                    .catch((err: any) => console.error("Issuance fetch failed (non-critical):", err));

                (ipdService as any).getBillSummary(admId)
                    .then((res: any) => setBillSummary(res.summary || res.data?.summary || null))
                    .catch((err: any) => console.error("Bill summary fetch failed (non-critical):", err));
            }

            // --- Handle Appointments & History ---
            const appointmentsRes = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : { success: false, data: [] };
            const historyRes = historyResult.status === 'fulfilled' ? historyResult.value : { success: false, data: null };

            if (appointmentsRes.success && appointmentsRes.data) {
                const pUserId = patientData.user?._id || patientData.user?.id;
                const pProfileId = patientData._id || patientData.id;

                let filtered = appointmentsRes.data.filter((appt: any) => {
                    const apptPId = appt.patient?._id || appt.patient?.id || appt.patientId || appt.patient;
                    return (pUserId && (apptPId === pUserId || String(apptPId) === String(pUserId))) ||
                        (pProfileId && (apptPId === pProfileId || String(apptPId) === String(pProfileId)));
                });

                // Augment with history data (prescriptions and lab results)
                if (historyRes.success && historyRes.data) {
                    const history = historyRes.data;
                    filtered = filtered.map((appt: any) => {
                        const apptId = String(appt._id || appt.id);
                        const apptDate = new Date(appt.date || appt.startTime).toLocaleDateString();

                        // Find linked prescription (Sync by ID then fallback to Date)
                        const linkedRx = history.prescriptions?.find((rx: any) => {
                            const rxApptId = String(rx.appointment?._id || rx.appointment?.id || rx.appointment || '');
                            const rxDate = new Date(rx.prescriptionDate || rx.createdAt).toLocaleDateString();
                            return rxApptId === apptId || (rxApptId === '' && rxDate === apptDate);
                        });

                        // Find linked lab results (Sync by ID then fallback to Date)
                        const linkedLabs = history.reports?.filter((report: any) => {
                            const repApptId = String(report.appointment?._id || report.appointment?.id || report.appointment || report.appointmentId || '');
                            const repDate = new Date(report.date || report.createdAt).toLocaleDateString();
                            return repApptId === apptId || (repApptId === '' && repDate === apptDate);
                        });

                        return {
                            ...appt,
                            prescriptionDetails: linkedRx || (typeof appt.prescription === 'object' ? appt.prescription : null),
                            labResults: (linkedLabs?.length > 0 ? linkedLabs : (appt.labResults ? (Array.isArray(appt.labResults) ? appt.labResults : [appt.labResults]) : []))
                        };
                    });
                }

                filtered.sort((a: any, b: any) => new Date(b.date || b.startTime).getTime() - new Date(a.date || a.startTime).getTime());
                setAppointments(filtered);
                setPatientHistory(historyRes.data);
            } else if (appointmentsResult.status === 'rejected') {
                console.warn('Appointments fetch failed (non-critical):', appointmentsResult.reason);
            }

        } catch (error) {
            console.error("Error loading patient data:", error);
            toast.error("An error occurred while loading patient data.");
            setIsLoading(false);
        }
    };

    const fetchPrescriptionDetails = async (visit: any) => {
        const rxId = visit.prescriptionId || visit.prescription?._id || visit.prescription;

        if (!rxId) {
            toast.error("No prescription linked to this consultation.");
            return;
        }

        setIsPivoting(true);
        setIsRxModalOpen(true);
        setSelectedDermData(null);
        setSelectedCardioData(null);
        try {
            const rxRes = await doctorService.getPrescriptionById(rxId);

            if (rxRes.success && (rxRes.prescription || rxRes.data)) {
                const rx = rxRes.prescription || rxRes.data;
                setSelectedPrescription(rx);
                setSelectedDermData(null);
                setSelectedCardioData(null);

                // Fetch Specialty Extensions (Non-blocking)
                try {
                    const [dermRes, cardioRes] = await Promise.all([
                        doctorService.getDermatologyByPrescriptionId(rxId),
                        doctorService.getCardiologyByPrescriptionId(rxId)
                    ]);
                    
                    if (dermRes.success && dermRes.dermatologyData) {
                        setSelectedDermData(dermRes.dermatologyData);
                    }
                    
                    if (cardioRes.success && cardioRes.cardiologyData) {
                        setSelectedCardioData(cardioRes.cardiologyData);
                    }
                } catch (err) {
                    console.error("Failed to fetch specialty data:", err);
                }
            } else {
                toast.error(rxRes.message || "Could not retrieve prescription details.");
                setIsRxModalOpen(false);
            }
        } catch (error) {
            console.error("RX Fetch Error:", error);
            toast.error("Failed to load prescription.");
            setIsRxModalOpen(false);
        } finally {
            setIsPivoting(false);
        }
    };

    const handlePrintPrescription = () => {
        const printWindow = window.open('', '_blank');
        const content = document.querySelector('.print-prescription-container')?.innerHTML;

        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Prescription Print</title>
                        <style>
                            @media print {
                                @page { size: A4; margin: 0; }
                                body { margin: 0; -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = () => {
                                window.print();
                            }
                        </script>
                    </body>
                </html>
            `);
            // Clone style/link sheets from main window for instant, offline-capable rendering
            const styles = document.querySelectorAll('link[rel="stylesheet"], style');
            styles.forEach(style => {
                printWindow.document.head.appendChild(style.cloneNode(true));
            });
            printWindow.document.close();
        }
    };

    const handlePrintLabReport = () => {
        const printWindow = window.open('', '_blank');
        const content = document.querySelector('.print-lab-report-container')?.innerHTML;

        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lab Report Print</title>
                        <style>
                            @media print {
                                @page { size: A4; margin: 0; }
                                body { margin: 0; -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = () => {
                                window.print();
                            }
                        </script>
                    </body>
                </html>
            `);
            // Clone style/link sheets from main window for instant, offline-capable rendering
            const styles = document.querySelectorAll('link[rel="stylesheet"], style');
            styles.forEach(style => {
                printWindow.document.head.appendChild(style.cloneNode(true));
            });
            printWindow.document.close();
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-20 bg-secondary-theme flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-muted/20">
                    <User size={40} />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight ">Patient Logic Node Empty</h2>
                <button onClick={() => router.back()} className="px-6 py-2.5 bg-primary-theme text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 shadow-lg shadow-primary-theme/20 transition-all">Go Back</button>
            </div>
        );
    }

    // Backend returns a flattened structure for vitals in PatientProfile
    // patient.user contains name, email, mobile
    const pUser = patient.user || {};

    return (
        <div className="space-y-3 sm:space-y-4 pb-16 pt-2 sm:pt-4">
            {/* Nav Back */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-foreground font-black text-[10px] uppercase tracking-widest transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Intelligence Node
            </button>

            {/* Header Card */}
            <div className="bg-card p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-primary-theme/5 rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <User size={120} />
                </div>

                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-theme to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-xl shadow-primary-theme/20 relative z-10 shrink-0">
                    {pUser.name?.charAt(0) || patient.name?.charAt(0) || 'P'}
                </div>

                <div className="flex-1 relative z-10">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-foreground tracking-tighter uppercase">{pUser.name || patient.name || 'Unknown Patient'}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted font-bold uppercase tracking-widest leading-none">
                        <span className="flex items-center gap-1.5"><User size={14} className="text-primary-theme/50" /> {patient.age || '--'} Y / {patient.gender || '---'}</span>
                        <span className="flex items-center gap-1.5"><Activity size={14} className="text-primary-theme/50" /> {patient.bloodGroup || patient.personal?.bloodGroup || 'BLOOD ---'}</span>
                        <div className="hidden sm:block w-px h-3 bg-border-theme" />
                        <span className="flex items-center gap-1.5"><Phone size={14} className="text-primary-theme/50" /> {patient?.personal?.mobile && patient.personal.mobile !== 'N/A' ? patient.personal.mobile : pUser.mobile || patient.mobile || '---'}</span>
                        <span className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                            <Mail size={14} className="text-primary-theme/50" />
                            {patient?.personal?.email && patient.personal.email !== 'N/A' && patient.personal.email !== '---'
                                ? patient.personal.email
                                : pUser.email && pUser.email !== 'N/A'
                                    ? pUser.email
                                    : patient.email && patient.email !== 'N/A'
                                        ? patient.email
                                        : '---'
                            }
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto relative z-10">
                    <Link href={getPath(`/doctor/prescription/create?patientId=${patient.user?._id || patient.user?.id || patient.id}`)} prefetch={true} className="flex-1 sm:flex-none px-4 py-2.5 bg-secondary-theme text-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] rounded-lg sm:rounded-xl hover:bg-primary-theme hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 group/btn">
                        <FileText size={14} className="group-hover/btn:rotate-12 transition-transform" /> Prescription
                    </Link>
                    <Link href={getPath(`/doctor/lab-token/create?patientId=${patient.user?._id || patient.user?.id || patient.id}`)} prefetch={true} className="flex-1 sm:flex-none px-4 py-2.5 bg-primary-theme text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] rounded-lg sm:rounded-xl shadow-lg shadow-primary-theme/20 hover:opacity-95 flex items-center justify-center gap-2 transition-all active:scale-95 group/btn">
                        <Activity size={14} className="group-hover/btn:scale-110 transition-transform" /> Lab Token
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Left Col: Vitals & Info */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Inpatient Admission & Bed Info */}
                    {patient.admission && (
                        <div className="space-y-3 sm:space-y-4">
                            <div className={`bg-gradient-to-br ${patient.admission.isPending ? 'from-blue-600 to-indigo-700' : 'from-emerald-600 to-teal-700'} p-4 sm:p-5 rounded-xl sm:rounded-2xl text-white relative overflow-hidden shadow-xl ${patient.admission.isPending ? 'shadow-blue-600/20' : 'shadow-emerald-600/20'}`}>
                                <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-10 rotate-12">
                                    <Activity size={80} />
                                </div>
                                <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6 sm:mb-8">
                                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-white/80">{patient.admission.isPending ? 'Admission Scheduled' : 'Admission Sync'}</h3>
                                        <MonitoringTimer
                                            lastRecorded={patient.admission.vitals?.lastVitalsRecordedAt}
                                            nextDue={patient.admission.vitals?.nextVitalsDue}
                                            status={patient.admission.vitals?.status}
                                        />
                                    </div>
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-white/60 ">Bed Identification</span>
                                            <span className="text-lg sm:text-xl font-black uppercase tracking-tighter leading-none">{patient.admission.bed?.bedId || 'N-001'}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight text-white/60">Level / Grid</span>
                                            <span className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] leading-none">
                                                {typeof patient.admission.bed?.type === 'object' ? (patient.admission.bed.type.type || 'Standard') : (patient.admission.bed?.type || 'Standard')} / {typeof patient.admission.bed?.room === 'object' ? (patient.admission.bed.room.name || 'General') : (patient.admission.bed?.room || 'General')}
                                            </span>
                                        </div>
                                        <div className="pt-2 flex justify-between items-center">
                                            <span className="text-[8px] sm:text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{patient.admission.isPending ? 'Scheduled Date' : 'Deployment Date'}</span>
                                            <span className="text-[10px] sm:text-xs font-black  text-emerald-50">
                                                {patient.admission.admissionDate ? new Date(patient.admission.admissionDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {patient.admission.bedHistory && patient.admission.bedHistory.length > 0 && (
                                <div className="bg-white dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-emerald-100/20 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-[10px] font-black ${patient.admission.isPending ? 'text-blue-600' : 'text-emerald-600'} uppercase tracking-widest `}>Room/Bed Transfer Logic</h3>
                                        <div className={`p-1.5 ${patient.admission.isPending ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'} rounded-lg`}>
                                            <Activity size={14} className={patient.admission.isPending ? 'text-blue-500' : 'text-emerald-500'} />
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-emerald-100/30">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-emerald-50/50 dark:bg-emerald-500/5">
                                                    <th className="px-3 py-2 text-[8px] font-black text-emerald-700/60 uppercase tracking-widest border-b border-emerald-100/20">Resource</th>
                                                    <th className="px-3 py-2 text-[8px] font-black text-emerald-700/60 uppercase tracking-widest border-b border-emerald-100/20">Timeline</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-emerald-100/10">
                                                {patient.admission.bedHistory.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                                                        <td className="px-3 py-3">
                                                            <div className="text-[10px] font-black text-foreground uppercase tracking-tight ">{item.bedId}</div>
                                                            <div className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5 opacity-60">
                                                                {item.room} / {item.type}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">
                                                                {new Date(item.startDate).toLocaleDateString([], { day: '2-digit', month: 'short' })} 
                                                                {item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : ' (Current)'}
                                                            </div>
                                                            <div className="text-[7px] font-bold text-muted uppercase tracking-widest mt-0.5 opacity-40 ">
                                                                Rate: ₹{item.pricePerDay}/Day {item.pricePerHalfDay ? `• ₹${item.pricePerHalfDay}/12h` : ''} {item.pricePerHour ? `• ₹${item.pricePerHour}/hr` : ''}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Financial Summary - NEW */}
                    {patient.admission && billSummary && (
                        <div className="bg-card p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme transition-all hover:border-primary-theme/20">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em] mb-4 sm:mb-6">Financial Operations</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-tight">
                                    <span className="text-muted/60 ">Gross Resource Cost</span>
                                    <span className="text-foreground">₹{(billSummary.bedCharges + billSummary.extraCharges).toLocaleString()}</span>
                                </div>
                                {billSummary.returnCredits > 0 && (
                                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-tight">
                                        <span className="text-rose-500 ">(-) Intelligence Return</span>
                                        <span className="text-rose-600 font-black">- ₹{billSummary.returnCredits.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 border-t border-dashed border-border-theme">
                                    <span className="text-[10px] sm:text-xs font-black text-primary-theme uppercase tracking-widest">Current Logic Bill</span>
                                    <span className="text-base sm:text-lg font-black text-primary-theme">₹{billSummary.finalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-secondary-theme/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border-theme shadow-inner">
                                    <div>
                                        <p className="text-[8px] font-black text-muted uppercase tracking-widest opacity-60">Sequence Balance</p>
                                        <p className="text-base sm:text-lg lg:text-xl font-black text-primary-theme leading-tight tracking-tighter">₹{billSummary.balanceOutstanding.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] sm:text-[9px] font-black text-muted uppercase tracking-widest opacity-60">Resolved</p>
                                        <p className="text-xs sm:text-sm font-black text-emerald-500 ">₹{(billSummary.advancePaid + billSummary.settlementPaid).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Medication Monitoring */}
                    {patient.admission && issuances.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Inpatient Pharmacy</h3>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase">{issuances.length} Issuances</span>
                            </div>
                            <div className="space-y-3">
                                {currentMedications.map((med: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">{med.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Issued: {med.issued}</span>
                                                {med.returned > 0 && (
                                                    <span className="text-[9px] font-black text-rose-500 uppercase">Returned: {med.returned}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-slate-900">{med.issued - med.returned}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Balance</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vitals - From Active Admission */}
                    <div className="bg-card p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-border-theme">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em] ">
                                {patient.admission?.vitals ? 'Admission Sync' : 'Baseline Logic'}
                            </h3>
                            {(patient.admission?.vitals?.timestamp || patient.updatedAt) && (
                                <span className="text-[8px] sm:text-[9px] font-black text-muted uppercase tracking-widest opacity-50">
                                    {new Date(patient.admission?.vitals?.timestamp || patient.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                        {patient.admission?.vitals || patient.pulse || patient.bloodPressure || patient.spO2 || patient.temperature ? (
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="p-2 sm:p-3 bg-rose-50 dark:bg-rose-500/5 rounded-lg sm:rounded-xl border border-rose-100 dark:border-rose-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-rose-500 uppercase mb-0.5 tracking-widest  leading-none">Pulse</p>
                                    <p className="text-base sm:text-xl font-black text-rose-600 tracking-tighter">
                                        {patient.admission?.vitals?.heartRate || patient.pulse || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-rose-400/60 ml-1 uppercase tracking-widest">bpm</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-primary-theme/5 rounded-lg sm:rounded-xl border border-primary-theme/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-primary-theme uppercase mb-0.5 tracking-widest  leading-none">Pressure</p>
                                    <p className="text-base sm:text-xl font-black text-primary-theme tracking-tighter">
                                        {patient.admission?.vitals?.bloodPressure || patient.bloodPressure || '--/--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-primary-theme/40 ml-1 uppercase tracking-widest">mmHg</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-cyan-50 dark:bg-cyan-500/5 rounded-lg sm:rounded-xl border border-cyan-100 dark:border-cyan-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-cyan-600 uppercase mb-0.5 tracking-widest leading-none">Saturation</p>
                                    <p className="text-base sm:text-xl font-black text-cyan-700 tracking-tighter">
                                        {patient.admission?.vitals?.spO2 || patient.spO2 || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-cyan-500/40 ml-1 uppercase tracking-widest">%</span>
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-500/5 rounded-lg sm:rounded-xl border border-orange-100 dark:border-orange-900/10 group transition-all hover:scale-[1.02]">
                                    <p className="text-[8px] sm:text-[9px] font-black text-orange-600 uppercase mb-0.5 tracking-widest  leading-none">Thermal</p>
                                    <p className="text-base sm:text-xl font-black text-orange-700 tracking-tighter">
                                        {patient.admission?.vitals?.temperature || patient.temperature || '--'}
                                        <span className="text-[9px] sm:text-[10px] font-bold text-orange-500/40 ml-1 uppercase tracking-widest">°F</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-40">
                                <Activity className="w-10 h-10 text-muted mx-auto mb-3" />
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ">No Logic Sequence Sync</p>
                            </div>
                        )}
                    </div>

                    {/* Contact & Address */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Contact Info</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-900">Address</p>
                                    <p className="text-gray-500">{patient.address || 'No address provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Timeline/History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Medical History */}
                    <div className="bg-card p-4 sm:p-7 rounded-2xl sm:rounded-[2rem] shadow-sm border border-border-theme transition-all hover:border-primary-theme/20 mb-6">
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border-theme/30">
                            <h3 className="text-[9px] sm:text-[10px] font-black text-muted uppercase tracking-[0.25em]">Clinical History Node</h3>
                            <Activity size={16} className="text-primary-theme/30" />
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {patient.medicalHistory ? (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary-theme text-foreground text-[10px] sm:text-xs rounded-xl font-black uppercase tracking-widest border border-border-theme shadow-sm">{patient.medicalHistory}</span>
                            ) : (
                                <p className="text-muted text-[10px] sm:text-xs font-bold uppercase tracking-widest  opacity-50">No baseline allergic or chronic data synced.</p>
                            )}
                        </div>
                        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                            {patient.conditions && patient.conditions !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">Conditions: {patient.conditions}</span>
                            )}
                            {patient.allergies && patient.allergies !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">Allergies: {patient.allergies}</span>
                            )}
                            {patient.medications && patient.medications !== 'None' && (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-theme/5 text-primary-theme text-[9px] sm:text-[10px] rounded-xl font-black uppercase tracking-widest border border-primary-theme/10">Meds: {patient.medications}</span>
                            )}
                        </div>
                    </div>

                    {/* Laboratory Intelligence Tracker - Dedicated Section */}
                    {patientHistory?.reports?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm mb-6 transition-all hover:shadow-md animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-50 dark:border-indigo-900/20">
                                <div>
                                    <h3 className="text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em] ">Laboratory Intelligence Tracker</h3>
                                    <p className="text-[7px] sm:text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5 opacity-60">Verified Results & Diagnostic Billing Sequence</p>
                                </div>
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Beaker className="text-indigo-500" size={16} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="border-b border-indigo-50 dark:border-indigo-900/20">
                                            <th className="text-left py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Diagnostic Investigation</th>
                                            <th className="text-center py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Sequence Status</th>
                                            <th className="text-right py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Resolution</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-2">
                                        {patientHistory.reports.slice(0, 8).map((report: any, idx: number) => {
                                            const testNames = (report.results || report.tests || []).map((t: any) => t.testName || t.name).join(', ') || 'General Investigation';
                                            const isCompleted = report.status?.toLowerCase() === 'completed';
                                            
                                            return (
                                                <tr key={idx} className="group bg-white dark:bg-slate-900/40 border border-indigo-100/30 rounded-2xl transition-all duration-300 hover:bg-indigo-50/10 hover:shadow-sm">
                                                    <td className="py-4 px-4 rounded-l-2xl border-l border-t border-b border-indigo-100/30">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] shadow-inner shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[200px] sm:max-w-md">{testNames}</span>
                                                                <span className="text-[7px] font-bold text-muted uppercase tracking-widest opacity-60 mt-0.5">
                                                                    ID: {report.tokenNumber || report._id?.slice(-6)} • {new Date(report.date || report.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-center border-t border-b border-indigo-100/30">
                                                        <span className={`px-3 py-1 text-[7px] font-black uppercase tracking-[0.15em] rounded-full border shadow-sm ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                                                            {report.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right rounded-r-2xl border-r border-t border-b border-indigo-100/30">
                                                        {isCompleted ? (
                                                            <button 
                                                                onClick={() => {
                                                                    const labTests = report.results || report.tests || [];
                                                                    const mappedSample = {
                                                                        ...report,
                                                                        patientDetails: {
                                                                            name: pUser.name || patient.name,
                                                                            age: patient.age,
                                                                            gender: patient.gender,
                                                                            mobile: pUser.mobile || patient.mobile,
                                                                            refDoctor: report.referredBy || 'Self'
                                                                        },
                                                                        tests: labTests.map((t: any) => ({
                                                                            ...t,
                                                                            testName: t.testName || t.name || 'Investigation',
                                                                            resultValue: t.result || t.resultValue
                                                                        })),
                                                                        reportDate: report.completedAt || report.updatedAt || report.createdAt
                                                                    };
                                                                    setSelectedLabReport(mappedSample);
                                                                    setIsLabModalOpen(true);
                                                                }}
                                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                                                            >
                                                                <FileText size={12} />
                                                                View Result
                                                            </button>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] opacity-40 px-4">Processing</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Past Consultations */}
                    <div className="bg-card p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-border-theme">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-theme/30">
                            <div>
                                <h3 className="text-lg md:text-xl lg:text-xl font-bold text-foreground uppercase tracking-tight ">Consultation Sequence</h3>
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.25em] mt-1 opacity-60">Historical Medical Timeline</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Cross-Hospital Toggle */}
                                <div className="flex items-center gap-2.5 bg-secondary-theme px-3 py-2 rounded-xl border border-border-theme">
                                    <Building2 size={13} className={`transition-colors ${!crossHospitalScope ? 'text-primary-theme' : 'text-muted/40'}`} />
                                    <button
                                        onClick={() => setCrossHospitalScope(!crossHospitalScope)}
                                        className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none ${
                                            crossHospitalScope
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'
                                                : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                        title={crossHospitalScope ? 'Showing all hospitals' : 'Showing current hospital only'}
                                    >
                                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 ${
                                            crossHospitalScope ? 'left-[22px]' : 'left-0.5'
                                        }`}>
                                            {isRefetchingHistory ? (
                                                <Loader2 size={10} className="animate-spin text-indigo-500" />
                                            ) : (
                                                crossHospitalScope 
                                                    ? <Globe size={10} className="text-indigo-500" />
                                                    : <Building2 size={10} className="text-slate-400" />
                                            )}
                                        </span>
                                    </button>
                                    <Globe size={13} className={`transition-colors ${crossHospitalScope ? 'text-indigo-500' : 'text-muted/40'}`} />
                                    <span className={`text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
                                        crossHospitalScope ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted/60'
                                    }`}>
                                        {crossHospitalScope ? 'All Hospitals' : 'This Hospital'}
                                    </span>
                                </div>
                                <FileText className="text-primary-theme/30 hidden sm:block" size={24} />
                            </div>
                        </div>                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="border-b border-indigo-50 dark:border-indigo-900/20">
                                        <th className="text-left py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Medical Narrative / Reason</th>
                                        <th className="text-left py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Temporal Log</th>
                                        <th className="text-center py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Status</th>
                                        <th className="text-right py-4 px-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Intelligence</th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-2">
                                    {appointments.length > 0 ? (
                                        appointments.map((visit: any, idx: number) => {
                                            const isCompleted = visit.status?.toLowerCase() === 'completed' || visit.status?.toLowerCase() === 'finished';
                                            return (
                                                <tr 
                                                    key={idx} 
                                                    className="group bg-white dark:bg-slate-900/40 border border-indigo-100/30 rounded-2xl transition-all duration-300 hover:bg-indigo-50/10 hover:shadow-sm cursor-pointer"
                                                    onClick={() => fetchPrescriptionDetails(visit)}
                                                >
                                                    <td className="py-4 px-4 rounded-l-2xl border-l border-t border-b border-indigo-100/30">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] shadow-inner shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[200px] sm:max-w-md">{visit.reason || visit.symptoms?.[0] || 'General Consultation'}</span>
                                                                <span className="text-[7px] font-bold text-muted uppercase tracking-widest opacity-60 mt-0.5">{visit.doctorName || 'Medical Professional'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 border-t border-b border-indigo-100/30">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                                                                {new Date(visit.date || visit.startTime).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[7px] font-bold text-muted uppercase tracking-widest opacity-60 mt-0.5">
                                                                {visit.time || new Date(visit.date || visit.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-center border-t border-b border-indigo-100/30">
                                                        <span className={`px-3 py-1 text-[7px] font-black uppercase tracking-[0.15em] rounded-full border shadow-sm ${
                                                            visit.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                            visit.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                        }`}>
                                                            {visit.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right rounded-r-2xl border-r border-t border-b border-indigo-100/30">
                                                        {isCompleted ? (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fetchPrescriptionDetails(visit);
                                                                }}
                                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                                                            >
                                                                <FileText size={12} />
                                                                View Report
                                                            </button>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] opacity-40 px-4">In-Progress</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="flex flex-col items-center justify-center py-20 bg-secondary-theme/10 rounded-3xl border border-dashed border-border-theme/40">
                                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-lg mb-4">
                                                        <FileText className="text-muted/20" size={40} />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-muted uppercase tracking-[0.2em] mb-1">No Clinical Sequence Found</h4>
                                                    <p className="text-[10px] text-muted opacity-50 uppercase tracking-widest font-bold">Historical data is empty for this profile</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {/* Prescription Modal */}
            {isRxModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden relative border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-2.5 sm:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-lg font-black text-gray-900 uppercase tracking-tight truncate">Prescription Node</h3>
                                <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Verified Multi-Role Registry</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {selectedPrescription && (
                                    <button
                                        onClick={handlePrintPrescription}
                                        className="p-1.5 sm:p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg sm:rounded-xl font-black flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    >
                                        <Printer size={14} className="sm:size-[16px]" /> <span className="hidden xs:inline">Print</span><span className="xs:hidden">Print</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsRxModalOpen(false); setSelectedPrescription(null); setSelectedDermData(null); }}
                                    className="p-1.5 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg sm:rounded-xl active:scale-95 transition-all border border-transparent"
                                >
                                    <X size={18} className="sm:size-[20px]" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 bg-white p-0 sm:p-4 overflow-x-hidden overflow-y-auto no-scrollbar flex justify-center items-start">
                            {isPivoting ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 w-full">
                                    <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fetching Clinical Data...</p>
                                </div>
                            ) : selectedPrescription ? (
                                <div className="print-prescription-container shadow-none bg-white w-full sm:w-[210mm] shrink-0">
                                    {selectedCardioData ? (
                                        <CardiologyPrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                            cardiologyData={selectedCardioData}
                                        />
                                    ) : selectedDermData ? (
                                        <DermatologyPrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                            dermatologyData={selectedDermData}
                                        />
                                    ) : (
                                        <PrescriptionDocument 
                                            prescription={selectedPrescription} 
                                            patient={patient} 
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center gap-4 w-full">
                                    <FileText size={48} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-400">Prescription details could not be loaded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lab Report Modal */}
            {isLabModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden relative border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-2.5 sm:p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-lg font-black text-gray-900 uppercase tracking-tight truncate">Lab Report Node</h3>
                                <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Certified Diagnostic Results</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {selectedLabReport && (
                                    <button
                                        onClick={handlePrintLabReport}
                                        className="p-1.5 sm:p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg sm:rounded-xl font-black flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    >
                                        <Printer size={14} className="sm:size-[16px]" /> <span className="hidden xs:inline">Print</span><span className="xs:hidden">Print</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsLabModalOpen(false); setSelectedLabReport(null); }}
                                    className="p-1.5 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg sm:rounded-xl active:scale-95 transition-all border border-transparent"
                                >
                                    <X size={18} className="sm:size-[20px]" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 bg-white p-0 sm:p-4 overflow-x-hidden overflow-y-auto no-scrollbar flex justify-center items-start">
                            {selectedLabReport ? (
                                <div className="print-lab-report-container shadow-none bg-white w-full sm:w-[210mm] shrink-0">
                                    <LabReportTemplate sample={selectedLabReport} />
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center gap-4 w-full">
                                    <Beaker size={48} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-400">Lab report details could not be loaded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(PatientDetailsPage);
