"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
    UserPlus, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2,
    User, Mail, MapPin, Briefcase, Clock, FileText, Landmark,
    Award, Globe, CreditCard, Plus, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { TagInput } from "@/components/common/TagInput";
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from "@/lib/constants/medicalData";
import { InfrastructureCheck } from "../../../../hospital-admin/components/InfrastructureCheck";
import { formatDoctorName, cleanDoctorName } from "@/lib/utils/name-utils";

// ─── Color-only palette: blue, green, yellow, white ───────────────────────────
const cls = {
    card: "bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden",
    cardHeader: "px-6 py-4 border-b border-blue-50 flex items-center gap-3",
    cardBody: "p-6",
    input: (err: boolean, ok: boolean) =>
        `w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 bg-white
    ${err ? "border-red-300 focus:ring-red-200 bg-red-50/30" :
            ok ? "border-green-400 focus:ring-green-200" :
                "border-blue-100 focus:ring-blue-200 focus:border-blue-400"}`,
    label: "block text-xs font-semibold text-blue-900 mb-1.5",
    errMsg: "flex items-center gap-1 text-[11px] font-semibold text-red-500 mt-1",
    okMsg: "flex items-center gap-1 text-[11px] font-semibold text-green-600 mt-1",
    hintMsg: "text-[10px] text-blue-400 mt-0.5 ml-0.5",
    sectionIcon: "w-8 h-8 rounded-lg flex items-center justify-center",
    tag: (color: "blue" | "green" | "yellow") =>
        `inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold
    ${color === "blue" ? "bg-blue-50 text-blue-700 border border-blue-100" :
            color === "green" ? "bg-green-50 text-green-700 border border-green-100" :
                "bg-yellow-50 text-yellow-700 border border-yellow-100"}`,
    btn: {
        primary: "flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50",
        secondary: "flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50",
        add: "flex items-center gap-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-95 transition-all",
        day: (active: boolean) => `px-3 py-2 rounded-lg text-xs font-bold transition-all border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-400 border-blue-100 hover:border-blue-400"}`,
    },
};

// ─── Validation rules ──────────────────────────────────────────────────────────
const RULES = {
    name: (v: string) => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.''-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : v.length > 100 ? "Max 100 characters" : "",
    email: (v: string) => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email address" : v.length > 150 ? "Max 150 characters" : "",
    mobile: (v: string) => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits required` : "",
    password: (v: string) => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 min` : v.length > 64 ? "Max 64 characters" : "",
    medRegNo: (v: string) => !v.trim() ? "Medical Registration Number is required" : v.length > 50 ? "Max 50 characters" : "",
    consultationFee: (v: string) => !v ? "Consultation fee is required" : parseInt(v) <= 0 ? "Must be greater than 0" : "",
    experienceStart: (v: string) => !v ? "Experience start date is required" : "",
    employeeId: (v: string) => !v.trim() ? "Employee ID is required" : "",
    pincode: (v: string) => v && (!/^\d+$/.test(v) || v.length !== 6) ? `${v.length}/6 digits required` : "",
    specialties: (v: string[]) => v.length === 0 ? "At least one specialty required" : "",
    panNumber: (v: string) => v && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Format: ABCDE1234F" : "",
    aadharNumber: (v: string) => v && (!/^\d+$/.test(v) || v.length !== 12) ? `${v.length}/12 digits required` : "",
    accountNumber: (v: string) => v && (!/^\d+$/.test(v) || v.length < 9 || v.length > 18) ? "Must be 9–18 digits" : "",
    ifscCode: (v: string) => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? "Format: HDFC0001234" : "",
    registrationYear: (v: string) => v && (!/^\d+$/.test(v) || parseInt(v) < 1950 || parseInt(v) > new Date().getFullYear()) ? "Enter valid year" : "",
};

const DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Surgery", "Internal Medicine", "Emergency", "ICU", "Radiology", "Pathology", "Anesthesiology"];
const DESIGNATIONS = ["Consultant", "Senior Consultant", "Surgeon", "Resident", "Fellow", "Professor", "Other"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── Field component ──────────────────────────────────────────────────────────
function F({
    label, name, value, onChange, error, type = "text", placeholder, required, maxLength, hint, readOnly, extraClass = "",
}: {
    label: string; name: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string; type?: string; placeholder?: string; required?: boolean;
    maxLength?: number; hint?: string; readOnly?: boolean; extraClass?: string;
}) {
    const hasErr = !!error && value !== "";
    const isOk = !error && value.trim() !== "";
    return (
        <div className="space-y-0.5">
            <label className={cls.label}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <div className="relative">
                <input
                    type={type} name={name} value={value} onChange={onChange}
                    placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
                    className={`${cls.input(hasErr, isOk)} pr-8 ${extraClass}`}
                />
                {isOk && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />}
                {hasErr && <AlertCircle size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" />}
            </div>
            {hasErr && <p className={cls.errMsg}><AlertCircle size={11} />{error}</p>}
            {!hasErr && hint && <p className={cls.hintMsg}>{hint}</p>}
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, color = "blue", extra }: { icon: React.ReactNode; title: string; color?: "blue" | "green" | "yellow"; extra?: React.ReactNode }) {
    const bg = color === "blue" ? "bg-blue-50" : color === "green" ? "bg-green-50" : "bg-yellow-50";
    const text = color === "blue" ? "text-blue-700" : color === "green" ? "text-green-700" : "text-yellow-700";
    const border = color === "blue" ? "border-b border-blue-50" : color === "green" ? "border-b border-green-50" : "border-b border-yellow-100";
    return (
        <div className={`px-6 py-4 ${border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <div className={`${cls.sectionIcon} ${bg} ${text}`}>{icon}</div>
                <h3 className={`font-bold text-sm ${text}`}>{title}</h3>
            </div>
            {extra}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface AvailSlot { days: string[]; startTime: string; breakStart: string; breakEnd: string; endTime: string; }

const formatAMPM = (time: string) => {
    if (!time) return "";
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) return time;
    const [hours, minutes] = time.split(':');
    let h = parseInt(hours);
    const m = minutes || "00";
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
};

export default function HRCreateDoctorPage() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;
    const qc = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    
    const { data: metadata } = useQuery({
        queryKey: ["hospital-metadata"],
        queryFn: () => hospitalAdminService.getHospitalMetadata()
    });

    // Form fields
    const [f, setF] = useState({
        honorific: "Mr",
        name: "", email: "", mobile: "", password: "", gender: "", dob: "",
        street: "", city: "", state: "", pincode: "",
        medRegNo: "", regCouncil: "National Medical Commission (NMC)", regYear: "", regExpiry: "",
        experienceStart: "", employeeId: "",
        consultationFee: "", consultationDuration: "15", maxAppt: "20",
        bio: "",
        accountName: "", bankName: "", accountNumber: "", ifscCode: "",
        baseSalary: "", panNumber: "", aadharNumber: "", pfNumber: "", esiNumber: "", uanNumber: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [qualifications, setQualifications] = useState<string[]>([]);
    const [languages, setLanguages] = useState<string[]>([]);
    const [awards, setAwards] = useState<string[]>([]);
    const [availability, setAvailability] = useState<AvailSlot[]>([{ days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }]);
    const [tempAward, setTempAward] = useState("");

    // ── Real-time validation
    const validateField = useCallback((name: string, value: string): string => {
        const rule = RULES[name as keyof typeof RULES];
        if (!rule || typeof rule !== "function") return "";
        return (rule as (v: string) => string)(value);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Restrict input
        if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
        if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
        if (name === "aadharNumber" && !/^\d{0,12}$/.test(value)) return;
        if (name === "accountNumber" && !/^\d{0,18}$/.test(value)) return;
        if (name === "regYear" && !/^\d{0,4}$/.test(value)) return;
        if (name === "panNumber" && value.length > 10) return;
        if (name === "ifscCode" && value.length > 11) return;
        if (["consultationFee", "maxAppt", "consultationDuration", "baseSalary"].includes(name) && !/^\d*$/.test(value)) return;

        const upper = ["panNumber", "ifscCode"].includes(name) ? value.toUpperCase() : value;

        if (name === "honorific") {
            let gender = f.gender;
            if (value === "Mr") gender = "male";
            else if (value === "Mrs" || value === "Ms") gender = "female";
            setF(p => ({ ...p, [name]: value, gender }));
            // Validate immediately
            const err = validateField(name, value);
            setErrors(p => ({ ...p, [name]: err }));
            return;
        }

        setF(p => ({ ...p, [name]: upper }));
        // Validate immediately
        const err = validateField(name === "regYear" ? "registrationYear" : name, upper);
        setErrors(p => ({ ...p, [name]: err }));
    };

    const touchAll = () => {
        const checks: Record<string, string> = {
            name: RULES.name(f.name),
            email: RULES.email(f.email),
            mobile: RULES.mobile(f.mobile),
            password: RULES.password(f.password),
            medRegNo: RULES.medRegNo(f.medRegNo),
            consultationFee: RULES.consultationFee(f.consultationFee),
            experienceStart: RULES.experienceStart(f.experienceStart),
            pincode: RULES.pincode(f.pincode),
            panNumber: RULES.panNumber(f.panNumber),
            aadharNumber: RULES.aadharNumber(f.aadharNumber),
            accountNumber: RULES.accountNumber(f.accountNumber),
            ifscCode: RULES.ifscCode(f.ifscCode),
            employeeId: RULES.employeeId(f.employeeId),
        };
        if (!f.gender) checks.gender = "Please select gender";
        if (specialties.length === 0) checks.specialties = "At least one specialty required";
        setErrors(p => ({ ...p, ...checks }));
        return Object.values(checks).every(e => !e);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!touchAll()) { toast.error("Please fix errors before submitting"); return; }
        setLoading(true);
        try {
            const sanitizedName = cleanDoctorName(f.name);
            await hospitalAdminService.createDoctor({
                honorific: f.honorific,
                name: sanitizedName, email: f.email.trim(), mobile: f.mobile,
                password: f.password, gender: f.gender, dateOfBirth: f.dob || undefined,
                address: f.street || f.city ? { street: f.street, city: f.city, state: f.state, pincode: f.pincode, country: "India" } : undefined,
                specialties, qualifications,
                medicalRegistrationNumber: f.medRegNo.trim(),
                registrationCouncil: f.regCouncil,
                registrationYear: f.regYear ? parseInt(f.regYear) : undefined,
                registrationExpiryDate: f.regExpiry || undefined,
                experienceStart: f.experienceStart,
                employeeId: f.employeeId || undefined,
                consultationFee: parseInt(f.consultationFee),
                consultationDuration: parseInt(f.consultationDuration) || 15,
                maxAppointmentsPerDay: f.maxAppt ? parseInt(f.maxAppt) : undefined,
                availability: availability.filter(s => s.days.length > 0),
                bio: f.bio, languages, awards,
                bankDetails: { bankName: f.bankName, accountNumber: f.accountNumber, accountName: f.accountName, ifscCode: f.ifscCode },
                panNumber: f.panNumber, aadharNumber: f.aadharNumber,
                baseSalary: f.baseSalary ? Number(f.baseSalary) : undefined,
                pfNumber: f.pfNumber, esiNumber: f.esiNumber, uanNumber: f.uanNumber,
            } as any);
            toast.success(`Dr. ${f.name} created successfully!`);
            qc.invalidateQueries({ queryKey: ["hr-doctors"] });
            router.push(`/${hospitalId}/hr/hospital/doctors`);
        } catch (err: any) {
            toast.error(err.message || "Failed to create doctor");
        } finally { setLoading(false); }
    };

    const addTag = (list: string[], set: (v: string[]) => void, val: string, reset: () => void) => {
        if (val.trim() && !list.includes(val.trim())) { set([...list, val.trim()]); reset(); }
    };
    const removeTag = (list: string[], set: (v: string[]) => void, val: string) =>
        set(list.filter(i => i !== val));

    const toggleDay = (si: number, day: string) => {
        const u = [...availability];
        u[si].days = u[si].days.includes(day) ? u[si].days.filter(d => d !== day) : [...u[si].days, day];
        setAvailability(u);
    };

    const E = (name: string) => errors[name] ? <p className={cls.errMsg}><AlertCircle size={11} />{errors[name]}</p> : null;

    return (
        <InfrastructureCheck>
            <div className="min-h-screen bg-gradient-to-br from-blue-50/60 via-white to-green-50/40 pb-10">
                {/* TOP BAR */}
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-blue-100 px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">HR Portal · Doctors</p>
                            <h1 className="text-sm md:text-base font-black text-blue-900">Onboard New Physician</h1>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)}
                            disabled={loading} className={`${cls.btn.secondary} text-[10px] md:text-sm px-8 py-2 md:px-12 md:py-4`}>Cancel</button>
                        <button type="submit" form="doctor-form" disabled={loading} className={`${cls.btn.primary} text-[10px] md:text-sm px-8 py-2 md:px-12 md:py-4`}>
                            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={16} />Create Doctor</>}
                        </button>
                    </div>
                </div>

                <form id="doctor-form" onSubmit={handleSubmit} noValidate className="max-w-7xl mx-auto px-6 pt-8 space-y-6">

                    {/* ① Personal Information */}
                    <div className={cls.card}>
                        <SectionHeader icon={<User size={16} />} title="Personal Information" color="blue" />
                        <div className={cls.cardBody}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className={cls.label}>Honorific <span className="text-red-500">*</span></label>
                                    <select name="honorific" value={f.honorific} onChange={handleChange}
                                        className={cls.input(!!errors.honorific, !!f.honorific)}>
                                        <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                                    </select>
                                </div>
                                <F label="Full Name" name="name" value={f.name} onChange={handleChange} error={errors.name} required placeholder="Dr. John Smith" maxLength={100} hint="Max 100 characters" />
                                <div>
                                    <label className={cls.label}>Gender <span className="text-red-500">*</span></label>
                                    <select name="gender" value={f.gender} onChange={handleChange}
                                        className={cls.input(!!errors.gender, !!f.gender)}>
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                                    </select>
                                    {E("gender")}
                                </div>
                                <div>
                                    <label className={cls.label}>Date of Birth</label>
                                    <input type="date" name="dob" value={f.dob} onChange={handleChange} max={new Date().toISOString().split("T")[0]}
                                        className={cls.input(false, !!f.dob)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ② Contact Information */}
                    <div className={cls.card}>
                        <SectionHeader icon={<Mail size={16} />} title="Contact Information" color="blue" />
                        <div className={cls.cardBody}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                <F label="Email Address" name="email" value={f.email} onChange={handleChange} error={errors.email} required type="email" placeholder="doctor@hospital.com" maxLength={150} />
                                <F label="Mobile Number" name="mobile" value={f.mobile} onChange={handleChange} error={errors.mobile} required type="tel" placeholder="10-digit number" maxLength={10} hint={`${f.mobile.length}/10 digits`} />
                                <div>
                                    <label className={cls.label}>Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input type={showPwd ? "text" : "password"} name="password" value={f.password} onChange={handleChange}
                                            placeholder="Min 6 characters" maxLength={64}
                                            className={`${cls.input(!!errors.password && f.password !== "", !errors.password && f.password !== "")} pr-10`} />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-700">
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {errors.password && f.password && <p className={cls.errMsg}><AlertCircle size={11} />{errors.password}</p>}
                                    {!errors.password && f.password && <p className={cls.okMsg}><CheckCircle2 size={11} />Password looks good</p>}
                                </div>
                            </div>

                            {/* Address */}
                            <div className="pt-4 border-t border-blue-50">
                                <p className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-3"><MapPin size={13} />Address (Optional)</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <F label="Street" name="street" value={f.street} onChange={handleChange} placeholder="Street" maxLength={100} />
                                    <F label="City" name="city" value={f.city} onChange={handleChange} placeholder="City" maxLength={60} />
                                    <F label="State" name="state" value={f.state} onChange={handleChange} placeholder="State" maxLength={60} />
                                    <F label="Pincode" name="pincode" value={f.pincode} onChange={handleChange} error={errors.pincode} placeholder="6-digit" maxLength={6} hint={`${f.pincode.length}/6`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ③ Professional & Clinical */}
                    <div className={cls.card}>
                        <SectionHeader icon={<Briefcase size={16} />} title="Professional & Clinical Details" color="green" />
                        <div className={cls.cardBody}>
                            {/* Medical Registration — yellow highlight */}
                            <div className="mb-5 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                                <p className="flex items-center gap-2 text-xs font-black text-yellow-800 uppercase tracking-wider mb-3"><CreditCard size={14} />Medical Registration (Mandatory in India)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <F label="NMC Registration No." name="medRegNo" value={f.medRegNo} onChange={handleChange} error={errors.medRegNo} required placeholder="NMC/State Council No." maxLength={50} />
                                    <F label="Registration Council" name="regCouncil" value={f.regCouncil} onChange={handleChange} placeholder="Council name" maxLength={100} />
                                    <F label="Registration Year" name="regYear" value={f.regYear} onChange={handleChange} error={errors.regYear} placeholder="YYYY" maxLength={4} hint="4-digit year" />
                                    <div>
                                        <label className={cls.label}>Expiry Date</label>
                                        <input type="date" name="regExpiry" value={f.regExpiry} onChange={handleChange}
                                            className={cls.input(false, !!f.regExpiry)} />
                                    </div>
                                </div>
                            </div>

                            {/* Specialties */}
                            <div className="mb-5">
                                <TagInput
                                    label="Medical Specialties"
                                    placeholder="Search & select specialties..."
                                    options={COMMON_SPECIALTIES}
                                    selectedItems={specialties}
                                    onAdd={(val) => setSpecialties([...specialties, val])}
                                    onRemove={(val) => setSpecialties(specialties.filter(i => i !== val))}
                                    accentColor="blue"
                                />
                                {E("specialties")}
                            </div>

                            {/* Qualifications */}
                            <div className="mb-5">
                                <TagInput
                                    label="Medical Qualifications"
                                    placeholder="Search & select qualifications..."
                                    options={COMMON_QUALIFICATIONS}
                                    selectedItems={qualifications}
                                    onAdd={(val) => setQualifications([...qualifications, val])}
                                    onRemove={(val) => setQualifications(qualifications.filter(i => i !== val))}
                                    accentColor="green"
                                    icon={<Award size={20} className="mb-2 opacity-20" />}
                                />
                            </div>

                            {/* Dept / Designation / Experience */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className={cls.label}>Experience Start <span className="text-red-500">*</span></label>
                                    <input type="date" name="experienceStart" value={f.experienceStart} onChange={handleChange} max={new Date().toISOString().split("T")[0]}
                                        className={cls.input(!!errors.experienceStart, !!f.experienceStart)} />
                                    {E("experienceStart")}
                                </div>
                                <F label="Employee ID" name="employeeId" value={f.employeeId} onChange={handleChange} error={errors.employeeId} required placeholder="HSP-DOC-XXXX" maxLength={30} />
                            </div>
                        </div>
                    </div>

                    {/* ④ Scheduling & Availability */}
                    <div className={cls.card}>
                        <SectionHeader icon={<Clock size={16} />} title="Scheduling & Availability" color="blue" />
                        <div className={cls.cardBody}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div>
                                    <label className={cls.label}>Consultation Fee (₹) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm font-bold">₹</span>
                                        <input type="text" name="consultationFee" value={f.consultationFee} onChange={handleChange}
                                            placeholder="500" maxLength={6}
                                            className={`${cls.input(!!errors.consultationFee && !!f.consultationFee, !errors.consultationFee && !!f.consultationFee)} pl-8`} />
                                    </div>
                                    {E("consultationFee")}
                                </div>
                                <F label="Duration (mins)" name="consultationDuration" value={f.consultationDuration} onChange={handleChange} placeholder="15" maxLength={3} hint="Default: 15 mins" />
                                <F label="Max Appt/Day" name="maxAppt" value={f.maxAppt} onChange={handleChange} placeholder="20" maxLength={3} />
                            </div>

                            {/* Weekly Schedule */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-blue-800">Weekly Schedule</p>
                                    <button type="button" onClick={() => setAvailability([...availability, { days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }])}
                                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"><Plus size={13} />Add Schedule</button>
                                </div>
                                <div className="space-y-4">
                                    {availability.map((slot, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-blue-700">Schedule {i + 1}</span>
                                                {availability.length > 1 && <button type="button" onClick={() => setAvailability(availability.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {DAYS.map(d => <button key={d} type="button" onClick={() => toggleDay(i, d)} className={cls.btn.day(slot.days.includes(d))}>{d.slice(0, 3)}</button>)}
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                {(["startTime", "breakStart", "breakEnd", "endTime"] as const).map((fld, fi) => (
                                                    <div key={fld}>
                                                        <label className="block text-[10px] font-bold text-blue-500 mb-1">{["Start", "Break Start", "Break End", "End"][fi]}</label>
                                                        <input type="time" value={slot[fld]} onChange={(e) => { const u = [...availability]; u[i] = { ...u[i], [fld]: e.target.value }; setAvailability(u); }}
                                                            className="w-full px-3 py-2 rounded-lg border border-blue-100 bg-white text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                                        <p className="text-[10px] text-blue-400 mt-1">{formatAMPM(slot[fld])}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ⑤ Additional Information */}
                    <div className={cls.card}>
                        <SectionHeader icon={<FileText size={16} />} title="Additional Information" color="green" />
                        <div className={cls.cardBody}>
                            <div className="mb-4">
                                <label className={cls.label}>Bio / About</label>
                                <textarea name="bio" value={f.bio} onChange={handleChange} rows={3} maxLength={1000}
                                    placeholder="Brief description of the doctor's expertise..."
                                    className="w-full px-4 py-3 rounded-xl border border-blue-100 text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none resize-none transition-all" />
                                <p className={cls.hintMsg}>{f.bio.length}/1000 characters</p>
                            </div>


                            {/* Languages */}
                            <div className="mb-4">
                                <TagInput
                                    label="Languages Spoken"
                                    placeholder="Search & select languages..."
                                    options={COMMON_LANGUAGES}
                                    selectedItems={languages}
                                    onAdd={(val) => setLanguages([...languages, val])}
                                    onRemove={(val) => setLanguages(languages.filter(i => i !== val))}
                                    accentColor="green"
                                    icon={<Globe size={20} className="mb-2 opacity-20" />}
                                />
                            </div>

                            {/* Awards */}
                            <div>
                                <label className={cls.label}>Awards & Recognition</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={tempAward} onChange={(e) => setTempAward(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(awards, setAwards, tempAward, () => setTempAward("")))}
                                        placeholder="e.g. Best Doctor Award 2023" maxLength={100}
                                        className={`flex-1 ${cls.input(false, !!tempAward)}`} />
                                    <button type="button" onClick={() => addTag(awards, setAwards, tempAward, () => setTempAward(""))} disabled={!tempAward} className={cls.btn.add}><Plus size={14} />Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {awards.map(a => <span key={a} className={cls.tag("yellow")}><Award size={11} />{a}<button type="button" onClick={() => removeTag(awards, setAwards, a)}><X size={12} /></button></span>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ⑥ Bank & Payroll */}
                    <div className={cls.card}>
                        <SectionHeader icon={<Landmark size={16} />} title="Bank & Payroll Details" color="green"
                            extra={<span className="text-[10px] text-green-600 font-black uppercase tracking-wider bg-green-50 px-2 py-1 rounded-lg border border-green-100">Mandatory for Payslips</span>} />
                        <div className={cls.cardBody}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <F label="Account Holder Name" name="accountName" value={f.accountName} onChange={handleChange} placeholder="As per bank records" maxLength={100} />
                                <F label="Bank Name" name="bankName" value={f.bankName} onChange={handleChange} placeholder="e.g. HDFC Bank" maxLength={80} />
                                <F label="Account Number" name="accountNumber" value={f.accountNumber} onChange={handleChange} error={errors.accountNumber} placeholder="9–18 digits" maxLength={18} hint={`${f.accountNumber.length} digits`} />
                                <F label="IFSC Code" name="ifscCode" value={f.ifscCode} onChange={handleChange} error={errors.ifscCode} placeholder="HDFC0001234" maxLength={11} hint="Format: ABCD0123456" extraClass="uppercase" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-green-50">
                                <div>
                                    <label className={cls.label}>Base Salary (Monthly)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold text-sm">₹</span>
                                        <input type="text" name="baseSalary" value={f.baseSalary} onChange={handleChange} placeholder="e.g. 150000" maxLength={8}
                                            className={`${cls.input(false, !!f.baseSalary)} pl-8`} />
                                    </div>
                                </div>
                                <F label="PAN Number" name="panNumber" value={f.panNumber} onChange={handleChange} error={errors.panNumber} placeholder="ABCDE1234F" maxLength={10} hint="5 letters + 4 digits + 1 letter" extraClass="uppercase" />
                                <F label="Aadhar Number" name="aadharNumber" value={f.aadharNumber} onChange={handleChange} error={errors.aadharNumber} placeholder="12-digit Aadhar" maxLength={12} hint={`${f.aadharNumber.length}/12 digits`} />
                                <F label="PF Number" name="pfNumber" value={f.pfNumber} onChange={handleChange} placeholder="Provident Fund No." maxLength={30} />
                                <F label="ESI Number" name="esiNumber" value={f.esiNumber} onChange={handleChange} placeholder="ESI Number" maxLength={20} />
                                <F label="UAN Number" name="uanNumber" value={f.uanNumber} onChange={handleChange} placeholder="Universal Account No." maxLength={20} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom actions */}
                    <div className="flex justify-end gap-3 pb-4">
                        <button type="button" onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors`)} disabled={loading} className={cls.btn.secondary}>Cancel</button>
                        <button type="submit" disabled={loading} className={cls.btn.primary}>
                            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={16} />Create Doctor Profile</>}
                        </button>
                    </div>
                </form>
            </div>
        </InfrastructureCheck>
    );
}
