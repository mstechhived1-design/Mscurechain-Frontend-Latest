"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import {
    User, Mail, Phone, Briefcase, Award,
    Building, Landmark, Wallet,
    Save, ArrowLeft, Plus, X,
    Calendar, Clock, FileText, Upload, CheckCircle2, Eye,
    Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getStaffProfileAction } from '@/lib/integrations/actions/staff.actions';
import { staffService } from '@/lib/integrations/services/staff.service';
import { useAuthStore } from '@/stores/authStore';
import { clearApiCache } from '@/lib/integrations/api';

import { Trash2, ChevronDown, Camera } from 'lucide-react';
import ImageCropper from '@/components/ui/ImageCropper';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';

// Removed inline DocumentViewerModal in favor of shared component



export default function EditStaffProfilePage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });
    const [isIFSCValidating, setIsIFSCValidating] = useState(false);
    const [isPhotoUploading, setIsPhotoUploading] = useState(false);
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; docId: string; label: string }>({ isOpen: false, docId: '', label: '' });

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

        // Professional & Placement
        designation: '',
        department: '',
        employeeId: '',
        joiningDate: '',
        experienceYears: '',
        workingHours: {
            start: '',
            end: ''
        },

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
        uanNumber: '',

        // Qualifications
        registrationNumber: '',
        licenseValidityDate: '',
        qualifications: [] as string[],

        // Existing Documents (URLs)
        documents: {
            degreeCertificate: null,
            medicalCouncilRegistration: null,
            nursingCouncilRegistration: null
        }
    });

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await getStaffProfileAction();
                if (res && res.staff) {
                    const s = res.staff;
                    const dept = s.department;

                    let deptString = '';
                    if (Array.isArray(dept)) {
                        // Repair potential double-stringification in array items
                        const cleanedDepts = dept.flatMap(item => {
                            if (typeof item === 'string' && item.startsWith('[') && item.endsWith(']')) {
                                try {
                                    const parsed = JSON.parse(item);
                                    return Array.isArray(parsed) ? parsed : [parsed];
                                } catch { return [item]; }
                            }
                            return [item];
                        });
                        deptString = [...new Set(cleanedDepts)].join(', ');
                    } else if (typeof dept === 'string') {
                        // If it's a corrupted string like "Staff,IPD,OPD, [\"Staff\",...]"
                        // We extract the unique words
                        const matches = dept.match(/[a-zA-Z0-9_-]+/g);
                        deptString = matches ? [...new Set(matches)].join(', ') : dept;
                    }

                    const safeToDateString = (date: any) => {
                        if (!date) return '';
                        const d = new Date(date);
                        return (!isNaN(d.getTime())) ? d.toISOString().split('T')[0] : '';
                    };

                    setFormData({
                        name: s.user?.name || '',
                        email: s.user?.email || '',
                        mobile: s.user?.mobile || '',
                        profilePic: (s.user as any)?.image || (s.user as any)?.profilePic || '',
                        gender: (s.user as any)?.gender || '',
                        dateOfBirth: safeToDateString((s.user as any)?.dateOfBirth),
                        designation: s.designation || '',
                        department: deptString,
                        employeeId: s.employeeId || '',
                        joiningDate: safeToDateString(s.joiningDate),
                        experienceYears: s.experienceYears || '',
                        workingHours: {
                            start: s.workingHours?.start || '',
                            end: s.workingHours?.end || ''
                        },
                        bankDetails: {
                            bankName: s.bankDetails?.bankName || '',
                            accountNumber: s.bankDetails?.accountNumber || '',
                            accountName: s.bankDetails?.accountName || '',
                            ifscCode: s.bankDetails?.ifscCode || ''
                        },
                        panNumber: s.panNumber || '',
                        aadharNumber: s.aadharNumber || '',
                        baseSalary: s.baseSalary || '',
                        pfNumber: s.pfNumber || '',
                        esiNumber: s.esiNumber || '',
                        uanNumber: s.uanNumber || '',
                        registrationNumber: s.qualificationDetails?.registrationNumber || '',
                        licenseValidityDate: safeToDateString(s.qualificationDetails?.licenseValidityDate),
                        qualifications: s.qualificationDetails?.qualifications || [],
                        documents: s.documents || {}
                    });
                }
            } catch (error: any) {
                console.error("LoadProfile Error:", error);
                toast.error(error.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
            newErrors.mobile = "Mobile number must be exactly 10 digits";
        }

        // IFSC: 4 alphas, 0, 6 alpha-numeric
        if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
            newErrors['bankDetails.ifscCode'] = "Invalid IFSC Code format";
        }

        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format";
        }

        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar number must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const lookupIFSC = async (code: string) => {
        if (code.length !== 11) return;
        setIsIFSCValidating(true);
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${code.toUpperCase()}`);
            if (res.ok) {
                const data = await res.json();
                setFormData((prev: any) => ({
                    ...prev,
                    bankDetails: {
                        ...prev.bankDetails,
                        bankName: data.BANK,
                        ifscCode: code.toUpperCase()
                    }
                }));
                toast.success(`Bank found: ${data.BANK}`);
            }
        } catch (e) {
            console.error("IFSC lookup failed", e);
        } finally {
            setIsIFSCValidating(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // REAL-TIME VALIDATION & CONSTRAINTS
        let fieldError = "";

        if (name === 'bankDetails.accountName' || name === 'name') {
            if (!/^[A-Za-z ]{3,}$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces, min 3 chars";
        }
        if (name === 'bankDetails.bankName') {
            if (!/^[A-Za-z ]+$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces";
        }
        if (name === 'mobile' || name === 'bankDetails.accountNumber' || name === 'aadharNumber' || name === 'experienceYears') {
            if (value && !/^\d*$/.test(value)) return; // Only digits
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

        // MAX LENGTHS
        if (name === 'mobile' && value.length > 10) return;
        if (name === 'aadharNumber' && value.length > 12) return;
        if (name === 'panNumber' && value.length > 10) return;
        if (name === 'bankDetails.ifscCode' && value.length > 11) return;

        if (name === 'bankDetails.ifscCode' && value.length === 11) {
            lookupIFSC(value);
        }

        setErrors(prev => ({
            ...prev,
            [name]: fieldError
        }));

        // Let global delete happen below if errors were set empty
        if (!fieldError && errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        if (name.includes('.')) {
            const keys = name.split('.');
            if (keys.length === 2) {
                const [parent, child] = keys;
                setFormData((prev: any) => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            }
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles && selectedFiles[0]) {
            const file = selectedFiles[0];

            // 5MB Limit Check
            if (file.size > 5 * 1024 * 1024) {
                setUploadErrors(prev => ({
                    ...prev,
                    [name]: "Particular size exceed, please choose below the 5MB"
                }));
                toast.error("File size exceeds 5MB limit");
                return;
            } else {
                setUploadErrors(prev => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
            }

            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Format not supported. Please use PDF, JPG, PNG or DOCX");
                return;
            }

            // If it's profile pic, open cropper
            if (file.type.startsWith('image/') && (name === 'profilePic' || name === 'profilepic')) {
                const reader = new FileReader();
                reader.onload = () => {
                    setCropper({
                        isOpen: true,
                        image: reader.result as string
                    });
                };
                reader.readAsDataURL(file);
                return;
            }


            setFiles(prev => ({ ...prev, [name]: file }));

            // Update preview for profile pic if applicable (fallback if not cropped)
            if (name === 'profilePic') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData((prev: any) => ({ ...prev, profilePic: reader.result }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleCropComplete = async (croppedDataUrl: string) => {
        try {
            setCropper({ isOpen: false, image: '' });
            setIsPhotoUploading(true);
            
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

            // Convert data URL to File object for submission
            const resBlob = await fetch(croppedDataUrl);
            const blob = await resBlob.blob();
            const file = new File([blob], "profile-pic.png", { type: "image/png" });
            
            const photoData = new FormData();
            photoData.append("profilePic", file);

            const uploadToast = toast.loading("Uploading cropped photo...");
            const res = await staffService.updateStaffProfile(photoData);

            if (res.success && res.data) {
                // Staff data is nested: res.data.staff.user.image
                const staffData = res.data.staff;
                const newImage = staffData?.user?.image || staffData?.user?.avatar || res.data.profilePic;
                
                if (newImage) {
                    const cacheBustedImage = `${newImage}${newImage.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    setFormData((prev: any) => ({ ...prev, profilePic: cacheBustedImage }));
                    
                    if (setUser && user) {
                        setUser({ 
                            ...user, 
                            image: cacheBustedImage,
                            avatar: cacheBustedImage,
                            profilePic: cacheBustedImage
                        } as any);
                    }
                }
                toast.success('Profile photo updated', { id: uploadToast });
            } else {
                toast.error(res.error || 'Failed to update photo', { id: uploadToast });
            }
        } catch (error) {
            console.error("Error processing cropped image", error);
            toast.error("An error occurred while uploading");
        } finally {
            setIsPhotoUploading(false);
        }
    };

    const handleDeleteDocument = (docId: string, label: string) => {
        setDeleteConfirm({ isOpen: true, docId, label });
    };

    const confirmDeleteDocument = async (docId: string, label: string) => {
        setDeleteConfirm({ isOpen: false, docId: '', label: '' });

        try {
            const fd = new FormData();
            fd.append('delete_document', docId); // Backend should handle deletion logic
            const res = await staffService.updateStaffProfile(fd);

            if (res.success) {
                toast.success(`${label} removed successfully`);
                setFormData((prev: any) => ({
                    ...prev,
                    documents: {
                        ...prev.documents,
                        [docId]: null
                    }
                }));
            } else {
                toast.error(res.error || "Delete failed");
            }
        } catch (_error) {
            toast.error("An error occurred during deletion");
        }
    };

    const handleQualificationChange = (index: number, value: string) => {
        const updated = [...formData.qualifications];
        updated[index] = value;
        setFormData((prev: any) => ({ ...prev, qualifications: updated }));
    };

    const addQualification = () => {
        setFormData((prev: any) => ({ ...prev, qualifications: [...prev.qualifications, ''] }));
    };

    const removeQualification = (index: number) => {
        const updated = formData.qualifications.filter((_: any, i: number) => i !== index);
        setFormData((prev: any) => ({ ...prev, qualifications: updated }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!validate()) {
            toast.error("Please correct the errors in the form");
            return;
        }

        setIsSaving(true);
        try {
            const formDataToSubmit = new FormData();

            // Add all non-object fields
            Object.keys(formData).forEach(key => {
                // VERY IMPORTANT:
                // 1. Do NOT send profilePic as text if it's currently a preview string or old URL
                // 2. Do NOT send documents here as they are now handled via immediate upload
                if (
                    typeof formData[key] !== 'object' &&
                    !['profilePic', 'profilepic', 'documents', 'degreeCertificate', 'medicalCouncilRegistration', 'nursingCouncilRegistration', 'internshipCertificate'].includes(key)
                ) {
                    formDataToSubmit.append(key, formData[key]);
                }
            });

            // Add nested objects as JSON strings or flat fields
            formDataToSubmit.append('workingHours', JSON.stringify(formData.workingHours));
            formDataToSubmit.append('bankDetails', JSON.stringify(formData.bankDetails));

            // Special handling for qualification details
            formDataToSubmit.append('qualificationDetails', JSON.stringify({
                registrationNumber: formData.registrationNumber,
                licenseValidityDate: formData.licenseValidityDate,
                qualifications: formData.qualifications
            }));

            // Add department as array mapping done in backend usually
            const deptArray = typeof formData.department === 'string'
                ? formData.department.split(',').map((d: string) => d.trim()).filter(Boolean)
                : formData.department;

            // CLEANUP: Ensure no duplicates are sent
            formDataToSubmit.delete('department');
            formDataToSubmit.append('department', JSON.stringify(deptArray));

            // Add files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    // CRITICAL: Clean up ANY text-based leftover or previous version of this field
                    // This prevents Multer "Unexpected field" due to name mismatches or prefixes
                    formDataToSubmit.delete(key);
                    formDataToSubmit.append(key, files[key]);
                }
            });

            console.log("[DEBUG] Final FormData Fields Before Submit:");
            for (const [key, value] of (formDataToSubmit as any).entries()) {
                console.log(`- ${key}: ${typeof value === 'string' ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '[FILE: ' + (value as File).name + ']'}`);
            }

            const res = await staffService.updateStaffProfile(formDataToSubmit);
            if (res.success) {
                toast.success('Profile updated successfully');

                // ✅ MANUAL SYNC: Update the auth store with the new image URL (if it changed)
                // Staff data is nested: res.data.staff.user.image
                if (res.data && res.data.staff && setUser && user) {
                    const staffData = res.data.staff;
                    const newImage = staffData?.user?.image || staffData?.user?.avatar || staffData?.profilePic;
                    if (newImage) {
                        const cacheBustedImage = `${newImage}${newImage.includes('?') ? '&' : '?'}t=${Date.now()}`;
                        setUser({ 
                            ...user, 
                            image: cacheBustedImage,
                            avatar: cacheBustedImage,
                            profilePic: cacheBustedImage
                        } as any);
                    }
                }

                // ✅ CLEAR LOCAL CACHE
                clearApiCache();
                
                // Allow store and session storage to settle before redirecting
                setTimeout(() => {
                    router.push(`/${hospitalId}/staff/profile`);
                }, 300);
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (_error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal & Account', icon: <User size={18} /> },
        { id: 'professional', label: 'Work & Employment', icon: <Briefcase size={18} /> },
        { id: 'qualifications', label: 'Qualifications', icon: <Award size={18} /> },
        { id: 'bank', label: 'Bank & Payroll', icon: <Landmark size={18} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto sm:px-1 min-h-[calc(100vh-100px)] overflow-x-hidden">
            <DocumentViewerModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                url={viewer.url}
                title={viewer.title}
            />

            {cropper.isOpen && (
                <ImageCropper
                    src={cropper.image}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropper({ isOpen: false, image: '' })}
                    aspectRatio={1}
                    circular={true}
                />
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-2 sm:mb-6 pb-2 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 sm:gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                    >
                        <ArrowLeft size={14} className="sm:size-5" />
                    </button>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tighter uppercase">Edit Profile</h1>
                        <p className="text-[7px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Staff Management Registry</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] sm:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={12} className="sm:size-4" />}
                    Save Changes
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 pb-12">
                {/* Mobile Dropdown Navigation */}
                <div className="lg:hidden w-full px-1">
                    <div className="relative group overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs bg-white dark:bg-[#111]">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full bg-transparent border-none px-4 py-3 pr-8 text-[9px] font-black uppercase tracking-widest text-indigo-600 appearance-none outline-none focus:ring-0 transition-all cursor-pointer relative z-10"
                        >
                            {tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" size={14} />
                    </div>
                    <div className="mt-4">
                        <SupportBadgeToggle />
                    </div>
                </div>

                {/* Sidebar Navigation - Desktop Only  */}
                <div className="hidden lg:flex lg:w-48 lg:flex-col gap-1 select-none shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                                : 'bg-white dark:bg-[#111] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800'
                                }`}
                        >
                            <span className="shrink-0 scale-75">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                    <div className="mt-6">
                        <SupportBadgeToggle />
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="flex-1 bg-white dark:bg-[#111] rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 p-4 sm:p-8 shadow-sm overflow-hidden">
                    {activeTab === 'personal' && (
                        <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Account Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <User className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={14} />
                                        </div>
                                        {errors.name && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Mail className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={14} />
                                        </div>
                                        {errors.email && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="tel" name="phone" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Phone className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={14} />
                                        </div>
                                        {errors.mobile && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.mobile}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                            <Calendar className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={14} />
                                        </div>
                                        {errors.dateOfBirth && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.dateOfBirth}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Current Residential Address</label>
                                        <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.address ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none`} />
                                        {errors.address && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.address}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Emergency Contact Person</label>
                                        <input type="text" name="emergencyContactPerson" value={formData.emergencyContactPerson} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.emergencyContactPerson ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                        {errors.emergencyContactPerson && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.emergencyContactPerson}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Emergency Contact Phone</label>
                                        <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.emergencyContactPhone ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`} />
                                        {errors.emergencyContactPhone && <p className="text-[8px] sm:text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.emergencyContactPhone}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile Photo</h3>
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl flex items-center justify-center overflow-hidden border border-indigo-100 dark:border-indigo-800 relative group">
                                        {formData.profilePic ? <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" /> : <User size={24} className="text-indigo-500/50" />}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                                            <Upload className="text-white" size={16} />
                                            <input type="file" name="profilePic" onChange={handleFileChange} className="hidden" accept="image/*" />
                                        </label>
                                    </div>
                                    <div className="flex-1 space-y-2 w-full max-w-[180px]">
                                        <div className="flex items-center gap-3">
                                            <label className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed rounded-lg transition-all group ${isPhotoUploading ? 'bg-indigo-100 border-indigo-300 cursor-not-allowed text-indigo-400' : 'bg-gray-50 dark:bg-gray-900/50 border-indigo-200 dark:border-indigo-900 cursor-pointer hover:bg-indigo-50/50 text-indigo-600'}`}>
                                                {isPhotoUploading ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Processing...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Camera size={12} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Update Photo</span>
                                                        <input type="file" name="profilePic" onChange={handleFileChange} className="hidden" accept="image/*" disabled={isPhotoUploading} />
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Only PDF and any type of image (JPG, PNG). Max 5MB.</p>
                                        {uploadErrors.profilePic && (
                                            <p className="text-[8px] font-black text-rose-500 uppercase italic tracking-tighter">{uploadErrors.profilePic}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-3">Work & Institutional Presence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Designation</label>
                                        <div className="relative">
                                            <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            <Award className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={12} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Department(s)</label>
                                        <div className="relative">
                                            <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Nursing, ICU" />
                                            <Building className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300" size={12} />
                                        </div>
                                        <p className="text-[7px] text-gray-400 italic">Comma-separated for multiple.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Joining Date</label>
                                            <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Exp. (Years)</label>
                                            <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="experienceYears" value={formData.experienceYears} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Clock className="text-indigo-500" size={16} /> Working Hours
                                </h3>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Start Time</label>
                                        <input type="time" name="workingHours.start" value={formData.workingHours.start} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">End Time</label>
                                        <input type="time" name="workingHours.end" value={formData.workingHours.end} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <p className="mt-2 text-[8px] sm:text-[10px] text-gray-500 italic">This will be used to calculate your late markings and on-time performance.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'qualifications' && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center flex-wrap gap-2">
                                    <Award className="text-indigo-500 shrink-0" size={16} /> Professional Qualifications
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Registration Number</label>
                                        <div className="relative w-full">
                                            <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. MC-12345" />
                                            <FileText className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300 pointer-events-none" size={12} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">License Validity Date</label>
                                        <div className="relative w-full">
                                            <input type="date" name="licenseValidityDate" value={formData.licenseValidityDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            <Calendar className="absolute right-3 top-2.5 sm:right-4 sm:top-3.5 text-gray-300 pointer-events-none" size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Award className="text-indigo-500 shrink-0" size={16} /> Professional Certificates
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addQualification}
                                        className="w-fit flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                    >
                                        <Plus size={12} /> Add More
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.qualifications.map((qual: string, index: number) => (
                                        <div key={index} className="flex items-center gap-2 sm:gap-3 animate-in fade-in sm:slide-in-from-left-4 duration-300 w-full overflow-hidden">
                                            <div className="flex-1 relative min-w-0">
                                                <input
                                                    type="text"
                                                    value={qual}
                                                    onChange={(e) => handleQualificationChange(index, e.target.value)}
                                                    placeholder="e.g. MBBS, MD (General Medicine), etc."
                                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all truncate"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeQualification(index)}
                                                className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.qualifications.length === 0 && (
                                        <div className="py-8 sm:py-12 px-4 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] text-center">
                                            <p className="text-xs sm:text-sm text-gray-400 italic font-medium">No qualifications added yet. Click 'Add Degree' to begin.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                                            <Shield className="text-indigo-600 dark:text-indigo-400 shrink-0" size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-base font-black text-gray-900 dark:text-white tracking-tight uppercase">Registry Credentials</h3>
                                            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                {[
                                                    formData.documents?.degreeCertificate,
                                                    formData.documents?.medicalCouncilRegistration,
                                                    formData.documents?.nursingCouncilRegistration,
                                                    formData.documents?.internshipCertificate
                                                ].filter(d => d?.url).length} of 5 documents
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Document List */}
                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/80">
                                    {[
                                        { id: 'degreeCertificate', label: 'Degree Certificate' },
                                        { id: 'medicalCouncilRegistration', label: 'Medical Registry' },
                                        { id: 'nursingCouncilRegistration', label: 'Nursing Registry' },
                                        { id: 'internshipCertificate', label: 'Internship Cert.' }
                                    ].map((docType) => {
                                        const doc = formData.documents?.[docType.id];
                                        const hasDoc = !!doc?.url;
                                        const isUploading = !!files[`uploading_${docType.id}`];
                                        const fileName = doc?.name || (doc?.url ? decodeURIComponent(doc.url.split('/').pop()?.split('?')[0] || '').replace(/^\d+_/, '') : null);

                                        return (
                                            <div key={docType.id}
                                                className={`flex items-center flex-wrap sm:flex-nowrap gap-3 px-3 py-3 sm:py-2.5 transition-all ${hasDoc ? 'bg-white dark:bg-[#111]' : 'bg-gray-50/70 dark:bg-gray-900/30'}`}
                                            >
                                                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border text-[10px] font-black ${hasDoc ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-400'}`}>
                                                    {isUploading ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : hasDoc ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{docType.label}</p>
                                                    {hasDoc && <p className="text-[7px] text-gray-400 truncate">{fileName}</p>}
                                                </div>

                                                <div className="flex items-center justify-end gap-1 ml-auto">
                                                    {hasDoc && (
                                                        <>
                                                            <button type="button" onClick={() => setViewer({ isOpen: true, url: doc.url, title: docType.label })} className="p-1.5 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-md transition-all"><Eye size={12} /></button>
                                                            <button type="button" onClick={() => handleDeleteDocument(docType.id, docType.label)} className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-md transition-all"><Trash2 size={12} /></button>
                                                        </>
                                                    )}
                                                    <label className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all ${hasDoc ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-900 text-white'}`}>
                                                        {isUploading ? <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload size={10} />}
                                                        <span>{hasDoc ? 'Swap' : 'Add'}</span>
                                                        <input type="file" className="hidden" accept="*" disabled={isUploading} onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            if (file.size > 5 * 1024 * 1024) return toast.error("File exceeds 5MB");
                                                            try {
                                                                setFiles(prev => ({ ...prev, [`uploading_${docType.id}`]: true as any }));
                                                                const fd = new FormData(); fd.append(docType.id, file);
                                                                const res = await staffService.updateStaffProfile(fd);
                                                                if (res.success) {
                                                                    toast.success(`${docType.label} uploaded`);
                                                                    setFormData((prev: any) => ({ ...prev, documents: { ...prev.documents, [docType.id]: res.data?.staff?.documents?.[docType.id] } }));
                                                                } else toast.error(res.error || "Upload failed");
                                                            } catch { toast.error("Error"); }
                                                            finally { setFiles(prev => { const n = { ...prev }; delete n[`uploading_${docType.id}`]; return n; }); }
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-2 space-y-1">
                                    <p className="text-[7px] text-gray-400 font-bold uppercase flex items-center gap-1"><Shield size={8} /> PDF/JPG/PNG · Max 5MB</p>
                                    {Object.keys(uploadErrors).map(key => key !== 'profilePic' && <p key={key} className="text-[7px] font-black text-rose-500 uppercase">Alert: {uploadErrors[key]}</p>)}
                                </div>

                                {deleteConfirm.isOpen && (
                                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#020617]/40 backdrop-blur-sm animate-in fade-in duration-300">
                                        <div className="bg-white dark:bg-[#111] w-full max-w-sm rounded-[2rem] p-6 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 text-center">
                                            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 border border-rose-100 dark:border-rose-500/20">
                                                <Trash2 size={24} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Delete Document</h3>
                                            <p className="text-[10px] font-bold text-gray-400 mb-6 uppercase">Are you sure you want to permanently delete your <span className="text-gray-900 dark:text-white">{deleteConfirm.label}</span>?</p>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setDeleteConfirm({ isOpen: false, docId: '', label: '' })}
                                                    className="flex-1 py-3 px-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteDocument(deleteConfirm.docId, deleteConfirm.label)}
                                                    className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'bank' && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 transition-all">
                                    <Wallet className="text-indigo-500" size={16} /> Settlement Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                        <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none`} />
                                        {errors['bankDetails.accountName'] && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors['bankDetails.accountName']}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                        <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.bankName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none`} />
                                        {errors['bankDetails.bankName'] && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors['bankDetails.bankName']}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                        <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountNumber'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none`} />
                                        {errors['bankDetails.accountNumber'] && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors['bankDetails.accountNumber']}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="bankDetails.ifscCode"
                                                value={formData.bankDetails.ifscCode}
                                                onChange={handleChange}
                                                placeholder="e.g. HDFC0001234"
                                                className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.ifscCode'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-bold uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 outline-none`}
                                            />
                                            {isIFSCValidating && <div className="absolute right-3 top-2.5 w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
                                        </div>
                                        {errors['bankDetails.ifscCode'] && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors['bankDetails.ifscCode']}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-3">Payroll & Identify</h3>
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">
                                            Salary <span className="text-[7px] lowercase">(locked)</span>
                                        </label>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} name="baseSalary" value={formData.baseSalary} readOnly className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm outline-none cursor-not-allowed text-gray-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card</label>
                                        <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.panNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none uppercase font-bold`} />
                                        {errors.panNumber && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.panNumber}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar No.</label>
                                        <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.aadharNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-bold`} />
                                        {errors.aadharNumber && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.aadharNumber}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">PF No.</label>
                                        <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.pfNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none uppercase font-bold`} />
                                        {errors.pfNumber && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.pfNumber}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">ESI No.</label>
                                        <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.esiNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none uppercase font-bold`} />
                                        {errors.esiNumber && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.esiNumber}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">UAN No.</label>
                                        <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.uanNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none uppercase font-bold`} />
                                        {errors.uanNumber && <p className="text-[7px] font-bold text-rose-500 mt-0.5 uppercase tracking-tight">{errors.uanNumber}</p>}
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <p className="text-[8px] sm:text-[10px] text-gray-500 leading-relaxed font-medium">
                                        <strong>SECURITY:</strong> PAN, PF, ESI, Bank Details are encrypted. Ensure accuracy to prevent payroll processing failures.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
