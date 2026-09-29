'use client';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Search,
    Clock,
    User,
    Stethoscope,
    ChevronRight,
    Loader2,
    ArrowLeft,
    Activity,
    CreditCard,
    Banknote,
    Smartphone,
    RefreshCw,
    AlertCircle,
    Hash,
    PenTool,
    AlertTriangle,
    Receipt,
    Phone,
    X,
    Sunrise,
    Sun,
    Sunset,
    Moon
} from "lucide-react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { helpdeskService, masterHelpdeskService } from "@/lib/integrations";
import masterDoctorLeaveService from "@/lib/integrations/masterDoctorLeaveService";
import type { HelpdeskDoctor, HelpdeskProfile } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { renderToStaticMarkup } from 'react-dom/server';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { generateClinicalReceiptHtml, computeAgeFromDob } from "@/lib/print-utils";
import { formatDoctorName, formatPatientNameWithPrefix } from "@/lib/utils/name-utils";
import { getSocket, joinSocketRoom } from "@/lib/integrations/api/socket";

export default function MasterAppointmentBooking() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const params = useParams() as any;
    const hospitalId = params.hospitalId as string;
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
        return today.toISOString().split('T')[0];
    });
    const [selectedTime, setSelectedTime] = useState("");
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookingMode, setBookingMode] = useState<'slot' | 'queue'>('queue');
    const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
    const [isDoctorOnLeave, setIsDoctorOnLeave] = useState(false);
    const [isDoctorNotAvailable, setIsDoctorNotAvailable] = useState(false);

    // For Master Helpdesk, we hardcode registrationType to OPD
    const registrationType = 'OPD';

    const [notes, setNotes] = useState("");
    const [appointmentType, setAppointmentType] = useState("consultation");
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [sendToDoctor, setSendToDoctor] = useState(true);

    // Duplicate-appointment confirmation state
    const [existingAptWarning, setExistingAptWarning] = useState<{
        show: boolean;
        patientName: string;
        aptStatus: string;
        doctorName: string;
        confirmed: boolean;
    } | null>(null);

    // Vitals State
    const [vitals, setVitals] = useState({
        height: '', weight: '', bp: '', temperature: '', pulse: '', spo2: '', glucose: ''
    });

    const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});

    const validateVital = (field: string, value: string) => {
        if (!value) return ''; // All vitals are optional
        const num = Number(value);

        switch (field) {
            case 'pulse':
                if (num < 10 || num > 300) return 'Valid range: 10–300 bpm';
                break;
            case 'spo2':
                if (num < 1 || num > 100) return 'Valid range: 1–100%';
                break;
            case 'temperature':
                if (num < 93 || num > 115) return 'Valid range: 93–115 °F';
                break;
            case 'glucose':
                if (num < 20 || num > 1000) return 'Valid range: 20–1000 mg/dL';
                break;
            case 'height':
                if (num < 30 || num > 272) return 'Valid range: 30–272 cm';
                break;
            case 'weight':
                if (num < 0.3 || num > 600) return 'Valid range: 0.3–600 kg';
                break;
            case 'bp': {
                if (!/^\d{1,3}\/\d{1,3}$/.test(value)) {
                    return 'Format: 120/80';
                }
                const [sStr, dStr] = value.split('/');
                const s = Number(sStr);
                const d = Number(dStr);
                if (s < 50 || s > 300) return 'Systolic: 50–300 mmHg';
                else if (d < 20 || d > 200) return 'Diastolic: 20–200 mmHg';
                else if (d >= s) return 'Diastolic must be less than Systolic';
                break;
            }
        }
        return '';
    };

    const handleVitalChange = (field: string, value: string) => {
        let cleanValue = value;
        if (field === 'bp') {
            cleanValue = value.replace(/[^0-9/]/g, '');
            if ((cleanValue.match(/\//g) || []).length > 1) return;
        } else if (field === 'temperature') {
            cleanValue = value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) return;
            if (parts[1] && parts[1].length > 1) return;
        } else {
            cleanValue = value.replace(/[^0-9]/g, '');
        }

        const limits: Record<string, number> = {
            height: 3, weight: 6, pulse: 3, spo2: 3, temperature: 5, glucose: 4, bp: 7,
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
                const [me, allDocsRes, hRes] = await Promise.all([
                    helpdeskService.getMe(),
                    hospitalAdminService.getDoctors(),
                    hospitalAdminService.getHospital().catch(() => null)
                ]);
                setProfile(me);
                if (hRes?.hospital) {
                    setHospitalBranding(hRes.hospital);
                } else if (me?.hospital) {
                    setHospitalBranding(me.hospital);
                }
                const allDocs = Array.isArray(allDocsRes) ? allDocsRes : (allDocsRes as any)?.doctors || (allDocsRes as any)?.data || [];
                const validDocs = allDocs.filter((doc: any) => (doc.user?.name && doc.user.name !== 'Unknown') || (doc.name && doc.name !== 'Unknown'));
                setDoctors(validDocs);

                const uniqueDepts = Array.from(new Set(validDocs.map((d: any) => d.specialty || d.specialties?.[0]).filter(Boolean)));
                setDepartments(uniqueDepts as string[]);

                if (patientIdFromQuery) {
                    try {
                        const patientData = await helpdeskService.getPatientById(patientIdFromQuery);
                        const profileData = patientData.profile || {};
                        const lastVisitVitals = patientData.lastVisit?.vitals || {};

                        const getSafeName = (p: any) => {
                            return p.user?.name || p.name || (p.profile?.firstName ? `${p.profile.firstName} ${p.profile.lastName || ''}` : null) || p.profile?.name || 'Unknown Patient';
                        };
                        const getSafeMobile = (p: any) => {
                            return p.user?.mobile || p.mobile || p.profile?.contactNumber || p.profile?.mobile || 'N/A';
                        };

                        const transformed = {
                            _id: patientData.user?._id || patientData._id,
                            id: patientData.user?._id || patientData._id,
                            patientId: patientData._id,
                            name: getSafeName(patientData),
                            honorific: profileData.honorific || patientData.honorific || '',
                            mobile: getSafeMobile(patientData),
                            mrn: patientData.mrn || profileData.mrn || 'CC-' + (patientData.user?._id || patientData._id).slice(-6).toUpperCase(),
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
                            ...profileData
                        };
                        setSelectedPatient(transformed);

                        if (patientData.activeAdmission) {
                            toast(`Patient is currently admitted in IPD (ID: ${patientData.activeAdmission.admissionId})`, { icon: '🏥' });
                        } else if (patientData.activeConsultation) {
                            toast(`Patient has an active consultation in-progress.`, { icon: '⏳' });
                        }
                        if (transformed.lastVisitReason || transformed.lastVisitSymptoms) {
                            setNotes(transformed.lastVisitReason || transformed.lastVisitSymptoms);
                        }
                    } catch (e) {
                        console.error("Error fetching patient", e);
                    }
                }
            } catch (error: any) {
                toast.error("Initialization failed.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [patientIdFromQuery]);

    useEffect(() => {
        let mounted = true;
        let socketInstance: any = null;
        (async () => {
            try {
                socketInstance = await getSocket();
                if (!socketInstance || !mounted) return;
                if (hospitalId) {
                    joinSocketRoom({ role: "hospital", userId: hospitalId as string });
                }
                const onStatusChanged = (data: { doctorId: string; isOnline: boolean }) => {
                    setDoctors(prev => prev.map(doc => {
                        if (doc._id === data.doctorId || (doc as any).user?._id === data.doctorId) {
                            return { ...doc, isOnline: data.isOnline };
                        }
                        return doc;
                    }));
                    setSelectedDoctor(prev => {
                        if (prev && (prev._id === data.doctorId || (prev as any).user?._id === data.doctorId)) {
                            if (!data.isOnline) {
                                toast.error(`Doctor ${prev.name || (prev as any).user?.name || ''} has gone OFFLINE.`);
                                return null;
                            }
                            return { ...prev, isOnline: data.isOnline };
                        }
                        return prev;
                    });
                };
                socketInstance.on("doctor:status_changed", onStatusChanged);
                (socketInstance as any)._docStatusCleanup = () => {
                    socketInstance.off("doctor:status_changed", onStatusChanged);
                };
            } catch (e) {}
        })();
        return () => {
            mounted = false;
            if (socketInstance && (socketInstance as any)._docStatusCleanup) {
                (socketInstance as any)._docStatusCleanup();
            }
        };
    }, [hospitalId]);

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
            const errors: Record<string, string> = {};
            for (const key in initialVitals) {
                errors[key] = validateVital(key, initialVitals[key as keyof typeof initialVitals]);
            }
            setVitalsErrors(errors);
        }
    }, [selectedPatient]);

    useEffect(() => {
        setExistingAptWarning(null);
        const checkExistingAppointment = async () => {
            if (!selectedPatient) return;
            const hospitalId = profile?.hospital?._id;
            if (!hospitalId) return;

            try {
                const pId = selectedPatient?._id || selectedPatient?.id;
                const pName = selectedPatient?.name || "Patient";
                const todayStr = new Date().toISOString().split('T')[0];

                const broadResult = await helpdeskService.getAppointments(1, 100, undefined, todayStr, todayStr).catch(() => []);
                const normalize = (res: any) => res?.appointments || res?.data || [];
                const appointmentsList = normalize(broadResult);

                const activeStatuses = ['pending', 'confirmed', 'in-progress', 'waiting', 'booked', 'scheduled', 'arrived', 'checked-in'];
                const existing = appointmentsList.find((apt: any) => {
                    const aptStatus = String(apt.status || '').toLowerCase();
                    const aptPatientId = apt.patient?._id || apt.patient?.id || apt.patient || apt.patientId;
                    const aptUserId = apt.patient?.user?._id || apt.patient?.user || apt.userId;
                    const isActive = activeStatuses.includes(aptStatus);
                    return isActive && (pId === aptPatientId || pId === aptUserId);
                });

                if (existing) {
                    setExistingAptWarning({
                        show: true,
                        patientName: pName,
                        aptStatus: existing.status,
                        doctorName: existing.doctorName || 'the doctor',
                        confirmed: false,
                    });
                }
            } catch (err) { }
        };
        checkExistingAppointment();
    }, [selectedPatient?.id, selectedPatient?._id, profile?.hospital?._id]);

    useEffect(() => {
        if (!patientSearch.length || patientSearch.length < 3) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearchingPatients(true);
                const results = await masterHelpdeskService.getPatients(1, 20, patientSearch, hospitalId);
                setSearchResults(Array.isArray(results) ? results : ((results as any).data || []));
            } catch (error) {
            } finally {
                setSearchingPatients(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    const fetchSlots = useCallback(async () => {
        if (!selectedDoctor?._id || !profile?.hospital?._id || !selectedDate) return;
        try {
            setLoadingSlots(true);
            setSelectedSlot(null);

            // 1. Get availability (hourly containers) using master service
            const res = await masterHelpdeskService.getAvailability(selectedDoctor._id, profile.hospital._id, selectedDate);

            setIsDoctorOnLeave(res.isLeave);
            setIsDoctorNotAvailable(res.isNotAvailable && !res.isLeave);
            if (res.isHoliday) {
                setAvailableSlots([]);
                setLoadingSlots(false);
                return;
            }

            const hourlySlots = res.slots || [];

            // 2. Get all appointments for this doctor on this day to find exact occupied 5-min slots
            // Use Master Queue for comprehensive offline + online aggregation in the Master Portal
            const isMasterPortal = typeof window !== 'undefined' && window.location.pathname.includes('/masterhelpdesk');
            // 2. Fetch ALL appointments for this hospital today and filter on frontend for maximum reliability
            // This avoids potential issues with doctor ID format mismatches in the backend query
            const aptRes = await helpdeskService.getMasterQueue(1, 1000, hospitalId as string, selectedDate, selectedDate);
            
            const allApts = aptRes?.data || aptRes?.appointments || (Array.isArray(aptRes) ? aptRes : []);
            
            const doctorApts = allApts.filter((a: any) => {
                // 1. Check ID (Highest Priority)
                const aDocId = (a.doctor?._id || a.doctor || a.doctorId || a.doctorProfileId || a.doctorProfile?._id || a.doctor?._id)?.toString();
                const sDocId = (selectedDoctor as any)?._id?.toString() || (selectedDoctor as any)?.id?.toString() || selectedDoctor?.toString();
                
                const isSameId = aDocId && sDocId && aDocId === sDocId;

                // 2. Check Name (Fallback - extremely important for cross-portal consistency)
                const aDocName = (a.doctorName || a.doctor?.name || a.doctor?.user?.name || "").toLowerCase().replace(/dr\.|prof\.|sir\./g, '').replace(/[^a-z]/g, '').trim();
                const sDocName = (selectedDoctor?.name || (selectedDoctor as any)?.user?.name || "").toLowerCase().replace(/dr\.|prof\.|sir\./g, '').replace(/[^a-z]/g, '').trim();
                const isSameName = aDocName && sDocName && aDocName === sDocName;
                
                const isSameDoctor = isSameId || isSameName;
                
                // Block slot for ANY active-like status
                const status = (a.status || '').toLowerCase();
                const isActive = !['cancelled', 'rejected', 'failed', 'no-show', 'available', 'no show'].includes(status);
                
                return isSameDoctor && isActive;
            });

            const normalizeTimeStr = (t: string) => {
                if (!t || typeof t !== 'string' || t === 'N/A') return '';
                let time = t.trim().toUpperCase();
                if (time.includes(' - ')) time = time.split(' - ')[0];
                
                // Strip all non-alphanumeric except colon
                const cleanTime = time.replace(/[^A-Z0-9:]/g, '');
                
                try {
                    const match = cleanTime.match(/(\d+)(?::(\d+))?(AM|PM)/);
                    if (match) {
                        let [_, h, m, ampm] = match;
                        let hour = parseInt(h);
                        const minute = parseInt(m || '0');
                        
                        // Manual deterministic format: H:MM AM/PM
                        const h12 = hour % 12 || 12;
                        const mStr = minute.toString().padStart(2, '0');
                        return `${h12}:${mStr} ${ampm.toUpperCase()}`;
                    }
                } catch (e) {}
                return time.replace(/\s+/g, ' ');
            };

            const occupiedTimes = new Set(doctorApts.map((a: any) => 
                normalizeTimeStr(a.startTime || a.appointmentTime || a.time || a.timeSlot || a.time_slot)
            ).filter(Boolean));

            // 3. Expand each hourly container into 12 x 5-min slots
            const getTimeInMinutes = (timeStr: string) => {
                const normalized = normalizeTimeStr(timeStr);
                if (!normalized) return -1;
                try {
                    const parts = normalized.split(':');
                    if (parts.length < 2) return -1;
                    const hPart = parts[0];
                    const mPartWithAmpm = parts[1];
                    const mParts = mPartWithAmpm.split(' ');
                    const mPart = mParts[0];
                    const ampm = mParts[1];
                    
                    let h = parseInt(hPart);
                    let m = parseInt(mPart);
                    if (ampm === 'PM' && h < 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return h * 60 + m;
                } catch (e) { return -1; }
            };

            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const selectedDayName = daysOfWeek[new Date(selectedDate).getDay()];
            
            const doctorData = selectedDoctor as any;
            const availability = doctorData?.availability || doctorData?.profile?.availability || [];
            
            const daySchedule = availability.find((a: any) => 
                a.days?.includes(selectedDayName)
            );
            
            const breakStartMin = daySchedule?.breakStart ? getTimeInMinutes(daySchedule.breakStart) : -1;
            const breakEndMin = daySchedule?.breakEnd ? getTimeInMinutes(daySchedule.breakEnd) : -1;

            const allExpandedSlots: any[] = [];
            const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();
            const now = new Date();

            hourlySlots.forEach((hour: any) => {
                if (hour.isFull) return;

                const [startPart] = hour.timeSlot.split(" - ");
                const startMinutes = getTimeInMinutes(startPart);
                if (startMinutes === -1) return;

                const startHour = Math.floor(startMinutes / 60);
                const [y, m, d] = selectedDate.split('-').map(Number);
                
                for (let i = 0; i < 12; i++) {
                    const slotMinute = i * 5;
                    const slotTotalMinutes = startHour * 60 + slotMinute;
                    const slotDate = new Date(y, m - 1, d, startHour, slotMinute, 0, 0);
                    
                    if (isToday && slotDate < now) continue;

                    const h = slotDate.getHours();
                    const minute = slotDate.getMinutes();
                    const h12 = h % 12 || 12;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const timeStr = `${h12}:${minute.toString().padStart(2, '0')} ${ampm}`;

                    // Check if this specific 5-min slot falls within the doctor's break
                    const isInBreak = breakStartMin !== -1 && breakEndMin !== -1 && 
                                     slotTotalMinutes >= breakStartMin && slotTotalMinutes < breakEndMin;

                    if (isInBreak) continue;

                    allExpandedSlots.push({
                        time: timeStr,
                        available: !occupiedTimes.has(timeStr)
                    });
                }
            });

            setAvailableSlots(allExpandedSlots);
            setBookingMode('slot');
        } catch (e) {
            setAvailableSlots([]);
            setBookingMode('queue');
        } finally {
            setLoadingSlots(false);
        }
    }, [selectedDoctor, profile, selectedDate]);

    useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);

    const filteredDoctors = selectedDept
        ? doctors.filter((d: any) => (d.specialty === selectedDept || d.specialties?.[0] === selectedDept))
        : doctors;

    const isBookingValid = () => {
        if (!selectedPatient || !selectedDoctor) return false;
        if (bookingMode === 'slot' && !selectedSlot) return false;
        const hasVitalErrors = Object.values(vitalsErrors).some(err => !!err);
        return !hasVitalErrors && notes.trim().length > 0 && notes.length <= 400;
    };

    const handleBooking = async () => {
        if (!selectedPatient || !selectedDoctor) {
            toast.error("Please select a patient and a doctor.");
            return;
        }

        if (bookingMode === 'slot') {
            if (!selectedSlot) {
                toast.error("Please select a time slot");
                return;
            }
            
            // Final safety check: is this slot actually available?
            const slotData = availableSlots.find(s => s.time === selectedSlot);
            if (slotData && !slotData.available) {
                toast.error("This slot has just been booked. Please select another slot.");
                fetchSlots(); // Refresh to show current status
                return;
            }
        }

        if (notes.trim().length === 0) {
            toast.error("Please enter the reason for visit/symptoms.");
            return;
        }

        if (notes.length > 400) {
            toast.error("Notes are too long (max 400 characters).");
            return;
        }

        const hasVitalErrors = Object.values(vitalsErrors).some(err => !!err);
        if (hasVitalErrors) {
            toast.error("Please correct the errors in the Vitals section.");
            return;
        }

        if (existingAptWarning?.show && !existingAptWarning.confirmed) {
            setExistingAptWarning(prev => prev ? { ...prev, show: true } : null);
            return;
        }

        let printWindow: Window | null = null;
        try {
            printWindow = window.open('about:blank', '_blank');
            if (printWindow) {
                printWindow.document.write(
                    `<html><head><title>Processing Receipt...</title>
                    <style>
                        body { 
                            display: flex; align-items: center; justify-content: center; 
                            height: 100vh; margin: 0; font-family: 'Inter', sans-serif; 
                            background: #f8fafc; color: #1e293b;
                        }
                        .container { text-align: center; max-width: 400px; padding: 40px; }
                        .spinner {
                            width: 50px; height: 50px; border: 4px solid #f1f5f9;
                            border-top: 4px solid #14b8a6; border-radius: 50%;
                            animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                            margin: 0 auto 24px;
                        }
                        @keyframes spin { to { transform: rotate(360deg); } }
                        h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em; }
                        p { font-size: 0.875rem; color: #64748b; font-weight: 500; }
                    </style></head>
                    <body>
                        <div class="container">
                            <div class="spinner"></div>
                            <h2>Finalizing Booking</h2>
                            <p>Preparing your clinical receipt and synchronizing records...</p>
                        </div>
                    </body></html>`
                );
            }
        } catch (_) { printWindow = null; }

        try {
            setSubmitting(true);
            console.log("Submitting booking payload...");
            const backendPaymentStatus = paymentStatus === 'unpaid' ? 'pending' : 'paid';

            const payload = {
                patientId: selectedPatient?._id || selectedPatient?.id,
                name: selectedPatient.name || selectedPatient.user?.name,
                mobile: selectedPatient.mobile || selectedPatient.user?.mobile,
                doctorId: selectedDoctor?._id,
                date: selectedDate,
                time: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                timeSlot: bookingMode === 'slot' ? selectedSlot : "General Queue",
                startTime: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                endTime: bookingMode === 'slot' ? selectedSlot : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                type: appointmentType,
                notes: notes,
                symptoms: notes,
                reason: notes,
                paymentMethod: paymentMethod,
                paymentStatus: backendPaymentStatus,
                patientDetails: {
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    duration: selectedDoctor?.consultationDuration ? `${selectedDoctor.consultationDuration} min` : "15 min"
                },
                honorific: selectedPatient.honorific,
                address: selectedPatient.address,
                bloodGroup: (selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'N/A') ? selectedPatient.bloodGroup : undefined,
                emergencyContact: selectedPatient.emergencyContact,
                allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : selectedPatient.allergies,
                medicalHistory: selectedPatient.medicalHistory,
                vitals: {
                    bp: vitals.bp || undefined,
                    temperature: vitals.temperature || undefined,
                    pulse: vitals.pulse || undefined,
                    spo2: vitals.spo2 || undefined,
                    height: vitals.height || undefined,
                    weight: vitals.weight || undefined,
                    glucose: vitals.glucose || undefined
                }
            };

            const response = await masterHelpdeskService.registerPatient({
                ...payload,
                hospitalId: hospitalId || profile?.hospital?._id, // Ensure hospital context is passed
                type: 'OPD',
                amount: selectedDoctor?.consultationFee || 0
            });
            console.log("Booking successful, response received:", response);
            const appointment = response.appointment || response;
            console.log("DEBUG: MASTER PORTAL APPOINTMENT BOOKING SUCCESS - APPOINTMENT DETAILS", appointment);

            if (sendToDoctor && (appointment._id || appointment.id)) {
                try {
                    await helpdeskService.updateAppointmentStatus(appointment._id || appointment.id, 'confirmed');
                } catch (e) { }
            }

            // 3. Prepare Branding Data (Strictly use pre-fetched branding for zero-latency printing)
            const latestHospital: any = hospitalBranding || {
                name: (profile as any)?.hospitalName || profile?.hospital?.name || "Hospital Name",
                address: (profile as any)?.hospitalAddress || profile?.hospital?.address || "Hospital Address",
                phone: (profile as any)?.hospitalMobile || profile?.hospital?.mobile || (profile?.hospital as any)?.phone || "Phone Number",
                email: (profile as any)?.hospitalEmail || profile?.hospital?.email || "Email Address",
                logo: (profile as any)?.image || (profile?.hospital as any)?.logo || (profile?.hospital as any)?.logo || ""
            };

            const headerHtml = renderToStaticMarkup(
                <MainHeader initialDetails={{
                    name: latestHospital.name,
                    address: latestHospital.address,
                    phone: latestHospital.phone,
                    email: latestHospital.email,
                    logo: latestHospital.logo
                }} />
            );
            const footerHtml = renderToStaticMarkup(
                <MainFooter
                    initialDetails={{
                        name: latestHospital.name,
                        address: latestHospital.address,
                        phone: latestHospital.phone,
                        email: latestHospital.email,
                    }}
                    instructions={[
                        "Please arrive 15 minutes before your appointment time.",
                        "Carry this receipt for verification at the reception.",
                        "This receipt is only valid for the date and time mentioned."
                    ]}
                />
            );

            const receiptData = {
                hospital: {
                    name: latestHospital.name || "CureChain Medical Center",
                    address: latestHospital.address || "Main Medical Node",
                    contact: latestHospital.phone || latestHospital.mobile || "System Support",
                    email: latestHospital.email || "healthcare@curechain.io",
                    logo: latestHospital.logo,
                    opdFollowUpDays: latestHospital.opdFollowUpDays,
                    ipdFollowUpDays: latestHospital.ipdFollowUpDays,
                    enableFollowUpExpiry: latestHospital.enableFollowUpExpiry
                },
                patient: { name: selectedPatient.name, honorific: selectedPatient.honorific || selectedPatient.profile?.honorific, mrn: selectedPatient.mrn, age: selectedPatient.age, ageUnit: selectedPatient.ageUnit || selectedPatient.profile?.ageUnit, gender: selectedPatient.gender, mobile: selectedPatient.mobile, dob: selectedPatient.dob, address: selectedPatient.address, email: selectedPatient.email, bloodGroup: selectedPatient.bloodGroup, emergencyContact: selectedPatient.emergencyContact, allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : selectedPatient.allergies, medicalHistory: selectedPatient.medicalHistory, vitals: { ...vitals } },
                appointment: {
                    doctorName: selectedDoctor.user?.name || selectedDoctor.name,
                    specialization: selectedDoctor.specialties?.[0] || 'General',
                    qualification: selectedDoctor.qualifications?.[0] || 'MBBS',
                    date: new Date(selectedDate).toLocaleDateString(),
                    time: bookingMode === 'slot' ? selectedSlot : payload.time,
                    bookedAt: new Date().toISOString(),
                    type: appointmentType.toUpperCase(),
                    notes: notes,
                    appointmentId: appointment.appointmentId || appointment.visitId || appointment._id || appointment.id || 'PENDING'
                },
                payment: { 
                    amount: selectedDoctor?.consultationFee || 0, 
                    totalBillAmount: selectedDoctor?.consultationFee || 0, 
                    totalPaidAmount: selectedDoctor?.consultationFee || 0, 
                    advanceAmount: 0, 
                    method: paymentMethod.toUpperCase(), 
                    status: paymentStatus.toUpperCase(), 
                    date: new Date().toISOString(),
                    receiptNumber: appointment.payment?.receiptNumber || appointment.receiptNumber
                },
                registrationType: 'OPD',
                headerHtml, footerHtml, returnUrl: '/masterhelpdesk'
            };

            if (printWindow) {
                console.log("Generating receipt HTML...");
                try {
                    const html = generateClinicalReceiptHtml(receiptData);
                    printWindow.document.open();
                    printWindow.document.write(html);
                    printWindow.document.close();
                } catch (printErr) {
                    console.error("Error generating/writing receipt:", printErr);
                    printWindow.close();
                    toast.error("Receipt generation failed, but booking was successful.");
                }
            }

            toast.success("Booking Recorded Successfully.");
            fetchSlots();
            setSelectedSlot(null);
            setTimeout(() => {
                router.push(`/${hospitalId}/masterhelpdesk/queue`);
            }, 1000);
        } catch (error: any) {
            console.error("Booking error:", error);
            if (printWindow) printWindow.close();
            toast.error(error.message || "Booking failure.");
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
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 px-1 gap-2">
                <div className="flex items-center gap-2 z-10">
                    <button onClick={() => router.push(`/${hospitalId}/masterhelpdesk`)} className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-all">
                        <ArrowLeft size={14} />
                    </button>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Scheduling / Booking</span>
                </div>
                <div className="sm:absolute sm:inset-0 flex flex-col items-center justify-center text-center sm:pointer-events-none">
                    <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase">Schedule OPD Appointment</h1>
                    <p className="hidden sm:block text-[9px] font-bold text-teal-600 uppercase tracking-[0.2em]">Master Oversight Gateway</p>
                </div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden p-4 md:p-8">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                    {/* LEFT SIDE */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* 1. PATIENT SELECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><User size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Patient Selection</h2>
                            </div>

                            {selectedPatient ? (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-5 bg-slate-50 rounded-[20px] border border-slate-200 group relative animate-in slide-in-from-left-4 duration-300">
                                    <div className="w-16 h-16 rounded-[16px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-xl">
                                        {selectedPatient.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{formatPatientNameWithPrefix(selectedPatient.name, selectedPatient.honorific || selectedPatient.profile?.honorific)}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Hash size={10} className="text-teal-600" /> {selectedPatient.mrn}</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Phone size={10} className="text-teal-600" /> {selectedPatient.mobile}</span>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-600"><Activity size={10} className="text-teal-600" /> {computeAgeFromDob(selectedPatient.dob, selectedPatient.age, selectedPatient.ageUnit || selectedPatient.profile?.ageUnit)} / {selectedPatient.gender}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all"><X size={16} /></button>
                                </div>
                            ) : (
                                <div className="relative group w-full max-w-2xl">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600" size={20} />
                                    <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="SEARCH PATIENT BY NAME / MOBILE / MRN..." className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase" />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                        {searchingPatients && <Loader2 className="animate-spin text-teal-600" size={20} />}
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[24px] shadow-2xl z-30 max-h-[400px] overflow-y-auto p-3 space-y-1">
                                            {searchResults.map(p => (
                                                <button key={p._id} onClick={async () => {
                                                    const full = await helpdeskService.getPatientById(p._id);
                                                    const profileData = full.profile || {};
                                                    const getSafeName = (p: any) => {
                                                        return p.user?.name || p.name || (p.profile?.firstName ? `${p.profile.firstName} ${p.profile.lastName || ''}` : null) || p.profile?.name || 'Unknown Patient';
                                                    };
                                                    const getSafeMobile = (p: any) => {
                                                        return p.user?.mobile || p.mobile || p.profile?.contactNumber || p.profile?.mobile || 'N/A';
                                                    };

                                                    setSelectedPatient({
                                                        _id: full.user?._id || full._id, id: full.user?._id || full._id, patientId: full._id,
                                                        name: getSafeName(full), honorific: profileData.honorific || '',
                                                        mobile: getSafeMobile(full), mrn: full.mrn, gender: full.gender, age: full.age,
                                                        vitals: full.lastVisit?.vitals || {}, ...profileData
                                                    });
                                                    setPatientSearch("");
                                                    setSearchResults([]);
                                                }} className="w-full p-4 text-left hover:bg-slate-50 rounded-2xl flex items-center justify-between group transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">{p.name?.charAt(0)}</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 uppercase">{p.name || p.user?.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.mobile || p.user?.mobile} • {p.mrn}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 2. DOCTOR */}
                        <section className={`space-y-5 transition-all duration-500 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><Stethoscope size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Consultant & Schedule</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase focus:border-teal-500 outline-none transition-all cursor-not-allowed opacity-80"
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-teal-600 uppercase tracking-widest ml-1">Today only (Master Portal Restriction)</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Department</label>
                                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all">
                                        <option value="">All Departments</option>
                                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredDoctors.map(doc => {
                                    const isOffline = doc.isOnline === false;
                                    const isSelected = selectedDoctor?._id === doc._id;
                                    return (
                                        <button 
                                            key={doc._id} 
                                            disabled={isOffline}
                                            onClick={() => {
                                                if (isOffline) {
                                                    toast.error("This doctor is currently offline and disabled for booking.");
                                                    return;
                                                }
                                                setSelectedDoctor(doc);
                                            }} 
                                            className={`p-3.5 rounded-[16px] border-2 text-left flex items-center gap-3 transition-all relative overflow-hidden ${isOffline ? 'border-rose-200 bg-rose-50/50 opacity-60 cursor-not-allowed' : isSelected ? 'border-teal-500 bg-teal-50/50 shadow-lg' : 'border-slate-50 bg-white hover:border-slate-100'}`}
                                        >
                                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl shrink-0 ${isOffline ? 'bg-rose-100 text-rose-500' : isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{doc.name?.charAt(0)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <h4 className={`text-[10px] font-black truncate uppercase ${isOffline ? 'text-rose-800 line-through' : 'text-slate-900'}`}>{doc.name || doc.user?.name}</h4>
                                                    {isOffline && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[7px] font-black uppercase tracking-wider shrink-0">OFFLINE</span>}
                                                </div>
                                                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{doc.specialty || doc.specialties?.[0] || 'Clinician'}</p>
                                                <p className={`text-[8px] font-black uppercase ${isOffline ? 'text-rose-500' : 'text-teal-600'}`}>₹{doc.consultationFee || 0}.00</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedDoctor && isDoctorOnLeave && (
                                <div className="mt-8 p-6 bg-rose-50 border-2 border-rose-200 rounded-3xl flex items-center gap-5 animate-in zoom-in duration-500 shadow-lg shadow-rose-500/10">
                                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-inner">
                                        <AlertCircle size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">Doctor is on Leave</h3>
                                        <p className="text-xs font-bold text-rose-600 uppercase mt-1 leading-relaxed">
                                            The doctor has approved leave for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedDoctor && isDoctorNotAvailable && !isDoctorOnLeave && (
                                <div className="mt-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center gap-5 animate-in zoom-in duration-500 shadow-lg shadow-amber-500/10">
                                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
                                        <Calendar size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">No Schedule Defined</h3>
                                        <p className="text-xs font-bold text-amber-600 uppercase mt-1 leading-relaxed">
                                            The doctor has no availability scheduled for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedDoctor && !isDoctorOnLeave && (
                                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center text-teal-600"><Clock size={12} /></div>
                                            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Select Clinical Slot</h3>
                                        </div>

                                        {/* Time of Day Filter */}
                                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                            {[
                                                { id: 'all', label: 'All', icon: Clock },
                                                { id: 'morning', label: 'Morning', icon: Sunrise },
                                                { id: 'afternoon', label: 'Afternoon', icon: Sun },
                                                { id: 'evening', label: 'Evening', icon: Sunset },
                                                { id: 'night', label: 'Night', icon: Moon },
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTimeOfDayFilter(t.id as any)}
                                                    className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase transition-all flex items-center gap-1.5 ${timeOfDayFilter === t.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}
                                                >
                                                    <t.icon size={10} /> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Confirmation for past time slots */}
                                    {selectedSlot && (() => {
                                        const now = new Date();
                                        const [t, ampm] = selectedSlot.split(' ');
                                        let [h, m] = t.split(':').map(Number);
                                        if (ampm === 'PM' && h < 12) h += 12;
                                        if (ampm === 'AM' && h === 12) h = 0;

                                        const slotDate = new Date(selectedDate);
                                        slotDate.setHours(h, m, 0, 0);

                                        if (slotDate < now) {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <AlertTriangle size={14} className="text-amber-500" />
                                                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">
                                                        Note: This slot time has already passed. Continue booking for this time?
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {loadingSlots ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 gap-3">
                                            <Loader2 size={24} className="text-teal-500 animate-spin" />
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scanning Availability Matrix...</p>
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                            {availableSlots
                                                .filter(slot => {
                                                    if (timeOfDayFilter === 'all') return true;
                                                    const [t, ampm] = slot.time.split(' ');
                                                    let [h] = t.split(':').map(Number);
                                                    if (ampm === 'PM' && h < 12) h += 12;
                                                    if (ampm === 'AM' && h === 12) h = 0;

                                                    if (timeOfDayFilter === 'morning') return h >= 6 && h < 12;
                                                    if (timeOfDayFilter === 'afternoon') return h >= 12 && h < 16;
                                                    if (timeOfDayFilter === 'evening') return h >= 16 && h < 20;
                                                    if (timeOfDayFilter === 'night') return h >= 20 || h < 6;
                                                    return true;
                                                })
                                                .map((slot, i) => {
                                                    const now = new Date();
                                                    const [t, ampm] = slot.time.split(' ');
                                                    let [h, m] = t.split(':').map(Number);
                                                    if (ampm === 'PM' && h < 12) h += 12;
                                                    if (ampm === 'AM' && h === 12) h = 0;
                                                    const slotDate = new Date(selectedDate);
                                                    slotDate.setHours(h, m, 0, 0);
                                                    const isPast = slotDate < now;

                                                    return (
                                                        <button
                                                            key={i}
                                                            disabled={!slot.available}
                                                            onClick={() => setSelectedSlot(slot.time)}
                                                            className={`py-2 px-1 rounded-lg text-[9px] font-black transition-all border relative ${selectedSlot === slot.time
                                                                    ? 'bg-teal-600 border-teal-600 text-white shadow-lg scale-110 z-10'
                                                                    : slot.available
                                                                        ? `bg-white border-slate-100 text-slate-600 hover:border-teal-200 hover:bg-teal-50 shadow-sm ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}`
                                                                        : 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed opacity-80 shadow-inner'
                                                                }`}
                                                        >
                                                            {slot.time.replace(':00', '').replace(' ', '')}
                                                            {isPast && slot.available && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-amber-400 rounded-full border border-white" />}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    ) : (
                                        <div className="p-10 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center gap-3">
                                            <AlertTriangle size={24} className="text-amber-400" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900 uppercase">No Clinical Slots Available</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Check doctor schedule or select a different date</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 3. VITALS & MANIFEST */}
                        <section className={`space-y-6 transition-all duration-700 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><PenTool size={14} /></div>
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Clinical Matrix (Vitals)</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['height', 'weight', 'bp', 'pulse', 'temperature', 'spo2', 'glucose'].map(v => {
                                    const placeholders: Record<string, string> = {
                                        height: '170 CM',
                                        weight: '70 KG',
                                        bp: '120/80 MMHG',
                                        pulse: '72 BPM',
                                        temperature: '98.6 °F',
                                        spo2: '98 %',
                                        glucose: '90 MG/DL'
                                    };
                                    return (
                                        <div key={v} className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{v.toUpperCase()}</label>
                                            <input
                                                type="text"
                                                value={(vitals as any)[v]}
                                                onChange={(e) => handleVitalChange(v, e.target.value)}
                                                placeholder={placeholders[v]}
                                                className={`w-full bg-slate-50 border ${vitalsErrors[v] ? 'border-rose-500' : 'border-slate-200'} rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:border-teal-500 outline-none transition-all placeholder:text-slate-200`}
                                            />
                                            {vitalsErrors[v] && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest px-1">{vitalsErrors[v]}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="space-y-3">
                                <FormLabel label="Reason for Visit / Symptoms" />
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe current symptoms..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[16px] focus:border-teal-500 focus:bg-white outline-none transition-all text-xs font-bold uppercase resize-none placeholder:text-slate-300" />
                            </div>
                        </section>
                    </div>

                    {/* REVENUE CYCLE */}
                    <div className={`lg:col-span-4 space-y-4 ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="bg-slate-900 rounded-[24px] p-6 text-white space-y-6 shadow-xl sticky top-24">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-teal-400"><Receipt size={14} /></div>
                                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Revenue & Flow</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <FormLabel label="Payment Method" className="text-white/40" />
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'cash', icon: <Banknote size={16} />, label: 'Cash' },
                                            { id: 'card', icon: <CreditCard size={16} />, label: 'Card' },
                                            { id: 'upi', icon: <Smartphone size={16} />, label: 'UPI' }
                                        ].map(m => (
                                            <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                {m.icon} <span className="text-[8px] font-black uppercase">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <FormLabel label="Payment Status" className="text-white/40" />
                                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all bg-teal-500 text-slate-900 shadow-lg text-center">Paid Only</div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Net Consultation Fee</p>
                                    <h4 className="text-4xl font-black text-white mt-1">₹{selectedDoctor?.consultationFee || 0}.00</h4>
                                    <button onClick={handleBooking} disabled={submitting || !selectedDoctor || isDoctorOnLeave || !isBookingValid()} className="w-full mt-8 py-5 bg-teal-500 text-slate-900 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-400 transition-all shadow-2xl shadow-teal-500/30 flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-50 disabled:grayscale disabled:pointer-events-none disabled:cursor-not-allowed">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-all" />
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Receipt size={16} /> Finalize Engagement & Print</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes shimmer { 100% { transform: translateX(100%); } } `}</style>
        </div>
    );
}

function FormLabel({ label, className = "" }: { label: string, className?: string }) {
    return <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block ${className}`}>{label}</label>;
}
