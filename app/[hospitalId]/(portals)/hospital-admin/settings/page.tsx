"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Calendar,
  Save,
  Loader2,
  KeyRound,
  Fingerprint,
  Camera
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/integrations/services/user.service";
import toast from "react-hot-toast";
import { Card, Button } from "@/components/admin";
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

export default function HospitalAdminSettings() {
  const { user: authUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    employeeId: "",
    department: "",
    gender: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res: any = await userService.getProfile();
        // Backend /auth/me returns the user object directly
        if (res) {
          setProfile(res);
          setFormData({
            name: res.name || "",
            email: res.email || "",
            mobile: res.mobile || "",
            employeeId: res.employeeId || "",
            department: res.department || "",
            gender: res.gender || "",
          });
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Could not load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await userService.updateProfile(formData);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Personal Registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Profile</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
          <Fingerprint size={12} className="text-blue-500" /> Secure Identity Registry • Hospital Administration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-xl shadow-blue-900/5 bg-white flex flex-col items-center p-2 md:p-4 md:p-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-4xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200 ring-4 ring-white relative z-10">
                {profile?.name?.charAt(0) || "A"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-2 rounded-xl shadow-md border border-slate-100 z-20 cursor-pointer hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100">
                <Camera size={14} className="text-slate-600" />
              </div>
            </div>

            <div className="text-center mt-6 space-y-1">
              <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">{profile?.name}</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Hospital Administrator</p>
            </div>

            <div className="w-full h-px bg-slate-50 my-6" />

            <div className="w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShieldCheck size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                  <p className="text-[11px] font-black text-emerald-600 uppercase italic">Verified Admin</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Institutional ID</p>
                  <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[120px]">
                    {authUser?.hospitalId || authUser?.hospital || "N/A"}
                  </p>
                </div>
              </div>

              {profile?.employeeId && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <Fingerprint size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Employee ID</p>
                    <p className="text-[11px] font-black text-slate-700 uppercase">{profile.employeeId}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Calendar size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Member Since</p>
                  <p className="text-[11px] font-bold text-slate-700 uppercase">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-2 md:p-6 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <KeyRound size={80} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-wider mb-2 relative z-10 italic">Account Security</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-4 relative z-10">Last password update detected on legacy sequence</p>
            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest py-3 relative z-10">
              Reset Security Key
            </Button>
          </Card>

          <PrinterSettingsCard />
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-8">
          <Card className="p-3 md:p-8 border-slate-200 shadow-xl shadow-blue-900/5 bg-white">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-tight">Personal Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ENTER FULL NAME..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Contact</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="ENTER MOBILE #..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID</label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="ENTER EMPLOYEE ID..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="ENTER DEPARTMENT..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all appearance-none"
                  >
                    <option value="">SELECT GENDER...</option>
                    <option value="male">MALE</option>
                    <option value="female">FEMALE</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      placeholder="EMAIL IDENTITY..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none opacity-60 cursor-not-allowed italic"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic ml-1">* Email is used as primary identity and cannot be modified.</p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest px-10 py-4 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Synchronize Registry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
