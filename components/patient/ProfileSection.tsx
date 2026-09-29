import React from 'react';
import { User, Phone, Activity, FileText, Droplets, Thermometer, Heart, Wind } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';
import ProfileHeroCard from '@/components/shared/ProfileHeroCard';
import toast from 'react-hot-toast';

interface ProfileSectionProps {
    profile: any;
    appointments: any[];
}

function ProfileSection({ profile, appointments }: ProfileSectionProps) {
    if (!profile) {
        return (
            <Card className="p-8 text-center border-dashed border-2">
                <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Profile credentials not found in vault</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 uppercase font-black text-[10px] tracking-widest">Authentication Required</p>
            </Card>
        );
    }

    // Extract vitals history from appointments
    const vitalsHistory = (appointments || [])
        .filter(app => app.vitals && (app.vitals.bloodPressure || app.vitals.bp || app.vitals.temperature || app.vitals.weight))
        .map(app => ({
            date: app.date,
            hospital: app.hospital?.name,
            vitals: app.vitals
        }));

    // Get latest vitals (either from profile or most recent appointment)
    const latestAppointmentVitals = vitalsHistory[0]?.vitals || {};
    const displayVitals = {
        height: latestAppointmentVitals.height || profile.height,
        weight: latestAppointmentVitals.weight || profile.weight,
        bloodPressure: latestAppointmentVitals.bloodPressure || latestAppointmentVitals.bp || profile.bloodPressure,
        temperature: latestAppointmentVitals.temperature || profile.temperature,
        pulse: latestAppointmentVitals.pulse || latestAppointmentVitals.pulseRate || profile.pulse,
        spO2: latestAppointmentVitals.spO2 || latestAppointmentVitals.spo2 || profile.spO2,
        glucose: latestAppointmentVitals.glucose || latestAppointmentVitals.sugar || profile.glucose || profile.sugar,
        glucoseType: latestAppointmentVitals.glucoseType || profile.glucoseType,
        bloodGroup: profile.bloodGroup
    };



    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 px-1">
                <div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        My <span className="text-blue-600">Profile</span>
                    </h2>
                    <p className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Identity & Vitals</p>
                </div>
            </div>

            <div id="profile-content" className="space-y-3 sm:space-y-4">
                <ProfileHeroCard
                    name={profile.user?.name || profile.name}
                    role="Patient Account"
                    roleBadge={`MRN: ${profile.mrn}`}
                    roleColor="bg-blue-100 text-blue-700"
                    imageUrl={profile.user?.image || profile.user?.avatar}
                    bio={profile.bio || profile.user?.bio}
                    onBioSave={async (newBio: string) => {
                        try {
                            const { patientService } = await import('@/lib/integrations/services/patient.service');
                            await patientService.updateProfile({ bio: newBio });
                            // Force update local UI state if necessary
                            profile.bio = newBio;
                            toast.success("Bio updated successfully");
                        } catch (error: any) {
                            toast.error(error.message || "Failed to update bio");
                            throw error;
                        }
                    }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {/* Identity Card */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600">
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Identity</h3>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            {[
                                { label: 'Name', value: profile.user?.name || profile.name },
                                { label: 'ID', value: profile.mrn, mono: true, color: 'text-blue-600' },
                                { label: 'Gender', value: profile.gender || '---' },
                                {
                                    label: 'Age',
                                    value: (() => {
                                        const dobRaw = profile.dateOfBirth || profile.dob;
                                        if (profile.age) return `${profile.age} Y`;
                                        if (dobRaw) {
                                            const dob = new Date(dobRaw);
                                            const today = new Date();
                                            let age = today.getFullYear() - dob.getFullYear();
                                            if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
                                            return `${age} Y`;
                                        }
                                        return '---';
                                    })()
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider ">{item.label}</span>
                                    <span className={`font-bold text-[10px] sm:text-xs uppercase ${item.mono ? 'font-mono' : ''} ${item.color || 'text-gray-900 dark:text-white'}`}>
                                        {item.value || '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-green-600">
                                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Contact</h3>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {[
                                { label: 'Mobile', value: profile.contactNumber || profile.user?.mobile || profile.mobile },
                                { label: 'Email', value: profile.user?.email || profile.email || profile.emergencyContactEmail || '---', lowercase: true },
                                { label: 'Address', value: profile.address || '---' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col gap-0.5 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider ">{item.label}</span>
                                    <span className={`font-bold text-xs sm:text-sm ${item.lowercase ? '' : 'uppercase'} text-gray-900 dark:text-white truncate`}>
                                        {item.value || '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vitals */}
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl flex items-center justify-center text-red-600">
                                <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className="font-black uppercase text-[8px] sm:text-[9px] tracking-widest text-gray-400">Vitals</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            {[
                                { label: 'Height', value: displayVitals.height, unit: 'cm' },
                                { label: 'Weight', value: displayVitals.weight, unit: 'kg' },
                                { label: 'Blood', value: displayVitals.bloodGroup, color: 'text-red-500' },
                                { label: 'Temp', value: displayVitals.temperature, unit: '°F' },
                                { label: 'BP', value: displayVitals.bloodPressure, unit: 'mmHg', color: 'text-blue-600' },
                                { label: 'Pulse', value: displayVitals.pulse, unit: 'bpm', color: 'text-green-600' },
                                { label: 'Glucose', value: displayVitals.glucose, unit: displayVitals.glucoseType ? `(${displayVitals.glucoseType})` : '', color: 'text-amber-600' }
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-white/5 p-1.5 sm:p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-0.5">{item.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-black text-[10px] sm:text-xs ${item.color || 'text-gray-900 dark:text-white'}`}>{item.value || '---'}</span>
                                        {item.unit && <span className="text-[7px] sm:text-[8px] text-gray-400 font-bold">{item.unit}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-5 sm:space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600">
                                < Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-gray-400">Conditions</h3>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {[
                                { label: 'Issues', value: profile.conditions || 'None' },
                                { label: 'Allergies', value: profile.allergies || 'None', color: 'text-red-500' },
                                { label: 'Meds', value: profile.medications || 'None' }
                            ].map((item, i) => (
                                <div key={i} className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{item.label}</span>
                                    <p className={`font-bold text-[11px] sm:text-xs uppercase leading-relaxed ${item.color || 'text-gray-700 dark:text-gray-300'}`}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-5 sm:space-y-6 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-purple-600">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-gray-400">History</h3>
                        </div>
                        <p className="font-bold text-[11px] sm:text-xs uppercase leading-relaxed text-gray-700 dark:text-gray-300 italic">
                            {profile.medicalHistory || 'No history recorded.'}
                        </p>
                    </div>
                </div>

                {/* Vitals Trend — only show if there is more than 1 reading to avoid duplicating the card above */}
                {vitalsHistory.length > 1 && (
                    <div className="space-y-3 sm:space-y-4 pt-2">
                        <div className="flex items-center gap-2 px-1">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                Vitals <span className="text-blue-600">History</span>
                            </h3>
                            <span className="text-[9px] font-black text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{vitalsHistory.length} readings</span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-white/5 uppercase font-black text-[8px] sm:text-[9px] tracking-widest text-gray-400">
                                            <th className="py-2.5 px-3 sm:px-5">Date</th>
                                            <th className="py-2.5 px-3 sm:px-5">Wt / Ht</th>
                                            <th className="py-2.5 px-3 sm:px-5">BP / Pulse</th>
                                            <th className="py-2.5 px-3 sm:px-5">Temp / SpO₂</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {vitalsHistory.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-white/5 text-[9px] sm:text-xs">
                                                <td className="py-2.5 sm:py-3 px-3 sm:px-5">
                                                    <p className="font-black text-gray-900 dark:text-white">
                                                        {format(new Date(item.date), 'MMM dd, yy')}
                                                    </p>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase truncate max-w-[70px] sm:max-w-none">{item.hospital || 'Vault'}</p>
                                                </td>
                                                <td className="py-2.5 sm:py-3 px-3 sm:px-5 font-bold text-gray-700 dark:text-gray-300">
                                                    {item.vitals.weight || '-'}kg / {item.vitals.height || '-'}cm
                                                </td>
                                                <td className="py-2.5 sm:py-3 px-3 sm:px-5">
                                                    <span className="font-bold text-blue-600">{item.vitals.bloodPressure || item.vitals.bp || '-'}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{item.vitals.pulse || item.vitals.pulseRate || '-'}bpm</span>
                                                </td>
                                                <td className="py-2.5 sm:py-3 px-3 sm:px-5 font-bold text-gray-700 dark:text-gray-300">
                                                    {item.vitals.temperature || '-'}°F / {item.vitals.spO2 || item.vitals.spo2 || '-'}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(ProfileSection);
