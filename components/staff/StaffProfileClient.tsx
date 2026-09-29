"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Mail, Phone, Award, MapPin,
    Calendar as CalendarIcon,
    Landmark, ShieldCheck,
    Building, BookOpen, FileText, CheckCircle2, Loader2,
    Eye
} from 'lucide-react';
import { getStaffProfileAction, getStaffDashboardAction } from '@/lib/integrations/actions/staff.actions';
import StaffProfileHeader from '@/components/staff/StaffProfileHeader';
import StaffTrainingHistoryClient from '@/components/staff/StaffTrainingHistoryClient';
import { format } from 'date-fns';
import { DocumentViewerModal } from '@/components/common/DocumentViewerModal';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

// Removed inline DocViewerModal in favor of shared component

// --- Credentials Document Viewer Component ---
const CredentialsDocViewer = ({ documents }: { documents: any }) => {
    const [viewer, setViewer] = useState({ isOpen: false, url: '', title: '' });
    const docs = [
        { id: 'degreeCertificate', label: 'Degree Certificate' },
        { id: 'medicalCouncilRegistration', label: 'Medical Council Registration' },
        { id: 'nursingCouncilRegistration', label: 'Nursing Council Registration' },

        { id: 'internshipCertificate', label: 'Internship Certificate' },
    ];
    const uploadedCount = docs.filter(d => documents?.[d.id]?.url).length;

    return (
        <div className="md:col-span-2 flex flex-col gap-2">
            <DocumentViewerModal isOpen={viewer.isOpen} onClose={() => setViewer((prev: any) => ({ ...prev, isOpen: false }))} url={viewer.url} title={viewer.title} />

            <div className="flex items-center justify-between">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    {uploadedCount} of {docs.length} certificates registered
                </p>
                <div className="flex items-center gap-0.5">
                    {docs.map((d, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${documents?.[d.id]?.url ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/60">
                {docs.map((doc) => {
                    const docData = documents?.[doc.id];
                    const hasDoc = !!docData?.url;
                    const fileName = docData?.name || (docData?.url ? decodeURIComponent(docData.url.split('/').pop()?.split('?')[0] || '').replace(/^\d+_/, '') : null);
                    const isPdf = fileName?.toLowerCase().includes('.pdf');

                    return (
                        <div key={doc.id} className={`flex items-center gap-2 px-3 py-2 transition-all ${hasDoc ? 'bg-white dark:bg-[#111]' : 'bg-gray-50/70 dark:bg-gray-900/30'} hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 group`}>
                            <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${hasDoc ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                {hasDoc ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{doc.label}</p>
                                {hasDoc ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className={`inline-flex text-[7px] font-black uppercase px-1 py-0.5 rounded-md ${isPdf ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-500'}`}>
                                            {isPdf ? 'PDF' : 'IMG'}
                                        </span>
                                        <p className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter truncate max-w-[80px] sm:max-w-[140px]">{fileName || 'Uploaded'}</p>
                                    </div>
                                ) : (
                                    <p className="text-[7px] text-amber-500 font-black uppercase tracking-tighter mt-0.5">Missing Index</p>
                                )}
                            </div>

                            <div className="hidden sm:block shrink-0">
                                {hasDoc ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] font-black uppercase rounded-md border border-emerald-100 dark:border-emerald-500/20">
                                        <CheckCircle2 size={7} /> Done
                                    </span>
                                ) : (
                                    <span className="inline-flex px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[7px] font-black uppercase rounded-md border border-amber-100 dark:border-amber-500/20">
                                        Void
                                    </span>
                                )}
                            </div>

                            {hasDoc && (
                                <button
                                    type="button"
                                    onClick={() => setViewer({ isOpen: true, url: docData.url, title: doc.label })}
                                    className="shrink-0 flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 rounded-md text-[8px] font-black uppercase tracking-widest text-gray-600 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    <Eye size={10} />
                                    <span>View</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function StaffProfileClient() {
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;

    const { data: profileRes, isLoading: profileLoading } = useQuery({
        queryKey: ['staff-profile', 'my'],
        queryFn: getStaffProfileAction,
        refetchInterval: 30000, // 30s is enough for status sync
    });

    const { data: dashboardRes, isLoading: dashboardLoading } = useQuery({
        queryKey: ['staff-dashboard', 'my'],
        queryFn: getStaffDashboardAction,
        refetchInterval: 30000, // 30s is enough for stats sync
    });

    if (profileLoading || dashboardLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!profileRes || !profileRes.staff) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Profile Missing</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        We couldn&apos;t fetch your profile details. This might be because your profile hasn&apos;t been set up yet.
                    </p>
                    <div className="pt-6">
                        <Link href={`/${hospitalId}/staff/profile/edit`} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl inline-block shadow-lg shadow-indigo-500/20">
                            Set Up Profile Now
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const profile = profileRes.staff;
    const _stats = dashboardRes?.stats;

    const staffName = profile.user?.name || 'Staff Member';
    const staffDesignation = profile.designation || 'Staff Member';
    const staffExperience = profile.experienceYears ? `${profile.experienceYears} Years` : 'N/A';
    const staffEmail = profile.user?.email || 'N/A';
    const staffPhone = profile.user?.mobile || 'N/A';
    const staffDepartments = Array.isArray(profile.department) ? profile.department.join(', ') : (profile.department || 'General');

    return (
        <div className="max-w-7xl mx-auto space-y-2 pb-6 pt-1 px-1 sm:px-2 animate-in fade-in duration-700">
            <StaffProfileHeader
                profile={profile}
                staffName={staffName}
                staffDesignation={staffDesignation}
                staffExperience={staffExperience}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Left Column: Sidebar Details */}
                <div className="lg:col-span-4 space-y-1.5">
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-[#111] p-1.5 sm:p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5">
                        <h3 className="font-black text-[8px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Contact & Base Info</h3>
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-300">
                                    <Mail size={14} />
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none">Email Matrix</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white leading-tight">{staffEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-300">
                                    <Phone size={14} />
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none">Phone Identity</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white leading-tight">{staffPhone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-300">
                                    <MapPin size={14} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter leading-none">Infrastructure Placement</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white leading-tight truncate">
                                        {profile.hospital?.name || 'Main Campus'}
                                    </p>
                                    <p className="text-[7px] font-black text-indigo-500 uppercase mt-0.5 tracking-tighter">NODE-{(profile.hospital as any)?.code}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-1.5 sm:p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5">
                        <h3 className="font-black text-[8px] uppercase tracking-widest text-gray-400">Profile Metadata</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                <p className="text-[7px] font-black text-gray-400 uppercase mb-0.5">Gender</p>
                                <p className="text-[9px] font-black text-gray-900 dark:text-white capitalize">{(profile.user as any)?.gender || 'N/A'}</p>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                <p className="text-[7px] font-black text-gray-400 uppercase mb-0.5">DOB Index</p>
                                <p className="text-[9px] font-black text-gray-900 dark:text-white">
                                    {(profile.user as any)?.dateOfBirth ? new Date((profile.user as any).dateOfBirth).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-1.5 sm:p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-[9px] text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-tight">
                                <ShieldCheck size={12} className="text-indigo-500" /> Identity Tokens
                            </h3>
                            <span className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 text-[6px] font-black rounded-md">VERIFIED_SECURE</span>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[7px] font-black text-gray-400 uppercase leading-none">PAN ID</p>
                                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{profile.panNumber || 'VOID'}</p>
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-gray-400 uppercase leading-none">Aadhar ID</p>
                                <p className="text-[10px] font-black text-gray-900 dark:text-white tracking-widest">
                                    {profile.aadharNumber ? `****${profile.aadharNumber.slice(-4)}` : 'VOID'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-[7px] font-black text-gray-400 uppercase leading-none">UAN IDX</p>
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">{profile.uanNumber || 'N/A'}</p>
                                </div>
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-[7px] font-black text-gray-400 uppercase leading-none">EMP ID</p>
                                    <p className="text-[9px] font-black tracking-tighter">{profile.employeeId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <PrinterSettingsCard />
                </div>

                <div className="lg:col-span-8 space-y-1.5 sm:space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2">
                        <div className="bg-white dark:bg-[#111] p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="font-black text-[10px] sm:text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 uppercase tracking-tight">
                                <Building size={12} className="text-indigo-600" /> Deployment Registry
                            </h3>
                            <div className="space-y-1 sm:space-y-1.5">
                                <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Placement Unit</span>
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{staffDepartments}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Designation Index</span>
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{profile.designation || 'Staff'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-50 dark:border-gray-800">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Induction Date</span>
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white tracking-tighter">
                                        {profile.joiningDate ? format(new Date(profile.joiningDate), 'dd/MM/yyyy') : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 sm:py-1.5 leading-none pt-0.5">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Assigned Rota</span>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter truncate max-w-[120px]">
                                        {profile.resolvedShift?.name || 'Standard Shift'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111] p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5">
                            <h3 className="font-black text-[10px] sm:text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 uppercase tracking-tight">
                                <Award size={12} className="text-indigo-600" /> Professional Overview
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-[8px] font-black text-indigo-600 uppercase mb-0.5 tracking-tighter">Total Exp.</p>
                                    <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tighter">{profile.experienceYears || 0} <span className="text-[8px] font-bold text-gray-400 uppercase">Yrs</span></p>
                                </div>
                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-0.5 tracking-tighter">Sync State</p>
                                    <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Active</p>
                                </div>
                            </div>
                            <div className="pt-1 space-y-1">
                                <h4 className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none">Rota Schedule</h4>
                                <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <CalendarIcon size={12} className="text-indigo-600" />
                                    <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 tracking-tighter">
                                        {profile.workingHours?.start || '09:00'} - {profile.workingHours?.end || '17:00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="font-black text-[10px] sm:text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 uppercase tracking-tight">
                            <Award size={12} className="text-indigo-600" /> Credentials Vault
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="md:col-span-1 space-y-1.5">
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-0.5">Registry Number</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {profile.qualificationDetails?.registrationNumber || 'NOT REGISTERED'}
                                    </p>
                                </div>
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-0.5">License Validity</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white tracking-tighter">
                                        {profile.qualificationDetails?.licenseValidityDate
                                            ? format(new Date(profile.qualificationDetails.licenseValidityDate), 'dd, MM, yyyy')
                                            : 'PENDING'}
                                    </p>
                                </div>
                                {profile.qualificationDetails?.qualifications && profile.qualificationDetails.qualifications.length > 0 && (
                                    <div className="pt-0.5">
                                        <p className="text-[7px] font-black text-gray-400 uppercase mb-1 tracking-tighter">Deg/Cert Matrix</p>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.qualificationDetails.qualifications.map((qual: string, idx: number) => (
                                                <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[8px] font-black rounded-md border border-indigo-100 dark:border-indigo-800/30 uppercase tracking-tighter">
                                                    {qual}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <CredentialsDocViewer documents={profile.documents} />
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-2 sm:p-3 text-white shadow-xl relative overflow-hidden">
                        <div className="relative flex flex-col md:flex-row gap-2 items-start">
                            <div className="flex-1 space-y-2.5 w-full">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                        <Landmark size={14} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black tracking-widest uppercase">Financial Payout Matrix</h3>
                                        <p className="text-slate-400 text-[7px] uppercase font-black tracking-tighter leading-none">Secure Institutional Registry</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">Account IDX</p>
                                        <p className="text-[10px] font-black tracking-widest leading-none">
                                            {profile.bankDetails?.accountNumber ? `****${profile.bankDetails.accountNumber.slice(-4)}` : 'VOID'}
                                        </p>
                                    </div>
                                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">IFSC Token</p>
                                        <p className="text-[9px] font-black uppercase leading-none">{profile.bankDetails?.ifscCode || 'VOID'}</p>
                                    </div>
                                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">PF Registry</p>
                                        <p className="text-[9px] font-black uppercase text-indigo-400 leading-none">{profile.pfNumber || 'VOID'}</p>
                                    </div>
                                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">Base Salary</p>
                                        <p className="text-[10px] font-black text-emerald-400 leading-none">₹{profile.baseSalary?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="font-black text-[10px] sm:text-xs text-gray-900 dark:text-white mb-2 flex items-center gap-1.5 uppercase tracking-tight">
                            <BookOpen size={12} className="text-indigo-600" /> Compliance Stream
                        </h3>
                        <StaffTrainingHistoryClient />
                    </div>
                </div>
            </div>
        </div>
    );
}
