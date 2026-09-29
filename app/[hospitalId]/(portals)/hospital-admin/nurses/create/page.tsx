"use client";

import React, { useState } from 'react';
import { useRouter, useParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
  User, Briefcase, FileText, Clock, Globe,
  Eye, EyeOff, ArrowLeft, Activity, Plus, CreditCard, AlertCircle, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/admin";
import { InfrastructureCheck } from "../../components/InfrastructureCheck";

/* ─────────────────────────── types ─────────────────────────── */
interface FormData {
  honorific: string;
  name: string; email: string; mobile: string; password: string;
  gender: string; dateOfBirth: string;
  street: string; city: string; state: string; pincode: string;
  department: string[]; assignedRoom: string[]; designation: string;
  employeeId: string; employmentType: string; experienceYears: string; joiningDate: string;
  emergencyContactName: string; emergencyContactMobile: string; emergencyContactRelationship: string;
  shift: string; startTime: string; endTime: string; weeklyOff: string[];
  qualifications: string[]; certifications: string[]; skills: string[];
  bloodGroup: string; languages: string[]; notes: string;
  sickLeaveQuota: string; emergencyLeaveQuota: string; status: string;
  baseSalary: string; panNumber: string; pfNumber: string; esiNumber: string;
  uanNumber: string; aadharNumber: string; fatherName: string; workLocation: string;
  bankDetails: { accountName: string; accountNumber: string; bankName: string; ifscCode: string };
}

type Errors = Partial<Record<string, string>>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ─────────────────────── validation helpers ─────────────────── */
const validators: Record<string, (v: string) => string> = {
  name: v => !v.trim() ? "Full name is required"
    : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens allowed" : "",
  email: v => !v.trim() ? "Email is required"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email format (e.g. nurse@hospital.com)" : "",
  mobile: v => v.length === 0 ? "Mobile number is required"
    : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password: v => !v ? "Password is required"
    : v.length < 6 ? `Password too short — ${v.length}/6 characters minimum` : "",
  designation: v => !v.trim() ? "Designation is required" : "",
  pincode: v => v && v.length !== 6 ? `${v.length}/6 digits` : "",
  emergencyContactMobile: v => v && v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  panNumber: v => v && v.toUpperCase() !== "N/A" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Invalid PAN format — e.g. ABCDE1234F" : "",
  aadharNumber: v => v && v.toUpperCase() !== "N/A" && v.length !== 12 ? `${v.length}/12 digits — must be exactly 12` : "",
  ifscCode: v => v && v.toUpperCase() !== "N/A" && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? "Invalid IFSC — e.g. HDFC0001234" : "",
  accountNumber: v => v && v.toUpperCase() !== "N/A" && (v.length < 9 || v.length > 18) ? "Account no. must be 9–18 digits" : "",
  employeeId: v => !v.trim() ? "Employee ID is required" : "",
};

function validate(name: string, value: string): string {
  return validators[name] ? validators[name](value) : "";
}

/* ─────────────────────── sub-components ────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1">
      <AlertCircle size={12} /> {msg}
    </p>
  );
}

function FieldOk({ show }: { show: boolean }) {
  if (!show) return null;
  return <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />;
}

interface FProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; touched?: boolean; type?: string;
  placeholder?: string; required?: boolean; readOnly?: boolean;
  inputClass?: string; colSpan?: string;
}
function Field({ label, name, value, onChange, error, touched, type = "text",
  placeholder, required, readOnly, inputClass = "", colSpan = "" }: FProps) {
  const hasError = touched && !!error;
  const isOk = touched && !error && value.trim() !== "";
  return (
    <div className={`space-y-1.5 ${colSpan}`}>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} readOnly={readOnly}
          className={`w-full px-4 py-2.5 pr-9 bg-white dark:bg-gray-800 border rounded-xl text-sm outline-none transition-all
            ${hasError ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
              : isOk ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                : "border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500/20"}
            ${readOnly ? "bg-gray-50 dark:bg-white/5 cursor-not-allowed" : ""}
            ${inputClass}`}
        />
        {isOk && <FieldOk show />}
      </div>
      <FieldError msg={hasError ? error : undefined} />
    </div>
  );
}

/* ─────────────────────────── page ──────────────────────────── */
function CreateNurse() {
  const router = useRouter();
  const pathname = usePathname() as string;
  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";
  const { hospitalId } = useParams() as any;
  const queryClient = useQueryClient();

  const [shifts, setShifts] = useState<any[]>([]);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    honorific: "Ms", name: "", email: "", mobile: "", password: "", gender: "", dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    department: [], assignedRoom: [], designation: "Nurse", employeeId: "",
    employmentType: "full-time", experienceYears: "", joiningDate: "",
    emergencyContactName: "", emergencyContactMobile: "", emergencyContactRelationship: "",
    shift: "", startTime: "09:00", endTime: "17:00", weeklyOff: ["Saturday", "Sunday"],
    qualifications: [], certifications: [], skills: [],
    bloodGroup: "", languages: [], notes: "",
    sickLeaveQuota: "1", emergencyLeaveQuota: "1", status: "active",
    baseSalary: "0", panNumber: "", pfNumber: "", esiNumber: "", uanNumber: "",
    aadharNumber: "", fatherName: "", workLocation: "",
    bankDetails: { accountName: "", accountNumber: "", bankName: "", ifscCode: "" }
  });

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tempQ, setTempQ] = useState(""); const [tempC, setTempC] = useState("");
  const [tempS, setTempS] = useState(""); const [tempL, setTempL] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      const [sd, td, rd] = await Promise.all([
        hospitalAdminService.getShifts(),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => [])),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getRooms().catch(() => []))
      ]);
      setShifts(sd); setUnitTypes(td); setAllRooms(rd);
      if (sd.length > 0) setFormData(p => ({ ...p, shift: sd[0]._id, startTime: sd[0].startTime, endTime: sd[0].endTime }));
    } catch { toast.error("Failed to load registry configurations"); }
    finally { setLoadingShifts(false); }
  };

  /* mark field touched + validate on blur */
  const handleBlur = (name: string, value: string) => {
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  /* validate on every keystroke for touched fields */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "emergencyContactMobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "aadharNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,12}$/.test(value)) return;
    if (name === "accountNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,18}$/.test(value)) return;
    if (name === "panNumber" && value.toUpperCase() !== "N/A" && value.length > 10) return;
    if (name === "ifscCode" && value.toUpperCase() !== "N/A" && value.length > 11) return;
    if (["sickLeaveQuota", "emergencyLeaveQuota", "baseSalary", "experienceYears"].includes(name) && value.toUpperCase() !== "N/A" && !/^\d*$/.test(value)) return;

    if (name === "shift") {
      const s = shifts.find(s => s._id === value);
      if (s) { setFormData(p => ({ ...p, shift: value, startTime: s.startTime, endTime: s.endTime })); return; }
    }

    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, value) }));
      return;
    }

    setFormData(p => ({ ...p, [name]: (name === "panNumber" || value.toUpperCase() === "N/A") ? value.toUpperCase() : value }));
    if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "accountNumber" && value.toUpperCase() !== "N/A" && !/^\d{0,18}$/.test(value)) return;
    if (name === "ifscCode" && value.toUpperCase() !== "N/A" && value.length > 11) return;
    setFormData(p => ({ ...p, bankDetails: { ...p.bankDetails, [name]: value.toUpperCase() === "N/A" ? value.toUpperCase() : value } }));
    if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  const markFinancialNA = () => {
    setFormData(p => ({
      ...p,
      baseSalary: "0", panNumber: "N/A", pfNumber: "N/A", esiNumber: "N/A",
      uanNumber: "N/A", aadharNumber: "N/A",
      bankDetails: { accountName: "N/A", accountNumber: "N/A", bankName: "N/A", ifscCode: "N/A" }
    }));
    toast.success("Financial fields marked as N/A");
  };
  const handleBankBlur = (name: string, value: string) => {
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  const handleDepartmentAdd = (dept: string) => {
    if (dept && !formData.department.includes(dept))
      setFormData(p => ({ ...p, department: [...p.department, dept] }));
  };

  const handleDepartmentRemove = (dept: string) => {
    setFormData(p => ({
      ...p,
      department: p.department.filter(d => d !== dept),
      assignedRoom: p.assignedRoom.filter(r => {
        const ro = allRooms.find(room => room.label === r);
        return ro ? ro.type !== dept : true;
      })
    }));
  };

  const handleRoomAdd = (room: string) => {
    if (room && !formData.assignedRoom.includes(room))
      setFormData(p => ({ ...p, assignedRoom: [...p.assignedRoom, room] }));
  };

  const handleRoomRemove = (room: string) =>
    setFormData(p => ({ ...p, assignedRoom: p.assignedRoom.filter(r => r !== room) }));

  const toggleWeeklyOff = (day: string) =>
    setFormData(p => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d => d !== day) : [...p.weeklyOff, day] }));

  const addItem = (type: 'qualification' | 'certification' | 'skill' | 'language') => {
    const vals: Record<string, string> = { qualification: tempQ, certification: tempC, skill: tempS, language: tempL };
    const keys: Record<string, string> = { qualification: 'qualifications', certification: 'certifications', skill: 'skills', language: 'languages' };
    const v = vals[type]; const k = keys[type] as keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills' | 'languages'>;
    if (v && !(formData[k] as string[]).includes(v)) {
      setFormData(p => ({ ...p, [k]: [...(p[k] as string[]), v] }));
      if (type === 'qualification') setTempQ(""); else if (type === 'certification') setTempC("");
      else if (type === 'skill') setTempS(""); else setTempL("");
    }
  };
  const removeItem = (k: keyof Pick<FormData, 'qualifications' | 'certifications' | 'skills' | 'languages'>, item: string) =>
    setFormData(p => ({ ...p, [k]: (p[k] as string[]).filter(i => i !== item) }));

  /* touch all + validate before submit */
  const touchAll = () => {
    const fields = ["name", "email", "mobile", "password", "designation", "employeeId", "pincode",
      "emergencyContactMobile", "panNumber", "aadharNumber", "ifscCode", "accountNumber"];
    const newTouched: Record<string, boolean> = {};
    const newErrors: Errors = {};
    fields.forEach(f => {
      newTouched[f] = true;
      const v = f === "ifscCode" ? formData.bankDetails.ifscCode
        : f === "accountNumber" ? formData.bankDetails.accountNumber
          : (formData as any)[f] ?? "";
      newErrors[f] = validate(f, v);
    });
    setTouched(p => ({ ...p, ...newTouched }));
    setErrors(p => ({ ...p, ...newErrors }));
    return Object.values(newErrors).every(e => !e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!touchAll()) { toast.error("Please fix the highlighted errors before submitting"); return; }

    setLoading(true);
    try {
      const nurseData: any = {
        honorific: formData.honorific,
        name: formData.name.trim(), email: formData.email.trim(), mobile: formData.mobile,
        password: formData.password, gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.street || formData.city ? { street: formData.street, city: formData.city, state: formData.state, pincode: formData.pincode, country: "India" } : undefined,
        department: formData.department, assignedRoom: formData.assignedRoom,
        designation: formData.designation.trim(), employeeId: formData.employeeId.trim() || undefined,
        employmentType: formData.employmentType,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        emergencyContact: formData.emergencyContactName ? { name: formData.emergencyContactName, mobile: formData.emergencyContactMobile, relationship: formData.emergencyContactRelationship } : undefined,
        shift: formData.shift, workingHours: { start: formData.startTime, end: formData.endTime }, weeklyOff: formData.weeklyOff,
        qualifications: formData.qualifications, certifications: formData.certifications, skills: formData.skills,
        bloodGroup: formData.bloodGroup || undefined, languages: formData.languages,
        notes: formData.notes.trim() || undefined,
        sickLeaveQuota: parseInt(formData.sickLeaveQuota) || 1, emergencyLeaveQuota: parseInt(formData.emergencyLeaveQuota) || 1,
        baseSalary: parseInt(formData.baseSalary) || 0, panNumber: formData.panNumber,
        pfNumber: formData.pfNumber, esiNumber: formData.esiNumber, uanNumber: formData.uanNumber,
        aadharNumber: formData.aadharNumber, fatherName: formData.fatherName, workLocation: formData.workLocation,
        bankDetails: formData.bankDetails, role: 'nurse'
      };
      await hospitalAdminService.createStaff(nurseData);
      toast.success(`Nurse "${formData.name}" added to registry successfully!`, { duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-nurses'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });
      router.push(`/${hospitalId}${basePath}/nurses`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add nurse to registry", { duration: 5000 });
    } finally { setLoading(false); }
  };

  /* ── small input helper that wires blur+change+errors ────── */
  const f = (name: string) => ({
    name, value: (formData as any)[name] ?? "",
    onChange: handleChange,
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => handleBlur(name, e.target.value),
    error: errors[name], touched: touched[name]
  });

  /* ────────────────────────── JSX ──────────────────────────── */
  return (
    <InfrastructureCheck>
      <div className="max-w-7xl mx-auto pb-12 space-y-6">
        {/* header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 md:p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/${hospitalId}${basePath}/nurses`)}
              className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Register Clinical Nurse</h1>
              <p className="text-gray-500 text-xs mt-0.5">Add a new clinical nurse to the hospital registry. Fields marked <span className="text-rose-500">*</span> are required.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Info */}
            <Card title="Personal Information" icon={<User className="text-emerald-500" />} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Honorific<span className="text-rose-500 ml-0.5">*</span></label>
                  <select name="honorific" value={formData.honorific} onChange={handleChange} required
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>
                <Field label="Full Name" {...f("name")} required placeholder="e.g. Priya Sharma" />

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Field label="Email Address" {...f("email")} required type="email" placeholder="nurse@hospital.com" />
                <Field label="Mobile Number" {...f("mobile")} required type="tel" placeholder="10-digit number" />
                <Field label="Father's Name" {...f("fatherName")} placeholder="Optional" />

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                </div>
                {/* Password */}
                <div className="relative space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Access Password<span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"} name="password" value={formData.password}
                      onChange={handleChange}
                      onBlur={e => handleBlur("password", e.target.value)}
                      placeholder="Min 6 characters"
                      className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm outline-none transition-all
                        ${touched.password && errors.password ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                          : touched.password && !errors.password && formData.password ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                            : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1">
                      <AlertCircle size={12} /> {errors.password}
                    </p>
                  )}
                  {touched.password && !errors.password && formData.password && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                      <CheckCircle2 size={12} /> Password looks good
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Clinical Employment */}
            <Card title="Clinical Employment Details" icon={<Briefcase className="text-indigo-500" />} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* ── Assigned Department(s) ── multi-chip picker */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Assigned Department(s) <span className="text-rose-500">*</span>
                  </label>
                  <div className="min-h-[46px] w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all flex flex-wrap gap-2 items-center">
                    {formData.department.map(dept => (
                      <span key={dept} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100 flex items-center gap-1">
                        {dept}
                        <button type="button" onClick={() => handleDepartmentRemove(dept)} className="hover:text-red-600">&times;</button>
                      </span>
                    ))}
                    <select
                      className="bg-transparent border-none outline-none text-xs font-medium min-w-[80px] text-gray-500 cursor-pointer p-0"
                      value=""
                      onChange={(e) => { if (e.target.value) handleDepartmentAdd(e.target.value); }}
                    >
                      <option value="">+ Add</option>
                      {unitTypes.filter(d => !formData.department.includes(d)).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Assigned Rooms (Conditional to Types) ── multi-chip picker */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Assigned Rooms (Conditional to Types)</label>
                  <div className="min-h-[46px] w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all flex flex-wrap gap-2 items-center">
                    {formData.assignedRoom.map(room => (
                      <span key={room} className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 flex items-center gap-1">
                        {room}
                        <button type="button" onClick={() => handleRoomRemove(room)} className="hover:text-red-600">&times;</button>
                      </span>
                    ))}
                    <select
                      className="bg-transparent border-none outline-none text-xs font-medium min-w-[120px] text-gray-500 cursor-pointer p-0"
                      value=""
                      onChange={(e) => { if (e.target.value) handleRoomAdd(e.target.value); }}
                      disabled={formData.department.length === 0}
                    >
                      <option value="">+ Add Room</option>
                      {allRooms
                        .filter(r => formData.department.includes(r.type) && !formData.assignedRoom.includes(r.label))
                        .map(room => (
                          <option key={room._id} value={room.label}>{room.label} ({room.type})</option>
                        ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-400 ml-1 italic">Rooms must belong to one of the assigned departments above.</p>
                </div>

                <Field label="Designation" {...f("designation")} required placeholder="e.g. Staff Nurse" />
                <Field label="Nursing License / Employee ID" {...f("employeeId")} required placeholder="Hospital Employee ID" inputClass="font-bold text-indigo-600" />

                {/* Contract Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Contract Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer">
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Shift */}
            <Card title="Clinical Shift Registry" icon={<Clock className="text-amber-500" />} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Active Duty Shift<span className="text-rose-500 ml-0.5">*</span></label>
                  <select name="shift" value={formData.shift} onChange={handleChange} required
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer">
                    <option value="">Select Shift</option>
                    {shifts.map((s: any) => <option key={s._id} value={s._id}>{s.name} [{s.startTime} - {s.endTime}]</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[["Check-in", formData.startTime], ["Check-out", formData.endTime]].map(([lbl, val]) => (
                    <div key={lbl} className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{lbl}</label>
                      <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Weekly Offline Interval</h4>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleWeeklyOff(day)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${formData.weeklyOff.includes(day) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-emerald-500/30'}`}>
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Financial */}
            <Card
              title="Financial Disclosure & Bank Registry"
              icon={<CreditCard className="text-emerald-600" />}
              padding="p-2 md:p-6"
              extra={<button type="button" onClick={markFinancialNA} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100">Mark all as N/A</button>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Base Salary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Monthly Base Salary</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                    <input type="text" name="baseSalary" value={formData.baseSalary} onChange={handleChange}
                      placeholder="e.g. 35000"
                      className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>
                </div>

                {/* PAN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">PAN Number</label>
                  <div className="relative">
                    <input type="text" name="panNumber" value={formData.panNumber}
                      onChange={e => { handleChange(e); }}
                      onBlur={e => handleBlur("panNumber", e.target.value)}
                      placeholder="ABCDE1234F" maxLength={10}
                      className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm uppercase font-bold outline-none transition-all
                        ${touched.panNumber && errors.panNumber ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                          : touched.panNumber && !errors.panNumber && formData.panNumber ? "border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20"
                            : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                    {touched.panNumber && !errors.panNumber && formData.panNumber && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                  </div>
                  <FieldError msg={touched.panNumber ? errors.panNumber : undefined} />
                  {!errors.panNumber && !formData.panNumber && <p className="text-[10px] text-gray-400 ml-1">Format: ABCDE1234F (5 letters + 4 digits + 1 letter)</p>}
                </div>

                {/* Aadhar */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Aadhar Number</label>
                  <div className="relative">
                    <input type="text" name="aadharNumber" value={formData.aadharNumber}
                      onChange={handleChange} onBlur={e => handleBlur("aadharNumber", e.target.value)}
                      placeholder="12-digit Aadhar"
                      className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm font-bold outline-none transition-all
                        ${touched.aadharNumber && errors.aadharNumber ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                          : touched.aadharNumber && !errors.aadharNumber && formData.aadharNumber ? "border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20"
                            : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                    {touched.aadharNumber && !errors.aadharNumber && formData.aadharNumber && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                  </div>
                  <FieldError msg={touched.aadharNumber ? errors.aadharNumber : undefined} />
                  {!errors.aadharNumber && !formData.aadharNumber && <p className="text-[10px] text-gray-400 ml-1">Must be exactly 12 digits</p>}
                </div>

                <Field label="Provident Fund (PF) No." {...f("pfNumber")} placeholder="PF Number" />
                <Field label="ESI Number" {...f("esiNumber")} placeholder="ESI Number" />
                <Field label="UAN Number" {...f("uanNumber")} placeholder="UAN Number" />

                {/* Bank Details */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-50 dark:border-white/5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Bank Account Holder</label>
                    <input type="text" name="accountName" value={formData.bankDetails.accountName}
                      onChange={handleBankChange}
                      placeholder="Name as per bank records"
                      className="w-full px-4 py-2.5 uppercase bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>

                  {/* Account Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Account Number</label>
                    <div className="relative">
                      <input type="text" name="accountNumber" value={formData.bankDetails.accountNumber}
                        onChange={handleBankChange} onBlur={e => handleBankBlur("accountNumber", e.target.value)}
                        placeholder="9–18 digit account number"
                        className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm font-bold outline-none transition-all
                          ${touched.accountNumber && errors.accountNumber ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                            : touched.accountNumber && !errors.accountNumber && formData.bankDetails.accountNumber ? "border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20"
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                      {touched.accountNumber && !errors.accountNumber && formData.bankDetails.accountNumber && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                    </div>
                    <FieldError msg={touched.accountNumber ? errors.accountNumber : undefined} />
                    {!errors.accountNumber && !formData.bankDetails.accountNumber && <p className="text-[10px] text-gray-400 ml-1">Must be 9 to 18 digits</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Bank Name</label>
                    <input type="text" name="bankName" value={formData.bankDetails.bankName}
                      onChange={handleBankChange} placeholder="e.g. HDFC Bank"
                      className="w-full px-4 py-2.5 uppercase bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>

                  {/* IFSC */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">IFSC Code</label>
                    <div className="relative">
                      <input type="text" name="ifscCode" value={formData.bankDetails.ifscCode}
                        onChange={handleBankChange} onBlur={e => handleBankBlur("ifscCode", e.target.value)}
                        placeholder="e.g. HDFC0001234" maxLength={11}
                        className={`w-full px-4 py-2.5 pr-9 uppercase border rounded-xl text-sm font-bold outline-none transition-all
                          ${touched.ifscCode && errors.ifscCode ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                            : touched.ifscCode && !errors.ifscCode && formData.bankDetails.ifscCode ? "border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20"
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                      {touched.ifscCode && !errors.ifscCode && formData.bankDetails.ifscCode && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                    </div>
                    <FieldError msg={touched.ifscCode ? errors.ifscCode : undefined} />
                    {!errors.ifscCode && !formData.bankDetails.ifscCode && <p className="text-[10px] text-gray-400 ml-1">Format: ABCD0123456 (4 letters + 0 + 6 alphanumeric)</p>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Emergency Contact */}
            <Card title="Emergency Contact" icon={<Activity className="text-rose-500" />} padding="p-2 md:p-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Full Name</label>
                  <input type="text" name="emergencyContactName" value={formData.emergencyContactName}
                    onChange={handleChange} placeholder="Contact person"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                </div>

                {/* Emergency Mobile */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Mobile</label>
                  <div className="relative">
                    <input type="tel" name="emergencyContactMobile" value={formData.emergencyContactMobile}
                      onChange={handleChange} onBlur={e => handleBlur("emergencyContactMobile", e.target.value)}
                      placeholder="10-digit number"
                      className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm outline-none transition-all
                        ${touched.emergencyContactMobile && errors.emergencyContactMobile ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20"
                          : touched.emergencyContactMobile && !errors.emergencyContactMobile && formData.emergencyContactMobile ? "border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20"
                            : "border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20"}`} />
                    {touched.emergencyContactMobile && !errors.emergencyContactMobile && formData.emergencyContactMobile && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                  </div>
                  <FieldError msg={touched.emergencyContactMobile ? errors.emergencyContactMobile : undefined} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Relationship</label>
                  <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship}
                    onChange={handleChange} placeholder="e.g. Spouse / Parent"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                </div>
              </div>
            </Card>

            {/* Qualifications */}
            <Card title="Academic Qualifications" icon={<Globe className="text-indigo-500" />} padding="p-2 md:p-6">
              <div className="space-y-6">
                {[
                  { label: "Nursing Degrees / Diplomas", temp: tempQ, setTemp: setTempQ, type: 'qualification' as const, items: formData.qualifications, key: 'qualifications' as const, placeholder: "e.g. B.Sc Nursing, GNM" },
                  { label: "Certifications", temp: tempC, setTemp: setTempC, type: 'certification' as const, items: formData.certifications, key: 'certifications' as const, placeholder: "e.g. ACLS, BLS" },
                ].map(({ label, temp, setTemp, type, items, key, placeholder }) => (
                  <div key={type} className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{label}</label>
                    <div className="flex gap-2">
                      <input type="text" value={temp} onChange={e => setTemp(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(type))}
                        placeholder={placeholder}
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none" />
                      <button type="button" onClick={() => addItem(type)} className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map(q => (
                        <button key={q} type="button" onClick={() => removeItem(key, q)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                          {q} <span>×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Skills */}
            <Card title="Clinical Skills & Certs" icon={<FileText className="text-emerald-500" />} padding="p-2 md:p-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Add Specialized Skill</label>
                <div className="flex gap-2">
                  <input type="text" value={tempS} onChange={e => setTempS(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('skill'))}
                    placeholder="ICU, Pediatric, etc."
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 outline-none" />
                  <button type="button" onClick={() => addItem('skill')} className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map(s => (
                    <button key={s} type="button" onClick={() => removeItem('skills', s)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                      {s} <span>×</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card title="Registry Status" icon={<Activity className="text-emerald-500" />} padding="p-2 md:p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Duty Status</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-emerald-50/30 dark:bg-gray-800 border border-emerald-100 dark:border-white/10 rounded-xl text-sm font-bold text-emerald-600 outline-none transition-all">
                  <option value="active">Active Duty</option>
                  <option value="inactive">On Leave</option>
                </select>
              </div>
            </Card>

            {/* Submit */}
            <div className="pt-4 sticky bottom-6">
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} /> Confirm Registry Addition</>}
              </button>
              <button type="button" onClick={() => router.push(`/${hospitalId}${basePath}/nurses`)} disabled={loading}
                className="w-full mt-3 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                Abort Registration
              </button>
            </div>
          </div>
        </form>
      </div>
    </InfrastructureCheck>
  );
}

export default React.memo(CreateNurse);
