'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Building2, MapPin, Save, X, RefreshCw, Eye, FileText } from 'lucide-react';
import { Modal, Button, FormInput } from '@/components/admin';
import { LogoManager } from './LogoManager';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import toast from 'react-hot-toast';

interface BrandingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [hospital, setHospital] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        street: '',
        landmark: '',
        city: '',
        area: '',
        pincode: '',
        state: '',
    });

    const fetchHospital = useCallback(async () => {
        try {
            setLoading(true);
            const res = await hospitalAdminService.getHospital();
            setHospital(res.hospital);

            // Structure existing address into fields if possible, or leave blank if new model fields are empty
            setFormData({
                name: res.hospital.name || '',
                street: res.hospital.street || '',
                landmark: res.hospital.landmark || '',
                city: res.hospital.city || '',
                area: res.hospital.area || '',
                pincode: res.hospital.pincode || '',
                state: res.hospital.state || '',
            });

            // Fallback for legacy data: If street/city are empty but address exists
            if (!res.hospital.street && res.hospital.address) {
                // We keep the legacy address for display but encourage filling new fields
                console.log("Legacy address detected:", res.hospital.address);
            }
        } catch (error) {
            toast.error("Failed to load branding data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchHospital();
        }
    }, [isOpen, fetchHospital]);

    const handleSave = async () => {
        // Validation
        const maxLength = 150;
        const fields = Object.entries(formData);
        for (const [key, value] of fields) {
            if (value.length > maxLength) {
                toast.error(`${key.charAt(0).toUpperCase() + key.slice(1)} cannot exceed ${maxLength} characters`);
                return;
            }
        }

        if (!formData.name || !formData.city || !formData.state) {
            toast.error("Name, City, and State are required for branding");
            return;
        }

        try {
            setSaving(true);
            // Construct a composite address for legacy compatibility
            const compositeAddress = [
                formData.street,
                formData.landmark,
                formData.area,
                formData.city,
                formData.state,
                formData.pincode
            ].filter(Boolean).join(', ');

            await hospitalAdminService.updateHospital({
                ...formData,
                address: compositeAddress
            });
            toast.success("Institutional branding updated");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (base64Logo: string) => {
        try {
            setSaving(true);
            // Send as JSON with base64 string
            await hospitalAdminService.updateHospital({ logo: base64Logo });
            toast.success("Logo updated successfully");

            // Update local state immediately for snappy UI
            setHospital((prev: any) => ({ ...prev, logo: base64Logo }));
        } catch (error) {
            toast.error("Failed to update logo");
        } finally {
            setSaving(false);
        }
    };

    const previewAddress = useMemo(() => {
        return [
            formData.street,
            formData.landmark,
            formData.area,
            formData.city,
            formData.state,
            formData.pincode
        ].filter(Boolean).join(', ');
    }, [formData]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-4xl"
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                        <Settings size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 italic leading-none tracking-tight">Receipt Branding</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure identity for discharge summaries</p>
                    </div>
                </div>
            }
        >
            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-slate-200 animate-spin" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fetching Identity Node...</p>
                </div>
            ) : (
                <div className="flex flex-col max-h-[70vh] md:max-h-[80vh]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2 overflow-y-auto pr-2 custom-scrollbar pb-6">
                        {/* Form Side */}
                        <div className="space-y-4">
                            {/* Logo Section */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm border-t-2 border-t-slate-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 size={14} className="text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Institutional Logo</span>
                                </div>
                                <LogoManager
                                    currentLogo={hospital?.logo}
                                    onUpload={handleLogoUpload}
                                />
                            </div>

                            {/* Name Field */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <FormInput
                                    label="Legal Hospital Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. MS Cure Hospital"
                                    icon={<Building2 size={12} className="text-slate-400" />}
                                    className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-slate-800 text-xs h-9"
                                />
                            </div>

                            {/* Structured Address Fields */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin size={14} className="text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Location Registry</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput
                                        label="Street / Building"
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        placeholder="Street details"
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                    <FormInput
                                        label="Landmark"
                                        value={formData.landmark}
                                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                        placeholder="Near by..."
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                    <FormInput
                                        label="Area / Locality"
                                        value={formData.area}
                                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                        placeholder="Area name"
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                    <FormInput
                                        label="City"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="City"
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                    <FormInput
                                        label="State"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="State"
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                    <FormInput
                                        label="Pincode"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="Pincode"
                                        className="bg-slate-50 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-[10px] h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview Side */}
                        <div className="space-y-4 h-full">
                            <div className="bg-slate-900 rounded-[1.5rem] p-4 md:p-6 text-white shadow-2xl relative overflow-hidden h-full min-h-[300px] md:min-h-[400px]">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                                    <FileText size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Eye size={14} className="text-blue-400" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] font-mono">Live Receipt Preview</span>
                                    </div>

                                    <div className="bg-white rounded-xl p-5 text-slate-900 space-y-4 shadow-xl border-l-4 border-l-blue-500 flex-grow flex flex-col justify-center">
                                        {/* Mock Receipt Header */}
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {hospital?.logo ? (
                                                    <img src={hospital.logo} alt="Preview" className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <Building2 className="text-slate-300" size={24} />
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-800 line-clamp-1">
                                                    {formData.name || 'HOSPITAL NAME'}
                                                </h4>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-tight max-w-[180px] mx-auto">
                                                    {previewAddress || 'Physical Address details will appear here'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-100 w-full" />

                                        {/* Mock Content */}
                                        <div className="space-y-2 opacity-40">
                                            <div className="h-1.5 bg-slate-50 rounded w-full" />
                                            <div className="h-1.5 bg-slate-50 rounded w-4/5" />
                                            <div className="h-1.5 bg-slate-50 rounded w-3/4" />
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-200 text-center">
                                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional Verification</span>
                                        </div>
                                    </div>

                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed text-center px-4 mt-4">
                                        Placeholder preview for visualization
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unified Action Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-none hover:bg-slate-100 transition-all text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            className="px-7 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                        >
                            <Save size={14} className="mr-2" />
                            Update Node
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
