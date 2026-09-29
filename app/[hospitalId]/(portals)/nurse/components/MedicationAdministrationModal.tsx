'use client';

import React, { useEffect, useState } from 'react';
import { X, Pill, CheckCircle2, Clock, Calendar, AlertCircle, ChevronRight, Beaker, Coffee, Utensils, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { ipdService, hospitalAdminService } from '@/lib/integrations';
import { mapFrequency, isSlotRequired, formatFrequency, StandardFrequency, FoodTiming } from '@/lib/frequencyUtils';

interface MedicationAdministrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
    patientAge?: string;
    patientGender?: string;
    mrn?: string;
    onSuccess?: () => void;
}

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

export default function MedicationAdministrationModal({ isOpen, onClose, admissionId, patientName, patientAge, patientGender, mrn, onSuccess }: MedicationAdministrationModalProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [administeredToday, setAdministeredToday] = useState<any[]>([]);
    const [allHistory, setAllHistory] = useState<any[]>([]);
    const [labReports, setLabReports] = useState<any[]>([]);
    const [dietHistory, setDietHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'meds' | 'summary' | 'labs' | 'diet'>('meds');
    const [showHistory, setShowHistory] = useState(false);

    // Diet Form State
    const [dietItems, setDietItems] = useState<any[]>([{ name: '', quantity: '', calories: '' }]);
    const [dietForm, setDietForm] = useState({
        category: 'Morning',
        recordedDate: new Date().toISOString().split('T')[0],
        recordedTime: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
        notes: ''
    });

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchData();

            // Real-time updates via Socket.IO
            const handleSocketUpdate = (data: any) => {
                if (data.admissionId === admissionId) {
                    console.log('📡 [Nurse Portal] Real-time med update received:', data);
                    fetchData(true); // Silent refresh
                }
            };

            const initSocket = async () => {
                try {
                    const { subscribeToSocket, unsubscribeFromSocket } = await import('@/lib/integrations/api/socket');
                    subscribeToSocket('medication_administered', handleSocketUpdate);
                    subscribeToSocket('medication_undo', handleSocketUpdate);

                    return () => {
                        unsubscribeFromSocket('medication_administered', handleSocketUpdate);
                        unsubscribeFromSocket('medication_undo', handleSocketUpdate);
                    };
                } catch (e) {
                    console.warn('Socket subscription failed:', e);
                }
            };

            const cleanupPromise = initSocket();
            return () => {
                cleanupPromise.then(cleanup => cleanup?.());
            };
        }
    }, [isOpen, admissionId]);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [prescData, historyData, labData] = await Promise.all([
                ipdService.getPrescriptions(admissionId),
                ipdService.getClinicalHistory(admissionId),
                ipdService.getLabReports(admissionId).catch(() => [])
            ]);

            setPrescriptions(prescData);
            setLabReports(labData);
            setDietHistory(historyData.diet || []);

            // Filter administration records for today
            const historyMeds = historyData.meds || [];
            setAllHistory(historyMeds);

            const today = new Date().toDateString();
            const todayMeds = historyMeds.filter((m: any) =>
                new Date(m.timestamp).toDateString() === today
            );
            setAdministeredToday(todayMeds);
        } catch {
            toast.error("Failed to fetch patient data");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAdminister = async (prescId: string, med: any, slot: string) => {
        const key = `${prescId}-${med.name}-${slot}`;
        try {
            setSubmitting(key);
            const response = await ipdService.administerMedication({
                admissionId,
                prescriptionId: prescId,
                medicineId: med.productId || med.medicineId || med._id || med.name,
                drugName: med.name,
                dose: med.dosage || med.dose,
                route: 'Oral',
                timeSlot: slot,
                status: 'Administered'
            });
            toast.success(`${med.name} marked as administered for ${slot}`);
            await fetchData(true); // Silent refresh local state
            onSuccess?.(); // Background refresh parent
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Failed to mark administration");
        } finally {
            setSubmitting(null);
        }
    };

    const handleUndo = async (recordId: string, medName: string) => {
        try {
            setSubmitting(recordId);
            await ipdService.deleteMedicationRecord(recordId);
            toast.success(`Removed administration for ${medName}`);
            await fetchData(true);
            onSuccess?.();
        } catch {
            toast.error("Failed to remove record");
        } finally {
            setSubmitting(null);
        }
    };

    const handleLogDiet = async () => {
        const items = dietItems.filter(i => i.name?.trim() !== '');
        if (items.length === 0) {
            toast.error("Please enter at least one food item");
            return;
        }

        const formattedItems = items.map(i => ({
            name: i.name,
            quantity: i.quantity || undefined,
            calories: i.calories || undefined
        }));

        try {
            setSubmitting('diet-submit');
            await ipdService.logDiet({
                admissionId,
                items: formattedItems,
                ...dietForm
            });
            toast.success("Diet logged successfully");
            setDietItems([{ name: '', quantity: '', calories: '' }]);
            setDietForm({
                ...dietForm,
                notes: '',
                recordedTime: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            });
            await fetchData(true);
            onSuccess?.();
        } catch {
            toast.error("Failed to log diet");
        } finally {
            setSubmitting(null);
        }
    };

    const handleDeleteDiet = async (recordId: string) => {
        try {
            setSubmitting(recordId);
            await ipdService.deleteDietRecord(recordId);
            toast.success("Diet record removed");
            await fetchData(true);
            onSuccess?.();
        } catch {
            toast.error("Failed to remove record");
        } finally {
            setSubmitting(null);
        }
    };

    const getAdministrationData = (prescId: string, medName: string, slot: string) => {
        return administeredToday.find(m =>
            m.prescription === prescId &&
            m.drugName === medName &&
            m.timeSlot === slot
        );
    };

    const getFrequencySlots = (freq: any) => {
        const f = mapFrequency(freq);
        if (f.type === 'custom') return {};
        return {
            Morning: f.standard?.morning !== 'off',
            Afternoon: f.standard?.afternoon !== 'off',
            Evening: f.standard?.evening !== 'off',
            Night: f.standard?.night !== 'off'
        };
    };

    const getNextCustomDose = (med: any) => {
        const f = mapFrequency(med.frequency);
        if (f.type !== 'custom' || !f.custom?.interval) return null;

        const lastAdmin = allHistory
            .filter(h => h.drugName?.toLowerCase() === med.name?.toLowerCase())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        const baseTime = lastAdmin ? new Date(lastAdmin.timestamp) : new Date(prescriptions.find(p => p._id === med.prescId)?.createdAt || Date.now());
        const nextTime = new Date(baseTime.getTime() + f.custom.interval * 60 * 60 * 1000);

        return nextTime;
    };

    const calculateRemaining = (med: any) => {
        const total = parseInt(med.quantity) || 0;

        // If not pharma tracked, let it behave like an infinite OPD prescription
        if (!med.isPharmaTracked && !med.isPharmaOrder && total === 0) return null;

        const used = (med.consumedCount !== undefined)
            ? med.consumedCount
            : allHistory.filter(h =>
                h.drugName?.toLowerCase() === med.name?.toLowerCase() ||
                h.medicineId === (med.productId || med.medicineId)
            ).length;

        return Math.max(0, total - used);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* HEADER */}
                <div className="p-3 sm:p-5 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Pill size={16} className="text-amber-400 sm:size-5" />
                            <h2 className="text-sm sm:text-lg font-black uppercase tracking-tight leading-none">Medicine Log</h2>
                        </div>
                        <p className="text-[7px] sm:text-[9px] font-bold text-white/80 uppercase tracking-widest leading-none mt-1">
                            {patientName} {mrn ? `• ID: ${mrn}` : ''} {patientAge ? `• ${patientAge}` : ''} {patientGender ? `• ${patientGender}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all">
                        <X size={16} className="text-white sm:size-[18px]" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/50">
                    <div className="bg-amber-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 mb-3 sm:mb-4 border border-amber-100 flex items-start gap-2 sm:gap-3">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={12} />
                        <div>
                            <p className="text-[8px] sm:text-[10px] font-black text-amber-800 uppercase tracking-tight mb-0.5 leading-none">Nursing Protocol</p>
                            <p className="text-[7px] sm:text-[8px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-widest">
                                Verify dosage. NABH: Automated audit.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Loading Metadata...</p>
                        </div>
                    ) : showHistory ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Full Administration Log</h3>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                                >
                                    Back to Marking
                                </button>
                            </div>
                            {allHistory.length === 0 ? (
                                <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No previous administration records found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {allHistory.map((rec, rIdx) => (
                                        <div key={rec._id || rIdx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Clock size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{rec.drugName}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(rec.timestamp).toLocaleDateString()} at {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • {rec.timeSlot}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">{rec.status}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">By {rec.administeredBy?.name || 'Staff'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* TABS */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                <button
                                    onClick={() => setActiveTab('meds')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'meds' ? 'bg-white text-primary-theme shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Medications
                                </button>
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-white text-primary-theme shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setActiveTab('labs')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'labs' ? 'bg-white text-primary-theme shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Labs
                                </button>
                                <button
                                    onClick={() => setActiveTab('diet')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'diet' ? 'bg-white text-primary-theme shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Diet
                                </button>
                            </div>

                            {activeTab === 'meds' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {prescriptions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white rounded-[32px] border border-dashed border-slate-200">
                                            <Pill size={48} strokeWidth={1} />
                                            <p className="text-xs font-bold uppercase tracking-widest">No active IPD prescriptions</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 px-1 mb-2">
                                                <div className="w-0.5 h-3 bg-blue-500 rounded-full"></div>
                                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Active Medication Orders
                                                </h3>
                                            </div>
                                            {(() => {
                                                const medsMap = new Map();
                                                prescriptions.forEach(p => {
                                                    p.medicines?.forEach((m: any) => {
                                                        const key = `${m.name}-${m.dosage}`.toLowerCase();
                                                        const existing = medsMap.get(key);

                                                        // Priority: Pharma Order/Issuance > Standard Prescription
                                                        // This ensures we use the quantity/status from the actual pharmacy record if it exists
                                                        if (!existing || p.type === 'pharma-order' || p.type === 'pharma-issuance') {
                                                            medsMap.set(key, {
                                                                ...m,
                                                                prescId: p._id,
                                                                isPharmaOrder: p.type === 'pharma-order' || p.type === 'pharma-issuance',
                                                                sourceType: p.type,
                                                                paymentStatus: p.paymentStatus || 'paid',
                                                                orderStatus: p.orderStatus || 'completed'
                                                            });
                                                        }
                                                    });
                                                });
                                                const consolidated = Array.from(medsMap.values());

                                                return consolidated.map((med, idx) => {
                                                    const remaining = calculateRemaining(med);
                                                    const isFullyReturnedOrConsumed = (med.isPharmaTracked || med.isPharmaOrder) && remaining === 0;

                                                    // Don't show fully consumed/returned medicines at all per user request
                                                    if (isFullyReturnedOrConsumed) {
                                                        return null;
                                                    }

                                                    return (
                                                        <div key={`${med.name}-${med.dosage}-${idx}`} className={`bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 transition-all ${isFullyReturnedOrConsumed ? 'opacity-60' : 'hover:shadow-md'}`}>
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                                                <div className="flex items-center gap-2 sm:gap-4">
                                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-blue-50/50 flex items-center justify-center shrink-0">
                                                                        <Pill className="text-blue-400" size={16} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">{med.name}</h4>
                                                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{med.dosage} • {formatFrequency(med.frequency)}</p>
                                                                            {med.sourceType === 'pharma-issuance' && (
                                                                                <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border border-indigo-100">
                                                                                    Extra
                                                                                </span>
                                                                            )}
                                                                            {calculateRemaining(med) !== null && (
                                                                                <span className={`px-1 py-0.5 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border ${calculateRemaining(med) === 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                                                    {calculateRemaining(med)} Left
                                                                                </span>
                                                                            )}
                                                                            {med.isPharmaOrder ? (
                                                                                <span className={`px-1 py-0.5 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border ${med.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                                    {med.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                                                                </span>
                                                                            ) : med.status === 'return-pending' ? (
                                                                                <span className="px-1 py-0.5 bg-orange-50 text-orange-600 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border border-orange-200 animate-pulse">
                                                                                    Return Pending
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1 py-0.5 bg-slate-50 text-slate-500 rounded text-[6px] sm:text-[7px] font-black uppercase tracking-widest border border-slate-200">
                                                                                    OPD Presc
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {(() => {
                                                                        const f = mapFrequency(med.frequency);
                                                                        if (f.type === 'custom') {
                                                                            const nextDose = getNextCustomDose(med);
                                                                            const isDue = nextDose && nextDose <= new Date();
                                                                            const slot = 'Custom';
                                                                            const record = getAdministrationData(med.prescId, med.name, slot);
                                                                            const isSubmitting = submitting === `${med.prescId}-${med.name}-${slot}` || (record && submitting === record._id);

                                                                            return (
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    {nextDose && (
                                                                                        <span className={`text-[7px] font-black uppercase tracking-widest ${isDue ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                                                                            {isDue ? 'Due Now' : `Next: ${nextDose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                                                                                        </span>
                                                                                    )}
                                                                                    <div className="relative group">
                                                                                        <button
                                                                                            disabled={!!record || !!submitting || remaining === 0}
                                                                                            onClick={() => handleAdminister(med.prescId, med, slot)}
                                                                                            className={`
                                                                                                px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border
                                                                                                flex items-center gap-1.5
                                                                                                ${record
                                                                                                    ? 'bg-green-50 text-green-600 border-green-100 cursor-default'
                                                                                                    : isDue
                                                                                                        ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                                                                                        : 'hover:bg-slate-900 hover:text-white border-slate-100 bg-slate-50 text-slate-500'
                                                                                                }
                                                                                                ${isSubmitting ? 'animate-pulse opacity-50' : ''}
                                                                                            `}
                                                                                        >
                                                                                            {record ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                                                            {record ? 'Administered' : 'Mark Dose'}
                                                                                        </button>
                                                                                        {record && (
                                                                                            <button
                                                                                                onClick={() => handleUndo(record._id, med.name)}
                                                                                                className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                                                            >
                                                                                                <X size={10} />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return TIME_SLOTS.map((slot) => {
                                                                            const f = mapFrequency(med.frequency);
                                                                            const slotKey = slot.toLowerCase() as keyof StandardFrequency;
                                                                            const isRequired = f.standard?.[slotKey] && f.standard?.[slotKey] !== 'off';
                                                                            const record = getAdministrationData(med.prescId, med.name, slot);
                                                                            const isSubmitting = submitting === `${med.prescId}-${med.name}-${slot}` || (record && submitting === record._id);

                                                                            if (!isRequired) return null;

                                                                            return (
                                                                                <div key={slot} className="relative group">
                                                                                    <button
                                                                                        disabled={!!record || !!submitting || remaining === 0}
                                                                                        onClick={() => handleAdminister(med.prescId, med, slot)}
                                                                                        className={`
                                                                                        px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border
                                                                                        flex items-center gap-1.5
                                                                                        ${record
                                                                                                ? 'bg-green-50 text-green-600 border-green-100 cursor-default'
                                                                                                : 'hover:bg-slate-900 hover:text-white border-slate-100 bg-slate-50 text-slate-500'
                                                                                            }
                                                                                        ${isSubmitting ? 'animate-pulse opacity-50' : ''}
                                                                                        ${!record && remaining === 0 ? 'opacity-50 cursor-not-allowed hidden' : ''}
                                                                                    `}
                                                                                    >
                                                                                        {record ? <CheckCircle2 size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20"></div>}
                                                                                        {slot}
                                                                                        {!record && f.standard?.[slotKey] !== 'anytime' && f.standard?.[slotKey] && (
                                                                                            <span className="text-[6.5px] opacity-70 ml-1 font-bold whitespace-nowrap">
                                                                                                ({f.standard[slotKey] === 'before' ? 'Before Food' : f.standard[slotKey] === 'after' ? 'After Food' : 'With Food'})
                                                                                             </span>
                                                                                        )}
                                                                                    </button>
                                                                                    {record && (
                                                                                        <button
                                                                                            onClick={() => handleUndo(record._id, med.name)}
                                                                                            className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                                                        >
                                                                                            <X size={10} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'summary' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {prescriptions.length > 0 ? (
                                        prescriptions.slice(0, 1).map((presc) => (
                                            <div key={presc._id} className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                                        <h4 className="text-[10px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis & Advice</h4>
                                                        <div>
                                                            <p className="text-[9px] lg:text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Current Diagnosis</p>
                                                            <p className="text-sm font-black text-slate-900 uppercase">{presc.diagnosis || 'N/A'}</p>
                                                        </div>
                                                        {presc.advice && (
                                                            <div>
                                                                <p className="text-[9px] lg:text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">General Advice</p>
                                                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{presc.advice}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                                        <h4 className="text-[10px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Diet & Follow-up</h4>
                                                        <div>
                                                            <p className="text-[9px] lg:text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Dietary Instructions</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {presc.dietAdvice?.length > 0 ? presc.dietAdvice.map((diet: string, i: number) => (
                                                                    <span key={`${diet}-${i}`} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                                        {diet}
                                                                    </span>
                                                                )) : <span className="text-[10px] font-bold text-slate-400 uppercase italic">No diet specified</span>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] lg:text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Expected Follow-up</p>
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl w-fit">
                                                                <Calendar size={12} className="text-rose-600" />
                                                                <span className="text-[11px] font-black text-rose-700 uppercase">
                                                                    {presc.followUpDate ? new Date(presc.followUpDate).toLocaleDateString() : 'To be decided'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {presc.notes && (
                                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                                        <h4 className="text-[10px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor's Nursing Instructions</h4>
                                                        <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                            {presc.notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100 text-slate-400 uppercase italic font-bold text-[10px]">
                                            No recent prescription data available
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'labs' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Tests (From Prescription)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {prescriptions[0]?.suggestedTests?.length > 0 ? prescriptions[0].suggestedTests.map((test: string, i: number) => (
                                                <span key={`${test}-${i}`} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100 flex items-center gap-2">
                                                    <Beaker size={12} />
                                                    {test}
                                                </span>
                                            )) : <p className="text-[10px] font-bold text-slate-400 uppercase italic">No tests suggested in latest prescription</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Published Lab Reports</h4>
                                        {labReports.length === 0 ? (
                                            <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No lab reports available yet</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {labReports.map((report) => (
                                                    <div key={report._id} className="bg-white p-6 rounded-[32px] border border-slate-100 hover:border-purple-200 transition-all shadow-sm space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Report #{report._id.slice(-6).toUpperCase()}</h5>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-lg">{new Date(report.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {report.tests?.map((t: any, idx: number) => (
                                                                <div key={`${t.testId || t._id || idx}`} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                                                                    <span className="text-[9px] font-bold text-slate-600 uppercase">{t.test?.name || t.test?.testName}</span>
                                                                    <span className="text-[10px] font-black text-slate-900 uppercase">{t.result || t.status}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'diet' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Diet Logging Form */}
                                    <div className="bg-white p-4 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Utensils size={16} />
                                            </div>
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Log Food/Drink Intake</h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                                                        <div className="col-span-6 text-indigo-500">Food Item</div>
                                                        <div className="col-span-3 text-emerald-500">Qty</div>
                                                        <div className="col-span-3 text-amber-500">Kcal</div>
                                                    </div>

                                                    {dietItems.map((item, idx) => (
                                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                            <div className="col-span-6">
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. Juice..."
                                                                    value={item.name}
                                                                    onChange={(e) => {
                                                                        const newItems = [...dietItems];
                                                                        newItems[idx].name = e.target.value;
                                                                        setDietItems(newItems);
                                                                    }}
                                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="200ml"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const newItems = [...dietItems];
                                                                        newItems[idx].quantity = e.target.value;
                                                                        setDietItems(newItems);
                                                                    }}
                                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 flex gap-1 items-center">
                                                                <input
                                                                    type="text"
                                                                    placeholder="150"
                                                                    value={item.calories}
                                                                    onChange={(e) => {
                                                                        const newItems = [...dietItems];
                                                                        newItems[idx].calories = e.target.value;
                                                                        setDietItems(newItems);
                                                                    }}
                                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                                />
                                                                {idx > 0 && (
                                                                    <button onClick={() => setDietItems(dietItems.filter((_, i) => i !== idx))} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setDietItems([...dietItems, { name: '', quantity: '', calories: '' }])}
                                                        className="w-full py-1.5 border border-dashed border-slate-200 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest hover:border-emerald-200 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={10} /> Add More
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Notes (Optional)</label>
                                                    <textarea
                                                        value={dietForm.notes}
                                                        onChange={(e) => setDietForm({ ...dietForm, notes: e.target.value })}
                                                        placeholder="Any specific note about intake..."
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 h-20 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                            <input
                                                                type="date"
                                                                value={dietForm.recordedDate}
                                                                onChange={(e) => setDietForm({ ...dietForm, recordedDate: e.target.value })}
                                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-700 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Time</label>
                                                        <div className="relative">
                                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                            <input
                                                                type="time"
                                                                value={dietForm.recordedTime}
                                                                onChange={(e) => setDietForm({ ...dietForm, recordedTime: e.target.value })}
                                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-700 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Slot/Category</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['Morning', 'Afternoon', 'Evening', 'Night'].map(cat => (
                                                            <button
                                                                key={cat}
                                                                onClick={() => setDietForm({ ...dietForm, category: cat })}
                                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${dietForm.category === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-emerald-200'}`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleLogDiet}
                                                    disabled={submitting === 'diet-submit'}
                                                    className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 group mt-2"
                                                >
                                                    {submitting === 'diet-submit' ? 'Processing...' : 'Submit Diet Log'}
                                                    <Utensils size={14} className="group-hover:rotate-12 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Diet History */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-0.5 h-3 bg-emerald-500 rounded-full"></div>
                                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intake History (Last 24h)</h3>
                                        </div>

                                        {dietHistory.length === 0 ? (
                                            <div className="py-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                                <Coffee className="mx-auto text-slate-200 mb-2" size={32} />
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No dietary intake recorded yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {dietHistory.map((log, idx) => (
                                                    <div key={log._id || idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-100 transition-all shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                                <Utensils size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                                                            {log.items?.map((item: any) => `${item.name || item} ${item.quantity ? `(${item.quantity})` : ''}`).join(', ')}
                                                                        </span>
                                                                        {log.items?.some((item: any) => item.calories) && (
                                                                            <span className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">
                                                                                Total Calories: {log.items.reduce((sum: number, i: any) => sum + (Number(i.calories) || 0), 0)} Kcal
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-emerald-100">{log.category}</span>
                                                                </div>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {new Date(log.timestamp).toLocaleDateString()} at {log.recordedTime} • By {log.recordedBy?.name || 'Staff'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {submitting === log._id ? (
                                                            <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDeleteDiet(log._id)}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-3 sm:p-5 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <button
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 sm:gap-2 ${showHistory ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        {showHistory ? 'Hide Hist' : 'View Hist'}
                        <ChevronRight size={10} className={showHistory ? 'rotate-90' : ''} />
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 sm:px-8 py-2 sm:py-2.5 bg-primary-theme text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-primary-theme/80 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
