'use client';

import React, { useState } from 'react';
import { X, Save, User as UserIcon, Award, Briefcase, FileText } from 'lucide-react';
import { updateDoctorProfileAction } from '@/lib/integrations/actions/doctor.actions';
import { toast } from 'react-hot-toast';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
}

export default function EditProfileModal({ isOpen, onClose, profile }: EditProfileModalProps) {
    const [formData, setFormData] = useState({
        name: profile?.user?.name || '',
        specialty: profile?.specialty || '',
        experience: profile?.experience || '',
        bio: profile?.bio || '',
        qualifications: profile?.qualifications || [],
    });
    const [isSaving, setIsSaving] = useState(false);
    const [newQualification, setNewQualification] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await updateDoctorProfileAction(formData);
            if (res.success) {
                toast.success('Profile updated successfully');
                onClose();
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const addQualification = () => {
        if (newQualification.trim()) {
            setFormData({
                ...formData,
                qualifications: [...formData.qualifications, newQualification.trim()]
            });
            setNewQualification('');
        }
    };

    const removeQualification = (index: number) => {
        const updated = [...formData.qualifications];
        updated.splice(index, 1);
        setFormData({ ...formData, qualifications: updated });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserIcon size={20} className="text-emerald-500" /> Edit Professional Profile
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Update your professional details and biography.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Award size={16} className="text-emerald-500" /> Professional Specialty
                            </label>
                            <input
                                type="text"
                                value={formData.specialty}
                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="e.g. Senior Cardiologist"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Briefcase size={16} className="text-emerald-500" /> Years of Experience
                            </label>
                            <input
                                type="text"
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="e.g. 15 Years"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <FileText size={16} className="text-emerald-500" /> Professional Bio
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={4}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                            placeholder="Tell patients about your background and expertise..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Qualifications & Certifications</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newQualification}
                                onChange={(e) => setNewQualification(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addQualification()}
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Add certification (e.g. MBBS, FRCS)"
                            />
                            <button
                                onClick={addQualification}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {formData.qualifications.map((qual: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                                    {qual}
                                    <button onClick={() => removeQualification(i)} className="hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
