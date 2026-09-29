"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Briefcase,
  Clock,
  IndianRupee,
  Edit,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, FormInput, Button } from "@/components/admin";
import { TagInput } from "@/components/common/TagInput";
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from "@/lib/constants/medicalData";
import { useTenantLink } from '@/hooks/useTenantLink';

type Errors = Partial<Record<string, string>>;
const docValidators: Record<string, (v: string) => string> = {
  name: v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens allowed" : "",
  email: v => !v.trim() ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email" : "",
  mobile: v => !v ? "Mobile is required" : !/^\d{10}$/.test(v) ? "Must be exactly 10 digits (numbers only)" : "",
  medicalRegistrationNumber: v => !v ? "Registration Number is mandatory" : !/^\d{12}$/.test(v) ? "Must be exactly 12 digits (numbers only)" : "",
  employeeId: v => !v.trim() ? "Employee ID is required" : "",
  consultationFee: v => !v || isNaN(Number(v)) || Number(v) <= 0 ? "Must be a positive number" : "",
};
const dValidate = (n: string, v: string) => docValidators[n] ? docValidators[n](v) : "";

function DErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={12} />{msg}</p>;
}

const HONORIFIC_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" }
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

function EditDoctor() {
  const router = useRouter();
  const params = useParams() as any;
  const id = params.id as string;
  const { getPath } = useTenantLink();

  const [formData, setFormData] = useState({
    honorific: "Dr", name: "", email: "", mobile: "", password: "", gender: "male",
    dateOfBirth: "", street: "", city: "", state: "", pincode: "",
    specialties: [] as string[], qualifications: [] as string[],
    medicalRegistrationNumber: "", registrationCouncil: "",
    registrationYear: "", experienceStart: "", employeeId: "",
    consultationFee: "", consultationDuration: "15",
    maxAppointmentsPerDay: "20", baseSalary: "",
    bio: "", languages: [] as string[], awards: [] as string[]
  });

  const [availability, setAvailability] = useState([{ days: [] as string[], startTime: "09:00 AM", breakStart: "01:00 PM", breakEnd: "02:00 PM", endTime: "05:00 PM" }]);

  const formatTo12H = (time24: string) => {
    if (!time24) return "09:00 AM";
    if (time24.includes("AM") || time24.includes("PM")) return time24;
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatTo24H = (time12: string) => {
    const [time, ampm] = time12.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (n: string, v: string) => {
    setTouched(p => ({ ...p, [n]: true }));
    setErrors(p => ({ ...p, [n]: dValidate(n, v) }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  useEffect(() => {
    if (id) fetchDoctor();
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const { doctor } = await hospitalAdminService.getDoctorById(id);
      setFormData({
        honorific: doctor.honorific || "Dr",
        name: doctor.name || "",
        email: doctor.email || "",
        mobile: doctor.mobile || "",
        password: "",
        gender: doctor.gender || "male",
        dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : "",
        street: doctor.address?.street || "",
        city: doctor.address?.city || "",
        state: doctor.address?.state || "",
        pincode: doctor.address?.pincode || "",
        specialties: doctor.specialties || [],
        qualifications: doctor.qualifications || [],
        medicalRegistrationNumber: doctor.medicalRegistrationNumber || "",
        registrationCouncil: doctor.registrationCouncil || "",
        registrationYear: doctor.registrationYear?.toString() || "",
        experienceStart: doctor.experienceStart ? new Date(doctor.experienceStart).toISOString().split('T')[0] : "",
        employeeId: doctor.employeeId || "",
        consultationFee: doctor.consultationFee?.toString() || "",
        consultationDuration: doctor.consultationDuration?.toString() || "15",
        maxAppointmentsPerDay: doctor.maxAppointmentsPerDay?.toString() || "20",
        baseSalary: doctor.baseSalary?.toString() || "",
        bio: doctor.bio || "",
        languages: doctor.languages || [],
        awards: doctor.awards || []
      });

      if (doctor.availability?.length > 0) {
        setAvailability(doctor.availability.map((a: any) => ({
          ...a,
          startTime: formatTo12H(a.startTime),
          endTime: formatTo12H(a.endTime),
          breakStart: formatTo12H(a.breakStart),
          breakEnd: formatTo12H(a.breakEnd),
        })));
      }
    } catch (error) {
      toast.error("Failed to load doctor details");
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        baseSalary: parseInt(formData.baseSalary),
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
          pincode: formData.pincode
        }
      };
      if (!formData.password) delete (doctorData as any).password;

      await hospitalAdminService.updateDoctor(id, doctorData as any);
      toast.success("Doctor details updated successfully");
      router.push(getPath("/masterhelpdesk/doctors"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update doctor");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-20 text-center text-slate-400">Loading profile...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6 px-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push(getPath("/masterhelpdesk/doctors"))} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 max-sm:text-[18px] tracking-tight">Edit Doctor Profile</h1>
            <p className="text-slate-500 max-sm:text-[14px]">Updating details for Dr. {formData.name}</p>
          </div>
        </div>
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
          <Edit size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Identity & Contact" icon={<User className="text-indigo-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <select name="honorific" value={formData.honorific} onChange={handleFieldChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                {HONORIFIC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Full Name<span className="text-red-500 ml-0.5">*</span></label>
                <input name="name" value={formData.name} onChange={handleFieldChange}
                  onBlur={e => handleBlur("name", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.name && errors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                <DErr msg={touched.name ? errors.name : undefined} />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Email Address<span className="text-red-500 ml-0.5">*</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleFieldChange}
                  onBlur={e => handleBlur("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.email && errors.email ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                <DErr msg={touched.email ? errors.email : undefined} />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Mobile Number<span className="text-red-500 ml-0.5">*</span></label>
                <input name="mobile" value={formData.mobile} onChange={handleFieldChange}
                  onBlur={e => handleBlur("mobile", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.mobile && errors.mobile ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                <DErr msg={touched.mobile ? errors.mobile : undefined} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Professional Details" icon={<Briefcase className="text-purple-500" />}>
          <div className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Registration No.<span className="text-red-500 ml-0.5">*</span></label>
                <input name="medicalRegistrationNumber" value={formData.medicalRegistrationNumber} onChange={handleFieldChange}
                  onBlur={e => handleBlur("medicalRegistrationNumber", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.medicalRegistrationNumber && errors.medicalRegistrationNumber ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                <DErr msg={touched.medicalRegistrationNumber ? errors.medicalRegistrationNumber : undefined} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Employee ID<span className="text-red-500 ml-0.5">*</span></label>
                <input name="employeeId" value={formData.employeeId} onChange={handleFieldChange}
                  onBlur={e => handleBlur("employeeId", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.employeeId && errors.employeeId ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                <DErr msg={touched.employeeId ? errors.employeeId : undefined} />
              </div>
              <div className="relative space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Fee (₹)<span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <input type="text" name="consultationFee" value={formData.consultationFee} onChange={handleFieldChange}
                    onBlur={e => handleBlur("consultationFee", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 transition-all ${touched.consultationFee && errors.consultationFee ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500/20"}`} />
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <DErr msg={touched.consultationFee ? errors.consultationFee : undefined} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Experience From</label>
                <input type="date" name="experienceStart" value={formData.experienceStart} onChange={handleFieldChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
            </div>
            <TagInput label="Specialties" placeholder="Search specialties..." options={COMMON_SPECIALTIES} selectedItems={formData.specialties}
              onAdd={(v) => setFormData(p => ({ ...p, specialties: [...p.specialties, v] }))}
              onRemove={(v) => setFormData(p => ({ ...p, specialties: p.specialties.filter(i => i !== v) }))} />
            <TagInput label="Qualifications" placeholder="Select qualifications..." options={COMMON_QUALIFICATIONS} selectedItems={formData.qualifications}
              onAdd={(v) => setFormData(p => ({ ...p, qualifications: [...p.qualifications, v] }))}
              onRemove={(v) => setFormData(p => ({ ...p, qualifications: p.qualifications.filter(i => i !== v) }))} />
          </div>
        </Card>

        <Card 
          title="Schedules" 
          icon={<Clock className="text-orange-500" />}
          extra={
            <button type="button" onClick={() => setAvailability([...availability, { days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
              <Plus size={14} />
              Add Shift
            </button>
          }
        >
          <div className="p-2 space-y-6">
            {availability.map((slot, idx) => (
              <div key={idx} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 relative group">
                {availability.length > 1 && (
                  <button type="button" onClick={() => setAvailability(availability.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 p-1.5 bg-white border border-rose-100 text-rose-500 rounded-lg shadow-sm hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-7 gap-2 mb-5">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(idx, day)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${slot.days.includes(day) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'}`}>
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TimePicker label="Start" value={slot.startTime} onChange={(val) => { const u = [...availability]; u[idx].startTime = val; setAvailability(u); }} />
                  <TimePicker label="End" value={slot.endTime} onChange={(val) => { const u = [...availability]; u[idx].endTime = val; setAvailability(u); }} />
                  <TimePicker label="Break Start" value={slot.breakStart} onChange={(val) => { const u = [...availability]; u[idx].breakStart = val; setAvailability(u); }} />
                  <TimePicker label="Break End" value={slot.breakEnd} onChange={(val) => { const u = [...availability]; u[idx].breakEnd = val; setAvailability(u); }} />
                </div>
              </div>
            ))}
            {availability.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No active schedules. Click "Add Shift" to configure availability.
              </div>
            )}
          </div>
        </Card>

        <div className="flex max-sm:flex-col-reverse justify-end gap-4 max-sm:pb-24">
          <Button type="button" variant="secondary" onClick={() => router.push(getPath("/masterhelpdesk/doctors"))} disabled={loading} className="px-8 py-3 rounded-xl max-sm:w-full flex justify-center">Discard</Button>
          <Button type="submit" variant="primary" loading={loading} icon={<CheckCircle2 size={18} />} className="px-12 py-3 rounded-xl bg-indigo-600 max-sm:text-[15px] hover:bg-indigo-700 shadow-lg shadow-indigo-200 max-sm:w-full flex justify-center">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(EditDoctor);
