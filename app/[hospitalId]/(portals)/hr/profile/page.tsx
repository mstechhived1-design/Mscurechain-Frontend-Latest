"use client";

import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/lib/integrations/services/user.service";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
    User,
    Mail,
    Phone,
    Shield,
    Building2,
    Camera,
    LogOut,
    Save,
    ArrowRight,
    Hash,
    MapPin,
    Globe,
    Activity,
    Briefcase,
    Fingerprint,
    Hospital,
    Upload
} from "lucide-react";
import ImageCropper from '@/components/ui/ImageCropper';
import { updateUserPhotoAction } from '@/lib/integrations/actions/user.actions';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';
import SupportBadgeToggle from "@/components/common/SupportBadgeToggle";
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';

function HRProfile() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;
    const { user: authUser, logout, checkAuth } = useAuthStore();
    const [profile, setProfile] = useState<any>(null);
    const [hospital, setHospital] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPhotoUploading, setIsPhotoUploading] = useState(false);

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    // Personal Info Form
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        gender: "",
        department: "",
        employeeId: ""
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
                gender: userData.gender || "",
                department: userData.department || "Human Resources",
                employeeId: userData.employeeId || ""
            });
        } catch (error: any) {
            console.error("Profile load error:", error);
            toast.error("Failed to load profile information");
        } finally {
            setLoading(false);
        }
    };

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

            // Convert data URL to File
            const resBlob = await fetch(croppedDataUrl);
            const blob = await resBlob.blob();
            const file = new File([blob], "profile-pic.png", { type: "image/png" });

            const photoData = new FormData();
            photoData.append("profilePic", file);

            const uploadToast = toast.loading("Uploading cropped photo...");
            
            // Optimistic update for immediate visual feedback
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

                // Add timestamp to bypass browser cache
                const newPic = `${rawPic}${rawPic.includes('?') ? '&' : '?'}t=${Date.now()}`;

                setProfile((prev: any) => ({ ...prev, image: newPic }));
                
                // Update auth store with final URL
                useAuthStore.getState().setUser({ 
                    ...useAuthStore.getState().user, 
                    image: newPic,
                    avatar: newPic,
                    profilePic: newPic
                } as any);

                toast.success('Profile photo updated', { id: uploadToast });
            } else {
                toast.error('Failed to upload photo', { id: uploadToast });
            }
        } catch (error: any) {
            console.error('HR photo upload error:', error);
            toast.error('An error occurred while uploading');
        } finally {
            setIsPhotoUploading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await userService.updateProfile(formData);
            toast.success("Profile updated successfully");
            
            // Immediately sync with global auth store for reactive nav bar update
            if (authUser) {
                useAuthStore.getState().setUser({
                    ...authUser,
                    ...formData
                } as any);
            }
            
            await loadData(); // Still refresh to ensure consistency but store update is primary
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verifying Identity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {cropper.isOpen && (
                <ImageCropper
                    src={cropper.image}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropper({ isOpen: false, image: '' })}
                    aspectRatio={1}
                    circular={true}
                />
            )}
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <User className="text-indigo-600 w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 uppercase leading-none">Personnel Profile</h1>
                            <p className="text-[7px] md:text-[10px] lg:text-[10px] text-gray-500 font-medium uppercase tracking-tight mt-1">Manage your HR account and portal preferences</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Personal Profile */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-1 px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                <Shield className="text-indigo-600" size={18} />
                                <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Employee Credentials</h2>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 space-y-6">
                                <ProfileHeroCard
                                    name={profile?.name || ""}
                                    role="HR Manager"
                                    roleBadge="Authorized Access"
                                    roleColor="bg-indigo-100 text-indigo-700"
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Full Legal Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 sm:py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900"
                                                placeholder="HR Manager Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Institutional Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full pl-12 pr-4 py-4 sm:py-3 bg-gray-100 border border-gray-100 rounded-2xl cursor-not-allowed text-gray-400 text-[11px] font-bold"
                                                placeholder="institution@curechain.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Direct Mobile Contact</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={formData.mobile}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    if (val.length <= 10) setFormData({ ...formData, mobile: val });
                                                }}
                                                pattern="[0-9]{10}"
                                                maxLength={10}
                                                required
                                                title="Please enter a valid 10-digit mobile number"
                                                className="w-full pl-12 pr-4 py-4 sm:py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900"
                                                placeholder="Contact number (10 digits)"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Gender Identification</label>
                                        <div className="relative">
                                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lg:hidden" size={16} />
                                            <select
                                                value={formData.gender}
                                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                className="w-full px-4 sm:px-5 py-4 sm:py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all text-gray-900 pl-12 lg:pl-5"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-50">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                                    >
                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        Synchronize Profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Hospital Context & Tools */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
                            <div className="bg-linear-to-br from-indigo-600 to-blue-700 p-8 text-white relative">
                                <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
                                <div className="relative z-10 space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                        <Hospital className="text-white w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{hospital?.name || 'Curechain Registry'}</h3>
                                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-70">Institutional Node</p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                                        <Hash size={10} className="text-indigo-200" />
                                        <span className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">{hospital?.hospitalId || 'ID_N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-rose-500 shadow-xs shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Location Access</p>
                                            <p className="text-[11px] font-bold text-gray-700 line-clamp-2 leading-relaxed">{hospital?.address || 'Verified Operational Site'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-500 shadow-xs shrink-0">
                                            <Globe size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">External Domain</p>
                                            <p className="text-[11px] font-bold text-gray-700 truncate leading-relaxed">{hospital?.website || 'internal.curechain.io'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-amber-500 shadow-xs shrink-0">
                                            <Activity size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Service Interval</p>
                                            <p className="text-[11px] font-bold text-gray-700 leading-relaxed">{hospital?.createdAt ? new Date(hospital.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Operationalized 2024'}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/${hospitalId}/hr/hospital/departments`)}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] group/btn"
                                >
                                    Governance Center <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <PrinterSettingsCard />
                        <SupportBadgeToggle />

                        {/* HR Support Quick Actions */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-indigo-600" />
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Compliance Protocol</h4>
                                </div>
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div> Active
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors">
                                        <Briefcase size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">Standard Operating Procedures</p>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Protocol Documentation</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        await logout();
                                        router.push('/hr/login');
                                    }}
                                    className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-50 transition-all flex items-center gap-4 group w-full text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500">
                                        <LogOut size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-tight">Terminate Local Session</p>
                                        <p className="text-[8px] text-rose-400 font-bold uppercase tracking-wider">Secure Access Control</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(HRProfile);
