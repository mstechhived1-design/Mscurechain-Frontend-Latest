"use client";

import React, { useState, useMemo } from "react";
import { 
    Search, 
    RefreshCw, 
    Activity,
    Users,
    SearchX,
    Sunrise,
    Sunset,
    Moon,
    Trash2,
    AlertTriangle,
    IndianRupee,
    X,
    Clock,
    Sun,
    MonitorSmartphone,
    Building,
    Calendar
} from "lucide-react";
import { useMasterQueue, useMasterUpdateAppointmentStatus, useMasterDeleteAppointment } from "@/lib/integrations/hooks";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function MasterQueuePage() {
    const [search, setSearch] = useState("");
    const [isQueueActive, setIsQueueActive] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all'); // all, morning, afternoon, evening, night
    const [statusFilter, setStatusFilter] = useState('all'); // all, consulting, completed
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    const params = useParams() as any;
    const hospitalId = params.hospitalId as string;
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Fetch appointments for selected date
    const { data: appointmentsData, isLoading, isFetching, refetch } = useMasterQueue(
        1,
        500, // High limit for complete table
        undefined,
        hospitalId,
        selectedDate,
        selectedDate
    );

    const updateStatusMutation = useMasterUpdateAppointmentStatus();
    const deleteMutation = useMasterDeleteAppointment();
    const appointments = appointmentsData?.data || [];

    // Helper to check time range
    const isWithinTimeRange = (time: string, range: string) => {
        if (!time || range === 'all') return true;
        
        // Parse time which could be "09:00 AM" or "14:30"
        let hours = 0;
        if (time.includes('AM') || time.includes('PM')) {
            const [t, ampm] = time.split(' ');
            let [h] = t.split(':').map(Number);
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            hours = h;
        } else {
            hours = parseInt(time.split(':')[0]);
        }
        
        switch(range) {
            case 'morning': return hours >= 6 && hours < 12;
            case 'afternoon': return hours >= 12 && hours < 16;
            case 'evening': return hours >= 16 && hours < 20;
            case 'night': return hours >= 20 || hours < 6;
            default: return true;
        }
    };

    // Filter Logic
    const displayedList = useMemo(() => {
        if (!isQueueActive) return [];

        let list = [...appointments];

        // 1. Status Filtering
        list = list.filter((apt: any) => {
            const s = (apt.status || "").toLowerCase();
            if (statusFilter === 'consulting') {
                return s === 'in-progress';
            }
            if (statusFilter === 'completed') {
                return s === 'completed';
            }
            // By default (Active), show only pending/in-progress
            return s !== "completed" && s !== "cancelled";
        });

        // 2. Time Filtering
        if (timeFilter !== 'all') {
            list = list.filter((apt: any) => isWithinTimeRange(apt.startTime || apt.timeSlot || apt.appointmentTime || "", timeFilter));
        }

        // 3. Search Filtering
        if (search) {
            const s = search.toLowerCase();
            list = list.filter((apt: any) => 
                (apt.patient?.name || apt.patientName || "").toLowerCase().includes(s) || 
                (apt.mrn || "").toLowerCase().includes(s) ||
                (apt.doctorName || "").toLowerCase().includes(s)
            );
        }

        return list.sort((a: any, b: any) => {
            if (a.status === "in-progress" && b.status !== "in-progress") return -1;
            if (b.status === "in-progress" && a.status !== "in-progress") return 1;
            const timeA = a.startTime || a.timeSlot || a.appointmentTime || "00:00";
            const timeB = b.startTime || b.timeSlot || b.appointmentTime || "00:00";
            return timeA.localeCompare(timeB);
        });
    }, [appointments, search, isQueueActive, timeFilter, statusFilter]);

    // Analytics
    const consultingCount = appointments.filter((a: any) => a.status === 'in-progress').length;
    const completedCount = appointments.filter((a: any) => a.status === 'completed').length;

    const handleUpdateStatus = async (id: string, status: string, duration?: number) => {
        try {
            await updateStatusMutation.mutateAsync({ appointmentId: id, status, duration });
            toast.success(`Patient moved to ${status.toUpperCase()}`);
            refetch();
        } catch (err) {
            toast.error("Status update failed.");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMutation.mutateAsync(deleteId);
            toast.success("Appointment deleted successfully");
            setDeleteId(null);
            refetch();
        } catch (err) {
            toast.error("Failed to delete appointment");
        }
    };

    return (
        <div className="space-y-4 w-full px-0 min-h-[calc(100vh-6rem)] pb-10 animate-in fade-in duration-500">
            {/* Compact Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Queue Roster</h1>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Traffic Monitor</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                    {/* Metrics - More compact */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">Consulting</span>
                            <span className="text-sm font-black text-slate-800">{consultingCount}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-100" />
                        <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Done</span>
                            <span className="text-sm font-black text-slate-800">{completedCount}</span>
                        </div>
                    </div>

                    {/* Master Toggle */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[8px] font-black uppercase text-indigo-600">LIVE</span>
                        <button 
                            onClick={() => setIsQueueActive(!isQueueActive)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${isQueueActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${isQueueActive ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                    </div>

                    <button onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 shadow-sm transition-all active:scale-95">
                        <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Responsive Filter Toolbar */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row items-center gap-3">
                    <div className="relative group w-full lg:max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH PATIENT, MRN, DR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    
                    <div className="relative group w-full lg:w-52">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={14} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full pl-11 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 uppercase focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Time Filters - Compact */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All', icon: Clock },
                            { id: 'morning', label: 'Morning', icon: Sunrise },
                            { id: 'afternoon', label: 'Afternoon', icon: Sun

                             },
                            { id: 'evening', label: 'Evening', icon: Sunset },
                            { id: 'night', label: 'Night', icon: Moon },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTimeFilter(t.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeFilter === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <t.icon size={12} />
                                <span className="hidden sm:inline">{t.label}</span>
                                <span className="sm:hidden">{t.label === 'Morning' ? 'AM' : t.label === 'Afternoon' ? 'PM' : t.label.substring(0, 3)}</span>
                            </button>
                        ))}
                    </div>

                    {/* Status Filters - Compact */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        {[
                            { id: 'all', label: 'Active', color: 'indigo' },
                            { id: 'consulting', label: 'Consulting', color: 'amber' },
                            { id: 'completed', label: 'Done', color: 'emerald' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStatusFilter(s.id)}
                                className={`flex-1 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s.id ? `bg-${s.color}-600 text-white shadow-md` : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Profile</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell text-center">Age / Gender</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden lg:table-cell">Assigned Doctor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden xl:table-cell">Source</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Revenue</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedList.length > 0 ? (
                                displayedList.map((apt: any, idx: number) => (
                                    <QueueRow 
                                        key={apt._id || idx} 
                                        apt={apt} 
                                        onUpdateStatus={handleUpdateStatus} 
                                        onDelete={() => setDeleteId(apt._id)}
                                        isProcessing={updateStatusMutation.isPending || deleteMutation.isPending} 
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-32 text-center">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                                                <SearchX size={32} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">No Records Detected</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-relaxed">
                                                {!isQueueActive 
                                                    ? "Master queue is currently toggled OFF. Activate to view traffic." 
                                                    : "No active patient encounters match the selected filter parameters."
                                                }
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Compact Top-Center Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-[100] flex justify-center items-start pt-10 px-4 pointer-events-none animate-in fade-in duration-300">
                    <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-200 p-4 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-50 rounded-lg text-rose-500 shrink-0 border border-rose-100">
                                <AlertTriangle size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Confirm Delete</h4>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed mt-1">
                                    This will permanently remove the appointment and related transaction.
                                </p>
                                
                                <div className="flex items-center gap-2 mt-3">
                                    <button 
                                        onClick={handleDelete}
                                        disabled={deleteMutation.isPending}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[8px] uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        {deleteMutation.isPending ? "..." : "Delete"}
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(null)}
                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 border border-slate-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QueueRow({ apt, onUpdateStatus, onDelete, isProcessing }: { apt: any, onUpdateStatus: any, onDelete: any, isProcessing: boolean }) {
    const status = (apt.status || "").toLowerCase();
    const isConsulting = status === "in-progress";
    const patientName = (apt.patientName || apt.patient?.name || apt.patient?.user?.name || "").trim();
    
    const [elapsed, setElapsed] = React.useState(0);

    React.useEffect(() => {
        let interval: any;
        if (isConsulting && apt.consultationStartTime) {
            const start = new Date(apt.consultationStartTime).getTime();
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [isConsulting, apt.consultationStartTime]);

    const formatElapsed = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    
    let statusStyle = "bg-slate-100 text-slate-500 border-slate-200";
    if (status === "waiting" || status === "confirmed" || status === "booked") statusStyle = "bg-indigo-50 text-indigo-600 border-indigo-200";
    if (status === "in-progress") statusStyle = "bg-amber-50 text-amber-600 border-amber-200 animate-pulse shadow-sm shadow-amber-500/10";
    if (status === "completed") statusStyle = "bg-emerald-50 text-emerald-600 border-emerald-200";

    return (
        <tr className={`group transition-all duration-300 hover:bg-slate-50/80 ${isConsulting ? 'bg-amber-50/20' : ''}`}>
            <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-105 ${isConsulting ? 'bg-amber-500 ring-4 ring-amber-500/10' : 'bg-slate-900'}`}>
                        {patientName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{patientName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MRN: {apt.mrn || apt.patient?.mrn || "N/A"}</p>
                    </div>
                </div>
            </td>

            <td className="px-6 py-5 text-center hidden md:table-cell">
                <div className="flex flex-col items-center gap-1.5">
                    <span className="text-xs font-black text-slate-700">{apt.age || "--"} YRS</span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${apt.gender?.toLowerCase() === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                        {apt.gender || "--"}
                    </span>
                </div>
            </td>

            <td className="px-6 py-5 hidden lg:table-cell">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">DR. {apt.doctorName || "UNASSIGNED"}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{apt.department || "General"}</span>
                </div>
            </td>

            <td className="px-6 py-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                        <Clock size={14} />
                    </div>
                    <span className="text-[11px] font-black text-slate-700 tracking-wider">{apt.startTime || apt.timeSlot || "N/A"}</span>
                </div>
            </td>

            <td className="px-6 py-5 hidden xl:table-cell">
                {apt.isOnline !== false ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                        <MonitorSmartphone size={12} className="text-indigo-500" />
                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Online</span>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
                        <Building size={12} className="text-slate-500" />
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Walk-in</span>
                    </div>
                )}
            </td>

            <td className="px-6 py-5 text-center">
                <div className="inline-flex flex-col items-center">
                    <div className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                        <IndianRupee size={12} />
                        <span>{Math.round(apt.amount || 0).toLocaleString()}</span>
                    </div>
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">NET PAY</span>
                </div>
            </td>

            <td className="px-6 py-5 text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${statusStyle}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'completed' ? 'bg-emerald-500' : status === 'in-progress' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                    {status}
                </div>
            </td>

            <td className="px-6 py-5 text-right pr-8">
                <div className="flex justify-end gap-2">
                    {(status === "waiting" || status === "confirmed" || status === "booked") && (
                        <button 
                            onClick={() => onUpdateStatus(apt._id, "in-progress")}
                            disabled={isProcessing}
                            className="h-9 px-4 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.1em] hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            <Activity size={14} /> CONSULT
                        </button>
                    )}

                    {isConsulting && (
                        <button 
                            onClick={() => onUpdateStatus(apt._id, "completed", elapsed)}
                            disabled={isProcessing}
                            className="h-9 px-6 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.1em] hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Clock size={14} className="animate-pulse" /> {formatElapsed(elapsed)} - COMPLETE
                        </button>
                    )}

                    {(status === "completed" || status === "cancelled") && (
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pr-4">ARCHIVED</span>
                    )}

                    <button 
                        onClick={onDelete}
                        disabled={isProcessing}
                        className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
}