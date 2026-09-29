import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, FileText, ChevronRight, X, CheckCircle2, Building2, Stethoscope, Info, Shield } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';
import { formatDoctorName } from '@/lib/utils/name-utils';

interface Appointment {
    _id: string;
    appointmentId: string;
    date: string | { $date: string };
    appointmentTime?: string;
    status: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string;
        specialties?: string[];
        department?: string;
    };
    hospital: {
        name: string;
        address?: string;
    };
    reason?: string;
    symptoms?: string[];
    type?: string;
    notes?: string;
    mrn?: string;
    urgency?: string;
    vitals?: {
        bloodPressure?: string;
        temperature?: string;
        pulse?: string;
        spO2?: string;
        height?: string;
        weight?: string;
        glucose?: string;
    };
    patientDetails?: {
        age?: string;
        gender?: string;
        duration?: string;
    };
    payment?: {
        amount?: number;
        paymentMethod?: string;
        paymentStatus?: string;
    };
    amount?: number;
    paymentStatus?: string;
    followUpStatus?: {
        eligible?: boolean;
        visitCount?: number;
        doctorVisitCount?: number;
        rangeDays?: number;
        expiryDate?: string | Date;
        enableExpiry?: boolean;
        message?: string;
    };
}

interface AppointmentsSectionProps {
    appointments: Appointment[];
    patientName?: string;
    patientEmail?: string;
    hospitals?: any[];
}

function AppointmentsSection({
    appointments,
    patientName = 'Valued Patient',
    patientEmail = '',
    hospitals = []
}: AppointmentsSectionProps) {
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const toggleExpansion = (id: string) => {
        setExpandedIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        const colors: Record<string, string> = {
            'booked': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            'confirmed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            'completed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        };
        return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    };

    if (!appointments || appointments.length === 0) {
        return (
            <Card className="p-8 text-center border-dashed bg-gray-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Calendar className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No Visit History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">Your upcoming and past hospital visits will appear here.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Clinical <span className="text-blue-600">Visits</span>
                    </h2>
                    <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5 sm:mt-0.5">Appointment Schedule & History</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {appointments.map((appointment) => {
                    const isExpanded = expandedIds[appointment._id];
                    const appointmentDate = typeof appointment.date === 'string' ? new Date(appointment.date) : new Date((appointment.date as any).$date || appointment.date);

                    return (
                        <div
                            key={appointment._id}
                            className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all group overflow-hidden ${isExpanded ? 'ring-1 ring-blue-500/20' : ''}`}
                        >
                            <div
                                onClick={() => toggleExpansion(appointment._id)}
                                className="flex flex-row items-center gap-3 sm:gap-6 cursor-pointer"
                            >
                                {/* Date Chip */}
                                <div className="flex-none flex flex-col items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-2xl shrink-0">
                                    <span className="text-[7px] sm:text-xs font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5 sm:mb-1">
                                        {format(appointmentDate, 'MMM')}
                                    </span>
                                    <span className="text-sm sm:text-2xl font-black text-gray-950 dark:text-white leading-none">
                                        {format(appointmentDate, 'dd')}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                                        <div className="space-y-0 text-left min-w-0">
                                            <h3 className="font-black text-gray-950 dark:text-white text-[11px] sm:text-base uppercase tracking-tight">
                                                {formatDoctorName(appointment.doctor?.user?.name || appointment.doctor?.name || 'Medical Specialist')}
                                            </h3>
                                            <p className="text-[7px] sm:text-[10px] font-black uppercase text-blue-600 tracking-widest ">
                                                {appointment.doctor?.specialties?.[0] || appointment.doctor?.department || 'Authorized Physician'}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest shrink-0 ${getStatusColor(appointment.status)}`}>
                                            {appointment.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 sm:gap-6 pt-1 sm:pt-2 border-t border-gray-50 dark:border-white/5">
                                        <div className="flex items-center gap-1.5 ">
                                            <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                            <p className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase ">{appointment.appointmentTime || 'TBD'}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                                            <p className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">{appointment.hospital?.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Toggle Button */}
                                <div className="shrink-0">
                                    <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-white/5 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                        <ChevronRight className={`w-3 h-3 sm:w-5 sm:h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                            </div>

                            {/* EXPANDED SECTION - Inline */}
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                                            <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Appt ID</p>
                                            <p className="text-[9px] sm:text-[10px] font-black text-gray-800 dark:text-gray-200 break-all">{appointment.appointmentId}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                                            <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">MRN Number</p>
                                            <p className="text-[9px] sm:text-[10px] font-black text-gray-800 dark:text-gray-200 ">{appointment.mrn || 'N/A'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                                            <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Case Type</p>
                                            <p className="text-[9px] sm:text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase">{appointment.type || 'Consultation'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                                            <p className="text-[6px] sm:text-[7px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Urgency</p>
                                            <p className={`text-[9px] sm:text-[10px] font-black uppercase ${appointment.urgency === 'urgent' ? 'text-red-500' : 'text-emerald-500'}`}>{appointment.urgency || 'Non-Urgent'}</p>
                                        </div>
                                    </div>

                                    {/* Patient Stats & Vitals */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <h4 className="text-[8px] font-black uppercase text-blue-600 tracking-widest px-1">Patient Vitals</h4>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { l: 'BP', v: appointment.vitals?.bloodPressure },
                                                    { l: 'Temp', v: appointment.vitals?.temperature, u: 'Â°F' },
                                                    { l: 'Pulse', v: appointment.vitals?.pulse, u: 'bpm' },
                                                    { l: 'SpO2', v: appointment.vitals?.spO2, u: '%' },
                                                    { l: 'Glucose', v: appointment.vitals?.glucose, u: 'mg/dl' },
                                                    { l: 'Weight', v: appointment.vitals?.weight, u: 'kg' }
                                                ].map((stat, i) => (
                                                    <div key={i} className="bg-gray-50 dark:bg-white/5 p-1.5 rounded-lg border border-gray-100/50 dark:border-white/5">
                                                        <p className="text-[6px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{stat.l}</p>
                                                        <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase truncate">
                                                            {stat.v || '--'} <span className="text-[6px] opacity-40 lowercase">{stat.v ? stat.u : ''}</span>
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-[8px] font-black uppercase text-emerald-600 tracking-widest px-1">Consultation Details</h4>
                                            <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-xl border border-gray-100/50 dark:border-white/5 space-y-2">
                                                <div className="flex flex-col gap-1 text-[9px] font-black uppercase">
                                                    <span className="text-gray-400">Clinical Reason</span>
                                                    <span className="text-gray-800 dark:text-gray-200 italic leading-tight break-words">"{appointment.reason || 'General Health Consultation'}"</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                    <span className="text-gray-400">Age / Gender</span>
                                                    <span className="text-gray-800 dark:text-gray-200">{appointment.patientDetails?.age || '--'} / {appointment.patientDetails?.gender || '--'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                    <span className="text-gray-400">Est. Duration</span>
                                                    <span className="text-gray-800 dark:text-gray-200">{appointment.patientDetails?.duration || '15 Min'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Follow-up Expiry Date */}
                                    {(() => {
                                        let hasExpiry = !!appointment.followUpStatus?.expiryDate;
                                        let expiryDate = appointment.followUpStatus?.expiryDate;
                                        let rangeDays = appointment.followUpStatus?.rangeDays;
                                        let eligible = appointment.followUpStatus?.eligible;
                                        
                                        // Dynamic calculation if hospital settings are available
                                        if (appointment.hospital && (appointment.hospital as any)._id) {
                                            const hosp = hospitals.find(h => h._id === (appointment.hospital as any)._id);
                                            if (hosp) {
                                                const isIPD = appointment.type?.toUpperCase().includes('IPD');
                                                rangeDays = isIPD ? hosp.ipdFollowUpDays : hosp.opdFollowUpDays;
                                                const enableExpiry = hosp.enableFollowUpExpiry ?? true;
                                                
                                                if (rangeDays !== undefined && rangeDays !== null && enableExpiry) {
                                                    const baseDate = new Date(appointmentDate);
                                                    const calcExpiryDate = new Date(baseDate);
                                                    calcExpiryDate.setDate(calcExpiryDate.getDate() + Number(rangeDays));
                                                    
                                                    expiryDate = calcExpiryDate;
                                                    hasExpiry = true;
                                                    
                                                    // Dynamic eligible check
                                                    const today = new Date();
                                                    eligible = today <= calcExpiryDate;
                                                }
                                            }
                                        }

                                        if (!hasExpiry || !expiryDate) return null;

                                        return (
                                            <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/30 rounded-xl p-2.5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600" />
                                                    <div>
                                                        <p className="text-[6px] sm:text-[8px] font-black text-teal-600 uppercase tracking-widest leading-none">Follow-up Valid Until</p>
                                                        <p className="text-[9px] sm:text-[11px] font-black text-teal-800 dark:text-teal-300 mt-0.5">
                                                            {new Date(expiryDate as string | Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[6px] sm:text-[8px] font-black text-teal-600 uppercase tracking-widest leading-none">Within {rangeDays || 0} Days</p>
                                                    <p className={`text-[8px] sm:text-[10px] font-black uppercase mt-0.5 ${eligible ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {eligible ? 'Eligible' : 'New Visit'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Payment Footer */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-emerald-500/10 p-1 rounded-lg">
                                                <CheckCircle2 size={10} className="text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Payment : {appointment.payment?.paymentMethod || 'CASH'}</p>
                                                <p className="text-[9px] font-black text-white uppercase mt-0.5">{appointment.payment?.paymentStatus || appointment.paymentStatus || 'PAID'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Consultation Fee</p>
                                            <p className="text-xs font-black text-emerald-400 uppercase">₹{appointment.payment?.amount || appointment.amount || '0'}</p>
                                        </div>
                                    </div>

                                    {appointment.notes && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 italic uppercase leading-relaxed">&ldquo;{appointment.notes}&rdquo;</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
}

export default React.memo(AppointmentsSection);

