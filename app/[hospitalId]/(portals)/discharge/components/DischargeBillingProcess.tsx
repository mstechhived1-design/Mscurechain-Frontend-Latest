'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, FormInput, FormSelect, FormTextarea } from '@/components/admin';
import { ArrowLeft, Save, FileCheck, Receipt, FileText } from 'lucide-react';
import { dischargeService } from '@/lib/integrations/services/discharge.service';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import toast from 'react-hot-toast';
import { Tag, AlertCircle, Info, Lock, Wallet, Plus, X, IndianRupee } from 'lucide-react';
import ClinicalReceipt from '@/components/helpdesk/ClinicalReceipt';
import { format } from 'date-fns';

export function DischargeBillingProcess() {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const admissionId = ((searchParams?.get('admissionId') ?? null) ?? null);
    const [loading, setLoading] = useState(false);
    const [recordData, setRecordData] = useState<any>(null);
    const [billSummary, setBillSummary] = useState<any>(null);

    const [billingData, setBillingData] = useState({
        patientName: '',
        admissionId: '',
        advanceAmount: 0,
        settlementPaid: 0,
        balanceDue: 0,
        totalBillAmount: 0,
        remainingAmountPaid: 0,
        paymentMode: 'Cash',
        amountToPay: 0,
        paymentReference: '',
        insuranceName: '',
        allergyHistory: '',
        bedChargesTotal: 0,
        extraChargesTotal: 0,
        discountAmount: 0,
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState<{amount: number | string, mode: string, reference: string}>({
        amount: 0,
        mode: 'Cash',
        reference: ''
    });
    const [mixedPaymentDetails, setMixedPaymentDetails] = useState<{cash: number | string, upi: number | string, card: number | string, bankTransfer: number | string}>({
        cash: 0,
        upi: 0,
        card: 0,
        bankTransfer: 0
    });
    const [receiptData, setReceiptData] = useState<any>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        if (admissionId) {
            fetchAdmissionDetails(admissionId);
        }
    }, [admissionId]);

    const fetchAdmissionDetails = async (id: string) => {
        try {
            setLoading(true);
            const [data, summary] = await Promise.all([
                dischargeService.getAdmissionDetails(id),
                ipdService.getBillSummary(id).catch(e => {
                    console.error("Ledger fetch failed", e);
                    return null;
                })
            ]);

            if (data) {
                setRecordData(data);
                setBillSummary(summary);

                // Auto-fill from SUMMARY if available (SOURCE OF TRUTH)
                if (summary?.financials) {
                    setBillingData({
                        patientName: data.patientName || '',
                        admissionId: data.admissionId || '',
                        advanceAmount: summary.financials.totalAdvance || 0,
                        settlementPaid: summary.financials.totalSettlement || 0,
                        balanceDue: summary.financials.balance || 0,
                        totalBillAmount: summary.financials.totalBill || 0,
                        remainingAmountPaid: summary.financials.remainingPaid || 0,
                        paymentMode: data.paymentMode ? (['UPI', 'upi'].includes(data.paymentMode) ? 'UPI' : data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1).toLowerCase()) : 'Cash',
                        amountToPay: 0,
                        paymentReference: '',
                        
                        insuranceName: data.insuranceName || '',
                        allergyHistory: data.allergyHistory || data.vitals?.sugar || '',
                        bedChargesTotal: summary.bedCharges?.total || 0,
                        extraChargesTotal: summary.extraCharges?.total || 0,
                        discountAmount: summary.financials?.discount || 0
                    });
                } else if (data.vitals) {
                    // Pre-fill existing billing data if any (legacy path)
                    setBillingData(prev => ({
                        ...prev,
                        patientName: data.patientName || '',
                        admissionId: data.admissionId || '',
                        advanceAmount: data.advanceAmount || 0,
                        totalBillAmount: data.totalBillAmount || 0,
                        remainingAmountPaid: data.remainingAmountPaid || data.finalPayment || 0,
                        paymentMode: data.paymentMode ? (['UPI', 'upi'].includes(data.paymentMode) ? 'UPI' : data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1).toLowerCase()) : 'Cash',
                        insuranceName: data.insuranceName || '',
                        allergyHistory: data.allergyHistory || '',
                        amountToPay: 0,
                        paymentReference: ''
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
            toast.error("Failed to load patient details");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'advanceAmount' || name === 'settlementPaid' || name === 'balanceDue' || name === 'totalBillAmount') {
            const val = Math.round(parseFloat(value) || 0);
            setBillingData(prev => ({ ...prev, [name]: val }));
        } else {
            setBillingData(prev => ({ ...prev, [name]: value }));
        }
    };

    const [isSaved, setIsSaved] = useState(false);

    const handleGeneratePreview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionId) return;

        // Set receipt data so the preview modal opens!
        const startTime = recordData.admissionDate ? new Date(recordData.admissionDate).getTime() : 0;
        const endTime = recordData.dischargeDate ? new Date(recordData.dischargeDate).getTime() : new Date().getTime();
        const diffInMs = Math.max(0, endTime - startTime);
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        const stayDurationStr = startTime ? (hours >= 24 ? `${Math.floor(hours / 24)} Day${Math.floor(hours / 24) !== 1 ? 's' : ''}${hours % 24 > 0 ? ` ${hours % 24} Hrs` : ''}` : `${hours} Hrs, ${minutes} Mins`) : '';
        setReceiptData({
            hospital: recordData.hospital || {},
            patient: {
                name: recordData.patientName,
                mrn: recordData.mrn,
                age: recordData.age,
                gender: recordData.gender,
                mobile: recordData.phone,
                email: recordData.email,
                address: recordData.address,
                emergencyContact: recordData.attendantName ? `${recordData.attendantName} (${recordData.attendantPhone})` : '',
                bloodGroup: recordData.bloodGroup,
                dateOfBirth: recordData.dob,
                allergies: recordData.allergyHistory,
                medicalHistory: recordData.pastMedicalHistory,
                symptoms: recordData.reasonForAdmission,
                diagnosis: recordData.diagnosis,
                provisionalDiagnosis: recordData.provisionalDiagnosis,
                treatmentGiven: recordData.treatmentGiven,
                surgicalProcedures: recordData.surgicalProcedures,
                investigationsPerformed: recordData.investigationsPerformed,
                hospitalCourse: recordData.hospitalCourse,
                conditionAtDischarge: recordData.conditionAtDischarge,
                medicationsPrescribed: recordData.medicationsPrescribed,
                adviceAtDischarge: recordData.adviceAtDischarge,
                activityRestrictions: recordData.activityRestrictions,
                dietInstructions: recordData.dietInstructions,
                warningSigns: recordData.warningSigns,
                followUpDate: recordData.followUpDate,
                dischargeType: recordData.dischargeType || 'FINAL DISCHARGE',
                vitals: recordData.vitals
            },
            appointment: {
                type: recordData.dischargeType || 'FINAL DISCHARGE',
                doctorName: recordData.consultants?.[0] || recordData.primaryDoctor || recordData.suggestedDoctorName || 'Assigned Physician',
                appointmentId: recordData._id || `DIS-${Date.now()}`,
                date: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                time: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
                specialization: recordData.specialistType || 'IPD',
                stayDuration: stayDurationStr
            },
            payment: {
                receiptNo: recordData._id || `BILL-${Date.now()}`,
                date: new Date().toISOString(),
                amount: Math.round(billingData.advanceAmount + billingData.settlementPaid),
                advanceAmount: Math.round(billingData.advanceAmount),
                remainingPaid: Math.round(billingData.settlementPaid),
                totalPaidAmount: Math.round(billingData.advanceAmount + billingData.settlementPaid),
                totalBillAmount: Math.round(billingData.totalBillAmount),
                balance: Math.round(billingData.balanceDue),
                mode: billingData.paymentMode,
                status: 'PAID'
            }
        });
    };

    const handleConfirmDischarge = async () => {
        if (!admissionId) return;

        setLoading(true);
        try {
            const payload = {
                ...recordData,
                ...billingData,
                dischargeType: recordData.dischargeType || '',
                totalPaidAmount: Math.round(billingData.advanceAmount + (billingData.settlementPaid || 0)),
                remainingAmount: Math.round(billingData.settlementPaid || 0),
                status: 'completed',
                dischargeDate: new Date().toISOString()
            };

            if (recordData.status === 'completed' && recordData._id) {
                // Only update if it's an existing finalized discharge record
                await dischargeService.updateRecord(recordData._id, payload);
            } else {
                // For new admissions or pending nurse discharges, use saveRecord (POST)
                // The backend handles converting pending records to completed via admissionId
                const { _id, ...cleanPayload } = payload;
                await dischargeService.saveRecord(cleanPayload);
            }

            setIsSaved(true);
            toast.success("Discharge finalized & Bill generated");
        } catch (error: any) {
            toast.error(error.message || "Failed to finalize discharge");
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionId || !recordData) return;

        try {
            setIsProcessingPayment(true);
            const response = await ipdService.addAdvancePayment({
                admissionId,
                amount: Number(paymentData.amount) || 0,
                mode: paymentData.mode,
                transactionType: 'Settlement',
                reference: paymentData.reference,
                paymentDetails: paymentData.mode === 'Mixed' ? {
                    cash: Number(mixedPaymentDetails.cash) || 0,
                    upi: Number(mixedPaymentDetails.upi) || 0,
                    card: Number(mixedPaymentDetails.card) || 0,
                    bankTransfer: Number(mixedPaymentDetails.bankTransfer) || 0
                } : undefined
            });

            toast.success("Payment recorded successfully");

            const startTime = recordData.admissionDate ? new Date(recordData.admissionDate).getTime() : 0;
            const endTime = recordData.dischargeDate ? new Date(recordData.dischargeDate).getTime() : new Date().getTime();
            const diffInMs = Math.max(0, endTime - startTime);
            const hours = Math.floor(diffInMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
            const stayDurationStr = startTime ? (hours >= 24 ? `${Math.floor(hours / 24)} Day${Math.floor(hours / 24) !== 1 ? 's' : ''}${hours % 24 > 0 ? ` ${hours % 24} Hrs` : ''}` : `${hours} Hrs, ${minutes} Mins`) : '';

            // Set receipt data and refresh
            setReceiptData({
                hospital: recordData.hospital || {},
                patient: {
                    name: recordData.patientName,
                    mrn: recordData.mrn,
                    age: recordData.age,
                    gender: recordData.gender,
                    mobile: recordData.phone,
                    email: recordData.email,
                    address: recordData.address,
                    emergencyContact: recordData.attendantName ? `${recordData.attendantName} (${recordData.attendantPhone})` : '',
                    bloodGroup: recordData.bloodGroup,
                    dateOfBirth: recordData.dob,
                    allergies: recordData.allergyHistory,
                    medicalHistory: recordData.pastMedicalHistory,
                    symptoms: recordData.reasonForAdmission,
                    diagnosis: recordData.diagnosis,
                    provisionalDiagnosis: recordData.provisionalDiagnosis,
                    treatmentGiven: recordData.treatmentGiven,
                    surgicalProcedures: recordData.surgicalProcedures,
                    investigationsPerformed: recordData.investigationsPerformed,
                    hospitalCourse: recordData.hospitalCourse,
                    conditionAtDischarge: recordData.conditionAtDischarge,
                    medicationsPrescribed: recordData.medicationsPrescribed,
                    adviceAtDischarge: recordData.adviceAtDischarge,
                    activityRestrictions: recordData.activityRestrictions,
                    dietInstructions: recordData.dietInstructions,
                    warningSigns: recordData.warningSigns,
                    followUpDate: recordData.followUpDate,
                    dischargeType: recordData.dischargeType || 'FINAL DISCHARGE',
                    vitals: recordData.vitals
                },
                appointment: {
                    type: recordData.dischargeType || 'FINAL DISCHARGE',
                    doctorName: recordData.consultants?.[0] || recordData.primaryDoctor || recordData.suggestedDoctorName || 'Assigned Physician',
                    appointmentId: recordData._id || `SET-${Date.now()}`,
                    date: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                    time: recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
                    specialization: recordData.specialistType || 'IPD',
                    stayDuration: stayDurationStr
                },
                payment: {
                    receiptNo: response._id || `REC-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount: Math.round(Number(paymentData.amount) || 0),
                    advanceAmount: Math.round(billingData.advanceAmount),
                    remainingPaid: Math.round(Number(paymentData.amount) || 0),
                    totalPaidAmount: Math.round(billingData.advanceAmount + billingData.settlementPaid + (Number(paymentData.amount) || 0)),
                    totalBillAmount: Math.round(billingData.totalBillAmount),
                    mode: paymentData.mode,
                    reference: paymentData.reference,
                    paymentDetails: paymentData.mode === 'Mixed' ? {
                        cash: Number(mixedPaymentDetails.cash) || 0,
                        upi: Number(mixedPaymentDetails.upi) || 0,
                        card: Number(mixedPaymentDetails.card) || 0,
                        bankTransfer: Number(mixedPaymentDetails.bankTransfer) || 0
                    } : undefined,
                    status: 'PAID' // Required for receipt generator
                }
            });

            setPaymentData({ amount: 0, mode: 'Cash', reference: '' });
            setMixedPaymentDetails({ cash: 0, upi: 0, card: 0, bankTransfer: 0 });
            setShowPaymentModal(false);
            fetchAdmissionDetails(admissionId);
        } catch (error: any) {
            toast.error(error.message || "Failed to record payment");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    if (loading && !recordData) {
        return <div className="p-8 text-center text-slate-500">Loading patient details...</div>;
    }

    if (!recordData) {
        return <div className="p-8 text-center text-rose-500">Patient record not found</div>;
    }

    // Helper for clinical sections
    const clinicalSections = [
        { label: 'Reason for Admission', value: recordData.reasonForAdmission },
        { label: 'Diagnosis', value: recordData.diagnosis },
        { label: 'Past Medical History', value: recordData.pastMedicalHistory },
        { label: 'Allergy History', value: recordData.allergyHistory },
        { label: 'Provisional Diagnosis', value: recordData.provisionalDiagnosis },
        { label: 'Final Diagnosis', value: recordData.finalDiagnosis },
        { label: 'Complications', value: recordData.complications },
        { label: 'Investigations', value: recordData.investigations },
    ];

    const treatmentSections = [
        { label: 'Treatment Given', value: recordData.treatmentGiven },
        { label: 'Procedures Performed', value: recordData.proceduresPerformed },
        { label: 'Medications at Discharge', value: recordData.medicationsAtDischarge },
    ];

    const adviceSections = [
        { label: 'Advice at Discharge', value: recordData.adviceAtDischarge },
        { label: 'Follow-up Date', value: recordData.followUpDate ? new Date(recordData.followUpDate).toLocaleString() : 'N/A' },
        {
            label: 'Dietary Advice',
            value: recordData.dietaryAdvice,
            subSections: [
                { label: 'Diet Type', value: recordData.dietType },
                { label: 'Diet Restrictions', value: recordData.dietRestrictions },
            ]
        },
        { label: 'Activity Restrictions', value: recordData.activityRestrictions },
        { label: 'Special Instructions', value: recordData.specialInstructions },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 tracking-tight">Discharge Billing Process</h1>
                    <p className="text-slate-500 text-sm font-medium">Finalize financials and generate discharge documentation</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        Back
                    </button>
                </div>
            </div>

            {/* Patient & Admission Overview */}
            <Card className="p-1 border-slate-100 shadow-sm bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" />
                        Patient & Admission Overview
                    </h3>
                    <div className="ml-auto flex bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest gap-1 border border-blue-200">
                        Stay Duration: {(() => {
                            if (!recordData.admissionDate) return 'N/A';
                            const startTime = new Date(recordData.admissionDate).getTime();
                            const endTime = recordData.dischargeDate ? new Date(recordData.dischargeDate).getTime() : new Date().getTime();
                            const diffInMs = Math.max(0, endTime - startTime);
                            const hours = Math.floor(diffInMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
                            if (hours > 24) {
                                const days = Math.floor(hours / 24);
                                const remainingHours = hours % 24;
                                return `${days} Day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} Hrs` : ''}`;
                            }
                            return `${hours} Hrs, ${minutes} Mins`;
                        })()}
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-3">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Patient Name</p>
                        <p className="font-black text-slate-900 text-[12px] uppercase tracking-tight leading-none">{recordData.patientName}</p>
                        <p className="text-[9px] font-bold text-blue-600 mt-1">{recordData.mrn || 'MRN-N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">DOB / Age</p>
                        <p className="font-bold text-slate-700 text-[11px]">{recordData.dob ? recordData.dob.split('T')[0] : 'N/A'} / {recordData.age}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase">{recordData.gender}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Admission ID</p>
                        <p className="font-black text-slate-800 text-[11px]">{recordData.admissionId}</p>
                        <p className="text-[9px] font-black text-rose-600 uppercase">BLOOD: {recordData.bloodGroup || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Treating Doctor</p>
                        <p className="font-black text-blue-600 text-[11px] leading-tight uppercase">
                            {recordData.consultants?.[0] || recordData.primaryDoctor || recordData.suggestedDoctorName || 'Assigned Physician'}
                        </p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Primary Consultant</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Contact Details</p>
                        <p className="font-bold text-slate-800 text-[11px] leading-none">{recordData.phone || '-'}</p>
                        <p className="text-[9px] text-slate-500 truncate mt-1">{recordData.email || 'No email provided'}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Emergency Contact</p>
                        <p className="font-bold text-slate-800 text-[11px] leading-tight">{recordData.attendantName || '-'}</p>
                        <p className="text-[9px] text-slate-500">{recordData.attendantPhone || 'No contact'}</p>
                    </div>
                   
                    <div className="md:col-span-2 lg:col-span-7 border-t border-slate-200 pt-2 flex items-start gap-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 shrink-0">ADDRESS:</p>
                        <p className="font-bold text-slate-600 text-[10px] leading-tight italic">{recordData.address || 'Residential address not updated in records'}</p>
                    </div>
                </div>
            </Card>

            {/* Clinical Summary Section (Nurse Filled Details) */}
            <Card className="p-0 border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden bg-white">
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.15em] flex items-center gap-3">
                        <FileCheck size={18} className="text-blue-500" />
                        Final Discharge Summary (Clinical Details)
                    </h3>
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-[10px] font-black text-slate-500 uppercase">
                        PREPARED BY: <span className="text-blue-600">{
                            recordData.preparedBy?.name 
                            ? `NURSE (${recordData.preparedBy.name.toUpperCase()})` 
                            : (recordData.nurseName || recordData.staffName || recordData.createdBy?.name)
                                ? `NURSE (${(recordData.nurseName || recordData.staffName || recordData.createdBy?.name).toUpperCase()})`
                                : 'NURSE'
                        }</span>
                    </div>
                </div>
                <div className="p-0">
                    {/* section 1: vitals table */}
                    <div className="bg-slate-50/50 border-b border-slate-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vital Signs (Current Visit)</h4>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                            {[
                                { label: 'Height', value: recordData.vitals?.height ? `${recordData.vitals.height} cm` : '-' },
                                { label: 'Weight', value: recordData.vitals?.weight ? `${recordData.vitals.weight} kg` : '-' },
                                { label: 'Temp', value: recordData.vitals?.temperature || recordData.vitals?.temp ? `${recordData.vitals?.temperature || recordData.vitals?.temp} °F` : '-' },
                                { label: 'BP', value: recordData.vitals?.bloodPressure || recordData.vitals?.bp || '-' },
                                { label: 'Pulse', value: recordData.vitals?.pulse ? `${recordData.vitals.pulse} bpm` : '-' },
                                { label: 'SpO2', value: recordData.vitals?.spO2 || recordData.vitals?.spo2 ? `${recordData.vitals?.spO2 || recordData.vitals?.spo2}%` : '-' },
                                { label: 'Glucose', value: recordData.vitals?.glucose || recordData.vitals?.sugar ? `${recordData.vitals?.glucose || recordData.vitals?.sugar} mg/dL` : '-' }
                            ].map((v, i) => (
                                <div key={i} className="bg-white p-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{v.label}</p>
                                    <p className="text-[10px] font-bold text-slate-700">{v.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* section 2: history & symptoms table */}
                    <div className="p-1 border-b border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Background & Symptoms</h4>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-100 gap-px">
                                {recordData.allergyHistory && (
                                    <div className="flex bg-white">
                                        <div className="w-1/3 bg-slate-50/80 p-3 text-[10px] font-black text-rose-600 uppercase border-r border-slate-100">Allergies</div>
                                        <div className="w-2/3 p-3 text-xs font-bold text-slate-800">{recordData.allergyHistory}</div>
                                    </div>
                                )}
                                {recordData.pastMedicalHistory && (
                                    <div className="flex bg-white">
                                        <div className="w-1/3 bg-slate-50/80 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Medical History</div>
                                        <div className="w-2/3 p-3 text-xs font-bold text-slate-800">{recordData.pastMedicalHistory}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex bg-white border-t border-slate-100">
                                <div className="w-1/6 bg-slate-50/80 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Reason for Admission</div>
                                <div className="w-5/6 p-3 text-xs font-bold text-slate-800 leading-relaxed">{recordData.reasonForAdmission || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* section 3: clinical discharge summary (The Main Table) */}
                    <div className="p-1 bg-white">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Discharge Clinical Summary</h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {/* status row */}
                            <div className="flex bg-blue-50/30">
                                <div className="w-1/5 p-3 text-[10px] font-black text-blue-600 uppercase border-r border-blue-50">Discharge Type</div>
                                <div className="w-4/5 p-3 text-xs font-black text-blue-700 uppercase tracking-tight">{recordData.dischargeType || 'Final Discharge'}</div>
                            </div>
                            {/* diagnoses */}
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Provisional Diagnosis</div>
                                <div className="w-4/5 p-3 text-xs font-bold text-slate-700">{recordData.provisionalDiagnosis || '-'}</div>
                            </div>
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Final Diagnosis</div>
                                <div className="w-4/5 p-3 text-sm font-black text-slate-900 uppercase">{recordData.diagnosis || '-'} {recordData.icdCode && `(ICD: ${recordData.icdCode})`}</div>
                            </div>
                            {/* Course & Investigations */}
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Hospital Course</div>
                                <div className="w-4/5 p-3 text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{recordData.hospitalCourse || '-'}</div>
                            </div>
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Investigations</div>
                                <div className="w-4/5 p-3 text-xs font-bold text-slate-700">{recordData.investigationsPerformed || recordData.investigations || '-'}</div>
                            </div>
                            {/* treatment */}
                            <div className="flex bg-emerald-50/10">
                                <div className="w-1/5 p-3 text-[10px] font-black text-emerald-600 uppercase border-r border-emerald-50">Treatment Given</div>
                                <div className="w-4/5 p-3 text-xs font-bold text-slate-800">{recordData.treatmentGiven || '-'}</div>
                            </div>
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Procedures Done</div>
                                <div className="w-4/5 p-3 text-xs font-bold text-slate-700">{recordData.surgicalProcedures || recordData.proceduresPerformed || '-'}</div>
                            </div>
                            {/* advice */}
                            <div className="flex">
                                <div className="w-1/5 p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-100">Discharge Advice</div>
                                <div className="w-4/5 p-3 space-y-2">
                                    {recordData.adviceAtDischarge && <p className="text-xs font-bold text-slate-700"><span className="text-[8px] uppercase text-slate-400 block mb-0.5">General Advice</span>{recordData.adviceAtDischarge}</p>}
                                    {recordData.dietInstructions && <p className="text-xs font-bold text-slate-700"><span className="text-[8px] uppercase text-slate-400 block mb-0.5">Dietary Instructions</span>{recordData.dietInstructions}</p>}
                                    {recordData.activityRestrictions && <p className="text-xs font-bold text-slate-700"><span className="text-[8px] uppercase text-slate-400 block mb-0.5">Activity Restrictions</span>{recordData.activityRestrictions}</p>}
                                </div>
                            </div>
                            {/* follow up & warnings highlight */}
                            <div className="flex bg-rose-50/50">
                                <div className="w-1/5 p-3 text-[10px] font-black text-rose-600 uppercase border-r border-rose-100">Follow-up & Warnings</div>
                                <div className="w-4/5 p-3 space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white px-3 py-1 rounded-lg border border-rose-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Next Visit Date</p>
                                            <p className="text-[11px] font-black text-rose-600">{recordData.followUpDate ? new Date(recordData.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Scheduled'}</p>
                                        </div>
                                        {recordData.followUpDate && (
                                            <div className="bg-white px-3 py-1 rounded-lg border border-rose-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase">Scheduled Time</p>
                                                <p className="text-[11px] font-black text-rose-600">{new Date(recordData.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-rose-100/50 p-2 rounded-lg border border-rose-200">
                                        <p className="text-[9px] font-black text-rose-700 uppercase flex items-center gap-1 mb-1">
                                            <AlertCircle size={10} /> Emergency Warning Signs
                                        </p>
                                        <p className="text-[10px] font-bold text-rose-900 leading-tight uppercase tracking-tight">{recordData.warningSigns || 'Standard Post-Discharge Precautions Apply'}</p>
                                    </div>
                                </div>
                            </div>
                            {/* final condition */}
                            <div className="flex bg-emerald-50/20">
                                <div className="w-1/5 p-3 text-[10px] font-black text-emerald-700 uppercase border-r border-emerald-50">Final Condition</div>
                                <div className="w-4/5 p-3 text-[11px] font-black text-emerald-800 uppercase tracking-widest">{recordData.conditionAtDischarge || 'Stable / Improved'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Quick Actions & Status */}

            {/* Billing Form */}
            <form onSubmit={handleGeneratePreview}>
                <Card className="p-5 bg-white shadow-xl shadow-blue-900/5 border-white">
                    <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900">Billing Details</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enter payment information</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormInput
                            label="Total Advance Paid"
                            name="advanceAmount"
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={Math.round(billingData.advanceAmount)}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 font-bold text-emerald-700 h-10"
                            readOnly
                        />
                        <FormInput
                            label="Remaining Amount Paid"
                            name="settlementPaid"
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={Math.round(billingData.settlementPaid)}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 font-bold text-blue-600 h-10"
                            readOnly
                        />
                        <FormInput
                            label="Net Paid (Total Sum)"
                            name="totalPaid"
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={Math.round(billingData.advanceAmount + billingData.settlementPaid)}
                            className="bg-emerald-50 border-emerald-200 font-black text-emerald-800 h-10"
                            readOnly
                        />
                        <div className="relative">
                            <FormInput
                                label="Current Balance Due"
                                name="balanceDue"
                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                value={Math.round(billingData.balanceDue)}
                                onChange={handleChange}
                                placeholder="0.00"
                                className={`bg-slate-50 border-slate-200 font-bold h-10 ${Math.round(billingData.balanceDue) > 0 ? 'text-rose-600' : 'text-slate-900'}`}
                                readOnly
                                required
                            />
                            {Math.round(billingData.balanceDue) === 0 && Math.round(billingData.totalBillAmount) > 0 && (
                                <span className="absolute right-3 top-[34px] text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Settled</span>
                            )}
                        </div>
                        <FormInput
                            label="Total Bill Amount"
                            name="totalBillAmount"
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={Math.round(billingData.totalBillAmount)}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="bg-slate-50 border-slate-200 text-slate-400 font-black text-lg h-10 opacity-70"
                            readOnly
                            required
                        />
                        <FormSelect
                            label="Payment Mode"
                            name="paymentMode"
                            value={billingData.paymentMode}
                            onChange={handleChange}
                            className="border-gray-400 font-bold"
                            options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'card', label: 'Card' },
                                { value: 'upi', label: 'UPI' },
                                { value: 'mixed', label: 'Mixed' },
                                { value: 'other', label: 'Other' }
                            ]}
                        />
                        <div className="md:col-span-2">
                            <FormInput
                                label="Insurance Name / TPA"
                                name="insuranceName"
                                value={billingData.insuranceName}
                                onChange={handleChange}
                                placeholder="Enter insurance provider if applicable"
                                className="border-gray-300 font-bold"
                            />
                        </div>
                    </div>

                    {/* Statement Breakdown Preview */}
                    {billSummary && (
                        <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{billSummary.isBillLocked ? 'Locked Statement Breakdown' : 'Live Statement Breakdown'}</h3>
                                {billSummary.isBillLocked ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[8px] font-black uppercase border border-emerald-200">
                                        <Lock size={10} /> Bill Locked {billSummary.billLockedAt ? `(${format(new Date(billSummary.billLockedAt), 'dd MMM, HH:mm')})` : ''}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase border border-amber-100">
                                        <AlertCircle size={10} /> Bill Not Locked
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* 1. Bed Charges */}
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-blue-500 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                                            <Info size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Bed / Room Charges</p>
                                            <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Stay Duration: {billSummary.bedCharges?.totalStayReadable || 'Calculating...'}</p>
                                            <p className="text-[6px] font-medium text-slate-400 mt-0.5 uppercase">
                                                From: {recordData.admissionDate ? new Date(recordData.admissionDate).toLocaleString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-slate-900">₹{Math.round(billSummary.bedCharges?.total || 0).toLocaleString()}</p>
                                </div>

                                {/* 2. Medicine Charges */}
                                {(billSummary.extraCharges?.categoryBreakdown?.Pharmacy || 0) > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white text-emerald-500 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                                                <Receipt size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Medicine Charges</p>
                                                <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Pharmacy Issues</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-slate-900">₹{Math.round(billSummary.extraCharges?.categoryBreakdown?.Pharmacy || 0).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* 3. Other Clinical Charges */}
                                {((billSummary.extraCharges?.total || 0) - (billSummary.extraCharges?.categoryBreakdown?.Pharmacy || 0)) > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white text-amber-500 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                                                <Plus size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-800 uppercase leading-none">Other Clinical Charges</p>
                                                <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Procedures & Miscellaneous</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-slate-900">₹{Math.round((billSummary.extraCharges?.total || 0) - (billSummary.extraCharges?.categoryBreakdown?.Pharmacy || 0)).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* Existing logic for Returns, Discounts, etc. */}

                                {/* 4. Medicine Returns (if any) */}
                                {billSummary.financials?.returnCredits > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-rose-100 text-rose-600 bg-rose-50/50 px-2 py-1.5 rounded-lg -mx-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white text-rose-500 rounded-lg flex items-center justify-center border border-rose-100 shadow-sm"><ArrowLeft size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Medicine Returns</p>
                                                <p className="text-[7px] font-bold opacity-70 mt-1 uppercase tracking-tight">Pharmacy Credit</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{Math.round(billSummary.financials.returnCredits).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* 5. Discount (if any) */}
                                {billSummary.financials?.discount > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-emerald-600">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Tag size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Discount Details</p>
                                                <p className="text-[7px] font-bold opacity-60 mt-1 uppercase tracking-tight">Admin Adjustment</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{Math.round(billSummary.financials.discount).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* Grand Total Bill Highlight */}
                                <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl -mx-2 my-3 shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm"><FileText size={18} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Gross Bill Amount</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Total Hospital Services</p>
                                        </div>
                                    </div>
                                    <p className="text-base font-black text-slate-900 font-mono tracking-tighter">₹{Math.round(billingData.totalBillAmount).toLocaleString()}</p>
                                </div>

                                {/* 6. Advance Paid */}
                                <div className="flex justify-between items-center pb-2 border-b border-emerald-100 text-emerald-600 bg-emerald-50/30 px-2 py-1.5 rounded-lg -mx-2 mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 shadow-sm"><Wallet size={14} /></div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase leading-none">Net Advance Paid</p>
                                            <p className="text-[7px] font-bold opacity-70 mt-1 uppercase tracking-tight">Initial Payments</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black">- ₹{(billingData.advanceAmount || 0).toLocaleString()}</p>
                                </div>

                                {/* 7. Remaining Paid (Settlements) */}
                                {billingData.settlementPaid > 0 && (
                                    <div className="flex justify-between items-center pb-2 border-b border-blue-100 text-blue-600 bg-blue-50/30 px-2 py-1.5 rounded-lg -mx-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm"><Receipt size={14} /></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase leading-none">Remaining Amount Paid</p>
                                                <p className="text-[7px] font-bold opacity-70 mt-1 uppercase tracking-tight">Settlement Payments</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black">- ₹{(billingData.settlementPaid || 0).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* Net Total Paid - High Visibility Summary */}
                                <div className="flex justify-between items-center py-2.5 px-3 bg-emerald-600 text-white rounded-xl -mx-2 my-3 shadow-lg shadow-emerald-900/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm"><Wallet size={18} /></div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Net Total Paid</p>
                                            <p className="text-[8px] font-bold opacity-80 mt-1 uppercase tracking-tight">Total Payment Contribution</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-emerald-100 font-mono tracking-tighter">₹{Math.round(billingData.advanceAmount + billingData.settlementPaid).toLocaleString()}</p>
                                        <p className="text-[8px] font-black uppercase text-emerald-300">FULLY SETTLED SUM</p>
                                    </div>
                                </div>

                                {/* 8. Final Balance */}
                                <div className="flex justify-between items-center pt-3 text-rose-600 border-t-2 border-dashed border-slate-200 mt-2">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Remaining Balance Due</p>
                                        <p className="text-[8px] font-bold opacity-60 uppercase mt-1">Settlement required for discharge</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-lg font-black underline decoration-2 underline-offset-4">₹{Math.round(billingData.balanceDue || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Settlement Action Button moved here */}
                            {Math.round(billingData.balanceDue) > 0 && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentData(prev => ({ ...prev, amount: Math.round(billingData.balanceDue) }));
                                            setMixedPaymentDetails({ cash: Math.round(billingData.balanceDue), upi: 0, card: 0, bankTransfer: 0 });
                                            setShowPaymentModal(true);
                                        }}
                                        className="w-full md:w-auto px-10 py-3 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                                    >
                                        <Wallet size={16} /> Record Settlement Payment
                                    </button>
                                </div>
                            )}

                        </div>
                    )}

                    <div className="flex flex-col gap-4 pt-5 mt-5 border-t border-gray-50">
                        <div className="flex flex-col md:flex-row gap-4 w-full">
                            <div className="flex flex-col gap-2 flex-1">
                                {billSummary && !billSummary.isBillLocked && (
                                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl w-full">
                                        <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                        <p className="text-[10px] font-bold text-rose-700 leading-relaxed uppercase">
                                            Warning: The IPD bill is not locked. Please ensure the helpdesk has finalized the statement for accurate discharge records.
                                        </p>
                                    </div>
                                )}
                                {Math.round(billingData.balanceDue) > 0 && (
                                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl w-full">
                                        <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-relaxed">
                                            Outstanding Balance: ₹{Math.round(billingData.balanceDue).toLocaleString()} — Please record payment first
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-end justify-end md:w-1/3">
                                <Button
                                    type="submit"
                                    disabled={loading || Math.round(billingData.balanceDue) > 0}
                                    className={`w-full rounded-xl px-6 py-3 font-bold shadow-lg flex items-center justify-center gap-2 text-sm transition-all ${Math.round(billingData.balanceDue) > 0
                                        ? '!bg-slate-200 !text-slate-500 cursor-not-allowed shadow-none'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                        }`}
                                >
                                    <Save size={18} />
                                    {loading ? 'Generating...' : 'Generate Preview & Finalize'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </form>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                                <Wallet size={16} className="text-rose-500" /> Record Settlement
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Amount</label>
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                                    className="w-full text-lg font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    required
                                    max={Math.round(billingData.balanceDue)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Mode</label>
                                    <select
                                        value={paymentData.mode}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, mode: e.target.value }))}
                                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-rose-500"
                                    >
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="Mixed">Mixed</option>
                                        <option value="Insurance">Insurance</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Reference ID</label>
                                    <input
                                        type="text"
                                        value={paymentData.reference}
                                        onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                                        placeholder="Optional"
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-rose-500"
                                    />
                                </div>
                            </div>
                            {paymentData.mode === 'Mixed' && (
                                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Mixed Payment Breakdown</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Cash (₹)</label>
                                        <input
                                            type="number" min={0} value={mixedPaymentDetails.cash}
                                            onChange={(e) => setMixedPaymentDetails(prev => ({ ...prev, cash: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                                            onFocus={(e) => e.target.select()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">UPI (₹)</label>
                                        <input
                                            type="number" min={0} value={mixedPaymentDetails.upi}
                                            onChange={(e) => setMixedPaymentDetails(prev => ({ ...prev, upi: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                                            onFocus={(e) => e.target.select()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Card (₹)</label>
                                        <input
                                            type="number" min={0} value={mixedPaymentDetails.card}
                                            onChange={(e) => setMixedPaymentDetails(prev => ({ ...prev, card: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                                            onFocus={(e) => e.target.select()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Bank (₹)</label>
                                        <input
                                            type="number" min={0} value={mixedPaymentDetails.bankTransfer}
                                            onChange={(e) => setMixedPaymentDetails(prev => ({ ...prev, bankTransfer: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                                            onFocus={(e) => e.target.select()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div className="col-span-2 mt-1">
                                        {(() => {
                                            const currentSum = (Number(mixedPaymentDetails.cash) || 0) + (Number(mixedPaymentDetails.upi) || 0) + (Number(mixedPaymentDetails.card) || 0) + (Number(mixedPaymentDetails.bankTransfer) || 0);
                                            const remaining = (Number(paymentData.amount) || 0) - currentSum;
                                            
                                            if (remaining === 0) {
                                                return (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                        <span>Entered: ₹{currentSum}</span>
                                                        <span>Exact Match</span>
                                                    </div>
                                                );
                                            } else if (remaining > 0) {
                                                return (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase px-3 py-2 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                                                        <span>Entered: ₹{currentSum}</span>
                                                        <span>Remaining: ₹{remaining}</span>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase px-3 py-2 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
                                                        <span>Entered: ₹{currentSum}</span>
                                                        <span>Over by: ₹{Math.abs(remaining)}</span>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isProcessingPayment || (paymentData.mode === 'Mixed' && ((Number(mixedPaymentDetails.cash) || 0) + (Number(mixedPaymentDetails.upi) || 0) + (Number(mixedPaymentDetails.card) || 0) + (Number(mixedPaymentDetails.bankTransfer) || 0)) !== (Number(paymentData.amount) || 0))}
                                className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                                {isProcessingPayment ? "Processing..." : <><Plus size={16} /> Confirm Settlement</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Clinical Receipt Preview */}
            {receiptData && (
                <ClinicalReceipt
                    hospital={receiptData.hospital}
                    patient={receiptData.patient}
                    appointment={receiptData.appointment}
                    payment={receiptData.payment}
                    onConfirm={!isSaved ? handleConfirmDischarge : undefined}
                    onClose={() => {
                        setReceiptData(null);
                        if (isSaved) {
                            router.push('/helpdesk/discharge');
                        }
                    }}
                />
            )}
        </div>
    );
}
