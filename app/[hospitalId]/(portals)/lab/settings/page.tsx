'use client';

import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { toast } from 'react-hot-toast';
import { Save, Building2, Phone, Mail, Globe, MapPin, FileText, ImageIcon, Printer, ChevronDown, ChevronUp, Plus, ScrollText, X, Camera } from 'lucide-react';
import ImageCropper from '@/components/ui/ImageCropper';
import { useAuthStore } from '@/stores/authStore';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import { usePrintStore } from '@/stores/printStore';

export default function LabSettingsPage() {
    const [settings, setSettings] = useState<LabSettings>({
        name: '',
        tagline: '',
        address: '',
        phone: '',
        email: '',
        logo: '',
        website: '',
        gstin: '',
        footerText: '',
        labTerms: []
    });
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user, setUser } = useAuthStore();

    // Cropper State
    const [cropper, setCropper] = useState<{
        isOpen: boolean;
        image: string;
    }>({
        isOpen: false,
        image: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await LabSettingsService.getSettings();
            if (data) {
                let draftData: any = null;
                if (typeof window !== 'undefined') {
                    const draft = localStorage.getItem('curechain_lab_settings_draft');
                    if (draft) {
                        try { draftData = JSON.parse(draft); } catch (e) {}
                    }
                }
                const merged = { ...data, ...draftData };

                setSettings(prev => ({
                    ...prev,
                    ...merged,
                    name: merged.name || '',
                    tagline: merged.tagline || '',
                    address: merged.address || '',
                    phone: merged.phone || '',
                    email: merged.email || '',
                    logo: merged.logo || '',
                    website: merged.website || '',
                    gstin: merged.gstin || '',
                    footerText: merged.footerText || '',
                    labTerms: merged.labTerms || []
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Could not load lab settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (settings.name || settings.phone || settings.email) {
            localStorage.setItem('curechain_lab_settings_draft', JSON.stringify(settings));
        }
    }, [settings]);

    useEffect(() => {
        if (settings.labTerms) {
            usePrintStore.getState().setFooterTerms(
                settings.labTerms.filter((t: string) => t.trim() !== '').join('\n')
            );
        }
    }, [settings.labTerms]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value || '' }));
    };

    const handleTermChange = (index: number, value: string) => {
        const newTerms = [...(settings.labTerms || [])];
        newTerms[index] = value;
        setSettings({ ...settings, labTerms: newTerms });
    };

    const addTerm = () => {
        setSettings({ ...settings, labTerms: [...(settings.labTerms || []), ''] });
    };

    const removeTerm = (index: number) => {
        const newTerms = [...(settings.labTerms || [])];
        newTerms.splice(index, 1);
        setSettings({ ...settings, labTerms: newTerms });
    };

    // ─── Live Receipt Preview Component ────────────────────────────────────────
    const LabReceiptPreview = () => (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden text-[9px] sm:text-[10px] font-sans w-full flex flex-col">
            {/* ── HEADER ── */}
            <div className="px-5 py-4 pb-2">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 shrink-0">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full border border-blue-900 rounded-md flex items-center justify-center text-blue-900 text-[8px] font-bold">LOGO</div>
                        )}
                    </div>
                    <div className="w-[1.5px] h-10 bg-blue-900 opacity-20 hidden sm:block"></div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm sm:text-base font-black text-blue-900 uppercase tracking-tight leading-tight mb-1 truncate">
                            {settings.name || 'Your Lab Name'}
                        </h2>
                        {settings.email && (
                            <div className="text-blue-800 font-bold flex items-center gap-1.5 mb-1 text-[9px] sm:text-[10px]">
                                <div className="w-3 h-3 bg-blue-900 rounded-sm flex items-center justify-center shrink-0"><Mail size={7} color="white" /></div>
                                <span className="truncate">{settings.email}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 text-gray-600 font-bold text-[8px] sm:text-[9px]">
                            {settings.address && (
                                <span>{settings.address}</span>
                            )}
                            {settings.phone && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <div className="w-3 h-3 bg-green-500 rounded-sm flex items-center justify-center shrink-0"><Phone size={7} fill="white" color="white" /></div>
                                    <span>{settings.phone}</span>
                                </div>
                            )}
                            {settings.gstin && (
                                <span className="text-blue-900">GST No: {settings.gstin}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full h-1 bg-green-500 mt-3 rounded-full"></div>
            </div>

            {/* ── INVOICE BODY ── */}
            <div className="px-5 py-2 flex-1">
                <div className="text-center font-bold text-[10px] sm:text-xs mb-3 border-b-2 border-t-2 border-gray-800 py-1 uppercase tracking-widest">Invoice</div>
                
                <div className="grid grid-cols-2 gap-0 border border-gray-800 mb-3">
                    <div className="border-r border-gray-800 p-2">
                        <p className="font-black text-gray-900 uppercase mb-2 text-[9px] sm:text-[10px]">Invoice Information</p>
                        <div className="grid grid-cols-3 gap-1">
                            <span className="font-bold text-gray-700">Invoice ID:</span>
                            <span className="col-span-2">WLK-HHO8940230</span>
                            <span className="font-bold text-gray-700">Date:</span>
                            <span className="col-span-2">4 July 2026</span>
                        </div>
                    </div>
                    <div className="p-2">
                        <p className="font-black text-gray-900 uppercase mb-2 text-[9px] sm:text-[10px]">Patient Information</p>
                        <div className="grid grid-cols-3 gap-1">
                            <span className="font-bold text-gray-700">Name:</span>
                            <span className="col-span-2">John Doe</span>
                            <span className="font-bold text-gray-700">Age / Gender:</span>
                            <span className="col-span-2">44 Years / Male</span>
                            <span className="font-bold text-gray-700">Mobile:</span>
                            <span className="col-span-2">9898980000</span>
                            <span className="font-bold text-gray-700">Ref. Doctor:</span>
                            <span className="col-span-2">Dr. Ramesh</span>
                        </div>
                    </div>
                </div>

                {/* Item table */}
                <table className="w-full mb-3 border-collapse border border-gray-800 text-[9px] sm:text-[10px]">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-800">
                            <th className="border-r border-gray-800 px-2 py-1 text-center font-black w-10">S.No</th>
                            <th className="border-r border-gray-800 px-2 py-1 text-left font-black">Test / Service</th>
                            <th className="px-2 py-1 text-right font-black w-24">Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['1', 'Complete Blood Count (CBC)', '₹500.00'],
                            ['2', 'Lipid Profile', '₹850.00'],
                            ['3', 'Thyroid Function Test', '₹650.00'],
                            ['4', 'HbA1c', '₹400.00']
                        ].map((row, i) => (
                            <tr key={i} className="border-b border-gray-800">
                                <td className="border-r border-gray-800 px-2 py-1 text-center">{row[0]}</td>
                                <td className="border-r border-gray-800 px-2 py-1 font-medium">{row[1]}</td>
                                <td className="px-2 py-1 text-right font-bold">{row[2]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Payment & Totals */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="border border-gray-800">
                        <div className="flex justify-between border-b border-gray-800 p-1.5"><span className="font-bold">Payment Mode:</span><span>Card</span></div>
                        <div className="flex justify-between border-b border-gray-800 p-1.5"><span className="font-bold">Payment Status:</span><span className="font-bold">Fully Paid</span></div>
                        <div className="flex justify-between border-b border-gray-800 p-1.5"><span className="font-bold">Bill Date:</span><span>4 July 2026</span></div>
                        <div className="flex justify-between p-1.5"><span className="font-bold">Bill Time:</span><span>03:18 pm</span></div>
                    </div>
                    <div className="border border-gray-800">
                        <div className="flex justify-between border-b border-gray-800 p-1.5"><span className="font-bold">Total Amount:</span><span className="font-bold">₹2400.00</span></div>
                        <div className="flex justify-between p-1.5 bg-gray-100"><span className="font-bold">Balance Due:</span><span className="font-bold">₹0.00</span></div>
                        <div className="p-1.5 h-12"></div>
                    </div>
                </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="px-5 pb-5 mt-auto">
                {/* Phone & Email CTA bars (Slanted design) */}
                {(settings.phone || settings.email) && (
                    <div className="flex mb-3 rounded-lg overflow-hidden text-white font-black text-[10px] sm:text-[11px] h-8 sm:h-9">
                        {settings.phone && (
                            <div className="flex-1 bg-green-500 flex items-center px-4 relative" style={{ clipPath: 'polygon(0 0, 95% 0, 100% 100%, 0 100%)' }}>
                                <Phone size={10} fill="white" className="mr-2" />
                                {settings.phone}
                            </div>
                        )}
                        {settings.email && (
                            <div className="flex-1 bg-blue-600 flex items-center px-4 justify-end relative" style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0 100%)', marginLeft: settings.phone ? '-5%' : '0' }}>
                                <Mail size={10} className="mr-2" />
                                <span className="truncate">{settings.email}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-start gap-4">
                    <ul className="list-none p-0 m-0 text-blue-900 font-bold leading-tight flex-1 text-[8px] sm:text-[9px]">
                        {((settings.labTerms && settings.labTerms.filter(t => t.trim()).length > 0) ? settings.labTerms : ['Results clinically correlation recommended', 'Contact lab immediately for alarming results', 'Not for medico-legal purposes', '(*) Tests are not NABL accredited']).map((term, i) => (
                            <li key={i} className="mb-0.5">• {term}</li>
                        ))}
                    </ul>
                    {settings.address && (
                        <div className="text-gray-900 font-black uppercase text-right w-40 text-[8px] sm:text-[9px]">
                            {settings.address}
                        </div>
                    )}
                </div>

                <div className="text-center text-gray-500 mt-4 pt-2 border-t border-gray-100 text-[8px] font-medium">
                    This is a computer generated document and does not require a physical signature.
                </div>
            </div>
        </div>
    );


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await LabSettingsService.updateSettings(settings);
            
            // Sync with store for navbar
            if (setUser && user) {
                setUser({
                    ...user,
                    logo: settings.logo,
                    image: settings.logo,
                    avatar: settings.logo,
                    profilePic: settings.logo
                } as any);
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('curechain_lab_settings_draft');
            }

            toast.success('Lab settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropper({
                    isOpen: true,
                    image: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        setCropper(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        const toastId = toast.loading('Uploading logo...');

        try {
            const file = new File([blob], `lab_logo_${Date.now()}.png`, { type: 'image/png' });
            const { url } = await LabSettingsService.uploadLogo(file);
            
            const cacheBustedLogo = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            setSettings(prev => ({ ...prev, logo: cacheBustedLogo }));

            // Sync with store for navbar
            if (setUser && user) {
                setUser({
                    ...user,
                    logo: cacheBustedLogo,
                    image: cacheBustedLogo,
                    avatar: cacheBustedLogo,
                    profilePic: cacheBustedLogo
                } as any);
            }

            toast.success('Logo uploaded successfully', { id: toastId });
        } catch (error) {
            console.error('Logo upload failed:', error);
            toast.error('Failed to upload logo', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        handlePhotoSelected(e);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                    <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight">Lab Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px] md:text-[12px]">Manage your laboratory details, branding, and report configurations.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Preview Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setShowPreview(prev => !prev)}
                        className={`px-4 py-2 md:py-3 md:px-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95 border ${
                            showPreview
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xl shadow-teal-200 dark:shadow-none'
                                : 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800'
                        }`}
                    >
                        <Printer size={14} />
                        {showPreview ? 'Hide Preview' : 'Preview Report'}
                        {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${showPreview ? 'xl:grid-cols-5' : 'md:grid-cols-1'} gap-6 sm:gap-8 transition-all duration-300`}>
                {/* Form Area */}
                <div className={`bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 lg:p-8 shadow-sm ${showPreview ? 'xl:col-span-3' : ''}`}>
                    <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lab Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={settings.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="e.g. Medi Lab Laboratory"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tagline</label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={settings.tagline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="e.g. Advanced Diagnostic Center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Contact Information
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Complete Address</label>
                                <textarea
                                    name="address"
                                    rows={3}
                                    value={settings.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium resize-none"
                                    placeholder="Lab full address..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" /> Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={settings.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="+91..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={settings.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="lab@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Website
                                    </label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={settings.website}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="www.example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal \u0026 Branding */}
                    <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> Legal \u0026 Branding
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">GSTIN / Tax ID</label>
                                <input
                                    type="text"
                                    name="gstin"
                                    value={settings.gstin}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Logo URL or Upload</label>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                    <input
                                        type="text"
                                        name="logo"
                                        value={settings.logo}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm sm:text-base font-medium"
                                        placeholder="https://..."
                                    />
                                    <div className="relative shrink-0">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            disabled={saving}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-all border border-slate-200 dark:border-gray-600 font-bold text-sm whitespace-nowrap shadow-sm"
                                        >
                                            Upload Image
                                        </button>
                                    </div>
                                </div>
                                {settings.logo && (
                                    <div className="mt-2 p-2 border rounded-lg w-fit bg-gray-50">
                                        <img src={settings.logo} alt="Logo Preview" className="h-16 object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pt-4">
                         <SupportBadgeToggle />
                         <PrinterSettingsCard />
                     </div>

                    {/* Terms & Conditions Section */}
                    <div className="pt-8 border-t border-slate-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <ScrollText className="w-5 h-5 text-blue-500" /> Terms & Conditions
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Configure terms to be printed on the footer of your lab reports.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addTerm}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95"
                            >
                                <Plus size={14} /> Add Term
                            </button>
                        </div>

                        <div className="space-y-4">
                            {(settings.labTerms || []).map((term: string, index: number) => (
                                <div key={`term-${index}`} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex-1 relative group">
                                        <ScrollText className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={term}
                                            onChange={(e) => handleTermChange(index, e.target.value)}
                                            placeholder="e.g. Test results may vary. Consult a doctor for diagnosis."
                                            className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeTerm(index)}
                                        className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all active:scale-90"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                            {(settings.labTerms || []).length === 0 && (
                                <div className="py-8 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-3xl text-center">
                                    <ScrollText className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400 italic font-bold uppercase tracking-widest">No custom terms configured. Default terms will be applied if any.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-8 border-t border-slate-100 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full sm:w-auto sm:ml-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
                        >
                            <Save className={`${saving ? 'animate-spin' : ''} w-5 h-5`} />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                    </form>
                </div>

                {/* ── LIVE RECEIPT PREVIEW ── */}
                {showPreview && (
                    <div className="xl:col-span-2 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="sticky top-6">
                            <LabReceiptPreview />
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* IMAGE CROPPER MODAL */}
        {cropper.isOpen && (
            <ImageCropper
                src={cropper.image}
                onCancel={() => setCropper(prev => ({ ...prev, isOpen: false }))}
                onCrop={(dataUrl) => {
                    // Convert dataUrl to blob and call handleCropComplete
                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(handleCropComplete);
                }}
                isUploading={saving}
            />
        )}
        </>
    );
}
