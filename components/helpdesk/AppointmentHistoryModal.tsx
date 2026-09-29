import React from "react";
import { X, Calendar, Clock, Stethoscope, FileText, CheckCircle2, Trash2 } from "lucide-react";
import { sanitizePatientName } from "@/lib/utils/name-utils";

interface AppointmentHistoryModalProps {
    patientName: string;
    appointments: any[];
    onSelect: (appointment: any) => void;
    onDelete?: (appointmentId: string) => void;
    onClose: () => void;
    isLoading: boolean;
    doctorMap?: Record<string, string>; // Optional doctor map
}

export default function AppointmentHistoryModal({
    patientName,
    appointments,
    onSelect,
    onDelete,
    onClose,
    isLoading,
    doctorMap
}: AppointmentHistoryModalProps) {

    // Helper to resolve doctor name within the modal
    const getDoctorName = (apt: any) => {
        // 1. Check direct name property
        if (apt.doctor?.name) return apt.doctor.name;
        if (apt.doctorName) return apt.doctorName;

        // 2. Check if doctor is an object with ID or just a string ID
        const docId = apt.doctor?._id || apt.doctor?.id || (typeof apt.doctor === 'string' ? apt.doctor : null);

        // 3. Resolve using map if available
        if (docId && doctorMap && doctorMap[docId]) {
            return doctorMap[docId];
        }

        return "N/A";
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Select Appointment</h2>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                            To Generate Receipt for <span className="text-teal-600 font-bold">{sanitizePatientName(patientName)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <FileText size={20} />
                            </div>
                            <p className="text-sm font-semibold text-slate-500">No appointment history found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {appointments.map((apt) => {
                                const isIPD = apt.type === 'IPD' || apt.registrationType === 'IPD';
                                const date = new Date(apt.date).toLocaleDateString('en-GB', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                });
                                const doctorName = getDoctorName(apt);

                                return (
                                    <div
                                        key={apt._id || apt.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelect(apt)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onSelect(apt);
                                            }
                                        }}
                                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-500/30 hover:bg-teal-50/30 hover:shadow-md transition-all group text-left w-full bg-white sm:h-auto cursor-pointer"
                                    >
                                        {/* Date Box */}
                                        <div className="shrink-0 flex items-center justify-between sm:flex-col sm:justify-center gap-2 sm:gap-0 min-w-[80px] text-slate-500 border-b sm:border-b-0 pb-2 sm:pb-0 mb-2 sm:mb-0">
                                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                {apt.appointmentId?.split('-')?.[1] || 'ID'}
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                                                {date}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center w-full">
                                            {/* Doctor */}
                                            <div className="col-span-1">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                                    <Stethoscope size={9} /> Physican
                                                </div>
                                                <div className="text-xs font-bold text-slate-900 truncate">
                                                    {doctorName}
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="col-span-1">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                                    <Clock size={9} /> Time
                                                </div>
                                                <div className="text-xs font-bold text-slate-700">
                                                    {apt.time || apt.appointmentTime || apt.startTime || "N/A"}
                                                </div>
                                            </div>

                                            {/* Type */}
                                            <div className="col-span-1">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Type</div>
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider w-fit ${isIPD ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                                                    }`}>
                                                    {isIPD ? 'IPD ADMISSION' : 'OPD CONSULT'}
                                                </div>
                                            </div>

                                            {/* Payment */}
                                            <div className="col-span-1 text-left sm:text-right">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment</div>
                                                <div className="text-xs font-black text-slate-900">
                                                    ₹ {apt.payment?.amount || apt.amount || 0}
                                                </div>
                                                <div className="text-[9px] font-bold text-emerald-600 uppercase">
                                                    {apt.payment?.paymentStatus || apt.paymentStatus || 'Paid'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow/Delete */}
                                        <div className="flex items-center gap-2">
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(apt._id || apt.id);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Delete Appointment"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <div className="hidden sm:flex shrink-0 w-8 h-8 rounded-full bg-slate-50 items-center justify-center text-slate-300 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                                <CheckCircle2 size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1; 
        }
      `}} />
        </div>
    );
}
