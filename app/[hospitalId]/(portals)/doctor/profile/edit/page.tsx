"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import {
    User, Mail, Phone, Briefcase, Award,
    Building, Landmark, Wallet, Globe,
    Save, ArrowLeft, Plus, X,
    Calendar, Clock, IndianRupee, FileText, Upload, CheckCircle2,
    ShieldCheck, ChevronDown, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDoctorProfileAction, updateDoctorProfileAction, uploadDoctorPhotoAction } from '@/lib/integrations/actions/doctor.actions';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { useAuthStore } from '@/stores/authStore';
import ImageCropper from '@/components/ui/ImageCropper';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';
import { clearApiCache } from '@/lib/integrations/api';
import { useTenantLink } from '@/hooks/useTenantLink';
import { TagInput } from '@/components/common/TagInput';
import { COMMON_SPECIALTIES, COMMON_QUALIFICATIONS, COMMON_LANGUAGES } from '@/lib/constants/medicalData';
import { formatDoctorName, cleanDoctorName } from '@/lib/utils/name-utils';

export default function EditDoctorProfilePage() {
    const router = useRouter();
    const { getPath, hospitalId } = useTenantLink();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPhotoUploading, setIsPhotoUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const { user, setUser } = useAuthStore();
    const [docViewer, setDocViewer] = useState<{ url: string; label: string } | null>(null);

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    const [formData, setFormData] = useState<any>({
        // Personal & Account
        name: '',
        email: '',
        mobile: '',
        profilePic: '',
        gender: '',
        dateOfBirth: '',

        // Professional
        specialties: [],
        qualifications: [],
        bio: '',
        experienceStart: '',
        languages: [],
        awards: [],
        degreeCertificate: '',
        doctorateCertificate: '',
        internshipCertificate: '',

        // Medical Registration
        medicalRegistrationNumber: '',
        registrationCouncil: '',
        registrationYear: '',
        registrationExpiryDate: '',
        registrationCertificate: '',

        // Practice
        employeeId: '',
        consultationFee: '',
        consultationDuration: '',
        maxAppointmentsPerDay: '',

        // Bank & Payroll
        bankDetails: {
            bankName: '',
            accountNumber: '',
            accountName: '',
            ifscCode: ''
        },
        panNumber: '',
        aadharNumber: '',
        baseSalary: '',
        pfNumber: '',
        esiNumber: '',
        uanNumber: ''
    });

    // Helper states for adding items
    const [tempAward, setTempAward] = useState("");


    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await getDoctorProfileAction();
                if (res.success && res.data) {
                    const d = res.data;
                    const cleanArrayArtefacts = (arr: any) => {
                        if (!arr || !Array.isArray(arr)) return [];
                        let result: string[] = [];
                        for (let item of arr) {
                            if (!item || item === "[]" || item === '["[]"]' || item === '""') continue;
                            try {
                                const parsed = JSON.parse(item);
                                if (Array.isArray(parsed)) {
                                    result.push(...parsed.filter(Boolean));
                                } else if (typeof parsed === 'string') {
                                    result.push(parsed);
                                } else {
                                    result.push(item);
                                }
                            } catch {
                                result.push(item);
                            }
                        }
                        return [...new Set(result)].filter(i => i && i !== "[]" && i !== '["[]"]');
                    };

                    setFormData({
                        name: cleanDoctorName(d.user?.name || ''),
                        email: d.user?.email || '',
                        mobile: d.user?.mobile || '',
                        profilePic: d.profilePic || '',
                        gender: d.user?.gender || d.gender || '',
                        dateOfBirth: d.user?.dateOfBirth ? new Date(d.user.dateOfBirth).toISOString().split('T')[0] : (d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : ''),
                        specialties: cleanArrayArtefacts(d.specialties),
                        qualifications: cleanArrayArtefacts(d.qualifications),
                        bio: d.bio || '',
                        experienceStart: d.experienceStart ? new Date(d.experienceStart).toISOString().split('T')[0] : '',
                        languages: cleanArrayArtefacts(d.languages),
                        awards: cleanArrayArtefacts(d.awards),
                        medicalRegistrationNumber: d.medicalRegistrationNumber || '',
                        registrationCouncil: d.registrationCouncil || '',
                        registrationYear: d.registrationYear || '',
                        registrationExpiryDate: d.registrationExpiryDate ? new Date(d.registrationExpiryDate).toISOString().split('T')[0] : '',
                        degreeCertificate: d.degreeCertificate || '',
                        registrationCertificate: d.registrationCertificate || '',
                        doctorateCertificate: d.doctorateCertificate || '',
                        internshipCertificate: d.internshipCertificate || '',
                        employeeId: d.employeeId || '',
                        consultationFee: d.consultationFee || '',
                        consultationDuration: d.consultationDuration || '',
                        maxAppointmentsPerDay: d.maxAppointmentsPerDay || '',
                        bankDetails: {
                            bankName: d.bankDetails?.bankName || '',
                            accountNumber: d.bankDetails?.accountNumber || '',
                            accountName: d.bankDetails?.accountName || '',
                            ifscCode: d.bankDetails?.ifscCode || ''
                        },
                        panNumber: d.panNumber || '',
                        aadharNumber: d.aadharNumber || '',
                        baseSalary: d.baseSalary || '',
                        pfNumber: d.pfNumber || '',
                        esiNumber: d.esiNumber || '',
                        uanNumber: d.uanNumber || ''
                    });
                }
            } catch (error) {
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        // Only block on truly required fields
        if (!formData.name?.trim()) {
            newErrors.name = "Name is required";
        }

        if (!formData.email?.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        // NOTE: mobile, PAN, Aadhar, IFSC, dateOfBirth format checks are shown as
        // real-time inline hints (via handleChange) but do NOT block saving —
        // because the DB may store values (e.g. mobile with country code) that
        // are technically valid but don't match the overly strict regex patterns.

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let { name, value } = e.target;

        // Auto uppercase for specific fields
        if (['bankDetails.ifscCode', 'panNumber'].includes(name)) {
            value = value.toUpperCase();
        }

        let fieldError = "";

        // Real-time validations
        if (name === 'name') {
            if (!/^[A-Za-z .\-']{2,}$/.test(value) && value.length > 0) fieldError = "Only letters, spaces, dots, hyphens & apostrophes allowed";
        }
        if (name === 'bankDetails.accountName') {
            if (!/^[A-Za-z ]{3,}$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces, min 3 chars";
        }
        if (name === 'bankDetails.bankName') {
            if (!/^[A-Za-z ]+$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces";
        }
        if (name === 'bankDetails.accountNumber') {
            if (!/^[0-9]{9,18}$/.test(value) && value.length > 0) fieldError = "9-18 digits only";
        }
        if (name === 'bankDetails.ifscCode') {
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value) && value.length > 0) fieldError = "Invalid IFSC (e.g., SBIN0012345)";
        }
        if (name === 'panNumber') {
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value) && value.length > 0) fieldError = "Invalid PAN format";
        }
        if (name === 'aadharNumber') {
            if (!/^[0-9]{12}$/.test(value) && value.length > 0) fieldError = "Exactly 12 digits";
        }
        if (name === 'pfNumber') {
            if (value.length > 0 && value.length < 5) fieldError = "Minimum 5 characters";
        }
        if (name === 'esiNumber') {
            if (!/^[0-9]{10,17}$/.test(value) && value.length > 0) fieldError = "10 to 17 digits only";
        }
        if (name === 'uanNumber') {
            if (!/^[0-9]{12}$/.test(value) && value.length > 0) fieldError = "Exactly 12 digits";
        }

        setErrors((prev: any) => ({
            ...prev,
            [name]: fieldError
        }));

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles && selectedFiles[0]) {
            const file = selectedFiles[0];
            if (file.size > 5 * 1024 * 1024) {
                setUploadErrors((prev: any) => ({
                    ...prev,
                    [name]: "Particular size exceed, please choose below the 5MB"
                }));
                toast.error(`${name} exceeds 5MB limit`);
                return;
            } else {
                setUploadErrors((prev: any) => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
            }
            setFiles((prev: any) => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setUploadErrors((prev: any) => ({ ...prev, profilePic: "Particular size exceed, please choose below the 5MB" }));
            toast.error('Image must be smaller than 5MB');
            return;
        } else {
            setUploadErrors((prev: any) => {
                const next = { ...prev };
                delete next.profilePic;
                return next;
            });
        }

        // Open Cropper
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
            setFormData((prev: any) => ({ ...prev, profilePic: croppedDataUrl }));
            if (setUser && user) {
                setUser({
                    ...user,
                    image: croppedDataUrl,
                    avatar: croppedDataUrl,
                    profilePic: croppedDataUrl
                } as any);
            }

            // Change from server action to client-side API call to avoid token-mirroring issues in multi-tab
            const res = await doctorService.updateProfile(photoData);

            if (res && (res as any).profilePic) {
                const rawPic = (res as any).profilePic?.url || (res as any).profilePic;

                if (!rawPic) {
                    toast.error('Success, but no image URL returned', { id: uploadToast });
                    return;
                }

                // Add timestamp to bypass browser cache (ONLY if NOT a data URI)
                const newPic = (rawPic && rawPic.startsWith('data:'))
                    ? rawPic
                    : `${rawPic}${rawPic.includes('?') ? '&' : '?'}t=${Date.now()}`;

                setFormData((prev: any) => ({ ...prev, profilePic: newPic }));

                // Update auth store with final URL
                if (setUser && user) {
                    setUser({
                        ...user,
                        image: newPic,
                        avatar: newPic,
                        profilePic: newPic
                    } as any);
                }

                // ✅ CRITICAL: Clear memory cache so next page refresh is fresh
                clearApiCache();

                toast.success('Profile photo updated!', { id: uploadToast });
            } else {
                toast.error('Failed to upload photo', { id: uploadToast });
            }
        } catch (error: any) {
            console.error('Photo upload error:', error);
            toast.error('An error occurred while uploading');
        } finally {
            setIsPhotoUploading(false);
        }
    };

    const handleDeleteDocument = async (field: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            // Optimistic Update
            setFormData((prev: any) => ({ ...prev, [field]: '' }));
            setFiles((prev: any) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });

            toast.loading("Removing document reference...", { duration: 1500 });
            // Since we save the whole profile, we'll just empty the URL on the next Save.
            // But if we want immediate sync, we can call handleSave() or an action.
            toast.success("Document removed locally. Save profile to confirm deletion permanently.");
        } catch (err) {
            toast.error("Failed to delete document");
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!validate()) {
            toast.error("Please correct the errors in the form");
            return;
        }

        setIsSaving(true);
        try {
            const sanitizedName = cleanDoctorName(formData.name);
            const formDataToSubmit = new FormData();
            formDataToSubmit.append('hospital', hospitalId || '');

            // URL/file fields that must NOT go through the generic loop (to avoid double-sends and field-size issues)
            const urlFields = new Set(['profilePic', 'degreeCertificate', 'registrationCertificate', 'doctorateCertificate', 'internshipCertificate']);

            // Add all simple scalar fields (skip objects, arrays, and URL/cert fields)
            Object.keys(formData).forEach(key => {
                const val = key === 'name' ? sanitizedName : formData[key];
                if (!urlFields.has(key) && typeof val !== 'object' && !Array.isArray(val)) {
                    formDataToSubmit.append(key, val ?? '');
                }
            });

            // Arrays: JSON-stringify for multer-compatible parsing on the backend
            formDataToSubmit.append('specialties', JSON.stringify(formData.specialties));
            formDataToSubmit.append('qualifications', JSON.stringify(formData.qualifications));
            formDataToSubmit.append('languages', JSON.stringify(formData.languages));
            formDataToSubmit.append('awards', JSON.stringify(formData.awards));
            formDataToSubmit.append('bankDetails', JSON.stringify(formData.bankDetails));

            // New file uploads (take priority over existing URLs)
            Object.keys(files).forEach(key => {
                formDataToSubmit.append(key, files[key]);
            });

            // Existing URL strings — only send if no new file selected for that slot
            if (formData.profilePic && !files['profilePic']) formDataToSubmit.append('profilePic', formData.profilePic);
            if (formData.degreeCertificate && !files['degreeCertificate']) formDataToSubmit.append('degreeCertificate', formData.degreeCertificate);
            if (formData.registrationCertificate && !files['registrationCertificate']) formDataToSubmit.append('registrationCertificate', formData.registrationCertificate);
            if (formData.doctorateCertificate && !files['doctorateCertificate']) formDataToSubmit.append('doctorateCertificate', formData.doctorateCertificate);
            if (formData.internshipCertificate && !files['internshipCertificate']) formDataToSubmit.append('internshipCertificate', formData.internshipCertificate);


            const res = await updateDoctorProfileAction(formDataToSubmit);
            if (res.success) {
                // ✅ SYNC AUTH STORE: Update global user state immediately
                if (res.data && res.data.user) {
                    const rawPic = res.data.user.image || res.data.user.avatar || res.data.user.profilePic;
                    const finalPic = (rawPic && rawPic.startsWith('data:'))
                        ? rawPic
                        : (rawPic ? (rawPic.includes('?') ? `${rawPic}&t=${Date.now()}` : `${rawPic}?t=${Date.now()}`) : '');

                    setUser({
                        ...user,
                        ...res.data.user,
                        name: res.data.user.name || user?.name,
                        image: finalPic,
                        avatar: finalPic,
                        profilePic: finalPic
                    } as any);
                }

                // ✅ CRITICAL: Clear memory cache so next GET /doctor/profile is fresh
                clearApiCache();

                toast.success('Your data is safe');
                router.push(getPath('/doctor/profile'));
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error(error);
            const message =
                (error && typeof error === 'object' && 'message' in error)
                    ? (error as any).message as string
                    : String(error ?? '');

            if (message.includes('Body exceeded 1 MB limit')) {
                toast.error('Uploaded files are too large. Maximum total size is 5 MB.');
            } else {
                toast.error('An unexpected error occurred while saving your profile.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal & Account', icon: <User size={18} /> },
        { id: 'professional', label: 'Professional Info', icon: <Briefcase size={18} /> },
        { id: 'practice', label: 'Practice & clinical', icon: <Building size={18} /> },
        { id: 'bank', label: 'Bank & Payroll', icon: <Landmark size={18} /> },
        { id: 'documents', label: 'My Documents', icon: <FileText size={18} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto py-4 sm:py-8 min-h-[calc(100vh-100px)]">
            {cropper.isOpen && (
                <ImageCropper
                    src={cropper.image}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropper({ isOpen: false, image: '' })}
                    aspectRatio={1}
                    circular={true}
                />
            )}

            {/* Dynamic Header */}
            <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden mb-4 sm:mb-6 z-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                
                {/* Top Row: Title, Action */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                                Edit Your Profile
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Manage personal, professional & payroll details
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm shadow-emerald-500/20 w-full sm:w-auto justify-center active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={12} />}
                            <span className="shrink-0">Save Changes</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                {/* Sidebar Navigation - Dropdown on Mobile, Sidebar on LG */}
                <div className="lg:w-64 space-y-2 shrink-0">
                    {/* Mobile Tab Select */}
                    <div className="lg:hidden relative">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>{tab.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>

                    {/* Desktop Tab List */}
                    <div className="hidden lg:block space-y-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-white dark:bg-[#111] text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                        <div className="pt-4">
                            <SupportBadgeToggle />
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="flex-1 bg-white dark:bg-[#111] rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 p-4 sm:p-8 shadow-sm">
                {activeTab === 'personal' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                        <User className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                    {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                        <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                    {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Mobile Number</label>
                                    <div className="relative">
                                        <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                        <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                    {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.mobile}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                    <div className="relative">
                                        <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`} />
                                        <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                    {errors.dateOfBirth && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.dateOfBirth}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Profile Photo</h3>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden flex items-center justify-center shrink-0">
                                    {formData.profilePic ? (
                                        <img
                                            src={(() => {
                                                const raw = (typeof formData.profilePic === 'string' ? formData.profilePic : formData.profilePic?.url) || '';
                                                if (!raw) return '';
                                                if (raw.startsWith('data:') || raw.includes('t=')) return raw;
                                                return `${raw}${raw.includes('?') ? '&' : '?'}t=${Date.now()}`;
                                            })()}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User size={40} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 w-full flex flex-col items-start gap-2">
                                    <label className={`flex items-center justify-center gap-2 w-full md:w-auto max-w-[280px] px-6 py-3 ${isPhotoUploading ? 'bg-indigo-100 cursor-not-allowed opacity-70' : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 cursor-pointer'} text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-indigo-100 dark:border-indigo-800/30 transition-colors`}>
                                        {isPhotoUploading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                <span>Upload New Photo</span>
                                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isPhotoUploading} />
                                            </>
                                        )}
                                    </label>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Only PDF and any type of image only. Max 5MB</p>
                                    {uploadErrors.profilePic && (
                                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 animate-bounce">{uploadErrors.profilePic}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'professional' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Medical Qualifications</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Professional Bio</label>
                                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none" placeholder="Experience, philosophy of care, and expertise..." />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Experience Start Date</label>
                                        <div className="relative">
                                            <input type="date" name="experienceStart" value={formData.experienceStart} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                            <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                            <TagInput
                                label="Medical Specialties"
                                placeholder="Search and select specialties (e.g. Cardiology)..."
                                options={COMMON_SPECIALTIES}
                                selectedItems={formData.specialties}
                                onAdd={(val) => setFormData((prev: any) => ({ ...prev, specialties: [...prev.specialties, val] }))}
                                onRemove={(val) => setFormData((prev: any) => ({ ...prev, specialties: prev.specialties.filter((i: string) => i !== val) }))}
                                accentColor="emerald"
                            />

                            <TagInput
                                label="Medical Qualifications"
                                placeholder="Search and select qualifications (e.g. MBBS, MD)..."
                                options={COMMON_QUALIFICATIONS}
                                selectedItems={formData.qualifications}
                                onAdd={(val) => setFormData((prev: any) => ({ ...prev, qualifications: [...prev.qualifications, val] }))}
                                onRemove={(val) => setFormData((prev: any) => ({ ...prev, qualifications: prev.qualifications.filter((i: string) => i !== val) }))}
                                accentColor="indigo"
                                icon={<Award size={20} className="mb-2 opacity-20" />}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50 dark:border-gray-800">
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

                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3 block">Awards & Recognition</label>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" value={tempAward} onChange={(e) => setTempAward(e.target.value)} placeholder="Best Doctor Award..." className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <button onClick={() => { if (tempAward.trim()) { setFormData((prev: any) => ({ ...prev, awards: [...prev.awards, tempAward] })); setTempAward(""); } }} className="bg-amber-100 text-amber-700 px-4 rounded-xl font-bold hover:bg-amber-200"><Plus size={18} /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.awards.map((a: string) => (
                                        <span key={a} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-2">
                                            <Award size={12} /> {a} <button onClick={() => setFormData((prev: any) => ({ ...prev, awards: prev.awards.filter((i: string) => i !== a) }))}><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 block">Proof of Qualification</h4>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Degree Certificate</h4>
                                        <p className="text-[10px] text-gray-500">Upload your highest degree certificate (PDF/Image)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                                    {formData.degreeCertificate && (
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => setDocViewer({ url: formData.degreeCertificate, label: 'Degree Certificate' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] sm:text-[11px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </button>
                                            <button onClick={() => handleDeleteDocument('degreeCertificate')} className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                            <Upload size={14} />
                                            {files['degreeCertificate'] ? 'Change File' : 'Upload'}
                                            <input type="file" name="degreeCertificate" onChange={handleFileChange} className="hidden" accept="*" />
                                        </label>
                                        {files['degreeCertificate'] && (
                                            <span className="text-[10px] text-gray-500 font-medium max-w-[100px] sm:max-w-[150px] truncate">
                                                {files['degreeCertificate'].name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Only PDF and any type of image only. Max 5MB</p>
                            {uploadErrors.degreeCertificate && (
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 animate-bounce">{uploadErrors.degreeCertificate}</p>
                            )}

                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Doctorate Certificate</h4>
                                        <p className="text-[10px] text-gray-500">Upload your Doctorate/PhD certificate (PDF/Image)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                                    {formData.doctorateCertificate && (
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => setDocViewer({ url: formData.doctorateCertificate, label: 'Doctorate Certificate' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] sm:text-[11px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </button>
                                            <button onClick={() => handleDeleteDocument('doctorateCertificate')} className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                            <Upload size={14} />
                                            {files['doctorateCertificate'] ? 'Change File' : 'Upload'}
                                            <input type="file" name="doctorateCertificate" onChange={handleFileChange} className="hidden" accept="*" />
                                        </label>
                                        {files['doctorateCertificate'] && (
                                            <span className="text-[10px] text-gray-500 font-medium max-w-[100px] sm:max-w-[150px] truncate">
                                                {files['doctorateCertificate'].name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Only PDF and any type of image only. Max 5MB</p>
                            {uploadErrors.doctorateCertificate && (
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 animate-bounce">{uploadErrors.doctorateCertificate}</p>
                            )}

                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Internship Completion</h4>
                                        <p className="text-[10px] text-gray-500">Upload your Internship Completion certificate (PDF/Image)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                                    {formData.internshipCertificate && (
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => setDocViewer({ url: formData.internshipCertificate, label: 'Internship Completion' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] sm:text-[11px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </button>
                                            <button onClick={() => handleDeleteDocument('internshipCertificate')} className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                            <Upload size={14} />
                                            {files['internshipCertificate'] ? 'Change File' : 'Upload'}
                                            <input type="file" name="internshipCertificate" onChange={handleFileChange} className="hidden" accept="*" />
                                        </label>
                                        {files['internshipCertificate'] && (
                                            <span className="text-[10px] text-gray-500 font-medium max-w-[100px] sm:max-w-[150px] truncate">
                                                {files['internshipCertificate'].name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Only PDF and any type of image only. Max 5MB</p>
                            {uploadErrors.internshipCertificate && (
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 animate-bounce">{uploadErrors.internshipCertificate}</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                <FileText className="text-indigo-500" size={24} /> Previously Submitted Documents
                            </h3>
                            <p className="text-sm text-gray-500 mb-8">Review all the documents and certificates you have previously submitted. To replace any of these, upload a new file in the Professional or Practice tabs.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Degree Certificate */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                        <Award size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Degree Certificate</h4>
                                        {formData.degreeCertificate ? (
                                            <button type="button" onClick={() => setDocViewer({ url: formData.degreeCertificate, label: 'Degree Certificate' })} className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                <CheckCircle2 size={16} /> View Document
                                            </button>
                                        ) : (
                                            <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                        )}
                                    </div>
                                </div>

                                {/* Doctorate Certificate */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                        <Award size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Doctorate Certificate</h4>
                                        {formData.doctorateCertificate ? (
                                            <button type="button" onClick={() => setDocViewer({ url: formData.doctorateCertificate, label: 'Doctorate Certificate' })} className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                <CheckCircle2 size={16} /> View Document
                                            </button>
                                        ) : (
                                            <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                        )}
                                    </div>
                                </div>

                                {/* Internship Completion */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-indigo-200">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                        <Award size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Internship Completion</h4>
                                        {formData.internshipCertificate ? (
                                            <button type="button" onClick={() => setDocViewer({ url: formData.internshipCertificate, label: 'Internship Completion' })} className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                <CheckCircle2 size={16} /> View Document
                                            </button>
                                        ) : (
                                            <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                        )}
                                    </div>
                                </div>

                                {/* Registration Certificate */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center gap-4 transition-all hover:border-emerald-200">
                                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Registration Certificate</h4>
                                        {formData.registrationCertificate ? (
                                            <button type="button" onClick={() => setDocViewer({ url: formData.registrationCertificate, label: 'Registration Certificate' })} className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors">
                                                <CheckCircle2 size={16} /> View Document
                                            </button>
                                        ) : (
                                            <p className="mt-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Not Submitted</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'practice' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 underline decoration-emerald-500 decoration-4 underline-offset-8">Medical Registration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration Number</label>
                                    <input type="text" name="medicalRegistrationNumber" value={formData.medicalRegistrationNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Medical Council</label>
                                    <input type="text" name="registrationCouncil" value={formData.registrationCouncil} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration Year</label>
                                    <input type="text" name="registrationYear" value={formData.registrationYear} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Expiry Date</label>
                                    <input type="date" name="registrationExpiryDate" value={formData.registrationExpiryDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-500">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Registration Certificate</h4>
                                        <p className="text-[10px] text-gray-500">Upload your Medical Council Registration (PDF/Image)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                                    {formData.registrationCertificate && (
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => setDocViewer({ url: formData.registrationCertificate, label: 'Registration Certificate' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 text-[10px] sm:text-[11px] font-bold rounded-lg border border-green-100 dark:border-green-800/30">
                                                <CheckCircle2 size={12} /> View
                                            </button>
                                            <button onClick={() => handleDeleteDocument('registrationCertificate')} className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end gap-1">
                                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all">
                                            <Upload size={14} />
                                            {files['registrationCertificate'] ? 'Change File' : 'Upload'}
                                            <input type="file" name="registrationCertificate" onChange={handleFileChange} className="hidden" accept="*" />
                                        </label>
                                        {files['registrationCertificate'] && (
                                            <span className="text-[10px] text-gray-500 font-medium max-w-[100px] sm:max-w-[150px] truncate">
                                                {files['registrationCertificate'].name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2">Only PDF and any type of image only. Max 5MB</p>
                            {uploadErrors.registrationCertificate && (
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 animate-bounce">{uploadErrors.registrationCertificate}</p>
                            )}
                        </div>

                        <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Hospital Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                    <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Scheduling Defaults</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Consultation Fee (₹)</label>
                                    <div className="relative">
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="consultationFee" value={formData.consultationFee} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <IndianRupee className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Duration (mins)</label>
                                    <div className="relative">
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="consultationDuration" value={formData.consultationDuration} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <Clock className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Max Appt/Day</label>
                                    <div className="relative">
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="maxAppointmentsPerDay" value={formData.maxAppointmentsPerDay} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <Plus className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bank' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Wallet className="text-emerald-500" /> Settlement Bank Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                    <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors['bankDetails.accountName'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.accountName']}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                    <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.bankName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors['bankDetails.bankName'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.bankName']}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                    <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountNumber'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors['bankDetails.accountNumber'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.accountNumber']}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code</label>
                                    <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.ifscCode'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase`} />
                                    {errors['bankDetails.ifscCode'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.ifscCode']}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payroll & Tax Identifiers</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider flex justify-between">
                                        Base Salary (Per Month)
                                        <span className="text-gray-400 lowercase">(view only)</span>
                                    </label>
                                    <div className="relative">
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="baseSalary" value={formData.baseSalary} readOnly className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed text-gray-500" />
                                        <IndianRupee className="absolute right-4 top-3.5 text-gray-400" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card Number</label>
                                    <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.panNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase`} />
                                    {errors.panNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.panNumber}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar Number</label>
                                    <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.aadharNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors.aadharNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.aadharNumber}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">ESI Number</label>
                                    <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.esiNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors.esiNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.esiNumber}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PF Number</label>
                                    <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.pfNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors.pfNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.pfNumber}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">UAN Number</label>
                                    <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.uanNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none`} />
                                    {errors.uanNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.uanNumber}</p>}
                                </div>
                            </div>
                            <p className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-500 leading-relaxed">
                                <strong>Note:</strong> These details are essential for generating accurate monthly payslips. Please ensure the information matches your official documents. The hospital administration uses this data for financial compliance.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* DOCUMENT VIEWER MODAL */}
            <DocumentViewerModal
                isOpen={!!docViewer}
                onClose={() => setDocViewer(null)}
                url={docViewer?.url || ''}
                title={docViewer?.label || ''}
            />
        </div>
    );
}
