'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Save, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
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

const formatAMPM = (time: string) => {
    if (!time) return "";
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) return time;
    const [hours, minutes] = time.split(':');
    let h = parseInt(hours);
    const m = minutes || "00";
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
};

function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>(initialAvailability || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddSlot = () => {
        setSlots([
            ...slots,
            {
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                startTime: '09:00 AM',
                endTime: '05:00 PM',
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
        setIsEditing(true); // Enable save button
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateDoctorAvailabilityAction(slots);
            if (result.success) {
                setIsEditing(false);
                // Toast or notification could go here
            } else {
                alert('Failed to save availability: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#111] p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={20} className="text-emerald-500" /> Availability
                </h3>
                <button
                    onClick={handleAddSlot}
                    className="w-full sm:w-auto text-[10px] sm:text-xs bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 font-black border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center gap-1 uppercase tracking-widest"
                >
                    <Plus size={14} /> Add Slot
                </button>
            </div>

            <div className="space-y-4">
                {slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-[10px] sm:text-xs bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        No availability slots configured.
                    </div>
                ) : (
                    slots.map((slot, index) => (
                        <div key={index} className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 space-y-3 sm:space-y-4 relative group">
                            <button
                                onClick={() => handleRemoveSlot(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 sm:opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                                title="Remove Slot"
                            >
                                <Trash2 size={16} />
                            </button>

                            {/* Days Selection */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 pr-8">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => handleDayToggle(index, day)}
                                        className={`px-2 py-1 text-[9px] sm:text-[10px] rounded-md transition-all ${slot.days.includes(day)
                                            ? 'bg-emerald-600 text-white font-black shadow-sm'
                                            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600'
                                            }`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            {/* Time Inputs */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Start Time</label>
                                    <input
                                        type="text"
                                        value={formatAMPM(slot.startTime)}
                                        onChange={(e) => handleChange(index, 'startTime', e.target.value)}
                                        className="w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="09:00 AM"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">End Time</label>
                                    <input
                                        type="text"
                                        value={formatAMPM(slot.endTime)}
                                        onChange={(e) => handleChange(index, 'endTime', e.target.value)}
                                        className="w-full text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="05:00 PM"
                                    />
                                </div>
                            </div>

                            {/* Break Time (Optional) */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase mb-1">Break Start</label>
                                        <input
                                            type="text"
                                            value={formatAMPM(slot.breakStart || '')}
                                            onChange={(e) => handleChange(index, 'breakStart', e.target.value)}
                                            className="w-full text-[10px] bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-600 dark:text-gray-400 focus:border-emerald-500 outline-none"
                                            placeholder="01:00 PM"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase mb-1">Break End</label>
                                        <input
                                            type="text"
                                            value={formatAMPM(slot.breakEnd || '')}
                                            onChange={(e) => handleChange(index, 'breakEnd', e.target.value)}
                                            className="w-full text-[10px] bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-600 dark:text-gray-400 focus:border-emerald-500 outline-none"
                                            placeholder="02:00 PM"
                                        />
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
                        className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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
        </div>
    );
}

export default React.memo(AvailabilityManager);
