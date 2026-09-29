"use client";

import React, { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
  UserPlus, Eye, EyeOff, IndianRupee, User, Mail,
  Briefcase, FileText, Award, Image as ImageIcon, MapPin,
  Clock, CreditCard, Globe, Landmark, AlertCircle, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";
import type { CreateDoctorRequest } from "@/lib/integrations/types";
import { TagInput } from "@/components/common/TagInput";
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from "@/lib/constants/medicalData";
import { InfrastructureCheck } from "../../components/InfrastructureCheck";
import { formatDoctorName, cleanDoctorName } from "@/lib/utils/name-utils";

type Errors = Partial<Record<string, string>>;
const docValidators: Record<string, (v: string) => string> = {
  name:  v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens allowed" : "",
  email: v => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email — e.g. doctor@hospital.com" : "",
  mobile: v => v.length === 0 ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password: v => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 chars minimum` : "",
  medicalRegistrationNumber: v => !v.trim() ? "Medical Registration Number is mandatory" : "",
  employeeId: v => !v.trim() ? "Employee ID is required" : "",
  consultationFee: v => !v || parseInt(v) <= 0 ? "Consultation fee is required" : "",
  pincode: v => v && v.length !== 6 ? `${v.length}/6 digits` : "",
  panNumber: v => v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Invalid PAN — e.g. ABCDE1234F" : "",
  aadharNumber: v => v && v.length !== 12 ? `${v.length}/12 digits — must be exactly 12` : "",
  ifscCode: v => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? "Invalid IFSC — e.g. HDFC0001234" : "",
  accountNumber: v => v && (v.length < 9 || v.length > 18) ? "Must be 9–18 digits" : "",
};
const dValidate = (n: string, v: string) => docValidators[n] ? docValidators[n](v) : "";
function DErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={12}/>{msg}</p>;
}
function DField({ label, name, value, onChange, onBlur, error, touched, type="text", placeholder, required, extraClass="" }: {
  label:string;name:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
  onBlur?:(e:React.FocusEvent<HTMLInputElement>)=>void;error?:string;touched?:boolean;
  type?:string;placeholder?:string;required?:boolean;extraClass?:string;
}) {
  const hasErr=touched&&!!error,isOk=touched&&!error&&value.trim()!=="";
  return(
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" style={{color:'var(--text-color)'}}>{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          className={`w-full px-4 py-3 pr-9 rounded-xl border focus:outline-none focus:ring-2 transition-all ${extraClass} ${hasErr?"border-rose-400 bg-rose-50/20 focus:ring-rose-400/20":isOk?"border-emerald-400 focus:ring-emerald-400/20":"focus:ring-blue-500"}`}
          style={hasErr?{}:isOk?{borderColor:'#34d399',backgroundColor:'var(--card-bg)',color:'var(--text-color)'}:{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:'var(--border-color)'}}/>
        {isOk&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
      </div>
      <DErr msg={hasErr?error:undefined}/>
    </div>
  );
}

// Constants
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

const HONORIFIC_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" }
];

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", 
  "Friday", "Saturday", "Sunday"
];

interface DoctorFormData {
  // Personal
  honorific: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  gender: string;
  dateOfBirth: string;
  
  // Address
  street: string;
  city: string;
  state: string;
  pincode: string;
  
  // Professional
  specialties: string[];
  qualifications: string[];
  medicalRegistrationNumber: string;
  registrationCouncil: string;
  registrationYear: string;
  registrationExpiryDate: string;
  experienceStart: string;
  employeeId: string;
  consultationFee: string;
  consultationDuration: string;
  maxAppointmentsPerDay: string;
  bio: string;
  languages: string[];
  awards: string[];
  
  // Bank & Payroll
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode: string;
  panNumber: string;
  aadharNumber: string;
  baseSalary: string;
  pfNumber: string;
  esiNumber: string;
  uanNumber: string;
}

interface AvailabilitySlot {
  days: string[];
  startTime: string;
  breakStart: string;
  breakEnd: string;
  endTime: string;
}

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

function CreateDoctor() {
  const router = useRouter();
  const params = useParams() as any;
  const pathname = usePathname() as string;
  const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
  const hospitalId = params.hospitalId as string;
  const queryClient = useQueryClient();
  
  const { data: metadata } = useQuery({
    queryKey: ["hospital-metadata"],
    queryFn: () => hospitalAdminService.getHospitalMetadata()
  });
  
  const [formData, setFormData] = useState<DoctorFormData>({
    honorific: "Dr", name: "", email: "", mobile: "", password: "", gender: "",
    dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    specialties: [], qualifications: [],
    medicalRegistrationNumber: "",
    registrationCouncil: "National Medical Commission (NMC)",
    registrationYear: "",
    registrationExpiryDate: "",
    experienceStart: "",
    employeeId: "",
    consultationFee: "", consultationDuration: "15",
    maxAppointmentsPerDay: "20",
    bio: "",
    languages: [],
    awards: [],
    bankName: "", accountNumber: "", accountName: "", ifscCode: "",
    baseSalary: "", panNumber: "", aadharNumber: "", pfNumber: "", esiNumber: "", uanNumber: ""
  });

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string,boolean>>({});

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([
    { days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }
  ]);

  const [tempAward, setTempAward] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlur = (n: string, v: string) => {
    setTouched(p => ({ ...p, [n]: true }));
    setErrors(p => ({ ...p, [n]: dValidate(n, v) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Restrictions
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "registrationYear" && !/^\d{0,4}$/.test(value)) return;
    if (name === "aadharNumber" && !/^\d{0,12}$/.test(value)) return;
    if (name === "accountNumber" && !/^\d{0,18}$/.test(value)) return;
    if (name === "panNumber" && value.length > 10) return;
    if (name === "ifscCode" && value.length > 11) return;
    
    if (["consultationFee", "maxAppointmentsPerDay", "consultationDuration", "baseSalary"].includes(name) && !/^\d*$/.test(value)) return;
    
    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      if (touched[name]) setErrors(p => ({ ...p, [name]: dValidate(name, value) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(p => ({ ...p, [name]: dValidate(name, value) }));
  };


  const removeAward = (item: string) => {
    setFormData(prev => ({
      ...prev,
      awards: prev.awards.filter((i: string) => i !== item)
    }));
  };

  const addAvailabilitySlot = () => {
    setAvailability([...availability, { 
      days: [], startTime: "09:00", breakStart: "13:00", 
      breakEnd: "14:00", endTime: "17:00" 
    }]);
  };

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const toggleDay = (slotIndex: number, day: string) => {
    const updated = [...availability];
    const days = updated[slotIndex].days;
    if (days.includes(day)) {
      updated[slotIndex].days = days.filter(d => d !== day);
    } else {
      updated[slotIndex].days = [...days, day];
    }
    setAvailability(updated);
  };

  const touchAll = () => {
    const fields = ["name","email","mobile","password","medicalRegistrationNumber","employeeId","consultationFee","panNumber","aadharNumber","ifscCode","accountNumber","pincode"];
    const nt: Record<string,boolean> = {}, ne: Errors = {};
    fields.forEach(f => { nt[f]=true; ne[f]=dValidate(f,(formData as any)[f]??""); });
    // extra checks
    if (!formData.gender) ne["gender"] = "Please select gender";
    if (formData.specialties.length === 0) ne["specialties"] = "At least one specialty is required";
    if (!formData.experienceStart) ne["experienceStart"] = "Experience start date is required";
    setTouched(p => ({ ...p, ...nt }));
    setErrors(p => ({ ...p, ...ne }));
    return Object.values(ne).every(e => !e);
  };

  const validateForm = (): boolean => touchAll();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { toast.error("Please fix the highlighted errors before submitting"); return; }

    setLoading(true);

    try {
      const sanitizedName = cleanDoctorName(formData.name);
      const doctorData: any = {
        honorific: formData.honorific,
        name: sanitizedName,
        email: formData.email.trim(),
        mobile: formData.mobile,
        password: formData.password,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        
        address: formData.street || formData.city ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India"
        } : undefined,
        
        specialties: formData.specialties,
        qualifications: formData.qualifications,
        medicalRegistrationNumber: formData.medicalRegistrationNumber.trim(),
        registrationCouncil: formData.registrationCouncil,
        registrationYear: formData.registrationYear ? parseInt(formData.registrationYear) : undefined,
        registrationExpiryDate: formData.registrationExpiryDate || undefined,
        experienceStart: formData.experienceStart,
        
        employeeId: formData.employeeId || undefined,
        
        consultationFee: parseInt(formData.consultationFee),
        consultationDuration: parseInt(formData.consultationDuration) || 15,
        maxAppointmentsPerDay: formData.maxAppointmentsPerDay ? parseInt(formData.maxAppointmentsPerDay) : undefined,
        availability: availability.filter(slot => slot.days.length > 0),
        
        
        bio: formData.bio,
      languages: formData.languages,
      awards: formData.awards,
      
      // Bank & Payroll
      bankDetails: {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        ifscCode: formData.ifscCode
      },
      panNumber: formData.panNumber,
      aadharNumber: formData.aadharNumber,
      baseSalary: formData.baseSalary ? Number(formData.baseSalary) : undefined,
      pfNumber: formData.pfNumber,
      esiNumber: formData.esiNumber,
      uanNumber: formData.uanNumber
    };

      await hospitalAdminService.createDoctor(doctorData);
      
      toast.success(`Doctor "${formData.name}" created successfully!`, { duration: 4000 });
      
      queryClient.invalidateQueries({ queryKey: ['hospital-admin-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-admin', 'doctors-list'] });

      router.push(`/${hospitalId}${basePath}/doctors`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create doctor", { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfrastructureCheck>
      <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 space-y-6">
        {/* Dynamic Header */}
        <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
              <div className="shrink-0 flex items-center gap-2 px-1">
                <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                    Create New Doctor
                  </h1>
                  <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                    Complete doctor profile with medical registration and professional details
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* 1. Personal Information */}
          <Card title="Personal Information" icon={<User className="text-blue-500" />} padding="p-2 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--text-color)'}}>Honorific<span className="text-red-500 ml-0.5">*</span></label>
                <select name="honorific" value={formData.honorific} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:'var(--border-color)'}}>
                  {HONORIFIC_OPTIONS.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <DField label="Full Name" name="name" value={formData.name} onChange={handleChange}
                onBlur={e=>handleBlur("name",e.target.value)} error={errors.name} touched={touched.name}
                required placeholder="Dr. John Smith"/>
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--text-color)'}}>Gender<span className="text-red-500 ml-0.5">*</span></label>
                <select name="gender" value={formData.gender} onChange={handleChange} required
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${touched.gender&&errors.gender?"border-rose-400 bg-rose-50/20":""}`}
                  style={{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:touched.gender&&errors.gender?undefined:'var(--border-color)'}}>
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {touched.gender&&errors.gender&&<p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={12}/>{errors.gender}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--text-color)'}}>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:'var(--border-color)'}}/>
              </div>
            </div>
          </Card>

          {/* 2. Contact Information */}
          <Card title="Contact Information" icon={<Mail className="text-green-500" />} padding="p-2 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <DField label="Email Address" name="email" value={formData.email} onChange={handleChange}
                onBlur={e=>handleBlur("email",e.target.value)} error={errors.email} touched={touched.email}
                required type="email" placeholder="doctor@hospital.com"/>
              <DField label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange}
                onBlur={e=>handleBlur("mobile",e.target.value)} error={errors.mobile} touched={touched.mobile}
                required type="tel" placeholder="10-digit mobile"/>
              <div className="relative space-y-1.5">
                <label className="block text-sm font-medium" style={{color:'var(--text-color)'}}>Password<span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <input type={showPassword?"text":"password"} name="password" value={formData.password}
                    onChange={handleChange} onBlur={e=>handleBlur("password",e.target.value)} placeholder="Min 6 characters"
                    className={`w-full px-4 py-3 pr-10 rounded-xl border focus:outline-none focus:ring-2 transition-all ${touched.password&&errors.password?"border-rose-400 bg-rose-50/20 focus:ring-rose-400/20":touched.password&&!errors.password&&formData.password?"border-emerald-400 focus:ring-emerald-400/20":"focus:ring-blue-500"}`}
                    style={touched.password&&!errors.password&&formData.password?{borderColor:'#34d399',backgroundColor:'var(--card-bg)',color:'var(--text-color)'}:{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:touched.password&&errors.password?undefined:'var(--border-color)'}}/>
                  <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                </div>
                <DErr msg={touched.password?errors.password:undefined}/>
                {touched.password&&!errors.password&&formData.password&&<p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1"><CheckCircle2 size={12}/>Password looks good</p>}
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                <MapPin size={16} /> Address (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Street" type="text" name="street" value={formData.street} onChange={handleChange} placeholder="Street address" />
                <FormInput label="City" type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                <FormInput label="State" type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
                <FormInput label="Pincode" type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="6-digit pincode" />
              </div>
            </div>
          </Card>

          {/* 3. Professional & Clinical Details */}
          <Card title="Professional & Clinical Details" icon={<Briefcase className="text-purple-500" />} padding="p-2 md:p-6">
            <div className="space-y-6">
              {/* Medical Registration - MANDATORY */}
              <div className="p-2 md:p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-3 flex items-center gap-2">
                  <CreditCard size={18} /> Medical Registration (Mandatory in India)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DField label="NMC Registration Number" name="medicalRegistrationNumber" value={formData.medicalRegistrationNumber} onChange={handleChange}
                    onBlur={e=>handleBlur("medicalRegistrationNumber",e.target.value)} error={errors.medicalRegistrationNumber}
                    touched={touched.medicalRegistrationNumber} required placeholder="NMC/State Council No."/>
                  <FormInput label="Registration Council" type="text" name="registrationCouncil" value={formData.registrationCouncil} onChange={handleChange}/>
                  <FormInput label="Registration Year" type="text" name="registrationYear" value={formData.registrationYear} onChange={handleChange} placeholder="YYYY"/>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                      Registration Expiry Date
                    </label>
                    <input type="date" name="registrationExpiryDate" value={formData.registrationExpiryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <TagInput
                label="Medical Specialties"
                placeholder="Search and select specialties (e.g. Cardiology)..."
                options={COMMON_SPECIALTIES}
                selectedItems={formData.specialties}
                onAdd={(val) => setFormData((prev: any) => ({ ...prev, specialties: [...prev.specialties, val] }))}
                onRemove={(val) => setFormData((prev: any) => ({ ...prev, specialties: prev.specialties.filter((i: string) => i !== val) }))}
                accentColor="indigo"
              />

              {/* Qualifications */}
              <TagInput
                label="Medical Qualifications"
                placeholder="Search and select qualifications (e.g. MBBS, MD)..."
                options={COMMON_QUALIFICATIONS}
                selectedItems={formData.qualifications}
                onAdd={(val) => setFormData((prev: any) => ({ ...prev, qualifications: [...prev.qualifications, val] }))}
                onRemove={(val) => setFormData((prev: any) => ({ ...prev, qualifications: prev.qualifications.filter((i: string) => i !== val) }))}
                accentColor="emerald"
                icon={<Award size={20} className="mb-2 opacity-20" />}
              />

              {/* Experience Start & Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Experience Start Date <span className="text-red-500">*</span></label>
                  <input type="date" name="experienceStart" value={formData.experienceStart}
                    onChange={handleChange} required max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                </div>
                
                <DField label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange}
                  onBlur={e=>handleBlur("employeeId",e.target.value)} error={errors.employeeId}
                  touched={touched.employeeId} required placeholder="Hospital Employee ID" />
              </div>
            </div>
          </Card>

          {/* 4. Scheduling & Availability */}
          <Card title="Scheduling & Availability" icon={<Clock className="text-orange-500" />} padding="p-2 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{color:'var(--text-color)'}}>Consultation Fee (₹)<span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <input type="text" name="consultationFee" value={formData.consultationFee}
                    onChange={handleChange} onBlur={e=>handleBlur("consultationFee",e.target.value)} placeholder="500"
                    className={`w-full px-4 py-3 pl-10 pr-9 rounded-xl border focus:outline-none focus:ring-2 transition-all ${touched.consultationFee&&errors.consultationFee?"border-rose-400 bg-rose-50/20 focus:ring-rose-400/20":touched.consultationFee&&!errors.consultationFee&&formData.consultationFee?"border-emerald-400 focus:ring-emerald-400/20":"focus:ring-blue-500"}`}
                    style={touched.consultationFee&&!errors.consultationFee&&formData.consultationFee?{borderColor:'#34d399',backgroundColor:'var(--card-bg)',color:'var(--text-color)'}:{backgroundColor:'var(--card-bg)',color:'var(--text-color)',borderColor:touched.consultationFee&&errors.consultationFee?undefined:'var(--border-color)'}}/>
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                  {touched.consultationFee&&!errors.consultationFee&&formData.consultationFee&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}
                </div>
                <DErr msg={touched.consultationFee?errors.consultationFee:undefined}/>
              </div>

              <FormInput label="Consultation Duration (mins)" type="text" name="consultationDuration"
                value={formData.consultationDuration} onChange={handleChange} placeholder="15" />
              <FormInput label="Max Appointments/Day" type="text" name="maxAppointmentsPerDay"
                value={formData.maxAppointmentsPerDay} onChange={handleChange} placeholder="20" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-color)' }}>Weekly Schedule</h4>
                <Button type="button" variant="secondary" onClick={addAvailabilitySlot}>Add Schedule</Button>
              </div>
              
              <div className="space-y-4">
                {availability.map((slot, index) => (
                  <div key={index} className="p-2 md:p-4 border rounded-xl" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-medium text-sm">Schedule {index + 1}</h5>
                      {availability.length > 1 && (
                        <button type="button" onClick={() => removeAvailabilitySlot(index)}
                          className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {DAYS_OF_WEEK.map(day => (
                        <button key={day} type="button"
                          onClick={() => toggleDay(index, day)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium ${
                            slot.days.includes(day) 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                          }`}>
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start</label>
                        <input type="time" value={slot.startTime}
                          onChange={(e) => updateAvailability(index, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                        <p className="text-[10px] text-gray-400 mt-1">{formatAMPM(slot.startTime)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Break Start</label>
                        <input type="time" value={slot.breakStart}
                          onChange={(e) => updateAvailability(index, 'breakStart', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                        <p className="text-[10px] text-gray-400 mt-1">{formatAMPM(slot.breakStart)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Break End</label>
                        <input type="time" value={slot.breakEnd}
                          onChange={(e) => updateAvailability(index, 'breakEnd', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                        <p className="text-[10px] text-gray-400 mt-1">{formatAMPM(slot.breakEnd)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">End</label>
                        <input type="time" value={slot.endTime}
                          onChange={(e) => updateAvailability(index, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                        <p className="text-[10px] text-gray-400 mt-1">{formatAMPM(slot.endTime)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>


          {/* 6. Additional Information */}
          <Card title="Additional Information" icon={<FileText className="text-indigo-500" />} padding="p-2 md:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bio / About</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4}
                  placeholder="Brief description about the doctor's expertise and experience..."
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
              </div>



              {/* Languages */}
              <TagInput
                label="Languages Spoken"
                placeholder="Search and select languages..."
                options={COMMON_LANGUAGES}
                selectedItems={formData.languages}
                onAdd={(val) => setFormData((prev: any) => ({ ...prev, languages: [...prev.languages, val] }))}
                onRemove={(val) => setFormData((prev: any) => ({ ...prev, languages: prev.languages.filter((i: string) => i !== val) }))}
                accentColor="blue"
                icon={<Globe size={20} className="mb-2 opacity-20" />}
              />

              {/* Awards */}
              <div>
                <label className="block text-sm font-medium mb-2">Awards & Recognition</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={tempAward} onChange={(e) => setTempAward(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), setFormData(prev => ({ ...prev, awards: [...prev.awards, tempAward] })), setTempAward(""))}
                    placeholder="e.g., Best Doctor Award 2023"
                    className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
                  <Button type="button" variant="secondary" onClick={() => { if(tempAward) { setFormData(prev => ({ ...prev, awards: [...prev.awards, tempAward] })); setTempAward(""); } }} disabled={!tempAward}>Add</Button>
                </div>
                {formData.awards.length > 0 && (
                  <div className="space-y-2">
                    {formData.awards.map(a => (
                      <div key={a} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                        <span className="text-sm flex items-center gap-2">
                          <Award className="text-amber-600" size={16} /> {a}
                        </span>
                        <button type="button" onClick={() => removeAward(a)} className="text-red-500 hover:text-red-700">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 6. Bank & Payroll Details */}
          <Card title="Bank & Payroll Details (Mandatory for Payslips)" icon={<Landmark className="text-emerald-500" />} padding="p-2 md:p-6">
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormInput label="Account Holder Name" type="text" name="accountName" value={formData.accountName} onChange={handleChange} placeholder="As per bank records"/>
                  <FormInput label="Bank Name" type="text" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. HDFC Bank"/>
                  <DField label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange}
                    onBlur={e=>handleBlur("accountNumber",e.target.value)} error={errors.accountNumber} touched={touched.accountNumber} placeholder="9–18 digits"/>
                  <DField label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange}
                    onBlur={e=>handleBlur("ifscCode",e.target.value)} error={errors.ifscCode} touched={touched.ifscCode} placeholder="HDFC0001234" extraClass="uppercase"/>
               </div>
               {!formData.ifscCode&&<p className="text-[10px] text-gray-400 ml-1">IFSC Format: ABCD0123456</p>}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <FormInput label="Base Salary (Monthly)" type="text" name="baseSalary" value={formData.baseSalary} onChange={handleChange} placeholder="e.g. 150000"/>
                  <DField label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange}
                    onBlur={e=>handleBlur("panNumber",e.target.value)} error={errors.panNumber} touched={touched.panNumber} placeholder="ABCDE1234F" extraClass="uppercase"/>
                  <DField label="Aadhar Number" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange}
                    onBlur={e=>handleBlur("aadharNumber",e.target.value)} error={errors.aadharNumber} touched={touched.aadharNumber} placeholder="12-digit Aadhar"/>
                  <FormInput label="PF Number" type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} placeholder="Provident Fund No."/>
                  <FormInput label="ESI Number" type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} placeholder="ESI Number"/>
                  <FormInput label="UAN Number" type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} placeholder="Universal Account No."/>
               </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => router.push(`/${hospitalId}${basePath}/doctors`)}
              disabled={loading} className="px-2 md:px-8">Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} icon={<UserPlus size={18} />}
              className="px-12 py-4 text-xs md:text-base md:text-lg shadow-lg hover:shadow-xl">
              Create Doctor Profile
            </Button>
          </div>
        </form>
      </div>
    </InfrastructureCheck>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(CreateDoctor);