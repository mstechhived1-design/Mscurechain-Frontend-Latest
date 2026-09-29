"use client";

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    AlertCircle,
    CheckCircle2,
    MessageSquare,
    User,
    Clock,
    ArrowRight,
    RefreshCw,
    Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { useAuthStore } from '@/stores/authStore';

const ClinicalAlertsPage = () => {
    const user = useAuthStore((state) => state.user);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if ((user as any)?._id) {
            fetchAlerts();
            const interval = setInterval(fetchAlerts, 30000); // Polling every 30s
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchAlerts = async () => {
        try {
            // Using doctorId filter if applicable
            const data = await ipdService.getActiveAlerts({
                hospitalId: user?.hospital,
                doctorId: user?.role === 'doctor' ? (user as any).doctorId : undefined
            });
            // data is expected to be an array based on backend response, but handle .data wrapper just in case
            setAlerts(Array.isArray(data) ? data : (data as any)?.data || []);
        } catch (error) {
            console.error("Alert Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (alertId: string, status: string) => {
        try {
            setProcessingId(alertId);
            const notes = prompt(`Enter notes for ${status}:`) || "";
            await ipdService.updateAlertStatus(alertId, {
                status,
                notes,
                userId: (user as any)?._id
            });
            toast.success(`Alert marked as ${status}`);
            fetchAlerts();
        } catch (error) {
            toast.error(`Failed to update alert`);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="text-rose-600" size={24} />
                        CLINICAL ALERTS MONITOR
                    </h1>
                    <p className="text-slate-500 font-bold text-sm tracking-widest mt-1 uppercase opacity-70">
                        Real-time Vitals Monitoring & Acknowledgement
                    </p>
                </div>

                <button
                    onClick={() => { setLoading(true); fetchAlerts(); }}
                    className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-teal-600 transition-all shadow-sm"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm gap-4">
                    <RefreshCw className="text-rose-600 animate-spin" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Critical Data...</p>
                </div>
            ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[40px] border border-slate-100 shadow-sm text-center">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-2">System Clear</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active clinical alerts detected</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {alerts.map((alert) => (
                        <div
                            key={alert._id}
                            className={`bg-white rounded-[32px] border ${alert.severity === 'Critical' ? 'border-rose-200' : 'border-slate-100'} p-1 relative overflow-hidden transition-all hover:shadow-xl group`}
                        >
                            {/* Visual Pulsing Indicator for Critical */}
                            {alert.severity === 'Critical' && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] rounded-full animate-pulse" />
                            )}

                            <div className="flex flex-col lg:flex-row lg:items-center">
                                {/* Patient Info Section */}
                                <div className={`p-6 lg:w-1/3 rounded-[28px] ${alert.severity === 'Critical' ? 'bg-rose-50' : 'bg-slate-50'} flex gap-4 items-start`}>
                                    <div className={`w-12 h-12 ${alert.severity === 'Critical' ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900'} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                                        <User size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-slate-900 uppercase truncate">
                                            {alert.patient?.name || "Unknown Patient"}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            MRN: {alert.patient?.mrn || "N/A"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500">
                                                ADM: {alert.admission?.admissionId || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Vital Data Section */}
                                <div className="p-8 flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 items-center">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observed Vital</p>
                                        <p className="text-sm font-black text-slate-900 uppercase">{alert.vitalName}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detected Value</p>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xl font-black ${alert.severity === 'Critical' ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>
                                                {alert.value}
                                            </span>
                                            <ArrowRight size={14} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400">(Limit: {alert.thresholdValue})</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 hidden md:block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impact Status</p>
                                        <div className={`flex items-center gap-2 text-xs font-black uppercase ${alert.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                                            <AlertCircle size={14} />
                                            {alert.severity} Condition
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="p-6 lg:p-8 shrink-0 flex items-center gap-3">
                                    <button
                                        onClick={() => handleUpdateStatus(alert._id, 'Acknowledged')}
                                        disabled={!!processingId}
                                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        <MessageSquare size={14} />
                                        Acknowledge
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(alert._id, 'Resolved')}
                                        disabled={!!processingId}
                                        className={`px-6 py-3 ${alert.severity === 'Critical' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-100'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50`}
                                    >
                                        <Check size={14} />
                                        Resolve
                                    </button>
                                </div>
                            </div>

                            {/* Timeline/Audit info footer */}
                            <div className={`px-8 py-3 ${alert.severity === 'Critical' ? 'bg-rose-600/5' : 'bg-slate-50'} flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400`}>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5"><Clock size={10} /> Triggered {new Date(alert.createdAt).toLocaleTimeString()}</span>
                                    {alert.auditLog?.length > 1 && (
                                        <span className="text-teal-600">LATEST: {alert.auditLog[alert.auditLog.length - 1].action}</span>
                                    )}
                                </div>
                                <span>Ref ID: #{alert._id.slice(-8).toUpperCase()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClinicalAlertsPage;
