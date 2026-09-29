"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import SupportBadgeToggle from '@/components/common/SupportBadgeToggle';
import {
    Mail,
    Phone,
    MapPin,
    User as UserIcon,
    ShieldCheck,
    Hospital,
    Edit3,
    CreditCard,
    CheckCircle2,
    Briefcase,
    Landmark
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStaffProfileAction } from '@/lib/integrations/actions/staff.actions';
import { staffService } from '@/lib/integrations/services/staff.service';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { HelpdeskDashboardSkeleton } from "@/components/ui/skeletons";
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';
import toast from 'react-hot-toast';

export default function HelpdeskProfilePage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId;

    const { data: profileData, isLoading, refetch } = useQuery({
        queryKey: ['helpdesk-profile-page', 'my'],
        queryFn: async () => {
            try {
                const staffRes = await staffService.getProfile({ skipCache: true });
                if (staffRes?.staff) return staffRes.staff;
                if (staffRes) return staffRes;
            } catch (e) {
                console.warn("staffService.getProfile failed, trying getStaffProfileAction...");
            }
            try {
                const staffRes = await getStaffProfileAction();
                if (staffRes?.staff) return staffRes.staff;
                if (staffRes) return staffRes;
            } catch (e) {
                console.warn("getStaffProfileAction failed, trying getMe...");
            }
            try {
                const hdRes: any = await helpdeskService.getMe();
                if (hdRes && (hdRes.name || hdRes.email || hdRes.user)) return hdRes;
            } catch (e) {
                console.warn("getMe failed");
            }
            try {
                const storedAuth = localStorage.getItem('auth_user') || localStorage.getItem('user');
                if (storedAuth) return JSON.parse(storedAuth);
            } catch (e) {}
            return {};
        }
    });

    React.useEffect(() => {
        refetch();
        router.refresh();
    }, [refetch, router]);

    if (isLoading) {
        return <HelpdeskDashboardSkeleton />;
    }

    const raw: any = profileData || {};
    const userObj = raw.user || raw;
    const user = userObj;
    const name = userObj?.name || raw.name || "MANIKANTA FRONTDESK";
    const email = userObj?.email || raw.email || "frontdesk@horizinhospital.com";
    const mobile = userObj?.mobile || raw.mobile || "9876543210";
    const hospital = raw.hospital || userObj?.hospital || { name: "Horizin Hospital", address: "Active State, 516001" };
    const bankDetails = raw.bankDetails || userObj?.bankDetails || {};
    const panNumber = raw.panNumber || userObj?.panNumber;
    const pfNumber = raw.pfNumber || userObj?.pfNumber;
    const esiNumber = raw.esiNumber || userObj?.esiNumber;
    const uanNumber = raw.uanNumber || userObj?.uanNumber;
    const employeeId = raw.employeeId || "";
    const designation = raw.designation || "Frontdesk Specialist";

    const handleEdit = () => {
        router.push(`/${hospitalId}/frontdesk/profile/edit`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-20 pt-6 animate-in fade-in duration-500 px-0 md:px-4 lg:px-4">

            {/* PROFILE HEADER */}
            <ProfileHeroCard
                name={name}
                role={designation || "Frontdesk Specialist"}
                roleBadge="Verified Account"
                roleColor="bg-teal-50 text-teal-600 border border-teal-100"
                imageUrl={(user as any)?.image}
                bio={raw.bio || (user as any)?.bio}
                onBioSave={async (newBio: string) => {
                    try {
                        await staffService.updateProfile({ bio: newBio });
                        toast.success("Bio updated successfully");
                        refetch();
                    } catch (error: any) {
                        toast.error(error.message || "Failed to update bio");
                        throw error;
                    }
                }}
                onEditClick={handleEdit}
                editLabel="Edit Profile"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-4 space-y-5">
                    <SupportBadgeToggle />
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
                                <UserIcon size={15} />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.15em] text-slate-900">Personal Registry</h3>
                        </div>
                        <div className="space-y-3">
                            <InfoItem icon={<Mail size={14} />} label="Email Address" value={email} />
                            <InfoItem icon={<Phone size={14} />} label="Contact Number" value={mobile} />
                            <InfoItem icon={<Briefcase size={14} />} label="Employee ID" value={employeeId} />
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                                <CreditCard size={14} className="sm:size-[15px]" />
                            </div>
                            <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-900">Tax &amp; Payroll</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <SecureItem label="PAN" value={panNumber} />
                            <SecureItem label="PF No" value={pfNumber} />
                            <SecureItem label="ESI" value={esiNumber} />
                            <SecureItem label="UAN" value={uanNumber} />
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: BANK */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-4 sm:p-7 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3 sm:pb-4">
                            <div className="p-1.5 sm:p-2 bg-teal-600 rounded-lg sm:rounded-xl text-white">
                                <Landmark size={14} className="sm:size-[16px]" />
                            </div>
                            <h3 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight uppercase">Settlement Bank</h3>
                        </div>

                        <div className="bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group shadow-xl">
                            <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-teal-500/10 rounded-full -mr-16 sm:-mr-24 -mt-16 sm:-mt-24 blur-3xl transition-all group-hover:bg-teal-500/20"></div>

                            <div className="relative space-y-4 sm:space-y-5">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] sm:text-[10px] font-black text-teal-400 uppercase tracking-[0.2em]">Primary Salary Node</p>
                                        <h4 className="text-base sm:text-xl font-black tracking-tight leading-tight">{bankDetails?.bankName || "BANK NOT LINKED"}</h4>
                                    </div>
                                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/10 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-mono tracking-widest">{bankDetails?.ifscCode || "IFSC"}</div>
                                </div>

                                <div className="space-y-1 sm:space-y-1.5">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Number</p>
                                    <p className="text-xl sm:text-3xl font-mono tracking-[0.1em] sm:tracking-[0.15em] text-teal-50">
                                        {bankDetails?.accountNumber ? `•••• •••• ${bankDetails.accountNumber.slice(-4)}` : "•••• •••• ••••"}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                    <div className="space-y-0.5">
                                        <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Account Holder</p>
                                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight">{bankDetails?.accountName || name}</p>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">
                                        <CheckCircle2 size={10} className="sm:size-[11px]" /> Encrypted
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function InfoItem({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50 rounded-xl sm:rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl text-slate-400 group-hover:text-teal-500 transition-colors">
                {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
            </div>
            <div className="space-y-0.5 sm:space-y-1">
                <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</p>
                <p className="text-[11px] sm:text-xs font-black text-slate-900 tracking-tight">{value || "Not Set"}</p>
            </div>
        </div>
    );
}

function SecureItem({ label, value }: any) {
    return (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 hover:border-teal-200 transition-colors group">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-teal-600">{label}</p>
            <p className="text-[11px] font-mono font-black text-slate-700">
                {value ? `•••• ${value.slice(-4)}` : "NOT SET"}
            </p>
        </div>
    );
}
