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
  Eye, EyeOff, Loader2, Building2
} from "lucide-react";

// ─── Validators ──────────────────────────────────────────────────────────────
const V: Record<string, (v: string) => string> = {
  name:          v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : "",
  email:         v => !v ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email — e.g. user@hospital.com" : "",
  mobile:        v => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password:      v => v && v.length < 6 ? `Too short — ${v.length}/6 chars minimum` : "",
  employeeId:    v => !v.trim() ? "Login ID is required" : "",
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
interface IFieldProps {
  label: string; name: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  error?: string; touched?: boolean; type?: string;
  placeholder?: string; required?: boolean; extraCls?: string;
  maxLength?: number; disabled?: boolean;
}
function IField({ label, name, value, onChange, onBlur, error, touched, type = "text", placeholder, required, extraCls = "", maxLength, disabled }: IFieldProps) {
  const hasErr = touched && !!error;
  const isOk   = touched && !error && value && value.toString().trim() !== "";
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
          disabled={disabled}
          autoComplete="off"
          className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all shadow-sm
            ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200" : 
              hasErr ? "border-rose-300 bg-rose-50/30 focus:ring-4 focus:ring-rose-500/5 placeholder:text-rose-300"
              : isOk  ? "border-emerald-200 bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-400"
              : "border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300"} ${extraCls}`}
        />
        {isOk && !disabled && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
        {hasErr && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none"/>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "basic", label: "Core Profile", icon: User },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "schedule", label: "Duty Schedule", icon: Clock },
  { id: "financial", label: "Financials", icon: CreditCard },
  { id: "bank", label: "Banking", icon: Landmark },
];

export default function EditHelpdesk() {
  const router = useRouter();
  const pathname = usePathname() as string;
  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const helpdeskId = params.helpdeskId as string;
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch helpdesk data
  const { data: helpdeskData, isLoading: isFetching } = useQuery({
    queryKey: ['helpdesk', helpdeskId],
    queryFn: () => hospitalAdminService.getHelpdeskById(helpdeskId)
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['hospital-shifts'],
    queryFn: () => hospitalAdminService.getShifts()
  });

  useEffect(() => {
    if (helpdeskData?.helpdesk) {
      const h = helpdeskData.helpdesk;
      setFormData({
        honorific: h.honorific || "Mr",
        name: h.name || "",
        email: h.email || "",
        mobile: h.mobile || "",
        password: "", // Keep password empty for security, only update if filled
        gender: h.gender || "",
        dateOfBirth: h.dateOfBirth ? new Date(h.dateOfBirth).toISOString().split('T')[0] : "",
        designation: h.designation || "Helpdesk",
        department: h.department || "",
        employeeId: h.employeeId || h.loginId || "",
        employmentType: h.employmentType || "full-time",
        joiningDate: h.joiningDate ? new Date(h.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        shift: h.shift?._id || h.shift || "",
        startTime: h.workingHours?.start || "09:00",
        endTime: h.workingHours?.end || "17:00",
        weeklyOff: h.weeklyOff || ["Saturday", "Sunday"],
        baseSalary: h.baseSalary?.toString() || "0",
        panNumber: h.panNumber || "",
        aadharNumber: h.aadharNumber || "",
        pfNumber: h.pfNumber || "",
        esiNumber: h.esiNumber || "",
        uanNumber: h.uanNumber || "",
        accountName: h.bankDetails?.accountName || "",
        accountNumber: h.bankDetails?.accountNumber || "",
        bankName: h.bankDetails?.bankName || "",
        ifscCode: h.bankDetails?.ifscCode || "",
        notes: h.additionalNotes || h.notes || "",
      });
    }
  }, [helpdeskData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  const set = (field: string, value: string) => {
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
      setFormData((prev: any) => ({ ...prev, [field]: value, gender }));
      if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
      return;
    }

    setFormData((p: any) => ({ ...p, [field]: value }));
    if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const blur = (field: string) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(p => ({ ...p, [field]: vld(field, formData[field]) }));
  };

  const validateStep = (stepIdx: number) => {
    const stepId = STEPS[stepIdx].id;
    const stepFields: Record<string, string[]> = {
      basic: ["honorific", "name", "mobile", "password", "email", "gender", "employeeId", "designation"],
      employment: ["joiningDate", "employmentType", "department"],
      schedule: ["shift", "startTime", "endTime"],
      financial: ["baseSalary", "panNumber", "aadharNumber", "pfNumber", "esiNumber", "uanNumber"],
      bank: ["accountName", "accountNumber", "bankName", "ifscCode"],
    };

    const requiredFields: Record<string, string[]> = {
      basic: ["name"], // Only name is strictly required for edit
      employment: [],
      schedule: [],
      financial: [],
      bank: [],
    };
    
    const fieldsToValidate = stepFields[stepId] || [];
    const requiredForThisStep = requiredFields[stepId] || [];
    
    const newErrors: Record<string, string> = { ...errors };
    const newTouched: Record<string, boolean> = { ...touched };
    let isValid = true;

    fieldsToValidate.forEach(f => {
      const val = formData[f] || "";
      const err = vld(f, val.toString());
      
      if (requiredForThisStep.includes(f) && !val.toString().trim()) {
        newErrors[f] = V[f] ? V[f]("") : "Required field";
        newTouched[f] = true;
        isValid = false;
      } else if (err) {
        newErrors[f] = err;
        newTouched[f] = true;
        isValid = false;
      } else {
        delete newErrors[f];
      }
    });

    setErrors(newErrors);
    setTouched(newTouched);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep < STEPS.length - 1) setActiveStep(s => s + 1);
    } else {
      toast.error("Please provide valid information for all required fields");
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all steps before submission
    let allValid = true;
    for (let i = 0; i < STEPS.length; i++) {
      if (!validateStep(i)) {
        allValid = false;
        setActiveStep(i); // Jump to the first invalid step
        break;
      }
    }
    
    if (!allValid) {
      toast.error("Please fix the errors before saving");
      return;
    }

    try {
      setLoading(true);
      
      // Prepare a clean payload
      const { 
        accountName, accountNumber, bankName, ifscCode, 
        startTime, endTime, 
        password,
        ...rest 
      } = formData;

      const updatePayload = {
        ...rest,
        loginId: formData.employeeId, // Ensure loginId matches employeeId
        bankDetails: { 
          accountName, 
          accountNumber, 
          bankName, 
          ifscCode 
        },
        workingHours: { start: startTime, end: endTime }
      };
      
      // Only include password if explicitly changed
      if (password && password.length >= 6) {
        updatePayload.password = password;
      }

      await hospitalAdminService.updateHelpdesk(helpdeskId, updatePayload);
      
      toast.success("Helpdesk profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', helpdeskId] });
      router.push(`/${hospitalId}${basePath}/helpdesks`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update helpdesk profile");
    } finally {
      setLoading(false);
    }
  };

  if (isFetching || !formData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Retrieving helpdesk profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between px-4 md:px-0">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-slate-50 transition-all">
                <ArrowLeft size={16}/>
              </div>
              <span className="text-sm font-semibold tracking-wide">Back to Staff List</span>
            </button>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Editing Mode</span>
            </div>
          </div>

          <div className="space-y-1 px-4 md:px-0">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-500/20">
                <Headphones size={22}/>
              </div>
              Update Front Desk Profile
            </h1>
            <p className="text-slate-500 text-sm max-w-xl">
              Modify credentials, schedules, and financial records for <span className="font-bold text-slate-700">{formData.name}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4 md:px-0">
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
                      if (idx <= activeStep || validateStep(activeStep)) setActiveStep(idx);
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

            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-6 md:p-8">
                
                <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      {React.createElement(STEPS[activeStep].icon, { size: 24 })}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight">{STEPS[activeStep].label}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide font-mono">EDITING_MODE: {STEPS[activeStep].id.toUpperCase()}</p>
                        <span className="text-[10px] text-blue-500 font-bold px-1.5 py-0.5 bg-blue-50 rounded-md">Step {activeStep + 1} of {STEPS.length}</span>
                      </div>
                    </div>
                  </div>

                  {activeStep === 0 && (
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
                        error={errors.email} touched={touched.email} required type="email" placeholder="email@hospital.com"/>

                      <IField label="Login ID / Employee ID" name="employeeId" value={formData.employeeId} onChange={v=>set('employeeId',v)} onBlur={()=>blur('employeeId')}
                        error={errors.employeeId} touched={touched.employeeId} required placeholder="e.g. HELP-101" extraCls="font-mono font-bold"/>

                      <IField label="Staff Designation" name="designation" value={formData.designation} onChange={v=>set('designation',v)} onBlur={()=>blur('designation')}
                        error={errors.designation} touched={touched.designation} required placeholder="e.g. Front Desk Lead"/>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between">
                          <span>Update Password (Optional)</span>
                          {touched.password && errors.password && <span className="text-rose-500 text-[10px] lowercase italic font-normal">{errors.password}</span>}
                        </label>
                        <div className="relative">
                          <input type={showPassword?"text":"password"} value={formData.password}
                            onChange={e=>set('password',e.target.value)} onBlur={()=>blur('password')}
                            placeholder="Leave empty to keep current"
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

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Date of Birth</label>
                        <input type="date" value={formData.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium uppercase"/>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Department / Unit</label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input type="text" value={formData.department} onChange={e=>set('department',e.target.value)}
                            placeholder="e.g. Reception / Billing"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all font-medium"/>
                        </div>
                      </div>

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

                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Additional Notes</label>
                        <textarea 
                          value={formData.notes} 
                          onChange={e => set('notes', e.target.value)}
                          placeholder="Internal notes regarding staff performance or background..."
                          className="w-full mt-1.5 px-4 py-3 min-h-[100px] bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="space-y-8">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Assigned Work Shift</label>
                        <select 
                          value={formData.shift}
                          onChange={e => {
                            const s = (shifts as any[]).find(s => s._id === e.target.value);
                            setFormData((p: any) => ({ ...p, shift: e.target.value, startTime: s?.startTime||p.startTime, endTime: s?.endTime||p.endTime }));
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
                          <input type="time" value={formData.startTime} onChange={e=>set('startTime', e.target.value)} className="bg-transparent border-none outline-none text-lg font-bold text-slate-800 w-full"/>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift End</p>
                          <input type="time" value={formData.endTime} onChange={e=>set('endTime', e.target.value)} className="bg-transparent border-none outline-none text-lg font-bold text-slate-800 w-full"/>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Weekly Rest Days</label>
                        <div className="flex flex-wrap gap-2">
                          {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => (
                            <button 
                              key={day} type="button" 
                              onClick={() => setFormData((p: any) => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter((d: string) => d !== day) : [...p.weeklyOff, day] }))}
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

                  {activeStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Monthly Gross Salary (INR)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">₹</div>
                          <input type="text" value={formData.baseSalary} onChange={e=>set('baseSalary',e.target.value)} placeholder="0"
                            className="w-full pl-16 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all"/>
                        </div>
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

                  {activeStep === 4 && (
                    <div className="space-y-6">
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
                    </div>
                  )}

                </div>

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
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                      >
                        {loading ? "Updating Profile..." : "Save Changes"}
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
      </div>
  );
}
