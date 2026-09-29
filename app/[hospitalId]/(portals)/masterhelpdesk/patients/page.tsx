'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    Search,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Activity,
    Edit3,
    RefreshCw,
    Printer,
} from "lucide-react";
import { helpdeskService, useMasterPatients, useMasterDeleteAppointment } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
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

export default function MasterPatientsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params.hospitalId as string;

    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    // Receipt State
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);

    // History Modal State (OPD only for masterhelpdesk)
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

    // Doctor Lookup State
    const [doctorMap, setDoctorMap] = useState<Record<string, string>>({});

    // Fetch doctors once on mount
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const doctors = await helpdeskService.getDoctors();
                const map: Record<string, string> = {};
                const docList = Array.isArray(doctors) ? doctors : (doctors as any)?.doctors || (doctors as any)?.data || [];
                docList.forEach((doc: any) => {
                    const id = doc._id || doc.id;
                    const name = doc.name || doc.user?.name;
                    if (id && name) map[id] = name;
                });
                setDoctorMap(map);
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
                if (res?.hospital) setHospitalInfo(res.hospital);
            } catch (err) {
                console.error("Failed to fetch hospital branding", err);
            }
        };
        fetchBranding();
    }, []);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: patientsRaw, isLoading, isFetching, refetch } = useMasterPatients(
        page,
        limit,
        debouncedSearch,
        hospitalId
    );
    const deleteMutation = useMasterDeleteAppointment();

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

    // Resolve doctor name from map
    const resolveDoctorName = (appt: any) => {
        if (appt.doctor?.name) return appt.doctor.name;
        if (appt.doctorName) return appt.doctorName;
        const docId = appt.doctor?._id || appt.doctor?.id || (typeof appt.doctor === 'string' ? appt.doctor : null);
        if (docId && doctorMap[docId]) return doctorMap[docId];
        return "N/A";
    };

    // Fetch latest appointment (IPD or OPD) and directly open receipt — no history modal
    const handleFetchHistory = async (patient: any) => {
        try {
            setSelectedPatientForHistory(patient);

            const patientId = patient._id || patient.id;
            toast.loading("Loading latest appointment...", { id: "fetch-latest" });

            // Fetch both IPD and OPD history in parallel
            const [ipdRes, opdRes] = await Promise.allSettled([
                helpdeskService.getPatientIPDAdmissions?.(patientId)?.catch(() => []) ?? Promise.resolve([]),
                helpdeskService.getMasterPatientVisitHistory(patientId).catch(() => [])
            ]);

            const ipdAppointments = ipdRes.status === 'fulfilled'
                ? (ipdRes.value?.admissions || (Array.isArray(ipdRes.value) ? ipdRes.value : []))
                : [];
            const opdRaw = opdRes.status === 'fulfilled' ? opdRes.value : [];
            const opdAppointments = Array.isArray(opdRaw) ? opdRaw : (opdRaw.appointments || opdRaw.data || []);

            // Tag each with type for clarity
            const taggedIPD = ipdAppointments.map((a: any) => ({ ...a, type: a.type || "IPD", appType: "IPD" }));
            const taggedOPD = opdAppointments.map((a: any) => ({ ...a, type: a.type || "OPD", appType: "OPD" }));

            // Merge and sort by date descending to get the latest
            const allAppointments = [...taggedIPD, ...taggedOPD].sort((a, b) =>
                new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );

            toast.dismiss("fetch-latest");

            if (allAppointments.length === 0) {
                toast.error("No appointments found for this patient.");
                return;
            }

            // Directly open receipt for the latest appointment
            const latestAppt = allAppointments[0];
            handleSelectAppointment(latestAppt);
        } catch (error) {
            toast.dismiss("fetch-latest");
            console.error("Error fetching patient history:", error);
            toast.error("Failed to retrieve patient history.");
        }
    };

    const handleDeleteAppointment = async (appointmentId: string) => {
        if (!window.confirm("Are you sure you want to delete this appointment and its related transaction?")) return;
        try {
            await deleteMutation.mutateAsync(appointmentId);
            toast.success("Appointment deleted successfully");
            // Refresh history
            if (selectedPatientForHistory) {
                handleFetchHistory(selectedPatientForHistory);
            }
        } catch (err) {
            toast.error("Failed to delete appointment");
        }
    };

    // Select appointment & generate receipt
    const handleSelectAppointment = async (appt: any) => {
        try {
            const patient = selectedPatientForHistory;
            if (!patient || !appt) return;

            setShowHistoryModal(false);

            const doctorName = resolveDoctorName(appt);
            
            // Refetch fresh hospital info to ensure opdFollowUpDays is up-to-date!
            let freshHospitalInfo = hospitalInfo;
            try {
                const hRes = await hospitalAdminService.getHospital();
                if (hRes?.hospital) {
                    freshHospitalInfo = hRes.hospital;
                    setHospitalInfo(hRes.hospital);
                }
            } catch (e) {
                console.error("Failed to refetch fresh hospital info", e);
            }

            const data = {
                hospital: {
                    allergies: patient.profile?.allergies || "None",
                    symptoms: appt.symptoms || appt.reason || appt.notes || appt.chiefComplaint || "None",
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
                },
                payment: {
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
                            <div>
                                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    Patient Registry
                                </h1>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Master Records • Document Manifest</p>
                            </div>
                        </div>

                        {/* SEARCH + REFRESH + COUNT + PAGINATION all in one row */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 justify-end">
                            {/* Search */}
                            <div className="relative w-full md:flex-1 md:max-w-sm group order-first md:order-none">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[14px] sm:size-[16px]" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                    placeholder="Search Name, MRN, Mobile..."
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all"
                                />
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }}
                                disabled={isFetching}
                                className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-teal-600 shadow-sm active:scale-95 disabled:opacity-50"
                                aria-label="Refresh"
                            >
                                <RefreshCw size={16} className={`${showRefreshing ? 'animate-spin' : ''} sm:size-[18px]`} />
                            </button>

                            {/* Patient Count */}
                            <div className="px-2 sm:px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-lg flex items-center gap-1.5 sm:gap-2 shadow-sm shrink-0 whitespace-nowrap">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                <span className="text-[8px] sm:text-[10px] font-black text-teal-700 uppercase tracking-widest">
                                    {total} Total
                                </span>
                            </div>

                            {/* Inline Pagination */}
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
                                            <th className="w-[140px] px-4 py-3 sm:py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((patient: any, idx: number) => {
                                            const patientId = patient._id || patient.id;
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
                                                            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl transition-all flex items-center justify-center font-bold text-sm shadow-sm border shrink-0 bg-slate-50 text-slate-300 group-hover:bg-teal-600 group-hover:text-white border-slate-100">
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
                                                        <span className="text-[12px] lg:text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200/50 px-2 py-1 rounded-lg">
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
                                                            {/* Edit patient — navigates to helpdesk edit page */}
                                                            <button
                                                                onClick={() => router.push(`/${hospitalId}/masterhelpdesk/patients/${patientId}`)}
                                                                className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                                title="Edit Patient Profile"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>

                                                            {/* Print Latest Receipt */}
                                                            <button
                                                                onClick={() => handleFetchHistory(patient)}
                                                                className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-teal-600 hover:border-teal-200 shadow-sm transition-all active:scale-95"
                                                                title="Print Latest Receipt"
                                                            >
                                                                <Printer size={14} />
                                                            </button>

                                                            {/* New appointment booking with patient autofill */}
                                                            <button
                                                                onClick={() => router.push(`/${hospitalId}/masterhelpdesk/appointment-booking?patientId=${patientId}`)}
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

                    {/* BOTTOM PAGINATION REMOVED AS PER USER REQUEST */}
                </div>
            </div>

            {/* OPD APPOINTMENT HISTORY MODAL */}
            {showHistoryModal && (
                <AppointmentHistoryModal
                    patientName={selectedPatientForHistory?.name || selectedPatientForHistory?.user?.name || "Patient"}
                    appointments={appointmentHistory}
                    isLoading={historyLoading}
                    onSelect={handleSelectAppointment}
                    onDelete={handleDeleteAppointment}
                    onClose={() => setShowHistoryModal(false)}
                    doctorMap={doctorMap}
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
