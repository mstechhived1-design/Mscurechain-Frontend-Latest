'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Search,
    User,
    Stethoscope,
    ChevronRight,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Activity,
    CreditCard,
    Banknote,
    Smartphone,
    Info,
    RefreshCw,
    Hash,
    PenTool,
    AlertTriangle,
    Receipt,
    FileText,
    Check,
    Phone,
    X,
    Droplets
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { helpdeskService, ipdService } from "@/lib/integrations";
import type { HelpdeskDoctor, HelpdeskProfile, Bed } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { generateClinicalReceiptHtml, computeAgeFromDob } from "@/lib/print-utils";
import { formatDoctorName, formatPatientNameWithPrefix, GUARDIAN_RELATIONS, HONORIFIC_OPTIONS } from "@/lib/utils/name-utils";
import ClinicalReceipt from "@/components/helpdesk/ClinicalReceipt";

export default function AppointmentBooking() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const patientIdFromQuery = ((searchParams?.get('patientId') ?? null) ?? null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState<HelpdeskProfile | null>(null);
    const [hospitalBranding, setHospitalBranding] = useState<any>(null);
    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Selection State
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientSearch, setPatientSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);

    const [selectedDoctor, setSelectedDoctor] = useState<HelpdeskDoctor | null>(null);
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        return today.toISOString().split('T')[0];
    });
    const [selectedTime, setSelectedTime] = useState(() => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    });
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingMode, setBookingMode] = useState<'queue' | 'slot'>('queue');

    const [notes, setNotes] = useState("");
    const [appointmentType, setAppointmentType] = useState("consultation");
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'mixed'>('cash');
    const [discountAmount, setDiscountAmount] = useState('0');
    const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
    const [mixedPayments, setMixedPayments] = useState({ cash: '', card: '', upi: '' });
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [sendToDoctor, setSendToDoctor] = useState(true);
    const [followUpStatus, setFollowUpStatus] = useState<{
        eligible: boolean;
        remainingDays?: number;
        message?: string;
        enableExpiry?: boolean;
        opdRange?: number;
        visitCount?: number;
        doctorVisitCount?: number;
        visitCalculations?: string;
        expiryDate?: string | Date;
        lastAppointmentDate?: string | Date;
        lastAppointmentDoctor?: string;
    } | null>(null);

    // Duplicate-appointment confirmation state
    const [existingAptWarning, setExistingAptWarning] = useState<{
        show: boolean;
        patientName: string;
        aptStatus: string;
        doctorName: string;
        confirmed: boolean;
    } | null>(null);

    // Honorific Confirmation State
    const [confirmedHonorific, setConfirmedHonorific] = useState("");
    const [isEditingHonorific, setIsEditingHonorific] = useState(false);
    const [pendingHonorific, setPendingHonorific] = useState("");
    const [showHonorificConfirmModal, setShowHonorificConfirmModal] = useState(false);

    // Appointment Additional Details State
    const [additionalDetails, setAdditionalDetails] = useState({
        guardianName: '',
        guardianRelation: '',
        guardianMobile: '',
        doctorReference: ''
    });
    const [savedPreviousGuardian, setSavedPreviousGuardian] = useState<{
        guardianName: string;
        guardianRelation: string;
        guardianMobile: string;
        doctorReference: string;
    } | null>(null);
    const [guardianMode, setGuardianMode] = useState<'previous' | 'new'>('previous');
    const [guardianLookupMessage, setGuardianLookupMessage] = useState<string | null>(null);
    const isInvalidGuardianVal = (v: any) => !v || ["N/A", "n/a", "NA", "na", "null", "undefined", "NONE", "none"].includes(String(v).trim());

    const extractCleanGuardianData = (patient: any) => {
        if (!patient) return { guardianName: '', guardianRelation: '', guardianMobile: '', doctorReference: '', isPrefilled: false };

        // Priority: lastVisit (most recent appointment at this hospital) > PatientProfile at this hospital > direct fields
        const lastVisit = patient.lastVisit || {};
        const lastVisitDetails = lastVisit.patientDetails || {};
        const profile = patient.profile || {};

        const rawName = lastVisit.guardianName || lastVisitDetails.guardianName || profile.GuardianName || patient.GuardianName || patient.guardianName;
        const rawRelation = lastVisit.guardianRelation || lastVisitDetails.guardianRelation || profile.GuardianRelation || patient.GuardianRelation || patient.guardianRelation;
        const rawMobile = lastVisit.guardianMobile || lastVisitDetails.guardianMobile || profile.GuardianMobile || patient.GuardianMobile || patient.guardianMobile;
        const rawDocRef = lastVisit.doctorReference || lastVisitDetails.doctorReference || profile.doctorReference || patient.doctorReference;

        const guardianName = isInvalidGuardianVal(rawName) ? '' : String(rawName).trim();
        const guardianRelation = isInvalidGuardianVal(rawRelation) ? '' : String(rawRelation).trim();
        const guardianMobile = isInvalidGuardianVal(rawMobile) ? '' : String(rawMobile).trim().replace(/\D/g, '');
        const doctorReference = isInvalidGuardianVal(rawDocRef) ? '' : String(rawDocRef).trim();

        const hasData = Boolean(guardianName || guardianRelation || guardianMobile || doctorReference);
        const visitCount = patient.visitCount ?? (patient.lastVisit ? 1 : 0);

        return {
            guardianName,
            guardianRelation,
            guardianMobile,
            doctorReference,
            isPrefilled: hasData && (visitCount > 0 || Boolean(patient.lastVisit)),
            visitCount
        };
    };

    const handleToggleGuardianMode = (mode: 'previous' | 'new') => {
        setGuardianMode(mode);
        setGuardianLookupMessage(null);
        if (mode === 'previous' && savedPreviousGuardian) {
            setAdditionalDetails(savedPreviousGuardian);
        } else {
            setAdditionalDetails({
                guardianName: '',
                guardianRelation: '',
                guardianMobile: '',
                doctorReference: ''
            });
        }
    };

    const handleGuardianMobileChange = async (mobileInput: string) => {
        const cleanNumber = mobileInput.replace(/\D/g, '').slice(0, 10);
        setAdditionalDetails(prev => ({ ...prev, guardianMobile: cleanNumber }));

        if (cleanNumber.length === 10) {
            try {
                const res = await helpdeskService.lookupGuardianByMobile(cleanNumber);
                if (res?.found && res?.guardianName) {
                    setAdditionalDetails(prev => ({
                        ...prev,
                        guardianName: prev.guardianName || res.guardianName,
                        guardianRelation: prev.guardianRelation || res.guardianRelation || '',
                        doctorReference: prev.doctorReference || res.doctorReference || '',
                    }));
                    setGuardianLookupMessage(`Existing Guardian Record Found: ${res.guardianName}${res.guardianRelation ? ` (${res.guardianRelation})` : ''}`);
                } else {
                    setGuardianLookupMessage(null);
                }
            } catch (e) {
                setGuardianLookupMessage(null);
            }
        } else {
            setGuardianLookupMessage(null);
        }
    };

    // IPD Specific State
    const registrationTypeFromQuery = ((searchParams?.get('type') ?? null) ?? null) as 'OPD' | 'IPD' || 'OPD';
    const [registrationType, setRegistrationType] = useState<'OPD' | 'IPD'>(registrationTypeFromQuery);
    const [beds, setBeds] = useState<Bed[]>([]);
    const [admissionData, setAdmissionData] = useState({
        roomType: '',
        roomId: '',
        bedId: '',
        diet: '',
        clinicalNotes: ''
    });
    const [ipdFee, setIpdFee] = useState('500');
    const [customClinicalFee, setCustomClinicalFee] = useState('0');
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [previewReceiptData, setPreviewReceiptData] = useState<any>(null);
    const [isBooked, setIsBooked] = useState(false);

    useEffect(() => {
        if (selectedPatient) {
            const rawH = selectedPatient.honorific || selectedPatient.profile?.honorific || selectedPatient.user?.honorific || "";
            const h = rawH === 'Mr' ? 'Mr.' : (rawH === 'Mrs' ? 'Mrs.' : (rawH === 'Ms' ? 'Ms.' : (rawH === 'Dr' ? 'Dr.' : rawH)));
            setConfirmedHonorific(h);
            setPendingHonorific(h || "Mr.");
            setIsEditingHonorific(false);

            const cleanG = extractCleanGuardianData(selectedPatient);
            if (cleanG.isPrefilled) {
                const prev = {
                    guardianName: cleanG.guardianName,
                    guardianRelation: cleanG.guardianRelation,
                    guardianMobile: cleanG.guardianMobile,
                    doctorReference: cleanG.doctorReference
                };
                setSavedPreviousGuardian(prev);
                setAdditionalDetails(prev);
                setGuardianMode('previous');
            } else {
                setSavedPreviousGuardian(null);
                setAdditionalDetails({
                    guardianName: cleanG.guardianName,
                    guardianRelation: cleanG.guardianRelation,
                    guardianMobile: cleanG.guardianMobile,
                    doctorReference: cleanG.doctorReference
                });
                setGuardianMode('new');
            }
            setGuardianLookupMessage(null);
        } else {
            setConfirmedHonorific("");
            setPendingHonorific("");
            setIsEditingHonorific(false);
            setSavedPreviousGuardian(null);
            setAdditionalDetails({
                guardianName: '',
                guardianRelation: '',
                guardianMobile: '',
                doctorReference: ''
            });
            setGuardianMode('new');
            setGuardianLookupMessage(null);
        }
    }, [selectedPatient]);

    const handleConfirmHonorificUpdate = async () => {
        if (!pendingHonorific || !selectedPatient) return;
        try {
            const patientIdToUpdate = selectedPatient.userId || selectedPatient.user?._id || selectedPatient.patientId || selectedPatient._id || selectedPatient.id;
            await helpdeskService.updatePatient(patientIdToUpdate, { honorific: pendingHonorific });
            setConfirmedHonorific(pendingHonorific);
            setSelectedPatient((prev: any) => prev ? { ...prev, honorific: pendingHonorific } : null);
            setIsEditingHonorific(false);
            setShowHonorificConfirmModal(false);
            toast.success(`Patient Master Honorific updated to ${pendingHonorific}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update patient honorific");
        }
    };

    useEffect(() => {
        if (selectedDoctor) {
            if (appointmentType === 'follow-up') {
                if (followUpStatus && followUpStatus.eligible === false) {
                    const fee = selectedDoctor.consultationFee ?? (selectedDoctor as any).hospitals?.[0]?.consultationFee ?? 0;
                    setCustomClinicalFee(fee.toString());
                } else {
                    setCustomClinicalFee('0');
                }
            } else {
                const fee = selectedDoctor.consultationFee ?? (selectedDoctor as any).hospitals?.[0]?.consultationFee ?? 0;
                setCustomClinicalFee(fee.toString());
            }
        } else {
            setCustomClinicalFee('0');
        }
    }, [selectedDoctor, appointmentType, followUpStatus]);

    const [roomSearch, setRoomSearch] = useState("");
    const [showRoomSelect, setShowRoomSelect] = useState(false);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);

    // Bed & Meta Fetching Effect - Trigger whenever registrationType switches to IPD
    useEffect(() => {
        if (registrationType === 'IPD') {
            const fetchIPDMeta = async () => {
                try {
                    const [bedsData, types, roomsData] = await Promise.all([
                        ipdService.getBeds({ status: 'Vacant' }),
                        ipdService.getUnitTypes().catch(() => []),
                        ipdService.getRooms().catch(() => [])
                    ]);
                    setBeds(bedsData);
                    setUnitTypes(types);
                    setRooms(roomsData);
                } catch (e) {
                    console.error("Failed to fetch IPD meta", e);
                }
            };
            fetchIPDMeta();
        }
    }, [registrationType]);

    // Vitals State
    const [vitals, setVitals] = useState({
        height: '', weight: '', bp: '', temperature: '', pulse: '', spo2: '', glucose: ''
    });

    const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});
    const [admissionErrors, setAdmissionErrors] = useState<Record<string, string>>({});
    const [showVitals, setShowVitals] = useState(true);

    const validateVital = (field: string, value: string) => {
        if (!value) return ''; // All vitals are optional
        const num = Number(value);

        switch (field) {
            case 'pulse':
                // Clinical range: 10 bpm (severe bradycardia / pacemaker) to 300 bpm (VT/SVT)
                if (num < 10 || num > 300) return 'Valid range: 10–300 bpm';
                break;
            case 'spo2':
                // SpO2 ≥ 1% allows recording extreme critical values
                if (num < 1 || num > 100) return 'Valid range: 1–100%';
                break;
            case 'temperature':
                // °F range: severe hypothermia (93°F) to extreme hyperthermia (115°F)
                if (num < 93 || num > 115) return 'Valid range: 93–115 °F';
                break;
            case 'glucose':
                // mg/dL: severe hypoglycemia (20) to extreme DKA (1000)
                if (num < 20 || num > 1000) return 'Valid range: 20–1000 mg/dL';
                break;
            case 'height':
                // cm: premature infant (30 cm) to extreme tall stature (272 cm)
                if (num < 30 || num > 272) return 'Valid range: 30–272 cm';
                break;
            case 'weight':
                // kg: extremely low birth weight (0.3 kg) to maximum recorded (600 kg)
                if (num < 0.3 || num > 600) return 'Valid range: 0.3–600 kg';
                break;
            case 'bp': {
                // Allow 1–3 digits on each side (e.g. 90/60, 300/180)
                if (!/^\d{1,3}\/\d{1,3}$/.test(value)) {
                    return 'Format: 120/80';
                }
                const [sStr, dStr] = value.split('/');
                const s = Number(sStr);
                const d = Number(dStr);
                // Systolic: 50 (profound shock) – 300 (hypertensive emergency)
                if (s < 50 || s > 300) return 'Systolic: 50–300 mmHg';
                // Diastolic: 20 (circulatory collapse) – 200 (hypertensive crisis)
                else if (d < 20 || d > 200) return 'Diastolic: 20–200 mmHg';
                // Diastolic must be lower than systolic (physiological requirement)
                else if (d >= s) return 'Diastolic must be less than Systolic';
                break;
            }
        }
        return '';
    };


    const handleVitalChange = (field: string, value: string) => {
        let cleanValue = value;

        // Stricter restrictions based on field type
        if (field === 'bp') {
            // Allow only digits and a single forward slash
            cleanValue = value.replace(/[^0-9/]/g, '');
            if ((cleanValue.match(/\//g) || []).length > 1) return;
        } else if (field === 'temperature') {
            // Allow only digits and a single decimal point
            cleanValue = value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 1) return; // Only 1 decimal place
        } else {
            // All other vital fields are strictly numeric
            cleanValue = value.replace(/[^0-9]/g, '');
        }

        // Character length limits per field
        // BP: up to 7 chars handles "300/200"; weight: up to 6 handles "600.00"
        const limits: Record<string, number> = {
            height: 3,
            weight: 6,
            pulse: 3,
            spo2: 3,
            temperature: 5,
            glucose: 4,
            bp: 7,
        };
        if (limits[field] && cleanValue.length > limits[field]) return;

        setVitals(prev => ({ ...prev, [field]: cleanValue }));
        setVitalsErrors(prev => ({ ...prev, [field]: validateVital(field, cleanValue) }));
    };

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const [me, allDocs, hRes] = await Promise.all([
                    helpdeskService.getMe(), 
                    helpdeskService.getDoctors(),
                    hospitalAdminService.getHospital().catch(() => null)
                ]);
                setProfile(me);
                if (hRes?.hospital) {
                    setHospitalBranding(hRes.hospital);
                } else if (me?.hospital) {
                    setHospitalBranding(me.hospital);
                }
                const validDocs = allDocs.filter((doc: any) => (doc.user?.name && doc.user.name !== 'Unknown') || (doc.name && doc.name !== 'Unknown'));
                setDoctors(validDocs);

                // const uniqueDepartments = Array.from(new Set(validDocs.flatMap(doc => doc.specialties || []).filter(Boolean)));
                // setDepartments(uniqueDepartments);

                if (patientIdFromQuery) {
                    try {
                        const patientData = await helpdeskService.getPatientById(patientIdFromQuery);
                        const profileData = patientData.profile || {};
                        const lastVisitVitals = patientData.lastVisit?.vitals || {};
                        const patientUserId = patientData.user?._id || profileData.user || patientData._id || patientIdFromQuery;

                        const transformed = {
                            ...profileData,
                            _id: patientUserId,
                            id: patientUserId,
                            patientId: patientUserId,
                            userId: patientUserId,
                            name: patientData.user?.name || patientData.name || profileData.name,
                            honorific: profileData.honorific || patientData.honorific || patientData.user?.honorific || '',
                            mobile: patientData.user?.mobile || profileData.contactNumber || patientData.profile?.contactNumber || patientData.mobile || 'N/A',
                            mrn: patientData.mrn || profileData.mrn || 'CC-' + String(patientUserId).slice(-6).toUpperCase(),
                            gender: profileData.gender || patientData.gender || 'N/A',
                            age: profileData.age || patientData.age || 'N/A',
                            dob: profileData.dob || patientData.dob || 'N/A',
                            address: profileData.address || patientData.address || 'N/A',
                            email: patientData.user?.email || profileData.emergencyContactEmail || profileData.email || 'N/A',
                            bloodGroup: profileData.bloodGroup || patientData.bloodGroup || '',
                            emergencyContact: profileData.alternateNumber || profileData.emergencyContact || patientData.emergencyContact || 'N/A',
                            allergies: profileData.allergies || patientData.allergies || [],
                            medicalHistory: profileData.medicalHistory || profileData.conditions || patientData.medicalHistory || '',
                            vitals: {
                                height: lastVisitVitals.height || profileData.height || '',
                                weight: lastVisitVitals.weight || profileData.weight || '',
                                bp: lastVisitVitals.bp || lastVisitVitals.bloodPressure || profileData.bloodPressure || '',
                                temperature: lastVisitVitals.temperature || profileData.temperature || '',
                                pulse: lastVisitVitals.pulse || profileData.pulse || '',
                                spo2: lastVisitVitals.spo2 || lastVisitVitals.spO2 || profileData.spO2 || '',
                                glucose: lastVisitVitals.glucose || lastVisitVitals.sugar || profileData.glucose || profileData.sugar || ''
                            },
                            lastVisitReason: patientData.lastVisit?.reason || '',
                            lastVisitSymptoms: Array.isArray(patientData.lastVisit?.symptoms) ? patientData.lastVisit?.symptoms.join(', ') : (patientData.lastVisit?.symptoms || ''),
                            activeAdmission: patientData.activeAdmission,
                            activeConsultation: patientData.activeConsultation,
                            lastVisit: patientData.lastVisit,
                            visitCount: patientData.visitCount,
                            profile: profileData,
                            user: patientData.user
                        };
                        setSelectedPatient(transformed);

                        if (patientData.activeAdmission) {
                            toast(`Restricted: Patient is currently admitted in IPD (ID: ${patientData.activeAdmission.admissionId})`, {
                                icon: '🚫',
                                duration: 5000,
                            });
                        } else if (patientData.activeConsultation) {
                            toast(`Restricted: Patient has an active consultation with ${(patientData.activeConsultation.doctor as any)?.user?.name || 'a doctor'}`, {
                                icon: '⏳',
                                duration: 5000,
                            });
                        }
                        if (transformed.lastVisitReason || transformed.lastVisitSymptoms) {
                            setNotes(transformed.lastVisitReason || transformed.lastVisitSymptoms);
                        }
                    } catch (e) {
                        console.error("Error fetching patient by ID", e);
                    }
                }
                if (registrationTypeFromQuery === 'IPD') {
                    // Handled by the registrationType useEffect now to avoid duplication
                    // Extraction of departments is still needed here OR in the other effect
                }
                else {
                    // Extract unique departments/specialties from physicians anyway
                    const uniqueDepts = Array.from(new Set(validDocs.map((d: any) => d.specialty || d.specialties?.[0]).filter(Boolean)));
                    setDepartments(uniqueDepts as string[]);
                    // Still fetch unit types for the dropdown if registration type changes
                    ipdService.getUnitTypes().then(setUnitTypes).catch(() => []);
                }
            } catch (error: any) {
                toast.error("Process initialization failed. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [patientIdFromQuery, registrationTypeFromQuery]);

    useEffect(() => {
        if (selectedPatient?.vitals) {
            const initialVitals = {
                height: selectedPatient.vitals.height || '',
                weight: selectedPatient.vitals.weight || '',
                bp: selectedPatient.vitals.bp || selectedPatient.vitals.bloodPressure || '',
                temperature: selectedPatient.vitals.temperature || selectedPatient.vitals.temp || '',
                pulse: selectedPatient.vitals.pulse || '',
                spo2: selectedPatient.vitals.spo2 || selectedPatient.vitals.spO2 || '',
                glucose: selectedPatient.vitals.glucose || selectedPatient.vitals.sugar || ''
            };
            setVitals(initialVitals);
            // Validate initial vitals
            const errors: Record<string, string> = {};
            for (const key in initialVitals) {
                errors[key] = validateVital(key, initialVitals[key as keyof typeof initialVitals]);
            }
            setVitalsErrors(errors);
        }
    }, [selectedPatient]);

    // ── Duplicate appointment check ───────────────────────────────────────────
    // Fires when a patient is selected. Checks ALL active appointments for this
    // patient at THIS hospital today (hospital is already scoped via helpdeskService
    // JWT token — no cross-hospital leakage possible).
    useEffect(() => {
        // Reset any prior warning when patient changes
        setExistingAptWarning(null);

        const checkExistingAppointment = async () => {
            if (!selectedPatient) return;
            const hospitalId = profile?.hospital?._id;
            if (!hospitalId) return;

            try {
                const pId = selectedPatient?._id || selectedPatient?.id;
                const pDocId = selectedPatient?.patientId || selectedPatient?._id; 
                const pMrn = selectedPatient?.mrn;
                const pName = selectedPatient?.name || "Patient";

                // Reliable local date for filtering (consistent with Dashboard logic)
                const today = new Date();
                today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                const todayStr = today.toISOString().split('T')[0];

                console.log(`[CHECK] Investigating duplicates for ${pName}. MRN: ${pMrn}, IDs: User(${pId}), Patient(${pDocId}) | Date: ${todayStr}`);

                // DUAL FETCH STRATEGY
                const [broadResult, narrowResult] = await Promise.all([
                    helpdeskService.getAppointments(1, 100, undefined, todayStr, todayStr).catch(e => { console.error("[CHECK] Broad fetch failed", e); return []; }),
                    pId ? helpdeskService.getAppointments(1, 20, pId).catch(e => { console.error("[CHECK] Narrow fetch failed", e); return []; }) : Promise.resolve([])
                ]);
                
                const normalize = (res: any) => {
                    if (!res) return [];
                    if (Array.isArray(res)) return res;
                    return res.appointments || res.data?.appointments || res.data || [];
                };

                const appointmentsList = [...normalize(broadResult), ...normalize(narrowResult)];
                console.log(`[CHECK] Total candidates found: ${appointmentsList.length}`);
                
                if (appointmentsList.length > 0) {
                    console.log(`[CHECK] Sample Record 0:`, {
                        name: appointmentsList[0].patientName || appointmentsList[0].patient?.name,
                        mrn: appointmentsList[0].mrn || appointmentsList[0].patient?.mrn,
                        status: appointmentsList[0].status,
                        hospital: appointmentsList[0].hospital?._id || appointmentsList[0].hospital
                    });
                }

                const activeStatuses = ['pending', 'confirmed', 'in-progress', 'waiting', 'booked', 'scheduled', 'arrived', 'checked-in'];

                const existing = appointmentsList.find((apt: any) => {
                    const aptStatus = String(apt.status || '').toLowerCase();
                    const aptHospitalId = apt.hospital?._id || apt.hospital || apt.hospitalId;
                    
                    const isSameHospital = !aptHospitalId || !hospitalId || aptHospitalId.toString() === hospitalId.toString();
                    const isActive = activeStatuses.includes(aptStatus);

                    const aptPatientId = apt.patient?._id || apt.patient?.id || apt.patient || apt.patientId;
                    const aptUserId = apt.patient?.user?._id || apt.patient?.user || apt.userId;
                    const aptMrn = apt.mrn || apt.patient?.mrn || apt.patientMrn || (apt.patient && apt.patient.mrn);
                    const aptName = apt.patientName || apt.patient?.name || apt.patient?.user?.name || apt.name;

                    const idMatch = (pId && (pId === aptPatientId || pId === aptUserId)) ||
                                  (pDocId && (pDocId === aptPatientId || pDocId === aptUserId));
                    
                    const mrnMatch = (pMrn && aptMrn && String(pMrn).trim().toUpperCase() === String(aptMrn).trim().toUpperCase());
                    const nameMatch = (pName && aptName && String(pName).trim().toUpperCase() === String(aptName).trim().toUpperCase());

                    if (idMatch || mrnMatch || nameMatch) {
                        const isActive = activeStatuses.includes(aptStatus);
                        const docIdMatch = !selectedDoctor?._id || 
                                           (apt.doctor?._id || apt.doctor || apt.doctorId)?.toString() === selectedDoctor._id?.toString() ||
                                           (apt.doctor?.user?._id || apt.doctor?.user)?.toString() === (selectedDoctor.user?._id || selectedDoctor.user)?.toString();
                        
                        if (isActive && docIdMatch) return true;
                    }
                    return false;
                });

                if (existing) {
                    const aptDoctorName = existing.doctorName || existing.doctor?.user?.name || existing.doctor?.name || 'the doctor';
                    console.log(`[CHECK] ✅ DUPLICATE VERIFIED: Triggering banner for ${aptDoctorName}`);
                    setExistingAptWarning({
                        show: true,
                        patientName: selectedPatient.name,
                        aptStatus: existing.status,
                        doctorName: aptDoctorName,
                        confirmed: false,
                    });
                } else {
                    setExistingAptWarning(null);
                }
            } catch (err) {
                console.warn('[CHECK] Failed to verify existing appointments:', err);
            }
        };

        checkExistingAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatient?.id, selectedPatient?._id, selectedDoctor?._id, profile?.hospital?._id]);

    useEffect(() => {
        if (selectedPatient?.activeAdmission && registrationType === 'IPD') {
            setRegistrationType('OPD');
            toast.error(`Patient is already admitted (${selectedPatient.activeAdmission.admissionId}). Switching to OPD mode.`, {
                icon: '🏥'
            });
        }
    }, [selectedPatient, registrationType]);

    // Check follow-up eligibility
    useEffect(() => {
        const checkFollowUp = async () => {
            const pId = selectedPatient?._id || selectedPatient?.id;
            if (!pId) {
                setFollowUpStatus(null);
                return;
            }
            try {
                console.log(`[FOLLOWUP] Calling eligibility: pId=${pId} doctorId=${selectedDoctor?._id} type=${registrationType} date=${selectedDate}`);
                const res = await helpdeskService.checkFollowUpEligibility(pId, selectedDoctor?._id || undefined, registrationType, selectedDate);
                console.log(`[FOLLOWUP] Response:`, res);
                setFollowUpStatus(res);
                if (res?.eligible) {
                    setAppointmentType("follow-up");
                    setCustomClinicalFee("0");
                    toast.success(
                        res.enableExpiry 
                            ? `Eligible for Free Follow-up! (Remaining: ${res.remainingDays} days)`
                            : `Eligible for Free Follow-up! (Expiry check disabled)`,
                        { id: "follow-up-eligibility" }
                    );
                } else {
                    setAppointmentType("consultation");
                    if (selectedDoctor) {
                        const fee = selectedDoctor.consultationFee ?? (selectedDoctor as any).hospitals?.[0]?.consultationFee ?? 0;
                        setCustomClinicalFee(fee.toString());
                    }
                }
            } catch (e) {
                console.error("Failed to check follow up status:", e);
            }
        };
        checkFollowUp();
    }, [selectedPatient, selectedDoctor, registrationType, selectedDate]);

    // Patient Search Logic
    useEffect(() => {
        if (patientSearch.length < 3) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearchingPatients(true);
                const results = await helpdeskService.searchPatients(patientSearch);
                setSearchResults(Array.isArray(results) ? results : ((results as any).data || []));
            } catch (error: any) {
                console.error("Search error", error);
            } finally {
                setSearchingPatients(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    const filteredDoctors = selectedDept
        ? doctors.filter(d => (d.specialty === selectedDept || d.specialties?.[0] === selectedDept))
        : doctors;

    const fetchSlots = useCallback(async () => {
        if (!selectedDoctor?._id || !profile?.hospital?._id || !selectedDate) return;
        try {
            setLoadingSlots(true);
            setSelectedSlot(null);
            const res = await helpdeskService.getAvailability(selectedDoctor._id, profile.hospital._id, selectedDate);
            setAvailableSlots(res.slots || []);
            // Force queue mode regardless of availability
            setBookingMode('queue');
        } catch (e) {
            setBookingMode('queue');
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [selectedDoctor, profile, selectedDate]);

    useEffect(() => { fetchSlots(); }, [fetchSlots]);

    useEffect(() => {
        let mounted = true;
        let unsubscribe: (() => void) | null = null;

        const setupSocket = async () => {
            if (profile?.id) {
                const { subscribeToSocket, unsubscribeFromSocket, joinSocketRoom } = await import('@/lib/integrations/api/socket');
                
                await joinSocketRoom({
                    role: 'helpdesk',
                    userId: profile.id,
                    hospitalId: profile.hospital?._id
                });

                const handleStatusChange = (data: any) => {
                    console.log('🔔 Doctor status change received in booking page:', data);
                    const { doctorId, isOnline } = data;
                    if (mounted) {
                        setDoctors(prev =>
                            prev.map(doc =>
                                doc._id === doctorId ? { ...doc, isOnline } : doc
                            )
                        );
                        // If the currently selected doctor was toggled offline today, deselect them
                        setSelectedDoctor(prev => {
                            if (prev?._id === doctorId && isOnline === false) {
                                return null;
                            }
                            return prev;
                        });
                    }
                };

                await subscribeToSocket('doctor:status_changed', handleStatusChange);
                unsubscribe = () => {
                    unsubscribeFromSocket('doctor:status_changed', handleStatusChange);
                };
            }
        };

        setupSocket();

        return () => {
            mounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [profile]);



    const isBookingValid = () => {
        if (!selectedPatient || !selectedDoctor) return false;
        if (bookingMode === 'slot' && !selectedSlot) return false;

        const hasEmptyRequired = false; // Vitals are no longer required
        const hasVitalErrors = showVitals && Object.values(vitalsErrors).some(err => !!err);

        const hasNotesLimit = notes.length > 400;
        const hasAdmissionErrors = Object.values(admissionErrors).some(err => !!err);

        let hasMixedPaymentError = false;
        if (paymentMethod === 'mixed') {
            const baseAmount = registrationType === 'IPD' ? parseFloat(ipdFee || '0') : parseFloat(customClinicalFee || '0');
            const discountValue = parseFloat(discountAmount || '0');
            const calculatedDiscount = discountType === 'percentage' ? (baseAmount * discountValue / 100) : discountValue;
            const finalAmount = Math.max(0, baseAmount - calculatedDiscount);
            const totalMixed = (parseFloat(mixedPayments.cash || '0') + parseFloat(mixedPayments.card || '0') + parseFloat(mixedPayments.upi || '0'));
            if (Math.abs(totalMixed - finalAmount) > 0.01) {
                hasMixedPaymentError = true;
            }
        }

        if (registrationType === 'IPD') {
            if (!admissionData.bedId) return false;
            if (admissionData.diet.length > 250 || admissionData.clinicalNotes.length > 400) return false;
        }

        return !hasVitalErrors && !hasNotesLimit && !hasAdmissionErrors && !hasMixedPaymentError;
    };

    const handleBooking = async (isDetailedReceipt: boolean = false) => {
        if (!selectedPatient) { toast.error("Select a patient object"); return; }
        if (!selectedDoctor) { toast.error("Select a physician"); return; }
        if (!isBookingValid()) {
            if (paymentMethod === 'mixed') {
                const baseAmount = registrationType === 'IPD' ? parseFloat(ipdFee || '0') : parseFloat(customClinicalFee || '0');
                const discountValue = parseFloat(discountAmount || '0');
                const calculatedDiscount = discountType === 'percentage' ? (baseAmount * discountValue / 100) : discountValue;
                const finalAmount = Math.max(0, baseAmount - calculatedDiscount);
                const totalMixed = (parseFloat(mixedPayments.cash || '0') + parseFloat(mixedPayments.card || '0') + parseFloat(mixedPayments.upi || '0'));
                if (Math.abs(totalMixed - finalAmount) > 0.01) {
                    toast.error(`Mixed payments (₹${totalMixed}) must equal Final Amount (₹${finalAmount})`);
                    return;
                }
            }
            toast.error("Please correct the highlighted errors and fill all required fields.");
            return;
        }

        // If a duplicate-appointment warning is pending, auto-confirm and proceed to preview
        if (existingAptWarning?.show && !existingAptWarning.confirmed) {
            setExistingAptWarning(prev => prev ? { ...prev, confirmed: true } : null);
        }

        const baseAmount = registrationType === 'IPD' ? parseFloat(ipdFee || '0') : parseFloat(customClinicalFee || '0');
        const discountValue = parseFloat(discountAmount || '0');
        const discount = discountType === 'percentage' ? (baseAmount * discountValue / 100) : discountValue;
        const finalAmount = Math.max(0, baseAmount - discount);

        // Calculate estimated token number for the selected date based on today's count
        let estimatedToken = '01';
        try {
            const dateStr = new Date(selectedDate).toISOString().split('T')[0];
            const allAptsRes = await helpdeskService.getAppointments(1, 200, undefined, dateStr, dateStr).catch(() => ({ data: [] }));
            const allApts = Array.isArray(allAptsRes) ? allAptsRes : (allAptsRes?.data || allAptsRes?.appointments || []);
            const activeToday = allApts.filter((a: any) => !['cancelled', 'no-show', 'rejected'].includes(a.status?.toLowerCase()));
            estimatedToken = String(activeToday.length + 1).padStart(2, '0');
        } catch (e) {
            console.error("Failed to estimate token number:", e);
        }

        const latestHospital: any = hospitalBranding || profile?.hospital;

        // Render Header/Footer using cached data
        const headerHtml = renderToStaticMarkup(
            <MainHeader
                initialDetails={{
                    name: latestHospital?.name || "Hospital Name",
                    address: latestHospital?.address || "",
                    phone: latestHospital?.phone || latestHospital?.mobile || "",
                    email: latestHospital?.email || "",
                    logo: latestHospital?.logo
                }}
            />
        );

        const footerHtml = renderToStaticMarkup(
            <MainFooter
                initialDetails={{
                    name: latestHospital?.name || "Hospital Name",
                    address: latestHospital?.address || "",
                    phone: latestHospital?.phone || latestHospital?.mobile || "",
                    email: latestHospital?.email || "",
                }}
            />
        );

        const receiptData = {
            hospital: {
                name: hospitalBranding?.name || "MsCure Multi-Speciality Hospital",
                address: hospitalBranding?.address || "Medical District, Healthcare Ave",
                contact: hospitalBranding?.contact || "+91 98765 43210",
                email: hospitalBranding?.email || "helpdesk@mscure.com",
                logo: hospitalBranding?.logo,
                opdFollowUpDays: hospitalBranding?.opdFollowUpDays,
                ipdFollowUpDays: hospitalBranding?.ipdFollowUpDays,
                enableFollowUpExpiry: hospitalBranding?.enableFollowUpExpiry
            },
            patient: {
                name: selectedPatient.name,
                honorific: confirmedHonorific || selectedPatient.honorific || selectedPatient.profile?.honorific,
                mrn: selectedPatient.mrn,
                age: selectedPatient.age,
                ageUnit: selectedPatient.ageUnit || selectedPatient.profile?.ageUnit,
                gender: selectedPatient.gender,
                mobile: selectedPatient.mobile,
                dob: selectedPatient.dob,
                address: selectedPatient.address,
                email: selectedPatient.email,
                bloodGroup: selectedPatient.bloodGroup,
                emergencyContact: selectedPatient.emergencyContact,
                guardianName: additionalDetails.guardianName,
                guardianRelation: additionalDetails.guardianRelation,
                guardianMobile: additionalDetails.guardianMobile,
                doctorReference: additionalDetails.doctorReference,
                allergies: Array.isArray(selectedPatient.allergies)
                    ? Array.from(new Set(selectedPatient.allergies)).join(', ')
                    : Array.from(new Set((selectedPatient.allergies || '').split(',').map((s: string) => s.trim()).filter(Boolean))).join(', '),
                medicalHistory: Array.from(new Set((selectedPatient.medicalHistory || '').split(',').map((s: string) => s.trim()).filter(Boolean))).join(', '),
                vitals: showVitals ? {
                    height: vitals.height,
                    weight: vitals.weight,
                    bp: vitals.bp,
                    temperature: vitals.temperature,
                    pulse: vitals.pulse,
                    spo2: vitals.spo2,
                    glucose: vitals.glucose
                } : {
                    height: '',
                    weight: '',
                    bp: '',
                    temperature: '',
                    pulse: '',
                    spo2: '',
                    glucose: ''
                }
            },
            appointment: {
                doctorName: selectedDoctor?.user?.name || selectedDoctor?.name || "",
                specialization: selectedDoctor?.specialties?.[0] || 'General Physician',
                qualification: selectedDoctor?.qualifications?.[0] || 'MBBS, DM',
                date: new Date(selectedDate).toLocaleDateString('en-GB').replace(/\//g, '/'),
                time: bookingMode === 'slot' ? (selectedSlot || "") : (() => {
                    const [h, m] = selectedTime.split(':');
                    const d = new Date();
                    d.setHours(parseInt(h, 10));
                    d.setMinutes(parseInt(m, 10));
                    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                })(),
                bookedAt: new Date().toISOString(),
                type: appointmentType.toUpperCase(),
                visitType: followUpStatus?.visitCalculations || "First Visit",
                followUpStatus: followUpStatus || undefined,
                notes: notes,
                honorific: confirmedHonorific || selectedPatient.honorific || selectedPatient.profile?.honorific,
                appointmentHonorific: confirmedHonorific || selectedPatient.honorific || selectedPatient.profile?.honorific,
                guardianName: additionalDetails.guardianName,
                guardianRelation: additionalDetails.guardianRelation,
                guardianMobile: additionalDetails.guardianMobile,
                doctorReference: additionalDetails.doctorReference,
                appointmentId: 'PENDING',
                tokenNo: estimatedToken
            },
            payment: {
                amount: finalAmount,
                totalBillAmount: baseAmount,
                originalAmount: baseAmount,
                fee: baseAmount,
                discount: discount,
                discountAmount: discount,
                discountType: discountType,
                discountValue: parseFloat(discountAmount || '0'),
                totalPaidAmount: paymentStatus === 'paid' ? finalAmount : 0,
                paidAmount: paymentStatus === 'paid' ? finalAmount : 0,
                advanceAmount: registrationType === 'IPD' ? finalAmount : 0,
                method: paymentMethod.toUpperCase(),
                status: (paymentStatus === 'unpaid' ? 'pending' : paymentStatus).toUpperCase(),
                date: new Date().toISOString(),
                receiptNumber: 'PENDING'
            },
            registrationType: registrationType,
            showVitals: showVitals,
            headerHtml: headerHtml,
            footerHtml: footerHtml,
            returnUrl: '/helpdesk',
            forceDetailed: isDetailedReceipt
        };

        setPreviewReceiptData(receiptData);
        setIsBooked(false);
        setShowReceiptPreview(true);
    };

    const executeBooking = async () => {
        try {
            setSubmitting(true);
            const backendPaymentStatus = paymentStatus === 'unpaid' ? 'pending' : 'paid';
            const finalAppHonorific = confirmedHonorific || selectedPatient.honorific || selectedPatient.profile?.honorific;

            const payload = {
                patientId: selectedPatient?._id || selectedPatient?.id || "",
                doctorId: selectedDoctor?._id || "",
                date: selectedDate,
                time: bookingMode === 'slot' ? (selectedSlot || "") : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                timeSlot: bookingMode === 'slot' ? (selectedSlot || "") : "General Queue",
                startTime: bookingMode === 'slot' ? (selectedSlot || "") : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                endTime: bookingMode === 'slot' ? (selectedSlot || "") : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                type: appointmentType,
                visitType: followUpStatus?.visitCalculations || "First Visit",
                notes: notes,
                paymentMethod: paymentMethod,
                paymentStatus: backendPaymentStatus,
                patientDetails: {
                    name: selectedPatient.name,
                    honorific: finalAppHonorific,
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    duration: selectedDoctor?.consultationDuration ? `${selectedDoctor.consultationDuration} min` : "15 min",
                    guardianName: additionalDetails.guardianName,
                    guardianRelation: additionalDetails.guardianRelation,
                    guardianMobile: additionalDetails.guardianMobile,
                    doctorReference: additionalDetails.doctorReference,
                },
                honorific: finalAppHonorific,
                appointmentHonorific: finalAppHonorific,
                guardianName: additionalDetails.guardianName,
                guardianRelation: additionalDetails.guardianRelation,
                guardianMobile: additionalDetails.guardianMobile,
                doctorReference: additionalDetails.doctorReference,
                address: selectedPatient.address || selectedPatient.profile?.address,
                bloodGroup: (selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A') ? selectedPatient.bloodGroup : undefined,
                emergencyContact: selectedPatient.emergencyContact || selectedPatient.profile?.alternateNumber,
                allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : selectedPatient.allergies,
                medicalHistory: selectedPatient.medicalHistory,
                vitals: showVitals ? {
                    bp: vitals.bp || undefined,
                    temperature: vitals.temperature || undefined,
                    pulse: vitals.pulse || undefined,
                    spo2: vitals.spo2 || undefined,
                    height: vitals.height || undefined,
                    weight: vitals.weight || undefined,
                    glucose: vitals.glucose || undefined
                } : {
                    bp: undefined,
                    temperature: undefined,
                    pulse: undefined,
                    spo2: undefined,
                    height: undefined,
                    weight: undefined,
                    glucose: undefined
                }
            };

            const baseAmount = registrationType === 'IPD' ? parseFloat(ipdFee || '0') : parseFloat(customClinicalFee || '0');
            const discountValue = parseFloat(discountAmount || '0');
            const discount = discountType === 'percentage' ? (baseAmount * discountValue / 100) : discountValue;
            const finalAmount = Math.max(0, baseAmount - discount);

            // 1. Create Appointment first
            const response = await helpdeskService.createAppointment({
                ...payload,
                type: registrationType === 'IPD' ? 'IPD' : appointmentType,
                amount: finalAmount,
                discount: discount,
                paymentStatus: registrationType === 'IPD' ? backendPaymentStatus : payload.paymentStatus,
                payment: {
                    amount: finalAmount,
                    paymentMethod: paymentMethod,
                    paymentStatus: registrationType === 'IPD' ? backendPaymentStatus : payload.paymentStatus,
                    paymentDetails: paymentMethod === 'mixed' ? mixedPayments : undefined
                }
            });
            let appointment = response.appointment || response;

            // 2. Then initiate admission if IPD
            if (registrationType === 'IPD') {
                if (!admissionData.bedId) {
                    toast.error("Please select a bed for IPD admission");
                    setSubmitting(false);
                    return;
                }
                const selectedBed = beds.find(b => b._id === admissionData.bedId);
                const finalAdmissionType = (selectedBed?.type || admissionData.roomType || 'GENERAL').toUpperCase();

                const ipdRes: any = await ipdService.initiateAdmission({
                    patientId: selectedPatient?._id || selectedPatient?.id || "",
                    doctorId: selectedDoctor?._id || "",
                    bedId: admissionData.bedId,
                    admissionType: finalAdmissionType,
                    diet: admissionData.diet,
                    clinicalNotes: admissionData.clinicalNotes,
                    reason: notes,
                    vitals: showVitals ? {
                        height: vitals.height,
                        weight: vitals.weight,
                        bloodPressure: vitals.bp,
                        temperature: vitals.temperature,
                        pulse: vitals.pulse,
                        spO2: vitals.spo2,
                        glucose: vitals.glucose
                    } : {
                        height: '', weight: '', bloodPressure: '', temperature: '', pulse: '', spO2: '', glucose: ''
                    },
                    amount: finalAmount,
                    discount: discount,
                    paymentMethod: paymentMethod,
                    paymentStatus: backendPaymentStatus,
                    paymentDetails: paymentMethod === 'mixed' ? mixedPayments : undefined
                });

                if (ipdRes?.receiptNumber) {
                    appointment = { ...appointment, receiptNumber: ipdRes.receiptNumber };
                }

                toast.success("IPD Admission Initiated");
            }

            if (sendToDoctor && (appointment._id || appointment.id)) {
                try {
                    await helpdeskService.updateAppointmentStatus(appointment._id || appointment.id, 'confirmed');
                } catch (e) {
                    console.warn("[AppointmentBooking] Status sync failed (non-critical):", e);
                }
            }

            setPreviewReceiptData((prev: any) => ({
                ...prev,
                appointment: {
                    ...prev.appointment,
                    appointmentId: appointment.appointmentId || appointment._id || appointment.id || 'PENDING',
                    tokenNo: appointment.token_number || appointment.tokenNo || appointment.tokenNumber || '01'
                },
                payment: {
                    ...prev.payment,
                    receiptNumber: appointment.payment?.receiptNumber || appointment.receiptNumber
                }
            }));
            
            setIsBooked(true);
            toast.success("Booking Indexed & Receipt Generated");
        } catch (error: any) {
            toast.error(error.message || "Execution failure during booking");
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="flex flex-col items-center gap-6">
                    <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Initializing Booking Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto space-y-4 animate-in fade-in duration-500">

            {/* HEADER */}
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 px-1 sm:px-0 min-h-fit sm:min-h-[52px] gap-2">
                {/* LEFT: Breadcrumb */}
                <div className="flex items-center gap-2 z-10">
                    <Link href="/helpdesk" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-all">
                        <ArrowLeft size={14} />
                    </Link>
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Medical Scheduling / Booking</span>
                </div>
                {/* CENTER/TITLE: Title + Subtitle */}
                <div className="sm:absolute sm:inset-0 flex flex-col items-center justify-center text-center sm:pointer-events-none">
                    <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 tracking-tight">
                        {registrationType === 'IPD' ? 'IPD PATIENT ADMISSION' : 'SCHEDULE APPOINTMENT'}
                    </h1>
                    <p className="hidden sm:block text-[9px] font-bold text-teal-600 uppercase tracking-[0.2em]">Clinical Manifest Gateway</p>
                </div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden p-4 md:p-6 lg:p-8">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">

                    {/* LEFT SIDE: SELECTION & DATA */}
                    <div className="lg:col-start-1 lg:col-span-8 space-y-12 order-1 lg:order-1">

                        {/* 1. PATIENT OBJECT */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <User size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Patient Selection</h2>
                            </div>

                            {selectedPatient ? (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-5 bg-slate-50 rounded-[20px] border border-slate-200 group relative animate-in slide-in-from-left-4 duration-300">
                                    <div className="w-16 h-16 rounded-[16px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-slate-200 text-center leading-none">
                                        {selectedPatient.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{formatPatientNameWithPrefix(selectedPatient.name, confirmedHonorific || selectedPatient.honorific || selectedPatient.profile?.honorific)}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Hash size={10} className="text-teal-600" /> {selectedPatient.mrn}</span>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Phone size={10} className="text-teal-600" /> {selectedPatient.mobile}</span>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Activity size={10} className="text-teal-600" /> {computeAgeFromDob(selectedPatient.dob, selectedPatient.age, selectedPatient.ageUnit || selectedPatient.profile?.ageUnit)} / {selectedPatient.gender}</span>
                                                {selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A' && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100 text-rose-600">
                                                        <Droplets size={10} className="text-rose-500" /> {selectedPatient.bloodGroup}
                                                    </span>
                                                )}
                                                {selectedPatient.activeAdmission && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 animate-pulse">
                                                        <Activity size={10} className="text-amber-600" /> ADMITTED (Bed Assigned)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* HONORIFIC CONFIRMATION BLOCK */}
                                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Honorific Confirmation</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-black text-slate-900 uppercase">Current:</span>
                                                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-black uppercase">
                                                        {confirmedHonorific || "Not Set"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!isEditingHonorific ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => toast.success(`Using Honorific: ${confirmedHonorific || 'Default'}`)}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Check size={12} /> Keep {confirmedHonorific || 'Title'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsEditingHonorific(true); setPendingHonorific(confirmedHonorific || 'Mr.'); }}
                                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Edit Honorific
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={pendingHonorific === 'Mr' ? 'Mr.' : (pendingHonorific || 'Mr.')}
                                                            onChange={(e) => setPendingHonorific(e.target.value)}
                                                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:border-teal-500 outline-none"
                                                        >
                                                            {HONORIFIC_OPTIONS.map((h) => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowHonorificConfirmModal(true)}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsEditingHonorific(false); setPendingHonorific(confirmedHonorific); }}
                                                            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 pt-1.5 border-t border-slate-200/50">
                                            <p className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                                <AlertTriangle size={10} /> Allergies: <span className="text-slate-900">{Array.isArray(selectedPatient.allergies) ? (selectedPatient.allergies[0] || 'NONE') : (selectedPatient.allergies || 'NONE')}</span>
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                <Info size={10} /> History: <span className="text-slate-900 truncate max-w-[200px]">{selectedPatient.medicalHistory || 'CLEAR'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                        <X size={16} />
                                    </button>

                                    {/* PREMIUM MINI TOGGLE */}
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 scale-75 md:scale-90 z-10">
                                        <div className="flex bg-slate-200/40 p-1 rounded-[16px] w-fit relative overflow-hidden backdrop-blur-lg border border-white/40 shadow-xl group">
                                            {/* SLIDING BACKGROUND WITH CURVED EDGE */}
                                            <motion.div
                                                className={`absolute top-1 bottom-1 shadow-lg z-0 ${registrationType === 'OPD'
                                                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-500/30'
                                                    : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                                                    }`}
                                                initial={false}
                                                animate={{
                                                    left: registrationType === 'OPD' ? '4px' : 'calc(50% + 2px)',
                                                    width: 'calc(50% - 6px)',
                                                    borderRadius: registrationType === 'OPD' ? '12px 24px 4px 12px' : '24px 12px 12px 4px'
                                                }}
                                                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                            />

                                            {/* CROSS CURVED DIVIDER (VISUAL) */}
                                            <div className="absolute inset-0 pointer-events-none flex justify-center z-10">
                                                <motion.div
                                                    animate={{
                                                        rotate: registrationType === 'OPD' ? 15 : -15,
                                                        x: registrationType === 'OPD' ? 4 : -4
                                                    }}
                                                    className="w-[1px] h-[150%] bg-white/20 blur-[0.5px] -top-1/4 relative shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-500"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setRegistrationType('OPD')}
                                                className={`relative z-20 w-20 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${registrationType === 'OPD' ? 'text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-white/30'}`}
                                            >
                                                <span className="flex items-center justify-center gap-1">
                                                    {registrationType === 'OPD' && (
                                                        <motion.div layoutId="mini-dot" className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]" />
                                                    )}
                                                    OPD
                                                </span>
                                            </button>
                                            <div className="relative group/toggle">
                                                <button
                                                    type="button"
                                                    disabled={!!selectedPatient.activeAdmission}
                                                    onClick={() => setRegistrationType('IPD')}
                                                    className={`relative z-20 w-20 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${registrationType === 'IPD' ? 'text-white' : selectedPatient.activeAdmission ? 'text-slate-300 opacity-50 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 hover:bg-white/30'}`}
                                                >
                                                    <span className="flex items-center justify-center gap-1">
                                                        {registrationType === 'IPD' && (
                                                            <motion.div layoutId="mini-dot" className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]" />
                                                        )}
                                                        IPD
                                                    </span>
                                                </button>
                                                {selectedPatient.activeAdmission && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 text-white text-[8px] font-bold rounded-lg opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none z-50 text-center uppercase tracking-widest leading-normal shadow-2xl">
                                                        Patient is already admitted ({selectedPatient.activeAdmission.admissionId})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group w-full max-w-2xl px-2 sm:px-0">
                                    <Search className="absolute left-6 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors sm:size-[20px]" size={18} />
                                    <input
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        placeholder="SEARCH PATIENT..."
                                        className="w-full pl-12 sm:pl-14 pr-10 sm:pr-12 py-3 sm:py-5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-[20px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-[10px] sm:text-xs font-bold uppercase placeholder:text-slate-300"
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-x-0 -translate-y-1/2 flex items-center gap-3">
                                        {searchingPatients && <Loader2 className="animate-spin text-teal-600" size={20} />}
                                        {!searchingPatients && patientSearch && (
                                            <button onClick={() => { setPatientSearch(""); setSearchResults([]); }} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {(searchResults.length > 0 || (patientSearch.length > 3 && !searchingPatients)) && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[24px] shadow-2xl z-30 max-h-[400px] overflow-y-auto p-3 space-y-1 animate-in zoom-in-95 duration-200">
                                            {searchResults.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                        <Search size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Patient Not Found</p>
                                                        <p className="text-[10px] font-medium mt-1">Try searching by mobile number or MRN</p>
                                                    </div>
                                                    <Link href="/helpdesk/patient-registration" className="mt-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-colors">
                                                        Register New Patient
                                                    </Link>
                                                </div>
                                            ) : (
                                                searchResults.map(p => (
                                                    <button
                                                        key={p._id}
                                                        onClick={async () => {
                                                            const full = await helpdeskService.getPatientById(p._id);
                                                            const profileData = full.profile || {};
                                                            const lastVisitVitals = full.lastVisit?.vitals || {};
                                                            const patientUserId = full.user?._id || profileData.user || full._id || p._id;

                                                            setSelectedPatient({
                                                                ...profileData,
                                                                _id: patientUserId,
                                                                id: patientUserId,
                                                                patientId: patientUserId,
                                                                userId: patientUserId,
                                                                name: full.user?.name || full.name || profileData.name,
                                                                honorific: profileData.honorific || full.honorific || full.user?.honorific || '',
                                                                mobile: full.user?.mobile || profileData.contactNumber || full.mobile || 'N/A',
                                                                mrn: full.mrn || profileData.mrn || 'CC-' + String(patientUserId).slice(-6).toUpperCase(),
                                                                gender: profileData.gender || full.gender || 'N/A',
                                                                age: profileData.age || full.age || 'N/A',
                                                                dob: profileData.dob || full.dob || 'N/A',
                                                                address: profileData.address || full.address || 'N/A',
                                                                email: full.user?.email || profileData.emergencyContactEmail || profileData.email || 'N/A',
                                                                bloodGroup: profileData.bloodGroup || full.bloodGroup || '',
                                                                emergencyContact: profileData.alternateNumber || profileData.emergencyContact || full.emergencyContact || 'N/A',
                                                                allergies: profileData.allergies || full.allergies || [],
                                                                medicalHistory: profileData.medicalHistory || profileData.conditions || full.medicalHistory || '',
                                                                vitals: {
                                                                    height: lastVisitVitals.height || profileData.height || '',
                                                                    weight: lastVisitVitals.weight || profileData.weight || '',
                                                                    bp: lastVisitVitals.bp || lastVisitVitals.bloodPressure || profileData.bloodPressure || '',
                                                                    temperature: lastVisitVitals.temperature || profileData.temperature || '',
                                                                    pulse: lastVisitVitals.pulse || profileData.pulse || '',
                                                                    spo2: lastVisitVitals.spo2 || lastVisitVitals.spO2 || profileData.spO2 || '',
                                                                    glucose: lastVisitVitals.glucose || lastVisitVitals.sugar || profileData.glucose || profileData.sugar || ''
                                                                },
                                                                lastVisitReason: full.lastVisit?.reason || '',
                                                                lastVisitSymptoms: Array.isArray(full.lastVisit?.symptoms) ? full.lastVisit?.symptoms.join(', ') : (full.lastVisit?.symptoms || ''),
                                                                activeAdmission: full.activeAdmission,
                                                                activeConsultation: full.activeConsultation,
                                                                lastVisit: full.lastVisit,
                                                                visitCount: full.visitCount,
                                                                profile: profileData,
                                                                user: full.user
                                                            });
                                                            if (full.lastVisit?.reason || full.lastVisit?.symptoms) {
                                                                setNotes(full.lastVisit?.reason || (Array.isArray(full.lastVisit?.symptoms) ? full.lastVisit?.symptoms.join(', ') : full.lastVisit?.symptoms));
                                                            }
                                                            setPatientSearch("");
                                                            setSearchResults([]);

                                                            if (full.activeAdmission) {
                                                                toast(`Booking restricted: Patient is currently admitted in IPD (Admission ID: ${full.activeAdmission.admissionId}).`, {
                                                                    icon: '🚫',
                                                                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
                                                                    duration: 6000
                                                                });
                                                            } else if (full.activeConsultation) {
                                                                toast('Booking restricted: Patient has an active consultation currently in-progress. Please complete it first.', {
                                                                    icon: '⏳',
                                                                    style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
                                                                    duration: 6000
                                                                });
                                                            }
                                                        }}
                                                        className="w-full p-4 text-left hover:bg-slate-50 rounded-2xl flex items-center justify-between group transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                                                                {p.name?.charAt(0) || p.user?.name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900 uppercase">{p.name || p.user?.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.mobile || p.user?.mobile} • {p.mrn}</p>
                                                                    {p.activeAdmission && (
                                                                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[7px] font-black rounded-md tracking-tighter uppercase">Inpatient</span>
                                                                    )}
                                                                    {p.activeConsultation && (
                                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[7px] font-black rounded-md tracking-tighter uppercase">In Consultation</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                                            <ChevronRight size={16} />
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* ── Duplicate appointment warning banner ─────────────────────────── */}
                        {existingAptWarning?.show && !existingAptWarning.confirmed && (
                            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <AlertTriangle size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-amber-900 uppercase tracking-wide">
                                        Duplicate Appointment Detected
                                    </p>
                                    <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                                        <span className="font-bold">{existingAptWarning.patientName}</span> already has a{' '}
                                        <span className="font-bold uppercase">{existingAptWarning.aptStatus}</span> appointment
                                        with <span className="font-bold">{formatDoctorName(existingAptWarning.doctorName)}</span> at this hospital today.
                                        Do you want to book another appointment?
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setExistingAptWarning(null)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExistingAptWarning(prev => prev ? { ...prev, confirmed: true } : null)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                                        >
                                            Proceed Anyway
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* ── Follow-up Eligibility notice banner ─────────────────────────── */}
                        {followUpStatus && (
                            <div className={`flex items-start gap-4 p-4 border rounded-2xl animate-in slide-in-from-top-2 duration-300 ${
                                followUpStatus.eligible 
                                    ? "bg-teal-50 dark:bg-emerald-950/20 border-teal-200 dark:border-emerald-900/30" 
                                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"
                            }`}>
                                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                                    followUpStatus.eligible 
                                        ? "bg-teal-100 dark:bg-emerald-900/40 text-teal-600 dark:text-emerald-400" 
                                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                                }`}>
                                    {followUpStatus.eligible ? <CheckCircle2 size={18} /> : <Info size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase tracking-wide ${
                                        followUpStatus.eligible ? "text-teal-900 dark:text-emerald-300" : "text-amber-900 dark:text-amber-300"
                                    }`}>
                                        {followUpStatus.eligible ? `${followUpStatus.visitCalculations || "Follow-up Visit"} (Free Follow-up)` : `${followUpStatus.visitCalculations || "New Consultation"}`}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 leading-relaxed font-medium ${
                                        followUpStatus.eligible ? "text-teal-700 dark:text-emerald-400/80" : "text-amber-700 dark:text-amber-400/80"
                                    }`}>
                                        {followUpStatus.message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 2. DOCTOR & SCHEDULING */}
                        <section className={`space-y-5 transition-all duration-500 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <Stethoscope size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Consultant & Schedule</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <FormLabel label="Appointment Date" />
                                    <div className="relative group opacity-80">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            readOnly
                                            disabled
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none cursor-not-allowed"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <FormLabel label="Filter By Department" />
                                    <select
                                        value={selectedDept}
                                        onChange={(e) => { setSelectedDept(e.target.value); setSelectedDoctor(null); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <FormLabel label="Select Physician" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredDoctors.map(doc => {
                                        const today = new Date();
                                        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                                        const todayStr = today.toISOString().split('T')[0];
                                        const isToday = selectedDate === todayStr;
                                        const isOfflineToday = isToday && doc.isOnline === false;

                                        return (
                                            <button
                                                key={doc._id}
                                                disabled={isOfflineToday}
                                                onClick={() => setSelectedDoctor(doc)}
                                                className={`p-3.5 rounded-[16px] border-2 text-left flex items-center gap-3 transition-all ${
                                                    isOfflineToday
                                                        ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed'
                                                        : selectedDoctor?._id === doc._id
                                                        ? 'border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-500/5'
                                                        : 'border-slate-50 hover:border-slate-100 bg-white'
                                                    }`}
                                            >
                                                <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl ${
                                                    isOfflineToday
                                                        ? 'bg-slate-200 text-slate-400'
                                                        : selectedDoctor?._id === doc._id 
                                                        ? 'bg-teal-600 text-white shadow-lg' 
                                                        : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {(doc.user?.name || doc.name)?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[10px] font-black truncate text-slate-900 uppercase tracking-tight">{doc.user?.name || doc.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className={`text-[8px] font-bold uppercase tracking-[0.1em] ${
                                                            isOfflineToday
                                                                ? 'text-slate-400'
                                                                : selectedDoctor?._id === doc._id 
                                                                ? 'text-teal-600' 
                                                                : 'text-slate-400'
                                                            }`}>
                                                            {doc.specialties?.[0] || 'Medical Officer'}
                                                        </p>
                                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                            ₹{doc.consultationFee ?? (doc as any).hospitals?.[0]?.consultationFee ?? '0'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isOfflineToday ? (
                                                    <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-red-100 text-red-700 rounded-md tracking-wider">Offline</span>
                                                ) : selectedDoctor?._id === doc._id ? (
                                                    <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </section>

                        {/* 3. APPOINTMENT ADDITIONAL DETAILS */}
                        <section className={`space-y-4 transition-all duration-500 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                        <User size={14} />
                                    </div>
                                    <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Appointment Additional Details</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {savedPreviousGuardian && (
                                        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleGuardianMode('previous')}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                                    guardianMode === 'previous'
                                                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${guardianMode === 'previous' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                                                <span>Previous Guardian</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleGuardianMode('new')}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                                    guardianMode === 'new'
                                                        ? 'bg-teal-600 text-white shadow-xs ring-1 ring-teal-500'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                                }`}
                                            >
                                                <span>+ Add New Guardian</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {guardianLookupMessage && (
                                <div className="p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl flex items-center justify-between text-blue-900 text-xs font-bold animate-fadeIn">
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600">ℹ️</span>
                                        <span>{guardianLookupMessage}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGuardianLookupMessage(null)}
                                        className="text-[10px] text-blue-500 hover:text-blue-700 font-extrabold cursor-pointer px-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <FormLabel label="Guardian Name" />
                                    <input
                                        value={additionalDetails.guardianName}
                                        onChange={(e) => setAdditionalDetails(prev => ({ ...prev, guardianName: e.target.value }))}
                                        placeholder="Guardian Name"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <FormLabel label="Relationship" />
                                    <select
                                        value={additionalDetails.guardianRelation}
                                        onChange={(e) => setAdditionalDetails(prev => ({ ...prev, guardianRelation: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 focus:bg-white outline-none transition-all"
                                    >
                                        <option value="">Select Relation</option>
                                        {GUARDIAN_RELATIONS.map((rel) => (
                                            <option key={rel} value={rel}>{rel}</option>
                                        ))}
                                        {additionalDetails.guardianRelation && !(GUARDIAN_RELATIONS as readonly string[]).includes(additionalDetails.guardianRelation) && (
                                            <option value={additionalDetails.guardianRelation}>{additionalDetails.guardianRelation}</option>
                                        )}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <FormLabel label="Guardian Mobile" />
                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Hospital Scoped</span>
                                    </div>
                                    <input
                                        value={additionalDetails.guardianMobile}
                                        onChange={(e) => handleGuardianMobileChange(e.target.value)}
                                        placeholder="10-digit number"
                                        maxLength={10}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <FormLabel label="Doctor Reference" />
                                    <input
                                        value={additionalDetails.doctorReference}
                                        onChange={(e) => setAdditionalDetails(prev => ({ ...prev, doctorReference: e.target.value }))}
                                        placeholder="Referred By"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 4. CLINICAL SYMPTOMS & TRIAGE */}
                        <section className={`space-y-6 transition-all duration-700 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                    <PenTool size={14} />
                                </div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Clinical Matrix</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-0.5 px-1">
                                        <FormLabel label="Primary Symptoms / Reason for Visit" />
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${notes.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {notes.length}/400
                                        </span>
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 400) setNotes(e.target.value);
                                        }}
                                        rows={3}
                                        placeholder="Describe current symptoms..."
                                        className={`w-full px-5 py-4 bg-slate-50 border ${notes.length > 400 ? 'border-rose-500' : 'border-slate-200'} rounded-[16px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase resize-none placeholder:text-slate-300`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <FormLabel label="Vital Indicators (Triage)" />
                                        <div className="flex items-center gap-3 bg-slate-50/50 px-3 py-2 rounded-2xl border border-slate-100 shadow-sm">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${showVitals ? 'text-teal-600' : 'text-slate-400'}`}>
                                                {showVitals ? 'Vitals Active' : 'Vitals Disabled'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowVitals(!showVitals)}
                                                className={`group relative w-9 h-5 rounded-full p-1 transition-all duration-500 outline-none ${showVitals ? 'bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.4)]' : 'bg-slate-300'}`}
                                            >
                                                <motion.div
                                                    className="w-3 h-3 bg-white rounded-full shadow-md"
                                                    animate={{ x: showVitals ? 16 : 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {showVitals && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0, y: -10 }}
                                                animate={{ height: 'auto', opacity: 1, y: 0 }}
                                                exit={{ height: 0, opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3, ease: "circOut" }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                                                    <VitalField label="Height (cm)" value={vitals.height} placeholder="170" error={vitalsErrors.height} onChange={(v) => handleVitalChange('height', v)} />
                                                    <VitalField label="Weight (kg)" value={vitals.weight} placeholder="70" error={vitalsErrors.weight} onChange={(v) => handleVitalChange('weight', v)} />
                                                    <VitalField label="BP (mmHg)" value={vitals.bp} placeholder="120/80" error={vitalsErrors.bp} onChange={(v) => handleVitalChange('bp', v)} />
                                                    <VitalField label="Pulse (bpm)" value={vitals.pulse} placeholder="72" error={vitalsErrors.pulse} onChange={(v) => handleVitalChange('pulse', v)} />
                                                    <VitalField label="Temp (°F)" value={vitals.temperature} placeholder="98.6" error={vitalsErrors.temperature} onChange={(v) => handleVitalChange('temperature', v)} />
                                                    <VitalField label="SpO2 (%)" value={vitals.spo2} placeholder="99" error={vitalsErrors.spo2} onChange={(v) => handleVitalChange('spo2', v)} />
                                                    <VitalField label="Glucose (mg/dL)" value={vitals.glucose} placeholder="100" error={vitalsErrors.glucose} onChange={(v) => handleVitalChange('glucose', v)} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {!showVitals && (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-[20px] bg-slate-50/30 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Vitals are bypassed</p>
                                                <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Receipt will show empty clinical indicators</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT SIDE: FINALIZATION & REVENUE */}
                    <div className={`lg:col-start-9 lg:col-span-4 space-y-4 transition-all duration-700 order-3 lg:order-2 lg:row-start-1 lg:row-span-2 ${!selectedPatient ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div className="lg:sticky lg:top-24 space-y-4">
                            {/* REVENUE CYCLE */}
                            <div className="bg-slate-900 rounded-[20px] p-5 text-white space-y-4 shadow-xl">
                                <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-teal-400">
                                        <Receipt size={14} />
                                    </div>
                                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Revenue & Flow</h2>
                                </div>

                                <div className="space-y-2">
                                    <FormLabel label="Engagement Type" className="text-white/40" />
                                    <select
                                        value={appointmentType}
                                        onChange={(e) => setAppointmentType(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="consultation" className="bg-slate-900 text-white">General Consultation</option>
                                        <option value="emergency" className="bg-slate-900 text-white">Emergency Triage</option>
                                        <option value="follow-up" className="bg-slate-900 text-white">Follow-up Clinical</option>
                                        <option value="lab-referral" className="bg-slate-900 text-white">Lab Diagnostic Referral</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <FormLabel label="Payment Method" className="text-white/40" />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {[
                                            { id: 'cash', icon: <Banknote size={16} />, label: 'Cash' },
                                            { id: 'card', icon: <CreditCard size={16} />, label: 'Card' },
                                            { id: 'upi', icon: <Smartphone size={16} />, label: 'UPI' },
                                            { id: 'mixed', icon: <CreditCard size={16} />, label: 'Mixed' }
                                        ].map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id as any)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentMethod === method.id
                                                    ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20'
                                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                                                    }`}
                                            >
                                                {method.icon}
                                                <span className="text-[8px] font-black uppercase tracking-widest">{method.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {paymentMethod === 'mixed' && (
                                        <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Cash</p>
                                                <input
                                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                    value={mixedPayments.cash}
                                                    onChange={(e) => setMixedPayments(prev => ({...prev, cash: e.target.value}))}
                                                    className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-white p-1.5 outline-none focus:border-teal-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="₹ 0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Card</p>
                                                <input
                                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                    value={mixedPayments.card}
                                                    onChange={(e) => setMixedPayments(prev => ({...prev, card: e.target.value}))}
                                                    className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-white p-1.5 outline-none focus:border-teal-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="₹ 0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">UPI</p>
                                                <input
                                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                    value={mixedPayments.upi}
                                                    onChange={(e) => setMixedPayments(prev => ({...prev, upi: e.target.value}))}
                                                    className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-white p-1.5 outline-none focus:border-teal-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="₹ 0"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <FormLabel label="Payment Status" className="text-white/40" />
                                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                        <button
                                            onClick={() => setPaymentStatus('paid')}
                                            className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentStatus === 'paid' ? 'bg-teal-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                                                }`}
                                        >
                                            <Check size={12} /> Received
                                        </button>
                                        <button
                                            onClick={() => setPaymentStatus('unpaid')}
                                            className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentStatus === 'unpaid' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                                                }`}
                                        >
                                            Pending
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10 space-y-4">
                                    {/* Same Row: Clinical Fee/Advance on Left, Discount on Right */}
                                    <div className="grid grid-cols-2 gap-3 items-end">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{registrationType === 'IPD' ? 'Initial Advance' : 'Clinical Fee'}</p>
                                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                                <span className="text-lg font-black text-white">₹</span>
                                                {registrationType === 'IPD' ? (
                                                    <input
                                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                        value={ipdFee}
                                                        onChange={(e) => setIpdFee(e.target.value)}
                                                        className="w-full bg-transparent text-lg font-black text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                ) : (
                                                    <input
                                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                        value={customClinicalFee}
                                                        onChange={(e) => setCustomClinicalFee(e.target.value)}
                                                        className="w-full bg-transparent text-lg font-black text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        placeholder="0"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Discount</p>
                                                <div className="flex bg-white/10 rounded overflow-hidden">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setDiscountType('flat')} 
                                                        className={`px-1.5 py-0.5 text-[8px] font-black transition-all ${discountType === 'flat' ? 'bg-teal-500 text-white' : 'text-white/40 hover:text-white/60'}`}
                                                    >₹</button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setDiscountType('percentage')} 
                                                        className={`px-1.5 py-0.5 text-[8px] font-black transition-all ${discountType === 'percentage' ? 'bg-teal-500 text-white' : 'text-white/40 hover:text-white/60'}`}
                                                    >%</button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                                <span className="text-lg font-black text-rose-400">{discountType === 'flat' ? '₹' : ''}</span>
                                                <input
                                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                    value={discountAmount}
                                                    onChange={(e) => setDiscountAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-transparent text-lg font-black text-rose-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                {discountType === 'percentage' && <span className="text-lg font-black text-rose-400">%</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Amount & Discount Confirmation */}
                                    {(() => {
                                        const baseAmount = registrationType === 'IPD' ? parseFloat(ipdFee || '0') : parseFloat(customClinicalFee || '0');
                                        const discountNum = parseFloat(discountAmount || '0');
                                        const hasDiscount = discountNum > 0;
                                        const calculatedDiscount = discountType === 'percentage' ? (baseAmount * discountNum / 100) : discountNum;
                                        const finalCalculatedAmount = Math.max(0, baseAmount - calculatedDiscount).toFixed(2);

                                        return (
                                            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                                                hasDiscount 
                                                    ? 'bg-teal-500/10 border-teal-500/30 shadow-sm' 
                                                    : 'bg-white/5 border-white/10'
                                            }`}>
                                                <div>
                                                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
                                                        {hasDiscount ? 'Final Payable Amount' : 'Total Amount'}
                                                    </p>
                                                    {hasDiscount && (
                                                        <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mt-0.5">
                                                            <span>Discount:</span>
                                                            <span>-₹{calculatedDiscount.toFixed(2)} ({discountType === 'percentage' ? `${discountNum}%` : `Flat ₹${discountNum}`})</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <h4 className="text-2xl font-black text-teal-400 tracking-tight">
                                                        ₹{finalCalculatedAmount}
                                                    </h4>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="space-y-3 pt-2">
                                        <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 transition-all group">
                                            <input
                                                type="checkbox"
                                                checked={sendToDoctor}
                                                onChange={(e) => setSendToDoctor(e.target.checked)}
                                                className="w-5 h-5 rounded-lg accent-teal-500 border-white/20 bg-transparent"
                                            />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-white uppercase tracking-tight">Direct Admission</p>
                                                <p className="text-[7.5px] font-bold text-white/30 uppercase mt-0.5">Push to live doctor queue</p>
                                            </div>
                                            <CheckCircle2 size={14} className={`transition-colors ${sendToDoctor ? 'text-teal-400' : 'text-white/10'}`} />
                                        </label>

                                        {(selectedPatient?.activeAdmission || selectedPatient?.activeConsultation) && (
                                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4 animate-pulse">
                                                <div className="flex items-center gap-3 text-rose-500">
                                                    <AlertTriangle size={18} />
                                                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                                        {selectedPatient?.activeAdmission
                                                            ? `PATIENT IS CURRENTLY ADMITTED (ID: ${selectedPatient?.activeAdmission.admissionId}). CLOSE ADMISSION TO CONTINUE.`
                                                            : "PROCESS ERROR: PATIENT HAS AN ACTIVE RUNNING CONSULTATION. COMPLETE SESSION TO CONTINUE."
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-full">
                                            <button
                                                onClick={() => handleBooking(false)}
                                                disabled={submitting || !isBookingValid()}
                                                title="Print Clinical Prescription Slip & Finalize"
                                                className="w-full py-4 bg-teal-500 text-slate-900 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-400 transition-all shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                            >
                                                {submitting ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <FileText size={18} className="shrink-0" />
                                                        <span className="truncate">Save & Print Preview</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-center text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">Node: {profile?.hospital?.name?.slice(0, 8).toUpperCase() || 'SYSTEM'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* INFO WIDGET */}
                            <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Protocol Tip</h4>
                                    <p className="text-[10px] font-bold text-amber-700/70 mt-1">Verify symptoms and vitals before finalizing the print manifest.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. IPD ADMISSION FLOW (IPD ONLY) */}
                    {registrationType === 'IPD' && (
                        <div className="lg:col-start-1 lg:col-span-8 space-y-6 order-2 lg:order-3 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 pb-2">
                            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                <Activity size={14} />
                            </div>
                            <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">IPD Admission Flow</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <FormLabel label="Room Type" />
                                <select
                                    value={admissionData.roomType}
                                    onChange={(e) => setAdmissionData(prev => ({ ...prev, roomType: e.target.value as any, roomId: '', bedId: '' }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all"
                                >
                                    <option value="">All Types</option>
                                    {unitTypes.map(type => (
                                        <option key={type} value={type as any}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 relative">
                                <FormLabel label="Select Room" />
                                <div
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer flex justify-between items-center"
                                    onClick={() => setShowRoomSelect(!showRoomSelect)}
                                >
                                    <span className={admissionData.roomId ? 'text-slate-900' : 'text-slate-400'}>
                                        {admissionData.roomId ? (rooms.find(r => r._id === admissionData.roomId)?.label || rooms.find(r => r._id === admissionData.roomId)?.roomId || 'Select Room') : 'Select Room'}
                                    </span>
                                    <ChevronRight size={14} className={`transition-transform duration-200 ${showRoomSelect ? 'rotate-90' : ''}`} />
                                </div>

                                {showRoomSelect && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                                <input
                                                    autoFocus
                                                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-rose-500"
                                                    placeholder="SEARCH ROOM..."
                                                    value={roomSearch}
                                                    onChange={(e) => setRoomSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto pt-1">
                                            {selectedPatient.activeAdmission && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    Admitted
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-widest">
                                                <span className="text-slate-400">#</span> {selectedPatient.mrn}
                                            </div>
                                            <div
                                                className="px-5 py-2.5 hover:bg-slate-50 text-[10px] font-bold uppercase text-slate-500 cursor-pointer border-b border-slate-50"
                                                onClick={() => {
                                                    setAdmissionData(prev => ({ ...prev, roomId: '', bedId: '' }));
                                                    setShowRoomSelect(false);
                                                }}
                                            >
                                                Clear Selection
                                            </div>
                                            {rooms
                                                .filter(r => !admissionData.roomType || String(r.type || '').toUpperCase() === String(admissionData.roomType || '').toUpperCase())
                                                .filter(r => (r.label || r.roomId || '').toLowerCase().includes(roomSearch.toLowerCase()))
                                                .map(room => (
                                                    <div
                                                        key={room._id}
                                                        className={`px-5 py-3 hover:bg-slate-900 hover:text-white cursor-pointer transition-colors border-b border-slate-50 group flex items-center justify-between ${admissionData.roomId === room._id ? 'bg-slate-900 text-white' : ''}`}
                                                        onClick={() => {
                                                            setAdmissionData(prev => ({ ...prev, roomId: room._id, bedId: '' }));
                                                            setShowRoomSelect(false);
                                                            setRoomSearch("");
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-tight">{room.label || room.roomId}</p>
                                                            <p className={`text-[8px] font-bold uppercase ${admissionData.roomId === room._id ? 'text-white/60' : 'text-slate-400'}`}>{room.type}</p>
                                                        </div>
                                                        {admissionData.roomId === room._id && <Check size={12} />}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <FormLabel label="Allocated Bed" />
                                <select
                                    value={admissionData.bedId}
                                    onChange={(e) => {
                                        const selectedBedId = e.target.value;
                                        setAdmissionData(prev => ({ ...prev, bedId: selectedBedId }));
                                        const bed = beds.find(b => b._id === selectedBedId);
                                        if (bed && bed.pricePerDay !== undefined) {
                                            setIpdFee(bed.pricePerDay.toString());
                                        }
                                    }}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all"
                                >
                                    <option value="">Select Bed</option>
                                    {beds.filter(b => {
                                        const bedType = String(b.type || '').toLowerCase();
                                        const filterType = String(admissionData.roomType || '').toLowerCase();
                                        const bedRoom = String(b.room || '').toLowerCase();
                                        const selectedRoom = rooms.find(r => r._id === admissionData.roomId);
                                        const selectedRoomLabel = String(selectedRoom?.label || selectedRoom?.roomId || '').toLowerCase();

                                        return (!filterType || bedType === filterType) &&
                                            (!admissionData.roomId || bedRoom === selectedRoomLabel);
                                    }).map(b => (
                                        <option key={b._id} value={b._id}>{b.bedId} (Room: {b.room || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <FormLabel label="Diet Plan" />
                                    <span className={`text-[7px] font-black tracking-widest ${admissionData.diet.length > 250 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {admissionData.diet.length}/250
                                    </span>
                                </div>
                                <textarea
                                    value={admissionData.diet}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 250) {
                                            setAdmissionData(prev => ({ ...prev, diet: e.target.value }));
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Diet requirements..."
                                    className={`w-full px-5 py-3.5 bg-slate-50 border ${admissionData.diet.length > 250 ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all`}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <FormLabel label="Clinical Notes" />
                                    <span className={`text-[7px] font-black tracking-widest ${admissionData.clinicalNotes.length > 400 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {admissionData.clinicalNotes.length}/400
                                    </span>
                                </div>
                                <textarea
                                    value={admissionData.clinicalNotes}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 400) {
                                            setAdmissionData(prev => ({ ...prev, clinicalNotes: e.target.value }));
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Nursing instructions..."
                                    className={`w-full px-5 py-3.5 bg-slate-50 border ${admissionData.clinicalNotes.length > 400 ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-xs font-bold uppercase focus:border-rose-500 outline-none transition-all`}
                                />
                            </div>
                        </div>
                        </div>
                    )}
                </div>

                <style jsx global>{`
                    ::-webkit-calendar-picker-indicator {
                        filter: invert(0.5);
                        cursor: pointer;
                    }
                `}</style>
            {/* CONFIRM HONORIFIC UPDATE MODAL */}
            {showHonorificConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                            <User size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Update Patient Master Honorific?</h4>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Do you want to update the permanent master honorific for <strong>{selectedPatient?.name}</strong>?
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 font-bold">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase text-[9px]">Current:</span>
                                <span className="text-slate-800">{confirmedHonorific || "None"}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                                <span className="text-teal-600 uppercase text-[9px]">New Honorific:</span>
                                <span className="text-teal-700 font-black">{pendingHonorific}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowHonorificConfirmModal(false)}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmHonorificUpdate}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-all"
                            >
                                Confirm Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReceiptPreview && previewReceiptData && (
                <ClinicalReceipt
                    hospital={previewReceiptData.hospital}
                    patient={previewReceiptData.patient}
                    appointment={previewReceiptData.appointment}
                    payment={previewReceiptData.payment}
                    onClose={() => {
                        setShowReceiptPreview(false);
                        if (isBooked) {
                            router.push('/helpdesk');
                        }
                    }}
                    onConfirm={executeBooking}
                />
            )}
            </div>
        </div>
    );
}

function FormLabel({ label, className = "" }: { label: string, className?: string }) {
    return (
        <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block ${className}`}>
            {label}
        </label>
    );
}

function VitalField({ label, value, onChange, placeholder, error }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, error?: string }) {
    return (
        <div className="space-y-2 flex flex-col">
            <FormLabel label={label} className="text-[9px] text-slate-400" />
            <input
                type="text"
                value={value}
                placeholder={placeholder || "-"}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-slate-50 border ${error ? 'border-rose-500 ring-4 ring-rose-500/5' : 'border-slate-200'} rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-4 ${error ? 'focus:ring-rose-500/10 focus:border-rose-500' : 'focus:ring-teal-500/10 focus:border-teal-500'} outline-none transition-all placeholder:text-slate-200`}
            />
            {error && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest px-1">{error}</p>}
        </div>
    );
}
