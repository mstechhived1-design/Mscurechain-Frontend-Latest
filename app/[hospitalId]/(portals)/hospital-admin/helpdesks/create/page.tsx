"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Headphones, ArrowLeft, CheckCircle2, AlertCircle, 
  ChevronRight, ChevronLeft, CreditCard, Landmark, 
  User, Briefcase, Clock, ShieldCheck, 
  Eye, EyeOff, Copy, Check
} from "lucide-react";
import { Modal } from "@/components/admin";
import { InfrastructureCheck } from "../../components/InfrastructureCheck";

// ─── Validators ──────────────────────────────────────────────────────────────
const V: Record<string, (v: string) => string> = {
  name:          v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : "",
  email:         v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email — e.g. user@hospital.com" : "",
  mobile:        v => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password:      v => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 chars minimum` : "",
  employeeId:    v => !v.trim() ? "Employee Id is required" : "",
  designation:   v => !v.trim() ? "Designation is required" : "",
  panNumber:     v => v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Invalid PAN — e.g. ABCDE1234F" : "",
  aadharNumber:  v => v && v.length !== 12 ? `${v.length}/12 digits — must be exactly 12` : "",
  accountNumber: v => {
    if (!v) return "";
    if (!/^\d+$/.test(v)) return "Account number must contain only digits";
    if (v.length < 9 || v.length > 18) return "Must be 9–18 digits";
    return "";
  },
  ifscCode:      v => {
    if (!v) return "";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())) {
      if (v.length >= 5 && v[4] !== '0') return "5th character must be '0'";
      return "Invalid format — e.g. HDFC0001234";
    }
    return "";
  },
};

const vld = (f: string, v: string) => V[f] ? V[f](v) : "";

// ─── Tiny Components ──────────────────────────────────────────────────────────
function FErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={11}/>{msg}</p>;
}

interface IFieldProps {
  label: string; name: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  error?: string; touched?: boolean; type?: string;
  placeholder?: string; required?: boolean; extraCls?: string;
  maxLength?: number;
}
function IField({ label, name, value, onChange, onBlur, error, touched, type = "text", placeholder, required, extraCls = "", maxLength }: IFieldProps) {
  const hasErr = touched && !!error;
  const isOk   = touched && !error && value.trim() !== "";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between">
        <span>{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</span>
        {hasErr && <span className="text-rose-500 text-[10px] lowercase italic font-normal">{error}</span>}
      </label>
      <div className="relative">
        <input
          type={type} name={name} value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all shadow-sm
            ${hasErr ? "border-rose-300 bg-rose-50/30 focus:ring-4 focus:ring-rose-500/5 placeholder:text-rose-300"
              : isOk  ? "border-emerald-200 bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-400"
              : "border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300"}`}
        />
        {isOk && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
        {hasErr && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none"/>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "basic", label: "Basic Info", icon: User },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "schedule", label: "Duty Schedule", icon: Clock },
  { id: "financial", label: "Financials", icon: CreditCard },
  { id: "bank", label: "Banking", icon: Landmark },
];

const EMPTY_FORM = () => ({
  honorific: "Mr", name: "", email: "", mobile: "", password: "", gender: "", dateOfBirth: "",
  designation: "Helpdesk", employeeId: "", employmentType: "full-time",
  joiningDate: new Date().toISOString().split('T')[0],
  shift: "", startTime: "09:00", endTime: "17:00",
  weeklyOff: ["Saturday", "Sunday"] as string[],
  baseSalary: "0", panNumber: "", aadharNumber: "",
  pfNumber: "", esiNumber: "", uanNumber: "",
  accountName: "", accountNumber: "", bankName: "", ifscCode: "",
  notes: "",
});

export default function CreateHelpdesk() {
  const router = useRouter();
  const pathname = usePathname() as string;
  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: shifts = [] } = useQuery({
    queryKey: ['hospital-shifts'],
    queryFn: () => hospitalAdminService.getShifts()
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  const set = (field: string, value: string) => {
    // Input-level masks/guards
    if (field === 'mobile' && !/^\d{0,10}$/.test(value)) return;
    if (field === 'aadharNumber' && !/^\d{0,12}$/.test(value)) return;
    if (field === 'accountNumber' && !/^\d{0,18}$/.test(value)) return;
    if (field === 'panNumber' && value.length > 10) return;
    if (field === 'ifscCode' && value.length > 11) return;
    if (field === 'baseSalary' && !/^\d*$/.test(value)) return;

    if (field === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [field]: value, gender }));
      if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
      return;
    }

    setFormData(p => ({ ...p, [field]: value }));
    if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const blur = (field: string) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(p => ({ ...p, [field]: vld(field, (formData as any)[field]) }));
  };

  const validateStep = (stepIdx: number) => {
    const stepId = STEPS[stepIdx].id;
    
    // Define which fields belong to which step for full validation
    const stepFields: Record<string, string[]> = {
      basic: ["honorific", "name", "mobile", "password", "email", "gender", "dateOfBirth"],
      employment: ["designation", "employeeId", "joiningDate", "employmentType"],
      schedule: ["shift", "startTime", "endTime"],
      financial: ["baseSalary", "panNumber", "aadharNumber", "pfNumber", "esiNumber", "uanNumber"],
      bank: ["accountName", "accountNumber", "bankName", "ifscCode"],
    };

    const requiredFields: Record<string, string[]> = {
      basic: ["honorific", "name", "mobile", "password"],
      employment: ["designation", "employeeId"],
      schedule: [],
      financial: [],
      bank: ["accountNumber", "ifscCode"],
    };
    
    const fieldsToValidate = stepFields[stepId] || [];
    const requiredForThisStep = requiredFields[stepId] || [];
    
    const newErrors: Record<string, string> = { ...errors };
    const newTouched: Record<string, boolean> = { ...touched };
    let isValid = true;

    fieldsToValidate.forEach(f => {
      const val = (formData as any)[f] || "";
      const err = vld(f, val);
      
      // If it's a required field and empty, it's definitely an error
      if (requiredForThisStep.includes(f) && !val.trim()) {
        newErrors[f] = V[f] ? V[f]("") : "Required field";
        newTouched[f] = true;
        isValid = false;
      } 
      // If it has a value, check the validator
      else if (err) {
        newErrors[f] = err;
        newTouched[f] = true;
        isValid = false;
      }
      // Otherwise, clear previous error for this field
      else {
        delete newErrors[f];
      }
    });

    setErrors(newErrors);
    setTouched(newTouched);
    return isValid;
  };

  const handleNext = () => {
    const stepId = STEPS[activeStep].id;
    const isValid = validateStep(activeStep);
    
    if (isValid) {
      if (activeStep < STEPS.length - 1) setActiveStep(s => s + 1);
    } else {
      // Find which fields actually have errors for better feedback
      const stepFields: Record<string, string[]> = {
        basic: ["name", "mobile", "password", "email", "gender", "dateOfBirth"],
        employment: ["designation", "employeeId", "joiningDate", "employmentType"],
        schedule: ["shift", "startTime", "endTime"],
        financial: ["baseSalary", "panNumber", "aadharNumber", "pfNumber", "esiNumber", "uanNumber"],
        bank: ["accountName", "accountNumber", "bankName", "ifscCode"],
      };
      
      const currentFields = stepFields[stepId] || [];
      const missing = currentFields.filter(f => !!vld(f, (formData as any)[f] || ""));
      
      if (missing.length > 0) {
        toast.error(`Please fix: ${missing.map(m => m.charAt(0).toUpperCase() + m.slice(1).replace(/([A-Z])/g, ' $1')).join(', ')}`);
      } else {
        toast.error("Please provide valid information for all required fields");
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);
      const loginId = formData.employeeId || `HUB-${Math.floor(1000 + Math.random() * 9000)}`;
      const resp: any = await hospitalAdminService.createHelpdesk({
        ...formData,
        loginId,
        additionalNotes: formData.notes,
        bankDetails: { 
          accountName: formData.accountName, 
          accountNumber: formData.accountNumber, 
          bankName: formData.bankName, 
          ifscCode: formData.ifscCode 
        },
        workingHours: { start: formData.startTime, end: formData.endTime }
      });
      
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
      setCreatedCreds({ name: resp?.helpdesk?.name || formData.name, loginId, password: formData.password });
      setIsCredModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create helpdesk account");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (val: string, label: string, fieldKey: string) => {
    navigator.clipboard.writeText(val).then(() => {
      toast.success(label);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <InfrastructureCheck>
      <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 space-y-6">
        {/* Dynamic Header */}
        <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6 mt-4 md:mt-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            
            {/* Left side: Back button and Title */}
            <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group px-2"
                title="Back to Staff List"
              >
                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-all">
                  <ArrowLeft size={14}/>
                </div>
              </button>

              <div className="shrink-0 flex items-center gap-2 px-1">
                <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Headphones className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                    Create Front Desk
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                    Configure a new front-desk operative with credentials and duty schedules
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Badge */}
            <div className="flex items-center justify-end w-full xl:w-auto shrink-0 relative">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">New Registration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-step Container */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-2">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isComp = activeStep > idx;
                const isAct = activeStep === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (idx < activeStep) setActiveStep(idx);
                      else if (idx === activeStep + 1) handleNext();
                      else if (idx === activeStep) return;
                      else toast.error("Please complete the current step first");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group
                      ${isAct ? "bg-white border-blue-200 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/10" : 
                        isComp ? "bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:bg-emerald-50" :
                        "bg-transparent border-transparent text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-50"}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border
                      ${isAct ? "bg-blue-600 text-white border-blue-500" : 
                        isComp ? "bg-emerald-500 text-white border-emerald-400" :
                        "bg-white text-slate-400 border-slate-200"}`}>
                      {isComp ? <CheckCircle2 size={16}/> : <Icon size={16}/>}
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1
                        ${isAct ? "text-blue-600" : isComp ? "text-emerald-500" : "text-slate-400"}`}>
                        Step 0{idx + 1}
                      </p>
                      <p className={`text-sm font-bold ${isAct ? "text-slate-800" : "text-inherit"}`}>
                        {step.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form Area */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-6 md:p-8">
                
                <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Section Header */}
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      {React.createElement(STEPS[activeStep].icon, { size: 24 })}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight">{STEPS[activeStep].label}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide font-mono">STEP_ID: {STEPS[activeStep].id.toUpperCase()}</p>
                        <span className="text-[10px] text-blue-500 font-bold px-1.5 py-0.5 bg-blue-50 rounded-md">Step {activeStep + 1} of {STEPS.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* FORM FIELDS PER TAB */}
                  {activeStep === 0 && ( /* BASIC INFO */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Honorific<span className="text-rose-500 ml-0.5">*</span></label>
                        <select value={formData.honorific} onChange={e=>set('honorific',e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium">
                          <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                        </select>
                      </div>
                      <IField label="Full Name" name="name" value={formData.name} onChange={v=>set('name',v)} onBlur={()=>blur('name')}
                        error={errors.name} touched={touched.name} required placeholder="e.g. Ramesh Kumar"/>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Gender</label>
                        <select value={formData.gender} onChange={e=>set('gender',e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium">
                          <option value="">Select Gender</option>
                          <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                        </select>
                      </div>

                      <IField label="Mobile Number" name="mobile" value={formData.mobile} onChange={v=>set('mobile',v)} onBlur={()=>blur('mobile')}
                        error={errors.mobile} touched={touched.mobile} required type="tel" placeholder="10-digit mobile number"/>
                      
                      <IField label="Email Address" name="email" value={formData.email} onChange={v=>set('email',v)} onBlur={()=>blur('email')}
                        error={errors.email} touched={touched.email} type="email" placeholder="email@hospital.com"/>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Date of Birth</label>
                        <input type="date" value={formData.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium uppercase"/>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between">
                          <span>Account Password <span className="text-rose-500">*</span></span>
                          {touched.password && errors.password && <span className="text-rose-500 text-[10px] lowercase italic font-normal">{errors.password}</span>}
                        </label>
                        <div className="relative">
                          <input type={showPassword?"text":"password"} value={formData.password}
                            onChange={e=>set('password',e.target.value)} onBlur={()=>blur('password')}
                            placeholder="Min 6 characters"
                            autoComplete="new-password"
                            className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm outline-none transition-all shadow-sm
                              ${touched.password && errors.password ? "border-rose-300 bg-rose-50/30 ring-rose-500/5" : 
                                touched.password && !errors.password && formData.password ? "border-emerald-200 ring-emerald-500/5" : 
                                "border-slate-200 ring-blue-500/5 focus:border-blue-300"}`}
                          />
                          <button type="button" onClick={()=>setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && ( /* EMPLOYMENT */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <IField label="Designation" name="designation" value={formData.designation} onChange={v=>set('designation',v)} onBlur={()=>blur('designation')}
                        error={errors.designation} touched={touched.designation} required placeholder="e.g. Front Desk Lead"/>
                      
                      <IField label="Internal Employee ID" name="employeeId" value={formData.employeeId} onChange={v=>set('employeeId',v)} onBlur={()=>blur('employeeId')}
                        error={errors.employeeId} touched={touched.employeeId} required
                        placeholder="e.g. HUB-2024-001"/>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Joining Date</label>
                        <input type="date" value={formData.joiningDate} onChange={e=>set('joiningDate',e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium uppercase"/>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Employment Type</label>
                        <select value={formData.employmentType} onChange={e=>set('employmentType',e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium">
                          <option value="full-time">Full-Time (On-Roll)</option>
                          <option value="part-time">Part-Time</option>
                          <option value="contract">Trainee / Intern</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && ( /* SCHEDULE */
                    <div className="space-y-8">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Assigned Work Shift</label>
                        <select 
                          value={formData.shift}
                          onChange={e => {
                            const s = (shifts as any[]).find(s => s._id === e.target.value);
                            setFormData(p => ({ ...p, shift: e.target.value, startTime: s?.startTime||"09:00", endTime: s?.endTime||"17:00" }));
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-semibold"
                        >
                          <option value="">No fixed shift template</option>
                          {(shifts as any[]).map(s => (
                            <option key={s._id} value={s._id}>{s.name} ({s.startTime} - {s.endTime})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift Start</p>
                          <p className="text-lg font-bold text-slate-800">{formData.startTime}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift End</p>
                          <p className="text-lg font-bold text-slate-800">{formData.endTime}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Weekly Rest Days</label>
                        <div className="flex flex-wrap gap-2">
                          {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => (
                            <button 
                              key={day} type="button" 
                              onClick={() => setFormData(p => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d => d !== day) : [...p.weeklyOff, day] }))}
                              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all
                                ${formData.weeklyOff.includes(day) ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : 
                                "bg-white border-slate-200 text-slate-500 hover:border-blue-300"}`}>
                              {day.substring(0,3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && ( /* FINANCIAL */
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Monthly Gross Salary (INR)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">₹</div>
                          <input type="text" value={formData.baseSalary} onChange={e=>set('baseSalary',e.target.value)} placeholder="0"
                            className="w-full pl-16 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all"/>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">Fixed monthly compensation before deductions.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <IField label="PAN Card Number" name="panNumber" value={formData.panNumber} onChange={v=>set('panNumber',v.toUpperCase())} onBlur={()=>blur('panNumber')}
                          error={errors.panNumber} touched={touched.panNumber} placeholder="ABCDE1234F" maxLength={10} extraCls="uppercase font-mono"/>
                        
                        <IField label="Aadhar Card Number" name="aadharNumber" value={formData.aadharNumber} onChange={v=>set('aadharNumber',v)} onBlur={()=>blur('aadharNumber')}
                          error={errors.aadharNumber} touched={touched.aadharNumber} placeholder="12-digit UID" maxLength={12} extraCls="font-mono"/>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50 pt-6">
                        <div className="space-y-1.5 text-slate-500">
                          <label className="text-[10px] font-bold uppercase tracking-widest">EPF Account No. (Optional)</label>
                          <input type="text" value={formData.pfNumber} onChange={e=>set('pfNumber',e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-300 transition-all"/>
                        </div>
                        <div className="space-y-1.5 text-slate-500">
                          <label className="text-[10px] font-bold uppercase tracking-widest">ESI Account No. (Optional)</label>
                          <input type="text" value={formData.esiNumber} onChange={e=>set('esiNumber',e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-300 transition-all"/>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 4 && ( /* BANKING */
                    <div className="space-y-6">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Salary Disbursement account</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <IField label="Beneficiary Name" name="accountName" value={formData.accountName} onChange={v=>set('accountName',v)}
                          placeholder="Name as per Passbook" extraCls="uppercase font-semibold"/>
                        
                        <IField label="Bank Account Number" name="accountNumber" value={formData.accountNumber} onChange={v=>set('accountNumber',v)} onBlur={()=>blur('accountNumber')}
                          error={errors.accountNumber} touched={touched.accountNumber} required placeholder="9–18 digit Account No." extraCls="font-bold tracking-widest"/>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <IField label="Banking Institution" name="bankName" value={formData.bankName} onChange={v=>set('bankName',v)}
                          placeholder="e.g. STATE BANK OF INDIA" extraCls="uppercase font-semibold"/>
                        
                        <IField label="IFSC Routing Code" name="ifscCode" value={formData.ifscCode} onChange={v=>set('ifscCode',v.toUpperCase())} onBlur={()=>blur('ifscCode')}
                          error={errors.ifscCode} touched={touched.ifscCode} required placeholder="11-character IFSC" maxLength={11} extraCls="uppercase font-bold tracking-wider font-mono"/>
                      </div>

                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 italic">
                        <AlertCircle size={20} className="text-amber-500 shrink-0"/>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Ensure account details are strictly verified against original documents. Incorrect disbursement details might lead to settlement delays.
                        </p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Action Bar */}
                <div className="mt-auto pt-10 pb-4 flex justify-between items-center border-t border-slate-100 mb-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all
                      ${activeStep === 0 ? "opacity-0 pointer-events-none" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <ChevronLeft size={18}/> Back
                  </button>
                  
                  <div className="flex gap-4">
                    {activeStep === STEPS.length - 1 ? (
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                      >
                        {loading ? "Creating Account..." : "Confirm & Initialize"}
                        {!loading && <ShieldCheck size={18}/>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                      >
                        Continue to Next Step
                        <ChevronRight size={18}/>
                      </button>
                    ) }
                  </div>
                </div>
              </form>
            </div>

          </div>
        </div>

        {/* ─── SUCCESS MODAL ─── */}
        <Modal 
          isOpen={isCredModalOpen} 
          onClose={() => {
            setIsCredModalOpen(false);
            router.push(`/${hospitalId}${basePath}/helpdesks`);
          }} 
          title="Account Initialized" 
          maxWidth="max-w-md"
        >
          <div className="pt-2 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-2">
                <ShieldCheck size={32}/>
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Access Credentials Ready!</h3>
              <p className="text-xs text-slate-500 max-w-[280px]">Secure credentials generated for {createdCreds?.name}. Save these details now.</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 group transition-all hover:border-blue-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Identifier</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold text-slate-800 tracking-wider font-mono">{createdCreds?.loginId}</span>
                  <button onClick={() => copyToClipboard(createdCreds?.loginId, "Login ID Copied", "loginId")}
                    className={`p-2 rounded-lg transition-all ${copiedField === 'loginId' ? "bg-emerald-100 text-emerald-600" : "bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"}`}>
                    {copiedField === 'loginId' ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-2 group transition-all hover:border-amber-200">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Account Password</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold text-slate-800 tracking-wider">
                    {showPassword ? createdCreds?.password : "••••••••"}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                    <button onClick={() => copyToClipboard(createdCreds?.password, "Password Copied", "password")}
                      className={`p-2 rounded-lg transition-all ${copiedField === 'password' ? "bg-emerald-100 text-emerald-600" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-100/50"}`}>
                      {copiedField === 'password' ? <Check size={16}/> : <Copy size={16}/>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
               onClick={() => {
                 const text = `Name: ${createdCreds?.name}\nLogin ID: ${createdCreds?.loginId}\nPassword: ${createdCreds?.password}`;
                 copyToClipboard(text, "All Credentials Copied", "all");
               }}
               className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              {copiedField === 'all' ? <><Check size={16}/> All Details Copied</> : <><Copy size={16}/> Copy All as Text</>}
            </button>

            <button 
              onClick={() => {
                setIsCredModalOpen(false);
                router.push(`/${hospitalId}${basePath}/helpdesks`);
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all"
            >
              Complete Setup & Finish
            </button>
          </div>
        </Modal>

    </InfrastructureCheck>
  );
}
