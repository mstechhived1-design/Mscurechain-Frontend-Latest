import React from 'react';

export const dynamic = 'force-dynamic';

import {
    Mail, Phone, Award, MapPin,
    Calendar, Clipboard, Landmark, ShieldCheck, User as UserIcon
} from 'lucide-react';
import { getDoctorProfileAction } from '@/lib/integrations';
import { getDoctorCalendarStatsAction } from '@/lib/integrations/actions/calendar.actions';
import AvailabilityManager from '@/components/doctor/AvailabilityManager';

import ProfileHeader from '@/components/doctor/ProfileHeader';
import PrinterSettingsCard from '@/components/printers/PrinterSettingsCard';

export default async function DoctorProfilePage({ params }: { params: Promise<{ hospitalId: string }> }) {
    const { hospitalId } = await params;
    const [profileRes, calendarStatsRes] = await Promise.all([
        getDoctorProfileAction(),
        getDoctorCalendarStatsAction({ view: 'weekly' })
    ]);

    if (!profileRes.success || !profileRes.data) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Profile Missing</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        We couldn't fetch your profile details. This might be because your profile hasn't been set up yet.
                    </p>
                    <div className="pt-6">
                        <a href={`/${hospitalId}/doctor/profile/edit`} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl inline-block shadow-lg shadow-emerald-500/20">
                            Set Up Profile Now
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const profile = profileRes.data;
    const weeklyStatsRes = await getDoctorCalendarStatsAction({ view: 'weekly', startDate: new Date().toISOString() });
    const weeklyStats = weeklyStatsRes.success ? weeklyStatsRes.data : null;

    const doctorName = profile?.user?.name || profile?.name || 'Doctor';
    const doctorSpecialties = profile?.specialties || [];
    const doctorSpecialty = doctorSpecialties.length > 0 ? doctorSpecialties.join(', ') : 'Specialist';
    const doctorExperience = profile?.experience || 'N/A';
    const doctorEmail = profile?.user?.email || profile?.email || 'N/A';
    const doctorPhone = profile?.user?.mobile || profile?.mobile || profile?.phone || 'N/A';

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 sm:pb-32">

            <ProfileHeader
                profile={profile}
                doctorName={doctorName}
                doctorSpecialty={doctorSpecialty}
                doctorExperience={doctorExperience}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                {/* Left Column: Sidebar Details */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-[#111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 sm:space-y-5">
                        <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Contact & Base Info</h3>

                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl text-gray-400">
                                    <Mail size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Email Address</p>
                                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{doctorEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl text-gray-400">
                                    <Phone size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Phone Number</p>
                                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{doctorPhone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl text-gray-400">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Hospital Address</p>
                                    <p className="text-[11px] sm:text-sm font-bold text-gray-900 dark:text-white leading-relaxed">
                                        {profile?.hospital?.address || profile?.hospital?.name || 'Main Campus Center'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal & Account Details */}
                    <div className="bg-white dark:bg-[#111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 sm:space-y-5">
                        <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-400">Profile Metadata</h3>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</p>
                                <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white capitalize">{profile?.user?.gender || profile?.gender || 'N/A'}</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">DOB</p>
                                <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                                    {profile?.user?.dateOfBirth ? new Date(profile.user.dateOfBirth).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Registration Card */}
                    <div className="bg-white dark:bg-[#111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-500" /> License & Reg.
                            </h3>
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 text-[9px] sm:text-[10px] font-black rounded-lg">VERIFIED</span>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">NMC/SMC Reg No.</p>
                                <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">{profile?.medicalRegistrationNumber || 'Not Provided'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Registration Council</p>
                                <p className="text-[10px] sm:text-xs font-bold text-gray-500">{profile?.registrationCouncil || 'Medical Council'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 sm:pt-2">
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">Reg Year</p>
                                    <p className="text-[10px] sm:text-xs font-black">{profile?.registrationYear || 'N/A'}</p>
                                </div>
                                <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">Status</p>
                                    <p className={`text-[10px] sm:text-xs font-black ${profile?.registrationExpiryDate ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {profile?.registrationExpiryDate ? new Date(profile.registrationExpiryDate).toLocaleDateString() : 'Active'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {profile?.registrationCertificate && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-50 dark:border-gray-800">
                                <a
                                    href={profile.registrationCertificate}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-colors uppercase tracking-widest"
                                >
                                    <Clipboard size={14} /> Certificate
                                </a>
                            </div>
                        )}
                    </div>

                    <AvailabilityManager initialAvailability={profile?.availability} />
                    <PrinterSettingsCard />
                </div>

                {/* Right Column: Main Content */}
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                    {/* Professional Info Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Bio / About */}
                        <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                                <Award size={18} className="text-emerald-600" /> Bio
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-[11px] sm:text-sm leading-relaxed mb-4 sm:mb-6">
                                {profile?.bio || 'No professional biography added.'}
                            </p>

                            <div className="space-y-3 pt-3 sm:pt-4 border-t border-gray-50 dark:border-gray-800">
                                <h4 className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider">Expertise</h4>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {(doctorSpecialties.length > 0 ? doctorSpecialties : ['General Practice']).map((s: string) => (
                                        <span key={s} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-lg text-[10px] sm:text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Education & Employment */}
                        <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 sm:space-y-6">


                            <div>
                                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-2 sm:mb-3">Qualifications</h4>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {(profile?.qualifications || []).length > 0 ? (
                                        profile.qualifications.map((q: string) => (
                                            <span key={q} className="px-2.5 py-1 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] sm:text-xs font-bold border border-gray-100 dark:border-gray-800">
                                                {q}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-[10px] sm:text-xs text-gray-400 italic">None added.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial & Settlement Details */}
                    <div className="bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-emerald-500/10 rounded-full -mr-24 sm:-mr-32 -mt-24 sm:-mt-32 blur-3xl"></div>
                        
                        <div className="relative flex flex-col xl:flex-row gap-6 sm:gap-8 items-start">
                            <div className="flex-1 space-y-4 sm:space-y-6 w-full">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 sm:p-3 bg-emerald-500/20 rounded-xl sm:rounded-2xl">
                                        <Landmark size={20} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold">Bank Details</h3>
                                        <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">Securely stored for processing.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Account</p>
                                        <p className="text-[11px] sm:text-sm font-bold tracking-widest whitespace-nowrap">
                                            {profile?.bankDetails?.accountNumber ? `****${profile.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                                        </p>
                                        <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate">{profile?.bankDetails?.bankName || 'HDFC Bank'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IFSC</p>
                                        <p className="text-[11px] sm:text-sm font-bold truncate">{profile?.bankDetails?.ifscCode || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Salary</p>
                                        <p className="text-sm sm:text-base font-black text-emerald-400 tracking-tighter">₹{profile?.baseSalary?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full xl:w-56 bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/10 p-5 sm:p-6 space-y-3 sm:space-y-4">
                                <h4 className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest opacity-60">Identity</h4>
                                <div className="space-y-2 sm:space-y-3">
                                    <div>
                                        <p className="text-[8px] text-slate-500 uppercase font-black">Aadhar</p>
                                        <p className="text-[10px] sm:text-xs font-mono">{profile?.aadharNumber ? `****-${profile.aadharNumber.slice(-4)}` : 'Verified'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-slate-500 uppercase font-black">Emp ID</p>
                                        <p className="text-[10px] sm:text-xs font-mono">{profile?.employeeId || 'MD-1023'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Visualization */}
                    <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 sm:p-4">
                            <div className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-full text-[8px] sm:text-[10px] font-black uppercase">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                Live
                            </div>
                        </div>
                        <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-6 sm:mb-8">Scheduling Intelligence</h3>

                        {weeklyStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start sm:items-center">
                                {/* Weekly Totals Summary */}
                                <div className="md:col-span-4 space-y-3 sm:space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
                                        <span className="block text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{weeklyStats.weeklyTotals?.total || 0}</span>
                                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 block">Total Slots</span>
                                    </div>
                                    <div className="p-4 sm:p-5 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl text-white shadow-xl shadow-emerald-500/10">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Load</span>
                                            <span className="text-[10px] font-black">High</span>
                                        </div>
                                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-[70%]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Matrix View */}
                                <div className="md:col-span-8 overflow-x-auto pb-2">
                                    <div className="min-w-[400px]">
                                        <div className="flex justify-between items-end mb-4">
                                            <h4 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">7-Day Engagement</h4>
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Free
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Busy
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                                            {weeklyStats.days?.map((day: any, i: number) => (
                                                <div key={i} className="space-y-2 sm:space-y-3">
                                                    <div className="text-center">
                                                        <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase">{day.dayName.slice(0, 3)}</div>
                                                        <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-1">{new Date(day.date).getDate()}</div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1 sm:gap-1.5">
                                                        {weeklyStats.timeSlots.slice(0, 4).map((slot: string) => {
                                                            const slotData = day.slots[slot];
                                                            const color = !slotData ? 'bg-gray-100 dark:bg-gray-800' :
                                                                slotData.isFull ? 'bg-red-400' :
                                                                    slotData.isLeave ? 'bg-orange-300' :
                                                                        slotData.isBreak ? 'bg-gray-200' :
                                                                            'bg-emerald-400';
                                                            return <div key={slot} className={`h-6 sm:h-8 rounded-lg sm:rounded-xl w-full ${color} shadow-sm transition-transform hover:scale-105 cursor-help`} title={slot} />;
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400 italic text-xs">No analytics.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
