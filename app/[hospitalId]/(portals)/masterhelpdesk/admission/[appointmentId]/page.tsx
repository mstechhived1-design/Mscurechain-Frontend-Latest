'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
    Activity,
    Thermometer,
    X,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    User,
    Shield,
    Smartphone
} from "lucide-react";
import { helpdeskService } from "@/lib/integrations";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ClinicalAdmissionPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params.hospitalId as string;
    const appointmentId = params.appointmentId as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [appointment, setAppointment] = useState<any>(null);

    const [vitals, setVitals] = useState<{
        height: string;
        weight: string;
        bp: string;
        pulse: string;
        spo2: string;
        temperature: string;
        glucose: string;
    }>({
        height: "",
        weight: "",
        bp: "",
        pulse: "",
        spo2: "",
        temperature: "",
        glucose: ""
    });
    const [symptoms, setSymptoms] = useState("");
    const [reason, setReason] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const fetchAppointment = useCallback(async () => {
        try {
            setLoading(true);
            const res = await helpdeskService.getAppointmentById(appointmentId);
            
            if (res) {
                // Determine normalized fields for display
                const apt = {
                    ...res,
                    patientName: res.patientName || res.patient?.name || "Unknown Patient",
                    mrn: res.mrn || res.patientProfile?.mrn || "N/A",
                    doctorName: res.doctorName || res.doctor?.user?.name || "Unassigned",
                    time: res.time || res.startTime || "N/A",
                    patientId: res.patientId || res.patient?._id
                };
                
                if (apt.status?.toUpperCase() === 'COMPLETED' || apt.status?.toUpperCase() === 'CANCELLED') {
                    toast.error(`Appointment is already ${apt.status}. Redirecting...`);
                    router.push(`/${hospitalId}/masterhelpdesk`);
                    return;
                }

                setAppointment(apt);

                // Pre-fill fields for editing if they exist
                // Unified Vitals Pre-fill (Merge Appointment + Profile)
                const aptVitals = res.vitals || {};
                const profVitals = res.patientProfile?.vitals || {};

                setVitals({
                    height: aptVitals.height || profVitals.height || "",
                    weight: aptVitals.weight || profVitals.weight || "",
                    bp: aptVitals.bp || aptVitals.bloodPressure || profVitals.bp || profVitals.bloodPressure || "",
                    pulse: aptVitals.pulse || aptVitals.pulseRate || profVitals.pulse || profVitals.pulseRate || "",
                    spo2: aptVitals.spo2 || aptVitals.spO2 || profVitals.spo2 || profVitals.spO2 || "",
                    temperature: aptVitals.temperature || aptVitals.temp || profVitals.temperature || profVitals.temp || "",
                    glucose: aptVitals.glucose || aptVitals.sugar || profVitals.glucose || profVitals.sugar || ""
                });
                
                if (res.symptoms) {
                    setSymptoms(Array.isArray(res.symptoms) ? res.symptoms.join(", ") : res.symptoms);
                } else if (res.notes) {
                    setSymptoms(res.notes);
                }

                setReason(res.reason || res.notes || "");

            } else {
                toast.error("Appointment not found");
                router.push(`/${hospitalId}/masterhelpdesk`);
            }
        } catch (err) {
            toast.error("Failed to load appointment details");
            router.push(`/${hospitalId}/masterhelpdesk`);
        } finally {
            setLoading(false);
        }
    }, [appointmentId, hospitalId, router]);

    useEffect(() => {
        fetchAppointment();
    }, [fetchAppointment]);

    const validateVitals = () => {
        const errors: Record<string, string> = {};
        
        // Height Validation
        if (vitals.height && (isNaN(Number(vitals.height)) || Number(vitals.height) < 20 || Number(vitals.height) > 300)) {
            errors.height = "Range: 20-300 cm";
        }

        // Weight Validation
        if (vitals.weight && (isNaN(Number(vitals.weight)) || Number(vitals.weight) < 1 || Number(vitals.weight) > 500)) {
            errors.weight = "Range: 1-500 kg";
        }

        // Blood Pressure Validation
        if (vitals.bp && !/^\d{2,3}\/\d{2,3}$/.test(vitals.bp)) {
            errors.bp = "Format: 120/80";
        }

        // Pulse Validation
        if (vitals.pulse && (isNaN(Number(vitals.pulse)) || Number(vitals.pulse) < 30 || Number(vitals.pulse) > 250)) {
            errors.pulse = "Range: 30-250 bpm";
        }

        // SpO2 Validation
        if (vitals.spo2 && (isNaN(Number(vitals.spo2)) || Number(vitals.spo2) < 50 || Number(vitals.spo2) > 100)) {
            errors.spo2 = "Range: 50-100%";
        }

        // Temperature Validation
        if (vitals.temperature && (isNaN(Number(vitals.temperature)) || Number(vitals.temperature) < 90 || Number(vitals.temperature) > 110)) {
            errors.temperature = "Range: 90-110°F";
        }
        
        // Glucose Validation (Optional)
        if (vitals.glucose && (isNaN(Number(vitals.glucose)) || Number(vitals.glucose) < 20 || Number(vitals.glucose) > 600)) {
            errors.glucose = "Invalid range";
        }
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateVitals()) {
            toast.error("Please correct the errors in the vitals section");
            return;
        }

        if (!symptoms.trim() || !reason.trim()) {
            toast.error("Symptoms and Reason for visit are mandatory");
            return;
        }

        try {
            setSubmitting(true);
            await helpdeskService.updateAppointmentStatus(appointmentId, {
                status: 'confirmed',
                vitals,
                symptoms,
                reason
            });

            toast.success("Patient Admission Successful");

            router.push(`/${hospitalId}/masterhelpdesk`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to complete admission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-teal-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bridging Clinical Records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 shadow-sm transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Clinical Admission <span className="text-[10px] bg-teal-600 text-white px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg">Active Session</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Patient: {appointment?.patientName || 'Loading...'} • MRN: {appointment?.mrn || 'PENDING'}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <Shield size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest tracking-tighter">Verified Registry Safeguard</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Summary Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-teal-600 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-xl">
                                <User size={32} />
                            </div>
                            <h3 className="font-black text-lg uppercase tracking-tight">{appointment?.patientName}</h3>
                            <p className="text-teal-100 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">{appointment?.mrn || 'MOBILE-PENDING'}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Provider</span>
                                <span className="text-[10px] font-black text-slate-900 uppercase">Dr. {appointment?.doctorName}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Schedule</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-900 leading-none">{appointment?.time}</p>
                                    <p className="text-[8px] font-bold text-slate-400 mt-1">{new Date(appointment?.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Status</span>
                                <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[8px] font-black rounded-lg border border-teal-100 uppercase tracking-widest">{appointment?.status}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Activity size={100} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 mb-2">Protocol Note</h4>
                            <p className="text-xs font-medium text-slate-300 leading-relaxed">
                                Please ensure all clinical vitals are accurately recorded. This data synchronizes directly with the Physician's dashboard for real-time monitoring.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Form */}
                <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
                        {/* Vitals Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 px-2">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                    <Thermometer size={16} className="text-rose-600" />
                                </div>
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Patient Vitals Inventory</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {[
                                    { label: 'Height', key: 'height', unit: 'cm', range: '20-300' },
                                    { label: 'Weight', key: 'weight', unit: 'kg', range: '1-500' },
                                    { label: 'Blood Pressure', key: 'bp', unit: 'mmHg', range: '120/80' },
                                    { label: 'Pulse', key: 'pulse', unit: 'bpm', range: '30-250' },
                                    { label: 'SpO2', key: 'spo2', unit: '%', range: '50-100' },
                                    { label: 'Temperature', key: 'temperature', unit: '°F', range: '90-110' },
                                    { label: 'Blood Sugar', key: 'glucose', unit: 'mg/dL', range: '70-200' }
                                ].map((field) => (
                                    <div key={field.key} className={`space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border transition-all group ${fieldErrors[field.key] ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 hover:bg-white hover:border-teal-200'}`}>
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                {field.label}
                                            </label>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{field.range}</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder={field.unit}
                                                className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-black text-slate-900 focus:ring-4 transition-all outline-none ${fieldErrors[field.key] ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' : 'border-slate-200 focus:ring-teal-500/10 focus:border-teal-500'}`}
                                                value={(vitals as any)[field.key] || ""}
                                                onBlur={() => validateVitals()}
                                                onChange={(e) => {
                                                    setVitals(prev => ({...prev, [field.key]: e.target.value}));
                                                    if (fieldErrors[field.key]) {
                                                        setFieldErrors(prev => {
                                                            const newErrs = {...prev};
                                                            delete newErrs[field.key];
                                                            return newErrs;
                                                        });
                                                    }
                                                }}
                                            />

                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                                {field.unit}
                                            </div>
                                        </div>
                                        {fieldErrors[field.key] && (
                                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-tight ml-1 animate-in slide-in-from-top-1">
                                                {fieldErrors[field.key]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6 pt-2">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 px-2">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Smartphone size={16} className="text-teal-600" />
                                </div>
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Clinical Narrative & Intent</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Presenting Clinical Symptoms</label>
                                    <textarea 
                                        required
                                        placeholder="Comma separated symptoms (e.g., Fever, Chest Pain, Cough)..."
                                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none min-h-[100px] resize-none"
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Administrative Reason for Visit</label>
                                    <textarea 
                                        required
                                        placeholder="Brief reason for this clinical interaction..."
                                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none min-h-[80px] resize-none"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between p-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Admission Record Manifest v3.1</p>
                        <div className="flex gap-4">
                            <button 
                                type="button"
                                onClick={() => router.back()}
                                className="px-8 py-3 rounded-2xl text-[11px] font-black text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
                            >
                                ABORT
                            </button>
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="bg-teal-600 px-12 py-3 rounded-2xl text-[11px] font-black text-white shadow-xl shadow-teal-500/30 hover:bg-teal-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : (
                                    <>
                                        <CheckCircle2 size={16} /> 
                                        {appointment?.status?.toLowerCase() === 'confirmed' ? 'UPDATE ADMISSION RECORD' : 'FINALIZE ADMISSION'}
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
