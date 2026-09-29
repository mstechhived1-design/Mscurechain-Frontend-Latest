import React, { useState } from 'react';
import { Pill, Calendar, User, Download, Building2, X, CheckCircle2, ChevronRight, Stethoscope, Clock, FileText, Info } from 'lucide-react';
import { Card } from '@/components/admin';
import { format } from 'date-fns';
import { formatFrequency } from '@/lib/frequencyUtils';
import { formatDoctorName } from '@/lib/utils/name-utils';

interface Medicine {
    name: string;
    dosage: string;
    frequency: any;
    duration: string;
    instructions?: string;
}

interface Prescription {
    _id: string;
    prescriptionDate: string;
    diagnosis: string;
    symptoms?: string[];
    medicines: Medicine[];
    advice?: string;
    dietAdvice?: string[];
    suggestedTests?: string[];
    avoid?: string[];
    followUpDate?: string;
    notes?: string;
    doctor: {
        user?: {
            name: string;
        };
        name?: string; // Fallback
        specialties?: string[];
    };
    hospital: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    displayType?: string;
    createdAt?: string;
    appointment?: {
        appointmentId: string;
        date: string;
    };
    status?: string;
}

interface PrescriptionsSectionProps {
    prescriptions: Prescription[];
    patientName?: string;
    patientEmail?: string;
}

export default function PrescriptionsSection({
    prescriptions,
    patientName = 'Valued Patient',
    patientEmail = ''
}: PrescriptionsSectionProps) {
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

    const getStatusColor = (status?: string) => {
        if (!status) return 'hidden';
        const s = status.toLowerCase();
        if (s.includes('billed') || s.includes('paid')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (s.includes('pharma') || s.includes('processing')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    };

    const handleDownloadPDF = async (prescription: Prescription) => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');
            const primaryBlue = [25, 118, 210]; // Professional Blue

            // --- HEADER SECTION ---
            doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
            doc.rect(0, 0, 210, 45, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(prescription.hospital?.name?.toUpperCase() || 'HOSPITAL CENTER', 15, 18);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const hospitalAddress = prescription.hospital?.address || 'Health District, Medical City';
            const hospitalPhone = prescription.hospital?.phone || '+1 (555) 000-0000';
            const hospitalEmail = prescription.hospital?.email || 'contact@hospital.com';

            doc.text(hospitalAddress, 15, 25);
            doc.text(`Phone: ${hospitalPhone}  •  Email: ${hospitalEmail}`, 15, 30);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PATIENT MEDICATION RECEIPT', 15, 40);

            // --- PATIENT & DOCTOR INFO ---
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('PATIENT INFORMATION', 15, 55);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${patientName}`, 15, 61);
            doc.text(`Email: ${patientEmail || 'N/A'}`, 15, 67);
            doc.text(`ID: #${prescription._id.toUpperCase()}`, 15, 73);

            doc.setFont('helvetica', 'bold');
            doc.text('PRESCRIBED BY', 120, 55);
            doc.setFont('helvetica', 'normal');
            doc.text(`Dr. ${prescription.doctor?.user?.name || prescription.doctor?.name || 'Medical Specialist'}`, 120, 61);
            doc.text(`${prescription.doctor?.specialties?.[0] || 'Consultant'}`, 120, 67);
            doc.text(`Date: ${format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'PPPP')}`, 120, 73);

            doc.setDrawColor(200);
            doc.line(15, 80, 195, 80);

            // --- DIAGNOSIS ---
            let y = 90;
            if (prescription.diagnosis) {
                doc.setFont('helvetica', 'bold');
                doc.text('DIAGNOSIS:', 15, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(prescription.diagnosis.toUpperCase(), 40, y);
                y += 12;
            }

            // --- MEDICATIONS TABLE ---
            doc.setFillColor(240, 244, 248);
            doc.rect(15, y - 5, 180, 8, 'F');
            doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('MEDICATION', 18, y);
            doc.text('DOSAGE', 85, y);
            doc.text('TIMING / FREQUENCY', 125, y);
            doc.text('DURATION', 170, y);
            y += 10;

            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            prescription.medicines.forEach((m) => {
                if (y > 260) { doc.addPage(); y = 30; }
                doc.setFont('helvetica', 'bold');
                doc.text(m.name.toUpperCase(), 18, y);
                doc.setFont('helvetica', 'normal');
                doc.text(m.dosage, 85, y);
                doc.text(formatFrequency(m.frequency), 125, y);
                doc.text(m.duration, 170, y);

                if (m.instructions) {
                    y += 5;
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(`Instructions: ${m.instructions}`, 18, y);
                    doc.setFontSize(10);
                    doc.setTextColor(60, 60, 60);
                }

                y += 8;
                doc.setDrawColor(240);
                doc.line(15, y - 4, 195, y - 4);
                y += 4;
            });

            // --- CLINICAL ADVICE & NOTES ---
            y += 10;
            if (prescription.advice || prescription.notes) {
                if (y > 240) { doc.addPage(); y = 30; }
                doc.setFont('helvetica', 'bold');
                doc.text('CLINICAL ADVICE & NOTES', 15, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const notes = prescription.advice || prescription.notes || '';
                const splitNotes = doc.splitTextToSize(notes, 175);
                doc.text(splitNotes, 15, y);
                y += (splitNotes.length * 5) + 5;
            }

            // --- FOLLOW UP ---
            if (prescription.followUpDate) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(25, 118, 210); // Primary Blue
                doc.text(`FOLLOW-UP DATE: ${format(new Date(prescription.followUpDate), 'PPPP')}`, 15, y);
            }

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`This is a system generated medical receipt. No signature required.`, 105, 285, { align: 'center' });
                doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
            }

            doc.save(`Medication_Receipt_${prescription._id.slice(-8).toUpperCase()}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate medication receipt.');
        }
    };

    const filteredPrescriptions = (prescriptions || []).filter(p =>
        p.displayType !== 'Hospital Administration'
    );

    if (filteredPrescriptions.length === 0) {
        return (
            <Card className="p-8 text-center border-dashed bg-gray-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Pill className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No Active Prescriptions</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">Your medical care directives from physicians will appear here.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Pill className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Medication <span className="text-blue-600">History</span>
                    </h2>
                    <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Verified Clinical Directives</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full">
                {filteredPrescriptions.map((prescription: Prescription) => (
                    <div
                        key={prescription._id}
                        onClick={() => setSelectedPrescription(prescription)}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden hover:border-blue-200 cursor-pointer w-full"
                    >
                        <div className="flex flex-col w-full">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black uppercase rounded tracking-widest shrink-0">
                                            {prescription.displayType || 'Prescription'}
                                        </span>
                                        {prescription.status && (
                                            <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded tracking-widest shrink-0 ${getStatusColor(prescription.status)}`}>
                                                {prescription.status}
                                            </span>
                                        )}
                                        <span className="text-[8px] sm:text-[10px] font-mono text-gray-400">
                                            #{prescription._id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-gray-950 dark:text-white text-sm sm:text-lg uppercase tracking-tight truncate italic">
                                        {formatDoctorName(prescription.doctor?.user?.name || prescription.doctor?.name || 'Medical Specialist')}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                        <Building2 className="w-2.5 h-2.5 text-blue-600" />
                                        {prescription.hospital?.name}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadPDF(prescription);
                                        }}
                                        className="p-2 sm:px-4 sm:py-2 bg-gray-950 dark:bg-white text-white dark:text-gray-950 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
                                    >
                                        <Download className="w-3 h-3" />
                                        <span className="hidden sm:inline">PDF Report</span>
                                    </button>

                                    {/* Date Badge shifted to RIGHT */}
                                    <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                        <span className="text-[7px] sm:text-[10px] font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5">
                                            {format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'MMM')}
                                        </span>
                                        <span className="text-xs sm:text-2xl font-black text-gray-950 dark:text-white leading-none">
                                            {format(new Date(prescription.prescriptionDate || prescription.createdAt || new Date()), 'dd')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Medications Preview - Compact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {prescription.medicines.slice(0, 2).map((m: Medicine, idx: number) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-4 hover:border-blue-200 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-[10px] sm:text-xs text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">
                                                    {m.name}
                                                </h4>
                                                <p className="text-[7px] sm:text-[9px] font-bold text-blue-500 uppercase italic mt-0.5 tracking-tight truncate">
                                                    {m.dosage} • {m.duration}
                                                </p>
                                            </div>
                                            <Pill className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {prescription.medicines.length > 2 && (
                                <div className="mt-3 flex items-center justify-between text-[8px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest pt-3 border-t border-gray-50 dark:border-white/5">
                                    <span>+ {prescription.medicines.length - 2} Additional Medications</span>
                                    <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Full Medicines <ChevronRight size={10} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* FULL PRESCRIPTION MODAL */}
            {selectedPrescription && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0a0a09] w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/10 max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-500/20">
                                    <Pill size={16} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Prescription Details</p>
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">#{selectedPrescription._id.slice(-8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPrescription(null)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all active:scale-95 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar">
                            {/* Doctor & Hospital Details */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <Stethoscope size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight italic leading-tight">
                                            Dr. {selectedPrescription.doctor?.user?.name || selectedPrescription.doctor?.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                                            {selectedPrescription.hospital.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Date Issued</p>
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase">
                                        {format(new Date(selectedPrescription.prescriptionDate || selectedPrescription.createdAt || new Date()), 'dd MMM yyyy')}
                                    </p>
                                </div>
                            </div>

                            {/* Medication List */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <Pill size={12} className="text-blue-500" />
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Medication Inventory</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {selectedPrescription.medicines.map((m: Medicine, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-sm text-gray-950 dark:text-white uppercase tracking-tight truncate leading-tight italic">
                                                        {m.name}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-blue-500 uppercase mt-0.5">
                                                        {m.dosage} • {m.duration}
                                                    </p>
                                                </div>
                                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase rounded-lg border border-blue-100 dark:border-blue-500/20">
                                                    {formatFrequency(m.frequency)}
                                                </span>
                                            </div>
                                            {m.instructions && (
                                                <div className="mt-1 pt-2 border-t border-gray-100 dark:border-white/5">
                                                    <p className="text-[9px] font-bold text-gray-500 uppercase italic">
                                                        &ldquo;{m.instructions}&rdquo;
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Diagnosis & Notes */}
                            <div className="space-y-4">
                                {selectedPrescription.diagnosis && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Info size={12} className="text-indigo-500" />
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Clinical Diagnosis</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase leading-relaxed italic">
                                            {selectedPrescription.diagnosis}
                                        </p>
                                    </div>
                                )}

                                {selectedPrescription.notes && (
                                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText size={12} className="text-amber-500" />
                                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Doctor's Clinical Notes</span>
                                        </div>
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed uppercase italic">
                                            {selectedPrescription.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-black/50 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle2 size={12} className="text-blue-500" />
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Verified Clinical Directive</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

