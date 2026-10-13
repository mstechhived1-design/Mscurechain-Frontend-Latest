"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Plus,
    Trash2,
    Clock,
    Calendar,
    Save,
    BellRing,
    MessageSquare,
    CheckCircle2,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/admin";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import ClockTimePicker from "@/components/ui/ClockTimePicker";
import toast from "react-hot-toast";

interface ReminderConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OpdSlot {
    hour: number;
    minute: number;
    isEnabled?: boolean;
}

// Sleek modern toggle switch matching Screenshot 3
function Switch({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                checked ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-slate-200"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

export default function ReminderConfigModal({ isOpen, onClose }: ReminderConfigModalProps) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<{
        opdReminderSlots: OpdSlot[];
        ipdReminderDays: number[];
        isActive: boolean;
        enablePortalReminders: boolean;
        enableWhatsAppReminders: boolean;
    }>({
        opdReminderSlots: [],
        ipdReminderDays: [],
        isActive: true,
        enablePortalReminders: true,
        enableWhatsAppReminders: true,
    });

    // Track which slot index is currently being edited with ClockTimePicker
    const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const data = await hospitalAdminService.getReminderConfig();
            if (data) {
                setConfig({
                    opdReminderSlots: Array.isArray(data.opdReminderSlots)
                        ? data.opdReminderSlots.map((s: any) => ({
                              hour: Number(s.hour ?? 9),
                              minute: Number(s.minute ?? 0),
                              isEnabled: s.isEnabled !== false,
                          }))
                        : [],
                    ipdReminderDays: Array.isArray(data.ipdReminderDays)
                        ? data.ipdReminderDays.map((d: any) => Number(d))
                        : [],
                    isActive: data.isActive !== false,
                    enablePortalReminders: data.enablePortalReminders !== false,
                    enableWhatsAppReminders: data.enableWhatsAppReminders !== false,
                });
            }
        } catch (error) {
            toast.error("Using default reminder configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Sanitize payload
            const sanitizedConfig = {
                isActive: config.isActive !== false,
                enablePortalReminders: config.enablePortalReminders !== false,
                enableWhatsAppReminders: config.enableWhatsAppReminders !== false,
                opdReminderSlots: config.opdReminderSlots.map((s) => ({
                    hour: Number(s.hour),
                    minute: Number(s.minute),
                    isEnabled: s.isEnabled !== false,
                })),
                ipdReminderDays: config.ipdReminderDays
                    .filter((d) => d !== undefined && d !== null && !isNaN(Number(d)))
                    .map((d) => Number(d)),
            };

            await hospitalAdminService.updateReminderConfig(sanitizedConfig);
            toast.success("Reminder configuration saved successfully");
            onClose();
        } catch (error) {
            toast.error("Failed to save reminder configuration");
        } finally {
            setLoading(false);
        }
    };

    // Helper: format 24-hour time to 12-hour AM/PM string
    const format12Hour = (hour24: number, minute: number) => {
        const period = hour24 >= 12 ? "PM" : "AM";
        const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const mStr = String(minute).padStart(2, "0");
        const hStr = String(h12).padStart(2, "0");
        return `${hStr}:${mStr} ${period}`;
    };

    // Slot controls
    const addOpdSlot = () => {
        setConfig((prev) => ({
            ...prev,
            opdReminderSlots: [
                ...prev.opdReminderSlots,
                { hour: 9, minute: 0, isEnabled: true },
            ],
        }));
    };

    const removeOpdSlot = (index: number) => {
        setConfig((prev) => ({
            ...prev,
            opdReminderSlots: prev.opdReminderSlots.filter((_, i) => i !== index),
        }));
    };

    const toggleOpdSlot = (index: number) => {
        setConfig((prev) => {
            const next = [...prev.opdReminderSlots];
            next[index] = {
                ...next[index],
                isEnabled: !next[index].isEnabled,
            };
            return { ...prev, opdReminderSlots: next };
        });
    };

    const handleTimePickerSave = (hour24: number, minute: number) => {
        if (editingSlotIndex === null) return;
        setConfig((prev) => {
            const next = [...prev.opdReminderSlots];
            next[editingSlotIndex] = {
                ...next[editingSlotIndex],
                hour: hour24,
                minute: minute,
            };
            return { ...prev, opdReminderSlots: next };
        });
        setEditingSlotIndex(null);
    };

    // IPD Days controls
    const addIpdDay = () => {
        setConfig((prev) => ({
            ...prev,
            ipdReminderDays: [...prev.ipdReminderDays, 1],
        }));
    };

    const removeIpdDay = (index: number) => {
        setConfig((prev) => ({
            ...prev,
            ipdReminderDays: prev.ipdReminderDays.filter((_, i) => i !== index),
        }));
    };

    const updateIpdDay = (index: number, val: string) => {
        const num = val === "" ? 0 : parseInt(val, 10);
        setConfig((prev) => {
            const next = [...prev.ipdReminderDays];
            next[index] = isNaN(num) ? 0 : num;
            return { ...prev, ipdReminderDays: next };
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
                    {/* Header matching Screenshot 3 style */}
                    <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/20">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-emerald-100/80 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <MessageSquare size={22} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    Reminder & Automations
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                                        IST Based
                                    </span>
                                </h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Configure follow-up slots, patient portal & WhatsApp schedules
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-4 md:p-6 overflow-y-auto space-y-6">
                        {/* Channel Automation Toggles Card */}
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3.5">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-emerald-500" />
                                Delivery Channels & Line-Wise Queue
                            </div>

                            {/* Portal In-App Toggle */}
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <BellRing size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-800">
                                            Patient Portal In-App Reminders
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            Display follow-up visit notifications on patient dashboard
                                        </div>
                                    </div>
                                </div>
                                <Switch
                                    checked={config.enablePortalReminders}
                                    onChange={(val) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            enablePortalReminders: val,
                                        }))
                                    }
                                />
                            </div>

                            {/* WhatsApp Channel Toggle */}
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-800">
                                            Patient WhatsApp Reminders
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            Send automated WhatsApp messages line-by-line (new visits only)
                                        </div>
                                    </div>
                                </div>
                                <Switch
                                    checked={config.enableWhatsAppReminders}
                                    onChange={(val) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            enableWhatsAppReminders: val,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        {/* OPD Follow-Up Slots Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="text-emerald-500" size={18} strokeWidth={2.5} />
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        OPD Follow-Up Slots (IST Schedule)
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addOpdSlot}
                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-all"
                                >
                                    <Plus size={14} strokeWidth={3} /> Add Slot
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Messages are dispatched sequentially line-by-line (not in bulk) on the day before the visit. Click the clock pill to adjust time.
                            </p>

                            {/* Slots List */}
                            <div className="space-y-2.5">
                                {config.opdReminderSlots.map((slot, index) => {
                                    const timeLabel = format12Hour(slot.hour, slot.minute);
                                    const isSlotActive = slot.isEnabled !== false;

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                                                isSlotActive
                                                    ? "bg-white border-slate-200/80 shadow-sm"
                                                    : "bg-slate-50/70 border-slate-200/50 opacity-60"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-slate-800">
                                                        Slot {index + 1}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {isSlotActive ? "Active In Queue" : "Paused"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* 12-Hour Clickable Time Button matching Screenshot 3 */}
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSlotIndex(index)}
                                                    className="bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                                                >
                                                    <Clock size={14} className="text-emerald-600 stroke-[2.5]" />
                                                    <span>{timeLabel}</span>
                                                </button>

                                                {/* Individual Slot Line-Wise Toggle Switch */}
                                                <div className="flex items-center gap-1.5">
                                                    <Switch
                                                        checked={isSlotActive}
                                                        onChange={() => toggleOpdSlot(index)}
                                                    />
                                                </div>

                                                {/* Trash Icon */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeOpdSlot(index)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Slot"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {config.opdReminderSlots.length === 0 && (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
                                        <Clock size={28} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            No OPD Slots Configured
                                        </p>
                                        <button
                                            type="button"
                                            onClick={addOpdSlot}
                                            className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
                                        >
                                            + Add your first follow-up time slot
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* IPD Follow-Up Days Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="text-blue-500" size={18} strokeWidth={2.5} />
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        IPD Follow-Up Days
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addIpdDay}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-all"
                                >
                                    <Plus size={14} strokeWidth={3} /> Add Day
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Days before scheduled visit to notify IPD discharge patients.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {config.ipdReminderDays.map((day, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                Days Before:
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={30}
                                                value={day}
                                                onChange={(e) => updateIpdDay(index, e.target.value)}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-slate-800 text-center outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeIpdDay(index)}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                {config.ipdReminderDays.length === 0 && (
                                    <div className="sm:col-span-2 py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            No IPD days configured
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-4 md:p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/40">
                        <Button
                            onClick={onClose}
                            className="border border-slate-200 text-slate-600 hover:bg-slate-100 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </Button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Save & Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Interactive Circular Clock Time Picker matching Screenshot 3 */}
            {editingSlotIndex !== null && (
                <ClockTimePicker
                    isOpen={true}
                    initialHour24={config.opdReminderSlots[editingSlotIndex]?.hour ?? 9}
                    initialMinute={config.opdReminderSlots[editingSlotIndex]?.minute ?? 0}
                    onSave={handleTimePickerSave}
                    onClose={() => setEditingSlotIndex(null)}
                />
            )}
        </>
    );
}
