'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Navigation,
    Siren,
    X,
    MessageSquare,
    Check,
    RefreshCw,
    Building2,
    Loader2,
    Send,
} from 'lucide-react';
import { emergencyService } from '@/lib/integrations/services/emergency.service';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientProfile: any;
    availableHospitals?: any[];
}

const EMERGENCY_TYPES = [
    "Chest Pain", "Breathing Difficulty", "Severe Injury", "Unconsciousness",
    "High Fever", "Severe Bleeding", "Poisoning", "Other"
];

const SEVERITY_LEVELS = [
    { value: "critical", label: "Critical", color: "bg-red-600", bg: "bg-red-50" },
    { value: "high", label: "High", color: "bg-orange-500", bg: "bg-orange-50" },
    { value: "medium", label: "Medium", color: "bg-yellow-500", bg: "bg-yellow-50" },
    { value: "low", label: "Low", color: "bg-blue-500", bg: "bg-blue-50" }
];

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, patientProfile, availableHospitals = [] }) => {
    // 1. All State Hooks
    const [loading, setLoading] = useState(false);
    const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        emergencyType: '',
        description: '',
        severity: 'high' as "critical" | "high" | "medium" | "low",
        currentLocation: '',
    });
    const [isTracking, setIsTracking] = useState(false);
    const [activeRequest, setActiveRequest] = useState<any>(null);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // 2. All Effect Hooks (Must be before any conditional returns)
    React.useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [pollingInterval]);

    React.useEffect(() => {
        if (isOpen && availableHospitals.length > 0) {
            const primaryId = patientProfile?.hospital?._id || patientProfile?.hospital;
            if (primaryId) {
                setSelectedHospitalIds([primaryId.toString()]);
            } else if (availableHospitals.length > 0) {
                setSelectedHospitalIds(availableHospitals.map(h => h._id.toString()));
            }
        }
    }, [isOpen, availableHospitals, patientProfile]);

    // 3. Persistence & Resume Logic
    React.useEffect(() => {
        if (isOpen && !isTracking) {
            const savedId = localStorage.getItem('activeEmergencyRequestId');
            if (savedId) {
                setIsTracking(true);
                startPolling(savedId);
            }
        }
    }, [isOpen]);

    // 4. Real-time Socket Listener
    React.useEffect(() => {
        let isMounted = true;

        const initSocket = async () => {
            try {
                const { getSocket, subscribeToSocket } = await import('@/lib/integrations/api/socket');
                const userData = localStorage.getItem('user');
                if (!userData) return;

                const user = JSON.parse(userData);
                const currentUserId = user.id || user._id;

                if (currentUserId) {
                    await subscribeToSocket('emergency:update', (updatedReq: any) => {
                        console.log('📡 [SOCKET] Emergency Mission Flux Update:', updatedReq);
                        if (isMounted) {
                            setActiveRequest(updatedReq);
                            if (updatedReq.status === 'completed' || updatedReq.status === 'cancelled' || updatedReq.status === 'rejected') {
                                setPollingInterval((prev: any) => {
                                    if (prev) clearInterval(prev);
                                    return null;
                                });
                                if (updatedReq.status === 'completed' || updatedReq.status === 'cancelled') {
                                    localStorage.removeItem('activeEmergencyRequestId');
                                }
                            }
                        }
                    });
                }
            } catch (err) {
                console.error("Socket error in Emergency Tracker:", err);
            }
        };

        initSocket();

        return () => {
            isMounted = false;
        };
    }, []);

    if (!isOpen) return null;

    const toggleHospital = (id: string) => {
        setSelectedHospitalIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.emergencyType || !formData.description || !formData.currentLocation) {
            toast.error("Please fill all mandatory fields");
            return;
        }

        if (selectedHospitalIds.length === 0) {
            toast.error("Please select at least one hospital to alert");
            return;
        }

        try {
            setLoading(true);

            const response = await emergencyService.createPatientEmergencyRequest({
                ...formData,
                hospitalIds: selectedHospitalIds
            });

            if (response.request) {
                setActiveRequest(response.request);
                localStorage.setItem('activeEmergencyRequestId', response.request._id);
                setIsTracking(true);
                startPolling(response.request._id);
                toast.success("Life-Critical Signal Activated", {
                    icon: '🛰️',
                    className: 'font-black uppercase text-[10px] tracking-widest'
                });
            } else {
                onClose();
            }

        } catch (error: any) {
            toast.error(error.message || "Failed to send emergency request");
        } finally {
            setLoading(false);
        }
    };

    function startPolling(requestId: string) {
        if (pollingInterval) clearInterval(pollingInterval);

        const fetchStatus = async () => {
            try {
                const { request } = await emergencyService.getEmergencyRequestById(requestId);
                setActiveRequest(request);

                if (request.status === 'completed' || request.status === 'cancelled' || request.status === 'rejected') {
                    stopPolling();
                    if (request.status === 'completed' || request.status === 'cancelled') {
                        localStorage.removeItem('activeEmergencyRequestId');
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        };

        fetchStatus(); // Immediate first fetch
        const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
        setPollingInterval(interval);
    };

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    const handleClose = () => {
        // We don't stop polling or clear state here, so it can be resumed
        // However, we should stop UI polling if modal is closed to save resources,
        // so we'll stop polling but KEEEP the ID in localStorage.
        stopPolling();
        onClose();
    };

    const handleReset = () => {
        stopPolling();
        localStorage.removeItem('activeEmergencyRequestId');
        setIsTracking(false);
        setActiveRequest(null);
    };

    const acceptedCount = activeRequest?.requestedHospitals?.filter((h: any) => h.status === 'accepted').length || 0;
    const rejectedCount = activeRequest?.requestedHospitals?.filter((h: any) => h.status === 'rejected').length || 0;
    const pendingCount = activeRequest?.requestedHospitals?.filter((h: any) => h.status === 'pending').length || 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-red-600 p-3 sm:p-5 text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
                            <Siren size={80} />
                        </div>
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <h2 className="text-sm sm:text-lg font-black uppercase tracking-[0.15em] italic flex items-center gap-2 leading-none">
                                    <Activity size={18} className="animate-pulse" />
                                    {isTracking ? "Mission Flux" : "Emergency Alert"}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex flex-col">
                                        <p className="text-[7px] sm:text-[9px] font-bold text-red-100 uppercase tracking-widest leading-tight">
                                            {isTracking ? "Live Operation Intelligence" : "Instant Hub Response"}
                                        </p>
                                        {(isTracking || activeRequest) && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500 rounded text-[7px] font-black uppercase">
                                                    <Check size={8} /> {acceptedCount} Accepted
                                                </div>
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-800 rounded text-[7px] font-black uppercase">
                                                    <X size={8} /> {rejectedCount} Rejected
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isTracking && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setIsTracking(false)}
                                            className="p-1.5 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white transition-all group"
                                            title="Back to Form"
                                        >
                                            <MessageSquare size={14} />
                                        </button>
                                        <button
                                            onClick={handleReset}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all group"
                                            title="Reset Mission"
                                        >
                                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 sm:p-2 hover:bg-black/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {!isTracking ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            {localStorage.getItem('activeEmergencyRequestId') && (
                                <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <p className="text-[9px] font-black text-blue-700 uppercase tracking-tight italic">Active Signal Detected in Network</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const sid = localStorage.getItem('activeEmergencyRequestId');
                                            if (sid) {
                                                setIsTracking(true);
                                                startPolling(sid);
                                            }
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 shadow-sm flex items-center gap-1.5"
                                    >
                                        <Navigation size={10} /> View Response
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-3 sm:space-y-5 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Emergency Type */}
                                    <div className="space-y-1 sm:space-y-1.5">
                                        <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Emergency Type *</label>
                                        <select
                                            value={formData.emergencyType}
                                            onChange={(e) => setFormData(prev => ({ ...prev, emergencyType: e.target.value }))}
                                            className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-[11px] sm:text-sm transition-all"
                                            required
                                        >
                                            <option value="">Select Type</option>
                                            {EMERGENCY_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Severity */}
                                    <div className="space-y-1 sm:space-y-1.5">
                                        <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Severity Level</label>
                                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                            {SEVERITY_LEVELS.map(level => (
                                                <button
                                                    key={level.value}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, severity: level.value as any }))}
                                                    className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.severity === level.value
                                                        ? `${level.color} border-transparent text-white shadow-lg`
                                                        : `bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400`
                                                        }`}
                                                >
                                                    {level.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Current Location */}
                                <div className="space-y-1 sm:space-y-1.5">
                                    <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                        <Navigation size={8} className="text-red-500" /> Current Location *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.currentLocation}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                                        placeholder="Where are you?"
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-[11px] sm:text-sm transition-all"
                                        required
                                    />
                                </div>

                                {/* Hospital Selection */}
                                <div className="space-y-1 sm:space-y-2">
                                    <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                        <Building2 size={8} className="text-red-500" /> Alert Hospitals *
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 max-h-32 sm:max-h-40 overflow-y-auto pr-1 no-scrollbar border border-slate-100 dark:border-slate-800 p-2 rounded-xl italic">
                                        {availableHospitals.map((hospital) => {
                                            const isSelected = selectedHospitalIds.includes(hospital._id.toString());
                                            return (
                                                <button
                                                    key={hospital._id}
                                                    type="button"
                                                    onClick={() => toggleHospital(hospital._id.toString())}
                                                    className={`flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <Building2 size={12} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                                                        <span className="text-[9px] sm:text-[10px] font-bold uppercase truncate tracking-tight">{hospital.name}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="bg-blue-500 rounded-full p-0.5 shrink-0">
                                                            <Check size={8} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1 sm:space-y-1.5">
                                    <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                        <Activity size={8} className="text-red-500" /> Symptoms / Situation *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                        placeholder="Briefly explain..."
                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500 font-bold text-[11px] sm:text-sm transition-all resize-none italic"
                                        required
                                    />
                                </div>

                                {/* Submit */}
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[10px] sm:text-xs"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={16} /> : (
                                            <>
                                                <Send size={14} className="sm:w-[18px]" />
                                                ACTIVATE SIGNAL
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[7px] sm:text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest mt-3 sm:mt-4">
                                        Immediate alert will be sent to hospital helpdesk
                                    </p>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* TRACKING VIEW */
                        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            {/* Live Status Banner */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Signal Status</p>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2 leading-none">
                                            {activeRequest?.status === 'accepted' || acceptedCount > 0 ? (
                                                <span className="flex items-center gap-2 text-emerald-400">
                                                    <CheckCircle2 size={20} /> MISSION CONNECTED
                                                </span>
                                            ) : (activeRequest?.status === 'rejected' || (pendingCount === 0 && rejectedCount > 0)) ? (
                                                <span className="flex items-center gap-2 text-red-500">
                                                    <AlertCircle size={20} /> MISSION FAILED
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="animate-spin text-red-500" size={20} /> BROADCASTING...
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Accepted By</p>
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-2xl font-black text-white leading-none">{acceptedCount}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase mt-auto">Hospitals</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Response List */}
                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                    <Activity size={10} className="text-blue-500" /> Live Response Feed
                                </h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {activeRequest?.requestedHospitals?.map((rh: any, idx: number) => (
                                        <div
                                            key={rh.hospital._id || idx}
                                            className={`p-3 rounded-2xl border transition-all ${rh.status === 'accepted'
                                                ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
                                                : rh.status === 'rejected'
                                                    ? 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60'
                                                    : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${rh.status === 'accepted' ? 'bg-emerald-500' :
                                                        rh.status === 'rejected' ? 'bg-slate-300' : 'bg-amber-400'
                                                        }`}></div>
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{rh.hospital.name}</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${rh.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                    rh.status === 'rejected' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {rh.status}
                                                </span>
                                            </div>

                                            {rh.status === 'accepted' && activeRequest.notes && (
                                                <div className="mt-2 p-2 rounded-xl bg-white dark:bg-black/40 border border-emerald-100/50 dark:border-emerald-500/10 italic">
                                                    <p className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed uppercase tracking-tight">
                                                        &ldquo;{activeRequest.notes}&rdquo;
                                                    </p>
                                                </div>
                                            )}

                                            {rh.status === 'rejected' && rh.rejectionReason && (
                                                <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-1">
                                                    Reason: {rh.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Help Banner */}
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                                    <Navigation size={14} className="animate-pulse" />
                                </div>
                                <p className="text-[9px] font-bold text-blue-700 dark:text-blue-300 leading-tight uppercase">
                                    Stay calm. Medical dispatch is coordinating your rescue. Your location is being tracked.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                            >
                                EXIT TRACKING MODE
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
