'use client';

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    CheckCircle2,
    Edit3,
    Award,
    FileText,
    Briefcase,
    X,
    Loader2,
    Plus,
    Trash2,
    UploadCloud,
    CreditCard,
    Clock,
    Bed,
    Layers,
    Shield,
    RefreshCw,
    Activity,
    Camera
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ImageCropper from '@/components/ui/ImageCropper';
import { staffService } from '@/lib/integrations/services/staff.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import type { StaffProfile } from '@/lib/integrations/types';
import toast from 'react-hot-toast';
import StaffTrainingHistoryClient from '@/components/staff/StaffTrainingHistoryClient';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import { History } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';

export default function NurseProfilePage() {
    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const queryClient = useQueryClient();

    // Edit Modal State
    const [editSection, setEditSection] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Document Viewer State
    const [docViewer, setDocViewer] = useState<{ url: string; label: string } | null>(null);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    // Profile Picture Upload State
    const [uploadingPic, setUploadingPic] = useState(false);
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a JPG, PNG, or WEBP image');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadErrors(prev => ({ ...prev, profilePic: "Particular size exceed, please choose below the 5MB" }));
            toast.error('Image must be smaller than 5MB');
            return;
        } else {
            setUploadErrors(prev => {
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
            setUploadingPic(true);
            setCropper({ isOpen: false, image: '' });

            const { user, setUser } = useAuthStore.getState();

            // Optimistic Update
            if (profile) {
                setProfile({
                    ...profile,
                    user: { ...profile.user, image: croppedDataUrl } as any,
                });
            }
            if (setUser && user) {
                setUser({
                    ...user,
                    image: croppedDataUrl,
                    avatar: croppedDataUrl,
                    profilePic: croppedDataUrl
                } as any);
            }

            // Convert data URL to File
            const resBlob = await fetch(croppedDataUrl);
            const blob = await resBlob.blob();
            const file = new File([blob], "profile-pic.png", { type: "image/png" });

            const uploadToast = toast.loading("Uploading cropped photo...");

            // Step 1: Upload to Cloudinary
            const uploadRes = await staffService.uploadDocument(file, `profile_${Date.now()}`);
            if (!uploadRes.success || !uploadRes.url) {
                throw new Error('Upload failed');
            }

            // Step 2: Save URL
            const finalUrl = `${uploadRes.url}${uploadRes.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            await staffService.updateProfile({ image: finalUrl });

            // Step 3: Local Sync
            if (profile) {
                setProfile({
                    ...profile,
                    user: { ...profile.user, image: finalUrl } as any,
                });
            }
            if (setUser && user) {
                setUser({
                    ...user,
                    image: finalUrl,
                    avatar: finalUrl,
                    profilePic: finalUrl
                } as any);
            }

            toast.success('Profile picture updated!', { id: uploadToast });
            queryClient.invalidateQueries({ queryKey: ['staff-profile', 'my'] });
        } catch (err: any) {
            console.error('Nurse profile pic upload error:', err);
            toast.error(err.message || 'Failed to upload cropped image');
        } finally {
            setUploadingPic(false);
        }
    };

    const { data: profileRes, isLoading: loadingProfile } = useQuery({
        queryKey: ['staff-profile', 'my'],
        queryFn: () => staffService.getProfile(),
        refetchInterval: 5000
    });

    useEffect(() => {
        if (profileRes?.staff) {
            setProfile(profileRes.staff);
        }
    }, [profileRes]);

    const handleEdit = (section: string) => {
        if (!profile) return;
        setEditSection(section);

        // Pre-fill data based on section
        const data: any = {};
        if (section === 'personal') {
            data.name = profile.user.name;
            data.mobile = profile.user.mobile;
            data.email = profile.user.email;
            data.designation = profile.designation;
        } else if (section === 'financial') {
            data.bankDetails = { ...profile.bankDetails };
            data.panNumber = profile.panNumber || '';
            data.pfNumber = profile.pfNumber || '';
            data.baseSalary = profile.baseSalary || '';
            data.aadharNumber = (profile as any).aadharNumber || '';
            data.esiNumber = (profile as any).esiNumber || '';
            data.uanNumber = (profile as any).uanNumber || '';
        } else if (section === 'qualifications') {
            data.qualifications = [...(profile.qualificationDetails?.qualifications || [])];
            data.licenseValidityDate = profile.qualificationDetails?.licenseValidityDate || '';
        }
        setEditingData(data);
        setErrors({});
    };

    const handleFieldChange = (field: string, value: string) => {
        // REAL-TIME VALIDATION & CONSTRAINTS
        let fieldError = "";

        if (field === 'bankDetails.accountName' || field === 'name') {
            if (!/^[A-Za-z ]{3,}$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces, min 3 chars";
        }
        if (field === 'bankDetails.bankName') {
            if (!/^[A-Za-z ]+$/.test(value) && value.length > 0) fieldError = "Only alphabets & spaces";
        }
        if (field === 'mobile' || field === 'bankDetails.accountNumber' || field === 'aadharNumber' || field === 'experienceYears') {
            if (value && !/^\d*$/.test(value)) return; // Only digits
        }

        if (field === 'bankDetails.accountNumber') {
            if (!/^[0-9]{9,18}$/.test(value) && value.length > 0) fieldError = "9-18 digits only";
        }
        if (field === 'bankDetails.ifscCode') {
            value = value.toUpperCase();
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value) && value.length > 0) fieldError = "Invalid IFSC Code (e.g., SBIN0012345)";
        }
        if (field === 'panNumber') {
            value = value.toUpperCase();
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value) && value.length > 0) fieldError = "Invalid PAN format";
        }
        if (field === 'aadharNumber') {
            if (!/^[0-9]{12}$/.test(value) && value.length > 0) fieldError = "Exactly 12 digits";
        }
        if (field === 'pfNumber') {
            if (value.length > 0 && value.length < 5) fieldError = "Minimum 5 characters";
        }
        if (field === 'esiNumber') {
            if (!/^[0-9]{10,17}$/.test(value) && value.length > 0) fieldError = "10 to 17 digits only";
        }
        if (field === 'uanNumber') {
            if (!/^[0-9]{12}$/.test(value) && value.length > 0) fieldError = "Exactly 12 digits";
        }

        // MAX LENGTHS
        if (field === 'mobile' && value.length > 10) return;
        if (field === 'aadharNumber' && value.length > 12) return;
        if (field === 'panNumber' && value.length > 10) return;
        if (field === 'bankDetails.ifscCode' && value.length > 11) return;

        setErrors(prev => ({ ...prev, [field]: fieldError }));

        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setEditingData((prev: any) => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setEditingData((prev: any) => ({ ...prev, [field]: value }));
        }
    };

    const handleSave = async () => {
        if (Object.values(errors).some(err => err)) {
            toast.error('Please fix validation errors');
            return;
        }

        try {
            setSaving(true);
            const updatePayload = { ...editingData };

            // Special handling for qualifications structure
            if (editSection === 'qualifications') {
                updatePayload.qualificationDetails = {
                    ...profile?.qualificationDetails,
                    qualifications: editingData.qualifications,
                    licenseValidityDate: editingData.licenseValidityDate
                };
            }

            await staffService.updateProfile(updatePayload);
            toast.success('Section updated successfully');
            setEditSection(null);
            queryClient.invalidateQueries({ queryKey: ['staff-profile', 'my'] });
        } catch (error: any) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 5MB Limit
        if (file.size > 5 * 1024 * 1024) {
            setUploadErrors(prev => ({
                ...prev,
                [docType]: "Particular size exceed, please choose below the 5MB"
            }));
            toast.error('File exceeds 5MB');
            return;
        } else {
            setUploadErrors(prev => {
                const next = { ...prev };
                delete next[docType];
                return next;
            });
        }

        try {
            setUploadingDoc(docType);
            const fileName = `${docType}_${Date.now()}`;

            // Step 1: Upload file to Cloudinary
            const uploadResponse = await staffService.uploadDocument(file, fileName);

            if (uploadResponse.success) {
                // Step 2: Save document reference to database
                const documentData = {
                    documents: {
                        ...profile?.documents,
                        [docType]: {
                            url: uploadResponse.url,
                            publicId: uploadResponse.publicId,
                            format: uploadResponse.format || (file.type === 'application/pdf' ? 'pdf' : 'image'),
                            resource_type: uploadResponse.resource_type || (file.type === 'application/pdf' ? 'raw' : 'image')
                        }
                    }
                };

                await staffService.updateProfile(documentData);

                toast.success('Document uploaded successfully');

                // Step 3: Update local state immediately for instant UI feedback
                if (profile) {
                    setProfile({
                        ...profile,
                        documents: {
                            ...profile.documents,
                            [docType]: {
                                url: uploadResponse.url,
                                publicId: uploadResponse.publicId,
                                format: uploadResponse.format || (file.type === 'application/pdf' ? 'pdf' : 'image'),
                                resource_type: uploadResponse.resource_type || (file.type === 'application/pdf' ? 'raw' : 'image')
                            }
                        }
                    });
                }

                // Step 4: Invalidate query to ensure data consistency
                queryClient.invalidateQueries({ queryKey: ['staff-profile', 'my'] });
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploadingDoc(null);
        }
    };

    const handleDeleteDocument = async (docType: string, label: string) => {
        if (!confirm(`Are you sure you want to delete ${label}?`)) return;

        try {
            setUploadingDoc(docType);
            const newDocs = { ...(profile?.documents || {}) } as any;
            delete newDocs[docType];

            await staffService.updateProfile({ documents: newDocs });
            toast.success(`${label} deleted successfully`);

            if (profile) {
                setProfile({
                    ...profile,
                    documents: newDocs as any
                });
            }
            queryClient.invalidateQueries({ queryKey: ['staff-profile', 'my'] });
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete document');
        } finally {
            setUploadingDoc(null);
        }
    };

    if (loadingProfile || !profile) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50">
                <Spinner />
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6 lg:space-y-4">
                {cropper.isOpen && (
                    <ImageCropper
                        src={cropper.image}
                        onCrop={handleCropComplete}
                        onCancel={() => setCropper({ isOpen: false, image: '' })}
                        aspectRatio={1}
                        circular={true}
                    />
                )}

                {/* 1. HEADER / OVERVIEW CARD */}
                <ProfileHeroCard
                    name={profile.user.name}
                    role={profile.designation || 'Staff Nurse'}
                    roleBadge={`${profile.experienceYears || 0}yr Exp.`}
                    roleColor="bg-emerald-100 text-emerald-700"
                    imageUrl={(profile.user as any).image || (profile.user as any).avatar}
                    bio={profile.bio || (profile.user as any).bio}
                    onBioSave={async (newBio: string) => {
                        try {
                            await staffService.updateProfile({ bio: newBio });
                            setProfile(prev => prev ? { ...prev, bio: newBio } : null);
                            toast.success("Bio updated successfully");
                        } catch (error: any) {
                            toast.error(error.message || "Failed to update bio");
                            throw error;
                        }
                    }}
                    onEditClick={() => handleEdit('personal')}
                    editLabel="Edit Personal"
                />

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                    <InfoItem icon={<Mail size={14} className="sm:size-[16px]" />} label="Email" value={profile.user.email} />
                    <InfoItem icon={<Phone size={14} className="sm:size-[16px]" />} label="Mobile" value={profile.user.mobile} />
                    <InfoItem icon={<Building size={14} className="sm:size-[16px]" />} label="Emp ID" value={profile.employeeId} />
                </div>

                <SupportBadgeToggle />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 xl:gap-6">

                    {/* 2. QUALIFICATIONS */}
                    <SectionCard title="Qualifications" icon={<Award size={16} className="text-purple-500 sm:size-[20px]" />} onEdit={() => handleEdit('qualifications')}>
                        <div className="space-y-3 sm:space-y-4">
                            {profile.qualificationDetails?.licenseValidityDate && (
                                <div className="mb-2 sm:mb-4 p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm"><Clock size={14} className="text-slate-400 sm:size-[16px]" /></div>
                                        <div>
                                            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">License Expiry</p>
                                            <p className="text-[10px] sm:text-sm font-black text-slate-900">{new Date(profile.qualificationDetails.licenseValidityDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profile.qualificationDetails?.qualifications?.length ? (
                                profile.qualificationDetails.qualifications.map((q, i) => (
                                    <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                            <Award size={16} className="sm:size-[20px]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] sm:text-sm font-black text-slate-900 leading-tight">{q}</p>
                                            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Degree</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 font-medium italic">No qualifications added yet.</p>
                            )}
                        </div>
                    </SectionCard>

                    {/* 3. FINANCIALS */}
                    <SectionCard title="Financial" icon={<CreditCard size={16} className="text-amber-500 sm:size-[20px]" />} onEdit={() => handleEdit('financial')}>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="p-4 sm:p-5 bg-slate-900 rounded-xl sm:rounded-2xl text-white shadow-lg overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                                <p className="text-[8px] sm:text-xs font-black opacity-50 uppercase tracking-[0.2em] mb-1">Bank Account</p>
                                <p className="text-sm sm:text-lg font-black truncate">{profile.bankDetails?.accountName || 'Not Set'}</p>
                                <p className="text-base sm:text-xl font-mono mt-3 sm:mt-4 tracking-widest">
                                    •••• •••• {profile.bankDetails?.accountNumber?.slice(-4) || '••••'}
                                </p>
                                <div className="mt-3 sm:mt-4 flex items-center justify-between text-[8px] sm:text-xs font-bold uppercase opacity-70">
                                    <span>{profile.bankDetails?.bankName || 'Unknown Bank'}</span>
                                    <span className="font-mono">{profile.bankDetails?.ifscCode}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <SecureItem label="PAN" value={profile.panNumber} />
                                <SecureItem label="PF No" value={profile.pfNumber} />
                            </div>
                        </div>
                    </SectionCard>
                </div>

                <PrinterSettingsCard />

                {/* 4. DOCUMENTS */}
                <div className="bg-white rounded-2xl lg:rounded-[1.5rem] p-4 lg:p-6 border border-slate-200 shadow-sm relative">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <h2 className="text-xs sm:text-lg font-black text-slate-900 flex items-center gap-2 sm:gap-3 uppercase">
                            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600"><FileText size={16} className="sm:size-[20px]" /></div>
                            Legal Documents
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                        <DocUploadCard
                            label="Degree / Certificate"
                            doc={profile.documents?.degreeCertificate}
                            onUpload={(e: any) => handleFileUpload(e, 'degreeCertificate')}
                            onView={(url: string) => setDocViewer({ url, label: 'Degree / Certificate' })}
                            onDelete={() => handleDeleteDocument('degreeCertificate', 'Degree / Certificate')}
                            isUploading={uploadingDoc === 'degreeCertificate'}
                            error={uploadErrors.degreeCertificate}
                        />
                        <DocUploadCard
                            label="Nursing Council Reg."
                            doc={profile.documents?.nursingCouncilRegistration}
                            onUpload={(e: any) => handleFileUpload(e, 'nursingCouncilRegistration')}
                            onView={(url: string) => setDocViewer({ url, label: 'Nursing Council Reg.' })}
                            onDelete={() => handleDeleteDocument('nursingCouncilRegistration', 'Nursing Council Reg.')}
                            isUploading={uploadingDoc === 'nursingCouncilRegistration'}
                            error={uploadErrors.nursingCouncilRegistration}
                        />
                        <DocUploadCard
                            label="Internship Completion"
                            doc={profile.documents?.internshipCertificate}
                            onUpload={(e: any) => handleFileUpload(e, 'internshipCertificate')}
                            onView={(url: string) => setDocViewer({ url, label: 'Internship Completion' })}
                            onDelete={() => handleDeleteDocument('internshipCertificate', 'Internship Completion')}
                            isUploading={uploadingDoc === 'internshipCertificate'}
                            error={uploadErrors.internshipCertificate}
                        />
                    </div>
                </div>

                {/* 5. HOSPITAL STRUCTURE OVERVIEW */}
                <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 border border-slate-200 shadow-sm relative">
                    <div className="flex items-center justify-between mb-4 sm:mb-8">
                        <h2 className="text-xs sm:text-lg font-black text-slate-900 flex items-center gap-2 sm:gap-3 uppercase">
                            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600"><Building size={16} className="sm:size-[20px]" /></div>
                            Hospital Structure
                        </h2>
                    </div>

                    <HospitalStructureView />
                </div>

                {/* 6. INTERNSHIP & TRAINING HISTORY */}
                <div className="bg-white rounded-2xl lg:rounded-[1.5rem] p-4 lg:p-6 border border-slate-200 shadow-sm relative">
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                        <h2 className="text-xs sm:text-lg font-black text-slate-900 flex items-center gap-2 sm:gap-3 uppercase">
                            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600"><History size={16} className="sm:size-[20px]" /></div>
                            Training History
                        </h2>
                    </div>

                    <StaffTrainingHistoryClient />
                </div>


            </div>

            {/* DOCUMENT VIEWER MODAL */}
            <DocumentViewerModal
                isOpen={!!docViewer}
                onClose={() => setDocViewer(null)}
                url={docViewer?.url || ''}
                title={docViewer?.label || ''}
            />

            {/* EDIT MODALS */}
            {editSection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
                    <div className="absolute inset-0" onClick={() => setEditSection(null)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900 capitalize">Edit {editSection}</h3>
                            <button onClick={() => setEditSection(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {editSection === 'personal' && (
                                <div className="space-y-6">
                                    {/* Profile Picture Upload */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Profile Picture</label>
                                        <div className="flex items-center gap-4">
                                            {/* Current / Preview Avatar */}
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center text-slate-300 shrink-0">
                                                {editingData.previewImage || (profile.user as any).image || (profile.user as any).avatar ? (
                                                    <img
                                                        src={editingData.previewImage || (profile.user as any).image || (profile.user as any).avatar}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : <User size={24} className="text-slate-300" />}
                                            </div>
                                            <div className="flex-1">
                                                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors">
                                                    {uploadingPic ? (
                                                        <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                                                    ) : (
                                                        <><Camera size={14} /> {((profile.user as any).image || (profile.user as any).avatar) ? 'Change Photo' : 'Upload Photo'}</>
                                                    )}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        disabled={uploadingPic}
                                                        onChange={handleProfilePicUpload}
                                                    />
                                                </label>
                                                <p className="text-[10px] text-slate-400 mt-1.5 text-center font-bold tracking-tighter uppercase">Only PDF and any type of image only. Max 5MB</p>
                                                {uploadErrors.profilePic && (
                                                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter mt-1 text-center animate-bounce">{uploadErrors.profilePic}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100" />
                                    <Input label="Full Name" value={editingData.name} onChange={(e: any) => setEditingData({ ...editingData, name: e.target.value })} />
                                    <Input label="Mobile Number" value={editingData.mobile} onChange={(e: any) => setEditingData({ ...editingData, mobile: e.target.value })} />
                                </div>
                            )}

                            {editSection === 'qualifications' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">License Expiry Date</label>
                                        <input
                                            type="date"
                                            value={editingData.licenseValidityDate}
                                            onChange={(e) => setEditingData({ ...editingData, licenseValidityDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Degrees & Certificates</label>
                                        {editingData.qualifications?.map((q: string, i: number) => (
                                            <div key={i} className="flex gap-2">
                                                <input
                                                    value={q}
                                                    onChange={(e) => {
                                                        const copy = [...editingData.qualifications];
                                                        copy[i] = e.target.value;
                                                        setEditingData({ ...editingData, qualifications: copy });
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-purple-500"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const copy = editingData.qualifications.filter((_: any, idx: number) => idx !== i);
                                                        setEditingData({ ...editingData, qualifications: copy });
                                                    }}
                                                    className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditingData({ ...editingData, qualifications: [...(editingData.qualifications || []), ''] })}
                                            className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Add Qualification
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editSection === 'financial' && (
                                <>
                                    <Input label="Base Salary (Per Month)" value={editingData.baseSalary} readOnly={true} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Bank Name" value={editingData.bankDetails?.bankName} onChange={(e: any) => handleFieldChange('bankDetails.bankName', e.target.value)} error={errors['bankDetails.bankName']} />
                                        <Input label="Account Holder Name" value={editingData.bankDetails?.accountName} onChange={(e: any) => handleFieldChange('bankDetails.accountName', e.target.value)} error={errors['bankDetails.accountName']} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Account Number" value={editingData.bankDetails?.accountNumber} onChange={(e: any) => handleFieldChange('bankDetails.accountNumber', e.target.value)} error={errors['bankDetails.accountNumber']} />
                                        <Input label="IFSC Code" value={editingData.bankDetails?.ifscCode} onChange={(e: any) => handleFieldChange('bankDetails.ifscCode', e.target.value)} error={errors['bankDetails.ifscCode']} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="PAN Number" value={editingData.panNumber} onChange={(e: any) => handleFieldChange('panNumber', e.target.value)} error={errors['panNumber']} />
                                        <Input label="Aadhar Number" value={editingData.aadharNumber} onChange={(e: any) => handleFieldChange('aadharNumber', e.target.value)} error={errors['aadharNumber']} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <Input label="PF Number" value={editingData.pfNumber} onChange={(e: any) => handleFieldChange('pfNumber', e.target.value)} error={errors['pfNumber']} />
                                        <Input label="ESI Number" value={editingData.esiNumber} onChange={(e: any) => handleFieldChange('esiNumber', e.target.value)} error={errors['esiNumber']} />
                                        <Input label="UAN Number" value={editingData.uanNumber} onChange={(e: any) => handleFieldChange('uanNumber', e.target.value)} error={errors['uanNumber']} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                            <button onClick={() => setEditSection(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2 disabled:opacity-70"
                            >
                                {saving && <Loader2 className="animate-spin" size={14} />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents
function SectionCard({ title, icon, children, onEdit }: any) {
    return (
        <div className="bg-white rounded-2xl lg:rounded-[1.5rem] p-4 lg:p-5 xl:p-6 border border-slate-200 shadow-sm relative group h-full">
            <div className="flex items-center justify-between mb-4 lg:mb-5">
                <h2 className="text-xs sm:text-lg font-black text-slate-900 flex items-center gap-2 sm:gap-3 uppercase">
                    <div className="p-1.5 sm:p-2 rounded-lg lg:rounded-xl bg-slate-50">{icon}</div>
                    {title}
                </h2>
                <button onClick={onEdit} className="p-2 rounded-xl text-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                    <Edit3 size={14} className="sm:size-[18px]" />
                </button>
            </div>
            {children}
        </div>
    );
}

function DocUploadCard({ label, doc, onUpload, onView, onDelete, isUploading, error }: any) {
    const hasDoc = !!doc?.url;

    // Extract filename from URL or publicId
    const getFileName = () => {
        if (!hasDoc) return null;
        if (doc.publicId) {
            const parts = doc.publicId.split('/');
            return parts[parts.length - 1];
        }
        if (doc.url) {
            const urlParts = doc.url.split('/');
            return urlParts[urlParts.length - 1].split('?')[0];
        }
        return null;
    };

    // Build an inline-viewable URL for Cloudinary
    const getViewUrl = () => {
        if (!hasDoc || !doc.url) return '';
        if (doc.url.includes('cloudinary.com')) {
            // Force inline rendering — strip fl_attachment if present, then add fl_attachment:false
            return doc.url
                .replace('/upload/fl_attachment/', '/upload/')
                .replace('/upload/', '/upload/fl_attachment:false/');
        }
        return doc.url;
    };

    const fileName = getFileName();
    const viewUrl = getViewUrl();

    const handleView = () => {
        if (onView && viewUrl) onView(viewUrl);
    };

    return (
        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center hover:border-blue-300 transition-colors relative group">
            <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center ${hasDoc ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                {hasDoc ? <CheckCircle2 size={24} /> : <FileText size={24} />}
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">{label}</p>

            {hasDoc && fileName ? (
                <p className="text-[10px] text-slate-500 font-medium mb-2 px-2 py-1 bg-slate-50 rounded-lg max-w-full truncate" title={fileName}>
                    {fileName}
                </p>
            ) : null}

            <p className="text-xs text-slate-400 font-medium mb-2">{hasDoc ? '✓ Uploaded' : 'Not Uploaded'}</p>

            <div className="w-full space-y-2">
                <div className="flex gap-2 w-full">
                    {hasDoc && (
                        <>
                            <button
                                onClick={handleView}
                                className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                            >
                                <FileText size={12} /> View
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                    <label className={`${hasDoc ? 'flex-1' : 'w-full'} py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1 transition-colors ${isUploading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : hasDoc ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                        {isUploading ? 'Uploading...' : (hasDoc ? 'Update' : 'Upload Now')}
                        <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={onUpload} disabled={isUploading} />
                    </label>
                </div>
                {!hasDoc && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Only PDF and any type of image only. Max 5MB</p>}
                {error && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 animate-bounce">{error}</p>}
            </div>
        </div>
    );
}

function Badge({ icon, text, color }: any) {
    const styles: any = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        slate: "bg-slate-50 text-slate-600 border-slate-200",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100"
    };
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${styles[color]}`}>
            {icon} {text}
        </div>
    );
}

function InfoItem({ icon, label, value }: any) {
    return (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="text-slate-400 shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-[10px] sm:text-sm font-black text-slate-900 truncate">{value || '--'}</p>
            </div>
        </div>
    );
}

function SecureItem({ label, value }: any) {
    return (
        <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{label}</p>
            <p className="text-[10px] sm:text-sm font-mono font-black text-slate-700">
                {value ? '•••• ' + value.slice(-4) : 'Not Set'}
            </p>
        </div>
    );
}

function Input({ label, value, onChange, error, readOnly }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                {label}
                {readOnly && <span className="text-slate-400 lowercase">(view only)</span>}
            </label>
            <input
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                className={`w-full px-4 py-3 bg-slate-50 border ${error ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300 ${readOnly ? 'cursor-not-allowed opacity-70 bg-slate-100' : 'focus:border-slate-400'}`}
            />
            {error && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{error}</p>}
        </div>
    );
}

function HospitalStructureView() {
    const { data: hospitalRes, isLoading: loadingHospital, refetch: refetchHospital } = useQuery({
        queryKey: ['hospital-details-live'],
        queryFn: async () => {
            const { hospitalAdminService } = await import('@/lib/integrations/services/hospitalAdmin.service');
            // Parallel fetch for Hospital details, Beds, and Staff counts
            console.log("[NurseProfile] Fetching hospital details...");
            const [hRes, beds, staffCounts] = await Promise.all([
                hospitalAdminService.getHospital(),
                ipdService.getBeds(),
                hospitalAdminService.getHospitalStaffCounts()
            ]);

            console.log("[NurseProfile] Data received:", { hRes, bedsLen: beds.length, staffCounts });

            const h = hRes.hospital;
            return {
                ...h,
                totalBeds: beds.length || 0,
                availableBeds: beds.filter(b => b.status === "Vacant").length || 0,
                medicalStaffCount: staffCounts.total || 0
            };
        }
    });

    const { data: hospitalMeta, isLoading: loadingMeta } = useQuery({
        queryKey: ['hospital-metadata'],
        queryFn: async () => {
            const { hospitalAdminService } = await import('@/lib/integrations/services/hospitalAdmin.service');
            return (await hospitalAdminService.getHospitalMetadata()).data;
        }
    });

    const isLoading = loadingHospital || loadingMeta;
    const hospital = hospitalRes;

    const occupancyRate = React.useMemo(() => {
        const total = (hospital as any)?.totalBeds || 0;
        if (!total) return 0;
        const available = (hospital as any).availableBeds || 0;
        return Math.min(100, Math.round(((total - available) / total) * 100));
    }, [hospital]);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>;
    if (!hospital || !hospitalMeta) return <p className="text-slate-400 text-center py-8 italic uppercase text-[10px] font-bold tracking-widest">No metadata available</p>;

    const roomTypeCounts = (hospitalMeta.rooms || []).reduce((acc: any, room) => {
        const type = room.type || 'Standard';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Bed Occupancy Card */}
                <div className="lg:col-span-12">
                    <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 text-white relative overflow-hidden group shadow-xl">
                        <div className="absolute -right-4 -top-4 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                            <Bed size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Capacity Metrics</span>
                                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">REALTIME</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Institutional Operations Active</p>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={14} className="text-rose-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ICU Core</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{(hospital as any).ICUBeds || 0}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Layers size={14} className="text-purple-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Room Nodes</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{hospital.roomCount || 0}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield size={14} className="text-amber-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Divisions</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{hospitalMeta?.departments?.length || hospital.departmentCount || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest px-1">Room Categories</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(roomTypeCounts).map(([type, count]: [string, any]) => (
                        <div key={type} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-500 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Building size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{type}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{count} Registered</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Asset Directory</h3>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{hospitalMeta.rooms?.length} Total Nodes</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(hospitalMeta.rooms || []).map((room, i) => (
                        <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 group hover:bg-white hover:shadow-sm transition-all">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-emerald-500 transition-colors"></div>
                            {room.label} <span className="text-slate-300">/</span> {room.type}
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-theme/10 text-primary-theme flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hospital ID</p>
                        <p className="text-[10px] font-mono font-black text-slate-600 tracking-tighter">{hospital._id}</p>
                    </div>
                </div>
                <button
                    onClick={() => { refetchHospital(); }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw size={14} /> Refresh Infrastructure Data
                </button>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Loading Profile...</p>
        </div>
    );
}
