"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
    ArrowLeft, AlertCircle, CheckCircle2, User, Briefcase, Clock,
    FileText, CreditCard, Activity, Globe, Plus, X, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { InfrastructureCheck } from "../../../../hospital-admin/components/InfrastructureCheck";

// ─── Color palette: blue, green, yellow, white only ───────────────────────────
const cls = {
    card: "bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden",
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
        primary: "flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-200 disabled:opacity-50",
        secondary: "flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50",
        add: "flex items-center gap-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-95 transition-all",
        day: (active: boolean) =>
            `px-3 py-2 rounded-lg text-xs font-bold transition-all border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-400 border-blue-100 hover:border-blue-400"}`,
    },
};

// ─── Validation rules (real-time) ─────────────────────────────────────────────
const RULES: Record<string, (v: string) => string> = {
    name: v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.''-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : v.length > 100 ? "Max 100 characters" : "",
    email: v => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email address" : "",
    mobile: v => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits required` : "",
    password: v => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 min` : v.length > 64 ? "Max 64 characters" : "",
    designation: v => !v.trim() ? "Designation is required" : "",
    emergencyContactMobile: v => v && v.length !== 10 ? `${v.length}/10 digits required` : "",
    pincode: v => v && (!/^\d+$/.test(v) || v.length !== 6) ? `${v.length}/6 digits required` : "",
    panNumber: v => v && v.toUpperCase() !== "N/A" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "Format: ABCDE1234F" : "",
    aadharNumber: v => v && v.toUpperCase() !== "N/A" && (!/^\d+$/.test(v) || v.length !== 12) ? `${v.length}/12 digits required` : "",
    accountNumber: v => v && v.toUpperCase() !== "N/A" && (!/^\d+$/.test(v) || v.length < 9 || v.length > 18) ? "Must be 9–18 digits" : "",
    ifscCode: v => v && v.toUpperCase() !== "N/A" && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? "Format: HDFC0001234" : "",
};

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
                <input type={type} name={name} value={value} onChange={onChange}
                    placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
                    className={`${cls.input(hasErr, isOk)} pr-8 ${extraClass}`} />
                {isOk && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />}
                {hasErr && <AlertCircle size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" />}
            </div>
            {hasErr && <p className={cls.errMsg}><AlertCircle size={11} />{error}</p>}
            {!hasErr && hint && <p className={cls.hintMsg}>{hint}</p>}
        </div>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SH({ icon, title, color = "blue", extra }: { icon: React.ReactNode; title: string; color?: "blue" | "green" | "yellow"; extra?: React.ReactNode }) {
    const bg = color === "blue" ? "bg-blue-50" : color === "green" ? "bg-green-50" : "bg-yellow-50";
    const tx = color === "blue" ? "text-blue-700" : color === "green" ? "text-green-700" : "text-yellow-700";
    const bd = color === "blue" ? "border-b border-blue-50" : color === "green" ? "border-b border-green-50" : "border-b border-yellow-100";
    return (
        <div className={`px-6 py-4 ${bd} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <div className={`${cls.sectionIcon} ${bg} ${tx}`}>{icon}</div>
                <h3 className={`font-bold text-sm ${tx}`}>{title}</h3>
            </div>
            {extra}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HRCreateNursePage() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;
    const qc = useQueryClient();

    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [shifts, setShifts] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [allRooms, setAllRooms] = useState<any[]>([]);

    const [f, setF] = useState({
        honorific: "Mr",
        name: "", email: "", mobile: "", password: "", gender: "", dob: "",
        fatherName: "", workLocation: "",
        street: "", city: "", state: "", pincode: "",
        department: [] as string[], assignedRoom: [] as string[], designation: "Nurse", employeeId: "",
        employmentType: "full-time", experienceYears: "", joiningDate: "",
        emergencyContactName: "", emergencyContactMobile: "", emergencyContactRelationship: "",
        shift: "", startTime: "09:00", endTime: "17:00",
        bloodGroup: "", notes: "",
        sickLeaveQuota: "1", emergencyLeaveQuota: "1", status: "active",
        baseSalary: "0", panNumber: "", pfNumber: "", esiNumber: "", uanNumber: "", aadharNumber: "",
        accountName: "", accountNumber: "", bankName: "", ifscCode: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [weeklyOff, setWeeklyOff] = useState<string[]>(["Saturday", "Sunday"]);
    const [qualifications, setQualifications] = useState<string[]>([]);
    const [certifications, setCertifications] = useState<string[]>([]);
    const [skills, setSkills] = useState<string[]>([]);
    const [tempQ, setTempQ] = useState(""); const [tempC, setTempC] = useState(""); const [tempS, setTempS] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const [sd, td, rd] = await Promise.all([
                    hospitalAdminService.getShifts(),
                    import("@/lib/integrations/services/ipd.service").then(m => m.ipdService.getUnitTypes().catch(() => [])),
                    import("@/lib/integrations/services/ipd.service").then(m => m.ipdService.getRooms().catch(() => [])),
                ]);
                setShifts(sd); setUnitTypes(td); setAllRooms(rd);
                if (sd.length > 0) setF(p => ({ ...p, shift: sd[0]._id, startTime: sd[0].startTime, endTime: sd[0].endTime }));
            } catch { toast.error("Failed to load configurations"); }
        })();
    }, []);

    // ── real-time validation
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Restrict digits
        if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
        if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
        if (name === "emergencyContactMobile" && !/^\d{0,10}$/.test(value)) return;
        if (name === "aadharNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,12}$/.test(value)) return;
        if (name === "accountNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,18}$/.test(value)) return;
        if (name === "panNumber" && value.toUpperCase() !== "N/A" && value.length > 10) return;
        if (name === "ifscCode" && value.toUpperCase() !== "N/A" && value.length > 11) return;
        if (["sickLeaveQuota", "emergencyLeaveQuota", "experienceYears"].includes(name) && !/^\d*$/.test(value)) return;
        if (name === "baseSalary" && !/^\d*$/.test(value)) return;

        if (name === "shift") {
            const s = shifts.find(s => s._id === value);
            if (s) { setF(p => ({ ...p, shift: value, startTime: s.startTime, endTime: s.endTime })); return; }
        }

        const upper = ["panNumber", "ifscCode"].includes(name) ? value.toUpperCase() : value;

        if (name === "honorific") {
            let gender = f.gender;
            if (value === "Mr") gender = "male";
            else if (value === "Mrs" || value === "Ms") gender = "female";
            setF(p => ({ ...p, [name]: value, gender }));
            const rule = RULES[name];
            if (rule) setErrors(p => ({ ...p, [name]: rule(value) }));
            return;
        }

        setF(p => ({ ...p, [name]: upper }));

        const rule = RULES[name];
        if (rule) setErrors(p => ({ ...p, [name]: rule(upper) }));
    };

    const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "accountNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,18}$/.test(value)) return;
        if (name === "ifscCode" && value.toUpperCase() !== "N/A" && value.length > 11) return;
        const upper = ["ifscCode", "accountName", "bankName"].includes(name) ? value : value;
        setF(p => ({ ...p, [name]: upper.toUpperCase() === "N/A" ? "N/A" : upper }));
        const rule = RULES[name];
        if (rule) setErrors(p => ({ ...p, [name]: rule(upper) }));
    };

    const markNA = () => {
        setF(p => ({ ...p, baseSalary: "0", panNumber: "N/A", pfNumber: "N/A", esiNumber: "N/A", uanNumber: "N/A", aadharNumber: "N/A", accountName: "N/A", accountNumber: "N/A", bankName: "N/A", ifscCode: "N/A" }));
        toast.success("Financial fields marked as N/A");
    };

    const handleDepartmentAdd = (dept: string) => {
        if (dept && !(f.department as string[]).includes(dept))
            setF(p => ({ ...p, department: [...(p.department as string[]), dept] }));
    };

    const handleDepartmentRemove = (dept: string) => {
        setF(p => ({
            ...p,
            department: (p.department as string[]).filter(d => d !== dept),
            assignedRoom: (p.assignedRoom as string[]).filter(r => {
                const ro = allRooms.find((room: any) => room.label === r);
                return ro ? ro.type !== dept : true;
            })
        }));
    };

    const handleRoomAdd = (room: string) => {
        if (room && !(f.assignedRoom as string[]).includes(room))
            setF(p => ({ ...p, assignedRoom: [...(p.assignedRoom as string[]), room] }));
    };

    const handleRoomRemove = (room: string) =>
        setF(p => ({ ...p, assignedRoom: (p.assignedRoom as string[]).filter(r => r !== room) }));

    const touchAll = () => {
        const checks: Record<string, string> = {
            name: RULES.name(f.name), email: RULES.email(f.email), mobile: RULES.mobile(f.mobile),
            password: RULES.password(f.password), designation: RULES.designation(f.designation),
            pincode: RULES.pincode(f.pincode),
            emergencyContactMobile: RULES.emergencyContactMobile(f.emergencyContactMobile),
            panNumber: RULES.panNumber(f.panNumber), aadharNumber: RULES.aadharNumber(f.aadharNumber),
            accountNumber: RULES.accountNumber(f.accountNumber), ifscCode: RULES.ifscCode(f.ifscCode),
        };
        setErrors(p => ({ ...p, ...checks }));
        return Object.values(checks).every(e => !e);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!touchAll()) { toast.error("Please fix errors before submitting"); return; }
        setLoading(true);
        try {
            await hospitalAdminService.createStaff({
                honorific: f.honorific,
                name: f.name.trim(), email: f.email.trim(), mobile: f.mobile, password: f.password,
                gender: f.gender || undefined, dateOfBirth: f.dob || undefined,
                address: f.street || f.city ? { street: f.street, city: f.city, state: f.state, pincode: f.pincode, country: "India" } : undefined,
                department: f.department, assignedRoom: f.assignedRoom, designation: f.designation,
                employeeId: f.employeeId || undefined, employmentType: f.employmentType,
                experienceYears: f.experienceYears ? parseInt(f.experienceYears) : 0,
                joiningDate: f.joiningDate || new Date().toISOString().split("T")[0],
                emergencyContact: f.emergencyContactName ? { name: f.emergencyContactName, mobile: f.emergencyContactMobile, relationship: f.emergencyContactRelationship } : undefined,
                shift: f.shift, workingHours: { start: f.startTime, end: f.endTime }, weeklyOff,
                qualifications, certifications, skills,
                bloodGroup: f.bloodGroup || undefined, notes: f.notes || undefined,
                sickLeaveQuota: parseInt(f.sickLeaveQuota) || 1, emergencyLeaveQuota: parseInt(f.emergencyLeaveQuota) || 1,
                baseSalary: parseInt(f.baseSalary) || 0, panNumber: f.panNumber, pfNumber: f.pfNumber,
                esiNumber: f.esiNumber, uanNumber: f.uanNumber, aadharNumber: f.aadharNumber,
                fatherName: f.fatherName, workLocation: f.workLocation,
                bankDetails: { accountName: f.accountName, accountNumber: f.accountNumber, bankName: f.bankName, ifscCode: f.ifscCode },
                role: "nurse",
            } as any);
            toast.success(`Nurse "${f.name}" added to registry!`);
            qc.invalidateQueries({ queryKey: ["hr-nurses"] });
            router.push(`/${hospitalId}/hr/hospital/nurses`);
        } catch (err: any) {
            toast.error(err.message || "Failed to add nurse");
        } finally { setLoading(false); }
    };

    const addTag = (list: string[], set: (v: string[]) => void, val: string, reset: () => void) => {
        if (val.trim() && !list.includes(val.trim())) { set([...list, val.trim()]); reset(); }
    };
    const removeTag = (list: string[], set: (v: string[]) => void, val: string) => set(list.filter(i => i !== val));

    const E = (name: string) => errors[name] && f[name as keyof typeof f] !== ""
        ? <p className={cls.errMsg}><AlertCircle size={11} />{errors[name]}</p>
        : null;

    return (
        <InfrastructureCheck>
        <div className="min-h-screen bg-gradient-to-br from-green-50/60 via-white to-blue-50/40 pb-16">

            {/* TOP BAR */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-green-100 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push(`/${hospitalId}/hr/hospital/nurses`)}
                        className="p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-all">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">HR Portal · Nursing Registry</p>
                        <h1 className="text-base font-black text-green-900">Register Clinical Nurse</h1>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => router.push(`/${hospitalId}/hr/hospital/nurses`)} disabled={loading} className={cls.btn.secondary}>Cancel</button>
                    <button type="submit" form="nurse-form" disabled={loading} className={cls.btn.primary}>
                        {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} />Register Nurse</>}
                    </button>
                </div>
            </div>

            <form id="nurse-form" onSubmit={handleSubmit} noValidate className="max-w-7xl mx-auto px-6 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT 2/3 */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ① Personal Info */}
                        <div className={cls.card}>
                            <SH icon={<User size={16} />} title="Personal Information" color="blue" />
                            <div className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className={cls.label}>Honorific <span className="text-red-500">*</span></label>
                                        <select name="honorific" value={f.honorific} onChange={handleChange} className={cls.input(false, !!f.honorific)}>
                                            <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                                        </select>
                                    </div>
                                    <F label="Full Name" name="name" value={f.name} onChange={handleChange} error={errors.name} required placeholder="e.g. Priya Sharma" maxLength={100} hint="Max 100 characters" />
                                    <div>
                                        <label className={cls.label}>Gender</label>
                                        <select name="gender" value={f.gender} onChange={handleChange} className={cls.input(false, !!f.gender)}>
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                                        </select>
                                    </div>
                                    <F label="Email Address" name="email" value={f.email} onChange={handleChange} error={errors.email} required type="email" placeholder="nurse@hospital.com" maxLength={150} />
                                    <F label="Mobile Number" name="mobile" value={f.mobile} onChange={handleChange} error={errors.mobile} required type="tel" placeholder="10-digit number" maxLength={10} hint={`${f.mobile.length}/10 digits`} />
                                    <F label="Father's Name" name="fatherName" value={f.fatherName} onChange={handleChange} placeholder="Optional" maxLength={80} />
                                    <div>
                                        <label className={cls.label}>Date of Birth</label>
                                        <input type="date" name="dob" value={f.dob} onChange={handleChange} max={new Date().toISOString().split("T")[0]}
                                            className={cls.input(false, !!f.dob)} />
                                    </div>
                                    <F label="Work Location" name="workLocation" value={f.workLocation} onChange={handleChange} placeholder="e.g. Ward 3, ICU" maxLength={60} />
                                </div>
                                {/* Password */}
                                <div className="md:col-span-2">
                                    <label className={cls.label}>Access Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input type={showPwd ? "text" : "password"} name="password" value={f.password} onChange={handleChange}
                                            placeholder="Min 6 characters" maxLength={64}
                                            className={`${cls.input(!!errors.password && f.password !== "", !errors.password && f.password !== "")} pr-10`} />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-700">
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {errors.password && f.password && <p className={cls.errMsg}><AlertCircle size={11} />{errors.password}</p>}
                                    {!errors.password && f.password && <p className={cls.okMsg}><CheckCircle2 size={11} />Password looks good</p>}
                                </div>
                            </div>
                        </div>

                        {/* ② Clinical Employment */}
                        <div className={cls.card}>
                            <SH icon={<Briefcase size={16} />} title="Clinical Employment Details" color="green" />
                            <div className="p-6 grid grid-cols-2 gap-4">
                                {/* ── Assigned Department(s) ── multi-chip picker */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className={cls.label}>
                                        Assigned Department(s) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="min-h-[46px] w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all flex flex-wrap gap-2 items-center">
                                        {(f.department as string[]).map(dept => (
                                            <span key={dept} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1">
                                                {dept}
                                                <button type="button" onClick={() => handleDepartmentRemove(dept)} className="hover:text-red-600">&times;</button>
                                            </span>
                                        ))}
                                        <select
                                            className="bg-transparent border-none outline-none text-xs font-medium min-w-[80px] text-blue-400 cursor-pointer p-0"
                                            value=""
                                            onChange={(e) => { if (e.target.value) handleDepartmentAdd(e.target.value); }}
                                        >
                                            <option value="">+ Add</option>
                                            {unitTypes.filter(d => !(f.department as string[]).includes(d)).map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* ── Assigned Rooms (Conditional to Types) ── multi-chip picker */}
                                <div className="col-span-2 space-y-1.5">
                                    <label className={cls.label}>Assigned Rooms (Conditional to Types)</label>
                                    <div className="min-h-[46px] w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all flex flex-wrap gap-2 items-center">
                                        {(f.assignedRoom as string[]).map(room => (
                                            <span key={room} className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100 flex items-center gap-1">
                                                {room}
                                                <button type="button" onClick={() => handleRoomRemove(room)} className="hover:text-red-600">&times;</button>
                                            </span>
                                        ))}
                                        <select
                                            className="bg-transparent border-none outline-none text-xs font-medium min-w-[120px] text-blue-400 cursor-pointer p-0"
                                            value=""
                                            onChange={(e) => { if (e.target.value) handleRoomAdd(e.target.value); }}
                                            disabled={(f.department as string[]).length === 0}
                                        >
                                            <option value="">+ Add Room</option>
                                            {allRooms
                                                .filter((r: any) => (f.department as string[]).includes(r.type) && !(f.assignedRoom as string[]).includes(r.label))
                                                .map((room: any) => (
                                                    <option key={room._id} value={room.label}>{room.label} ({room.type})</option>
                                                ))}
                                        </select>
                                    </div>
                                    <p className="text-[10px] text-blue-400 ml-0.5 italic">Rooms must belong to one of the assigned departments above.</p>
                                </div>
                                <F label="Designation" name="designation" value={f.designation} onChange={handleChange} error={errors.designation} required placeholder="e.g. Staff Nurse" maxLength={60} />
                                <F label="Employee ID / License" name="employeeId" value={f.employeeId} onChange={handleChange} placeholder="Optional" maxLength={30} />
                                <div>
                                    <label className={cls.label}>Contract Type</label>
                                    <select name="employmentType" value={f.employmentType} onChange={handleChange} className={cls.input(false, true)}>
                                        <option value="full-time">Full-Time</option>
                                        <option value="part-time">Part-Time</option>
                                        <option value="contract">Contract</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={cls.label}>Joining Date</label>
                                    <input type="date" name="joiningDate" value={f.joiningDate} onChange={handleChange}
                                        className={cls.input(false, !!f.joiningDate)} />
                                </div>
                                <F label="Experience (Years)" name="experienceYears" value={f.experienceYears} onChange={handleChange} placeholder="e.g. 3" maxLength={2} hint="Whole numbers only" />
                            </div>
                        </div>

                        {/* ③ Shift */}
                        <div className={cls.card}>
                            <SH icon={<Clock size={16} />} title="Clinical Shift Registry" color="blue" />
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <label className={cls.label}>Active Duty Shift <span className="text-red-500">*</span></label>
                                        <select name="shift" value={f.shift} onChange={handleChange} className={cls.input(false, !!f.shift)}>
                                            <option value="">Select Shift</option>
                                            {shifts.map((s: any) => <option key={s._id} value={s._id}>{s.name} [{s.startTime} – {s.endTime}]</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[["Check-in", f.startTime], ["Check-out", f.endTime]].map(([lbl, val]) => (
                                            <div key={lbl}>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">{lbl}</label>
                                                <div className="px-4 py-2.5 bg-blue-50 rounded-xl text-sm font-bold text-blue-700 border border-blue-100">{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Weekly Day Off</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(d => (
                                            <button key={d} type="button" onClick={() => setWeeklyOff(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                                                className={cls.btn.day(weeklyOff.includes(d))}>{d.slice(0, 3)}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ④ Financial & Bank */}
                        <div className={cls.card}>
                            <SH icon={<CreditCard size={16} />} title="Financial Disclosure & Bank Registry" color="green"
                                extra={<button type="button" onClick={markNA} className="text-[9px] font-black uppercase tracking-widest text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 transition-all">Mark All N/A</button>} />
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className={cls.label}>Monthly Base Salary</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold text-sm">₹</span>
                                            <input type="text" name="baseSalary" value={f.baseSalary} onChange={handleChange} placeholder="e.g. 35000" maxLength={8}
                                                className={`${cls.input(false, !!f.baseSalary && f.baseSalary !== "0")} pl-8`} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={cls.label}>PAN Number</label>
                                        <div className="relative">
                                            <input type="text" name="panNumber" value={f.panNumber} onChange={handleChange}
                                                placeholder="ABCDE1234F" maxLength={10}
                                                className={`${cls.input(!!errors.panNumber && !!f.panNumber, !errors.panNumber && !!f.panNumber)} pr-8 uppercase`} />
                                            {f.panNumber && !errors.panNumber && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                                        </div>
                                        {E("panNumber")}
                                        {!f.panNumber && <p className={cls.hintMsg}>Format: ABCDE1234F</p>}
                                    </div>
                                    <div>
                                        <label className={cls.label}>Aadhar Number</label>
                                        <div className="relative">
                                            <input type="text" name="aadharNumber" value={f.aadharNumber} onChange={handleChange}
                                                placeholder="12-digit Aadhar" maxLength={12}
                                                className={`${cls.input(!!errors.aadharNumber && !!f.aadharNumber, !errors.aadharNumber && !!f.aadharNumber)} pr-8`} />
                                            {f.aadharNumber && !errors.aadharNumber && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                                        </div>
                                        {E("aadharNumber")}
                                        {!f.aadharNumber && <p className={cls.hintMsg}>{f.aadharNumber.length}/12 digits</p>}
                                    </div>
                                    <F label="PF Number" name="pfNumber" value={f.pfNumber} onChange={handleChange} placeholder="PF Number" maxLength={20} />
                                    <F label="ESI Number" name="esiNumber" value={f.esiNumber} onChange={handleChange} placeholder="ESI Number" maxLength={20} />
                                    <F label="UAN Number" name="uanNumber" value={f.uanNumber} onChange={handleChange} placeholder="UAN Number" maxLength={20} />
                                </div>

                                {/* Bank details */}
                                <div className="pt-4 border-t border-green-50">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-3">Bank Account Details</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={cls.label}>Account Holder Name</label>
                                            <input type="text" name="accountName" value={f.accountName} onChange={handleBankChange}
                                                placeholder="Name as per bank records" maxLength={100}
                                                className={cls.input(false, !!f.accountName)} />
                                        </div>
                                        <div>
                                            <label className={cls.label}>Bank Name</label>
                                            <input type="text" name="bankName" value={f.bankName} onChange={handleBankChange}
                                                placeholder="e.g. HDFC Bank" maxLength={80}
                                                className={cls.input(false, !!f.bankName)} />
                                        </div>
                                        <div>
                                            <label className={cls.label}>Account Number</label>
                                            <div className="relative">
                                                <input type="text" name="accountNumber" value={f.accountNumber} onChange={handleBankChange}
                                                    placeholder="9–18 digit account number" maxLength={18}
                                                    className={`${cls.input(!!errors.accountNumber && !!f.accountNumber, !errors.accountNumber && !!f.accountNumber)} pr-8`} />
                                                {f.accountNumber && !errors.accountNumber && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                                            </div>
                                            {E("accountNumber")}
                                            {!f.accountNumber && <p className={cls.hintMsg}>9–18 digits</p>}
                                        </div>
                                        <div>
                                            <label className={cls.label}>IFSC Code</label>
                                            <div className="relative">
                                                <input type="text" name="ifscCode" value={f.ifscCode} onChange={handleBankChange}
                                                    placeholder="e.g. HDFC0001234" maxLength={11}
                                                    className={`${cls.input(!!errors.ifscCode && !!f.ifscCode, !errors.ifscCode && !!f.ifscCode)} pr-8 uppercase`} />
                                                {f.ifscCode && !errors.ifscCode && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                                            </div>
                                            {E("ifscCode")}
                                            {!f.ifscCode && <p className={cls.hintMsg}>Format: ABCD0123456</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT 1/3 */}
                    <div className="space-y-6">

                        {/* ⑤ Emergency Contact */}
                        <div className={cls.card}>
                            <SH icon={<Activity size={16} />} title="Emergency Contact" color="yellow" />
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={cls.label}>Full Name</label>
                                    <input type="text" name="emergencyContactName" value={f.emergencyContactName} onChange={handleChange}
                                        placeholder="Contact person" maxLength={80}
                                        className={cls.input(false, !!f.emergencyContactName)} />
                                </div>
                                <div>
                                    <label className={cls.label}>Mobile</label>
                                    <div className="relative">
                                        <input type="tel" name="emergencyContactMobile" value={f.emergencyContactMobile} onChange={handleChange}
                                            placeholder="10-digit number" maxLength={10}
                                            className={`${cls.input(!!errors.emergencyContactMobile && !!f.emergencyContactMobile, !errors.emergencyContactMobile && !!f.emergencyContactMobile)} pr-8`} />
                                        {f.emergencyContactMobile && !errors.emergencyContactMobile && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                                    </div>
                                    {E("emergencyContactMobile")}
                                </div>
                                <div>
                                    <label className={cls.label}>Relationship</label>
                                    <input type="text" name="emergencyContactRelationship" value={f.emergencyContactRelationship} onChange={handleChange}
                                        placeholder="e.g. Spouse / Parent" maxLength={40}
                                        className={cls.input(false, !!f.emergencyContactRelationship)} />
                                </div>
                            </div>
                        </div>

                        {/* ⑥ Academic Qualifications */}
                        <div className={cls.card}>
                            <SH icon={<Globe size={16} />} title="Academic Qualifications" color="blue" />
                            <div className="p-6 space-y-5">
                                {([
                                    { label: "Nursing Degrees / Diplomas", temp: tempQ, setTemp: setTempQ, list: qualifications, setList: setQualifications, ph: "e.g. B.Sc Nursing, GNM" },
                                    { label: "Certifications", temp: tempC, setTemp: setTempC, list: certifications, setList: setCertifications, ph: "e.g. ACLS, BLS" },
                                ] as const).map(({ label, temp, setTemp, list, setList, ph }) => (
                                    <div key={label}>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">{label}</label>
                                        <div className="flex gap-2 mb-2">
                                            <input value={temp} onChange={(e) => setTemp(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(list, setList as any, temp, () => setTemp("")))}
                                                placeholder={ph} maxLength={80}
                                                className={`flex-1 px-3 py-2 rounded-xl border border-blue-100 bg-white text-xs focus:ring-2 focus:ring-blue-200 outline-none`} />
                                            <button type="button" onClick={() => addTag(list, setList as any, temp, () => setTemp(""))} disabled={!temp} className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-90 transition-all disabled:opacity-50"><Plus size={14} /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {list.map((item: string) => (
                                                <span key={item} className={cls.tag("blue")}>
                                                    {item}<button type="button" onClick={() => removeTag(list, setList as any, item)}><X size={11} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ⑦ Skills */}
                        <div className={cls.card}>
                            <SH icon={<FileText size={16} />} title="Clinical Skills" color="green" />
                            <div className="p-6">
                                <div className="flex gap-2 mb-2">
                                    <input value={tempS} onChange={(e) => setTempS(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(skills, setSkills, tempS, () => setTempS("")))}
                                        placeholder="e.g. ICU, Pediatric" maxLength={50}
                                        className="flex-1 px-3 py-2 rounded-xl border border-blue-100 bg-white text-xs focus:ring-2 focus:ring-blue-200 outline-none" />
                                    <button type="button" onClick={() => addTag(skills, setSkills, tempS, () => setTempS(""))} disabled={!tempS} className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-90 transition-all disabled:opacity-50"><Plus size={14} /></button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {skills.map(s => (
                                        <span key={s} className={cls.tag("green")}>
                                            {s}<button type="button" onClick={() => removeTag(skills, setSkills, s)}><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ⑧ Status */}
                        <div className={cls.card}>
                            <SH icon={<Activity size={16} />} title="Registry Status" color="green" />
                            <div className="p-6">
                                <label className={cls.label}>Duty Status</label>
                                <select name="status" value={f.status} onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 text-sm font-bold text-green-700 focus:ring-2 focus:ring-green-200 outline-none">
                                    <option value="active">Active Duty</option>
                                    <option value="inactive">On Leave</option>
                                </select>
                            </div>
                        </div>

                        {/* Submit CTA */}
                        <div className="sticky bottom-4">
                            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-black hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} />Confirm Registry Addition</>}
                            </button>
                            <button type="button" onClick={() => router.push(`/${hospitalId}/hr/hospital/nurses`)} disabled={loading}
                                className="w-full mt-2 py-2.5 text-xs font-semibold text-blue-400 hover:text-blue-700 transition-colors text-center">
                                Abort Registration
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        </InfrastructureCheck>
    );
}
