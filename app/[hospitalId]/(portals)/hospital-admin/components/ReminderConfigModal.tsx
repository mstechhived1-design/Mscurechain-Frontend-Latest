"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Clock, Calendar, Save, BellRing } from "lucide-react";
import { Card, Button } from "@/components/admin";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import toast from "react-hot-toast";

interface ReminderConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReminderConfigModal({ isOpen, onClose }: ReminderConfigModalProps) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<any>({
        opdReminderSlots: [],
        ipdReminderDays: [],
        isActive: true
    });

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const data = await hospitalAdminService.getReminderConfig();
            setConfig(data);
        } catch (error) {
            // Defaults will be handled by backend or initialized here
            toast.error("Using default settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Sanitize data before sending
            const sanitizedConfig = {
                ...config,
                opdReminderSlots: config.opdReminderSlots
                    .filter((s: any) => s.hour !== "" && s.minute !== "")
                    .map((s: any) => ({ hour: Number(s.hour), minute: Number(s.minute) })),
                ipdReminderDays: config.ipdReminderDays
                    .filter((d: any) => d !== "")
                    .map((d: any) => Number(d))
            };

            await hospitalAdminService.updateReminderConfig(sanitizedConfig);
            toast.success("Reminder settings updated");
            onClose();
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    const addOpdSlot = () => {
        setConfig({
            ...config,
            opdReminderSlots: [...config.opdReminderSlots, { hour: 9, minute: 0 }]
        });
    };

    const removeOpdSlot = (index: number) => {
        setConfig({
            ...config,
            opdReminderSlots: config.opdReminderSlots.filter((_: any, i: number) => i !== index)
        });
    };

    const updateOpdSlot = (index: number, field: string, value: string) => {
        const newSlots = [...config.opdReminderSlots];
        // Allow empty string to let user clear the input
        const numValue = value === "" ? "" : parseInt(value);
        newSlots[index] = { ...newSlots[index], [field]: numValue };
        setConfig({ ...config, opdReminderSlots: newSlots });
    };

    const addIpdDay = () => {
        setConfig({
            ...config,
            ipdReminderDays: [...config.ipdReminderDays, 1]
        });
    };

    const removeIpdDay = (index: number) => {
        setConfig({
            ...config,
            ipdReminderDays: config.ipdReminderDays.filter((_: any, i: number) => i !== index)
        });
    };

    const updateIpdDay = (index: number, value: string) => {
        const newDays = [...config.ipdReminderDays];
        // Allow empty string to let user clear the input
        newDays[index] = value === "" ? "" : parseInt(value);
        setConfig({ ...config, ipdReminderDays: newDays });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 md:p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-2 md:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
                            <BellRing size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Reminder Configuration</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated Follow-up Scheduler</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-3 md:p-8 overflow-y-auto space-y-8">
                    {/* OPD Reminders */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="text-emerald-500" size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">OPD Follow-up Slots</h3>
                            </div>
                            <Button
                                onClick={addOpdSlot}
                                className="bg-blue-50 text-white hover:bg-blue-60 border-none px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Plus size={14} strokeWidth={3} /> Add Slot
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                            Set specific times of the day when reminders will be sent (on the day before the visit).
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {config.opdReminderSlots.map((slot: any, index: number) => (
                                <div key={index} className="flex items-center gap-3 p-2 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hour (24h)</label>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max="23"
                                                value={slot.hour ?? ""}
                                                onChange={(e) => updateOpdSlot(index, 'hour', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Minute</label>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max="59"
                                                value={slot.minute ?? ""}
                                                onChange={(e) => updateOpdSlot(index, 'minute', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeOpdSlot(index)}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {config.opdReminderSlots.length === 0 && (
                                <div className="sm:col-span-2 py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                                    <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No slots configured</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* IPD Reminders */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="text-blue-500" size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">IPD Follow-up Days</h3>
                            </div>
                            <Button
                                onClick={addIpdDay}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Plus size={14} strokeWidth={3} /> Add Day
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                            Configure how many days before the follow-up visit a reminder should be sent.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {config.ipdReminderDays.map((day: number, index: number) => (
                                <div key={index} className="flex items-center gap-3 p-2 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Days Before Visit</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max="10"
                                            value={day ?? ""}
                                            onChange={(e) => updateIpdDay(index, e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeIpdDay(index)}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {config.ipdReminderDays.length === 0 && (
                                <div className="sm:col-span-2 py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                                    <Calendar size={24} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No days configured</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-2 md:p-6 border-t border-slate-50 flex justify-end gap-3 bg-slate-50/30">
                    <Button
                        onClick={onClose}
                        className="border border-slate-200 text-slate-600 px-3 md:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-slate-900 text-white hover:bg-slate-800 px-4 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
                    >
                        {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                        Save Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}
