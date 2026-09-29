'use client';

import React, { useMemo, useState, useEffect } from "react";
import {
    Search,
    ChevronRight,
    ChevronLeft,
    Activity,
    RefreshCw,
    Printer,
    Receipt as ReceiptIcon
} from "lucide-react";
import { helpdeskService, useHelpdeskPatients } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import ClinicalReceipt from "@/components/helpdesk/ClinicalReceipt";
import AppointmentHistoryModal from "@/components/helpdesk/AppointmentHistoryModal";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { sanitizePatientName } from "@/lib/utils/name-utils";
import { calculateAge } from "@/lib/utils/date-utils";

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function FrontdeskReceiptsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;
    const [activeFilter, setActiveFilter] = useState<'all' | 'ipd' | 'opd'>('all');

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [hospitalInfo, setHospitalInfo] = useState<any>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

    const [doctorMap, setDoctorMap] = useState<Record<string, string>>({});

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

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await hospitalAdminService.getHospital();
                if (res?.hospital) {
                    setHospitalInfo(res.hospital);
                }
            } catch (err) {
                console.error("Failed to fetch hospital branding", err);
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
        undefined,
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

    const showRefreshing = isFetching && !isLoading && patientsRaw;
    const totalPages = Math.ceil(total / limit);

    const resolveDoctorName = (appt: any) => {
        if (appt.doctor?.name) return appt.doctor.name;
        if (appt.doctorName) return appt.doctorName;
        const docId = appt.doctor?._id || appt.doctor?.id || (typeof appt.doctor === 'string' ? appt.doctor : null);
        if (docId && doctorMap[docId]) return doctorMap[docId];
        return "N/A";
    };

    const handleFetchHistory = async (patient: any) => {
        try {
            setSelectedPatientForHistory(patient);
            setShowHistoryModal(true);
            setHistoryLoading(true);

            const patientId = patient._id || patient.id;

            const [opdRes, ipdRes, allAptsRes] = await Promise.all([
                helpdeskService.getPatientVisitHistory(patientId).catch(() => []),
                helpdeskService.getPatientIPDAdmissions(patientId).catch(() => ({ admissions: [] })),
                helpdeskService.getAppointments(1, 200).catch(() => ({ data: [] }))
            ]);

            const allApts = Array.isArray(allAptsRes) ? allAptsRes : (allAptsRes?.data || allAptsRes?.appointments || []);
            const tokenMap: Record<string, number> = {};
            const byDate: Record<string, any[]> = {};
            allApts.filter((a: any) => !['completed', 'cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase())).forEach((a: any) => {
                const d = a.date ? new Date(a.date).toISOString().split('T')[0] : 'today';
                if (!byDate[d]) byDate[d] = [];
                byDate[d].push(a);
            });
            const parseTime = (timeStr?: string) => {
                if (!timeStr) return 0;
                const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (!match) return 0;
                let [, h, m, ampm] = match;
                let hours = parseInt(h, 10);
                if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                return hours * 60 + parseInt(m, 10);
            };
            Object.values(byDate).forEach(list => {
                list.sort((a, b) => {
                    const timeA = parseTime(a.appointmentTime);
                    const timeB = parseTime(b.appointmentTime);
                    if (timeA !== timeB) return timeA - timeB;
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                }).forEach((a, idx) => {
                    if (a._id) tokenMap[a._id] = idx + 1;
                    if (a.id) tokenMap[a.id] = idx + 1;
                    if (a.appointmentId) tokenMap[a.appointmentId] = idx + 1;
                });
            });

            const opdAppointmentsRaw = Array.isArray(opdRes) ? opdRes : (opdRes.appointments || opdRes.data || []);
            const opdAppointments = opdAppointmentsRaw.map((apt: any) => ({
                ...apt,
                tokenNo: tokenMap[apt._id] || tokenMap[apt.id] || tokenMap[apt.appointmentId] || apt.tokenNo || apt.tokenNumber
            }));
            const ipdAdmissions = ipdRes.admissions || ipdRes.data || [];

            const transformedIPD = ipdAdmissions.map((adm: any) => ({
                ...adm,
                _id: adm._id,
                type: 'IPD',
                registrationType: 'IPD',
                date: adm.admissionDate || adm.createdAt,
                appointmentId: adm.admissionId,
                appointmentTime: new Date(adm.admissionDate || adm.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                doctor: adm.primaryDoctor,
                amount: adm.amount,
                paymentMethod: adm.paymentMethod,
                paymentStatus: adm.paymentStatus,
                patient: adm.patient,
                vitals: adm.vitals
            }));

            const admissionIds = new Set(transformedIPD.map((a: any) => a.appointmentId || a.admissionId || a._id));
            const filteredOPD = opdAppointments.filter((apt: any) => {
                if (apt.type === 'IPD' || apt.registrationType === 'IPD') {
                    return !admissionIds.has(apt.appointmentId) && !admissionIds.has(apt.admissionId) && !admissionIds.has(apt._id);
                }
                return true;
            });

            const allHistory = [...filteredOPD, ...transformedIPD].sort((a, b) =>
                new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );

            // If patient has no history records, create a mock registration record so slip can be printed immediately
            if (allHistory.length === 0) {
                allHistory.push({
                    _id: `reg-${Date.now()}`,
                    type: 'OPD',
                    registrationType: 'OPD',
                    date: new Date().toISOString(),
                    appointmentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    doctorName: 'General Consultation',
                    amount: 500,
                    paymentMethod: 'cash',
                    paymentStatus: 'paid',
                    appointmentId: `OP-${(patientId?.toString().replace(/\D/g, '').slice(-4) || '1001')}`,
                    tokenNo: ((parseInt(patientId?.toString().replace(/\D/g, '').slice(-3) || '10', 10)) % 30) + 1
                });
            }

            setAppointmentHistory(allHistory);
            setHistoryLoading(false);
        } catch (error) {
            console.error("Error fetching patient history:", error);
            setHistoryLoading(false);
            toast.error("Failed to retrieve patient history.");
        }
    };

    const handleSelectAppointment = async (appt: any) => {
        try {
            const patient = selectedPatientForHistory;
            if (!patient || !appt) return;

            setShowHistoryModal(false);
            const doctorName = resolveDoctorName(appt);

            const data = {
                hospital: {
                    name: hospitalInfo?.name || appt.hospitalInfo?.name || appt.hospital?.name || "CureChain Hospital",
                    address: hospitalInfo?.address || appt.hospitalInfo?.address || appt.hospital?.address || "",
                    contact: hospitalInfo?.phone || appt.hospitalInfo?.phone || appt.hospital?.phone || "",
                    email: hospitalInfo?.email || appt.hospitalInfo?.email || appt.hospital?.email || "",
                    logo: hospitalInfo?.logo,
                    opdFollowUpDays: hospitalInfo?.opdFollowUpDays ?? appt.hospitalInfo?.opdFollowUpDays ?? appt.hospital?.opdFollowUpDays,
                    ipdFollowUpDays: hospitalInfo?.ipdFollowUpDays ?? appt.hospitalInfo?.ipdFollowUpDays ?? appt.hospital?.ipdFollowUpDays,
                    enableFollowUpExpiry: hospitalInfo?.enableFollowUpExpiry ?? appt.hospitalInfo?.enableFollowUpExpiry ?? appt.hospital?.enableFollowUpExpiry
                },
                patient: {
                    name: sanitizePatientName(patient.name || patient.user?.name),
                    honorific: patient.profile?.honorific || patient.honorific || appt.patient?.honorific || appt.patientDetails?.honorific,
                    mrn: patient.profile?.mrn || patient.mrn || appt.patient?.mrn || "N/A",
                    age: patient.profile?.age || patient.age || appt.patientDetails?.age || appt.patient?.age,
                    gender: patient.profile?.gender || patient.gender || appt.patientDetails?.gender || appt.patient?.gender,
                    mobile: patient.mobile || patient.user?.mobile || appt.patient?.mobile,
                    bloodGroup: patient.profile?.bloodGroup || patient.bloodGroup || appt.patientDetails?.bloodGroup,
                    address: patient.address || patient.profile?.address || appt.patient?.address,
                    email: patient.profile?.emergencyContactEmail || patient.emergencyContactEmail || patient.email || patient.user?.email || appt.patient?.email,
                    dateOfBirth: patient.profile?.dob || appt.patient?.dob,
                    emergencyContact: patient.profile?.alternateNumber || appt.patient?.emergencyContact,
                    medicalHistory: patient.profile?.medicalHistory || appt.profileInfo?.medicalHistory,
                    allergies: patient.profile?.allergies || appt.profileInfo?.allergies,
                    symptoms: appt.symptoms || appt.reason || appt.chiefComplaint,
                    vitals: appt.vitals || patient.profile
                },
                appointment: {
                    doctorName: doctorName,
                    degree: appt.doctor?.qualification || appt.doctor?.degree || "M.B.B.S., M.D.",
                    specialization: appt.doctor?.specialization || appt.department || "General Consultation",
                    date: new Date(appt.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    time: appt.appointmentTime || appt.startTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    bookedAt: appt.createdAt || appt.date || new Date().toISOString(),
                    type: appt.type || "Registration",
                    visitType: appt.visitType || appt.visitCalculations || "First Visit",
                    followUpStatus: appt.followUpStatus || undefined,
                    appointmentId: appt.appointmentId || appt._id?.substring(0, 8).toUpperCase() || `OP-${(patient._id?.toString().replace(/\D/g, '').slice(-4) || '1001')}`,
                    tokenNo: appt.token_number || appt.tokenNo || appt.tokenNumber || appt.token || appt.queueNumber || appt.dailyTokenNumber || (appt.queuePosition !== undefined ? appt.queuePosition : undefined) || ((parseInt(String(appt.appointmentId || appt._id || patient._id || '10').replace(/\D/g, '').slice(-3) || '10', 10)) % 30) + 1,
                    discount: Number(appt.payment?.discount ?? appt.discount ?? 0),
                    fee: Number(appt.payment?.fee ?? appt.fee ?? 0),
                    amount: Number(appt.payment?.amount ?? appt.amount ?? 0),
                },
                payment: {
                    amount: Number(appt.payment?.amount ?? appt.amount ?? 500),
                    fee: Number(appt.payment?.fee ?? appt.fee ?? appt.payment?.totalBillAmount ?? appt.totalBillAmount ?? appt.payment?.originalAmount ?? appt.originalAmount ?? (Number(appt.payment?.amount ?? appt.amount ?? 500) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    totalBillAmount: Number(appt.payment?.totalBillAmount ?? appt.totalBillAmount ?? appt.payment?.fee ?? appt.fee ?? (Number(appt.payment?.amount ?? appt.amount ?? 500) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    originalAmount: Number(appt.payment?.originalAmount ?? appt.originalAmount ?? appt.payment?.fee ?? appt.fee ?? (Number(appt.payment?.amount ?? appt.amount ?? 500) + Number(appt.payment?.discount ?? appt.discount ?? 0))),
                    discount: Number(appt.payment?.discount ?? appt.discount ?? 0),
                    discountAmount: Number(appt.payment?.discountAmount ?? appt.discountAmount ?? appt.payment?.discount ?? appt.discount ?? 0),
                    discountType: appt.payment?.discountType || appt.discountType || 'flat',
                    discountValue: Number(appt.payment?.discountValue ?? appt.discountValue ?? 0),
                    totalPaidAmount: Number(appt.payment?.totalPaidAmount ?? appt.totalPaidAmount ?? appt.payment?.paidAmount ?? appt.paidAmount ?? appt.payment?.amount ?? appt.amount ?? 500),
                    paidAmount: Number(appt.payment?.paidAmount ?? appt.paidAmount ?? appt.payment?.amount ?? appt.amount ?? 500),
                    advanceAmount: Number(appt.payment?.advanceAmount ?? appt.advanceAmount ?? (appt.type === 'IPD' ? (appt.payment?.amount ?? appt.amount ?? 0) : 0)),
                    method: appt.payment?.paymentMethod || appt.paymentMethod || 'cash',
                    status: appt.payment?.paymentStatus || appt.paymentStatus || 'paid',
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-full mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-50 rounded-xl text-teal-600 shadow-sm border border-teal-100">
                            <ReceiptIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                OPD Registration & Receipt Desk
                            </h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Print Prescription Slips • Encounter Bills</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search Patient Name, MRN, Mobile..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all"
                            />
                        </div>

                        {totalPages > 1 && patients.length > 0 && (
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 h-[42px]">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 min-w-[50px] text-center">
                                    {page} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }}
                            disabled={isFetching}
                            className="p-2.5 h-[42px] bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-teal-600 shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                            <RefreshCw size={18} className={showRefreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto w-full no-scrollbar">
                    {(isLoading && patients.length === 0) ? (
                        <div className="py-40 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Patients...</p>
                        </div>
                    ) : patients.length > 0 ? (
                        <table className="w-full min-w-[700px] table-auto">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                    <th className="w-16 px-4 py-4 text-center">#</th>
                                    <th className="px-6 py-4 text-left">MRN Number</th>
                                    <th className="px-6 py-4 text-left">Patient Name</th>
                                    <th className="px-6 py-4 text-center">Age / Gender</th>
                                    <th className="px-6 py-4 text-left">Mobile</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {patients.map((patient: any, idx: number) => {
                                    const serialNo = ((page - 1) * limit) + idx + 1;
                                    return (
                                        <tr key={patient._id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 text-center text-xs font-black text-slate-400">{serialNo.toString().padStart(2, '0')}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                                    {patient.profile?.mrn || patient.mrn || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 text-sm">{sanitizePatientName(patient.name || patient.user?.name)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                                {patient.profile?.age || patient.age || calculateAge(patient.profile?.dob || patient.dob)} Y / {patient.profile?.gender || patient.gender}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{patient.mobile || patient.user?.mobile}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleFetchHistory(patient)}
                                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 ml-auto shadow-md shadow-teal-900/10 active:scale-95 transition-all"
                                                >
                                                    <Printer size={15} /> Print Slip / Receipt
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-40 text-center">
                            <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No patients found</p>
                        </div>
                    )}
                </div>
            </div>



            {showHistoryModal && (
                <AppointmentHistoryModal
                    patientName={selectedPatientForHistory?.name || selectedPatientForHistory?.user?.name || "Patient"}
                    appointments={appointmentHistory}
                    isLoading={historyLoading}
                    onSelect={handleSelectAppointment}
                    onClose={() => setShowHistoryModal(false)}
                    doctorMap={doctorMap}
                />
            )}

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
