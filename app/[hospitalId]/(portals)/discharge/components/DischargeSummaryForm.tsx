'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, HeartPulse, Stethoscope, User, ClipboardList, Save, History, Image as ImageIcon, Camera } from 'lucide-react';
import { Card, Button, FormInput, FormSelect, FormTextarea, ConfirmModal } from '@/components/admin';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { useQueryClient } from '@tanstack/react-query';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { useDischargeRecord } from '@/lib/hooks/discharge/useDischargeRecord';
import { PrintableDischargeSummary } from './PrintableDischargeSummary';
import { useAuthStore } from '@/stores/authStore';
import { spellCheckService } from '@/lib/integrations';
import type { SpellMatch, SpellState, SpellPopupState, ExtendedSpellState } from '@/lib/integrations/types';
import { SpellCheck, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_FORM_STATE = {
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    roomNo: '',
    mrn: '',
    roomType: '',
    dischargeType: '',
    admissionDate: '',
    dischargeDate: '',
    department: '',
    reasonForAdmission: '',
    provisionalDiagnosis: '',
    diagnosis: '',
    chiefComplaints: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    vitals: {
        height: '',
        weight: '',
        bloodPressure: '',
        temperature: '',
        pulse: '',
        spO2: '',
        glucose: '',
    },
    generalAppearance: '',
    treatmentGiven: '',
    surgicalProcedures: '',
    surgeryNotes: '',
    investigationsPerformed: '',
    hospitalCourse: '',
    conditionAtDischarge: '',
    suggestedDoctorName: '',
    hospitalName: '',
    medicationsPrescribed: '',
    adviceAtDischarge: '',
    activityRestrictions: '',
    followUpInstructions: '',
    patientTitle: '',
    primaryDoctor: '',
    dob: '',
    email: '',
    nationality: '',
    bloodGroup: '',
    maritalStatus: '',
    govtId: '',
    attendantName: '',
    attendantRelationship: '',
    attendantPhone: '',
    hospitalRegNo: '',
    admissionType: '',
    bedNo: '',
    icdCode: '',
    dietInstructions: '',
    warningSigns: '',
    followUpDate: '',
    totalBillAmount: 0,
    advanceAmount: 0,
    finalPayment: 0,
    paymentMode: 'Cash',
    insuranceName: '',
    allergyHistory: '',
    specialistType: '',
    ipdHistory: [] as any[],
    hospitalLogo: '',
};

const SAMPLE_DATA = {
    patientName: 'John Michael Doe',
    age: '45 Years',
    gender: 'Male',
    phone: '9876543210',
    address: '123, Healthcare Garden, Medical District, Central City - 400001',
    roomNo: 'ICU-B12',
    mrn: 'MRN-882941',
    roomType: 'Critical Care (ICU)',
    dischargeType: 'Recovered / Cured',
    admissionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    dischargeDate: new Date().toISOString().slice(0, 16),
    department: 'Cardiology',
    reasonForAdmission: 'Acute chest pain and respiratory distress',
    provisionalDiagnosis: 'Acute Myocardial Infarction (AMI)',
    diagnosis: 'ST-Elevation Myocardial Infarction (STEMI), Hypertension, Hyperlipidemia',
    chiefComplaints: 'Crushing chest pain radiating to left arm, shortness of breath, excessive sweating for 3 hours.',
    historyOfPresentIllness: 'The patient presented with sudden onset of severe resternal chest pain... Vital signs showed BP 160/100, PR 110/min.',
    pastMedicalHistory: 'Known hypertensive for 5 years on Telmisartan 40mg. No history of diabetes or surgeries.',
    vitals: {
        height: '170',
        weight: '70',
        bloodPressure: '120/80',
        temperature: '98.6',
        pulse: '78',
        spO2: '98',
        glucose: '100',
    },
    generalAppearance: 'Alert, cooperative, well-hydrated, no pallor or edema.',
    treatmentGiven: 'Emergency Angioplasty with DES stenting to LAD. Dual anti-platelet therapy initiated.',
    surgicalProcedures: 'Primary Percutaneous Coronary Intervention (PCI)',
    surgeryNotes: 'Successful deployment of 3.5x20mm DES in proximal LAD. TIMI 3 flow restored.',
    investigationsPerformed: 'ECG: ST elevation in V1-V6. Cardiac Markers: Troponin I elevated (4.2 ng/ml). ECHO: LVEF 45%.',
    hospitalCourse: 'Patient stabilized post-PCI. Monitored in ICCU for 3 days, then shifted to ward. Vital signs remained stable.',
    conditionAtDischarge: 'Stable',
    suggestedDoctorName: 'Dr. Sarah Williams',
    hospitalName: 'MsCure Advanced Heart Center',
    medicationsPrescribed: 'Tab. Aspirin 75mg OD\nTab. Clopidogrel 75mg OD\nTab. Atorvastatin 40mg HS\nTab. Ramipril 2.5mg OD',
    adviceAtDischarge: 'Complete bed rest for 1 week. Avoid heavy lifting. Low salt, low fat diet.',
    activityRestrictions: 'No strenuous physical activity for 4 weeks.',
    followUpInstructions: 'Follow up in Cardiology OPD after 10 days or immediately if chest pain recurs.',
    patientTitle: 'Mr',
    primaryDoctor: 'Dr. Robert Smith',
    dob: '1979-05-15',
    email: 'john.doe@sample.com',
    nationality: 'American',
    bloodGroup: 'O+',
    maritalStatus: 'Married',
    govtId: 'AB1234567890',
    attendantName: 'Jane Doe',
    attendantRelationship: 'Spouse',
    attendantPhone: '9001122334',
    hospitalRegNo: 'HOSP-2024-001',
    admissionType: 'Emergency',
    bedNo: 'B-12',
    icdCode: 'I21.09',
    dietInstructions: 'Low salt, heart-healthy diet (DASH diet).',
    warningSigns: 'Sudden chest pain, severe breathlessness, fainting spells, or cold sweats.',
    followUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    totalBillAmount: 125000,
    advanceAmount: 25000,
    finalPayment: 100000,
    paymentMode: 'Insurance',
    insuranceName: 'Global Health Care TPA',
    allergyHistory: 'Sulfa drugs (Skin rashes)',
    specialistType: 'Senior Consultant',
    ipdHistory: [
        {
            admissionId: 'IPD-2024-001',
            admissionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Discharged',
            clinicalNotes: 'Recovered from mild fever'
        }
    ],
    hospitalLogo: '',
};

export function DischargeSummaryForm() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const { user } = useAuthStore();
    const isNurse = user?.role === 'nurse';
    const isHelpdesk = user?.role === 'helpdesk';
    const recordId = ((searchParams?.get('id') ?? null) ?? null);
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [consultants, setConsultants] = useState<string[]>(['']);
    const [isInitialized, setIsInitialized] = useState(false);
    const initializedRef = useRef(false);
    const componentRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Discharge_Summary_${recordId || 'New'}`,
    });

    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [unitTypes, setUnitTypes] = useState<any[]>([]); // NEW

    useEffect(() => {
        const fetchUnitTypes = async () => {
            try {
                const types = await ipdService.getUnitTypes();
                setUnitTypes(types);
            } catch (error) {
                console.error("Failed to fetch unit types for discharge form", error);
            }
        };
        fetchUnitTypes();
    }, []);

    useEffect(() => {
        if (!initializedRef.current) {
            console.log("[DischargeForm] Component Mount - User Role:", user?.role);
            console.log("[DischargeForm] RecordId:", recordId);
        }
    }, [user, recordId]);

    // Use React Query to fetch record when editing
    const { data: recordData, isLoading: isLoadingRecord } = useDischargeRecord(recordId);

    // Format dates for datetime-local input (Local Time)
    const formatDate = (date: string | Date) => {
        if (!date) return '';
        const d = new Date(date);
        // Adjust for timezone offset to get local time in ISO format substring
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        return localISOTime;
    };

    // Helper function to determine title based on gender and age
    const determineTitle = (gender: string, age: string) => {
        const ageNum = parseInt(age);
        if (gender?.toLowerCase() === 'male') {
            return ageNum < 18 ? 'Master' : 'Mr';
        } else if (gender?.toLowerCase() === 'female') {
            return ageNum < 18 ? 'Miss' : 'Mrs';
        }
        return 'Mr';
    };

    const getCharLimit = (name: string): number => {
        const largeFields = [
            'reasonForAdmission', 'diagnosis', 'chiefComplaints',
            'historyOfPresentIllness', 'pastMedicalHistory',
            'treatmentGiven', 'surgicalProcedures', 'surgeryNotes',
            'investigationsPerformed', 'hospitalCourse',
            'medicationsPrescribed', 'adviceAtDischarge',
            'activityRestrictions', 'followUpInstructions',
            'dietInstructions', 'warningSigns', 'address'
        ];
        const mediumFields = [
            'provisionalDiagnosis', 'generalAppearance', 'allergyHistory'
        ];
        const smallFields = [
            'patientName', 'nationality', 'department', 'specialistType',
            'hospitalName', 'suggestedDoctorName', 'attendantName',
            'attendantRelationship', 'mrn', 'roomNo', 'bedNo',
            'govtId', 'insuranceName', 'hospitalRegNo', 'icdCode'
        ];
        if (largeFields.includes(name)) return 400;
        if (mediumFields.includes(name)) return 200;
        if (smallFields.includes(name)) return 150;
        return 200;
    };

    // --- SPELL CHECK LOGIC ---
    const SPELL_FIELDS = [
        'reasonForAdmission', 'chiefComplaints', 'historyOfPresentIllness',
        'pastMedicalHistory', 'provisionalDiagnosis', 'diagnosis',
        'allergyHistory', 'generalAppearance', 'treatmentGiven',
        'surgicalProcedures', 'surgeryNotes', 'investigationsPerformed',
        'hospitalCourse', 'adviceAtDischarge', 'dietInstructions',
        'activityRestrictions', 'warningSigns', 'followUpInstructions', 'address'
    ];

    const [spellStates, setSpellStates] = useState<ExtendedSpellState>({});
    const [activePopup, setActivePopup] = useState<SpellPopupState>(null);
    const [isSpellChecking, setIsSpellChecking] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            const fieldsToCheck = SPELL_FIELDS.filter(field => {
                const value = (formData as any)[field];
                return value && value.trim().length > 3;
            });

            if (fieldsToCheck.length === 0) {
                setSpellStates({});
                setIsSpellChecking(false);
                return;
            }

            setIsSpellChecking(true);
            const newStates: ExtendedSpellState = { ...spellStates };

            try {
                await Promise.all(fieldsToCheck.map(async (field) => {
                    const value = (formData as any)[field];
                    // Skip if value hasn't changed since last check (simple optimization)
                    if (spellStates[field]?.lastCheckedValue === value) return;

                    const matches = await spellCheckService.check(value);
                    newStates[field] = {
                        matches,
                        lastCheckedValue: value,
                        isDirty: false
                    };
                }));
                setSpellStates(newStates);
            } catch (error) {
                console.error("Spell check failed:", error);
            } finally {
                setIsSpellChecking(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [formData]);

    const totalSpellingErrors = Object.values(spellStates).reduce(
        (acc, state) => acc + state.matches.length, 0
    );

    const applyCorrection = (field: string, match: SpellMatch, suggestion: string) => {
        const currentValue = (formData as any)[field] || '';
        const newValue = spellCheckService.applyCorrection(currentValue, match, suggestion);

        setFormData(prev => ({ ...prev, [field]: newValue }));

        // Update local matches to remove the one we just fixed
        setSpellStates(prev => {
            const fieldState = prev[field];
            if (!fieldState) return prev;

            return {
                ...prev,
                [field]: {
                    ...fieldState,
                    matches: fieldState.matches.filter(m => m.offset !== match.offset),
                    lastCheckedValue: newValue
                }
            };
        });

        setActivePopup(null);
    };

    const getCharCount = (name: string, formDataRef: typeof formData): number => {
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            return ((formDataRef as any)[parent]?.[child] ?? '').toString().length;
        }
        const val = (formDataRef as any)[name];
        if (val === null || val === undefined) return 0;
        return val.toString().length;
    };

    const validateField = (name: string, value: any, allData?: typeof formData): string => {
        const charLimit = getCharLimit(name);

        // Character limit check
        if (value && typeof value === 'string' && value.length > charLimit) {
            return `Maximum ${charLimit} characters allowed`;
        }

        // Vitals nested validation
        if (name === 'height') {
            if (value && (!/^\d*\.?\d*$/.test(value) || Number(value) < 30 || Number(value) > 250))
                return 'Height must be 30–250 cm';
            return '';
        }
        if (name === 'weight') {
            if (value && (!/^\d*\.?\d*$/.test(value) || Number(value) < 1 || Number(value) > 300))
                return 'Weight must be 1–300 kg';
            return '';
        }
        if (name === 'bloodPressure') {
            if (value && !/^\d{2,3}\/\d{2,3}$/.test(value))
                return 'Format: 120/80';
            return '';
        }
        if (name === 'pulse') {
            if (value && (!/^\d+$/.test(value) || Number(value) < 30 || Number(value) > 200))
                return 'Pulse must be 30–200';
            return '';
        }
        if (name === 'temperature') {
            if (value && (!/^\d*\.?\d*$/.test(value) || Number(value) < 90 || Number(value) > 110))
                return 'Temperature must be 90–110 °F';
            return '';
        }
        if (name === 'spO2') {
            if (value && (!/^\d+$/.test(value) || Number(value) < 50 || Number(value) > 100))
                return 'SpO2 must be 50–100%';
            return '';
        }
        if (name === 'glucose') {
            if (value && (!/^\d+$/.test(value) || Number(value) < 20 || Number(value) > 600))
                return 'Glucose must be 20–600';
            return '';
        }

        switch (name) {
            case 'patientName':
                if (!value) return 'Patient name is required';
                if (value.length < 3) return 'Minimum 3 characters required';
                if (!/^[A-Za-z ]{3,150}$/.test(value)) return 'Only alphabets and spaces allowed';
                return '';
            case 'mrn':
                if (!value) return 'MRN is required';
                if (!/^[A-Za-z0-9\-]+$/.test(value)) return 'Alphanumeric and hyphens only';
                return '';
            case 'age':
                if (!value) return 'Age is required';
                {
                    const ageMatch = value.toString().match(/^(\d+)\s*[Yy]ears?$/);
                    if (!ageMatch) return 'Format: 45 Years';
                    const ageNum = parseInt(ageMatch[1]);
                    if (ageNum < 0 || ageNum > 120) return 'Age must be 0–120';
                }
                return '';
            case 'phone':
            case 'mobile':
            case 'guardianPhone':
            case 'attendantPhone':
                if (!value) return '';
                if (!/^[0-9]{10}$/.test(value)) return 'Must be exactly 10 digits';
                return '';
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
                return '';
            case 'govtId':
                if (value && !/^[A-Za-z0-9]+$/.test(value)) return 'Alphanumeric only';
                return '';
            case 'icdCode':
                if (value && !/^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/.test(value)) return 'Invalid ICD format (e.g. J45.9)';
                return '';
            case 'diagnosis':
                if (!value) return 'Final diagnosis is required';
                return '';
            case 'chiefComplaints':
                if (!value) return 'Chief complaints are required';
                return '';
            case 'treatmentGiven':
                if (!value) return 'Treatment given is required';
                return '';
            case 'conditionAtDischarge':
                if (!value) return 'Condition at discharge is required';
                return '';
            case 'admissionDate': {
                if (value && new Date(value) > new Date()) return 'Admission date cannot be in the future';
                return '';
            }
            case 'dischargeDate': {
                const admDate = allData?.admissionDate;
                if (value && admDate && new Date(value) < new Date(admDate))
                    return 'Discharge date cannot be before admission date';
                return '';
            }
            case 'followUpDate': {
                const dischDate = allData?.dischargeDate;
                if (value && dischDate && new Date(value) <= new Date(dischDate))
                    return 'Follow-up must be after discharge date';
                return '';
            }
            case 'advanceAmount':
                if (Number(value) < 0) return 'Amount cannot be negative';
                return '';
            case 'finalPayment':
                if (Number(value) < 0) return 'Amount cannot be negative';
                return '';
            case 'totalBillAmount': {
                if (Number(value) < 0) return 'Amount cannot be negative';
                if (allData && Number(value) < Number(allData.advanceAmount))
                    return 'Total must be ≥ advance amount';
                if (allData && Number(value) < Number(allData.finalPayment))
                    return 'Total must be ≥ final payment';
                return '';
            }
            case 'insuranceName':
                if (allData?.paymentMode === 'Insurance' && !value)
                    return 'Insurance name required when payment mode is Insurance';
                return '';
            default:
                return '';
        }
    };

    const sanitizeData = (data: any): typeof INITIAL_FORM_STATE => {
        const sanitized = { ...INITIAL_FORM_STATE, ...data };

        // Handle vitals specifically as it is nested
        if (data.vitals) {
            sanitized.vitals = { ...INITIAL_FORM_STATE.vitals, ...data.vitals };
            Object.keys(sanitized.vitals).forEach(key => {
                if (sanitized.vitals[key as keyof typeof sanitized.vitals] === null || sanitized.vitals[key as keyof typeof sanitized.vitals] === undefined) {
                    sanitized.vitals[key as keyof typeof sanitized.vitals] = '';
                }
            });
        }

        // Sanitize top-level fields
        Object.keys(sanitized).forEach(key => {
            if (key !== 'vitals' && key !== 'ipdHistory' && key !== 'followUpDate') {
                if (sanitized[key as keyof typeof sanitized] === null || sanitized[key as keyof typeof sanitized] === undefined) {
                    (sanitized as any)[key] = (INITIAL_FORM_STATE as any)[key] ?? '';
                }
            }
        });

        return sanitized as typeof INITIAL_FORM_STATE;
    };

    // Update form data when record is fetched
    useEffect(() => {
        if (initializedRef.current) return;

        const fetchAdmissionDetails = async (id: string) => {
            setLoading(true);
            setFormData(INITIAL_FORM_STATE);
            setConsultants(['']);
            localStorage.removeItem('discharge_form_draft');

            try {
                const response = await dischargeService.getAdmissionDetails(id);
                if (response) {
                    const formattedGender = response.gender ?
                        response.gender.charAt(0).toUpperCase() + response.gender.slice(1).toLowerCase()
                        : '';
                    const formattedAge = response.age && !response.age.toString().toLowerCase().includes('year') ?
                        `${response.age} Years`
                        : response.age || '';

                    const sanitizedResponse = sanitizeData(response);
                    setFormData({
                        ...sanitizedResponse,
                        gender: formattedGender,
                        age: formattedAge,
                        admissionDate: response.admissionDate ? formatDate(response.admissionDate) : '',
                        dischargeDate: response.dischargeDate ? formatDate(response.dischargeDate) : (response.dischargeAdviceAt ? formatDate(response.dischargeAdviceAt) : formatDate(new Date())),
                        followUpDate: response.followUpDate ? formatDate(response.followUpDate) : '',
                        dob: response.dob ? new Date(response.dob).toISOString().split('T')[0] : '',
                        patientTitle: determineTitle(formattedGender, formattedAge),
                        primaryDoctor: response.primaryDoctor || response.suggestedDoctorName || '',
                        suggestedDoctorName: response.suggestedDoctorName || '',
                        specialistType: response.specialistType || '',
                        ipdHistory: response.ipdHistory || [],
                        reasonForAdmission: response.reason || response.reasonForAdmission || '',
                        chiefComplaints: response.reason || response.chiefComplaints || '', // Fill this too as it is often identical on intake
                        // Auto-fill condition from vitals condition (Nurse's selection) or status
                        conditionAtDischarge: response.vitals?.condition
                            ? (response.vitals.condition.charAt(0).toUpperCase() + response.vitals.condition.slice(1).toLowerCase())
                            : (response.vitals?.status ? (response.vitals.status.charAt(0).toUpperCase() + response.vitals.status.slice(1).toLowerCase()) : ''),

                        // Ensure vitals are explicitly set and map glucose
                        vitals: response.vitals ? {
                            ...INITIAL_FORM_STATE.vitals,
                            ...(response.vitals as any),
                            glucose: (response.vitals as any).glucose || ''
                        } : INITIAL_FORM_STATE.vitals
                    });

                    console.log('[Discharge Debug] Fetched Admission Full Response:', response);
                    console.log('[Discharge Debug] Vitals Object:', response.vitals);
                    console.log('[Discharge Debug] Glucose Value (Raw):', response.vitals?.glucose);
                    console.log('[Discharge Debug] Condition at Discharge (Calculated):', response.vitals?.condition
                        ? (response.vitals.condition.charAt(0).toUpperCase() + response.vitals.condition.slice(1).toLowerCase())
                        : (response.vitals?.status ? (response.vitals.status.charAt(0).toUpperCase() + response.vitals.status.slice(1).toLowerCase()) : 'None'));

                    if (response.consultants && response.consultants.length > 0) {
                        setConsultants(response.consultants.filter((c: string) => c));
                    } else if (response.suggestedDoctorName) {
                        setConsultants([response.suggestedDoctorName]);
                    }

                    toast.success("Patient details synced from admission record", {
                        id: 'sync-admission-toast',
                        icon: '✅',
                        duration: 3000
                    });
                }
            } catch (err) {
                console.error("[DISCHARGE FORM] Failed to fetch admission details:", err);
                toast.error("Failed to sync patient details", { id: 'sync-error' });
            } finally {
                setLoading(false);
            }
        };

        if (recordId && recordData) {
            initializedRef.current = true;
            const sanitizedRecord = sanitizeData(recordData);
            setFormData(prev => ({
                ...prev,
                ...sanitizedRecord,
                admissionDate: formatDate(recordData.admissionDate),
                dischargeDate: formatDate(recordData.dischargeDate),
                followUpDate: recordData.followUpDate ? formatDate(recordData.followUpDate) : '',
                dob: recordData.dob ? new Date(recordData.dob).toISOString().split('T')[0] : '',
            }));
            setConsultants(recordData.consultants || ['']);
            setIsInitialized(true);
        } else if (((searchParams?.get('mode') ?? null) ?? null) === 'sample') {
            initializedRef.current = true;
            setFormData(SAMPLE_DATA);
            setConsultants(['Dr. Robert Smith', 'Dr. Sarah Williams']);
            setIsInitialized(true);
            toast.success("Viewing Sample Form with dummy data", { id: 'sample-mode-toast', icon: '🧪' });
        } else if (!recordId && !recordData) {
            const mrn = ((searchParams?.get('mrn') ?? null) ?? null);
            const admissionId = ((searchParams?.get('admissionId') ?? null) ?? null);
            const idToFetch = mrn || admissionId;

            if (idToFetch) {
                initializedRef.current = true;
                fetchAdmissionDetails(idToFetch);
                setIsInitialized(true);
            } else {
                const savedDraft = localStorage.getItem('discharge_form_draft');
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        if (parsed.formData) setFormData(parsed.formData);
                        if (parsed.consultants) setConsultants(parsed.consultants);
                    } catch (e) {
                        console.error('Failed to restore draft', e);
                    }
                }
                initializedRef.current = true;
                setIsInitialized(true);
            }
        }
    }, [recordData, recordId, searchParams]);

    // Save draft to local storage
    useEffect(() => {
        if (!recordId && isInitialized) {
            const draft = { formData, consultants };
            localStorage.setItem('discharge_form_draft', JSON.stringify(draft));
        }
    }, [formData, consultants, recordId, isInitialized]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'patientName') {
            const charOnly = value.replace(/[0-9]/g, '').slice(0, getCharLimit('patientName'));
            setFormData(prev => ({ ...prev, [name]: charOnly }));
            const error = validateField(name, charOnly);
            setErrors(prev => ({ ...prev, [name]: error }));
            return;
        }

        if (name === 'phone' || name === 'attendantPhone') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            const error = validateField(name, digitsOnly);
            setErrors(prev => ({ ...prev, [name]: error }));
            return;
        }

        if (name === 'icdCode') {
            const upper = value.toUpperCase().slice(0, getCharLimit('icdCode'));
            setFormData(prev => ({ ...prev, [name]: upper }));
            const error = validateField(name, upper);
            setErrors(prev => ({ ...prev, [name]: error }));
            return;
        }

        if (['totalBillAmount', 'advanceAmount', 'finalPayment'].includes(name)) {
            const numVal = Math.round(parseFloat(value) || 0);
            const updatedData = { ...formData, [name]: numVal };
            setFormData(prev => ({ ...prev, [name]: numVal }));
            const error = validateField(name, numVal, updatedData);
            setErrors(prev => ({ ...prev, [name]: error }));
            // Re-validate totalBillAmount when advance/final changes
            if (name !== 'totalBillAmount') {
                const totalError = validateField('totalBillAmount', updatedData.totalBillAmount, updatedData);
                setErrors(prev => ({ ...prev, totalBillAmount: totalError }));
            }
            return;
        }

        if (name === 'paymentMode') {
            setFormData(prev => ({ ...prev, [name]: value }));
            const updatedData = { ...formData, [name]: value };
            const insError = validateField('insuranceName', formData.insuranceName, updatedData);
            setErrors(prev => ({ ...prev, insuranceName: insError }));
            return;
        }

        const limit = getCharLimit(name.includes('.') ? name.split('.')[1] : name);
        if (value.length > limit) return;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            const error = validateField(child, value);
            setErrors(prev => ({ ...prev, [name]: error }));
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...(prev[parent as keyof typeof prev] as any),
                    [child]: value
                }
            }));
            return;
        }

        // Handle date cross-validations
        const updatedFormData = { ...formData, [name]: value };
        const error = validateField(name, value, updatedFormData);
        setErrors(prev => ({ ...prev, [name]: error }));
        setFormData(prev => ({ ...prev, [name]: value }));

        // Re-validate dependent date fields
        if (name === 'admissionDate') {
            const dischErr = validateField('dischargeDate', formData.dischargeDate, updatedFormData);
            setErrors(prev => ({ ...prev, dischargeDate: dischErr }));
        }
        if (name === 'dischargeDate') {
            const fuErr = validateField('followUpDate', formData.followUpDate, updatedFormData);
            setErrors(prev => ({ ...prev, followUpDate: fuErr }));
        }
    };

    const handleConsultantChange = (index: number, value: string) => {
        if (/^[^0-9]*$/.test(value)) {
            const newConsultants = [...consultants];
            newConsultants[index] = value;
            setConsultants(newConsultants);
        }
    };

    const addConsultant = () => setConsultants([...consultants, '']);
    const removeConsultant = (index: number) => {
        if (consultants.length > 1) {
            setConsultants(consultants.filter((_, i) => i !== index));
        }
    };

    const handleReset = () => {
        setConfirmModal({
            isOpen: true,
            title: "Reset Form",
            message: "Are you sure you want to reset the form? All unsaved data will be lost.",
            onConfirm: () => {
                setFormData(INITIAL_FORM_STATE);
                setConsultants(['']);
                localStorage.removeItem('discharge_form_draft');
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                toast.success("Form reset successfully");
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // SAMPLE MODE: Never save to backend — just print/preview
        if (((searchParams?.get('mode') ?? null) ?? null) === 'sample') {
            toast.success("Sample preview only — no data saved to backend", { id: 'sample-print-toast', icon: '🖨️' });
            setTimeout(() => handlePrint(), 300);
            return;
        }

        const newErrors: Record<string, string> = {};
        const requiredFields = ['patientName', 'mrn', 'diagnosis', 'chiefComplaints', 'treatmentGiven', 'conditionAtDischarge'];

        requiredFields.forEach(field => {
            const error = validateField(field, formData[field as keyof typeof formData]);
            if (error) newErrors[field] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please fill all required fields correctly");
            return;
        }


        setLoading(true);
        try {
            const isNurse = user?.role === 'nurse';
            const isHelpdesk = user?.role === 'helpdesk' || user?.role === 'hospital-admin';

            let computedLogo = formData.hospitalLogo || user?.image || (user as any)?.avatar || '';
            if (typeof computedLogo === 'string' && computedLogo.includes('example.com/logo.png')) {
                computedLogo = '';
            }
            const payload = {
                ...formData,
                consultants: consultants.filter(c => c.trim() !== ''),
                hospitalLogo: computedLogo,
                status: isNurse ? 'PREPARED_BY_NURSE' : 'completed'
            };

            // Update local state so print component sees the logo
            setFormData(prev => ({ ...prev, hospitalLogo: computedLogo }));

            console.log('[DEBUG] Submitting Payload:', payload);

            if (recordId) {
                await dischargeService.updateRecord(recordId, payload);
                toast.success("Record updated successfully");

                if (!isNurse) {
                    setTimeout(() => handlePrint(), 500); // Slight delay to ensure state update
                } else {
                    router.push('/nurse/discharge');
                }
            } else {
                await dischargeService.saveRecord(payload);
                toast.success(isNurse ? "Discharge form prepared" : "Record saved successfully");
                localStorage.removeItem('discharge_form_draft');
                await queryClient.refetchQueries({ queryKey: ['discharge', 'history'] });

                if (isNurse) {
                    router.push('/nurse/discharge');
                } else {
                    setTimeout(() => handlePrint(), 500);
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to save record");
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingRecord && recordId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-bold animate-pulse">Loading patient record...</p>
            </div>
        );
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8">
                {/* Patient Demographics */}
                <Card className="p-[2px] sm:p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Patient Demographics</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Personal identity profile</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormSelect
                            label="Title"
                            name="patientTitle"
                            value={formData.patientTitle}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: 'Mr', label: 'Mr' },
                                { value: 'Mrs', label: 'Mrs' },
                                { value: 'Ms', label: 'Ms' },
                                { value: 'Dr', label: 'Dr' },
                                { value: 'Master', label: 'Master' },
                                { value: 'Baby', label: 'Baby' }
                            ]}
                        />
                        <div className="md:col-span-2">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>Patient Name *</span>
                                    <span className={`text-[10px] font-bold ${formData.patientName.length >= 130 ? 'text-red-500' : 'text-gray-400'}`}>{formData.patientName.length}/150</span>
                                </div>
                                <input
                                    name="patientName"
                                    value={formData.patientName}
                                    onChange={handleChange}
                                    placeholder="Enter patient name"
                                    required
                                    className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold ${errors.patientName ? 'border-red-400' : 'border-gray-400'}`}
                                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                />
                                {errors.patientName && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.patientName}</p>}
                            </div>
                        </div>
                        <div>
                            <FormInput
                                label="Age *"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder="e.g., 45 Years"
                                className={`font-bold ${errors.age ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.age}
                                required
                            />
                        </div>
                        <FormSelect
                            label="Gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Other', label: 'Other' }
                            ]}
                        />
                        <FormInput
                            label="Phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="10-digit mobile number"
                            className="border-gray-400 font-bold"
                            error={errors.phone}
                        />
                        <div className="md:col-span-3">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>Address</span>
                                    <span className={`text-[10px] font-bold ${formData.address.length >= 360 ? 'text-red-500' : 'text-gray-400'}`}>{formData.address.length}/400</span>
                                </div>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Complete residential address"
                                    rows={2}
                                    className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${spellStates['address']?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400'}`}
                                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                />
                                {spellStates['address']?.matches.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {spellStates['address'].matches.slice(0, 3).map((match, mIdx) => (
                                            <button
                                                key={mIdx}
                                                type="button"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActivePopup({ match, field: 'address', x: rect.left, y: rect.top });
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[10px] font-bold">"{formData.address.substring(match.offset, match.offset + match.length)}"</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <FormInput
                            label="Date of Birth"
                            name="dob"
                            type="date"
                            value={formData.dob}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                        />
                        <FormInput
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="patient@example.com"
                            className="border-gray-400 font-bold"
                            error={errors.email}
                        />
                        <FormInput
                            label="Nationality"
                            name="nationality"
                            value={formData.nationality}
                            onChange={handleChange}
                            placeholder="e.g., Indian"
                            className="border-gray-400 font-bold"
                        />
                        <FormSelect
                            label="Blood Group"
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: '', label: 'Select' },
                                { value: 'Unknown', label: 'Unknown' },
                                { value: 'A+', label: 'A+' },
                                { value: 'A-', label: 'A-' },
                                { value: 'B+', label: 'B+' },
                                { value: 'B-', label: 'B-' },
                                { value: 'O+', label: 'O+' },
                                { value: 'O-', label: 'O-' },
                                { value: 'AB+', label: 'AB+' },
                                { value: 'AB-', label: 'AB-' }
                            ]}
                        />
                        <FormSelect
                            label="Marital Status"
                            name="maritalStatus"
                            value={formData.maritalStatus}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: '', label: 'Select' },
                                { value: 'Single', label: 'Single' },
                                { value: 'Married', label: 'Married' },
                                { value: 'Divorced', label: 'Divorced' },
                                { value: 'Widowed', label: 'Widowed' }
                            ]}
                        />
                        <div>
                            <FormInput
                                label="Government ID Number"
                                name="govtId"
                                value={formData.govtId}
                                onChange={handleChange}
                                placeholder="e.g., Aadhar/PAN Number"
                                className={`font-bold ${errors.govtId ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.govtId}
                            />
                        </div>
                    </div>
                </Card>

                {/* Attendant / Guardian Information */}
                <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Attendant / Guardian Information</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Primary contact and backup</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput
                            label="Guardian Name"
                            name="attendantName"
                            value={formData.attendantName}
                            onChange={handleChange}
                            placeholder="Name of attendant"
                            className="border-gray-400 font-bold"
                        />
                        <FormInput
                            label="Relationship"
                            name="attendantRelationship"
                            value={formData.attendantRelationship}
                            onChange={handleChange}
                            placeholder="e.g., Spouse, Child, Parent"
                            className="border-gray-400 font-bold"
                        />
                        <FormInput
                            label="Guardian Phone"
                            name="attendantPhone"
                            value={formData.attendantPhone}
                            onChange={handleChange}
                            placeholder="Contact number"
                            className={`font-bold ${errors.attendantPhone ? 'border-red-400' : 'border-gray-400'}`}
                            error={errors.attendantPhone}
                        />
                    </div>
                </Card>

                {/* Admission Details */}
                <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Admission Details</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hospitalization and routing</p>
                        </div>
                        <div className="ml-auto flex bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest gap-1 border border-blue-200">
                            Stay Duration: {(() => {
                                if (!formData.admissionDate) return 'N/A';
                                const startTime = new Date(formData.admissionDate).getTime();
                                const endTime = formData.dischargeDate ? new Date(formData.dischargeDate).getTime() : new Date().getTime();
                                const diffInMs = Math.max(0, endTime - startTime);
                                const hours = Math.floor(diffInMs / (1000 * 60 * 60));
                                const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
                                if (hours >= 24) {
                                    const days = Math.floor(hours / 24);
                                    const remainingHours = hours % 24;
                                    return `${days} Day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} Hrs` : ''}`;
                                }
                                return `${hours} Hrs, ${minutes} Mins`;
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>MRN *</span>
                                <span className={`text-[10px] font-bold ${formData.mrn.length >= 130 ? 'text-red-500' : 'text-gray-400'}`}>{formData.mrn.length}/150</span>
                            </div>
                            <input
                                name="mrn"
                                value={formData.mrn}
                                onChange={handleChange}
                                placeholder="Medical Record Number"
                                required
                                className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold ${errors.mrn ? 'border-red-400' : 'border-gray-400'}`}
                                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                            />
                            {errors.mrn && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.mrn}</p>}
                        </div>
                        <FormSelect
                            label="Room Type"
                            name="roomType"
                            value={formData.roomType}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: '', label: 'Select Room Type' },
                                ...unitTypes.map(ut => ({ value: ut, label: ut }))
                            ]}
                        />
                        <FormInput
                            label="Room Number"
                            name="roomNo"
                            value={formData.roomNo}
                            onChange={handleChange}
                            placeholder="e.g., 303"
                            className="border-gray-400 font-bold"
                        />
                        <FormInput
                            label="Department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="e.g., Cardiology"
                            className="border-gray-400 font-bold"
                        />
                        <div>
                            <FormInput
                                label="Admission Date"
                                name="admissionDate"
                                type="datetime-local"
                                value={formData.admissionDate}
                                onChange={handleChange}
                                className={`font-bold ${errors.admissionDate ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.admissionDate}
                            />
                        </div>
                        <div>
                            <FormInput
                                label="Discharge Date"
                                name="dischargeDate"
                                type="datetime-local"
                                value={formData.dischargeDate}
                                onChange={handleChange}
                                className={`font-bold ${errors.dischargeDate ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.dischargeDate}
                            />
                        </div>
                        <FormSelect
                            label="Admission Type"
                            name="admissionType"
                            value={formData.admissionType}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: 'IPD', label: 'IPD' },
                                { value: 'Emergency', label: 'Emergency' },
                                { value: 'ICU', label: 'ICU' },
                                { value: 'Day Care', label: 'Day Care' }
                            ]}
                        />
                        <FormSelect
                            label="Discharge Type *"
                            name="dischargeType"
                            value={formData.dischargeType}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: '', label: 'Select Discharge Type' },
                                { value: 'Recovered / Cured', label: 'Recovered / Cured' },
                                { value: 'Referred to Another Hospital', label: 'Referred to Another Hospital' },
                                { value: 'Discharged Against Medical Advice (DAMA / LAMA)', label: 'Discharged Against Medical Advice (DAMA / LAMA)' },
                                { value: 'Absconded / Left Without Notice', label: 'Absconded / Left Without Notice' },
                                { value: 'Death / Expired', label: 'Death / Expired' },
                                { value: 'Brought Dead (Dead on Arrival)', label: 'Brought Dead (Dead on Arrival)' },
                                { value: 'Terminal Discharge (Palliative / End-of-life)', label: 'Terminal Discharge (Palliative / End-of-life)' },
                                { value: 'DOR (Discharge on request)', label: 'DOR (Discharge on request)' }
                            ]}
                        />
                        <FormInput
                            label="Bed Number"
                            name="bedNo"
                            value={formData.bedNo}
                            onChange={handleChange}
                            placeholder="e.g., Bed-01"
                            className="border-gray-400 font-bold"
                        />
                        <FormInput
                            label="Specialist Type"
                            name="specialistType"
                            value={formData.specialistType}
                            onChange={handleChange}
                            placeholder="e.g., Senior Consultant"
                            className="border-gray-400 font-bold"
                        />
                        <div>
                            <FormInput
                                label="ICD-10 Code"
                                name="icdCode"
                                value={formData.icdCode}
                                onChange={handleChange}
                                placeholder="e.g., J45.9"
                                className={`font-bold ${errors.icdCode ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.icdCode}
                            />
                        </div>
                    </div>
                </Card>

                {/* Clinical Information */}
                <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Stethoscope size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Clinical Information</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Examination and Diagnosis</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {[{ name: 'reasonForAdmission', label: 'Reason for Admission', placeholder: 'Why was the patient admitted?', limit: 400, rows: 2 },
                        { name: 'chiefComplaints', label: 'Chief Complaints *', placeholder: 'Main symptoms presented by patient', limit: 400, rows: 2, required: true },
                        { name: 'historyOfPresentIllness', label: 'History of Present Illness', placeholder: 'Detailed history of current illness', limit: 400, rows: 3 },
                        { name: 'pastMedicalHistory', label: 'Past Medical History', placeholder: 'Previous medical conditions, surgeries, etc.', limit: 400, rows: 2 },
                        { name: 'provisionalDiagnosis', label: 'Provisional Diagnosis', placeholder: 'Initial diagnosis at admission', limit: 200, rows: 2 },
                        { name: 'diagnosis', label: 'Final Diagnosis *', placeholder: 'Confirmed medical diagnosis', limit: 400, rows: 2, required: true },
                        { name: 'allergyHistory', label: 'Allergy History', placeholder: 'Known allergies', limit: 200, rows: 2 },
                        ].map(({ name, label, placeholder, limit, rows, required: req }) => {
                            const val = (formData as any)[name] as string;
                            const errMsg = (errors as any)[name];
                            return (
                                <div key={name}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>{label}</span>
                                        <span className={`text-[10px] font-bold ${val.length >= limit * 0.9 ? (val.length >= limit ? 'text-red-600' : 'text-orange-500') : 'text-gray-400'}`}>{val.length}/{limit}</span>
                                    </div>
                                    <textarea
                                        name={name}
                                        value={val}
                                        onChange={handleChange}
                                        placeholder={placeholder}
                                        rows={rows}
                                        required={req}
                                        className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${errMsg ? 'border-red-400' : (spellStates[name]?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400')}`}
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    />
                                    {spellStates[name]?.matches.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {spellStates[name].matches.slice(0, 3).map((match, mIdx) => (
                                                <button
                                                    key={mIdx}
                                                    type="button"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActivePopup({ match, field: name, x: rect.left, y: rect.top });
                                                    }}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold">"{val.substring(match.offset, match.offset + match.length)}"</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {errMsg && <p className="text-xs text-red-600 mt-1 font-semibold">{errMsg}</p>}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Treatment & Procedures */}
                <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <HeartPulse size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Treatment & Procedures</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Medical interventions and care</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Vitals with error messages */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
                            {[{ label: 'Height (cm)', vname: 'vitals.height', ph: '170' },
                            { label: 'Weight (kg)', vname: 'vitals.weight', ph: '70' },
                            { label: 'BP', vname: 'vitals.bloodPressure', ph: '120/80' },
                            { label: 'Pulse', vname: 'vitals.pulse', ph: '72' },
                            { label: 'Temp (°F)', vname: 'vitals.temperature', ph: '98.6' },
                            { label: 'SpO2 (%)', vname: 'vitals.spO2', ph: '99' },
                            { label: 'Glucose', vname: 'vitals.glucose', ph: '100' },
                            ].map(({ label, vname, ph }) => {
                                const errMsg = (errors as any)[vname];
                                return (
                                    <div key={vname}>
                                        <FormInput label={label} name={vname} value={(formData.vitals as any)[vname.split('.')[1]]} onChange={handleChange} placeholder={ph} className={`font-bold ${errMsg ? 'border-red-400' : 'border-gray-400'}`} />
                                        {errMsg && <p className="text-[10px] text-red-600 mt-0.5 font-semibold">{errMsg}</p>}
                                    </div>
                                );
                            })}
                        </div>
                        {[{ name: 'generalAppearance', label: 'General Appearance', placeholder: 'Physical examination findings', limit: 200, rows: 2 },
                        { name: 'treatmentGiven', label: 'Treatment Given *', placeholder: 'Summary of all treatments provided', limit: 400, rows: 3, required: true },
                        { name: 'surgicalProcedures', label: 'Surgical Procedures', placeholder: 'Any surgeries performed', limit: 400, rows: 2 },
                        { name: 'surgeryNotes', label: 'Surgery Notes', placeholder: 'Detailed surgical notes if applicable', limit: 400, rows: 3 },
                        { name: 'investigationsPerformed', label: 'Investigations Performed', placeholder: 'Labs, Radiology, etc.', limit: 400, rows: 3 },
                        { name: 'hospitalCourse', label: 'Hospital Course', placeholder: "Summary of patient's stay and progress", limit: 400, rows: 3 },
                        ].map(({ name, label, placeholder, limit, rows, required: req }) => {
                            const val = (formData as any)[name] as string;
                            const errMsg = (errors as any)[name];
                            return (
                                <div key={name}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>{label}</span>
                                        <span className={`text-[10px] font-bold ${val.length >= limit * 0.9 ? (val.length >= limit ? 'text-red-600' : 'text-orange-500') : 'text-gray-400'}`}>{val.length}/{limit}</span>
                                    </div>
                                    <textarea
                                        name={name}
                                        value={val}
                                        onChange={handleChange}
                                        placeholder={placeholder}
                                        rows={rows}
                                        required={req}
                                        className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${errMsg ? 'border-red-400' : (spellStates[name]?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400')}`}
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    />
                                    {spellStates[name]?.matches.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {spellStates[name].matches.slice(0, 3).map((match, mIdx) => (
                                                <button
                                                    key={mIdx}
                                                    type="button"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActivePopup({ match, field: name, x: rect.left, y: rect.top });
                                                    }}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold">"{val.substring(match.offset, match.offset + match.length)}"</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {errMsg && <p className="text-xs text-red-600 mt-1 font-semibold">{errMsg}</p>}
                                </div>
                            );
                        })}

                    </div>
                </Card>

                {/* Discharge Advice */}
                <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Discharge Advice</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Post-hospital care instructions</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <FormSelect
                                label="Condition at Discharge *"
                                name="conditionAtDischarge"
                                value={formData.conditionAtDischarge}
                                onChange={handleChange}
                                className={`font-bold ${errors.conditionAtDischarge ? 'border-red-400' : 'border-gray-400'}`}
                                error={errors.conditionAtDischarge}
                                options={[
                                    { value: 'Stable', label: 'Stable' },
                                    { value: 'Fair', label: 'Fair' },
                                    { value: 'Serious', label: 'Serious' },
                                    { value: 'Critical', label: 'Critical' }
                                ]}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[{ name: 'adviceAtDischarge', label: 'Advice at Discharge', placeholder: 'General health advice', limit: 400 },
                            { name: 'dietInstructions', label: 'Diet Instructions', placeholder: 'Nutritional advice', limit: 400 },
                            ].map(({ name, label, placeholder, limit }) => {
                                const val = (formData as any)[name] as string;
                                return (
                                    <div key={name}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>{label}</span>
                                            <span className={`text-[10px] font-bold ${val.length >= limit * 0.9 ? (val.length >= limit ? 'text-red-600' : 'text-orange-500') : 'text-gray-400'}`}>{val.length}/{limit}</span>
                                        </div>
                                        <textarea
                                            name={name}
                                            value={val}
                                            onChange={handleChange}
                                            placeholder={placeholder}
                                            rows={2}
                                            className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${spellStates[name]?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400'}`}
                                            style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                        />
                                        {spellStates[name]?.matches.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {spellStates[name].matches.slice(0, 3).map((match, mIdx) => (
                                                    <button
                                                        key={mIdx}
                                                        type="button"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActivePopup({ match, field: name, x: rect.left, y: rect.top });
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold">"{val.substring(match.offset, match.offset + match.length)}"</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[{ name: 'activityRestrictions', label: 'Activity Restrictions', placeholder: 'Physical activity limitations', limit: 400 },
                            { name: 'warningSigns', label: 'Warning Signs', placeholder: 'Symptoms requiring immediate attention', limit: 400 },
                            ].map(({ name, label, placeholder, limit }) => {
                                const val = (formData as any)[name] as string;
                                return (
                                    <div key={name}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>{label}</span>
                                            <span className={`text-[10px] font-bold ${val.length >= limit * 0.9 ? (val.length >= limit ? 'text-red-600' : 'text-orange-500') : 'text-gray-400'}`}>{val.length}/{limit}</span>
                                        </div>
                                        <textarea
                                            name={name}
                                            value={val}
                                            onChange={handleChange}
                                            placeholder={placeholder}
                                            rows={2}
                                            className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${spellStates[name]?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400'}`}
                                            style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                        />
                                        {spellStates[name]?.matches.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {spellStates[name].matches.slice(0, 3).map((match, mIdx) => (
                                                    <button
                                                        key={mIdx}
                                                        type="button"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActivePopup({ match, field: name, x: rect.left, y: rect.top });
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold">"{val.substring(match.offset, match.offset + match.length)}"</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>Follow-up Instructions</span>
                                    <span className={`text-[10px] font-bold ${formData.followUpInstructions.length >= 360 ? 'text-red-600' : 'text-gray-400'}`}>{formData.followUpInstructions.length}/400</span>
                                </div>
                                <textarea
                                    name="followUpInstructions"
                                    value={formData.followUpInstructions}
                                    onChange={handleChange}
                                    placeholder="When and where to follow up"
                                    rows={2}
                                    className={`w-full p-2.5 rounded-xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none ${spellStates['followUpInstructions']?.matches.length > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-gray-400'}`}
                                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                />
                                {spellStates['followUpInstructions']?.matches.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {spellStates['followUpInstructions'].matches.slice(0, 3).map((match, mIdx) => (
                                            <button
                                                key={mIdx}
                                                type="button"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActivePopup({ match, field: 'followUpInstructions', x: rect.left, y: rect.top });
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[10px] font-bold">"{formData.followUpInstructions.substring(match.offset, match.offset + match.length)}"</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <FormInput
                                    label="Follow-up Date & Time"
                                    name="followUpDate"
                                    type="datetime-local"
                                    value={formData.followUpDate}
                                    onChange={handleChange}
                                    className={`font-bold ${errors.followUpDate ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.followUpDate}
                                />
                            </div>
                        </div>

                        {/* Consultants Section */}
                        <div className="pt-4 border-t border-gray-50">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Consultants Involved</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {consultants.map((consultant, index) => (
                                    <div key={index} className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={consultant}
                                                onChange={(e) => handleConsultantChange(index, e.target.value)}
                                                placeholder={`Consultant ${index + 1} Name`}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-400 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold"
                                            />
                                        </div>
                                        {consultants.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeConsultant(index)}
                                                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                onClick={addConsultant}
                                className="mt-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Consultant
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>Suggested Doctor</span>
                                    <span className={`text-[10px] font-bold ${formData.suggestedDoctorName.length >= 90 ? 'text-red-600' : 'text-gray-400'}`}>{formData.suggestedDoctorName.length}/100</span>
                                </div>
                                <FormInput
                                    name="suggestedDoctorName"
                                    value={formData.suggestedDoctorName}
                                    onChange={handleChange}
                                    placeholder="Doctor for follow-up"
                                    className={`font-bold ${errors.suggestedDoctorName ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.suggestedDoctorName}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>Referral Hospital</span>
                                    <span className={`text-[10px] font-bold ${formData.hospitalName.length >= 90 ? 'text-red-600' : 'text-gray-400'}`}>{formData.hospitalName.length}/100</span>
                                </div>
                                <FormInput
                                    name="hospitalName"
                                    value={formData.hospitalName}
                                    onChange={handleChange}
                                    placeholder="If referral suggested"
                                    className={`font-bold ${errors.hospitalName ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.hospitalName}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Billing & Insurance - HIDDEN FOR NURSES */}
                {!isNurse && (
                    <Card className="p-6 bg-white rounded-2xl border-white shadow-xl shadow-blue-900/5">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Save size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Billing & Insurance</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Financial summary</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <FormInput
                                    label="Advance Paid"
                                    name="advanceAmount"
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={formData.advanceAmount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={`font-bold ${errors.advanceAmount ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.advanceAmount}
                                    disabled={isHelpdesk}
                                />
                            </div>
                            <div>
                                <FormInput
                                    label="Final Payment"
                                    name="finalPayment"
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={formData.finalPayment}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={`font-bold ${errors.finalPayment ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.finalPayment}
                                    disabled={isHelpdesk}
                                />
                            </div>
                            <div>
                                <FormInput
                                    label="Total Amount"
                                    name="totalBillAmount"
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={formData.totalBillAmount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={`font-bold ${errors.totalBillAmount ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.totalBillAmount}
                                    disabled={isHelpdesk}
                                />
                            </div>
                            <FormSelect
                                label="Payment Mode"
                                name="paymentMode"
                                value={formData.paymentMode}
                                onChange={handleChange}
                                className="border-gray-400 font-bold"
                                disabled={isHelpdesk}
                                options={[
                                    { value: 'Cash', label: 'Cash' },
                                    { value: 'Card', label: 'Card' },
                                    { value: 'UPI', label: 'UPI' },
                                    { value: 'Insurance', label: 'Insurance' },
                                    { value: 'Bank Transfer', label: 'Bank Transfer' }
                                ]}
                            />
                            <div className="md:col-span-4">
                                <FormInput
                                    label="Insurance Name"
                                    name="insuranceName"
                                    value={formData.insuranceName}
                                    onChange={handleChange}
                                    placeholder="If applicable"
                                    className={`font-bold ${errors.insuranceName ? 'border-red-400' : 'border-gray-400'}`}
                                    error={errors.insuranceName}
                                    disabled={isHelpdesk}
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Spell Check Status Bar */}
                <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isSpellChecking ? 'bg-blue-50 text-blue-500' : totalSpellingErrors > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            {isSpellChecking ? <Loader2 size={18} className="animate-spin" /> : totalSpellingErrors > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                {isSpellChecking ? 'Analyzing content...' : totalSpellingErrors > 0 ? `${totalSpellingErrors} issues identified` : 'Content Verified'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {isSpellChecking ? 'Checking for errors' : totalSpellingErrors > 0 ? 'Click underlined words for suggestions' : 'No spelling errors found'}
                            </p>
                        </div>
                    </div>
                    {totalSpellingErrors > 0 && (
                        <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-widest">
                            Suggestions Available
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-4 pt-4 sm:pt-8 border-t border-gray-100 mt-4 sm:mt-8">
                    <Button
                        type="button"
                        onClick={() => {
                            if (isNurse) router.push('/nurse/discharge');
                            else if (user?.role === 'helpdesk') router.push('/helpdesk/discharge/history');
                            else router.push('/discharge');
                        }}
                        className="bg-slate-800 text-white hover:bg-slate-900 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-3.5 font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-[8px] sm:text-xs w-auto"
                    >
                        <ArrowLeft size={14} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Back to Queue</span>
                        <span className="sm:hidden">Back</span>
                    </Button>

                    <Button
                        type="button"
                        onClick={handleReset}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-3.5 font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-[8px] sm:text-xs w-auto"
                    >
                        <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Reset Form</span>
                        <span className="sm:hidden">Reset</span>
                    </Button>

                    <Button
                        type="submit"
                        disabled={loading || Object.values(errors).some(e => e !== '')}
                        className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl px-3 sm:px-8 py-2 sm:py-3.5 font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-1 sm:gap-2 transition-all text-[9px] sm:text-sm w-auto"
                    >
                        {loading ? (
                            <div className="h-3 w-3 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={14} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="hidden sm:inline">{isNurse ? 'Prepare Discharge' : 'Commit & Print'}</span>
                                <span className="sm:hidden">{isNurse ? 'Prepare' : 'Commit'}</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />

            <div className="hidden">
                <PrintableDischargeSummary
                    ref={componentRef}
                    data={formData}
                    consultants={consultants}
                />
            </div>

            {/* Spell Correction Popup */}
            <AnimatePresence>
                {activePopup && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActivePopup(null)}
                            className="fixed inset-0 z-[100] bg-slate-900/5 backdrop-blur-[1px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            style={{
                                position: 'fixed',
                                top: Math.min(window.innerHeight - 250, activePopup.y + 40),
                                left: Math.min(window.innerWidth - 320, activePopup.x),
                                zIndex: 101,
                            }}
                            className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                        >
                            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <SpellCheck size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Spelling Correction</span>
                                </div>
                                <button onClick={() => setActivePopup(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-tighter">Current Text</p>
                                    <p className="text-sm font-bold text-slate-900 leading-tight">
                                        "{(formData as any)[activePopup.field].substring(activePopup.match.offset, activePopup.match.offset + activePopup.match.length)}"
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Suggestions</p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {activePopup.match.replacements.slice(0, 4).map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => applyCorrection(activePopup.field, activePopup.match, s.value)}
                                                className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                                            >
                                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">{s.value}</span>
                                                <CheckCircle2 size={12} className="text-slate-300 group-hover:text-blue-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 text-center tracking-tight uppercase">
                                    LanguageTool Integrated
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
