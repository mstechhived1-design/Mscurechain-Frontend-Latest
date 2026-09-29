'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Layout, Home, Bed as BedIcon, FileText, ChevronDown } from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import { Bed } from '@/lib/integrations/types';
import toast from 'react-hot-toast';

interface TransferRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
    onSuccess: () => void;
}

export default function TransferRequestModal({ isOpen, onClose, admissionId, patientName, onSuccess }: TransferRequestModalProps) {
    const [loading, setLoading] = useState(false);
    const [metaLoading, setMetaLoading] = useState(false);

    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<Bed[]>([]);

    const [formData, setFormData] = useState({
        roomType: '',
        ward: '',
        room: '',
        bed: '',
        targetBedId: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchMeta();
        }
    }, [isOpen]);

    const fetchMeta = async () => {
        setMetaLoading(true);
        try {
            const [typesRes, wardsRes, roomsRes] = await Promise.all([
                ipdService.getUnitTypes().catch(() => []),
                ipdService.getIPDDepartments().catch(() => []),
                ipdService.getRooms().catch(() => [])
            ]);
            setUnitTypes(typesRes);
            setWards(wardsRes);
            setRooms(roomsRes);
        } catch (error) {
            console.error("Failed to fetch meta for transfer", error);
        } finally {
            setMetaLoading(false);
        }
    };

    // Fetch beds when room or ward changes
    useEffect(() => {
        if (!isOpen) return;
        const fetchAvailableBeds = async () => {
            if (!formData.room) {
                setBeds([]);
                return;
            }
            try {
                const availableBeds = await ipdService.getBeds({
                    status: 'Vacant',
                    type: formData.roomType || undefined,
                    room: formData.room || undefined
                });
                setBeds(availableBeds);
            } catch (error) {
                console.error("Failed to fetch beds", error);
            }
        };
        fetchAvailableBeds();
    }, [formData.roomType, formData.room, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await ipdService.requestTransfer(admissionId, formData);
            toast.success("Transfer request sent to frontdesk");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Failed to send transfer request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-6">
            <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shadow-inner">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Transfer Request</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{patientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                                <Layout size={12} className="text-amber-500" /> Room Type
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.roomType}
                                    onChange={e => setFormData(prev => ({ ...prev, roomType: e.target.value, room: '', bed: '', targetBedId: '' }))}
                                    className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold focus:border-amber-500 outline-none transition-all appearance-none uppercase tracking-tighter"
                                >
                                    <option value="">Select Type</option>
                                    {unitTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                                <Home size={12} className="text-amber-500" /> Target Room
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    disabled={!formData.roomType}
                                    value={formData.room}
                                    onChange={e => setFormData(prev => ({ ...prev, room: e.target.value, bed: '', targetBedId: '' }))}
                                    className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold focus:border-amber-500 outline-none transition-all appearance-none uppercase tracking-tighter disabled:opacity-50"
                                >
                                    <option value="">{formData.roomType ? "Select Room" : "Select Type First"}</option>
                                    {rooms
                                        .filter(r => String(r.type || '').toLowerCase() === String(formData.roomType || '').toLowerCase())
                                        .map(r => (
                                            <option key={r._id} value={r.label}>{r.label}</option>
                                        ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <BedIcon size={12} className="text-emerald-500" /> Available Beds
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            {!formData.room ? (
                                <div className="col-span-full py-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Room first</p>
                                </div>
                            ) : beds.length === 0 ? (
                                <div className="col-span-full py-8 text-center bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-dashed border-rose-200 dark:border-rose-900/20">
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">No vacant beds available</p>
                                </div>
                            ) : (
                                beds.map(bed => (
                                    <button
                                        key={bed._id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            bed: bed.bedId,
                                            targetBedId: bed._id
                                        }))}
                                        className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${formData.targetBedId === bed._id
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-4 ring-amber-500/10'
                                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'
                                            }`}
                                    >
                                        <span className={`text-[10px] font-black tracking-tighter ${formData.targetBedId === bed._id ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{bed.bedId}</span>
                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{bed.type}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <FileText size={12} className="text-teal-500" /> Clinical Reason / Notes
                        </label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Specify reason for transfer or special requirements..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold focus:border-amber-500 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.targetBedId}
                            className="flex-[1.5] px-6 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <ArrowRightLeft size={16} strokeWidth={3} />
                                    Send Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
