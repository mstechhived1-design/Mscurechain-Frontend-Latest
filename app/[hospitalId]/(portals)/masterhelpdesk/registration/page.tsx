'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    ChevronRight,
    ArrowLeft,
    User,
    Phone,
    MapPin,
    Heart,
    Clock,
} from "lucide-react";
import { helpdeskService, ipdService, spellCheckService, masterHelpdeskService } from "@/lib/integrations";
import masterDoctorLeaveService from "@/lib/integrations/masterDoctorLeaveService";
import type { HelpdeskDoctor, Bed, SpellMatch, SpellState, SpellPopupState } from "@/lib/integrations/types";
import toast from "react-hot-toast";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";

interface FieldError {
    [key: string]: string;
}

// Spell-check eligible text fields (types imported from @/lib/integrations)
const SPELL_FIELDS: (keyof typeof INITIAL_FORM)[] = ["name", "address", "allergies", "medicalHistory"];

const INITIAL_FORM = {
    honorific: 'Mr',
    name: '',
    age: '',
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
    if (!matches.length || !text) return <>{text}</>;

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
export default function MasterPatientRegistration() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const params = useParams() as any;
    const hospitalId = params.hospitalId as string;
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldError>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [loadingInitial, setLoadingInitial] = useState(true);

    // ── Spell-check state ───────────────────────────────────────────────────
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

    // Debounced spell check
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

    const applySuggestion = useCallback((field: string, match: SpellMatch, suggestion: string) => {
        if (!match) return;
        const currentValue = (formData as any)[field] as string;
        const newValue = spellCheckService.applyCorrection(currentValue, match, suggestion);
        setFormData(prev => ({ ...prev, [field]: newValue }));
        setPopup(null);
        triggerSpellCheck(field, newValue);
    }, [formData, triggerSpellCheck]);

    const applyAllSuggestions = useCallback((field: string, correctedText: string) => {
        setFormData(prev => ({ ...prev, [field]: correctedText }));
        setPopup(null);
        setTimeout(() => triggerSpellCheck(field, correctedText), 100);
    }, [triggerSpellCheck]);

    const handleMatchClick = useCallback((field: string, match: SpellMatch, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
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
                if (!/^[a-zA-Z\s.]+$/.test(trimmed)) return 'Only letters and dots allowed';
                return '';
            case 'mobile':
                if (!trimmed) return 'Mobile Number Required';
                if (!/^[6-9][0-9]{9}$/.test(trimmed.replace(/\D/g, ''))) return 'Invalid 10-digit number';
                return '';
            case 'patientEmail':
                if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email format';
                return '';
            case 'address':
                if (!trimmed) return 'Residential Address Required';
                if (trimmed.length < 5) return 'Full address required';
                return '';
            case 'age':
                if (!trimmed && !formData.dob) return 'Age Required';
                if (!trimmed) return '';
                const ageNum = Number(trimmed);
                if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) return 'Age must be 0-125';
                return '';
            case 'dob':
                if (!trimmed) return 'DOB Required';
                if (new Date(trimmed) > new Date()) return 'Future dates not allowed';
                return '';
            default:
                return '';
        }
    }, [formData.dob]);

    useEffect(() => {
        const init = async () => {
            try {
                const initialType = ((searchParams?.get('type') ?? null) ?? null) as 'OPD' | 'IPD' || 'OPD';
                setFormData(prev => ({ ...prev, registrationType: initialType }));
            } catch (err) {
                console.error("Error initializing registration", err);
            } finally {
                setLoadingInitial(false);
            }
        };
        init();
    }, [searchParams, hospitalId]);

    useEffect(() => {
        if (formData.dob) {
            const birthDate = new Date(formData.dob);
            if (isNaN(birthDate.getTime())) return;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            if (age >= 0 && age.toString() !== formData.age) {
                setFormData(prev => ({ ...prev, age: age.toString() }));
            }
        }
    }, [formData.dob]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (name === 'mobile' || name === 'emergencyContact') {
            processedValue = value.replace(/\D/g, '').slice(0, 10);
        }

        if (name === 'age') {
            const ageNum = parseInt(processedValue);
            if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 125) {
                const birthYear = new Date().getFullYear() - ageNum;
                const newDob = `${birthYear}-01-01`;
                setFormData(prev => ({ ...prev, age: processedValue, dob: newDob }));
            } else {
                setFormData(prev => ({ ...prev, age: processedValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }

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
        if (hasError) { toast.error("Please fix form errors"); return; }

        try {
            setSubmitting(true);
            const res = await masterHelpdeskService.registerPatient({
                ...formData,
                hospitalId: hospitalId, // Explicitly pass hospital context from URL
                email: formData.patientEmail || undefined,
                age: parseInt(formData.age),
                allergies: formData.allergies ? [formData.allergies] : []
            } as any);
            console.log("DEBUG: MASTER PORTAL PATIENT REGISTRATION SUCCESS - PATIENT DETAILS", res.patient);
            toast.success(`Successfully Registered: ${res.patient.mrn}`);
            setTimeout(() => {
                router.push(`/${hospitalId}/masterhelpdesk/appointment-booking?patientId=${res.patient.id}&type=${formData.registrationType}`);
            }, 1000);
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    const totalSpellIssues = Object.values(spellErrors).reduce((s, a) => s + a.length, 0);
    const anyChecking = Object.values(checking).some(Boolean);

    if (loadingInitial) return null;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-12">
            <style>{`
                .spell-error { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2.5 Q1.5 0 3 2.5 Q4.5 5 6 2.5' stroke='%23f43f5e' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"); background-repeat: repeat-x; background-position: bottom; background-size: 6px 3px; cursor: pointer; border-radius: 1px; transition: background-color 0.2s; }
                .spell-error:hover { background-color: rgba(244, 63, 94, 0.1); }
                .spell-overlay { position: absolute; inset: 0; pointer-events: none; padding: 8px 12px; font-size: 0.875rem; font-weight: 700; line-height: 1.5; color: transparent; white-space: pre-wrap; word-break: break-word; overflow: hidden; border-radius: 0.75rem; z-index: 5; font-family: inherit; letter-spacing: normal; }
                .spell-overlay span.spell-error { pointer-events: auto; color: transparent; }
                @keyframes glow { 0%, 100% { text-shadow: 0 0 5px rgba(13,148,136,.5), 0 0 10px rgba(13,148,136,.3); opacity: 1; } 50% { text-shadow: 0 0 10px rgba(13,148,136,.8), 0 0 20px rgba(13,148,136,.5); opacity: .8; } }
            `}</style>

            <AnimatePresence>
                {popup && (
                    <motion.div ref={popupRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl p-2 min-w-[180px]" style={{ left: popup.x, top: popup.y }}>
                        {popup.match.replacements.slice(0, 4).map((s, i) => (
                            <button key={i} type="button" onClick={() => applySuggestion(popup.field, popup.match, s.value)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-between group">
                                {s.value} <ChevronRight size={10} className="text-slate-300" />
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">Patient Registration <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">Master Portal</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reception / Patient Admission • Registry Manifest</p>
                    </div>
                </div>
                <div className="hidden md:flex gap-4 items-center">
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-widest" style={{ animation: 'glow 2s ease-in-out infinite' }}>
                        ✨ Institutional Data Guard Active
                    </p>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Clock size={14} className="text-teal-500" />
                        <span className="text-[10px] font-bold text-slate-500">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8 space-y-8">
                {/* PERSONAL INFORMATION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <User size={16} className="text-teal-600" />
                        <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Personal Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-2">
                            <FormInput label="Honorific" required component={
                                <select name="honorific" value={formData.honorific} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold">
                                    <option value="Mr">Mr.</option><option value="Mrs">Mrs.</option><option value="Ms">Ms.</option><option value="Dr">Dr.</option>
                                </select>
                            } />
                        </div>
                        <div className="md:col-span-5">
                            <FormInput label="Full Name" required error={touched.name ? errors.name : ''} component={
                                <SpellCheckedInput name="name" value={formData.name} onChange={handleChange} onBlur={() => handleBlur('name')} spellMatches={spellErrors['name'] || []} onMatchClick={handleMatchClick} />
                            } />
                        </div>
                        <div className="md:col-span-5">
                            <FormInput label="Mobile Number" required error={touched.mobile ? errors.mobile : ''} component={
                                <input name="mobile" value={formData.mobile} onChange={handleChange} onBlur={() => handleBlur('mobile')} placeholder="10-digit number" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                            } />
                        </div>
                        <div className="md:col-span-3">
                            <FormInput label="Date of Birth" required error={touched.dob ? errors.dob : ''} component={
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} onBlur={() => handleBlur('dob')} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                            } />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput label="Age" required component={
                                <input name="age" type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={formData.age} onChange={handleChange} placeholder="Age" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                            } />
                        </div>
                        <div className="md:col-span-3">
                            <FormInput label="Gender" required component={
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold">
                                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                                </select>
                            } />
                        </div>
                        <div className="md:col-span-4">
                            <FormInput label="Patient Email" component={
                                <input name="patientEmail" type="email" value={formData.patientEmail} onChange={handleChange} placeholder="Optional" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                            } />
                        </div>
                    </div>
                </section>

                {/* ADDRESS & EMERGENCY */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <section className="lg:col-span-8 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <MapPin size={16} className="text-teal-600" />
                            <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Address Details</h2>
                        </div>
                        <FormInput label="Residential Address" required error={touched.address ? errors.address : ''} component={
                            <SpellCheckedTextarea name="address" value={formData.address} onChange={handleChange} onBlur={() => handleBlur('address')} spellMatches={spellErrors['address'] || []} onMatchClick={handleMatchClick} />
                        } />
                    </section>
                    <section className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <Phone size={16} className="text-teal-600" />
                            <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Emergency Contact</h2>
                        </div>
                        <FormInput label="Alternative Number" component={
                            <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="Relative number" className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                        } />
                    </section>
                </div>

                {/* MEDICAL INFORMATION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Heart size={16} className="text-teal-600" />
                        <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Medical Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3">
                            <FormInput label="Blood Group" component={
                                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold">
                                    <option value="Unknown">Unknown</option>
                                    <option value="O+">O+</option><option value="O-">O-</option>
                                    <option value="A+">A+</option><option value="A-">A-</option>
                                    <option value="B+">B+</option><option value="B-">B-</option>
                                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                </select>
                            } />
                        </div>
                        <div className="md:col-span-4">
                            <FormInput label="Previous Allergies" component={
                                <SpellCheckedInput name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Known allergies" spellMatches={spellErrors['allergies'] || []} onMatchClick={handleMatchClick} />
                            } />
                        </div>
                        <div className="md:col-span-5">
                            <FormInput label="Health History" component={
                                <SpellCheckedTextarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="Chronic conditions or prior surgeries" spellMatches={spellErrors['medicalHistory'] || []} onMatchClick={handleMatchClick} />
                            } />
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => router.back()} className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 shadow-sm">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-10 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black shadow-xl flex items-center gap-2">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Complete Registration <ChevronRight size={14} /></>}
                    </button>
                </div>
            </form>
        </div>
    );
}

function FormInput({ label, required, component, error }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>
            <div className="relative">{component}</div>
            {error && <p className="text-[8px] font-bold text-rose-500 uppercase ml-1 mt-1">{error}</p>}
        </div>
    );
}

function SpellCheckedInput({ name, value, onChange, onBlur, spellMatches, onMatchClick }: any) {
    return (
        <div className="relative">
            <div className="spell-overlay" style={{ whiteSpace: 'nowrap' }}><HighlightedText text={value} matches={spellMatches} onMatchClick={onMatchClick} fieldName={name} /></div>
            <input name={name} value={value} onChange={onChange} onBlur={onBlur} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold relative z-[1]" autoComplete="off" spellCheck={false} />
        </div>
    );
}

function SpellCheckedTextarea({ name, value, onChange, onBlur, spellMatches, onMatchClick }: any) {
    return (
        <div className="relative">
            <div className="spell-overlay"><HighlightedText text={value} matches={spellMatches} onMatchClick={onMatchClick} fieldName={name} /></div>
            <textarea name={name} value={value} onChange={onChange} onBlur={onBlur} rows={3} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold resize-none relative z-[1]" spellCheck={false} />
        </div>
    );
}
