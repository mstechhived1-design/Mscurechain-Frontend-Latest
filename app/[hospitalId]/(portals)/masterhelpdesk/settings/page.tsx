"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import {
    User, Mail, Phone, Briefcase, Award,
    CreditCard, Building, Landmark, Wallet,
    Save, ArrowLeft, Plus, X,
    Calendar, FileText, MapPin, QrCode, Copy, Printer
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { useQueryClient } from '@tanstack/react-query';
import ImageCropper from '@/components/ui/ImageCropper';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

const DocumentViewerModal = ({ isOpen, onClose, url, title }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12 bg-[#020617]/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0a0a09] w-full h-full max-h-[90vh] max-w-6xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col relative  border border-white/10">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-widest truncate max-w-[200px] sm:max-w-md">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 active:scale-90 transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#050505] flex items-center justify-center">
                    {url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('raw') || url?.toLowerCase().includes('pdf') ? (
                        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" title={title} />
                    ) : (
                        <img src={url} alt={title} className="max-w-full h-auto " />
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Secure Document Viewer</p>
                </div>
            </div>
        </div>
    );
};

interface FormData {
    name: string;
    email: string;
    mobile: string;
    address: string;
    profilePic: string;
    gender: string;
    dateOfBirth: string;
    designation: string;
    department: string;
    employeeId: string;
    joiningDate: string;
    experienceYears: string;
    workingHours: { start: string; end: string };
    bankDetails: { bankName: string; accountNumber: string; accountName: string; ifscCode: string };
    panNumber: string;
    aadharNumber: string;
    baseSalary: string;
    pfNumber: string;
    esiNumber: string;
    uanNumber: string;
    registrationNumber: string;
    licenseValidityDate: string;
    qualifications: string[];
    hospitalName: string;
    hospitalAddress: string;
    hospitalEmail: string;
    hospitalMobile: string;
    documents: Record<string, any>;
}

export default function MasterHelpdeskProfileSettings() {
    const router = useRouter();
    const params = useParams() as any;
    const queryClient = useQueryClient();
    const hospitalId = params?.hospitalId as string;

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });
    const [isIFSCValidating, setIsIFSCValidating] = useState(false);
    const [cropperSrc, setCropperSrc] = useState<string | null>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    const handlePrintQR = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        if (!printWindow) return;

        const qrSvg = qrRef.current?.querySelector('svg')?.outerHTML || '';
        const hospitalName = formData.hospitalName || 'Our Hospital';
        const hospitalAddress = formData.hospitalAddress || '';
        const hospitalLogo = formData.profilePic || '';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR - ${hospitalName}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                        body {
                            font-family: 'Outfit', sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background-color: #f8fafc;
                        }
                        .card {
                            background: white;
                            width: 450px;
                            padding: 60px 40px;
                            border-radius: 40px;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
                            text-align: center;
                            border: 1px solid #e2e8f0;
                            position: relative;
                            overflow: hidden;
                        }
                        .card::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 10px;
                            background: linear-gradient(90deg, #0d9488, #0ea5e9);
                        }
                        .logo {
                            width: 80px;
                            height: 80px;
                            object-fit: cover;
                            border-radius: 20px;
                            margin-bottom: 24px;
                            border: 4px solid #f1f5f9;
                        }
                        .hospital-name {
                            font-size: 28px;
                            font-weight: 900;
                            color: #0f172a;
                            margin: 0 0 8px 0;
                            letter-spacing: -0.5px;
                            text-transform: uppercase;
                        }
                        .hospital-address {
                            font-size: 14px;
                            color: #64748b;
                            margin-bottom: 40px;
                            line-height: 1.5;
                            max-width: 300px;
                            margin-left: auto;
                            margin-right: auto;
                        }
                        .qr-container {
                            background: #f8fafc;
                            padding: 30px;
                            border-radius: 30px;
                            display: inline-block;
                            margin-bottom: 40px;
                            border: 2px solid #f1f5f9;
                        }
                        .qr-container svg {
                            width: 240px !important;
                            height: 240px !important;
                        }
                        .instruction {
                            font-size: 18px;
                            font-weight: 700;
                            color: #0f172a;
                            margin-bottom: 12px;
                        }
                        .sub-instruction {
                            font-size: 13px;
                            color: #94a3b8;
                            margin-bottom: 40px;
                            line-height: 1.6;
                        }
                        .footer {
                            border-top: 1px solid #f1f5f9;
                            padding-top: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        }
                        .footer-text {
                            font-size: 11px;
                            font-weight: 900;
                            color: #94a3b8;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        @media print {
                            @page {
                                size: portrait;
                                margin: 0;
                            }
                            body { 
                                background: white !important; 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                -webkit-print-color-adjust: exact;
                            }
                            .card { 
                                box-shadow: none !important; 
                                border: none !important; 
                                width: 100vw !important; 
                                height: 100vh !important; 
                                border-radius: 0 !important; 
                                padding: 20px !important; 
                                margin: 0 !important;
                                display: flex !important;
                                flex-direction: column !important;
                                justify-content: center !important;
                                align-items: center !important;
                                page-break-after: avoid !important;
                                page-break-inside: avoid !important;
                                overflow: hidden !important;
                            }
                            .logo {
                                width: 70px !important;
                                height: 70px !important;
                            }
                            .hospital-name {
                                font-size: 24px !important;
                            }
                            .hospital-address {
                                margin-bottom: 20px !important;
                            }
                            .qr-container {
                                padding: 20px !important;
                                margin-bottom: 20px !important;
                            }
                            .qr-container svg {
                                width: 220px !important;
                                height: 220px !important;
                            }
                            .sub-instruction {
                                margin-bottom: 20px !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        ${hospitalLogo ? `<img src="${hospitalLogo}" class="logo" />` : ''}
                        <h1 class="hospital-name">${hospitalName}</h1>
                        <p class="hospital-address">${hospitalAddress}</p>
                        
                        <div class="qr-container">
                            ${qrSvg}
                        </div>
                        
                        <div class="instruction">Scan to Book Appointment</div>
                        <p class="sub-instruction">Open your camera or CureChain app to scan this QR and book your slot instantly.</p>
                        
                        <div class="footer">
                            <span class="footer-text">Powered by CureChain</span>
                        </div>
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => window.close(), 500);
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const [formData, setFormData] = useState<FormData>({
        // Personal & Account
        name: '',
        email: '',
        mobile: '',
        address: '',
        profilePic: '',
        gender: '',
        dateOfBirth: '',

        // Professional & Placement (UI Only / Extension allowed later)
        designation: 'Master Helpdesk Executive',
        department: 'Central Support',
        employeeId: '',
        joiningDate: '',
        experienceYears: '',
        workingHours: { start: '', end: '' },

        // Bank & Payroll 
        bankDetails: { bankName: '', accountNumber: '', accountName: '', ifscCode: '' },
        panNumber: '',
        aadharNumber: '',
        baseSalary: '',
        pfNumber: '',
        esiNumber: '',
        uanNumber: '',

        registrationNumber: '',
        licenseValidityDate: '',
        qualifications: [] as string[],
        hospitalName: '',
        hospitalAddress: '',
        hospitalEmail: '',
        hospitalMobile: '',
        documents: {}
    });

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                // Force fresh fetch to bypass any intermediate caching
                const res = await helpdeskService.getMasterMe();

                let latestHospital = res?.hospital;
                try {
                    // We try to get the most authoritative hospital data, but ignore if permissions don't allow (403)
                    const hRes = await hospitalAdminService.getHospital();
                    if (hRes?.hospital) latestHospital = { ...latestHospital, ...hRes.hospital } as any;
                } catch (e) {
                    console.warn("[settings] Note: Could not fetch global hospital details (Permission restricted). Using profile-linked hospital data.");
                }

                // 🚀 FE-Only Persistence: Load local overrides since backend strips non-schema fields
                let localOverrides: any = {};
                try {
                    const saved = localStorage.getItem(`master_branding_${hospitalId}`);
                    if (saved) localOverrides = JSON.parse(saved);
                } catch (e) { }

                if (res) {
                    console.log("[Settings] Loaded Master Helpdesk Profile:", {
                        bank: !!res.bankDetails,
                        pan: !!res.panNumber
                    });

                    setFormData((prev: FormData) => ({
                        ...prev,
                        name: res.name || '',
                        email: res.email || '',
                        mobile: res.mobile || '',
                        address: res.address || '',
                        gender: res.gender || '',
                        profilePic: res.image || (latestHospital as any)?.logo || '',
                        dateOfBirth: (() => {
                            if (!res.dateOfBirth) return '';
                            const d = new Date(res.dateOfBirth);
                            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                        })(),
                        hospitalName: localOverrides.hospitalName || (res.hospital as any)?.name || (latestHospital as any)?.name || '',
                        hospitalAddress: localOverrides.hospitalAddress || (res.hospital as any)?.address || (latestHospital as any)?.address || '',
                        hospitalEmail: localOverrides.hospitalEmail || (res.hospital as any)?.email || (latestHospital as any)?.email || '',
                        hospitalMobile: localOverrides.hospitalMobile || (res.hospital as any)?.mobile || (latestHospital as any)?.phone || (latestHospital as any)?.mobile || '',

                        // Map Profile & Financial fields with type safety
                        bankDetails: {
                            bankName: res.bankDetails?.bankName || prev.bankDetails.bankName || '',
                            accountNumber: res.bankDetails?.accountNumber || prev.bankDetails.accountNumber || '',
                            accountName: res.bankDetails?.accountName || prev.bankDetails.accountName || '',
                            ifscCode: res.bankDetails?.ifscCode || prev.bankDetails.ifscCode || '',
                        },
                        panNumber: res.panNumber || '',
                        aadharNumber: res.aadharNumber || '',
                        pfNumber: res.pfNumber || '',
                        esiNumber: res.esiNumber || '',
                        uanNumber: res.uanNumber || '',
                        baseSalary: res.baseSalary?.toString() || '',
                        experienceYears: res.experienceYears?.toString() || '',
                        designation: res.designation || 'Master Helpdesk Executive',
                    }));
                }
            } catch (error) {
                toast.error('Failed to load profile details');
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

        // Strict Bank & Payroll Validation
        if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode.toUpperCase())) {
            newErrors['bankDetails.ifscCode'] = "Invalid IFSC Code format";
        }
        if (formData.bankDetails.accountNumber && !/^[0-9]{9,18}$/.test(formData.bankDetails.accountNumber)) {
            newErrors['bankDetails.accountNumber'] = "Account number must be 9-18 digits";
        }
        if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
            newErrors.panNumber = "Invalid PAN format";
        }
        if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "Aadhar number must be 12 digits";
        }
        if (formData.esiNumber && !/^[0-9]{10,17}$/.test(formData.esiNumber)) {
            newErrors.esiNumber = "ESI must be 10-17 digits";
        }
        if (formData.uanNumber && !/^\d{12}$/.test(formData.uanNumber)) {
            newErrors.uanNumber = "UAN must be 12 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let fieldError = "";

        if (name === 'bankDetails.accountName' || name === 'name') {
            if (!/^[A-Za-z ]{3,}$/.test(value) && value.length > 0) fieldError = "Only letters & spaces, min 3 chars";
        }
        if (name === 'bankDetails.bankName') {
            if (!/^[A-Za-z ]+$/.test(value) && value.length > 0) fieldError = "Only letters & spaces";
        }
        if (name === 'bankDetails.ifscCode') {
            const upper = value.toUpperCase();
            if (upper.length > 0 && upper.length < 11) fieldError = "IFSC must be 11 characters (e.g. HDFC0001234)";
            else if (upper.length === 11 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upper)) fieldError = "Invalid IFSC format — must be ABCD0xxxxxx";
        }
        if (name === 'panNumber') {
            const upper = value.toUpperCase();
            if (upper.length > 0 && upper.length < 10) fieldError = "PAN must be 10 characters (e.g. ABCDE1234F)";
            else if (upper.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(upper)) fieldError = "Invalid PAN format — 5 letters, 4 digits, 1 letter";
        }
        if (name === 'aadharNumber') {
            if (value.length > 0 && value.length < 12) fieldError = "Aadhar must be exactly 12 digits";
        }
        if (name === 'uanNumber') {
            if (value.length > 0 && value.length < 12) fieldError = "UAN must be exactly 12 digits";
        }
        if (name === 'esiNumber') {
            if (value.length > 0 && (value.length < 10 || value.length > 17)) fieldError = "ESI must be 10–17 digits";
        }
        if (name === 'bankDetails.accountNumber') {
            if (value.length > 0 && (value.length < 9 || value.length > 18)) fieldError = "Account number must be 9-18 digits";
        }

        if (name === 'hospitalName') {
            if (value && !/^[A-Za-z ]*$/.test(value)) return; // Only allow characters and spaces
        }

        if (['mobile', 'hospitalMobile', 'bankDetails.accountNumber', 'aadharNumber', 'experienceYears', 'uanNumber', 'esiNumber'].includes(name)) {
            if (value && !/^\d*$/.test(value)) return; // Only allow digits
        }

        if (name === 'mobile' && value.length > 10) return;
        if (name === 'hospitalMobile' && value.length > 10) return;
        if (name === 'aadharNumber' && value.length > 12) return;
        if (name === 'panNumber' && value.length > 10) return;
        if (name === 'bankDetails.ifscCode' && value.length > 11) return;
        if (name === 'uanNumber' && value.length > 12) return;
        if (name === 'esiNumber' && value.length > 17) return;
        if (name === 'bankDetails.accountNumber' && value.length > 18) return;

        setErrors((prev: Record<string, string>) => ({ ...prev, [name]: fieldError }));
        if (!fieldError && errors[name]) {
            setErrors((prev: Record<string, string>) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        if (name.includes('.')) {
            const keys = name.split('.');
            if (keys.length === 2) {
                const [parent, child] = keys;
                setFormData((prev: FormData) => ({
                    ...prev,
                    [parent]: { ...(prev as any)[parent], [child]: value }
                }));
            }
        } else {
            setFormData((prev: FormData) => ({ ...prev, [name]: value }));
        }
    };

    const handleQualificationChange = (index: number, value: string) => {
        const updated = [...formData.qualifications];
        updated[index] = value;
        setFormData((prev: FormData) => ({ ...prev, qualifications: updated }));
    };

    const addQualification = () => {
        setFormData((prev: FormData) => ({ ...prev, qualifications: [...prev.qualifications, ''] }));
    };

    const removeQualification = (index: number) => {
        const updated = formData.qualifications.filter((_: any, i: number) => i !== index);
        setFormData((prev: FormData) => ({ ...prev, qualifications: updated }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validate()) {
            toast.error("Please correct the errors in the form");
            return;
        }

        setIsSaving(true);
        try {
            console.log("[Settings] Saving profile data:", {
                bankDetails: formData.bankDetails,
                panNumber: formData.panNumber,
                aadharNumber: formData.aadharNumber
            });

            // 1️⃣ Update master helpdesk user profile (name, email, mobile, etc. + Profile fields)
            await helpdeskService.updateMasterProfile({
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                address: formData.address,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                image: formData.profilePic,
                // Profile & Payroll fields
                bankDetails: formData.bankDetails,
                panNumber: formData.panNumber,
                aadharNumber: formData.aadharNumber,
                pfNumber: formData.pfNumber,
                esiNumber: formData.esiNumber,
                uanNumber: formData.uanNumber,
                baseSalary: formData.baseSalary,
                experienceYears: formData.experienceYears,
                designation: formData.designation,
            } as any);

            // 2️⃣ Persist hospital branding fields directly to the Hospital document in MongoDB
            // This is the actual DB update — previously only localStorage was used
            const hospitalUpdatePayload: Record<string, any> = {};
            if (formData.hospitalName) hospitalUpdatePayload.name = formData.hospitalName;
            if (formData.hospitalAddress) hospitalUpdatePayload.address = formData.hospitalAddress;
            if (formData.hospitalEmail) hospitalUpdatePayload.email = formData.hospitalEmail;
            if (formData.hospitalMobile) hospitalUpdatePayload.phone = formData.hospitalMobile;
            if (formData.profilePic && formData.profilePic.startsWith('data:')) {
                hospitalUpdatePayload.logo = formData.profilePic;
            }

            if (Object.keys(hospitalUpdatePayload).length > 0) {
                try {
                    await hospitalAdminService.updateHospital(hospitalUpdatePayload);
                } catch (hospitalError: any) {
                    console.warn('[Settings] Hospital update partial failure:', hospitalError?.message);
                    // Don't fail the whole save if profile update succeeded
                    toast.error('Profile saved, but hospital branding update failed. Check permissions.');
                    return;
                }
            }

            // 3️⃣ Also keep localStorage in sync as a fast-read cache
            try {
                localStorage.setItem(`master_branding_${hospitalId}`, JSON.stringify({
                    hospitalName: formData.hospitalName,
                    hospitalAddress: formData.hospitalAddress,
                    hospitalEmail: formData.hospitalEmail,
                    hospitalMobile: formData.hospitalMobile
                }));
            } catch (e) {
                // non-critical
            }
            
            // 4️⃣ Invalidate sidebar branding cache to force immediate UI update
            queryClient.invalidateQueries({ queryKey: ["sidebar-hospital-branding", hospitalId] });

            toast.success('Settings updated successfully!');
            router.push(`/${hospitalId}/masterhelpdesk`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal & Account', icon: <User size={18} /> },
        { id: 'hospital', label: 'Hospital Details', icon: <Building size={18} /> },
        { id: 'professional', label: 'Work & Employment', icon: <Briefcase size={18} /> },
        { id: 'qualifications', label: 'Qualifications', icon: <Award size={18} /> },
        { id: 'bank', label: 'Bank & Payroll', icon: <Landmark size={18} /> },
        { id: 'qrcode', label: 'Hospital QR', icon: <QrCode size={18} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto py-2 sm:py-8 px-[5px] sm:px-4">
            <DocumentViewerModal
                isOpen={viewer.isOpen}
                onClose={() => setViewer({ ...viewer, isOpen: false })}
                url={viewer.url}
                title={viewer.title}
            />
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.push(`/${hospitalId}/masterhelpdesk`)}
                        className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                    >
                        <ArrowLeft size={20} className="sm:size-6" />
                    </button>
                    <div>
                        <h1 className="md:text-xl text-lg font-black text-gray-900 dark:text-white tracking-tighter">Master Helpdesk Profile</h1>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Healthcare Administration Registry</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 bg-primary-theme hover:bg-primary-theme/80 text-white text-[10px] sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} className="sm:size-4" />}
                    Save 
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-64 shrink-0">
                    <div className="lg:hidden mb-6">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3 block px-1">Navigation Registry</label>
                        <div className="relative">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-teal-500  appearance-none"
                            >
                                {tabs.map(tab => (
                                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Plus size={16} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <SupportBadgeToggle />
                        </div>
                    </div>

                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden lg:flex lg:flex-col gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-primary-theme text-white  translate-x-1'
                                    : 'bg-white dark:bg-[#111] text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800'
                                    }`}
                            >
                                <span className={`shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-teal-600'}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                        <div className="mt-6">
                            <SupportBadgeToggle />
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-gray-800 p-3 sm:p-8 ">
                    {activeTab === 'personal' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.name ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <User className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.email ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Mobile Number</label>
                                        <div className="relative">
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.mobile ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.mobile}</p>}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Personal Address</label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter your complete home address"
                                            rows={3}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.dateOfBirth ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all`} />
                                            <Calendar className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                        {errors.dateOfBirth && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.dateOfBirth}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hospital' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Hospital Branding Details</h3>

                                {/* Hospital Logo Updater */}
                                {cropperSrc && (
                                    <ImageCropper
                                        src={cropperSrc}
                                        circular={true}
                                        aspectRatio={1}
                                        onCrop={(croppedImage) => {
                                            setFormData((prev: FormData) => ({ ...prev, profilePic: croppedImage }));
                                            setCropperSrc(null);
                                        }}
                                        onCancel={() => setCropperSrc(null)}
                                    />
                                )}
                                <div className="mb-8 flex items-center gap-6">
                                    <div className="relative group w-24 h-24 rounded-full border-4 border-white dark:border-[#111]  overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                                        {formData.profilePic ? (
                                            <img src={formData.profilePic} alt="Hospital Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building className="w-10 h-10 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        )}
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Update</span>
                                            <input type="file" name="profilePic" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setCropperSrc(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                                // Reset input so same file can be picked again
                                                e.target.value = '';
                                            }} className="hidden" />
                                        </label>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Hospital Logo</h4>
                                        <p className="text-xs text-gray-400">JPG, GIF or PNG. Used for printed receipts.</p>
                                        <p className="text-[10px] text-teal-500 mt-1 font-semibold">Click the logo to open image cropper.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Hospital Name</label>
                                        <div className="relative">
                                            <input type="text" name="hospitalName" value={formData.hospitalName} onChange={handleChange} placeholder="Enter hospital name" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                                            <Building className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Hospital Address</label>
                                        <div className="relative">
                                            <textarea name="hospitalAddress" value={formData.hospitalAddress} onChange={handleChange} placeholder="Enter hospital address" rows={2} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none" />
                                            <MapPin className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Hospital Phone Number</label>
                                        <div className="relative">
                                            <input type="text" name="hospitalMobile" value={formData.hospitalMobile} onChange={handleChange} placeholder="Enter hospital mobile" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                                            <Phone className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Hospital Email</label>
                                        <div className="relative">
                                            <input type="email" name="hospitalEmail" value={formData.hospitalEmail} onChange={handleChange} placeholder="Enter hospital email" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                                            <Mail className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <PrinterSettingsCard />
                        </div>
                    ) || <></>}

                    {activeTab === 'qrcode' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <QrCode className="text-teal-500" /> Hospital QR Code
                                </h3>
                                <p className="text-sm text-gray-500 mb-8">
                                    This QR code allows patients to instantly book appointments at <strong>{formData.hospitalName || 'your hospital'}</strong> using the MSCurechain app.
                                </p>

                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <div ref={qrRef} className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-gray-100">
                                        <QRCode
                                            value={`mscurechain://book?hospitalId=${hospitalId}`}
                                            size={200}
                                            fgColor="#0f172a"
                                            bgColor="#ffffff"
                                            level="H"
                                        />
                                    </div>
                                    
                                    <div className="text-center space-y-4 max-w-sm">
                                        <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-900/30 inline-block">
                                            Ready for Print
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">
                                            Display this QR code at your front desk or include it in your hospital brochures.
                                        </p>
                                        
                                        <div className="flex gap-3">
                                            
                                            <button 
                                                type="button"
                                                onClick={handlePrintQR}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-500/20"
                                            >
                                                <Printer size={14} /> Print QR
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`mscurechain://book?hospitalId=${hospitalId}`);
                                                    toast.success("Deep link copied!");
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                                            >
                                                <Copy size={14} /> Copy Link
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                                    <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">Technical Info</h4>
                                    <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-mono break-all">
                                        mscurechain://book?hospitalId={hospitalId}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'professional' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Work & Institutional Presence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Designation</label>
                                        <div className="relative">
                                            <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                            <Award className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Department(s)</label>
                                        <div className="relative">
                                            <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                            <Building className="absolute right-4 top-3.5 text-gray-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="MHD-###" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Joining Date</label>
                                            <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Exp. (Years)</label>
                                            <input type="text" name="experienceYears" value={formData.experienceYears} onChange={handleChange} placeholder="e.g. 5" className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'qualifications' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Qualifications &amp; Credentials</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Registration / License Number</label>
                                        <input
                                            type="text"
                                            name="registrationNumber"
                                            value={formData.registrationNumber}
                                            onChange={handleChange}
                                            placeholder="e.g. MHD-2024-001"
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">License Validity Date</label>
                                        <input
                                            type="date"
                                            name="licenseValidityDate"
                                            value={formData.licenseValidityDate}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Qualifications / Degrees</label>
                                        <button
                                            type="button"
                                            onClick={addQualification}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                        >
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>

                                    {formData.qualifications.length === 0 && (
                                        <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                            No qualifications added yet. Click &ldquo;Add&rdquo; to begin.
                                        </p>
                                    )}

                                    {formData.qualifications.map((q: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={q}
                                                onChange={(e) => handleQualificationChange(i, e.target.value)}
                                                placeholder={`e.g. Masters in Hospital Administration`}
                                                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeQualification(i)}
                                                className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bank' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 transition-all">
                                    <Wallet className="text-teal-500" /> Settlement Bank Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Holder Name</label>
                                        <input type="text" name="bankDetails.accountName" value={formData.bankDetails.accountName} onChange={handleChange} placeholder="e.g. John Doe" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                        {errors['bankDetails.accountName'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.accountName']}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Bank Name</label>
                                        <input type="text" name="bankDetails.bankName" value={formData.bankDetails.bankName} onChange={handleChange} placeholder="e.g. State Bank of India" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.bankName'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                        {errors['bankDetails.bankName'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.bankName']}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Account Number</label>
                                        <input type="text" name="bankDetails.accountNumber" value={formData.bankDetails.accountNumber} onChange={handleChange} placeholder="e.g. 1234567890" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.accountNumber'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none`} />
                                        {errors['bankDetails.accountNumber'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.accountNumber']}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">IFSC Code <span className="text-gray-400 normal-case font-normal">(Format: ABCD0123456)</span></label>
                                        <input type="text" name="bankDetails.ifscCode" value={formData.bankDetails.ifscCode} onChange={handleChange} placeholder="e.g. HDFC0001234" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors['bankDetails.ifscCode'] ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm uppercase outline-none focus:ring-2 focus:ring-teal-500`} />
                                        {errors['bankDetails.ifscCode'] && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors['bankDetails.ifscCode']}</p>}
                                        {formData.bankDetails.ifscCode && !errors['bankDetails.ifscCode'] && formData.bankDetails.ifscCode.length === 11 && <p className="text-[10px] font-bold text-teal-500 mt-1">✓ Valid IFSC format</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 dark:border-gray-800">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payroll & Tax Identifiers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PAN Card Number <span className="text-gray-400 normal-case font-normal">(ABCDE1234F)</span></label>
                                        <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} placeholder="e.g. ABCDE1234F" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.panNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 uppercase`} />
                                        {errors.panNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.panNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Aadhar Number <span className="text-gray-400 normal-case font-normal">(12 digits)</span></label>
                                        <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} placeholder="e.g. 123456789012" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.aadharNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                        {errors.aadharNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.aadharNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">ESI Number <span className="text-gray-400 normal-case font-normal">(10-17 digits)</span></label>
                                        <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleChange} placeholder="e.g. 11000000000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.esiNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                        {errors.esiNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.esiNumber}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">PF Number</label>
                                        <input type="text" name="pfNumber" value={formData.pfNumber} onChange={handleChange} placeholder="e.g. MHBAN0000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">UAN Number <span className="text-gray-400 normal-case font-normal">(12 digits)</span></label>
                                        <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleChange} placeholder="e.g. 100000000000" className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${errors.uanNumber ? 'border-rose-500' : 'border-gray-100 dark:border-gray-800'} rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500`} />
                                        {errors.uanNumber && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">{errors.uanNumber}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
