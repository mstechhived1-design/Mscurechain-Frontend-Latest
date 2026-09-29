'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/lib/integrations/services/user.service';
import { toast } from 'react-hot-toast';
import {
    User as UserIcon,
    Mail,
    Phone,
    MapPin,
    Building,
    Camera,
    Save,
    FileText,
    Loader2,
    CheckCircle2,
    ClipboardList,
    CloudUpload,
    ShieldCheck,
    Eye,
    Plus,
    X,
    Award
} from 'lucide-react';
import ImageCropper from '@/components/ui/ImageCropper';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

/**
 * DischargeProfile Component
 * Handles profile details and configuration for discharge personnel.
 */
const DischargeProfile = () => {
    // Auth Store for persistent user data
    const { user, setUser, checkAuth } = useAuthStore();

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        address: '',
        department: '',
        employeeId: '',
        qualificationDetails: {
            registrationNumber: '',
            licenseValidityDate: '',
            qualifications: [] as string[]
        },
        documents: {
            degreeCertificate: { url: '', publicId: '' },
            nursingCouncilRegistration: { url: '', publicId: '' },
            internshipCertificate: { url: '', publicId: '' }
        },
        bio: ''
    });

    // File Name State for UI Feedback
    const [uploadedFileNames, setUploadedFileNames] = useState({
        degreeCertificate: '',
        nursingCouncilRegistration: '',
        internshipCertificate: ''
    });

    // Image/Logo State
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string>('');

    // Initialize auth on mount - force fresh data
    useEffect(() => {
        const loadProfile = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Passing 'true' to bypass the 30-second throttle AND fetch fresh from server
                await checkAuth(true);
            } catch (err: any) {
                console.error('[Profile] Failed to load:', err);
                setError('Failed to load profile data. Please refresh the page.');
            } finally {
                // Ensure loading stops even if checkAuth fails
                setTimeout(() => setIsLoading(false), 1500);
            }
        };

        loadProfile();
    }, [checkAuth]);





    // Update form when user data changes
    useEffect(() => {
        if (user) {
            console.log('[Profile] Loading user data:', user);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                mobile: user.mobile || '',
                address: user.address || '',
                department: user.department || 'Discharge Department',
                employeeId: (user as any).employeeId || '',
                qualificationDetails: {
                    registrationNumber: (user as any).qualificationDetails?.registrationNumber || '',
                    licenseValidityDate: (user as any).qualificationDetails?.licenseValidityDate || '',
                    qualifications: (user as any).qualificationDetails?.qualifications || []
                },
                documents: {
                    degreeCertificate: {
                        url: (user as any).documents?.degreeCertificate?.url || '',
                        publicId: (user as any).documents?.degreeCertificate?.publicId || ''
                    },
                    nursingCouncilRegistration: {
                        url: (user as any).documents?.nursingCouncilRegistration?.url || '',
                        publicId: (user as any).documents?.nursingCouncilRegistration?.publicId || ''
                    },
                    internshipCertificate: {
                        url: (user as any).documents?.internshipCertificate?.url || '',
                        publicId: (user as any).documents?.internshipCertificate?.publicId || ''
                    }
                },
                bio: user.bio || ''
            });
            setProfileImage(user.image || null);
            setIsLoading(false);
            setError(null);
        }
    }, [user]);

    // Handle Input Changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handleFieldChange = (fieldPath: string, value: any) => {
        const keys = fieldPath.split('.');
        setFormData((prev: any) => {
            if (keys.length === 2) {
                return {
                    ...prev,
                    [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
                };
            }
            if (keys.length === 3) {
                return {
                    ...prev,
                    [keys[0]]: {
                        ...prev[keys[0]],
                        [keys[1]]: { ...prev[keys[0]][keys[1]], [keys[2]]: value }
                    }
                };
            }
            return { ...prev, [fieldPath]: value };
        });
        setHasChanges(true);
    };

    const handleQualificationChange = (index: number, value: string) => {
        const updatedQuals = [...(formData.qualificationDetails.qualifications || [])];
        updatedQuals[index] = value;
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const addQualification = () => {
        const updatedQuals = [...(formData.qualificationDetails.qualifications || []), ''];
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const removeQualification = (index: number) => {
        const updatedQuals = (formData.qualificationDetails.qualifications || []).filter((_: any, i: number) => i !== index);
        handleFieldChange('qualificationDetails.qualifications', updatedQuals);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only PDF and JPG files are allowed');
            return;
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        try {
            setIsSaving(true);
            const fileName = `${fieldName}_${Date.now()}`;

            // UI Feedback: Show selected filename immediately
            setUploadedFileNames(prev => ({ ...prev, [fieldName]: file.name }));

            const response = await dischargeService.uploadDocument(file, fileName);

            if (response.success) {
                setFormData((prev: any) => ({
                    ...prev,
                    documents: {
                        ...prev.documents,
                        [fieldName]: { url: response.url, publicId: response.publicId }
                    }
                }));
                setHasChanges(true);
                toast.success('Document uploaded successfully');
            }
        } catch (error) {
            console.error('File upload failed:', error);
            toast.error('File upload failed');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Image Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Image size should be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Reset input
    };

    // Handle Cropped Image
    const handleCropApplied = (croppedImage: string) => {
        setProfileImage(croppedImage);
        setIsCropperOpen(false);
        setHasChanges(true);
    };

    // Handle Save/Commit
    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);
        try {
            const updatedData = {
                ...formData,
                image: profileImage
            };

            console.log('[Profile] Sending update:', updatedData);

            // Call API - Standardizing on updateProfile
            const response = await userService.updateProfile(updatedData as any);

            console.log('[Profile] API Response:', response);

            // The response from updateMyProfile is the updated User object
            if (!response || !response.id && !response._id) {
                throw new Error('Update failed - invalid response');
            }

            // Standardize ID
            const updatedUser = {
                ...user,
                ...response,
                id: (response.id || response._id || user?.id || '').toString(),
                // Sync all image fields for Navbar consistency
                image: profileImage || response.image || user?.image,
                avatar: profileImage || response.image || user?.image,
                profilePic: profileImage || response.image || user?.image
            } as any;

            // Update local storage and session storage via authStore
            setUser(updatedUser);

            // Force a re-authentication check to sync any computed fields from backend
            // Passing 'true' to bypass the 30-second throttle
            await checkAuth(true);

            setHasChanges(false);
            toast.success('Profile Updated Successfully', {
                icon: <CheckCircle2 className="text-emerald-500" />,
                style: { borderRadius: '16px', background: '#111', color: '#fff' }
            });

            // Dispatch custom event to notify layout of user update
            window.dispatchEvent(new Event('userUpdated'));

        } catch (error: any) {
            console.error('[Profile Update Error]', error);
            toast.error(error.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <Loader2 className="absolute inset-0 m-auto w-5 h-5 text-blue-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 animate-pulse">Establishing Secure Uplink</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 animate-in zoom-in-95 duration-500">
                <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-center max-w-sm">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-red-600" size={24} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-2">Protocol Failure</h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">{error}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
                >
                    Retry Handshake
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight italic">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Discharge Personnel Configuration</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest animate-pulse px-3 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-900/30">
                            Unsaved Edits
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all active:scale-95 ${isSaving || !hasChanges
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none'
                            }`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
                        <div className="relative group mb-6">
                            <div className="w-40 h-40 rounded-3xl bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-blue-400 transition-colors">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Camera size={32} />
                                        <span className="text-[10px] font-black uppercase">Upload Photo</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                            <label className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-black shadow-lg transition-transform hover:scale-110 active:scale-95 z-10">
                                Change
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate w-full">{formData.name || 'Discharge Personnel'}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Profile Visual</p>
                        
                        {/* Bio Field inline edit */}
                        <div className="w-full mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50 text-left">
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bio (Max 150 Chars)</label>
                                        <span className={`text-[9px] font-bold ${(formData as any).bio?.length >= 150 ? 'text-rose-500' : 'text-gray-400'}`}>
                                            {(formData as any).bio?.length || 0}/150
                                        </span>
                                    </div>
                                    <textarea
                                        value={(formData as any).bio || ''}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 150) }));
                                            setHasChanges(true);
                                        }}
                                        rows={3}
                                        placeholder="Write a short professional or personal bio..."
                                        className="w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <PrinterSettingsCard />
                </div>

                {/* Data Configuration Section */}
                <div className="md:col-span-2 space-y-6">
                    {/* Personal Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl dark:bg-indigo-900/30">
                                <UserIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white italic">Personal Details</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Base configuration</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                    placeholder="FULL LEGAL NAME"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Employee ID</label>
                                <input
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                    placeholder="EMPLOYEE ID"
                                />
                            </div>
                            <div className="space-y-2 col-span-full">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Department</label>
                                <div className="relative group">
                                    <ClipboardList className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                        placeholder="DEPARTMENT NAME"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 col-span-full">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                        placeholder="STREET, CITY, STATE, ZIP"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Protocol */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl dark:bg-emerald-900/30">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white italic">Contact Protocol</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Communication channels</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Communication Line</label>
                                <div className="relative group">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                        placeholder="PHONE NUMBER"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registry Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-mono"
                                        placeholder="EMAIL@DOMAIN.COM"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Credentials Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-4xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-900/30">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white italic">Professional Credentials</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Mandatory clinical registry</p>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 mb-8">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Professional Qualifications</h4>
                                <button
                                    type="button"
                                    onClick={addQualification}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                                >
                                    <Plus size={10} /> Add Degree
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.qualificationDetails.qualifications?.map((qual: string, index: number) => (
                                    <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="flex-1 relative group">
                                            <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                value={qual}
                                                onChange={(e) => handleQualificationChange(index, e.target.value)}
                                                placeholder="e.g. B.Sc Nursing, Diploma in Management"
                                                className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeQualification(index)}
                                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                                {(formData.qualificationDetails.qualifications || []).length === 0 && (
                                    <div className="py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl text-center">
                                        <p className="text-[10px] text-gray-400 italic font-bold uppercase tracking-widest">No degrees cataloged. Manual entry recommended.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registration Number</label>
                                <input
                                    value={formData.qualificationDetails?.registrationNumber}
                                    onChange={(e) => handleFieldChange('qualificationDetails.registrationNumber', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                    placeholder="REGISTRATION NUMBER"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">License Validity Date</label>
                                <input
                                    type="date"
                                    value={formData.qualificationDetails?.licenseValidityDate ? new Date(formData.qualificationDetails.licenseValidityDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleFieldChange('qualificationDetails.licenseValidityDate', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Document Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { id: 'degreeCertificate', label: 'Degree Certificate', key: 'degreeCertificate' },
                                { id: 'nursingCouncilRegistration', label: 'Nursing Council Registration', key: 'nursingCouncilRegistration' },
                                { id: 'internshipCertificate', label: 'Internship Certificate', key: 'internshipCertificate' }
                            ].map((doc: any) => (
                                <div key={doc.id} className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{doc.label} (PDF/JPG)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg"
                                            onChange={(e) => handleFileUpload(e, doc.key)}
                                            className="hidden"
                                            id={`${doc.id}-upload-discharge`}
                                        />
                                        <label
                                            htmlFor={`${doc.id}-upload-discharge`}
                                            className={`flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border ${formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? 'border-emerald-200 ring-2 ring-emerald-500/10' : 'border-gray-100 dark:border-gray-600'} rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all min-h-[72px]`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? (
                                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                                    </div>
                                                ) : (
                                                    <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                                        <CloudUpload size={16} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-black text-gray-500 uppercase truncate max-w-[150px]">
                                                    {uploadedFileNames[doc.key as keyof typeof uploadedFileNames] || (formData.documents?.[doc.key as keyof typeof formData.documents]?.url ? `${doc.label} Uploaded` : 'Select File')}
                                                </span>
                                            </div>
                                            {formData.documents?.[doc.key as keyof typeof formData.documents]?.url && (
                                                <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                                    <button
                                                        onClick={() => window.open(formData.documents?.[doc.key as keyof typeof formData.documents]?.url, '_blank')}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="View Document"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cropper Modal */}
            {isCropperOpen && (
                <ImageCropper
                    src={tempImage}
                    onCrop={handleCropApplied}
                    onCancel={() => setIsCropperOpen(false)}
                    aspectRatio={1}
                />
            )}
        </div>
    );
};

export default DischargeProfile;
