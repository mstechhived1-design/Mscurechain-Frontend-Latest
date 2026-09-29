"use client";

import React, { useState, useEffect } from "react";
import {
    FileText,
    Plus,
    Trash2,
    CheckCircle2,
    X,
    AlertCircle,
    Eye,
    Settings2,
    Save,
    RotateCcw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";

const DEFAULT_NOTE_TYPES = [
    "Progress Note",
    "Nursing Assessment",
    "Medication Administration Note",
    "Post-Op Monitoring",
    "Incident",
    "Shift Handover",
];

const DEFAULT_VISIBILITIES = ["Nurse", "Doctor", "Admin"];

const VISIBILITY_LABELS: Record<string, string> = {
    Nurse: "Nurses Only",
    Doctor: "Doctors & Nurses",
    Admin: "All Staff",
};

const ClinicalNotesManagement = () => {
    const [noteTypes, setNoteTypes] = useState<string[]>([]);
    const [visibilities, setVisibilities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [newType, setNewType] = useState("");
    const [newVisibility, setNewVisibility] = useState("");

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            setLoading(true);
            const response = await hospitalAdminService.getHospitalMetadata({ skipCache: true });
            if (response.success && response.data) {
                setNoteTypes(response.data.clinicalNoteTypes || DEFAULT_NOTE_TYPES);
                setVisibilities(response.data.clinicalNoteVisibilities || DEFAULT_VISIBILITIES);
            }
        } catch (error) {
            toast.error("Failed to load clinical note settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSubmitting(true);
            await hospitalAdminService.updateClinicalNoteMetadata({
                types: noteTypes,
                visibilities: visibilities,
            });
            toast.success("Settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setNoteTypes(DEFAULT_NOTE_TYPES);
        setVisibilities(DEFAULT_VISIBILITIES);
        toast.success("Reset to system defaults (Unsaved)");
    };

    const addNoteType = () => {
        if (!newType.trim()) return;
        if (noteTypes.includes(newType.trim())) {
            toast.error("Type already exists");
            return;
        }
        setNoteTypes([...noteTypes, newType.trim()]);
        setNewType("");
    };

    const removeNoteType = (type: string) => {
        setNoteTypes(noteTypes.filter((t) => t !== type));
    };

    const addVisibility = () => {
        if (!newVisibility.trim()) return;
        if (visibilities.includes(newVisibility.trim())) {
            toast.error("Visibility option already exists");
            return;
        }
        setVisibilities([...visibilities, newVisibility.trim()]);
        setNewVisibility("");
    };

    const removeVisibility = (vis: string) => {
        setVisibilities(visibilities.filter((v) => v !== vis));
    };

    return (
        <div className="p-2 md:p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-10">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary-theme rounded-xl text-white shadow-lg shadow-blue-200">
                            <Settings2 size={24} />
                        </div>
                        CLINICAL NOTE SETTINGS
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] md:text-xs tracking-widest mt-1 uppercase opacity-70">
                        Customize note types and visibility parameters
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleReset}
                        className="w-full sm:w-auto px-3 md:px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <RotateCcw size={16} />
                        Reset Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 md:px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        Save Configuration
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-4">
                    <div className="w-12 h-12 border-4 border-primary-theme/10 border-t-primary-theme rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                        Configuring System...
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Note Types Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-2 md:p-6 md:p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-primary-theme">
                                    <FileText size={18} />
                                    Note Types
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Available categories for clinical documentation</p>
                            </div>
                        </div>

                        <div className="p-2 md:p-6 md:p-8 space-y-6 flex-1">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="E.G. SURGICAL SUMMARY"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === "Enter" && addNoteType()}
                                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary-theme outline-none transition-all placeholder:text-slate-300"
                                />
                                <button
                                    onClick={addNoteType}
                                    className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {noteTypes.map((type) => (
                                    <div
                                        key={type}
                                        className="group flex items-center justify-between p-2 md:p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-theme/30 hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-theme/10 group-hover:text-primary-theme transition-colors">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{type}</span>
                                        </div>
                                        <button
                                            onClick={() => removeNoteType(type)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Visibility Options Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-2 md:p-6 md:p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-emerald-600">
                                    <Eye size={18} />
                                    Visibility Scopes
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Control who can access these notes</p>
                            </div>
                        </div>

                        <div className="p-2 md:p-6 md:p-8 space-y-6 flex-1">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="E.G. PHYSIOTHERAPY ONLY"
                                    value={newVisibility}
                                    onChange={(e) => setNewVisibility(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addVisibility()}
                                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                />
                                <button
                                    onClick={addVisibility}
                                    className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {visibilities.map((vis) => (
                                    <div
                                        key={vis}
                                        className="group flex items-center justify-between p-2 md:p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{vis}</span>
                                                {VISIBILITY_LABELS[vis] && (
                                                    <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{VISIBILITY_LABELS[vis]}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeVisibility(vis)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-8 bg-blue-50 border border-blue-100 p-3 md:p-6 rounded-[2rem] flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Protocol Instructions</h4>
                    <p className="text-[10px] font-bold text-blue-700 mt-1 uppercase tracking-tight leading-relaxed">
                        Changes made here will immediately affect the options available to medical staff when creating clinical notes. Existing notes will retain their original categories but future filters will use these new definitions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClinicalNotesManagement;
