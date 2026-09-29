'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    Loader2,
    ChevronRight,
    ArrowLeft,
    User,
    Phone,
    MapPin,
    Heart,
    Clock,
    SpellCheck
} from "lucide-react";
import { helpdeskService, ipdService, spellCheckService } from "@/lib/integrations";
import type { HelpdeskDoctor, Bed, SpellMatch, SpellState, SpellPopupState } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HONORIFIC_OPTIONS } from "@/lib/utils/name-utils";

interface FieldError {
    [key: string]: string;
}

// Spell-check eligible text fields (types imported from @/lib/integrations)
const SPELL_FIELDS: (keyof typeof INITIAL_FORM)[] = ["name", "address", "allergies", "medicalHistory"];

const INITIAL_FORM = {
    honorific: 'Mr.',
    name: '',
    age: '',
    ageUnit: 'Years',
    dob: '',
    gender: 'male',
    address: '',
    mobile: '',
    patientEmail: '',
    emergencyContact: '',
    bloodGroup: 'Unknown',
    allergies: '',
    medicalHistory: '',
    registrationType: 'OPD' as 'OPD' | 'IPD'
};

// checkSpelling is now handled by spellCheckService.check() from @/lib/integrations

// ── Underline renderer ─────────────────────────────────────────────────────
function HighlightedText({
    text,
    matches,
    onMatchClick,
    fieldName,
}: {
    text: string;
    matches: SpellMatch[];
    onMatchClick: (field: string, match: SpellMatch, e: React.MouseEvent) => void;

    fieldName: string;
}) {
    if (!matches.length || !text) return null;

    const sorted = [...matches].sort((a, b) => a.offset - b.offset);
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    sorted.forEach((m, i) => {
        const start = m.offset;
        const end = m.offset + m.length;
        if (start < cursor) return;
        if (start > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, start)}</span>);
        parts.push(
            <span
                key={`e-${i}`}
                onClick={(e) => onMatchClick(fieldName, m, e)}
                className="spell-error"
                title={m.message}
            >
                {text.slice(start, end)}
            </span>
        );

        cursor = end;
    });

    if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);

    return <>{parts}</>;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PatientRegistration() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldError>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState(INITIAL_FORM);

    const [doctors, setDoctors] = useState<HelpdeskDoctor[]>([]);
    const [beds, setBeds] = useState<Bed[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [loadingInitial, setLoadingInitial] = useState(true);

    // ── Spell-check state (types from @/lib/integrations) ─────────────────
    const [spellErrors, setSpellErrors] = useState<SpellState>({});
    const [checking, setChecking] = useState<{ [k: string]: boolean }>({});
    const [popup, setPopup] = useState<SpellPopupState>(null);
    const spellTimers = useRef<{ [k: string]: ReturnType<typeof setTimeout> }>({});
    const popupRef = useRef<HTMLDivElement>(null);

    // Close popup on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setPopup(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounced spell check — delegates to spellCheckService (lib/integrations)
    const triggerSpellCheck = useCallback((field: string, value: string) => {
        if (spellTimers.current[field]) clearTimeout(spellTimers.current[field]);
        spellTimers.current[field] = setTimeout(async () => {
            if (!value.trim() || value.trim().length < 3) {
                setSpellErrors(prev => ({ ...prev, [field]: [] }));
                return;
            }
            setChecking(prev => ({ ...prev, [field]: true }));
            const matches = await spellCheckService.check(value);
            setSpellErrors(prev => ({ ...prev, [field]: matches }));
            setChecking(prev => ({ ...prev, [field]: false }));
        }, 800);
    }, []);

    // Apply suggestion — correction logic delegated to spellCheckService
    const applySuggestion = useCallback((field: string, match: SpellMatch, suggestion: string) => {
        if (!match) return;

        const currentValue = (formData as any)[field] as string;
        const newValue = spellCheckService.applyCorrection(currentValue, match, suggestion);

        setFormData(prev => ({ ...prev, [field]: newValue }));
        setPopup(null);
        triggerSpellCheck(field, newValue);
    }, [formData, triggerSpellCheck]);


    // Apply all suggestions at once (Google-like "Fix All")
    const applyAllSuggestions = useCallback((field: string, correctedText: string) => {
        setFormData(prev => ({ ...prev, [field]: correctedText }));
        setPopup(null);
        // Delay re-check slightly to let state settle
        setTimeout(() => triggerSpellCheck(field, correctedText), 100);
    }, [triggerSpellCheck]);

    // Popup position handler
    const handleMatchClick = useCallback((field: string, match: SpellMatch, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        
        // Ensure coordinates are within viewport
        const x = Math.max(8, Math.min(rect.left, window.innerWidth - 220));
        const y = rect.bottom + 8;
        
        setPopup({ field, match, x, y });
    }, []);

    const validateField = useCallback((name: string, value: string): string => {
        const trimmed = value.trim();
        switch (name) {
            case 'name':
                if (!trimmed) return 'Patient Name Required';
                if (trimmed.length < 2) return 'Minimum 2 characters expected';
                if (trimmed.length > 150) return 'Name cannot exceed 150 characters';
                if (!/^[a-zA-Z\s.]+$/.test(trimmed)) return 'Only letters and dots allowed';
                return '';
            case 'mobile':
                if (!trimmed) return 'Mobile Number Required';
                if (!/^[6-9][0-9]{9}$/.test(trimmed.replace(/\D/g, ''))) return 'Invalid 10-digit number';
                return '';
            case 'emergencyContact':
                if (trimmed && !/^[6-9][0-9]{9}$/.test(trimmed.replace(/\D/g, ''))) return 'Invalid 10-digit number';
                return '';
            case 'patientEmail':
                if (trimmed && trimmed.length > 100) return 'Email cannot exceed 100 characters';
                if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email format';
                return '';
            case 'address':
                if (!trimmed) return 'Residential Address Required';
                if (trimmed.length < 5) return 'Full address required (min 5 chars)';
                if (trimmed.length > 300) return 'Address cannot exceed 300 characters';
                return '';
            case 'age':
                if (!trimmed && !formData.dob) return 'Age Required';
                if (!trimmed) return '';
                const ageNum = Number(trimmed);
                if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) return 'Age must be between 0-125';
                return '';
            case 'dob':
                if (!trimmed) return 'DOB Required';
                const date = new Date(trimmed);
                if (date > new Date()) return 'Future dates not allowed';
                if (date < new Date('1900-01-01')) return 'Invalid date (too old)';
                return '';
            case 'allergies':
                if (trimmed.length > 200) return 'Allergies cannot exceed 200 characters';
                return '';
            case 'medicalHistory':
                if (trimmed.length > 400) return 'History cannot exceed 400 characters';
                return '';
            default:
                return '';
        }
    }, [formData.dob]);




    useEffect(() => {
        const initialType = ((searchParams?.get('type') ?? null) ?? null) as 'OPD' | 'IPD' || 'OPD';
        setFormData(prev => ({ ...prev, registrationType: initialType }));

        const loadInit = async () => {
            try {
                const [docsData, bedsData] = await Promise.all([
                    helpdeskService.getDoctors(),
                    ipdService.getBeds({ status: 'Vacant' })
                ]);
                setDoctors(docsData);
                setBeds(bedsData);
                const depts = Array.from(new Set(docsData.map((d: any) => d.specialty).filter(Boolean)));
                setDepartments(depts as string[]);
            } catch {
                toast.error("Failed to load initial data");
            } finally {
                setLoadingInitial(false);
            }
        };
        loadInit();
    }, [searchParams]);

    useEffect(() => {
        if (formData.dob) {
            const birthDate = new Date(formData.dob);
            if (isNaN(birthDate.getTime())) return;
            const today = new Date();
            let age = 0;
            const unit = formData.ageUnit || 'Years';

            if (unit === 'Years') {
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            } else if (unit === 'Months') {
                age = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
                if (today.getDate() < birthDate.getDate()) age--;
            } else if (unit === 'Days') {
                const diffMs = today.getTime() - birthDate.getTime();
                age = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            }

            if (age >= 0 && age.toString() !== formData.age) {
                const newAgeValue = age.toString();
                setFormData(prev => ({ ...prev, age: newAgeValue }));
                if (touched.age) {
                    setErrors(prev => ({ ...prev, age: validateField('age', newAgeValue) }));
                }
            }
        }
    }, [formData.dob, formData.ageUnit, touched.age, validateField, formData.age]);

    useEffect(() => {
        const maleTitles = ['Mr', 'Mr.', 'Master'];
        const femaleTitles = ['Mrs', 'Mrs.', 'Ms', 'Ms.', 'Miss'];

        if (maleTitles.includes(formData.honorific)) {
            setFormData(prev => ({ ...prev, gender: 'male' }));
        } else if (femaleTitles.includes(formData.honorific)) {
            setFormData(prev => ({ ...prev, gender: 'female' }));
        }
        
        if (['Baby of', 'Baby of (B/o)', 'Baby'].includes(formData.honorific)) {
            setFormData(prev => ({ ...prev, ageUnit: 'Months' }));
        }
    }, [formData.honorific]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        let processedValue = value;
        if (name === 'mobile' || name === 'emergencyContact') {
            processedValue = value.replace(/\D/g, '').slice(0, 10);
        } else if (name === 'name') {
            processedValue = value.slice(0, 150);
        } else if (name === 'address') {
            processedValue = value.slice(0, 300);
        } else if (name === 'allergies') {
            processedValue = value.slice(0, 200);
        } else if (name === 'medicalHistory') {
            processedValue = value.slice(0, 400);
        } else if (name === 'patientEmail') {
            processedValue = value.slice(0, 100);
        }

        if (name === 'age' || name === 'ageUnit') {
            const currentAgeUnit = name === 'ageUnit' ? processedValue : formData.ageUnit;
            const currentAgeVal = name === 'age' ? processedValue : formData.age;
            const ageNum = parseInt(currentAgeVal);
            
            if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 150) {
                const date = new Date();
                if (currentAgeUnit === 'Years') date.setFullYear(date.getFullYear() - ageNum);
                else if (currentAgeUnit === 'Months') date.setMonth(date.getMonth() - ageNum);
                else if (currentAgeUnit === 'Days') date.setDate(date.getDate() - ageNum);
                
                const newDob = date.toISOString().split('T')[0];
                setFormData(prev => ({ ...prev, [name]: processedValue, dob: newDob }));
                
                // Logic: updating age directly updates DOB, so sync both errors immediately
                setErrors(prev => {
                    const updated = { ...prev };
                    if (touched.age || name === 'age') updated.age = validateField('age', currentAgeVal);
                    if (touched.dob) updated.dob = validateField('dob', newDob);
                    return updated;
                });
            } else {
                setFormData(prev => ({ ...prev, [name]: processedValue }));
                if (touched.age && name === 'age') {
                    setErrors(prev => ({ ...prev, age: validateField('age', processedValue) }));
                }
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: processedValue }));
            if (touched[name]) {
                const error = validateField(name, processedValue);
                setErrors(prev => ({ ...prev, [name]: error }));
            }
        }

        // Spell-check eligible fields
        if ((SPELL_FIELDS as string[]).includes(name)) {
            triggerSpellCheck(name, processedValue);
        }
    };

    const handleBlur = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, (formData as any)[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: FieldError = {};
        let hasError = false;
        ['name', 'mobile', 'address', 'age', 'dob'].forEach(field => {
            const err = validateField(field, (formData as any)[field]);
            if (err) { newErrors[field] = err; hasError = true; }
        });

        setErrors(newErrors);
        setTouched({ name: true, mobile: true, address: true, age: true, dob: true });

        if (hasError) { toast.error("Please fix form errors"); return; }

        // Removed blocking check for spelling issues. Spelling is now purely suggestive.


        try {
            setSubmitting(true);
            const registrationData = {
                ...formData,
                email: formData.patientEmail || undefined,
                age: parseInt(formData.age),
                name: formData.name.trim(),
                address: formData.address.trim(),
                allergies: formData.allergies ? [formData.allergies] : []
            };

            const res = await helpdeskService.registerPatient(registrationData as any);
            toast.success(`Successfully Registered: ${res.patient.mrn}`);
            setTimeout(() => {
                router.push(`/helpdesk/appointment-booking?patientId=${res.patient.id}&type=${formData.registrationType}`);
            }, 1000);
        } catch (error: any) {
            let errorMsg = error.message || "Failed to register";
            
            // Handle MongoDB Duplicate Key Error (E11000)
            if (errorMsg.includes("E11000")) {
                if (errorMsg.includes("email")) {
                    errorMsg = "This email is already registered with another patient.";
                } else if (errorMsg.includes("mobile")) {
                    errorMsg = "This mobile number is already registered.";
                } else {
                    errorMsg = "A patient with these details already exists.";
                }
            }
            
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Total spell issue count ────────────────────────────────────────────
    const totalSpellIssues = Object.values(spellErrors).reduce((s, a) => s + a.length, 0);
    const anyChecking = Object.values(checking).some(Boolean);

    // ── Helper: spell error count badge for a field ────────────────────────
    const SpellBadge = ({ field }: { field: string }) => {
        const count = (spellErrors[field] || []).length;
        const isChecking = checking[field];
        if (isChecking) return <Loader2 size={10} className="animate-spin text-teal-400 absolute top-2 right-2" />;
        if (count === 0) return null;
        return (
            <span className="absolute top-1.5 right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none z-10">
                {count} spell
            </span>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-12">
            {/* Spell-check popup */}
            <AnimatePresence>
                {popup && (() => {
                    const { match, field } = popup;
                    const suggestions = match.replacements.slice(0, 4);
                    return (
                        <motion.div

                            ref={popupRef}
                            key="spell-popup"
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-2 min-w-[180px] max-w-[240px]"
                            style={{ left: Math.min(popup.x, window.innerWidth - 250), top: popup.y }}
                        >
                            <div className="px-2 py-1 mb-1 border-b border-slate-50">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <SpellCheck size={10} className="text-rose-500" /> Suggestion
                                </p>
                            </div>
                            {suggestions.length > 0 ? (
                                <div className="space-y-0.5">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => applySuggestion(field, match, s.value)}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-between group"
                                        >

                                            {s.value}
                                            <ChevronRight size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-2 text-[10px] text-slate-400 italic">No suggestions</p>
                            )}
                        </motion.div>

                    );
                })()}
            </AnimatePresence>

            {/* CSS for squiggly underline and overlays */}
            <style>{`
                .spell-error {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2.5 Q1.5 0 3 2.5 Q4.5 5 6 2.5' stroke='%23f43f5e' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
                    background-repeat: repeat-x;
                    background-position: bottom;
                    background-size: 6px 3px;
                    cursor: pointer;
                    border-radius: 1px;
                    transition: background-color 0.2s;
                }
                .spell-error:hover { background-color: rgba(244, 63, 94, 0.1); }
                .spell-overlay {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    padding: 8px 12px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    line-height: 1.5;
                    color: transparent;
                    white-space: pre-wrap;
                    word-break: break-word;
                    overflow: hidden;
                    border-radius: 0.75rem;
                    z-index: 5;
                    font-family: inherit;
                    letter-spacing: normal;
                }

                .spell-overlay span.spell-error { pointer-events: auto; color: transparent; }
                
                /* Custom scrollbar-hiding for overlays to match inputs if needed */
                .spell-overlay::-webkit-scrollbar { display: none; }
                
                @keyframes glow {
                    0%, 100% { text-shadow: 0 0 5px rgba(13,148,136,.5), 0 0 10px rgba(13,148,136,.3); opacity: 1; }
                    50%       { text-shadow: 0 0 10px rgba(13,148,136,.8), 0 0 20px rgba(13,148,136,.5); opacity: .8; }
                }
            `}</style>

            {/* HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 border-b border-slate-200 pb-3 max-w-full mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/helpdesk" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Patient Registration</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reception / Patient Admission • Registry Manifest</p>
                    </div>
                </div>

                <div className="hidden md:flex justify-center">
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-widest" style={{ animation: 'glow 2s ease-in-out infinite' }}>
                        ✨ Your data is storing continuously
                    </p>
                </div>

                <div className="hidden md:flex justify-end gap-2 items-center text-slate-400">
                    {/* Spell-check status badge */}
                    {anyChecking ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                            <Loader2 size={12} className="animate-spin text-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-amber-600">Checking spelling…</span>
                        </div>
                    ) : totalSpellIssues > 0 ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                            <SpellCheck size={12} className="text-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-amber-600">{totalSpellIssues} spelling issue{totalSpellIssues > 1 ? 's' : ''}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <SpellCheck size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-600">Spell OK</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Clock size={14} className="text-teal-500" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-3 sm:p-6">
                    <div className="space-y-5">

                        {/* PERSONAL INFORMATION SECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <User size={16} className="text-teal-600" />
                                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Personal Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2">
                                    <FormInput label="Honorific" required component={
                                        <select name="honorific" value={formData.honorific === 'Mr' ? 'Mr.' : (formData.honorific || 'Mr.')} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold transition-all">
                                            {HONORIFIC_OPTIONS.map((h) => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    } />
                                </div>
                                <div className="md:col-span-5">
                                    <FormInput label="Full Name" required error={touched.name ? errors.name : ''} component={
                                        <SpellCheckedInput
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            onBlur={() => handleBlur('name')}
                                            placeholder="Name"
                                            hasError={!!(errors.name && touched.name)}
                                            spellMatches={spellErrors['name'] || []}
                                            isChecking={checking['name']}
                                            onMatchClick={handleMatchClick}
                                            onFixAll={applyAllSuggestions}

                                        />
                                    } />
                                </div>
                                <div className="md:col-span-5">
                                    <FormInput label="Mobile Number" required error={touched.mobile ? errors.mobile : ''} component={
                                        <input name="mobile" value={formData.mobile} onChange={handleChange} onBlur={() => handleBlur('mobile')} placeholder="10-digit number" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.mobile && touched.mobile ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                                <div className="md:col-span-3">
                                    <FormInput label="Date of Birth" required error={touched.dob ? errors.dob : ''} component={
                                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} onBlur={() => handleBlur('dob')} className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.dob && touched.dob ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                                <div className="md:col-span-2">
                                    <FormInput label="Age" required={!formData.dob} error={touched.age ? errors.age : ''} component={
                                        <div className="flex gap-2">
                                            <input name="age" type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={formData.age} onChange={handleChange} onBlur={() => handleBlur('age')} placeholder="Age" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.age && touched.age ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                            <select name="ageUnit" value={formData.ageUnit || 'Years'} onChange={handleChange} className="px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 outline-none text-[10px] font-bold transition-all w-[70px] shrink-0">
                                                <option value="Years">Yrs</option>
                                                <option value="Months">Mos</option>
                                                <option value="Days">Days</option>
                                            </select>
                                        </div>
                                    } />
                                </div>
                                <div className="md:col-span-3">
                                    <FormInput label="Gender" required component={
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all">
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    } />
                                </div>
                                <div className="md:col-span-4">
                                    <FormInput label="Patient Email" error={touched.patientEmail ? errors.patientEmail : ''} component={
                                        <input name="patientEmail" type="email" value={formData.patientEmail} onChange={handleChange} onBlur={() => handleBlur('patientEmail')} placeholder="patient@example.com (optional)" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.patientEmail && touched.patientEmail ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all`} />
                                    } />
                                </div>
                            </div>
                        </section>

                        {/* ADDRESS & CONTACT SECTION */}
                        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8 space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                    <MapPin size={16} className="text-teal-600" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Address Details</h2>
                                </div>
                                <FormInput label="Residential Address" required error={touched.address ? errors.address : ''} component={
                                    <SpellCheckedTextarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('address')}
                                        placeholder="Full address"
                                        maxLength={300}
                                        hasError={!!(errors.address && touched.address)}
                                        spellMatches={spellErrors['address'] || []}
                                        isChecking={checking['address']}
                                        onMatchClick={handleMatchClick}
                                        onFixAll={applyAllSuggestions}
                                    />

                                } />
                            </div>
                            <div className="md:col-span-4 space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                    <Phone size={16} className="text-teal-600" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Emergency Contact</h2>
                                </div>
                                <FormInput label="Emergency Mobile" error={touched.emergencyContact ? errors.emergencyContact : ''} component={
                                    <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} onBlur={() => handleBlur('emergencyContact')} placeholder="10-digit number" className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${errors.emergencyContact && touched.emergencyContact ? 'border-rose-500' : 'border-slate-200'} outline-none text-sm font-bold transition-all`} />
                                } />
                            </div>
                        </section>

                        {/* MEDICAL INFORMATION SECTION */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <Heart size={16} className="text-teal-600" />
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Medical Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-3">
                                    <FormInput label="Blood Group" component={
                                        <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all">
                                            <option value="Unknown">Unknown</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    } />
                                </div>

                                <div className="md:col-span-4">
                                    <FormInput label="Previous Allergies" error={touched.allergies ? errors.allergies : ''} component={
                                        <SpellCheckedInput
                                            name="allergies"
                                            value={formData.allergies}
                                            onChange={handleChange}
                                            onBlur={() => handleBlur('allergies')}
                                            placeholder="Known allergies..."
                                            maxLength={200}
                                            hasError={!!(errors.allergies && touched.allergies)}
                                            spellMatches={spellErrors['allergies'] || []}
                                            isChecking={checking['allergies']}
                                            onMatchClick={handleMatchClick}
                                            onFixAll={applyAllSuggestions}

                                            showCounter
                                        />
                                    } />
                                </div>

                                <div className="md:col-span-5">
                                    <FormInput label="Health Issues / History" error={touched.medicalHistory ? errors.medicalHistory : ''} component={
                                        <SpellCheckedTextarea
                                            name="medicalHistory"
                                            value={formData.medicalHistory}
                                            onChange={handleChange}
                                            onBlur={() => handleBlur('medicalHistory')}
                                            placeholder="Conditions..."
                                            maxLength={400}
                                            hasError={!!(errors.medicalHistory && touched.medicalHistory)}
                                            spellMatches={spellErrors['medicalHistory'] || []}
                                            isChecking={checking['medicalHistory']}
                                            onMatchClick={handleMatchClick}
                                            onFixAll={applyAllSuggestions}

                                        />
                                    } />
                                </div>
                            </div>
                        </section>


                        {/* SUBMIT BUTTON */}
                        <div className="pt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => router.back()} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || Object.values(errors).some(e => !!e)}
                                className="px-10 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                                    <>
                                        {formData.registrationType === 'IPD' ? 'Complete Admission' : 'Complete Registration'}
                                        <ChevronRight size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────
const getFullCorrection = (text: string, matches: SpellMatch[]) => {
    if (!matches || !matches.length) return null;
    let result = text;
    // Apply in reverse order to maintain offsets
    const sorted = [...matches].sort((a, b) => b.offset - a.offset);
    let changed = false;
    sorted.forEach(m => {
        if (m.replacements && m.replacements.length > 0) {
            const firstSuggestion = m.replacements[0].value;
            result = result.slice(0, m.offset) + firstSuggestion + result.slice(m.offset + m.length);
            changed = true;
        }
    });
    return changed ? result : null;
};

// ── SpellCheckedInput ──────────────────────────────────────────────────────
interface SpellInputProps {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    placeholder?: string;
    maxLength?: number;
    hasError: boolean;
    spellMatches: SpellMatch[];
    isChecking?: boolean;
    onMatchClick: (field: string, match: SpellMatch, e: React.MouseEvent) => void;
    onFixAll: (field: string, corrected: string) => void;
    showCounter?: boolean;
}

function SpellCheckedInput({ name, value, onChange, onBlur, placeholder, maxLength, hasError, spellMatches, isChecking, onMatchClick, onFixAll, showCounter }: SpellInputProps) {
    const borderClass = hasError ? 'border-rose-500' : spellMatches.length ? 'border-amber-300' : 'border-slate-200';
    const correction = getFullCorrection(value, spellMatches);

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <AnimatePresence mode="wait">
                {correction && (
                    <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-2 px-1 py-0.5"
                    >
                        <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded leading-none">Did you mean:</p>
                        <button 
                            type="button" 
                            onClick={() => onFixAll(name, correction)}
                            className="text-[11px] font-bold text-teal-600 hover:text-teal-700 underline decoration-teal-300 decoration-2 underline-offset-4 transition-all text-left"
                        >
                            {correction}
                        </button>
                        {isChecking && <Loader2 size={10} className="animate-spin text-teal-300 ml-auto" />}
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="relative group">
                <div className="spell-overlay" style={{ whiteSpace: 'nowrap' }}>
                    <HighlightedText text={value} matches={spellMatches} onMatchClick={onMatchClick} fieldName={name} />
                </div>
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${borderClass} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold transition-all relative z-[1]`}
                    autoComplete="off"
                    spellCheck={false}
                />
                {!isChecking && spellMatches.length > 0 && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 z-10">
                        <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{spellMatches.length}✦</span>
                    </div>
                )}
                {showCounter && maxLength && (
                    <div className="absolute bottom-2 right-8 text-[9px] font-bold text-slate-300 pointer-events-none uppercase z-10">
                        {value.length}/{maxLength}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── SpellCheckedTextarea ───────────────────────────────────────────────────
interface SpellTextareaProps {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onBlur: () => void;
    placeholder?: string;
    maxLength?: number;
    hasError: boolean;
    spellMatches: SpellMatch[];
    isChecking?: boolean;
    onMatchClick: (field: string, match: SpellMatch, e: React.MouseEvent) => void;
    onFixAll: (field: string, corrected: string) => void;
}

function SpellCheckedTextarea({ name, value, onChange, onBlur, placeholder, maxLength, hasError, spellMatches, isChecking, onMatchClick, onFixAll }: SpellTextareaProps) {
    const borderClass = hasError ? 'border-rose-500' : spellMatches.length ? 'border-amber-300' : 'border-slate-200';
    const correction = getFullCorrection(value, spellMatches);
    const overlayRef = useRef<HTMLDivElement>(null);
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (overlayRef.current) overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
    };

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <AnimatePresence mode="wait">
                {correction && (
                    <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-2 px-1 py-0.5"
                    >
                        <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded leading-none">Did you mean:</p>
                        <button 
                            type="button" 
                            onClick={() => onFixAll(name, correction)}
                            className="text-[11px] font-bold text-teal-600 hover:text-teal-700 underline decoration-teal-300 decoration-2 underline-offset-4 transition-all text-left"
                        >
                            {correction}
                        </button>
                        {isChecking && <Loader2 size={10} className="animate-spin text-teal-300 ml-auto" />}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative group">
                <div ref={overlayRef} className="spell-overlay">
                    <HighlightedText text={value} matches={spellMatches} onMatchClick={onMatchClick} fieldName={name} />
                </div>
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onScroll={handleScroll}
                    rows={2}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 border ${borderClass} focus:border-teal-500 focus:bg-white outline-none text-sm font-bold resize-none transition-all relative z-[1]`}
                    spellCheck={false}
                    autoComplete="off"
                />
                <div className="absolute bottom-2 right-3 text-[9px] font-bold text-slate-400 pointer-events-none uppercase flex items-center gap-1.5 z-10">
                    {isChecking && <Loader2 size={9} className="animate-spin text-teal-400" />}
                    {!isChecking && spellMatches.length > 0 && (
                        <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{spellMatches.length}✦</span>
                    )}
                    {maxLength && <span>{value.length}/{maxLength}</span>}
                </div>
            </div>
        </div>
    );
}

// ── FormInput ──────────────────────────────────────────────────────────────
function FormInput({ label, required, component, error }: any) {
    return (
        <div className="space-y-1.5 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">{component}</div>
            {error && <p className="text-[10px] font-bold text-rose-500 uppercase mt-1 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
        </div>
    );
}