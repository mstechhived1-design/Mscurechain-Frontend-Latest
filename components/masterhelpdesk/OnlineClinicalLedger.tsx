'use client';

import React from "react";
import { 
    Clock, 
    CheckCircle2, 
    Activity as ActivityIcon, 
    FileText, 
    Stethoscope, 
    Smartphone // Icon for Online
} from "lucide-react";
import { sanitizePatientName } from "@/lib/utils/name-utils";

interface OnlineClinicalLedgerProps {
    appointments: any[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: string) => void;
}

export const OnlineClinicalLedger = ({ appointments, isLoading, onUpdateStatus }: OnlineClinicalLedgerProps) => {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-teal-50 text-teal-700 border-teal-100';
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    if (isLoading) return <div className="p-20 text-center uppercase font-black text-slate-400 text-[10px] tracking-widest">Synchronizing Mobile Manifest...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-indigo-50/30 border-b border-indigo-100">
                        <th className="text-left p-6 text-[10px] font-black text-indigo-400   uppercase tracking-widest">Mobile Clinical Entity</th>
                        <th className="text-left p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest hidden md:table-cell">Consultant</th>
                        <th className="text-center p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mobile Schedule</th>
                        <th className="text-right p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Protocol Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {appointments.length > 0 ? appointments.map((apt, i) => (
                        <tr key={i} className="group hover:bg-indigo-50/20 transition-all">
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-100">
                                        {sanitizePatientName(apt.patientName || apt.patient?.name)[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black text-slate-900 uppercase">
                                                {sanitizePatientName(apt.patientName || apt.patient?.name)}
                                            </h4>
                                            <span className="bg-indigo-100 text-indigo-600 p-1 rounded-lg">
                                                <Smartphone size={10} />
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-indigo-100">
                                                MRN: {apt.mrn || "N/A"}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg tracking-wider font-mono">
                                                {apt.patientMobile || apt.patients?.mobile || apt.patient?.mobile || "No Mobile"}
                                            </span>
                                            {(apt.age && apt.age !== "--") && (
                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg uppercase">
                                                    {apt.age}Y
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Stethoscope size={14} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-900 uppercase">
                                        {apt.doctorName || "UNASSIGNED"}
                                    </p>
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <span className="text-[10px] font-black text-slate-900 uppercase block">
                                    {apt.date ? new Date(apt.date).toLocaleDateString() : "N/A"}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                                    <Clock size={10} /> {apt.startTime || "No Slot"}
                                </span>
                            </td>
                            <td className="p-6 text-right">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(apt.status || 'pending')}`}>
                                    {apt.status === 'confirmed' ? <CheckCircle2 size={12} /> : <ActivityIcon size={12} />}
                                    {apt.status || "Booked"}
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={4} className="p-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">No Mobile Engagements Found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
