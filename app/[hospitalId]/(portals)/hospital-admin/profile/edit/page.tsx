"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import { ArrowLeft, } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getStaffProfileAction, updateStaffProfileAction } from '@/lib/integrations/actions/staff.actions';

export default function EditAdminProfilePage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        mobile: '',
        gender: '',
        dateOfBirth: '',
        designation: '',
        department: '',
        employeeId: '',
        joiningDate: '',
        experienceYears: '',
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

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                const res = await getStaffProfileAction();
                if (res && res.staff) {
                    const s = res.staff;
                    setFormData({
                        name: (s.user as any)?.name || '',
                        email: (s.user as any)?.email || '',
                        mobile: (s.user as any)?.mobile || '',
                        gender: (s.user as any)?.gender || '',
                        dateOfBirth: (s.user as any)?.dateOfBirth ? new Date((s.user as any).dateOfBirth).toISOString().split('T')[0] : '',
                        designation: s.designation || 'Hospital Administrator',
                        department: Array.isArray(s.department) ? s.department.join(', ') : s.department || 'Administration',
                        employeeId: s.employeeId || '',
                        joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().split('T')[0] : '',
                        experienceYears: s.experienceYears || '',
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
                        uanNumber: s.uanNumber || ''
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
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }
        if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
            newErrors.mobile = "Mobile must be 10 digits";
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format";
        }
        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar must be 12 digits";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Auto uppercase
        let finalValue = value;
        if (name === 'bankDetails.ifscCode' || name === 'panNumber') {
            finalValue = value.toUpperCase();
        }

        // Constraints
        if (['mobile', 'bankDetails.accountNumber', 'aadharNumber', 'uanNumber', 'esiNumber'].includes(name)) {
            if (value && !/^\d*$/.test(value)) return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: finalValue }
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validate()) {
            toast.error("Please correct errors");
            return;
        }

        setIsSaving(true);
        try {
            const res = await updateStaffProfileAction(formData);
            if (res.success) {
                toast.success('Admin Profile updated successfully');
                router.push(`/${hospitalId}/hospital-admin/profile`);
            } else {
                toast.error(res.error || 'Update failed');
            }
        } catch (error) {
            toast.error('Unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">Initializing Identity Interface...</div>;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Admin Registry</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Institutional Access Control</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="px-2 md:px-8 py-3 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save Identity"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                    <div className="space-y-2">
                        {['personal', 'professional', 'financial'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                    <SupportBadgeToggle />
                </div>

                <div className="md:col-span-3 bg-white rounded-[2rem] p-2 md:p-4 md:p-8 border border-gray-100 shadow-sm space-y-8">
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} />
                            <Input label="Email" name="email" value={formData.email} onChange={handleChange} error={errors.email} readOnly />
                            <Input label="Mobile" name="mobile" value={formData.mobile} onChange={handleChange} error={errors.mobile} />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none">
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
                            <Input label="Department" name="department" value={formData.department} onChange={handleChange} />
                            <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} />
                            <Input label="Joining Date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} type="date" />
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Bank Name" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} />
                                <Input label="Account Name" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} />
                                <Input label="Account Number" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} />
                                <Input label="IFSC Code" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} />
                            </div>
                            <div className="pt-8 border-t border-gray-50 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} />
                                <Input label="Aadhar Number" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} />
                                <Input label="UAN Number" name="uanNumber" value={formData.uanNumber} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Input({ label, error, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</label>
            <input {...props} className={`w-full bg-gray-50 border ${error ? 'border-rose-500' : 'border-gray-100'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all`} />
            {error && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">{error}</p>}
        </div>
    );
}
