"use client";

import React, { useState, useEffect } from "react";
import {
    Pill,
    AlertCircle,
    Save,
    ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";

const PharmacySettingsPage = () => {
    const [wardTypes, setWardTypes] = useState<string[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [enabledWards, setEnabledWards] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [expandedWards, setExpandedWards] = useState<string[]>([]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (wardTypes.length > 0) {
            setExpandedWards(wardTypes);
        }
    }, [wardTypes]);

    const fetchMetadata = async () => {
        try {
            setLoading(true);
            const response = await hospitalAdminService.getHospitalMetadata({ skipCache: true });
            if (response.success && response.data) {
                console.log("[DEBUG] Pharmacy Settings Data Received:", {
                    wardTypes: response.data.wardTypes,
                    roomsCount: response.data.rooms?.length,
                    firstRoom: response.data.rooms?.[0]
                });
                setWardTypes(response.data.wardTypes || []);
                setRooms(response.data.rooms || []);
                setEnabledWards(response.data.ipdPharmaSettings?.enabledWards || []);
            }
        } catch (error) {
            toast.error("Failed to load pharmacy settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSubmitting(true);
            await hospitalAdminService.updateIPDPharmaSettings({
                enabledWards: enabledWards,
            });
            toast.success("Pharmacy settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleWard = (ward: string) => {
        if (enabledWards.includes(ward)) {
            setEnabledWards(enabledWards.filter(w => w !== ward));
        } else {
            setEnabledWards([...enabledWards, ward]);
        }
    };

    const toggleExpansion = (ward: string) => {
        setExpandedWards(prev =>
            prev.includes(ward) ? prev.filter(w => w !== ward) : [...prev, ward]
        );
    };

    return (
        <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Ultra-Compact Dynamic Header */}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-white p-2 md:p-3 rounded-2xl border border-gray-100 shadow-sm shrink-0 mt-4 md:mt-6 mb-4 md:mb-6">
                
                {/* 1. Icon + Title */}
                <div className="flex items-center gap-2 pr-2 md:pr-4 border-r border-slate-100 shrink-0">
                    <div className="p-1 md:p-1.5 bg-blue-50 rounded-lg text-blue-600">
                        <Pill className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-[11px] md:text-sm font-bold text-gray-900 leading-none uppercase">
                            IPD Settings
                        </h1>
                    </div>
                </div>

                {/* 2. Subtitle */}
                <div className="hidden md:block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    Enable or disable pharmacy billing for specific wards
                </div>

                {/* 3. Actions */}
                <div className="flex items-center gap-2 ml-auto shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Authorize Changes
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-4">
                    <div className="w-12 h-12 border-4 border-primary-theme/10 border-t-primary-theme rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                        Configuring Pharmacy...
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {/* Ward Configuration Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                        <div className="px-2 md:px-6 md:px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-primary-theme">
                                    <ShieldCheck size={18} />
                                    Billing Permissions
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Configure by ward or specific room</p>
                            </div>
                        </div>

                        <div className="p-2 md:p-4 md:p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {wardTypes.map((ward) => {
                                    const isWardEnabled = enabledWards.includes(ward);
                                    const wardRooms = rooms.filter(r =>
                                        r.type?.trim().toUpperCase() === ward.trim().toUpperCase()
                                    );
                                    const isExpanded = expandedWards.includes(ward);

                                    console.log(`[DEBUG] Ward "${ward}": isExpanded=${isExpanded}, roomsCount=${wardRooms.length}`);

                                    return (
                                        <div key={ward} className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/20">
                                            <div
                                                onClick={() => toggleExpansion(ward)}
                                                className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-all ${isWardEnabled ? 'bg-primary-theme/5' : 'bg-white'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm"
                                                    >
                                                        {isExpanded ? "-" : "+"}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[11px] font-black uppercase tracking-widest ${isWardEnabled ? 'text-primary-theme' : 'text-slate-900'}`}>
                                                            {ward}
                                                        </p>
                                                        <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">
                                                            {isWardEnabled ? 'Ward Active' : 'Rooms Configuration'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleWard(ward);
                                                    }}
                                                    className={`px-4 py-1.5 rounded-lg border-2 font-black text-[9px] uppercase tracking-widest transition-all w-fit ${isWardEnabled
                                                        ? 'border-primary-theme bg-primary-theme text-white'
                                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {isWardEnabled ? 'Enabled' : 'Enable Ward'}
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-5 py-4 bg-white border-t border-slate-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                        {wardRooms.map(room => {
                                                            const isRoomEnabled = enabledWards.includes(room.label);
                                                            return (
                                                                <button
                                                                    key={room._id}
                                                                    disabled={isWardEnabled}
                                                                    onClick={() => {
                                                                        if (enabledWards.includes(room.label)) {
                                                                            setEnabledWards(enabledWards.filter(w => w !== room.label));
                                                                        } else {
                                                                            setEnabledWards([...enabledWards, room.label]);
                                                                        }
                                                                    }}
                                                                    className={`px-2 py-2 rounded-lg border-2 transition-all text-center flex flex-col items-center justify-center gap-0.5 ${isWardEnabled || isRoomEnabled
                                                                        ? 'border-primary-theme bg-primary-theme text-white shadow-sm'
                                                                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                                                        } ${isWardEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{room.label}</span>
                                                                    <span className="text-[6px] font-bold opacity-70 uppercase leading-none">{isWardEnabled || isRoomEnabled ? 'ON' : 'OFF'}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {wardRooms.length === 0 && (
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center py-2">No rooms</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {wardTypes.length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No wards defined in hospital meta</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-amber-50 border border-amber-100 p-3 md:p-6 rounded-[2rem] flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Direct IPD Billing</h4>
                            <p className="text-[10px] font-bold text-amber-700 mt-1 uppercase tracking-tight leading-relaxed">
                                Enabling a ward or room allows direct charging to the IPD bill. If disabled, staff must use the Retail Flow for settled transactions.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacySettingsPage;
