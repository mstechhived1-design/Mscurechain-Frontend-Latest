"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  IndianRupee,
  User,
  Mail,
  Briefcase,
  FileText,
  Award,
  Image as ImageIcon,
  MapPin,
  Clock,
  CreditCard,
  Globe,
  Edit,
  ArrowLeft,
  X as XIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";
import type { CreateDoctorRequest } from "@/lib/integrations/types";
import { TagInput } from "@/components/common/TagInput";
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from "@/lib/constants/medicalData";
import { formatDoctorName, cleanDoctorName } from "@/lib/utils/name-utils";

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
  baseSalary: string;
  permissions: {
    canAccessEMR: boolean;
    canAccessBilling: boolean;
    canAccessLabReports: boolean;
    canPrescribe: boolean;
    canAdmitPatients: boolean;
    canPerformSurgery: boolean;
  };
  bio: string;
  languages: string[];
  awards: string[];
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

function EditDoctor() {
  const router = useRouter();
  const params = useParams() as any;
  const pathname = usePathname() as string;
  const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
  const id = params.id as string;
  const hospitalId = params.hospitalId as string;
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  
  const { data: metadata } = useQuery({
    queryKey: ["hospital-metadata"],
    queryFn: () => hospitalAdminService.getHospitalMetadata()
  });
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>("");

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
    baseSalary: "",
    permissions: {
      canAccessEMR: true,
      canAccessBilling: false,
      canAccessLabReports: true,
      canPrescribe: true,
      canAdmitPatients: false,
      canPerformSurgery: false
    },
    bio: "",
    languages: [], awards: []
  });

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([
    { days: [], startTime: "09:00", breakStart: "13:00", breakEnd: "14:00", endTime: "17:00" }
  ]);

  const [tempAward, setTempAward] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const { doctor } = await hospitalAdminService.getDoctorById(id);

      // Map backend data to form data
      setFormData({
        honorific: doctor.honorific || "Dr",
        name: cleanDoctorName(doctor.name || ""),
        email: doctor.email || "",
        mobile: doctor.mobile || "",
        password: "", // Keep password empty for security, only update if changed
        gender: doctor.gender || "",
        dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : "",
        street: doctor.address?.street || "",
        city: doctor.address?.city || "",
        state: doctor.address?.state || "",
        pincode: doctor.address?.pincode || "",
        specialties: doctor.specialties || [],
        qualifications: doctor.qualifications || [],
        medicalRegistrationNumber: doctor.medicalRegistrationNumber || "",
        registrationCouncil: doctor.registrationCouncil || "National Medical Commission (NMC)",
        registrationYear: doctor.registrationYear?.toString() || "",
        registrationExpiryDate: doctor.registrationExpiryDate ? new Date(doctor.registrationExpiryDate).toISOString().split('T')[0] : "",
        experienceStart: doctor.experienceStart ? new Date(doctor.experienceStart).toISOString().split('T')[0] : "",
        employeeId: doctor.employeeId || "",
        consultationFee: doctor.consultationFee?.toString() || "",
        consultationDuration: doctor.consultationDuration?.toString() || "15",
        maxAppointmentsPerDay: doctor.maxAppointmentsPerDay?.toString() || "20",
        baseSalary: doctor.baseSalary != null ? String(doctor.baseSalary) : "",
        permissions: {
          canAccessEMR: doctor.permissions?.canAccessEMR ?? true,
          canAccessBilling: doctor.permissions?.canAccessBilling ?? false,
          canAccessLabReports: doctor.permissions?.canAccessLabReports ?? true,
          canPrescribe: doctor.permissions?.canPrescribe ?? true,
          canAdmitPatients: doctor.permissions?.canAdmitPatients ?? false,
          canPerformSurgery: doctor.permissions?.canPerformSurgery ?? false
        },
        bio: doctor.bio || "",
        languages: doctor.languages || [],
        awards: doctor.awards || []
      });



      if (doctor.availability && doctor.availability.length > 0) {
        setAvailability(doctor.availability.map((slot: any) => ({
          days: slot.days || [],
          startTime: slot.startTime || "09:00",
          breakStart: slot.breakStart || "13:00",
          breakEnd: slot.breakEnd || "14:00",
          endTime: slot.endTime || "17:00"
        })));
      }
    } catch (error: any) {
      toast.error("Failed to fetch doctor details");
      router.push(`/${hospitalId}${basePath}/doctors`);
    } finally {
      setFetching(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicPreview(event.target?.result as string);
        setFormData(prev => ({ ...prev, profilePic: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = () => {
    setProfilePicFile(null);
    setProfilePicPreview("");
    setFormData(prev => ({ ...prev, profilePic: "" }));
    if (profilePicInputRef.current) profilePicInputRef.current.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Validation for specific fields
    if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;
    if ((name === "consultationFee" || name === "maxAppointmentsPerDay" || name === "consultationDuration" || name === "baseSalary") && !/^\d*$/.test(value)) return;
    if (name === "pincode" && !/^\d{0,6}$/.test(value)) return;
    if (name === "registrationYear" && !/^\d{0,4}$/.test(value)) return;

    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permissionName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionName]: checked
      }
    }));
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

  const validateForm = (): boolean => {
    // Required fields
    if (!formData.name.trim()) return toast.error("Please enter doctor's name"), false;
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Please enter a valid email address"), false;
    if (formData.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits"), false;
    if (!formData.password && !id) // Password only required on creation
      return toast.error("Password must be at least 6 characters"), false;
    if (formData.password && formData.password.length < 6)
      return toast.error("Password must be at least 6 characters"), false;
    if (!formData.gender) return toast.error("Please select gender"), false;
    if (formData.specialties.length === 0) return toast.error("Please add at least one specialty"), false;
    
    // Employee ID - Mandatory
    if (!formData.employeeId || !formData.employeeId.trim())
      return toast.error("Employee ID is mandatory"), false;

    // Medical Registration Number - Mandatory
    if (!formData.medicalRegistrationNumber.trim())
      return toast.error("Medical Registration Number is mandatory"), false;

    if (!formData.experienceStart) return toast.error("Please select experience start date"), false;
    if (!formData.consultationFee || parseInt(formData.consultationFee) <= 0)
      return toast.error("Please enter a valid consultation fee"), false;
    if (!formData.baseSalary || parseInt(formData.baseSalary) <= 0)
      return toast.error("Please enter a valid base salary for the doctor"), false;

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const sanitizedName = cleanDoctorName(formData.name);
      const doctorData: any = {
        honorific: formData.honorific,
        name: sanitizedName,
        email: formData.email.trim(),
        mobile: formData.mobile,
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
        experienceStart: formData.experienceStart,
        
        employeeId: formData.employeeId || undefined,

        consultationFee: parseInt(formData.consultationFee),
        consultationDuration: parseInt(formData.consultationDuration) || 15,
        maxAppointmentsPerDay: formData.maxAppointmentsPerDay ? parseInt(formData.maxAppointmentsPerDay) : undefined,
        availability: availability.filter(slot => slot.days.length > 0),

        baseSalary: formData.baseSalary ? parseInt(formData.baseSalary) : undefined,

        bio: formData.bio.trim() || `Dr. ${formData.name} is specializing in ${formData.specialties.join(', ')}.`,
        languages: formData.languages,
        awards: formData.awards
      };

      // Only include password if user explicitly entered one
      if (formData.password) {
        doctorData.password = formData.password;
      }

      await hospitalAdminService.updateDoctor(id, doctorData);

      toast.success(`Doctor "${formData.name}" updated successfully!`, { duration: 4000 });

      setTimeout(() => {
        router.push(`/${hospitalId}${basePath}/doctors`);
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to update doctor", { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 space-y-6">
      {/* Back Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.push(`/${hospitalId}${basePath}/doctors`)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Doctors List
        </button>
      </div>

      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <Edit className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Edit Doctor Profile
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                  Update details for Dr. {formData.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Personal Information */}
        <Card title="Personal Information" icon={<User className="text-blue-500" />} padding="p-2 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Honorific <span className="text-red-500">*</span>
              </label>
              <select name="honorific" value={formData.honorific} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                {HONORIFIC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <FormInput label="Full Name" type="text" name="name" required
              value={formData.name} onChange={handleChange} placeholder="Dr. John Smith" />

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Gender <span className="text-red-500">*</span>
              </label>
              <select name="gender" value={formData.gender} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
                Date of Birth
              </label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth}
                onChange={handleChange} max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
            </div>
          </div>
        </Card>

        {/* 2. Contact Information */}
        <Card title="Contact Information" icon={<Mail className="text-green-500" />} padding="p-2 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput label="Email Address" type="email" name="email" required
              value={formData.email} onChange={handleChange} placeholder="doctor@hospital.com" />
            <FormInput label="Mobile Number (10 digits)" type="tel" name="mobile" required
              value={formData.mobile} onChange={handleChange} placeholder="10-digit mobile" />
            <div className="relative">
              <FormInput label="Password (Leave blank to keep current)" type={showPassword ? "text" : "password"} name="password"
                value={formData.password} onChange={handleChange} placeholder="New password (optional)" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-10 text-gray-500 hover:text-blue-500">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
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
                <FormInput label="NMC Registration Number" type="text" name="medicalRegistrationNumber" required
                  value={formData.medicalRegistrationNumber} onChange={handleChange}
                  placeholder="NMC/State Council No." />
                <FormInput label="Registration Council" type="text" name="registrationCouncil"
                  value={formData.registrationCouncil} onChange={handleChange} />
                <FormInput label="Registration Year" type="text" name="registrationYear"
                  value={formData.registrationYear} onChange={handleChange} placeholder="YYYY" />
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

              <FormInput label="Employee ID" type="text" name="employeeId" required
                value={formData.employeeId} onChange={handleChange} placeholder="Hospital Employee ID" />
            </div>
          </div>
        </Card>

        {/* 4. Scheduling, Payroll & Availability */}
        <Card title="Scheduling & Payroll" icon={<Clock className="text-orange-500" />} padding="p-2 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Consultation Fee (₹) <span className="text-red-500">*</span></label>
              <input type="text" name="consultationFee" value={formData.consultationFee}
                onChange={handleChange} required placeholder="500"
                className="w-full px-4 py-3 pl-10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }} />
              <IndianRupee className="absolute left-3 top-10 text-gray-400" size={18} />
            </div>

            <FormInput label="Consultation Duration (mins)" type="text" name="consultationDuration"
              value={formData.consultationDuration} onChange={handleChange} placeholder="15" />
            <FormInput label="Max Appointments/Day" type="text" name="maxAppointmentsPerDay"
              value={formData.maxAppointmentsPerDay} onChange={handleChange} placeholder="20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Base Salary (₹) <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleChange}
                placeholder="100000"
                className="w-full px-4 py-3 pl-10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              />
              <IndianRupee className="absolute left-3 top-10 text-gray-400" size={18} />
              <p className="text-[10px] text-gray-400 mt-1">
                Used for payroll calculations and salary slips.
              </p>
            </div>
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
                        className={`px-2 py-2 rounded-lg text-xs font-medium ${slot.days.includes(day)
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
        {/* 5. Additional Information */}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push(`/${hospitalId}${basePath}/doctors`)}
            disabled={loading} className="px-2 md:px-8"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Doctors List
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<Edit size={18} />}
            className="px-12 py-4 text-xs md:text-base md:text-lg shadow-lg hover:shadow-xl">
            Update Doctor Profile
          </Button>
        </div>
      </form>
    </div>
  );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(EditDoctor);
