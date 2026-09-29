"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import {
  UserPlus, Eye, EyeOff, IndianRupee, User, Briefcase,
  Clock, AlertCircle, CheckCircle2, ArrowLeft,
  Plus, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, FormInput, Button } from "@/components/admin";
import { TagInput } from "@/components/common/TagInput";
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from "@/lib/constants/medicalData";
import { useTenantLink } from '@/hooks/useTenantLink';

type Errors = Partial<Record<string, string>>;
const docValidators: Record<string, (v: string) => string> = {
  name:  v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens allowed" : "",
  email: v => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email" : "",
  mobile: v => !v ? "Mobile is required" : !/^\d{10}$/.test(v) ? "Must be exactly 10 digits (numbers only)" : "",
  password: v => !v ? "Password is required" : v.length < 6 ? "Min 6 characters" : "",
  medicalRegistrationNumber: v => !v ? "Registration Number is mandatory" : !/^\d{12}$/.test(v) ? "Must be exactly 12 digits (numbers only)" : "",
  employeeId: v => !v.trim() ? "Employee ID is required" : "",
  consultationFee: v => !v || isNaN(Number(v)) || Number(v) <= 0 ? "Must be a positive number" : "",
};
const dValidate = (n: string, v: string) => docValidators[n] ? docValidators[n](v) : "";

function DErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={12}/>{msg}</p>;
}

function DField({ label, name, value, onChange, onBlur, error, touched, type="text", placeholder, required }: {
  label:string;name:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
  onBlur?:(e:React.FocusEvent<HTMLInputElement>)=>void;error?:string;touched?:boolean;
  type?:string;placeholder?:string;required?:boolean;
}) {
  const hasErr=touched&&!!error,isOk=touched&&!error&&value.trim()!=="";
  return(
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${hasErr?"border-rose-400 bg-rose-50/20 focus:ring-rose-400/20":isOk?"border-emerald-400 focus:ring-emerald-400/20":"border-slate-200 focus:ring-indigo-500/20"}`}/>
        {isOk&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
      </div>
      <DErr msg={hasErr?error:undefined}/>
    </div>
  );
}

const HONORIFIC_OPTIONS = [
  { value: "Dr", label: "Dr" },
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" }
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const [time, ampm] = value.split(" ");
  const [h, m] = time.split(":");

  const update = (newH: string, newM: string, newAmPm: string) => {
    onChange(`${newH}:${newM} ${newAmPm}`);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-1">
        <select value={h} onChange={(e) => update(e.target.value, m, ampm)}
          className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm">
          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={m} onChange={(e) => update(h, e.target.value, ampm)}
          className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm">
          {["00", "15", "30", "45"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={ampm} onChange={(e) => update(h, m, e.target.value)}
          className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold text-indigo-600">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function CreateDoctor() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getPath } = useTenantLink();
  
  const [formData, setFormData] = useState({
    honorific: "Dr", name: "", email: "", mobile: "", password: "", gender: "male",
    dateOfBirth: "",
    street: "", city: "", state: "", pincode: "",
    specialties: [] as string[], qualifications: [] as string[],
    medicalRegistrationNumber: "",
    registrationCouncil: "National Medical Commission (NMC)",
    registrationYear: "",
    experienceStart: "",
    employeeId: "",
    consultationFee: "", consultationDuration: "15",
    maxAppointmentsPerDay: "20",
    bio: "",
    languages: [] as string[],
    bankName: "", accountNumber: "", accountName: "", ifscCode: "",
    baseSalary: "", panNumber: "", aadharNumber: ""
  });

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string,boolean>>({});
  const [availability, setAvailability] = useState([{ days: [] as string[], startTime: "09:00 AM", breakStart: "01:00 PM", breakEnd: "02:00 PM", endTime: "05:00 PM" }]);

  const formatTo24H = (time12: string) => {
    const [time, ampm] = time12.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlur = (n: string, v: string) => {
    setTouched(p => ({ ...p, [n]: true }));
    setErrors(p => ({ ...p, [n]: dValidate(n, v) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Character filtering and hard length limits
    if (["mobile", "medicalRegistrationNumber", "consultationFee", "maxAppointmentsPerDay", "pincode", "accountNumber", "baseSalary"].includes(name)) {
      value = value.replace(/\D/g, "");
      if (name === "mobile") value = value.slice(0, 10);
      if (name === "medicalRegistrationNumber") value = value.slice(0, 12);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(p => ({ ...p, [name]: dValidate(name, value) }));
  };

  const toggleDay = (slotIndex: number, day: string) => {
    const updated = [...availability];
    const days = updated[slotIndex].days;
    updated[slotIndex].days = days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day];
    setAvailability(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const newErrors: Errors = {};
    Object.keys(docValidators).forEach(field => {
      const err = dValidate(field, (formData as any)[field] || "");
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(docValidators).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
      toast.error("Please fix the errors in the form before submitting");
      return;
    }

    setLoading(true);
    try {
      const doctorData = {
        ...formData,
        consultationFee: parseInt(formData.consultationFee),
        consultationDuration: parseInt(formData.consultationDuration),
        maxAppointmentsPerDay: parseInt(formData.maxAppointmentsPerDay),
        availability: availability.filter(slot => slot.days.length > 0).map(slot => ({
          ...slot,
          startTime: formatTo24H(slot.startTime),
          endTime: formatTo24H(slot.endTime),
          breakStart: formatTo24H(slot.breakStart),
          breakEnd: formatTo24H(slot.breakEnd),
        })),
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India"
        },
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          ifscCode: formData.ifscCode
        }
      };

      await hospitalAdminService.createDoctor(doctorData as any);
      toast.success("Doctor onboarded successfully!");
      queryClient.invalidateQueries({ queryKey: ['masterhelpdesk-doctors'] });
      router.push(getPath("/masterhelpdesk/doctors"));
    } catch (err: any) {
      toast.error(err.message || "Failed to create doctor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 px-1">
      <div className="flex items-center gap-4 mb-6">
        <button 
          type="button"
          onClick={() => router.push(getPath("/masterhelpdesk/doctors"))} 
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 shadow-sm transition-all active:scale-95"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div>
          <h1 className="text-2xl  max-sm:text-[18px] font-bold text-slate-900">Onboard New Physician</h1>
          <p className="text-slate-500 max-sm:text-[14px]">Register a new doctor to the hospital mainframe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Basic Identity" icon={<User className="text-indigo-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <select name="honorific" value={formData.honorific} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                {HONORIFIC_OPTIONS.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <DField label="Full Name" name="name" value={formData.name} onChange={handleChange}
                onBlur={e=>handleBlur("name",e.target.value)} error={errors.name} touched={touched.name}
                required placeholder="e.g. John Doe"/>
            </div>
            <div className="md:col-span-2">
              <DField label="Email Address" name="email" value={formData.email} onChange={handleChange}
                onBlur={e=>handleBlur("email",e.target.value)} error={errors.email} touched={touched.email}
                required type="email" placeholder="doctor@hospital.com"/>
            </div>
            <div className="md:col-span-2">
              <DField label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange}
                onBlur={e=>handleBlur("mobile",e.target.value)} error={errors.mobile} touched={touched.mobile}
                required type="tel" placeholder="10-digit mobile" />
            </div>
            <div className="md:col-span-2">
              <div className="relative space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Access Password</label>
                <div className="relative">
                  <input type={showPassword?"text":"password"} name="password" value={formData.password}
                    onChange={handleChange} onBlur={e=>handleBlur("password",e.target.value)} placeholder="Min 6 characters"
                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.password&&errors.password?"border-rose-400 bg-rose-50/20":"border-slate-200 focus:ring-indigo-500/20"}`}/>
                  <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
                <DErr msg={touched.password?errors.password:undefined}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1.5">Experience Start</label>
               <input type="date" name="experienceStart" value={formData.experienceStart} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"/>
            </div>
          </div>
        </Card>

        <Card title="Professional Credentials" icon={<Briefcase className="text-purple-500" />}>
          <div className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DField label="Medical Reg. Number" name="medicalRegistrationNumber" value={formData.medicalRegistrationNumber} onChange={handleChange}
                onBlur={e=>handleBlur("medicalRegistrationNumber",e.target.value)} error={errors.medicalRegistrationNumber} touched={touched.medicalRegistrationNumber} required/>
              <DField label="Hospital Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange}
                onBlur={e=>handleBlur("employeeId",e.target.value)} error={errors.employeeId} touched={touched.employeeId} required/>
              <div className="relative space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Consultation Fee (₹)</label>
                <div className="relative">
                  <input type="text" name="consultationFee" value={formData.consultationFee} onChange={handleChange}
                    onBlur={e=>handleBlur("consultationFee",e.target.value)} 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${touched.consultationFee&&errors.consultationFee?"border-rose-400 bg-rose-50/20":"border-slate-200 focus:ring-indigo-500/20"}`}/>
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                </div>
                <DErr msg={touched.consultationFee?errors.consultationFee:undefined}/>
              </div>
            </div>

            <TagInput
              label="Medical Specialties"
              placeholder="Search specialties..."
              options={COMMON_SPECIALTIES}
              selectedItems={formData.specialties}
              onAdd={(val) => setFormData(prev => ({ ...prev, specialties: [...prev.specialties, val] }))}
              onRemove={(val) => setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(i => i !== val) }))}
              accentColor="indigo"
            />

            <TagInput
              label="Qualifications"
              placeholder="Select qualifications..."
              options={COMMON_QUALIFICATIONS}
              selectedItems={formData.qualifications}
              onAdd={(val) => setFormData(prev => ({ ...prev, qualifications: [...prev.qualifications, val] }))}
              onRemove={(val) => setFormData(prev => ({ ...prev, qualifications: prev.qualifications.filter(i => i !== val) }))}
              accentColor="purple"
            />
          </div>
        </Card>

        <Card 
          title="Availability Schedule" 
          icon={<Clock className="text-orange-500" />}
          extra={
            <button type="button" onClick={() => setAvailability([...availability, { days: [], startTime: "09:00 AM", breakStart: "01:00 PM", breakEnd: "02:00 PM", endTime: "05:00 PM" }])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
              <Plus size={14} />
              Add Shift
            </button>
          }
        >
          <div className="p-2 space-y-6">
            {availability.map((slot, index) => (
              <div key={index} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 relative group">
                {availability.length > 1 && (
                  <button type="button" onClick={() => setAvailability(availability.filter((_, i) => i !== index))}
                    className="absolute -top-2 -right-2 p-1.5 bg-white border border-rose-100 text-rose-500 rounded-lg shadow-sm hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-7 gap-2 mb-5">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(index, day)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${slot.days.includes(day) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'}`}>
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TimePicker label="Start Time" value={slot.startTime} onChange={(val)=> {
                    const upd=[...availability]; upd[index].startTime=val; setAvailability(upd);
                  }}/>
                  <TimePicker label="End Time" value={slot.endTime} onChange={(val)=> {
                    const upd=[...availability]; upd[index].endTime=val; setAvailability(upd);
                  }}/>
                  <TimePicker label="Break Start" value={slot.breakStart} onChange={(val)=> {
                    const upd=[...availability]; upd[index].breakStart=val; setAvailability(upd);
                  }}/>
                  <TimePicker label="Break End" value={slot.breakEnd} onChange={(val)=> {
                    const upd=[...availability]; upd[index].breakEnd=val; setAvailability(upd);
                  }}/>
                </div>
              </div>
            ))}
            {availability.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No schedules defined. Click "Add Shift" to begin.
              </div>
            )}
          </div>
        </Card>

        <div className="flex max-sm:flex-col-reverse justify-end gap-4 pt-6 max-sm:pb-24">
          <Button type="button" variant="secondary" onClick={() => router.push(getPath("/masterhelpdesk/doctors"))} disabled={loading} className="px-8 py-3 rounded-xl max-sm:w-full flex justify-center">Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} icon={<UserPlus size={18} />} className="px-12 py-3 max-sm:py-3 rounded-xl bg-indigo-600 max-sm:text-[15px] hover:bg-indigo-700 shadow-lg shadow-indigo-200 max-sm:w-full flex justify-center">
            Create Doctor
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(CreateDoctor);
