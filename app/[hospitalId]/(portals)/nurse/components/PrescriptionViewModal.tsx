'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Pill, Calendar, User, Hash, Download } from 'lucide-react';
import { ipdService } from '@/lib/integrations';
import toast from 'react-hot-toast';
import { formatFrequency } from '@/lib/frequencyUtils';

interface PrescriptionViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
}

export default function PrescriptionViewModal({ isOpen, onClose, admissionId, patientName }: PrescriptionViewModalProps) {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && admissionId) {
            fetchPrescriptions();
        }
    }, [isOpen, admissionId]);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            console.log("Fetching prescriptions for Admission ID (string):", admissionId);
            const data = await ipdService.getPrescriptions(admissionId);
            console.log("Fetched prescriptions data:", data);
            setPrescriptions(data);
        } catch (error: any) {
            toast.error("Failed to fetch prescriptions");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-[1rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* HEADER */}
                <div className="p-8 bg-primary-theme text-white flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <FileText size={24} className="text-blue-400" />
                            <h2 className="text-xl font-black uppercase ">IPD Prescriptions</h2>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{patientName} • ADM: {admissionId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fetching Records...</p>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white rounded-[32px] border border-dashed border-slate-200">
                            <FileText size={48} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest">No IPD prescriptions found</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {prescriptions.map((presc) => (
                                <div key={presc._id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden border-l-[6px] border-l-blue-500">
                                    {/* PRESC HEADER */}
                                    <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {new Date(presc.createdAt).toLocaleDateString()} at {new Date(presc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {presc.doctor?.user?.name || presc.doctor?.name || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CLINICAL CONTEXT */}
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-wrap gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</span>
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">{presc.diagnosis}</span>
                                        </div>
                                        {/* Aggregate symptoms from general and specialty data */}
                                        {(() => {
                                            const allSymptoms = [];
                                            if (presc.symptoms) {
                                                if (Array.isArray(presc.symptoms)) allSymptoms.push(...presc.symptoms);
                                                else if (presc.symptoms.trim()) allSymptoms.push(presc.symptoms);
                                            }
                                            
                                            // Specialty specific symptoms
                                            const specs = [
                                                presc.orthopedicData, presc.pediatricsData, presc.pediatricData, presc.entData, 
                                                presc.ophthalmologyData, presc.ophthaData, presc.gynecologyData, presc.gynaecData,
                                                presc.neurologyData, presc.neuroData, presc.pulmonologyData, presc.pulmoData,
                                                presc.gastroenterologyData, presc.gastroData, presc.psychiatryData, presc.endocrinologyData
                                            ];
                                            
                                            specs.forEach(s => {
                                                if (s?.symptoms && Array.isArray(s.symptoms)) {
                                                    allSymptoms.push(...s.symptoms);
                                                } else if (s?.complaints && Array.isArray(s.complaints)) {
                                                    allSymptoms.push(...s.complaints);
                                                }
                                            });

                                            const uniqueSymptoms = Array.from(new Set(allSymptoms.map((s: any) => s?.toString().trim()).filter(Boolean)));
            
                                            if (uniqueSymptoms.length > 0) {
                                                return (
                                                    <div className="flex flex-col gap-1 border-l border-slate-200 pl-4">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Symptoms / Reason</span>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                                                            {uniqueSymptoms.join(', ')}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* SPECIALTY ASSESSMENT DETAILS */}
                                    {(() => {
                                        const renderedSpecs = [];
                                        
                                        // Orthopedics
                                        const ortho = presc.orthopedicData || presc.orthoData;
                                        if (ortho && (ortho.joint || ortho.pain)) {
                                            renderedSpecs.push(
                                                <div key="ortho" className="px-6 py-3 bg-orange-50/30 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest mb-1">Orthopedic Assessment: {ortho.side} {ortho.joint}</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Pain: {ortho.pain?.score || ortho.painScore}/10 ({ortho.pain?.type || 'N/A'})</span>
                                                        <span>ROM: {ortho.rom}</span>
                                                        <span>Power: {ortho.motorPower || ortho.motor}/5</span>
                                                        {ortho.diagnosis && <span>Impression: {ortho.diagnosis}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Pediatrics
                                        const peds = presc.pediatricsData || presc.pediatricData;
                                        if (peds && (peds.weight || peds.temperature)) {
                                            renderedSpecs.push(
                                                <div key="peds" className="px-6 py-3 bg-rose-50/30 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Pediatric Vitals & Growth</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Weight: {peds.weight}kg</span>
                                                        <span>Temp: {peds.temperature}°F</span>
                                                        <span>HR: {peds.heartRate}</span>
                                                        <span>Milestones: {peds.milestones}</span>
                                                        {peds.immunizationStatus && <span>Immuno: {peds.immunizationStatus}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Pulmonology
                                        const pulmo = presc.pulmonologyData || presc.pulmoData;
                                        if (pulmo && pulmo.vitals) {
                                            renderedSpecs.push(
                                                <div key="pulmo" className="px-6 py-3 bg-blue-50/30 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Pulmonary Profile</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>SpO2: {pulmo.vitals.spo2}%</span>
                                                        <span>RR: {pulmo.vitals.respRate}</span>
                                                        <span>Support: {pulmo.vitals.oxygenSupport}</span>
                                                        <span>mMRC: {pulmo.mmrcGrade}/4</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Endocrinology
                                        const endo = presc.endocrinologyData;
                                        if (endo && (endo.glycemic || endo.thyroid)) {
                                            renderedSpecs.push(
                                                <div key="endo" className="px-6 py-3 bg-slate-100/50 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Endocrine Dashboard</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        {endo.glycemic?.fbs && <span>FBS: {endo.glycemic.fbs}</span>}
                                                        {endo.glycemic?.hba1c && <span>HbA1c: {endo.glycemic.hba1c}%</span>}
                                                        {endo.thyroid?.tsh && <span>TSH: {endo.thyroid.tsh}</span>}
                                                        <span>BMI: {endo.bmi}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Hematology
                                        const hema = presc.hematologyData;
                                        if (hema && hema.cbc) {
                                            renderedSpecs.push(
                                                <div key="hema" className="px-6 py-3 bg-blue-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-blue-800 uppercase tracking-widest mb-1">Hematology Report</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Hb: {hema.cbc.hb}</span>
                                                        <span>TLC: {hema.cbc.tlc}</span>
                                                        <span>Plat: {hema.cbc.platelets}</span>
                                                        {hema.coagulation?.inr && <span>INR: {hema.coagulation.inr}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Oncology
                                        const onco = presc.oncologyData;
                                        if (onco && (onco.labs || onco.tnm)) {
                                            renderedSpecs.push(
                                                <div key="onco" className="px-6 py-3 bg-indigo-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-indigo-800 uppercase tracking-widest mb-1">Oncology Staging & Labs</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Stage: {onco.tnm?.stage}</span>
                                                        <span>Intent: {onco.treatment?.intent}</span>
                                                        <span>ANC: {onco.labs?.anc}</span>
                                                        {onco.toxicity?.length > 0 && <span>Toxicities: {onco.toxicity.join(', ')}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Nephrology
                                        const nephro = presc.nephrologyData;
                                        if (nephro && nephro.vitals) {
                                            renderedSpecs.push(
                                                <div key="nephro" className="px-6 py-3 bg-teal-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-teal-800 uppercase tracking-widest mb-1">Nephrology Vitals</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>BP: {nephro.vitals.systolic}/{nephro.vitals.diastolic}</span>
                                                        <span>Urine Output: {nephro.vitals.urineOutput}ml</span>
                                                        <span>Fluid Balance: {nephro.vitals.fluidBalance}ml</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Dermatology
                                        const derma = presc.dermatologyData;
                                        if (derma && derma.site) {
                                            renderedSpecs.push(
                                                <div key="derma" className="px-6 py-3 bg-violet-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-violet-800 uppercase tracking-widest mb-1">Dermatology Assessment</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Site: {derma.site}</span>
                                                        <span>Duration: {derma.duration}</span>
                                                        <span>Associated: {derma.associatedFeatures}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Neurology
                                        const neuro = presc.neurologyData || presc.neuroData;
                                        if (neuro && neuro.gcs) {
                                            renderedSpecs.push(
                                                <div key="neuro" className="px-6 py-3 bg-indigo-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-indigo-800 uppercase tracking-widest mb-1">Neurology Scan (GCS: {neuro.gcs}/15)</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Motor: {neuro.motorResponse}</span>
                                                        <span>Eyes: {neuro.eyeOpening}</span>
                                                        <span>Speech: {neuro.verbalResponse}</span>
                                                        {neuro.pupils && <span>Pupils: {neuro.pupils}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Gynaecology
                                        const gyn = presc.gynecologyData || presc.gynaecData;
                                        if (gyn && gyn.lmp) {
                                            renderedSpecs.push(
                                                <div key="gyn" className="px-6 py-3 bg-pink-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-pink-800 uppercase tracking-widest mb-1">Obstetric & Gynaec Profile</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>LMP: {gyn.lmp}</span>
                                                        <span>EDD: {gyn.edd}</span>
                                                        <span>GPLA: {gyn.gpla}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Cardiology
                                        const cardio = presc.cardiologyData;
                                        if (cardio && cardio.bpSystolic) {
                                            renderedSpecs.push(
                                                <div key="cardio" className="px-6 py-3 bg-red-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-red-800 uppercase tracking-widest mb-1">Cardiac Vitals</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>BP: {cardio.bpSystolic}/{cardio.bpDiastolic}</span>
                                                        <span>HR: {cardio.heartRate} BPM</span>
                                                        <span>Risk: {cardio.riskLevel}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Gastro
                                        const gastro = presc.gastroenterologyData || presc.gastroData;
                                        if (gastro && (gastro.bowelHabits || gastro.abdominalExam)) {
                                            renderedSpecs.push(
                                                <div key="gastro" className="px-6 py-3 bg-emerald-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest mb-1">Gastroenterology Evaluation</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Bowel Habits: {gastro.bowelHabits}</span>
                                                        <span>Jaundice: {gastro.generalExam?.jaundice || 'No'}</span>
                                                        <span>Ascites: {gastro.abdominalExam?.ascites || 'No'}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Psychiatry
                                        const psych = presc.psychiatryData;
                                        if (psych && psych.mse) {
                                            renderedSpecs.push(
                                                <div key="psych" className="px-6 py-3 bg-slate-200/50 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest mb-1">Mental State Examination</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>Mood: {psych.mse.mood}</span>
                                                        <span>Insight: {psych.mse.insight}</span>
                                                        <span>Suicide Risk: {psych.suicideRisk}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Urology
                                        const uro = presc.urologyData;
                                        if (uro && (uro.ipss?.score || uro.renal?.creatinine || uro.diagnosis)) {
                                            renderedSpecs.push(
                                                <div key="ouro" className="px-6 py-3 bg-sky-50/20 border-b border-slate-50">
                                                    <p className="text-[8px] font-black text-sky-800 uppercase tracking-widest mb-1">Urology Evaluation</p>
                                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-600">
                                                        <span>IPSS: {uro.ipss?.score || '0'} ({uro.ipss?.category || 'Mild'})</span>
                                                        <span>Creatinine: {uro.renal?.creatinine || '--'}</span>
                                                        <span>Urea: {uro.renal?.urea || '--'}</span>
                                                        {uro.pvr && <span>PVR: {uro.pvr}ml</span>}
                                                        {uro.diagnosis && <span className="text-sky-700">Assessment: {uro.diagnosis}</span>}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return renderedSpecs;
                                    })()}

                                    {/* MEDICINES */}
                                    <div className="p-0">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50/50">
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Medicine</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dosage</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {presc.medicines?.map((med: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                                                    <Pill size={14} className="text-blue-500" />
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700">{med.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{med.dosage}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-100">
                                                                {formatFrequency(med.frequency || med.freq)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500 italic">{med.duration}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* NOTES */}
                                    {(presc.notes || presc.dietAdvice?.length > 0 || presc.suggestedTests?.length > 0) && (
                                        <div className="p-6 bg-slate-50/30 border-t border-slate-50 space-y-4">
                                            {presc.notes && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor's Instructions</p>
                                                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{presc.notes}</p>
                                                </div>
                                            )}
                                            {presc.dietAdvice?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dietary Advice</p>
                                                    <p className="text-[10px] font-bold text-slate-600 uppercase">{presc.dietAdvice.filter((a:string)=>a).join(' • ')}</p>
                                                </div>
                                            )}
                                            {presc.suggestedTests?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recommended Tests</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{presc.suggestedTests.filter((t:string)=>t).join(' • ')}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary-theme text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                    >
                        Close Portal
                    </button>
                </div>
            </div>
        </div>
    );
}
