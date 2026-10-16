'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Clock, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ClockTimePicker from '@/components/ui/ClockTimePicker';
import { doctorService } from '@/lib/integrations/services/doctor.service';
import { updateDoctorAvailabilityAction } from '@/lib/integrations/actions/calendar.actions';

interface AvailabilitySlot {
    _id?: string;
    days: string[];
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
}

interface AvailabilityManagerProps {
    initialAvailability: AvailabilitySlot[];
}

const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

/**
 * Format 24-hour hour and minute into "hh:mm AM/PM"
 */
const formatH24ToAMPM = (h24: number, m: number): string => {
    const period = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const strH = String(h12).padStart(2, '0');
    const strM = String(m).padStart(2, '0');
    return `${strH}:${strM} ${period}`;
};

/**
 * Robust parser converting any time string (like "09:00 AM", "13:00", "2:00 P AAAM") into { hour24, minute }
 */
const parseTimeToH24 = (timeStr?: string): { hour24: number; minute: number } => {
    if (!timeStr) return { hour24: 9, minute: 0 };
    const cleaned = timeStr.trim().toUpperCase();
    const isPM = cleaned.includes('PM') || (cleaned.includes('P') && !cleaned.includes('AM'));
    const isAM = cleaned.includes('AM') || (cleaned.includes('A') && !isPM);

    const matches = cleaned.match(/\d+/g);
    if (!matches || matches.length === 0) return { hour24: 9, minute: 0 };

    let hours = parseInt(matches[0], 10) || 0;
    const minutes = matches.length > 1 ? parseInt(matches[1], 10) || 0 : 0;

    if (isPM && hours < 12) {
        hours += 12;
    } else if (isAM && hours === 12) {
        hours = 0;
    }
    return { hour24: Math.min(23, Math.max(0, hours)), minute: Math.min(59, Math.max(0, minutes)) };
};

/**
 * Formats time string into a clean AM/PM display
 */
const formatAMPM = (time?: string): string => {
    if (!time) return '';
    const { hour24, minute } = parseTimeToH24(time);
    return formatH24ToAMPM(hour24, minute);
};

function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>(initialAvailability || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Active field being edited via ClockTimePicker modal
    const [activePicker, setActivePicker] = useState<{
        slotIndex: number;
        field: 'startTime' | 'endTime' | 'breakStart' | 'breakEnd';
        label: string;
    } | null>(null);

    // Synchronize initial availability changes if passed asynchronously
    useEffect(() => {
        if (initialAvailability && Array.isArray(initialAvailability) && initialAvailability.length > 0) {
            setSlots(initialAvailability);
        }
    }, [initialAvailability]);

    const handleAddSlot = () => {
        setSlots([
            ...slots,
            {
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                startTime: '09:00 AM',
                endTime: '05:00 PM',
                breakStart: '01:00 PM',
                breakEnd: '02:00 PM',
            }
        ]);
        setIsEditing(true);
    };

    const handleRemoveSlot = (index: number) => {
        const newSlots = [...slots];
        newSlots.splice(index, 1);
        setSlots(newSlots);
        setIsEditing(true);
    };

    const handleChange = (index: number, field: keyof AvailabilitySlot, value: any) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
        setIsEditing(true);
    };

    const handleDayToggle = (slotIndex: number, day: string) => {
        const newSlots = [...slots];
        const currentDays = newSlots[slotIndex].days || [];
        if (currentDays.includes(day)) {
            newSlots[slotIndex].days = currentDays.filter(d => d !== day);
        } else {
            newSlots[slotIndex].days = [...currentDays, day];
        }
        setSlots(newSlots);
        setIsEditing(true);
    };

    // When time is picked and confirmed in ClockTimePicker modal
    const handleClockSave = (hour24: number, minute: number) => {
        if (!activePicker) return;
        const formatted = formatH24ToAMPM(hour24, minute);
        handleChange(activePicker.slotIndex, activePicker.field, formatted);
        setActivePicker(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Try client-side API call first (uses doctor's active session, token, and CSRF)
            try {
                const res = await doctorService.updateProfile({ availability: slots });
                if (res) {
                    setIsEditing(false);
                    toast.success('Availability slots saved successfully!');
                    return;
                }
            } catch (clientErr: any) {
                console.warn('doctorService.updateProfile direct call failed, trying server action...', clientErr);
            }

            // 2. Fallback to server action with multi-token support
            const result = await updateDoctorAvailabilityAction(slots);
            if (result.success) {
                setIsEditing(false);
                toast.success('Availability slots saved successfully!');
            } else {
                toast.error('Failed to save availability: ' + (result.error || 'Authentication required'));
            }
        } catch (error: any) {
            console.error('Save availability error:', error);
            toast.error(error.message || 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    // Get initial values for the active picker
    const currentActiveTime = activePicker && slots[activePicker.slotIndex]
        ? parseTimeToH24(slots[activePicker.slotIndex][activePicker.field])
        : { hour24: 9, minute: 0 };

    return (
        <div className="bg-white dark:bg-[#111] p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={20} className="text-emerald-500" /> Availability
                </h3>
                <button
                    onClick={handleAddSlot}
                    className="w-full sm:w-auto text-[10px] sm:text-xs bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 font-black border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center gap-1 uppercase tracking-widest cursor-pointer transition-colors"
                >
                    <Plus size={14} /> Add Slot
                </button>
            </div>

            <div className="space-y-4">
                {slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-[10px] sm:text-xs bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        No availability slots configured. Click &ldquo;+ Add Slot&rdquo; to add timings.
                    </div>
                ) : (
                    slots.map((slot, index) => (
                        <div key={index} className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 space-y-3 sm:space-y-4 relative group">
                            <button
                                onClick={() => handleRemoveSlot(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 sm:opacity-0 group-hover:opacity-100 p-1 transition-opacity cursor-pointer"
                                title="Remove Slot"
                            >
                                <Trash2 size={16} />
                            </button>

                            {/* Days Selection */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 pr-8">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleDayToggle(index, day)}
                                        className={`px-2 py-1 text-[9px] sm:text-[10px] rounded-md transition-all cursor-pointer ${slot.days.includes(day)
                                            ? 'bg-emerald-600 text-white font-black shadow-sm'
                                            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600'
                                            }`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            {/* Start Time & End Time Slots (Using ClockTimePicker Modal) */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        Start Time
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setActivePicker({ slotIndex: index, field: 'startTime', label: 'Start Time' })}
                                        className="w-full flex items-center justify-between text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg p-2.5 text-gray-900 dark:text-gray-100 transition-all cursor-pointer shadow-sm group/btn"
                                    >
                                        <span>{formatAMPM(slot.startTime) || 'Select Time'}</span>
                                        <Clock size={14} className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors" />
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        End Time
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setActivePicker({ slotIndex: index, field: 'endTime', label: 'End Time' })}
                                        className="w-full flex items-center justify-between text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg p-2.5 text-gray-900 dark:text-gray-100 transition-all cursor-pointer shadow-sm group/btn"
                                    >
                                        <span>{formatAMPM(slot.endTime) || 'Select Time'}</span>
                                        <Clock size={14} className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors" />
                                    </button>
                                </div>
                            </div>

                            {/* Break Time (Optional - Using ClockTimePicker Modal) */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase mb-1">
                                            Break Start
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setActivePicker({ slotIndex: index, field: 'breakStart', label: 'Break Start' })}
                                            className="w-full flex items-center justify-between text-[11px] font-semibold bg-white/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg p-2 text-gray-700 dark:text-gray-300 transition-all cursor-pointer group/btn"
                                        >
                                            <span>{formatAMPM(slot.breakStart) || '--:--'}</span>
                                            <Clock size={12} className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors" />
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase mb-1">
                                            Break End
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setActivePicker({ slotIndex: index, field: 'breakEnd', label: 'Break End' })}
                                            className="w-full flex items-center justify-between text-[11px] font-semibold bg-white/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg p-2 text-gray-700 dark:text-gray-300 transition-all cursor-pointer group/btn"
                                        >
                                            <span>{formatAMPM(slot.breakEnd) || '--:--'}</span>
                                            <Clock size={12} className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Action Footer */}
            {isEditing && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-[0.98]"
                    >
                        {isSaving ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={14} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Interactive Clock Time Picker Modal */}
            <ClockTimePicker
                isOpen={!!activePicker}
                initialHour24={currentActiveTime.hour24}
                initialMinute={currentActiveTime.minute}
                onSave={handleClockSave}
                onClose={() => setActivePicker(null)}
            />
        </div>
    );
}

export default React.memo(AvailabilityManager);
