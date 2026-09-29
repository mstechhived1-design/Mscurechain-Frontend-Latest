'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    Search,
    Calendar,
    Plus,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Activity,
    ExternalLink,
    RefreshCw,
    Printer,
    CreditCard
} from "lucide-react";
import { helpdeskService, useHelpdeskPatients } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ClinicalReceipt from "@/components/helpdesk/ClinicalReceipt";
import AppointmentHistoryModal from "@/components/helpdesk/AppointmentHistoryModal";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { sanitizePatientName, formatPatientNameWithPrefix } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";
import { computeAgeFromDob } from "@/lib/print-utils";

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function PatientsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10; // Changed from 20 to 5 to show pagination with fewer patients
    const [activeFilter, setActiveFilter] = useState<'all' | 'ipd' | 'opd'>('all');

    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

    // Doctor Lookup State
    const [doctorMap, setDoctorMap] = useState<Record<string, string>>({});
    const [doctorsLoaded, setDoctorsLoaded] = useState(false);

    // Fetch doctors once on mount to build lookup map
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const doctors = await helpdeskService.getDoctors();
                console.log("Raw Doctors Response:", doctors); // Debug Log

                const map: Record<string, string> = {};
                // Handle different response structures if necessary
                const docList = Array.isArray(doctors) ? doctors : (doctors as any)?.doctors || (doctors as any)?.data || [];
                console.log("Processed Doctor List:", docList); // Debug Log

                docList.forEach((doc: any) => {
                    const id = doc._id || doc.id;
                    const name = doc.name || doc.user?.name;
                    if (id && name) {
                        map[id] = name;
                    }
                });
                console.log("Final Doctor Map:", map); // Debug Log
                setDoctorMap(map);
                setDoctorsLoaded(true);
            } catch (error) {
                console.error("Failed to fetch doctors map", error);
            }
        };
        fetchDoctors();
    }, []);

    // Fetch hospital branding info
    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await hospitalAdminService.getHospital();
                const hData = (res as any)?.hospital || res;
                if (hData && (hData._id || hData.id)) {
                    setHospitalInfo(hData);
                } else {
                    throw new Error("Invalid structure from hospitalAdmin API");
                }
            } catch (err) {
                // Fallback for helpdesk users without admin rights
                try {
                    const me = await helpdeskService.getMe();
                    const myHospital = (me as any)?.hospital || me;
                    if (myHospital && (myHospital._id || myHospital.id)) {
                        setHospitalInfo(myHospital);
                    }
                } catch (e) {
                    console.error("Failed to fetch hospital branding", e);
                }
            }
        };
        fetchBranding();
    }, []);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);


    const { data: patientsRaw, isLoading, isFetching, refetch } = useHelpdeskPatients(
        debouncedSearch,
        page,
        limit,
        activeFilter,
        undefined, // Added to fix type error (boolean not assignable to string for channel)
        true
    );

    const { patients, total } = useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return { patients: [] as any[], total: 0 };
        if (Array.isArray(raw)) return { patients: raw, total: raw.length };
        return {
            patients: raw.data || [],
            total: raw.pagination?.total || (raw.data?.length || 0),
        };
    }, [patientsRaw]);

    const showSkeleton = isLoading && !patientsRaw;
    const showRefreshing = isFetching && !isLoading && patientsRaw;

    const totalPages = Math.ceil(total / limit);

    // Helper to resolve doctor name
    const resolveDoctorName = (appt: any) => {
        // 1. Check direct name property
        if (appt.doctor?.name) return appt.doctor.name;
        if (appt.doctorName) return appt.doctorName;

        // 2. Check if doctor is an object with ID
        const docId = appt.doctor?._id || appt.doctor?.id || (typeof appt.doctor === 'string' ? appt.doctor : null);

        if (docId && doctorMap[docId]) {
            return doctorMap[docId];
        }

        return "N/A";
    };

    // 1. Fetch History on Print Click
    const handleFetchHistory = async (patient: any) => {
        try {
            setSelectedPatientForHistory(patient);
            setShowHistoryModal(true);
            setHistoryLoading(true);

            const patientId = patient._id || patient.id;
            console.log("🔍 Fetching history for patient:", patientId, "| isIPD:", patient.isIPD);

            // Fetch both OPD appointments AND IPD admissions
            const [opdRes, ipdRes] = await Promise.all([
                helpdeskService.getPatientVisitHistory(patientId).catch(() => []),
                // Fetch IPD admissions for this patient via helpdeskService for proper proxying/auth
                helpdeskService.getPatientIPDAdmissions(patientId).catch(() => ({ admissions: [] }))
            ]);

            // getPatientVisitHistory returns an array directly
            const opdAppointments = Array.isArray(opdRes) ? opdRes : (opdRes.appointments || opdRes.data || []);
            const ipdAdmissions = ipdRes.admissions || ipdRes.data || [];

            // Transform IPD admissions to match appointment structure
            const transformedIPD = ipdAdmissions.map((adm: any) => ({
                ...adm,
                _id: adm._id,
                type: 'IPD',
                registrationType: 'IPD',
                date: adm.admissionDate || adm.createdAt,
                // 🗓️ Normalized sort key: updatedAt (discharge/payment time) > createdAt > admissionDate
                sortDate: adm.updatedAt || adm.createdAt || adm.admissionDate,
                appointmentId: adm.admissionId,
                appointmentTime: new Date(adm.admissionDate || adm.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                doctor: adm.primaryDoctor,
                // Payment fields are already flat in IPD admissions
                amount: adm.amount,
                paymentMethod: adm.paymentMethod,
                paymentStatus: adm.paymentStatus,
                // Add patient details if available
                patient: adm.patient,
                vitals: adm.vitals
            }));

            // 3. De-duplicate IPD records (Hide the "Appointment" row if an "Admission" row exists for the same ID)
            const admissionIds = new Set(transformedIPD.map((a: any) => a.appointmentId || a.admissionId || a._id));

            const filteredOPD = opdAppointments.filter((apt: any) => {
                if (apt.type === 'IPD' || apt.registrationType === 'IPD') {
                    // Check both the professional ID and the internal admission ID/Object ID
                    const aptId = apt.appointmentId;
                    const admId = apt.admissionId;
                    const objId = apt._id;

                    // If we find a match in the admission list for ANY of these identifiers, skip this row
                    return !admissionIds.has(aptId) && !admissionIds.has(admId) && !admissionIds.has(objId);
                }
                return true;
            });

            // Merge and sort by most recent activity (payment/update time), not scheduled date
            // 🗓️ NORMALIZED SORT: updatedAt > createdAt > date
            // OPD: updatedAt = when payment was applied; date = old scheduled date (wrong for sort)
            // IPD: sortDate = updatedAt (discharge time) added during transform above
            const getSortKey = (r: any) =>
                new Date(r.sortDate || r.updatedAt || r.createdAt || r.date || 0).getTime();
            const allHistory = [...filteredOPD, ...transformedIPD].sort((a, b) =>
                getSortKey(b) - getSortKey(a)
            );

            console.log("📋 Total history records:", allHistory.length, "| OPD:", opdAppointments.length, "| IPD:", transformedIPD.length);
            console.log("💰 Payment data check:", allHistory.map((a: any) => ({
                id: a._id?.substring(0, 8),
                type: a.type || a.patientType || a.registrationType,
                amount: a.amount,
                paymentAmount: a.payment?.amount,
                paymentMethod: a.paymentMethod || a.payment?.paymentMethod,
                paymentStatus: a.paymentStatus || a.payment?.paymentStatus
            })));

            setAppointmentHistory(allHistory);
            setHistoryLoading(false);

        } catch (error) {
            console.error("❌ Error fetching patient history:", error);
            setHistoryLoading(false);
            toast.error("Failed to retrieve patient history.");
        }
    };

    // 2. Select Appointment & Generate Receipt
    const handleSelectAppointment = async (appt: any) => {
        try {
            console.log("Selected Appointment for Receipt:", appt); // Debug Log

            const patient = selectedPatientForHistory;
            if (!patient || !appt) return;

            // Close history modal, open receipt modal
            setShowHistoryModal(false);

            // Resolve Doctor Name
            const doctorName = resolveDoctorName(appt);

            // Refetch fresh hospital info to ensure opdFollowUpDays is up-to-date!
            let freshHospitalInfo = hospitalInfo;
            try {
                const hRes = await hospitalAdminService.getHospital();
                const hData = (hRes as any)?.hospital || hRes;
                if (hData && (hData._id || hData.id)) {
                    freshHospitalInfo = hData;
                    setHospitalInfo(hData);
                } else {
                    throw new Error("Invalid structure from hospitalAdmin API");
                }
            } catch (e) {
                try {
                    const me = await helpdeskService.getMe();
                    const myHospital = (me as any)?.hospital || me;
                    if (myHospital && (myHospital._id || myHospital.id)) {
                        freshHospitalInfo = myHospital;
                        setHospitalInfo(myHospital);
                    }
                } catch (err) {
                    console.error("Failed to refetch fresh hospital info", err);
                }
            }

            // Construct Receipt Data using the SELECTED appointment
            const data = {
                hospital: {
                    name: freshHospitalInfo?.name || appt.hospitalInfo?.name || appt.hospital?.name || "CureChain Hospital",
                    address: freshHospitalInfo?.address || appt.hospitalInfo?.address || appt.hospital?.address || "",
                    contact: freshHospitalInfo?.phone || appt.hospitalInfo?.phone || appt.hospital?.phone || "",
                    email: freshHospitalInfo?.email || appt.hospitalInfo?.email || appt.hospital?.email || "",
                    logo: freshHospitalInfo?.logo,
                    opdFollowUpDays: freshHospitalInfo?.opdFollowUpDays ?? appt.hospitalInfo?.opdFollowUpDays ?? appt.hospital?.opdFollowUpDays,
                    ipdFollowUpDays: freshHospitalInfo?.ipdFollowUpDays ?? appt.hospitalInfo?.ipdFollowUpDays ?? appt.hospital?.ipdFollowUpDays,
                    enableFollowUpExpiry: freshHospitalInfo?.enableFollowUpExpiry ?? appt.hospitalInfo?.enableFollowUpExpiry ?? appt.hospital?.enableFollowUpExpiry
                },
                patient: {
                    name: formatPatientNameWithPrefix(sanitizePatientName(patient.name || patient.user?.name), patient.profile?.honorific || patient.honorific),
                    honorific: patient.profile?.honorific || patient.honorific,
                    mrn: patient.profile?.mrn || patient.mrn || appt.patient?.mrn || "N/A",
                    age: computeAgeFromDob(patient.profile?.dob || patient.dob, patient.profile?.age || patient.age, patient.profile?.ageUnit || patient.ageUnit),
                    gender: patient.profile?.gender || patient.gender || appt.patientDetails?.gender || appt.patient?.gender,
                    mobile: patient.mobile || patient.user?.mobile || appt.patient?.mobile,
                    bloodGroup: patient.profile?.bloodGroup || patient.bloodGroup || appt.patientDetails?.bloodGroup,
                    address: patient.address || patient.profile?.address || appt.patient?.address,

                    // Priority Mapping for Email: EmergencyContactEmail > Patient Email > User Email > Appointment Email
                    email: patient.profile?.emergencyContactEmail || patient.emergencyContactEmail || patient.email || patient.user?.email || appt.patient?.email,

                    dateOfBirth: patient.profile?.dob || appt.patient?.dob,
                    emergencyContact: patient.profile?.alternateNumber || appt.patient?.emergencyContact,
                    medicalHistory: patient.profile?.medicalHistory || appt.profileInfo?.medicalHistory,
                    allergies: patient.profile?.allergies || appt.profileInfo?.allergies,
                    symptoms: appt.symptoms || appt.reason || appt.chiefComplaint,
                    guardianName: appt.guardianName || appt.patientDetails?.guardianName || '',
                    guardianRelation: appt.guardianRelation || appt.patientDetails?.guardianRelation || '',
                    guardianMobile: appt.guardianMobile || appt.patientDetails?.guardianMobile || '',
                    doctorReference: appt.doctorReference || appt.patientDetails?.doctorReference || '',
                    vitals: {
                        height: appt.vitals?.height || patient.profile?.height,
                        weight: appt.vitals?.weight || patient.profile?.weight,
                        bp: appt.vitals?.bp || appt.vitals?.bloodPressure,
                        pulse: appt.vitals?.pulse || appt.vitals?.heartRate,
                        temp: appt.vitals?.temp || appt.vitals?.temperature,
                        temperature: appt.vitals?.temperature || appt.vitals?.temp,
                        spo2: appt.vitals?.spo2 || appt.vitals?.spO2,
                        spO2: appt.vitals?.spO2 || appt.vitals?.spo2,
                        glucose: appt.vitals?.glucose || appt.vitals?.sugar,
                        sugar: appt.vitals?.sugar || appt.vitals?.glucose
                    }
                },
                appointment: {
                    doctorName: doctorName,
                    degree: appt.doctor?.qualification || appt.doctor?.degree || "",
                    specialization: appt.doctor?.specialization || appt.department || "",
                    date: new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    time: appt.appointmentTime || appt.startTime || "N/A",
                    bookedAt: appt.createdAt || appt.date || new Date().toISOString(),
                    type: appt.type || "OPD",
                    visitType: appt.visitType || appt.visitCalculations || "First Visit",
                    followUpStatus: appt.followUpStatus || undefined,
                    appointmentId: appt.appointmentId || appt._id?.substring(0, 8).toUpperCase(),
                    tokenNo: appt.token_number || appt.tokenNo || appt.tokenNumber || "N/A",
                    discount: Number(appt.payment?.discount ?? appt.discount ?? 0),
                    fee: Number(appt.payment?.fee ?? appt.fee ?? 0),
                    amount: Number(appt.payment?.amount ?? appt.amount ?? 0),
                    guardianName: appt.guardianName || appt.patientDetails?.guardianName || '',
                    guardianRelation: appt.guardianRelation || appt.patientDetails?.guardianRelation || '',
                    guardianMobile: appt.guardianMobile || appt.patientDetails?.guardianMobile || '',
                    doctorReference: appt.doctorReference || appt.patientDetails?.doctorReference || '',
                },
                payment: {
                    // Handle both OPD (nested payment) and IPD (flat payment fields)
                    amount: Number(appt.payment?.amount ?? appt.amount ?? 0),
                    fee: Number(appt.payment?.fee ?? appt.fee ?? appt.payment?.totalBillAmount ?? appt.totalBillAmount ?? appt.payment?.originalAmount ?? appt.originalAmount ?? (Number(appt.payment?.amount ?? appt.amount ?? 0) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    totalBillAmount: Number(appt.payment?.totalBillAmount ?? appt.totalBillAmount ?? appt.payment?.fee ?? appt.fee ?? (Number(appt.payment?.amount ?? appt.amount ?? 0) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    originalAmount: Number(appt.payment?.originalAmount ?? appt.originalAmount ?? appt.payment?.fee ?? appt.fee ?? (Number(appt.payment?.amount ?? appt.amount ?? 0) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    discount: Number(appt.payment?.discount ?? appt.discount ?? 0),
                    discountAmount: Number(appt.payment?.discountAmount ?? appt.discountAmount ?? appt.payment?.discount ?? appt.discount ?? 0),
                    discountType: appt.payment?.discountType || appt.discountType || 'flat',
                    discountValue: Number(appt.payment?.discountValue ?? appt.discountValue ?? 0),
                    totalPaidAmount: Number(appt.payment?.totalPaidAmount ?? appt.totalPaidAmount ?? appt.payment?.paidAmount ?? appt.paidAmount ?? appt.payment?.amount ?? appt.amount ?? 0),
                    paidAmount: Number(appt.payment?.paidAmount ?? appt.paidAmount ?? appt.payment?.amount ?? appt.amount ?? 0),
                    advanceAmount: Number(appt.payment?.advanceAmount ?? appt.advanceAmount ?? (appt.type === 'IPD' ? (appt.payment?.amount ?? appt.amount ?? 0) : 0)),
                    method: appt.payment?.paymentMethod || appt.paymentMethod || 'cash',
                    status: appt.payment?.paymentStatus || appt.paymentStatus || 'not_required',
                    receiptNumber: appt.payment?.transactionId || appt.payment?.receiptNumber || appt.transactionId || appt.appointmentId || `REC-${Date.now().toString().slice(-6)}`
                }
            };

            setReceiptData(data);
            setShowReceipt(true);

        } catch (error) {
            console.error(error);
            toast.error("Failed to generate receipt.");
        }
    };


    // Initial loading state should only show skeleton for the list, not the whole page
    // to prevent losing focus on the search input.

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-8">

                {/* CONSOLIDATED HEADER & CONTROLS */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-full mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 pt-2">
                        <div className="flex items-center gap-3">
                            <Link href="/helpdesk" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    Patient Registry
                                </h1>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Medical Records • Document Manifest</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="relative flex-1 sm:w-80 group">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[14px] sm:size-[16px]" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search Name, MRN, Mobile..."
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    toast.loading('Refreshing page...', { duration: 1000 });
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 800);
                                }}
                                disabled={isFetching}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-teal-600 shadow-sm active:scale-95 disabled:opacity-50"
                                aria-label="Refresh Patients"
                            >
                                <RefreshCw size={16} className={`${showRefreshing ? 'animate-spin' : ''} sm:size-[18px]`} />
                            </button>
                            <Link
                                href="/helpdesk/patient-registration"
                                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-teal-600  text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                            >
                                <Plus size={14} className="sm:size-[16px]" /> <span className="hidden sm:inline">Register</span><span className="sm:hidden">Reg</span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-3 px-2">
                        {/* FILTER TOGGLE & COUNT - HORIZONTAL ON MOBILE */}
                        <div className="flex flex-row items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-0.5 p-1 bg-slate-100 border border-slate-200 rounded-lg sm:rounded-xl shadow-inner shadow-slate-200/50 shrink-0">
                                {(['all', 'ipd', 'opd'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setPage(1); }}
                                        className={`px-2 sm:px-5 py-1.5 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === f
                                            ? 'bg-white text-teal-600 shadow-sm border border-slate-200'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {f === 'all' ? 'All' : f === 'ipd' ? 'IPD' : 'OPD'}<span className="hidden sm:inline"> {f === 'all' ? 'Objects' : f === 'ipd' ? 'Records' : 'Registry'}</span>
                                    </button>
                                ))}
                            </div>

                            {/* DYNAMIC PATIENT COUNT */}
                            <div className="px-2 sm:px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-lg flex items-center gap-1.5 sm:gap-2 shadow-sm shrink-0 whitespace-nowrap">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                <span className="text-[8px] sm:text-[10px] font-black text-teal-700 uppercase tracking-widest">
                                    {total} {activeFilter === 'all' ? 'Total' : activeFilter.toUpperCase()} <span className="hidden xs:inline">Patients</span>
                                </span>
                            </div>
                        </div>

                        {/* COMPACT PAGINATION */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-4 py-1.5 text-xs font-black text-slate-900 bg-white rounded-md shadow-sm border border-slate-100 min-w-[60px] text-center">
                                    {page} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* LISTING PANEL */}
                <div className="max-w-full mx-auto">
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                        <div className="overflow-x-auto w-full no-scrollbar">
                            {(isLoading && patients.length === 0) ? (
                                <div className="py-40 flex flex-col items-center justify-center gap-4">
                                    <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</p>
                                </div>
                            ) : patients.length > 0 ? (
                                <table className="w-full min-w-[700px] table-auto">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            <th className="w-16 px-4 py-3 sm:py-4 text-center">#</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-64 lg:w-80">MRN Number</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left min-w-[200px]">Patient Name</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Age</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center w-24">Gender</th>
                                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-left w-auto">Phone Number</th>
                                            <th className="w-[120px] px-4 py-3 sm:py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((patient: any, idx: number) => {
                                            const patientId = patient._id || patient.id;
                                            const isIPD = patient.isIPD;
                                            const serialNo = ((page - 1) * limit) + idx + 1;

                                            return (
                                                <tr key={`${patientId}-${idx}`} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[11px] lg:text-[13px] font-black text-slate-300 group-hover:text-teal-500 transition-colors">
                                                            {serialNo.toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <span className="text-[12px] lg:text-[14px] font-extra-bold text-slate-700 uppercase tracking-widest bg-slate-100/50 px-2.5 py-1 rounded-md border border-slate-100 block truncate">
                                                            {patient.profile?.mrn || patient.mrn}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl transition-all flex items-center justify-center font-bold text-sm shadow-sm border shrink-0 ${isIPD
                                                                ? 'bg-rose-50 text-rose-300 group-hover:bg-rose-600 group-hover:text-white border-rose-100'
                                                                : 'bg-slate-50 text-slate-300 group-hover:bg-teal-600 group-hover:text-white border-slate-100'
                                                                }`}>
                                                                {sanitizePatientName(patient.name || patient.user?.name).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-[13px] lg:text-[15px] font-[550] text-slate-700 uppercase tracking-tight truncate block">
                                                                    {formatPatientNameWithPrefix(sanitizePatientName(patient.name || patient.user?.name), patient.profile?.honorific || patient.honorific)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[12px] lg:text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-lg whitespace-nowrap">
                                                            {computeAgeFromDob(patient.profile?.dob || patient.dob, patient.profile?.age || patient.age, patient.profile?.ageUnit || patient.ageUnit)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[10px] lg:text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/10 px-2 py-0.5 rounded-full border border-slate-200/20">
                                                            {patient.profile?.gender || patient.gender}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[11px] lg:text-[13px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                                                            {patient.mobile || patient.user?.mobile}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => router.push(`/helpdesk/patients/${patientId}`)}
                                                                className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                                title="View Profile"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleFetchHistory(patient)}
                                                                className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-teal-600 hover:border-teal-200 shadow-sm transition-all active:scale-95"
                                                                title="Print Receipt"
                                                            >
                                                                <Printer size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/${params.hospitalId}/frontdesk/transaction-reports?patientId=${patientId}`)}
                                                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                title="Transaction Report"
                                                            >
                                                                <CreditCard size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/helpdesk/appointment-booking?patientId=${patientId}`)}
                                                                className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-md shadow-teal-900/10 transition-all"
                                                                title="New Appointment"
                                                            >
                                                                <Calendar size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-40 text-center">
                                    <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No patient nodes indexed in registry</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ENHANCED PAGINATION CONTROLS AT BOTTOM */}
                    {totalPages > 1 && patients.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} patients
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-gray-300 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        <ChevronLeft size={14} /> Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                                            // Show first 5 pages, current page area, and last page
                                            const pageNum = i + 1;
                                            const showPage = pageNum <= 5 ||
                                                pageNum === totalPages ||
                                                (pageNum >= page - 1 && pageNum <= page + 1);

                                            if (!showPage && pageNum === 6 && page > 7) {
                                                return <span key={pageNum} className="px-2 text-slate-400">...</span>;
                                            }

                                            if (!showPage) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${page === pageNum
                                                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
                                                        : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-gray-300 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* HISTORY SELECTION MODAL */}
            {showHistoryModal && (
                <AppointmentHistoryModal
                    patientName={selectedPatientForHistory?.name || selectedPatientForHistory?.user?.name || "Patient"}
                    appointments={appointmentHistory}
                    isLoading={historyLoading}
                    onSelect={handleSelectAppointment}
                    onClose={() => setShowHistoryModal(false)}
                    doctorMap={doctorMap} // Passing doctorMap
                />
            )}

            {/* RECEIPT PREVIEW MODAL */}
            {showReceipt && receiptData && (
                <ClinicalReceipt
                    hospital={receiptData.hospital}
                    patient={receiptData.patient}
                    appointment={receiptData.appointment}
                    payment={receiptData.payment}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
}
