"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { hospitalAdminService } from "@/lib/integrations";
import {
  User,
  ArrowLeft,
  CreditCard,
  Building,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, FormInput } from "@/components/admin";

interface FormData {
  // Personal
  honorific: string;
  name: string;
  email: string;
  mobile: string;
  gender: string;
  password?: string;
  dateOfBirth: string;
  department: string[];
  assignedRoom: string[];
  designation: string;
  employeeId: string;
  employmentType: string;
  joiningDate: string;

  // Financial
  baseSalary: string;
  panNumber: string;
  pfNumber: string;
  esiNumber: string;
  uanNumber: string;
  aadharNumber: string;
  fatherName: string;
  workLocation: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactMobile: string;
  emergencyContactRelationship: string;

  // Qualifications & More
  qualifications: string[];
  certifications: string[];
  skills: string[];
  languages: string[];
  notes: string;

  // Status
  status: string;
  role: string;
}

export default function HREditStaffPage() {
  const router = useRouter();
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const id = params.id as string;
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);

  const [formData, setFormData] = useState<FormData>({
    honorific: "Mr",
    name: "", email: "", mobile: "", gender: "",
    dateOfBirth: "",
    department: [], assignedRoom: [], designation: "", employeeId: "", employmentType: "full-time",
    joiningDate: "",
    baseSalary: "0",
    panNumber: "",
    pfNumber: "",
    esiNumber: "",
    uanNumber: "",
    aadharNumber: "",
    fatherName: "",
    workLocation: "",
    bankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifscCode: ""
    },
    emergencyContactName: "",
    emergencyContactMobile: "",
    emergencyContactRelationship: "",
    qualifications: [],
    certifications: [],
    skills: [],
    languages: [],
    notes: "",
    status: "active",
    role: "staff"
  });

  const [showPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id) fetchStaff();
  }, [id]);

  const fetchStaff = async () => {
    try {
      setFetching(true);
      const [data, typesData, roomsData] = await Promise.all([
        hospitalAdminService.getStaffById(id),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getIPDDepartments().then(res => res.map((d: any) => d.name)).catch(() => [])),
        import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getRooms().catch(() => []))
      ]);
      const staff = data.staff;

      setAvailableDepartments(typesData);
      setAllRooms(roomsData);

      // Handle legacy string vs new array department
      let deptArray: string[] = [];
      if (Array.isArray(staff.department)) {
        deptArray = staff.department;
      } else if (typeof staff.department === 'string') {
        deptArray = staff.department.split(',').map((d: any) => d.trim()).filter(Boolean);
      }

      let roomArray: string[] = [];
      if (Array.isArray(staff.assignedRoom)) {
        roomArray = staff.assignedRoom;
      } else if (typeof staff.assignedRoom === 'string') {
        roomArray = staff.assignedRoom.split(',').map((r: any) => r.trim()).filter(Boolean);
      }

      setFormData({
        honorific: staff.honorific || "Mr",
        name: staff.name || "",
        email: staff.email || "",
        mobile: staff.mobile || "",
        gender: staff.gender || "",
        dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : "",
        department: deptArray,
        assignedRoom: roomArray,
        designation: staff.designation || "",
        employeeId: staff.employeeId || "",
        employmentType: staff.employmentType || "full-time",
        joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : "",
        baseSalary: staff.baseSalary?.toString() || "0",
        panNumber: staff.panNumber || "",
        pfNumber: staff.pfNumber || "",
        esiNumber: staff.esiNumber || "",
        uanNumber: staff.uanNumber || "",
        aadharNumber: staff.aadharNumber || "",
        fatherName: staff.fatherName || "",
        workLocation: staff.workLocation || "",
        bankDetails: {
          accountName: staff.bankDetails?.accountName || "",
          accountNumber: staff.bankDetails?.accountNumber || "",
          bankName: staff.bankDetails?.bankName || "",
          ifscCode: staff.bankDetails?.ifscCode || ""
        },
        emergencyContactName: staff.emergencyContact?.name || "",
        emergencyContactMobile: staff.emergencyContact?.mobile || "",
        emergencyContactRelationship: staff.emergencyContact?.relationship || "",
        qualifications: staff.qualifications || [],
        certifications: staff.certifications || [],
        skills: staff.skills || [],
        languages: staff.languages || [],
        notes: staff.notes || "",
        status: staff.status || "active",
        role: staff.role || "staff"
      });
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to load staff records");
      router.push(`/${hospitalId}/hr/staff`);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Strict Validations
    if (name === "mobile" && (!/^\d*$/.test(value) || value.length > 10)) return;
    if (name === "aadharNumber" && (!/^\d*$/.test(value) || value.length > 12)) return;
    if (name === "panNumber" && (value.length > 10)) return;
    if (name === "baseSalary" && !/^\d*$/.test(value)) return;

    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: name === "panNumber" ? value.toUpperCase() : value }));
  };

  const handleDepartmentAdd = (dept: string) => {
    if (!formData.department.includes(dept)) {
      setFormData(prev => ({ ...prev, department: [...prev.department, dept] }));
    }
  };

  const handleDepartmentRemove = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      department: prev.department.filter(d => d !== dept),
      assignedRoom: prev.assignedRoom.filter(r => {
        const roomObj = allRooms.find(room => room.label === r);
        return roomObj ? roomObj.type !== dept : true;
      })
    }));
  };

  const handleRoomAdd = (room: string) => {
    if (!formData.assignedRoom.includes(room)) {
      setFormData(prev => ({ ...prev, assignedRoom: [...prev.assignedRoom, room] }));
    }
  };

  const handleRoomRemove = (room: string) => {
    setFormData(prev => ({ ...prev, assignedRoom: prev.assignedRoom.filter(r => r !== room) }));
  };

  const validateField = (name: string, value: any) => {
    let error = "";
    if (name === "name" && !value) error = "Full Name is required";
    if (name === "email" && !value) error = "Email is required";
    if (name === "mobile") {
      if (!value) error = "Mobile is required";
      else if (value.length < 10) error = "Valid 10-digit Mobile is required";
    }
    if (name === "panNumber" && value && value.length !== 10) error = "Invalid PAN (Must be 10 chars)";
    if (name === "aadharNumber" && value && value.length !== 12) error = "Invalid Aadhar (Must be 12 digits)";
    if (name === "employeeId" && !value) error = "Employee ID is required";

    if (error) toast.error(error);
    return !error;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateForm = () => {
    const fieldsToValidate = ['name', 'email', 'mobile', 'employeeId', 'panNumber', 'aadharNumber'] as const;
    let isValid = true;
    fieldsToValidate.forEach(field => {
      if (!validateField(field, formData[field])) isValid = false;
    });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const payload: any = {
        ...formData,
        baseSalary: parseInt(formData.baseSalary) || 0,
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          mobile: formData.emergencyContactMobile,
          relationship: formData.emergencyContactRelationship
        } : undefined,
      };

      if (!showPasswordFields || !formData.password) delete payload.password;

      await hospitalAdminService.updateStaff(id, payload);
      toast.success("Personnel registry updated successfully");
      router.refresh();
      router.push(`/${hospitalId}/hr/staff`);
    } catch (err: any) {
      toast.error(err.message || "Registry update failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex flex-col items-center justify-center py-40">
      <Zap className="animate-pulse text-blue-600 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synchronizing Local Data...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 pt-1">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 uppercase leading-none">Edit Registry Record</h1>
            <p className="text-gray-500 text-xs mt-0.5">Staff : {formData.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${hospitalId}/hr/staff/${id}`)}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            <User size={14} /> View Profile
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Compact 3-Column Layout for Personal Info */}
        <Card title="Personnel Profile" icon={<User className="text-gray-400" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Honorific <span className="text-rose-500 ml-0.5">*</span></label>
              <select name="honorific" value={formData.honorific} onChange={handleChange} required
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none">
                <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <FormInput label="Full Name" type="text" name="name" required value={formData.name} onChange={handleChange} onBlur={handleBlur} className="rounded-xl font-bold" />
            </div>
            <div className="md:col-span-4">
              <FormInput label="Official Email" type="email" name="email" required value={formData.email} onChange={handleChange} onBlur={handleBlur} className="rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="Official Mobile" type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} onBlur={handleBlur} className="rounded-xl" maxLength={10} placeholder="10 Digits" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <FormInput label="Father's Name" type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="rounded-xl" />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Update Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Optional"
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Compact Layout for Institutional */}
        <Card title="Institutional Registry" icon={<Building className="text-indigo-400" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Assigned Department(s)</label>
              <div className="min-h-[46px] w-full px-2 py-2 bg-white border border-gray-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-blue-500/10 transition-all flex flex-wrap gap-2 items-center">
                {Array.isArray(formData.department) && formData.department.map(dept => (
                  <span key={dept} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100 flex items-center gap-1">
                    {dept}
                    <button type="button" onClick={() => handleDepartmentRemove(dept)} className="hover:text-indigo-900">&times;</button>
                  </span>
                ))}
                <select
                  className="bg-transparent border-none outline-none text-xs font-medium min-w-[80px] text-gray-500 cursor-pointer p-0"
                  value=""
                  onChange={(e) => { if (e.target.value) handleDepartmentAdd(e.target.value); }}
                >
                  <option value="">+ Add</option>
                  {availableDepartments.filter(d => !formData.department.includes(d)).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-12 space-y-1.5 pt-4 border-t border-gray-50">
              <label className="text-xs font-semibold text-gray-700 ml-1">Assigned Rooms (Conditional to Types)</label>
              <div className="min-h-[46px] w-full px-2 py-2 bg-white border border-gray-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-blue-500/10 transition-all flex flex-wrap gap-2 items-center">
                {Array.isArray(formData.assignedRoom) && formData.assignedRoom.map(room => (
                  <span key={room} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 flex items-center gap-1">
                    {room}
                    <button type="button" onClick={() => handleRoomRemove(room)} className="hover:text-emerald-900">&times;</button>
                  </span>
                ))}
                <select
                  className="bg-transparent border-none outline-none text-xs font-medium min-w-[120px] text-gray-500 cursor-pointer p-0"
                  value=""
                  onChange={(e) => { if (e.target.value) handleRoomAdd(e.target.value); }}
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

            <div className="md:col-span-3">
              <FormInput label="Designation" name="designation" value={formData.designation} onChange={handleChange} className="rounded-xl font-bold" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="Staff ID" name="employeeId" required value={formData.employeeId} onChange={handleChange} onBlur={handleBlur} className="rounded-xl font-bold text-indigo-600" />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold focus:ring-2 outline-none cursor-pointer ${formData.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                <option value="active">Active</option>
                <option value="inactive">On Hold</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Dense Financial Grid */}
        <Card title="Financial & Bank Disclosure" icon={<CreditCard className="text-blue-600" />} padding="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-2">
              <FormInput label="Base Salary" type="text" name="baseSalary" required value={formData.baseSalary} onChange={handleChange} className="rounded-xl font-bold text-blue-600 bg-blue-50/30" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="PAN No" type="text" name="panNumber" placeholder="ABCDE1234F" maxLength={10} value={formData.panNumber} onChange={handleChange} onBlur={handleBlur} className="rounded-xl uppercase font-bold" />
            </div>
            <div className="md:col-span-3">
              <FormInput label="Aadhar No" type="text" name="aadharNumber" placeholder="12 Digits" maxLength={12} value={formData.aadharNumber} onChange={handleChange} onBlur={handleBlur} className="rounded-xl font-bold" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="PF No" type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} className="rounded-xl font-bold" />
            </div>
            <div className="md:col-span-2">
              <FormInput label="ESI No" type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} className="rounded-xl font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-50">
            <FormInput label="Bank Holder" type="text" value={formData.bankDetails.accountName} onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountName: e.target.value } }))} className="rounded-xl text-xs uppercase" />
            <FormInput label="Account No" type="text" value={formData.bankDetails.accountNumber} onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }))} className="rounded-xl text-xs" />
            <FormInput label="Bank Name" type="text" value={formData.bankDetails.bankName} onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }))} className="rounded-xl text-xs uppercase" />
            <FormInput label="IFSC Code" type="text" value={formData.bankDetails.ifscCode} onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifscCode: e.target.value } }))} className="rounded-xl text-xs uppercase" />
          </div>
        </Card>

        {/* Save Bar */}
        <div className="sticky bottom-8 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3 ml-4">
            <ShieldCheck className="text-blue-500" size={20} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none hidden sm:block">Institutional Data Security Enabled</p>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-all">Discard</button>
            <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
