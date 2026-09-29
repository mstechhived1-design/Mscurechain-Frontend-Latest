'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  User,
  FileText,
  Loader2,
  Edit2,
  X,
  Activity,
  Shield,
  Plus,
  AlertCircle,
  Activity as HeartIcon
} from "lucide-react";
import { helpdeskService } from "@/lib/integrations";
import { calculateExactAge, calculateDobFromAge } from "@/lib/utils/date-utils";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

function MasterEditPatient() {
  const router = useRouter();
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const patientId = params.patientId as string;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    honorific: 'Mr',
    name: '',
    mobile: '',
    email: '',
    gender: 'male',
    dob: '',
    age: '',
    ageUnit: 'Years' as 'Years' | 'Months' | 'Days',
    address: '',
    emergencyContact: '',
    emergencyContactName: '',
    bloodGroup: 'O+',
    allergies: '',
    medicalHistory: ''
  });

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const data = await helpdeskService.getPatientById(patientId);
      setPatientData(data);

      const rawDob = data.profile?.dob || data.user?.dateOfBirth;
      const dobStr = rawDob ? new Date(rawDob).toISOString().split('T')[0] : '';
      const exact = calculateExactAge(dobStr);

      setFormData({
        honorific: data.profile?.honorific || 'Mr',
        name: data.user?.name || '',
        mobile: data.user?.mobile || '',
        email: data.user?.email || '',
        gender: data.profile?.gender || 'male',
        dob: dobStr,
        age: exact.primaryValue || (data.profile?.age ? String(data.profile.age) : ''),
        ageUnit: exact.primaryUnit || 'Years',
        address: data.profile?.address || '',
        emergencyContact: data.profile?.alternateNumber || data.profile?.emergencyContactPhone || '',
        emergencyContactName: data.profile?.emergencyContactName || '',
        bloodGroup: data.profile?.bloodGroup || 'O+',
        allergies: data.profile?.allergies || data.profile?.conditions || '',
        medicalHistory: data.profile?.medicalHistory || data.profile?.notes || ''
      });
    } catch (error: any) {
      toast.error("Patient manifest retrieval failed");
      router.push(`/${hospitalId}/masterhelpdesk/patients`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchPatientData();
  }, [patientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Restrictions
    if (name === 'mobile' || name === 'emergencyContact') {
      if (value !== '' && !/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    if (name === 'age' || name === 'ageUnit') {
      const currentUnit = name === 'ageUnit' ? (value as 'Years' | 'Months' | 'Days') : formData.ageUnit;
      const currentAgeVal = name === 'age' ? value.replace(/\D/g, '') : formData.age;
      const ageNum = parseInt(currentAgeVal, 10);

      if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 130) {
        const calculatedDob = calculateDobFromAge(ageNum, currentUnit);
        setFormData(prev => ({
          ...prev,
          age: currentAgeVal,
          ageUnit: currentUnit,
          dob: calculatedDob,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          age: currentAgeVal,
          ageUnit: currentUnit,
        }));
      }
    } else if (name === 'dob') {
      const exact = calculateExactAge(value);
      setFormData(prev => ({
        ...prev,
        dob: value,
        age: exact.primaryValue,
        ageUnit: exact.primaryUnit,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        if (name === 'age') delete newErrors.dob;
        if (name === 'dob') delete newErrors.age;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (!/^[a-zA-Z\s.]*$/.test(formData.name)) newErrors.name = "Name should only contain letters";
    else if (formData.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";

    if (!formData.mobile) newErrors.mobile = "Mobile is required";
    else if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = "Mobile must be 10 digits";

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
      newErrors.age = "Age is required";
    } else {
      const birthDate = new Date(formData.dob);
      if (isNaN(birthDate.getTime())) newErrors.dob = "Invalid date format";
      else if (birthDate > new Date()) newErrors.dob = "DOB cannot be in the future";
      else if (birthDate < new Date('1900-01-01')) newErrors.dob = "Date is too far in the past";
    }

    if (formData.age) {
      const ageNum = Number(formData.age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
        newErrors.age = "Age must be between 0 and 130";
      }
    }

    if (!formData.address.trim()) newErrors.address = "Address is required";
    else if (formData.address.trim().length < 3) newErrors.address = "Address is too short";

    if (formData.emergencyContact && !/^\d{10}$/.test(formData.emergencyContact)) {
      newErrors.emergencyContact = "Must be 10 digits";
    }
    
    if (formData.emergencyContactName && formData.emergencyContactName.length < 2) {
      newErrors.emergencyContactName = "Name too short";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix validation errors");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      await helpdeskService.updatePatient(patientId, {
        ...formData,
        name: formData.name.toUpperCase(),
        address: formData.address.toUpperCase(),
        age: Number(formData.age) || 0
      });
      toast.success("Clinical Manifest & Credentials Updated");
      setEditing(false);
      fetchPatientData();
    } catch (error: any) {
      toast.error(error.message || "Update Sequence Failed");
    } finally {
      setSaving(false);
    }
  };

  const exactAgeData = useMemo(() => {
    return calculateExactAge(formData.dob);
  }, [formData.dob]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Master Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-500">
      {/* PROFESSIONAL HEADER SECTION */}
      <div className="flex flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Link href={`/${hospitalId}/masterhelpdesk/patients`} className="p-1.5 sm:p-2 bg-slate-100 rounded-lg sm:rounded-xl text-slate-400 hover:text-teal-600 transition-all hover:scale-110 shrink-0">
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Link>
            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
              Master Registry / {patientData?.profile?.mrn || 'NODE'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter truncate max-w-full">
              {editing ? 'Edit Profile' : 'Patient Profile'}
            </h1>
            <span className="hidden xs:inline-block text-[8px] sm:text-[10px] bg-slate-900 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-tighter shadow-lg shrink-0">Global ID</span>
          </div>

        </div>
        <div className="flex items-center sm:shrink-0 pt-8 sm:pt-0">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-teal-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-xl active:scale-95 transition-all"
            >
              <Edit2 size={12} className="sm:w-[14px] sm:h-[14px]" /> Master Edit
            </button>
          ) : (
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-400 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-teal-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
              >
                {saving ? <Loader2 size={12} className="animate-spin sm:size-[14px]" /> : <Save size={12} className="sm:size-[14px]" />}
                {saving ? 'Syncing...' : 'Commit'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN IDENTITY CARD */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-8">
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <User size={200} className="text-teal-600" />
            </div>

            <h2 className="text-[10px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-6 sm:mb-8 flex items-center gap-3">
              <Activity size={16} className="text-teal-600 sm:size-[18px]" /> Identity Matrix
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative z-10">
              <ProfileField label="Honorific" editing={editing}>
                <select
                  name="honorific"
                  value={formData.honorific}
                  onChange={handleChange}
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase appearance-none transition-all cursor-pointer"
                >
                  <option value="Mr">MR</option>
                  <option value="Mrs">MRS</option>
                  <option value="Ms">MS</option>
                  <option value="Dr">DR</option>
                </select>
              </ProfileField>

              <ProfileField label="Name" editing={editing} error={errors.name}>
                <input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="ENTER FULL NAME" 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.name ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase transition-all`} 
                />
              </ProfileField>

              <ProfileField label="Mobile" editing={editing} error={errors.mobile}>
                <input 
                  name="mobile" 
                  value={formData.mobile} 
                  onChange={handleChange} 
                  placeholder="10 DIGIT MOBILE" 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.mobile ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black tracking-widest transition-all`} 
                />
              </ProfileField>

              <ProfileField label="Mail" editing={editing} error={errors.email}>
                <input 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="PATIENT@DOMAIN.COM" 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.email ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase transition-all`} 
                />
              </ProfileField>

              <ProfileField label="DOB" editing={editing} error={errors.dob}>
                <input 
                  type="date" 
                  name="dob" 
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.dob} 
                  onChange={handleChange} 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.dob ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black transition-all`} 
                />
              </ProfileField>

              {editing ? (
                <ProfileField label="Age & Unit (Auto-Syncs DOB)" editing={editing} error={errors.age}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="AGE"
                      className={`w-1/2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.age ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black transition-all`}
                    />
                    <select
                      name="ageUnit"
                      value={formData.ageUnit}
                      onChange={handleChange}
                      className="w-1/2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase appearance-none transition-all cursor-pointer"
                    >
                      <option value="Years">YEARS</option>
                      <option value="Months">MONTHS</option>
                      <option value="Days">DAYS</option>
                    </select>
                  </div>
                </ProfileField>
              ) : (
                <ProfileField label="Age Breakdown" editing={false} value={exactAgeData.display}>
                  <div>{exactAgeData.display}</div>
                </ProfileField>
              )}

              <ProfileField label="Gender" editing={editing}>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleChange} 
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase appearance-none transition-all cursor-pointer"
                >
                  <option value="male">MALE</option>
                  <option value="female">FEMALE</option>
                  <option value="other">OTHER</option>
                </select>
              </ProfileField>

              <ProfileField label="Blood Group" editing={editing}>
                <select 
                  name="bloodGroup" 
                  value={formData.bloodGroup} 
                  onChange={handleChange} 
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black appearance-none transition-all cursor-pointer"
                >
                  {['None', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </ProfileField>

              {editing && (
                <div className="md:col-span-2 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium leading-relaxed">
                    <strong className="font-bold">Credential Sensitivity Notice:</strong> Patient portal login credentials depend on Mobile Number and Date of Birth. Any change to DOB/Age updates the verification credential required for patient login.
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <ProfileField label="Address" editing={editing} error={errors.address}>
                  <textarea 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="RESIDENTIAL ADDRESS" 
                    rows={2} 
                    className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.address ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase resize-none transition-all`} 
                  />
                </ProfileField>
              </div>
            </div>
          </div>

          {/* CLINICAL SUMMARY */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <h2 className="text-[10px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-6 sm:mb-8 flex items-center gap-3">
              <FileText size={16} className="text-teal-600 sm:size-[18px]" /> Clinical Oversight Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative z-10">
              <ProfileField label="Registered Allergies" editing={editing}>
                <input
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="NO ALLERGIES REGISTERED"
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase transition-all"
                />
              </ProfileField>

              <ProfileField label="Master Clinical Notes" editing={editing}>
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  placeholder="NO HISTORICAL LOGS"
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase h-24 resize-none transition-all"
                />
              </ProfileField>
            </div>
          </div>

          {/* EMERGENCY PROTOCOL */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h2 className="text-[10px] sm:text-[12px] font-black text-rose-600 uppercase tracking-widest mb-6 sm:mb-8 flex items-center gap-3">
              <Shield size={16} className="sm:size-[18px]" /> Emergency Contact Matrix
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <ProfileField label="Contact Number" editing={editing} error={errors.emergencyContact}>
                <input 
                  name="emergencyContact" 
                  value={formData.emergencyContact} 
                  onChange={handleChange} 
                  placeholder="10 DIGIT CONTACT" 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.emergencyContact ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black tracking-widest transition-all`} 
                />
              </ProfileField>
 
              <ProfileField label="Identity (Name)" editing={editing} error={errors.emergencyContactName}>
                <input 
                  name="emergencyContactName" 
                  value={formData.emergencyContactName} 
                  onChange={handleChange} 
                  placeholder="FULL NAME OF CONTACT" 
                  className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 border ${errors.emergencyContactName ? 'border-rose-500' : 'border-slate-100'} focus:border-teal-500 focus:bg-white outline-none text-[10px] sm:text-[11px] font-black uppercase transition-all`} 
                />
              </ProfileField>
            </div>
          </div>
        </div>

        {/* SIDE ACTIONS */}
        <div className="lg:col-span-4 space-y-8 sticky top-6">
          <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[3rem] text-white shadow-2xl shadow-slate-900/20 space-y-6 sm:space-y-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
              <Activity size={120} className="sm:size-[180px]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Biological Age (Auto-Incremented)</p>
                  <h3 className="text-2xl sm:text-4xl font-black tracking-tight mt-1 sm:mt-2 text-teal-400">
                    {exactAgeData.display}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">
                    {exactAgeData.years}Y {exactAgeData.months}M {exactAgeData.days}D ({exactAgeData.totalDays} Total Days)
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover:bg-teal-600 transition-all duration-300">
                  <HeartIcon size={24} className="text-teal-400 group-hover:text-white sm:size-[32px]" />
                </div>
              </div>

              <div className="h-px bg-white/5 w-full mb-6 sm:mb-10" />

              <div className="space-y-4">
                <button
                  onClick={() => router.push(`/${hospitalId}/masterhelpdesk/appointment-booking?patientId=${patientId}`)}
                  className="w-full py-5 bg-teal-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-slate-900 active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-teal-500/10 transition-all duration-300 group/btn"
                >
                  <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-300" />
                  New Clinical Session
                </button>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center italic leading-relaxed opacity-60">
                  Initialize a new clinical instance for this master registry node.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 space-y-4 sm:space-y-5 shadow-sm group">
            <p className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <Shield size={14} className="text-emerald-500 sm:size-[16px]" /> Security Protocol
            </p>
            <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
              <div className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] leading-relaxed sm:leading-loose">
                Log: MASTER-HELP-SYNC<br />
                Status: ENCRYPTED-READ<br />
                Node: {hospitalId.slice(0, 8)}...<br />
                Auth: VERIFIED-ACCESS
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ProfileField({ label, editing, children, error, value }: any) {
  if (!editing) {
    const val = value !== undefined ? value : children?.props?.value;
    const isClinical = label.toLowerCase().includes('allergies') || label.toLowerCase().includes('clinical') || label.toLowerCase().includes('history');
    const displayValue = (val || (isClinical ? 'None' : (typeof children === 'string' ? children : 'N/A'))).toString();
    
    return (
      <div className="space-y-1.5 sm:space-y-2 group/field">
        <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] ml-1 transition-colors group-hover/field:text-teal-600">{label}</label>
        <div className={`text-[10px] sm:text-[11px] font-black text-slate-900 uppercase bg-slate-50/50 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 group-hover/field:bg-slate-50 transition-all truncate ${!val ? 'opacity-40' : ''}`}>
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 sm:space-y-2 group/field">
      <div className="flex justify-between items-center ml-1">
        <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-colors group-hover/field:text-teal-600">{label}</label>
        {error && <span className="text-[8px] sm:text-[9px] font-black text-rose-500 uppercase tracking-tight animate-pulse">{error}</span>}
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

export default React.memo(MasterEditPatient);