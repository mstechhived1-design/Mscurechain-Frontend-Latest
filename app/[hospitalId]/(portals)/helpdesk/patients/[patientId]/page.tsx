'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Edit2,
  X,
  Activity,
  Shield,
  AlertCircle,
  Activity as HeartIcon
} from "lucide-react";
import { helpdeskService } from "@/lib/integrations";
import { calculateExactAge, calculateDobFromAge } from "@/lib/utils/date-utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

function ViewEditPatient({ params }: { params: Promise<{ patientId: string }> }) {
  const router = useRouter();
  const { patientId } = React.use(params);

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
    emergencyContactEmail: '',
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
        emergencyContactEmail: data.profile?.emergencyContactEmail || '',
        bloodGroup: data.profile?.bloodGroup || 'O+',
        allergies: data.profile?.allergies || data.profile?.conditions || '',
        medicalHistory: data.profile?.medicalHistory || data.profile?.notes || ''
      });
    } catch (error: any) {
      toast.error("Manifest retrieval failed");
      router.push('/helpdesk/patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatientData(); }, [patientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Restrictions
    if (name === 'mobile' || name === 'emergencyContact') {
      finalValue = value.replace(/\D/g, '');
      if (finalValue.length > 10) return;
    }

    if (name === 'age' || name === 'ageUnit') {
      const currentUnit = name === 'ageUnit' ? (finalValue as 'Years' | 'Months' | 'Days') : formData.ageUnit;
      const currentAgeVal = name === 'age' ? finalValue.replace(/\D/g, '') : formData.age;
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
      const exact = calculateExactAge(finalValue);
      setFormData(prev => ({
        ...prev,
        dob: finalValue,
        age: exact.primaryValue,
        ageUnit: exact.primaryUnit,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: finalValue }));
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
    
    if (formData.address.trim() && formData.address.trim().length < 3) {
      newErrors.address = "Address is too short";
    }

    if (formData.emergencyContact && !/^\d{10}$/.test(formData.emergencyContact)) {
      newErrors.emergencyContact = "Must be 10 digits";
    }

    if (formData.emergencyContactEmail && !/\S+@\S+\.\S+/.test(formData.emergencyContactEmail)) {
      newErrors.emergencyContactEmail = "Invalid email format";
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
      toast.success("Manifest & Credentials Synchronized");
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Clinical Registry...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-8">

      {/* PROFESSIONAL HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 max-w-full mx-auto">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/helpdesk/patients" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600">
              <ArrowLeft size={16} />
            </Link>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Information / {patientData?.profile?.mrn || 'NODE'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            {editing ? 'Modify Clinical Manifest' : 'Patient Master Profile'}
          </h1>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Hospital Node / Electronic Health Record</p>
        </div>
        <div className="flex items-center gap-3">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600  text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg active:scale-95"
            >
              <Edit2 size={14} /> Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 shadow-lg active:scale-95"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Syncing...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* MAIN IDENTITY CARD */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <Activity size={16} className="text-teal-600" /> Identity Matrix
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <ProfileField label="Honorific" editing={editing}>
                <select name="honorific" value={formData.honorific} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold appearance-none">
                  <option value="Mr">MR</option>
                  <option value="Mrs">MRS</option>
                  <option value="Ms">MS</option>
                  <option value="Dr">DR</option>
                  <option value="Master">MASTER</option>
                  <option value="Baby of">BABY OF</option>
                  <option value="B/o">B/O</option>
                </select>
              </ProfileField>

              <ProfileField label="Legal Name" editing={editing} error={errors.name}>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="ENTER FULL NAME" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.name ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold uppercase`} />
              </ProfileField>

              <ProfileField label="Primary Contact" editing={editing} error={errors.mobile}>
                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10 DIGIT MOBILE" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.mobile ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold tracking-tight`} />
              </ProfileField>

              <ProfileField label="Electronic Mail" editing={editing} error={errors.email}>
                <input name="email" value={formData.email} onChange={handleChange} placeholder="PATIENT@EMAIL.COM" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.email ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`} />
              </ProfileField>

              <ProfileField label="Date of Birth" editing={editing} error={errors.dob}>
                <input type="date" name="dob" max={new Date().toISOString().split('T')[0]} value={formData.dob} onChange={handleChange} className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.dob ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`} />
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
                      className={`w-1/2 px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.age ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`}
                    />
                    <select
                      name="ageUnit"
                      value={formData.ageUnit}
                      onChange={handleChange}
                      className="w-1/2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold appearance-none"
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

              <ProfileField label="Biological Gender" editing={editing}>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold appearance-none">
                  <option value="male">MALE</option><option value="female">FEMALE</option><option value="other">OTHER</option>
                </select>
              </ProfileField>

              <ProfileField label="Blood Status" editing={editing}>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold appearance-none">
                  {['None', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </ProfileField>

              {editing && (
                <div className="md:col-span-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium leading-relaxed">
                    <strong className="font-bold">Credential Sensitivity Notice:</strong> Patient portal login credentials depend on Mobile Number and Date of Birth. Any change to DOB/Age updates the verification credential required for patient login.
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <ProfileField label="Residential Access" editing={editing} error={errors.address}>
                  <textarea name="address" value={formData.address} onChange={handleChange} placeholder="RESIDENTIAL ADDRESS" rows={2} className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.address ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold uppercase resize-none`} />
                </ProfileField>
              </div>
            </div>
          </div>

          {/* CLINICAL SUMMARY */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm font-sans">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <FileText size={16} className="text-teal-600" /> Clinical History
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField label="Known Allergies" editing={editing}>
                <input name="allergies" value={formData.allergies} onChange={handleChange} placeholder="SYSTEM NORMAL" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold uppercase" />
              </ProfileField>

              <ProfileField label="Clinical Notes" editing={editing}>
                <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="NO PREVIOUS LOGS" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none text-xs font-bold uppercase h-20 resize-none" />
              </ProfileField>
            </div>
          </div>

          {/* EMERGENCY PROTOCOL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <Shield size={16} className="text-rose-600" /> Emergency Protocol
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField label="Contact Number" editing={editing} error={errors.emergencyContact}>
                <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="10 DIGIT CONTACT" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.emergencyContact ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`} />
              </ProfileField>

              <ProfileField label="Identity (Name)" editing={editing} error={errors.emergencyContactName}>
                <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="FULL NAME OF CONTACT" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.emergencyContactName ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`} />
              </ProfileField>

              <ProfileField label="Protocol Email" editing={editing} error={errors.emergencyContactEmail}>
                <input name="emergencyContactEmail" value={formData.emergencyContactEmail} onChange={handleChange} placeholder="EMERGENCY@EMAIL.COM" className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${errors.emergencyContactEmail ? 'border-rose-500' : 'border-slate-200'} focus:border-teal-500 focus:bg-white outline-none text-xs font-bold`} />
              </ProfileField>
            </div>
          </div>
        </div>

        {/* SIDE ACTIONS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biological Age (Auto-Incremented)</p>
                <h3 className="text-3xl font-bold tracking-tight mt-1 text-teal-400">
                  {exactAgeData.display}
                </h3>
                <p className="text-[9px] font-medium text-slate-400 mt-1">
                  {exactAgeData.years}Y {exactAgeData.months}M {exactAgeData.days}D ({exactAgeData.totalDays} Total Days)
                </p>
              </div>
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                <HeartIcon size={24} className="text-rose-500" />
              </div>
            </div>

            <div className="h-px bg-white/5 w-full" />

            <div className="space-y-4">
              <button
                onClick={() => router.push(`/helpdesk/appointment-booking?patientId=${patientId}`)}
                className="w-full py-4 bg-teal-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-teal-900/20 font-sans"
              >
                New OP Admission
              </button>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center italic leading-relaxed">
                Initialize a new clinical visit instance for this patient node.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-emerald-500" /> Registry Protocol
            </p>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              Log: HELPDESK-AUTO-SYNC<br />
              Status: RECORD-VERIFIED
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ProfileField({ label, editing, children, error, value }: any) {
  if (!editing) {
    const displayVal = value !== undefined ? value : (children?.props?.value || (typeof children === 'string' ? children : 'N/A'));
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="text-[11px] font-bold text-slate-900 uppercase bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
          {(displayVal || 'N/A').toString()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center ml-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        {error && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tight animate-in fade-in slide-in-from-right-1">{error}</span>}
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

export default React.memo(ViewEditPatient);