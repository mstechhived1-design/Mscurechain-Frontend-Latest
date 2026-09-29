"use client";

import React, { useState, useEffect, useMemo } from 'react';
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/integrations/services/user.service";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { apiClient } from "@/lib/integrations/api/apiClient";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  Camera,
  LogOut,
  Save,
  ArrowRight,
  BadgeCheck,
  Hash,
  MapPin,
  Globe,
  Activity,
  Upload,
  X
} from "lucide-react";
import ImageCropper from '@/components/ui/ImageCropper';
import SupportBadgeToggle from "@/components/common/SupportBadgeToggle";
import PrinterSettingsCard from "@/components/printers/PrinterSettingsCard";
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';

function HospitalAdminProfile() {
  const router = useRouter();
  const { user: authUser, logout, checkAuth } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cropper State
  const [cropper, setCropper] = useState<{
    isOpen: boolean;
    image: string;
  }>({
    isOpen: false,
    image: ''
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropper({
        isOpen: true,
        image: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    try {
      setCropper({ isOpen: false, image: '' });
      setIsPhotoUploading(true);

      const resBlob = await fetch(croppedDataUrl);
      const blob = await resBlob.blob();
      const file = new File([blob], "profile-pic.png", { type: "image/png" });

      const photoData = new FormData();
      photoData.append("profilePic", file);

      const uploadToast = toast.loading("Uploading cropped photo...");
      
      setProfile((prev: any) => ({ ...prev, image: croppedDataUrl }));
      useAuthStore.getState().setUser({ 
        ...useAuthStore.getState().user, 
        image: croppedDataUrl,
        avatar: croppedDataUrl,
        profilePic: croppedDataUrl 
      } as any);

      const res = await userService.updateProfile(photoData);

      if (res && (res as any).image) {
        const userData = res;
        const rawPic = userData.image || userData.avatar;
        
        if (!rawPic) {
          toast.error('Success, but no image URL returned', { id: uploadToast });
          return;
        }

        const newPic = `${rawPic}${rawPic.includes('?') ? '&' : '?'}t=${Date.now()}`;

        setProfile((prev: any) => ({ ...prev, image: newPic }));
        useAuthStore.getState().setUser({ 
          ...useAuthStore.getState().user, 
          image: newPic,
          avatar: newPic,
          profilePic: newPic 
        } as any);

        toast.success("Profile photo updated successfully!", { id: uploadToast });
        checkAuth();
      } else {
        toast.error("Failed to update profile photo", { id: uploadToast });
      }
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error("An error occurred during photo upload");
    } finally {
      setIsPhotoUploading(false);
    }
  };
  
  // Personal Info Form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    gender: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, hospitalRes] = await Promise.all([
        userService.getProfile(),
        hospitalAdminService.getHospital()
      ]);
      
      const userData = (userRes as any).user || userRes;
      setProfile(userData);
      setHospital(hospitalRes.hospital);
      
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        mobile: userData.mobile || "",
        gender: userData.gender || ""
      });
    } catch (error: any) {
      console.error("Profile load error:", error);
      toast.error("Failed to load profile information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number
    const mobileTrimmed = (formData.mobile || '').trim();
    if (!mobileTrimmed) {
      toast.error("Mobile number is required");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobileTrimmed)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSaving(true);
    try {
      await userService.updateProfile({ ...formData, mobile: mobileTrimmed });
      toast.success("Profile updated successfully");
      await checkAuth(); // Refresh global auth state
      await loadData(); // Refresh local state
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!securityForm.currentPassword) {
      toast.error("Current password is required");
      return;
    }
    
    const { newPassword, confirmPassword } = securityForm;
    
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one digit");
      return;
    }
    if (!/[@$!%*?&#^()_+\-=]/.test(newPassword)) {
      toast.error("Password must contain at least one special character");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsChangingPassword(true);
    const saveToast = toast.loading("Updating security credentials...");
    try {
      await apiClient('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword
        })
      });
      toast.success("Security credentials updated successfully", { id: saveToast });
      setShowSecurityModal(false);
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to update security credentials", { id: saveToast });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-gray-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Identity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {cropper.isOpen && (
        <ImageCropper
          src={cropper.image}
          onCrop={handleCropComplete}
          onCancel={() => setCropper({ isOpen: false, image: '' })}
          aspectRatio={1}
          circular={true}
        />
      )}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-3 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <User className="text-emerald-600" size={32} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white">Admin Identity</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal account and system preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              logout();
              router.push('/auth/login');
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Logout Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-1 px-3 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex items-center gap-2">
              <Shield className="text-emerald-600" size={18} />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Account Credentials</h2>
            </div>
            <div className="space-y-6">
              <ProfileHeroCard
                name={profile?.name || ""}
                role="Administrator"
                roleBadge="Full Access"
                roleColor="bg-emerald-100 text-emerald-700"
                imageUrl={profile?.image || profile?.avatar}
                bio={profile?.bio || profile?.user?.bio}
                isPhotoUploading={isPhotoUploading}
                onPhotoUpload={handlePhotoUpload}
                onBioSave={async (newBio: string) => {
                  try {
                    await userService.updateProfile({ bio: newBio });
                    setProfile((prev: any) => prev ? { ...prev, bio: newBio } : null);
                    toast.success("Bio updated successfully");
                  } catch (error: any) {
                    toast.error(error.message || "Failed to update bio");
                    throw error;
                  }
                }}
              />
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-3 md:p-8 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Primary Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-not-allowed text-gray-500 font-medium"
                      placeholder="email@mscurechain.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium"
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 md:px-6 py-3 bg-primary-theme hover:bg-primary-theme/80 text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  Save Profile Identity
                </button>
              </div>
            </form>
          </div>
          
          {/* Recent Activity/System Preferences could go here */}
          <div className="bg-white rounded-2xl p-3 md:p-6 text-gray-900 dark:text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 md:p-4 md:p-8 opacity-10">
              <Activity size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm md:text-lg font-bold mb-2">System Security</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md">Your account is protected by mandatory multi-factor authentication and role-based access control.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowSecurityModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm border border-emerald-500"
                >
                  <Hash size={16} /> Change Passcode
                </button>
                <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold transition-all border border-emerald-500/20">
                  Login History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hospital Linkage */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-1 px-3 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600" size={18} />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Associated Hospital</h2>
              </div>
              <BadgeCheck className="text-blue-500" size={18} />
            </div>
            
            <div className="p-2 md:p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-800">
                  <Building2 size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate px-2">{hospital?.name}</h3>
                <code className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">#{hospital?.hospitalId || 'ID_PENDING'}</code>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <MapPin className="text-rose-500 shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Address</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{hospital?.address}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <Globe className="text-blue-500 shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Network Authority</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{hospital?.website || 'internal-node.mscurechain.com'}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <Calendar className="text-amber-500 shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered Since</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{hospital?.createdAt ? new Date(hospital.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Jan 2024'}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => router.push('/hospital-admin/hospital/details')}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                Manage Hospital Profile <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 md:p-6 overflow-hidden">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Managed Inventory</h4>
               <span className="text-[10px] font-bold text-emerald-500">LIVE</span>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                 <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{hospital?.roomCount || 0}</p>
                 <p className="text-[10px] font-bold text-indigo-600/60 uppercase">Clinics</p>
               </div>
               <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                 <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{hospital?.departmentCount || 0}</p>
                 <p className="text-[10px] font-bold text-violet-600/60 uppercase">Units</p>
               </div>
             </div>
          </div>

          <PrinterSettingsCard />
          <SupportBadgeToggle />
        </div>
      </div>

      {/* Security Credentials Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-2">
                <Shield className="text-emerald-600" size={18} />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Change Credentials</h3>
              </div>
              <button 
                onClick={() => {
                  setShowSecurityModal(false);
                  setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  required
                  value={securityForm.currentPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white text-sm"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  required
                  value={securityForm.newPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white text-sm"
                  placeholder="At least 8 chars, 1 upper, 1 special"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white text-sm"
                  placeholder="Retype new password"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityModal(false);
                    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-theme hover:bg-primary-theme/90 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isChangingPassword ? "Updating..." : "Update Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(HospitalAdminProfile);
