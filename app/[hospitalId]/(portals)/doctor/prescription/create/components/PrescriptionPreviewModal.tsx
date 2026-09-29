import React from 'react';
import {
    X,
    Printer,
    FileText,
    CheckCircle2
} from 'lucide-react';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { Frequency, formatFrequency } from '@/lib/frequencyUtils';

interface Medicine {
    productId?: string;
    name: string;
    form: string;
    dosage: string;
    freq: Frequency;
    duration: string;
    quantity: string;
    price: number;
    unitsPerPack?: number;
    availableUnits?: number;
    pricePerUnit?: number;
    mgPerKg?: string;
    calculatedDose?: string;
    eye?: 'BE' | 'RE' | 'LE' | string;
    dropCount?: string;
    timesPerDay?: string;
}

interface PrescriptionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: any;
    activeSpecialty: string;
    hospitalBranding: any;
    handlePrintDocument: (type: 'prescription' | 'billing') => void;
    handleFinalizeFromPreview: () => void;
    handleSendToPharma: () => void;
    sentToPharma: boolean;
}

const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
    isOpen,
    onClose,
    formData,
    activeSpecialty,
    hospitalBranding,
    handlePrintDocument,
    handleFinalizeFromPreview,
    handleSendToPharma,
    sentToPharma
}) => {
    React.useEffect(() => {
        const main = document.querySelector('main');
        if (isOpen) {
            if (main) {
                main.style.overflow = 'hidden';
                main.scrollTo({ top: 0, behavior: 'instant' });
            }
        } else {
            if (main) {
                main.style.overflow = '';
            }
        }
        return () => {
            if (main) main.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 lg:left-64 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-8 lg:p-10 animate-in fade-in duration-300">
            <div className="bg-slate-50 w-full max-w-6xl h-full max-h-[98vh] flex flex-col rounded-2xl md:rounded-[32px] shadow-2xl border border-white/20 overflow-hidden relative">
                <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                .preview-paper {
                    font-family: 'Inter', Arial, sans-serif;
                    width: 100%;
                    max-width: 210mm;
                    min-height: 297mm;
                    background: white;
                    padding: 4mm 6mm;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05);
                    position: relative;
                    margin: 0 auto;
                    color: #1e293b;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                }
                @media (min-width: 1024px) {
                    .preview-paper {
                        padding: 10mm 15mm;
                        box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05);
                    }
                }
                @media (max-width: 640px) {
                    .preview-paper {
                        padding: 3mm 4mm;
                        border-radius: 0;
                        min-height: auto;
                    }
                    .specialty-section {
                        margin-bottom: 12px !important;
                        padding: 10px !important;
                        border-radius: 12px !important;
                    }
                    .vitals-grid {
                        gap: 8px !important;
                        margin-bottom: 8px !important;
                    }
                    .text-sm-mobile {
                        font-size: 11px !important;
                    }
                    .text-xs-mobile {
                        font-size: 9px !important;
                    }
                }
                .preview-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                @media (max-width: 640px) {
                    .preview-paper {
                        padding: 15px;
                    }
                }
            `}</style>

                <div className="flex-1 overflow-auto scroll-smooth custom-scrollbar bg-slate-100/30">
                    <div className="min-w-fit w-full flex flex-col items-center gap-4 sm:gap-8 py-4 sm:py-10 px-0 sm:px-4">
                        {/* Modal Toolbar */}
                        <div className="sticky top-0 z-[75] w-full bg-white/95 backdrop-blur-md p-3 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <FileText size={20} className="text-white" />
                                </div>
                                <div className="text-center sm:text-left">
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Prescription Preview</h2>
                                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Medical Document Manifest</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="p-2.5 bg-slate-50 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all active:scale-95 border border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* The Actual "Paper" Preview */}
                        <div className="preview-paper animate-in fade-in zoom-in-95 duration-300">
                            <MainHeader initialDetails={hospitalBranding} />

                            <div className="preview-content">
                                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-[3px] border-indigo-600/10 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-[24px] sm:text-[29px] font-[900] text-indigo-700 leading-none">Rx</div>
                                    <div className="h-8 w-[1px] bg-slate-200"></div>
                                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-[3px]">Prescription</div>
                                </div>
                                <div className="text-left sm:text-right w-full sm:w-auto">
                                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{formData.doctorName}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">{formData.doctorSpecialization}</div>
                                    <div className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-[2px] bg-indigo-50 px-2 py-0.5 rounded-sm inline-block">{activeSpecialty} Portal</div>
                                </div>
                            </div>

                                <div className="mt-2 sm:mt-4 mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                {[
                                    ['Patient Name', formData.patientName, 'bg-white'],
                                    ['Age / Gender', `${formData.age || '--'} / ${formData.gender}`, 'bg-slate-50/50'],
                                    ['MRN / UHID', formData.mrn || 'N/A', 'bg-white'],
                                    ['Clinical Time', `${formData.date} @ ${formData.time || '--'}`, 'bg-slate-50/50']
                                ].map(([label, val, bg], idx) => (
                                    <div key={label} className={`p-2.5 sm:p-4 ${bg} border-b lg:border-b-0 border-slate-100 ${idx % 2 === 0 ? 'sm:border-r' : 'sm:border-r-0'} lg:border-r last:border-0`}>
                                        <div className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 sm:mb-1.5">{label}</div>
                                        <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{val}</div>
                                    </div>
                                ))}
                            </div>

                                <div className="space-y-6 flex-1">
                                {/* chief complaints & diagnosis */}
                                <div className="grid grid-cols-1 gap-4">
                                    {(formData.symptoms || formData.diagnosis) && (
                                        <div className="border-l-4 border-indigo-500 pl-4 py-1 flex flex-col md:flex-row items-start gap-4 md:gap-8">
                                            {formData.symptoms && (
                                                <div className="w-full md:flex-1">
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5">Chief Complaints</span>
                                                    <div className="text-sm font-bold text-slate-700">{formData.symptoms}</div>
                                                </div>
                                            )}
                                            {formData.diagnosis && (
                                                <div className="w-full md:flex-1 bg-indigo-50 p-3 rounded-lg border border-indigo-100/50">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Clinical Diagnosis</span>
                                                    <div className="text-sm font-black text-indigo-900">{formData.diagnosis}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Specialty Clinical Sections */}
                                {activeSpecialty.toUpperCase().includes('CARDIO') && formData.cardiologyData && (() => {
                                    const c = formData.cardiologyData;
                                    const bp = c.vitals?.bp || (c.bpSystolic ? `${c.bpSystolic}/${c.bpDiastolic}` : 'N/A');
                                    const hr = c.vitals?.hr || c.heartRate || '--';
                                    return (
                                        <div className="specialty-section mb-[12px] md:mb-[25px] p-[12px] md:p-[20px] border-2 border-red-100 rounded-[24px] bg-[#fffcfc] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-red-200 mb-3 md:mb-4 pb-2">
                                                <span className="text-[9px] md:text-[11px] font-black uppercase text-red-800 tracking-wider">Cardiovascular Profile</span>
                                                <span className="text-[8px] md:text-[10px] font-black text-white bg-red-600 px-2 md:px-3 py-1 rounded-lg">NYHA: {c.nyhaClass || 'I'}</span>
                                            </div>
                                            <div className="vitals-grid grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-2">
                                                <div className="bg-white p-3 md:p-4 rounded-xl border border-red-50 shadow-sm relative overflow-hidden">
                                                    <span className="text-[7px] md:text-[8px] font-black text-red-600 uppercase block mb-1 md:mb-2">Hemodynamics</span>
                                                    <div className="flex items-end gap-1 mb-1">
                                                        <span className="text-[16px] md:text-[20px] font-black text-slate-900">{bp}</span>
                                                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold mb-0.5 md:mb-1">mmHg</span>
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-700">Heart Rate: <span className="text-red-600">{hr} bpm</span> ({c.vitals?.rhythm || c.rhythm || 'Regular'})</div>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-red-50 shadow-sm">
                                                    <span className="text-[8px] font-black text-red-600 uppercase block mb-2">Auscultation & Rhythm</span>
                                                    <div className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                                        ECG: <span className="text-slate-900">{c.ecg?.findings || c.ecgType || 'Normal Sinus'}</span><br/>
                                                        S1/S2: <span className="text-slate-900">{c.auscultation?.s1s2 || `${c.s1}/${c.s2}`}</span> | Murmur: <span className="text-red-700">{c.auscultation?.murmur || (c.murmur === 'Present' ? c.murmurType : 'None')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(c.riskFactors || []).length > 0 && (
                                                <div className="mt-4 flex gap-2">
                                                    {c.riskFactors.map((f: string) => <span key={f} className="text-[8px] font-black px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">{f}</span>)}
                                                </div>
                                            )}
                                            {c.notes && <div className="mt-[10px] text-[9px] text-slate-500 italic border-t border-dashed border-red-100 pt-2">Notes: {c.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('GASTRO') && formData.gastroData && (() => {
                                    const g = formData.gastroData;
                                    return (
                                        <div className="specialty-section mb-[12px] md:mb-[25px] p-[12px] md:p-[18px] border-2 border-emerald-100 rounded-[20px] bg-[#f0fdf4] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-emerald-200 mb-3 md:mb-4 pb-2">
                                                <span className="text-[9px] md:text-[11px] font-black uppercase text-emerald-800 tracking-wider">Gastroenterology Profile</span>
                                                <span className="text-[8px] md:text-[10px] font-black text-white bg-emerald-600 px-2 md:px-3 py-1 rounded-lg">{g.diagnosis || 'Clinical Profile'}</span>
                                            </div>
                                            <div className="vitals-grid grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-2">
                                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-2">Clinical Presentation</span>
                                                    <div className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                                        Symptoms: <span className="text-slate-900">{g.symptoms?.join(', ') || 'Normal'}</span><br/>
                                                        Habits: <span className="text-emerald-700">{g.bowelHabits}</span> | Stool: <span className="text-emerald-700 font-black">{g.stoolType}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-2">Physical Examination</span>
                                                    <div className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                                        Palpation: <span className="text-slate-900">Liver {g.liver?.status} | Spleen {g.spleen?.status}</span><br/>
                                                        Bowel: <span className="text-slate-900">{g.bowelSounds} Sounds | {g.distention} Distention</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {g.painLocation && (
                                                <div className="mt-4 p-3 bg-white rounded-xl border border-dashed border-emerald-200">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-1">Pain & Examination</span>
                                                    <div className="text-[11px] font-black text-slate-800">{g.painLocation} Area &rarr; {g.painType} ({g.tenderness} Tenderness)</div>
                                                    <div className="text-[10px] text-emerald-800 font-bold mt-1">Abdominal Guarding: {g.guarding || 'None'}</div>
                                                </div>
                                            )}
                                            {g.notes && (
                                                <div className="mt-4 text-[10px] text-slate-500 italic">
                                                    <strong>Clinical Notes:</strong> {g.notes}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('PSYCH') && formData.psychiatryData && (() => {
                                    const p = formData.psychiatryData;
                                    const mse = p.mse || {};
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-indigo-100 rounded-[24px] bg-[#f5f3ff] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-indigo-200 mb-4 pb-2">
                                                <span className="text-[11px] font-black uppercase text-indigo-800 tracking-wider">Psychiatric Clinical Evaluation</span>
                                                <span className={`text-[10px] font-black px-4 py-1 rounded-full ${p.suicideRisk === 'High' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>Risk: {p.suicideRisk?.toUpperCase()}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
                                                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase block mb-3">Mental Status (MSE)</span>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">Mood</div><div className="text-xs font-black text-slate-900">{mse.mood || 'Euthymic'}</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">Insight</div><div className="text-xs font-black text-indigo-600">{mse.insight}/5</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">Speech</div><div className="text-xs font-bold text-slate-700">{mse.speech || 'Normal'}</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">Judgment</div><div className="text-xs font-bold text-slate-700">{mse.judgment}/5</div></div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase block mb-3">Clinimetry & Risk</span>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-[10px] font-bold"><span>PHQ-9 Score:</span> <span className="text-indigo-700 font-black">{p.scores?.phq9 || '0'}</span></div>
                                                        <div className="flex justify-between items-center text-[10px] font-bold"><span>GAD-7 Score:</span> <span className="text-indigo-700 font-black">{p.scores?.gad7 || '0'}</span></div>
                                                        <div className={`p-1.5 rounded text-[9px] font-black text-center ${p.severity === 'Severe' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>Current Severity: {p.severity}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {mse.thought?.length > 0 && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <span className="text-[8px] font-black text-red-600 uppercase block mb-1">Thought / Perception Alerts</span>
                                                    <div className="text-[10px] font-black text-red-900 italic tracking-tight">{mse.thought.join(' • ')}</div>
                                                </div>
                                            )}
                                             <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <div className="p-3 bg-white rounded-xl border border-indigo-100 italic text-[10px] text-slate-700">
                                                     <strong>Main Complaints:</strong><br/>{p.complaints || 'None listed'}
                                                 </div>
                                                 <div className="p-3 bg-white rounded-xl border border-indigo-100 text-[10px] text-slate-700 font-bold">
                                                     Substance Use: {p.substanceUse?.join(', ') || 'None'}<br/>
                                                     Compliance: {p.medicationCompliance || 'N/A'}<br/>
                                                     Counseling: {p.counseling || 'Not advised'}
                                                 </div>
                                             </div>
                                             {p.notes && <div className="mt-4 text-[10px] text-slate-500 italic"><strong>Notes:</strong> {p.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('DERMA') && formData.dermatologyData && (() => {
                                    const d = formData.dermatologyData;
                                    const location = Array.isArray(d.location) ? d.location : (d.location ? [d.location] : []);
                                    const color = Array.isArray(d.color) ? d.color : (d.color ? [d.color] : []);
                                    const surface = Array.isArray(d.surfaceChanges) ? d.surfaceChanges : (d.surfaceChanges ? [d.surfaceChanges] : []);

                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-rose-100 rounded-[20px] bg-[#fff5f5] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-rose-200 mb-4 pb-2">
                                                <span className="text-[11px] font-black uppercase text-rose-800 tracking-wider">Dermatological Findings Portfolio</span>
                                                <span className="text-[10px] font-black text-white bg-rose-600 px-3 py-1 rounded-lg">{location.join(', ') || 'Diffuse'}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
                                                <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase block mb-2">Lesion Profile</span>
                                                    <div className="text-[15px] font-black text-slate-900 leading-tight mb-1">{d.lesionType || 'N/A'}{d.lesionCount ? ` (${d.lesionCount})` : ''}</div>
                                                    <div className="text-[10px] font-bold text-rose-700">Size: {d.size || 'N/A'}</div>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase block mb-2">Clinical Features</span>
                                                    <div className="text-[11px] font-bold text-slate-800 leading-relaxed">
                                                        Distribution: <span className="text-slate-900">{d.distribution || 'N/A'}</span><br/>
                                                        Color: <span className="text-slate-900">{color.join(', ') || 'N/A'}</span><br/>
                                                        Surface: <span className="text-slate-900">{surface.join(', ') || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {(d.itchingSeverity !== 'None' || d.painSeverity !== 'None' || d.burning) && (
                                                <div className="mt-4 p-3 bg-white/50 rounded-xl border border-rose-50 flex gap-4">
                                                    {d.itchingSeverity !== 'None' && (
                                                        <div>
                                                            <span className="text-[7px] font-black text-rose-500 uppercase block">Itching</span>
                                                            <span className="text-[10px] font-black text-rose-900">{d.itchingSeverity}</span>
                                                        </div>
                                                    )}
                                                    {d.painSeverity !== 'None' && (
                                                        <div>
                                                            <span className="text-[7px] font-black text-rose-500 uppercase block">Pain</span>
                                                            <span className="text-[10px] font-black text-rose-900">{d.painSeverity}</span>
                                                        </div>
                                                    )}
                                                    {d.burning && (
                                                        <div>
                                                            <span className="text-[7px] font-black text-rose-500 uppercase block">Burning</span>
                                                            <span className="text-[10px] font-black text-rose-900">Yes</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-[7px] font-black text-rose-500 uppercase block">Duration</span>
                                                        <span className="text-[10px] font-black text-rose-900">{d.duration || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {d.provisionalDiagnosis && (
                                                <div className="mt-4 pt-3 border-t border-dashed border-rose-200">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-[8px] font-black text-rose-600 uppercase block mb-1">Provisional Diagnosis</span>
                                                            <div className="text-[12px] font-black text-rose-900">{d.provisionalDiagnosis}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[8px] font-black text-rose-600 uppercase block mb-1">History</span>
                                                            <div className="text-[9px] font-bold text-slate-500">{d.onset} Onset | {d.progression}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('SURGERY') && formData.generalSurgeryData && (() => {
                                    const s = formData.generalSurgeryData;
                                    const abd = s.abdomen || {};
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-slate-200 rounded-[24px] bg-slate-50/50 shadow-sm border-dashed">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-slate-300 mb-4 pb-2">
                                                <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">General Surgical Evaluation</span>
                                                <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1 rounded-lg">Trial/Plan: {s.plan || 'Conservative'}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">Abdominal Examination</span>
                                                    <div className="text-[11px] font-bold text-slate-800 leading-relaxed">
                                                        Tenderness: <span className={abd.tenderness !== 'None' ? 'text-red-600 font-black' : 'text-emerald-600'}>{abd.tenderness || 'None'}</span><br/>
                                                        Guarding: <span className="text-slate-900">{abd.guarding || 'None'}</span> | Bowel: <span className="text-slate-900">{abd.bowelSounds}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">Specific Site Profiling</span>
                                                    <div className="text-[11px] font-bold text-slate-800 leading-tight">
                                                        Hernia: <span className="text-slate-900">{s.hernia?.present ? `${s.hernia.site} (${s.hernia.type})` : 'No evidence'}</span><br/>
                                                        Wound Status: <span className={s.surgicalSite?.infection ? 'text-red-600 font-black' : 'text-slate-900'}>{s.surgicalSite?.dressing || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {s.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Notes: {s.notes}</div>}
                                            {s.vitals?.bp && <div className="mt-3 text-[9px] font-black text-slate-400 text-center uppercase tracking-widest">Pre-Assessment Vitals: {s.vitals.bp} mmHg | {s.vitals.pulse} bpm</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('PEDIATRI') && formData.pediatricData && (() => {
                                    const peds = formData.pediatricData;
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-pink-100 rounded-[16px] bg-pink-50/20">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-pink-200 mb-[15px] pb-[8px]">
                                                <span className="text-[10px] font-[900] uppercase text-pink-700 tracking-[1px]">Pediatric Growth & Assessment</span>
                                                <span className="text-[12px] font-[900] text-pink-600 bg-pink-100 px-[10px] py-[4px] rounded-[6px]">Weight: {peds.weight} kg</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-[15px]">
                                                <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Temperature</span><span className="text-[13px] font-[800] text-slate-800">{peds.temperature}°F</span></div>
                                                <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Heart Rate</span><span className="text-[13px] font-[800] text-slate-800">{peds.heartRate || '--'} BPM</span></div>
                                                <div><span className="text-[8px] text-pink-800 font-[800] uppercase block">Resp Rate</span><span className="text-[13px] font-[800] text-slate-800">{peds.respRate || '--'} min</span></div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px] border-t border-dashed border-pink-200 pt-[12px]">
                                                <div>
                                                    <div className="text-[8px] font-[800] text-pink-700 uppercase mb-[5px]">Development</div>
                                                    <div className="text-[11px] font-[700] text-slate-700 whitespace-pre-wrap">Milestones: <span className="text-pink-600">{peds.milestones || 'Appropriate'}</span></div>
                                                    <div className="text-[10px] text-slate-500 italic mt-1">{peds.milestoneNotes}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-[800] text-pink-700 uppercase mb-[5px]">Immunization</div>
                                                    <div className="text-[11px] font-[800] text-slate-900">{peds.immunizationStatus || 'Up-to-Date'}</div>
                                                    {peds.dueVaccines?.length > 0 && <div className="text-[9px] font-bold text-red-600 mt-1">Due: {peds.dueVaccines.join(', ')}</div>}
                                                </div>
                                            </div>
                                            {(peds.symptoms?.length > 0 || peds.redFlags?.length > 0) && (
                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {peds.symptoms?.length > 0 && (
                                                        <div className="p-2 bg-white rounded-lg border border-pink-100">
                                                            <span className="text-[7px] font-black text-pink-500 uppercase block">Symptoms</span>
                                                            <div className="text-[10px] font-bold text-slate-700">{peds.symptoms.join(', ')}</div>
                                                        </div>
                                                    )}
                                                    {peds.redFlags?.length > 0 && (
                                                        <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                                                            <span className="text-[7px] font-black text-red-600 uppercase block">Red Flags</span>
                                                            <div className="text-[10px] font-black text-red-900">{peds.redFlags.join(', ')}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {peds.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Notes: {peds.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('RADIO') && formData.radiologyOrder && (() => {
                                    const r = formData.radiologyOrder;
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-slate-200 rounded-[20px] bg-slate-50/30">
                                            <div className="flex justify-between items-center border-b-[2px] border-slate-300 mb-[15px] pb-[10px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[10px] h-[10px] bg-indigo-600 rounded-full animate-pulse"></div>
                                                    <span className="text-[12px] font-[900] uppercase text-slate-800 tracking-[1.5px]">Radiology Imaging Order</span>
                                                </div>
                                                <span className={`text-[10px] font-[900] px-[12px] py-[4px] rounded-[6px] ${r.priority === 'Emergency' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>{r.priority?.toUpperCase()} PRIORITY</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                        <span className="text-[8px] font-[800] text-indigo-600 uppercase block mb-1">Target Modality</span>
                                                        <div className="text-[18px] font-[900] text-slate-900">{r.modality}</div>
                                                        <div className="text-[11px] font-[700] text-indigo-600 mt-1">{r.bodyPart}</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                        <span className="text-[8px] font-[800] text-emerald-600 uppercase block mb-1">Safety Clearance</span>
                                                        <div className="flex gap-4 mt-1 flex-wrap">
                                                            <div className={`text-[9px] font-[900] px-2 py-1 rounded-md ${r.contrast?.requested ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>CONTRAST: {r.contrast?.requested ? 'YES' : 'NO'}</div>
                                                            <div className={`text-[9px] font-[900] px-2 py-1 rounded-md ${r.safety?.pregnancy ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>PREGNANCY: {r.safety?.pregnancy ? 'YES' : 'NO'}</div>
                                                            <div className={`text-[9px] font-[900] px-2 py-1 rounded-md ${r.safety?.implants ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>IMPLANTS+: {r.safety?.implants ? 'YES' : 'NO'}</div>
                                                        </div>
                                                        {r.contrast?.requested && <div className="text-[9px] mt-2 text-amber-800 font-bold">Creatinine: {r.contrast.creatinine} | Allergy: {r.contrast.allergy ? 'YES' : 'NO'}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 p-4 bg-white rounded-2xl border border-indigo-50">
                                                <span className="text-[8px] font-black text-indigo-600 uppercase block mb-1">Clinical Indication</span>
                                                <div className="text-[11px] font-bold text-slate-800 line-clamp-2 italic">"{r.clinicalIndication || 'No clinical justification provided.'}"</div>
                                            </div>
                                            {r.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Order Notes: {r.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('NEPHRO') && formData.nephroData && (() => {
                                    const n = formData.nephroData;
                                    const creat = parseFloat(n.creatinine) || 0;
                                    const egfr = parseFloat(n.egfr) || 0;
                                    const k = parseFloat(n.electrolytes?.potassium) || 0;
                                    const assessments: string[] = [];
                                    if (creat > 5) assessments.push('SEVERE RENAL FAILURE — Urgent Consult');
                                    else if (creat > 1.5) assessments.push('Elevated Creatinine Detected');
                                    if (egfr > 0 && egfr < 15) assessments.push('🚨 STAGE 5 CKD / ESRD — Dialysis Support');
                                    if (k > 5.5) assessments.push('🚨 HYPERKALEMIA — Cardiac Monitoring Indicated');

return (
                                        <div className="mb-[25px] p-[20px] border-2 border-indigo-100 rounded-[24px] bg-[#f8fbff] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-indigo-200 mb-4 pb-2">
                                                <span className="text-[11px] font-black uppercase text-indigo-800 tracking-wider">Renal & Electrolyte Clearance Profile</span>
                                                <span className="text-[10px] font-black text-white bg-indigo-700 px-3 py-1 rounded-lg">Staging: {n.ckdStage || 'Evaluation'}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-xl border border-indigo-50 text-center">
                                                    <div className="text-[7px] text-slate-400 font-bold uppercase">Serum Creatinine</div>
                                                    <div className={`text-[16px] font-black ${creat > 1.5 ? 'text-red-600' : 'text-slate-900'}`}>{n.creatinine || '--'} <small className="text-[8px]">mg/dL</small></div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-indigo-50 text-center">
                                                    <div className="text-[7px] text-slate-400 font-bold uppercase">eGFR (MDRD)</div>
                                                    <div className={`text-[16px] font-black ${egfr < 60 && egfr > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{n.egfr || '--'}</div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-indigo-50 text-center">
                                                    <div className="text-[7px] text-slate-400 font-bold uppercase">Blood Urea</div>
                                                    <div className="text-[16px] font-black text-slate-900">{n.urea || '--'}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase block mb-1">Electrolytes Detail</span>
                                                    <div className="text-[10px] font-bold text-slate-700 flex justify-between">
                                                        <span>Sodium: <b className="text-slate-900">{n.electrolytes?.sodium}</b></span>
                                                        <span>Potassium: <b className={k > 5.0 ? 'text-red-600' : 'text-slate-900'}>{n.electrolytes?.potassium}</b></span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase block mb-1">Clinical Signs</span>
                                                    <div className="text-[10px] font-bold text-slate-900">Urine: {n.urine?.output} | Edema: {n.urine?.edema}</div>
                                                </div>
                                            </div>

                                            {assessments.length > 0 && (
                                                <div className="bg-red-50 p-2 rounded-lg border border-red-100 mt-4">
                                                    {assessments.map((a, i) => <div key={i} className="text-[9px] font-black text-red-900 uppercase tracking-tighter">&rarr; {a}</div>)}
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase block mb-1">Dialysis & Access</span>
                                                    <div className="text-[10px] font-bold text-slate-700">
                                                        Status: <b className="text-indigo-900">{n.dialysis?.status}</b><br/>
                                                        Access: {n.dialysis?.access} | Last: {n.dialysis?.lastSession}
                                                    </div>
                                                </div>
                                                {n.notes && (
                                                    <div className="p-3 bg-white rounded-xl border border-indigo-100 italic text-[10px] text-slate-400">
                                                        Nephro Notes: {n.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {(activeSpecialty.toUpperCase().includes('NEURO')) && formData.neuroData && (() => {
                                    const n = formData.neuroData;
                                    const gcs = n.gcs || { eye: 4, verbal: 5, motor: 6 };
                                    const totalGcs = (parseInt(gcs.eye) || 4) + (parseInt(gcs.verbal) || 5) + (parseInt(gcs.motor) || 6);
                                    const mp = n.motorPower || { ru: '5', lu: '5', rl: '5', ll: '5' };
                                    
                                    return (
                                        <div className="mb-[25px] p-[20px] border-2 border-violet-100 rounded-[28px] bg-[#fbfaff] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[2px] border-violet-200 mb-4 pb-2">
                                                <span className="text-[11px] font-black uppercase text-violet-800 tracking-wider">Neurological Status & GCS Review</span>
                                                <span className={`text-[12px] font-black ${totalGcs < 8 ? 'text-red-600 animate-pulse' : 'text-violet-700'} bg-violet-100 px-4 py-1 rounded-full`}>Total GCS: {totalGcs}/15</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                <div className="space-y-4">
                                                    <div className="bg-white p-3 rounded-2xl border border-violet-50 shadow-sm">
                                                        <span className="text-[8px] font-black text-violet-600 uppercase block mb-2">Motor Power Distribution</span>
                                                        <div className="grid grid-cols-2 gap-2 text-center">
                                                            <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="text-[7px] text-slate-400 font-bold">RU/LU</div>
                                                                <div className="text-[12px] font-black text-slate-900">{mp.ru}/{mp.lu}</div>
                                                            </div>
                                                            <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="text-[7px] text-slate-400 font-bold">RL/LL</div>
                                                                <div className="text-[12px] font-black text-slate-900">{mp.rl}/{mp.ll}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl border border-violet-100 shadow-sm relative overflow-hidden">
                                                    <span className="text-[8px] font-black text-violet-600 uppercase block mb-2">Clinical Assessment</span>
                                                    <div className="text-[11px] font-bold text-slate-700 leading-tight space-y-2">
                                                        <div>Mental: <span className="text-violet-800 font-black">{n.mentalStatus || 'Alert'}</span></div>
                                                        <div>Speech: <span className="text-slate-900">{n.speech || 'Normal'}</span></div>
                                                        <div>Cranial Nerves: <span className="text-slate-900">{n.cranialNerves || 'Intact'}</span></div>
                                                        <div>Sensory: <span className="text-slate-900">{n.sensory || 'Intact'}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {n.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Neuro Notes: {n.notes}</div>}

                                            {totalGcs < 8 && (
                                                <div className="bg-red-600 text-white p-2 rounded-xl text-center text-[10px] font-black mt-4 uppercase tracking-[2px] shadow-lg shadow-red-200">
                                                    Critical: GCS &lt; 8 — Airway Protection Protocol
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('URO') && formData.urologyData && (() => {
                                    const u = formData.urologyData;
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-sky-100 rounded-[16px] bg-sky-50/20">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-sky-200 mb-[14px] pb-[8px]">
                                                <span className="text-[10px] font-[900] uppercase text-sky-800 tracking-[1px]">Urology Assessment</span>
                                                <span className="text-[11px] font-[900] text-sky-700 bg-sky-100 px-[12px] py-[4px] rounded-[6px]">IPSS Score: {u.ipss?.score || '--'}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                                                <div><span className="text-[8px] font-bold text-sky-600 uppercase block">Creatinine</span><div className="text-sm font-bold text-slate-800">{u.renal?.creatinine || '--'} mg/dL</div></div>
                                                <div><span className="text-[8px] font-bold text-sky-600 uppercase block">PVR Volume</span><div className="text-sm font-bold text-slate-800">{u.pvr || '--'} ml</div></div>
                                                <div><span className="text-[8px] font-bold text-sky-600 uppercase block">Prostate Size</span><div className="text-sm font-bold text-slate-800">{u.prostate?.size || 'Normal'}</div></div>
                                            </div>
                                            {u.catheter?.present && (
                                                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 mb-2">
                                                    <span className="text-[8px] font-black text-amber-600 uppercase">Catheter In-Situ</span>
                                                    <div className="text-[10px] font-bold text-amber-900">{u.catheter.type} | Duration: {u.catheter.duration}</div>
                                                </div>
                                            )}
                                            {u.notes && <div className="mt-1 text-[10px] text-slate-400 italic">Uro Notes: {u.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {(activeSpecialty.toUpperCase().includes('ORTHO')) && formData.orthoData && (() => {
                                    const o = formData.orthoData;
                                    const pain = o.pain?.score || 0;
                                    const motor = o.motorPower || 5;
                                    const assessments: string[] = [];
                                    
                                    if (pain >= 8) assessments.push('SEVERE PAIN — Urgent analgesia titration');
                                    if (o.exam?.deformity === 'Present') assessments.push('DEFORMITY DETECTED — Possible Fracture');
                                    if (o.neurovascular?.pulse !== 'Normal') assessments.push('🚨 NEUROVASCULAR ALERT: Check distal circulation');
                                    if (motor < 5) assessments.push(`Motor Deficit: Grade ${motor}/5`);
                                    
                                    return (
                                        <div className="mb-[25px] p-[20px] border-2 border-orange-100 rounded-[24px] bg-[#fffaf5] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-orange-200 mb-4 pb-2">
                                                <span className="text-[10px] font-black uppercase text-orange-900 tracking-wider">Orthopedic Examination Profile</span>
                                                <span className="text-[11px] font-black text-white bg-orange-600 px-3 py-1 rounded-lg">{o.side} {o.joint}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-xl border border-orange-100">
                                                    <span className="text-[8px] font-black text-orange-600 uppercase block mb-2">Pain & Functional Status</span>
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Pain</div>
                                                            <div className={`text-[18px] font-black ${pain >= 7 ? 'text-red-600' : 'text-slate-900'}`}>{pain}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Type</div>
                                                            <div className="text-xs font-bold text-orange-800">{o.pain?.type?.substring(0, 8) || 'Normal'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">ROM</div>
                                                            <div className={`text-xs font-black ${o.rom === 'Restricted' ? 'text-red-600' : 'text-emerald-600'}`}>{o.rom}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-orange-100">
                                                    <span className="text-[8px] font-black text-orange-600 uppercase block mb-2">Neurovascular & Motor</span>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Motor</div>
                                                            <div className="text-[15px] font-black text-slate-900">{motor}/5</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Pulse</div>
                                                            <div className={`text-xs font-black ${o.neurovascular?.pulse === 'Normal' ? 'text-emerald-600' : 'text-red-600'}`}>{o.neurovascular?.pulse}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                                {[
                                                    ['Swelling', o.exam?.swelling],
                                                    ['Tenderness', o.exam?.tenderness],
                                                    ['Deformity', o.exam?.deformity],
                                                    ['Spasm', o.exam?.spasm]
                                                ].map(([l, v]) => (
                                                    <div key={l} className="bg-white/50 p-2 rounded-lg border border-orange-50 text-center">
                                                        <div className="text-[7px] text-slate-400 font-bold uppercase">{l}</div>
                                                        <div className="text-[9px] font-black text-slate-900">{v || 'No'}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {(o.imaging?.xray || o.imaging?.mri) && (
                                                <div className="mb-4 p-3 bg-white rounded-xl border border-dashed border-orange-200">
                                                    <span className="text-[8px] font-black text-orange-600 uppercase block mb-1">Imaging Insights</span>
                                                    <div className="text-[10px] space-y-1">
                                                        {o.imaging.xray && <div><span className="font-bold text-slate-500">X-Ray:</span> <span className="font-black">{o.imaging.xray}</span></div>}
                                                        {o.imaging.mri && <div><span className="font-bold text-slate-500">MRI:</span> <span className="font-black">{o.imaging.mri}</span></div>}
                                                    </div>
                                                </div>
                                            )}

                                            {assessments.length > 0 && (
                                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                                                    <span className="text-[8px] font-black text-red-600 uppercase block mb-2">Musculoskeletal Assessment</span>
                                                    {assessments.map((a, i) => <div key={i} className="text-[10px] font-black text-red-900">&rarr; {a}</div>)}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mt-2 px-1">
                                                <span className="text-[11px] font-black text-slate-900 italic underline decoration-orange-200 decoration-2">Impression: {o.diagnosis || 'Pending Eval'}</span>
                                                {o.notes && <span className="text-[9px] text-slate-500 font-bold">Ortho Notes: {o.notes}</span>}
                                            </div>
                                        </div>
                                    );
                                })()}

                                 {(activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE')) && formData.ophthaData && (() => {
                                    const o = formData.ophthaData;
                                    const iopOD = parseFloat(o.iop?.od) || 0;
                                    const iopOS = parseFloat(o.iop?.os) || 0;
                                    const assessments: string[] = [];
                                    
                                    if (iopOD > 21 || iopOS > 21) assessments.push('🚨 ELEVATED IOP — Possible Glaucoma');
                                    if (o.vision?.od?.unaided === 'PL+' || o.vision?.os?.unaided === 'PL+') assessments.push('CRITICAL: Extremely Low Vision Detected');
                                    const isMatch = (field: any, val: string) => typeof field === 'string' ? field === val : (field?.re === val || field?.le === val);
                                    if (isMatch(o.slitLamp?.cornea, 'Ulcer')) assessments.push('🚨 EMERGENCY: Corneal Ulcer Detected');
                                    if (isMatch(o.fundus?.retina, 'Detachment')) assessments.push('🚨 EMERGENCY: Retinal Detachment suspected');

                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-emerald-100 rounded-[20px] bg-emerald-50/20 shadow-sm transition-all duration-300 hover:shadow-md">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-emerald-200 mb-4 pb-2">
                                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Ophthalmic Examination Report</span>
                                                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">Clinical Detail: Full Exam</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-2">Vision Assessment (Snellen)</span>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Right Eye (OD)</div>
                                                            <div className="text-xs font-black text-slate-900">{o.vision?.od?.unaided} &rarr; {o.vision?.od?.corrected || 'NC'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Left Eye (OS)</div>
                                                            <div className="text-xs font-black text-slate-900">{o.vision?.os?.unaided} &rarr; {o.vision?.os?.corrected || 'NC'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-2">Intraocular Pressure (IOP)</span>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">OD</div>
                                                            <div className={`text-[15px] font-black ${iopOD > 21 ? 'text-red-600' : 'text-slate-900'}`}>{o.iop?.od || '--'} <small className="text-[8px]">mmHg</small></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">OS</div>
                                                            <div className={`text-[15px] font-black ${iopOS > 21 ? 'text-red-600' : 'text-slate-900'}`}>{o.iop?.os || '--'} <small className="text-[8px]">mmHg</small></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {(o.refraction?.od?.distant?.sph || o.refraction?.os?.distant?.sph || o.refraction?.od?.near?.sph || o.refraction?.os?.near?.sph) && (
                                                <div className="mb-4 p-3 bg-white rounded-xl border border-sky-100 shadow-sm overflow-x-auto">
                                                    <span className="text-[8px] font-black text-sky-700 uppercase block mb-2">Refraction Grid</span>
                                                    <div className="flex flex-col gap-2 text-[11px] font-bold min-w-[300px]">
                                                        <div className="text-slate-700 whitespace-nowrap">OD Distant: SPH {o.refraction.od?.distant?.sph || '0'} / CYL {o.refraction.od?.distant?.cyl || '0'} / Axis {o.refraction.od?.distant?.axis || '0'}°</div>
                                                        <div className="text-slate-700 whitespace-nowrap">OS Distant: SPH {o.refraction.os?.distant?.sph || '0'} / CYL {o.refraction.os?.distant?.cyl || '0'} / Axis {o.refraction.os?.distant?.axis || '0'}°</div>
                                                        {(o.refraction.od?.near?.sph || o.refraction.os?.near?.sph) && (
                                                            <>
                                                                <div className="text-slate-700 whitespace-nowrap mt-1 border-t border-slate-100 pt-1">OD Near: SPH {o.refraction.od.near.sph || '0'} / CYL {o.refraction.od.near.cyl || '0'} / Axis {o.refraction.od.near.axis || '0'}°</div>
                                                                <div className="text-slate-700 whitespace-nowrap">OS Near: SPH {o.refraction.os.near?.sph || '0'} / CYL {o.refraction.os.near?.cyl || '0'} / Axis {o.refraction.os.near?.axis || '0'}°</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="p-3 bg-white rounded-xl border border-emerald-100">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-1">Slit Lamp Exam</span>
                                                    <div className="text-[10px] font-bold text-slate-700">
                                                        {['Conjunctiva', 'Cornea', 'Anterior Chamber', 'Lens'].map(key => {
                                                            const k = key.charAt(0).toLowerCase() + key.slice(1).replace(' ', '');
                                                            const v = o.slitLamp?.[k as keyof typeof o.slitLamp];
                                                            if (!v || (typeof v === 'object' && !v.re && !v.le)) return null;
                                                            if (typeof v === 'string') return <div key={key}>{key}: {v}</div>;
                                                            return <div key={key}>{key}: {v.re ? `RE ${v.re}` : ''} {v.le ? `LE ${v.le}` : ''}</div>;
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-emerald-100">
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase block mb-1">Fundus & Posterior Segment</span>
                                                    <div className="text-[10px] font-bold text-slate-700">
                                                        {['Retina', 'Optic Disc', 'Macula'].map(key => {
                                                            const k = key.charAt(0).toLowerCase() + key.slice(1).replace(' ', '');
                                                            const v = o.fundus?.[k as keyof typeof o.fundus];
                                                            if (!v || (typeof v === 'object' && !v.re && !v.le)) return null;
                                                            if (typeof v === 'string') return <div key={key}>{key}: {v}</div>;
                                                            return <div key={key}>{key}: {v.re ? `RE ${v.re}` : ''} {v.le ? `LE ${v.le}` : ''}</div>;
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {assessments.length > 0 && (
                                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                                                    <span className="text-[8px] font-black text-red-600 uppercase block mb-2">Clinical Assessment</span>
                                                    <div className="space-y-1">
                                                        {assessments.map((a, i) => <div key={i} className="text-[10px] font-black text-red-900">&rarr; {a}</div>)}
                                                    </div>
                                                </div>
                                            )}

                                            {o.notes && <div className="mt-4 text-[10px] text-slate-400 italic">Ophtha Notes: {o.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {(activeSpecialty.toUpperCase().includes('GYNAE') || activeSpecialty.toUpperCase().includes('GYNE') || activeSpecialty.toUpperCase().includes('OBST')) && formData.gynaecData && (() => {
                                    const gyn = formData.gynaecData;
                                    const obs = gyn.obstetric || {};
                                    const vitals = gyn.vitals || {};
                                    const obsEx = gyn.obstetricExam || {};
                                    const fhr = parseInt(obsEx.fetalHeartRate);
                                    
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-pink-100 rounded-[16px] bg-pink-50/10">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-pink-200 mb-[14px] pb-[8px]">
                                                <span className="text-[10px] font-[900] uppercase text-pink-800 tracking-[1px]">Gynaecology / Obstetric Report</span>
                                                <span className="text-[11px] font-[900] text-pink-700 bg-pink-100 px-[10px] py-[4px] rounded-[6px]">{gyn.pregnant === 'Yes' ? `Pregnant (${gyn.gestationalAge} wks)` : 'Non-Pregnant'}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                                <div>
                                                    <span className="text-[8px] font-bold text-pink-600 block uppercase">LMP</span>
                                                    <div className="text-[12px] font-black text-slate-800">{gyn.lmp ? new Date(gyn.lmp).toLocaleDateString('en-GB') : 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-bold text-pink-600 block uppercase">G P L A</span>
                                                    <div className="text-[13px] font-black text-slate-800">G{obs.gravida} P{obs.para} L{obs.living} A{obs.abortions}</div>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-bold text-pink-600 block uppercase">Cycle</span>
                                                    <div className="text-[11px] font-bold text-slate-700">{gyn.cycleRegularity} {gyn.cycleLength && `/ ${gyn.cycleLength}d`}</div>
                                                </div>
                                            </div>

                                            {gyn.pregnant === 'Yes' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-white p-3 rounded-xl border border-pink-100">
                                                    <div><span className="text-[8px] font-bold text-purple-600 uppercase">EDD</span><div className="text-xs font-black">{gyn.edd ? new Date(gyn.edd).toLocaleDateString('en-GB') : 'N/A'}</div></div>
                                                    <div><span className="text-[8px] font-bold text-purple-600 uppercase">Fetal Position</span><div className="text-xs font-bold">{obsEx.fetalPosition || 'N/A'}</div></div>
                                                    <div><span className="text-[8px] font-bold text-purple-600 uppercase">FHR</span><div className={`text-xs font-black ${fhr < 110 || fhr > 160 ? 'text-rose-600' : 'text-emerald-600'}`}>{obsEx.fetalHeartRate} bpm</div></div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                {vitals.bp && <div><span className="text-[8px] text-pink-600 font-bold block">BP</span><span className="text-[10px] font-black">{vitals.bp}</span></div>}
                                                {vitals.pulse && <div><span className="text-[8px] text-pink-600 font-bold block">Pulse</span><span className="text-[10px] font-black">{vitals.pulse}</span></div>}
                                                {vitals.weight && <div><span className="text-[8px] text-pink-600 font-bold block">Weight</span><span className="text-[10px] font-black">{vitals.weight}kg</span></div>}
                                                {vitals.temperature && <div><span className="text-[8px] text-pink-600 font-bold block">Temp</span><span className="text-[10px] font-black">{vitals.temperature}°F</span></div>}
                                            </div>
                                            {gyn.notes && <div className="mt-3 text-[10px] text-pink-400 italic">Gynae Notes: {gyn.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('PULMO') && formData.pulmoData && (() => {
                                    const p = formData.pulmoData;
                                    const spo2 = parseInt(p.vitals?.spo2) || 0;
                                    const rr = parseInt(p.vitals?.respRate) || 0;
                                    const assessments: string[] = [];

                                    if (spo2 < 90) assessments.push('🚨 CRITICAL HYPOXIA — Oxygen Required');
                                    else if (spo2 < 94) assessments.push('Low Oxygen Saturation');
                                    if (rr > 30) assessments.push('🚨 RESPIRATORY DISTRESS — Tachypnea');
                                    if (p.auscultation?.sounds?.includes('Stridor')) assessments.push('🚨 Stridor — Airway Obstruction suspected');

                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-cyan-100 rounded-[20px] bg-[#f0f9ff] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-cyan-200 mb-4 pb-2">
                                                <span className="text-[10px] font-black uppercase text-cyan-800 tracking-wider">Pulmonary Function & Status Review</span>
                                                <span className="text-[11px] font-black text-white bg-cyan-600 px-3 py-1 rounded-lg">Severity: {p.severity}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-xl border border-cyan-100">
                                                    <span className="text-[8px] font-black text-cyan-600 uppercase block mb-2">Vital Statistics</span>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">SpO2</div>
                                                            <div className={`text-[18px] font-black ${spo2 < 94 ? 'text-red-600' : 'text-cyan-700'}`}>{spo2}%</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Resp Rate</div>
                                                            <div className={`text-[18px] font-black ${rr > 24 ? 'text-red-600' : 'text-slate-900'}`}>{rr} <small className="text-[9px]">bpm</small></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-cyan-100">
                                                    <span className="text-[8px] font-black text-cyan-600 uppercase block mb-1">Severity & MMRC</span>
                                                    <div className="text-[12px] font-black text-cyan-800">{p.severity}</div>
                                                    <div className="text-[9px] font-bold text-slate-500">MMRC Grade: {p.mmrcGrade}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                                <div className="p-3 bg-white/50 rounded-xl border border-cyan-50">
                                                    <span className="text-[8px] font-black text-cyan-600 uppercase block mb-1">Auscultation Findings</span>
                                                    <div className="text-[10px] font-bold text-slate-700 leading-tight">
                                                        Air Entry: <span className="text-cyan-700">{p.auscultation?.airEntry || 'Normal'}</span><br/>
                                                        Exp: <span className="text-slate-900">{p.exam?.chestExpansion || 'Symmetrical'}</span><br/>
                                                        Sounds: <span className="text-red-600 font-black">{p.auscultation?.sounds?.join(', ') || 'Clear'}</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-white/50 rounded-xl border border-cyan-50">
                                                    <span className="text-[8px] font-black text-cyan-600 uppercase block mb-1">Oxygen Support</span>
                                                    <div className="text-[11px] font-black text-cyan-900">{p.vitals?.oxygenSupport || 'None'}</div>
                                                    {p.peakFlow && <div className="text-[10px] font-bold text-slate-500 mt-1">Peak Flow: {p.peakFlow} L/min</div>}
                                                </div>
                                            </div>

                                            {assessments.length > 0 && (
                                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                                                    {assessments.map((a, i) => <div key={i} className="text-[10px] font-black text-red-900">&rarr; {a}</div>)}
                                                </div>
                                            )}
                                            {p.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Pulmo Notes: {p.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('ENDOCRIN') && formData.endocrinologyData && (() => {
                                    const e = formData.endocrinologyData;
                                    const fbs = parseInt(e.glycemic?.fbs) || 0;
                                    const hba1c = parseFloat(e.glycemic?.hba1c) || 0;
                                    const tsh = parseFloat(e.thyroid?.tsh) || 0;
                                    const bmi = parseFloat(e.bmi) || 0;

                                    return (
                                        <div className="mb-[25px] p-[20px] border-2 border-rose-100 rounded-[24px] bg-[#fffafb] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-rose-200 mb-4 pb-2">
                                                <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Endocrine & Metabolic Profile</span>
                                                <span className="text-[11px] font-black text-white bg-rose-600 px-3 py-1 rounded-lg">BMI: {bmi} ({bmi > 30 ? 'Obese' : bmi > 25 ? 'Overweight' : 'Normal'})</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-xl border border-rose-100">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase block mb-2">Glycemic Dashboard</span>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">HbA1c</div><div className={`text-[15px] font-black ${hba1c > 6.5 ? 'text-red-600' : 'text-slate-900'}`}>{hba1c}%</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">FBS</div><div className={`text-[15px] font-black ${fbs > 126 ? 'text-red-600' : 'text-slate-900'}`}>{fbs}</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">PPBS</div><div className="text-[15px] font-black text-slate-900">{e.glycemic?.ppbs || '--'}</div></div>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-rose-100">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase block mb-2">Thyroid Summary</span>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">TSH</div><div className={`text-[15px] font-black ${tsh > 4 ? 'text-red-600' : 'text-slate-900'}`}>{tsh}</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">T3</div><div className="text-[12px] font-black text-slate-900">{e.thyroid?.t3 || '--'}</div></div>
                                                        <div><div className="text-[7px] text-slate-400 font-bold uppercase">T4</div><div className="text-[12px] font-black text-slate-900">{e.thyroid?.t4 || '--'}</div></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {e.diabetes && (
                                                <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200">
                                                    <div className="flex justify-between border-b pb-2 mb-2">
                                                        <span className="text-[8px] font-black text-rose-900 uppercase">Diabetes Profile Detail</span>
                                                        <span className="text-[9px] font-bold text-red-600">Hypo Risk: {e.diabetes.hypoglycemia}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Foot Exam</div>
                                                            <div className="text-[10px] font-bold">Sens: {e.diabetes.footExam?.sensation} | Ulcer: {e.diabetes.footExam?.ulcer}</div>
                                                            {e.diabetes.complications?.length > 0 && <div className="text-[8px] text-red-600 font-black mt-1">Compl: {e.diabetes.complications.join(', ')}</div>}
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] text-slate-400 font-bold uppercase">Treatment Adherence</div>
                                                            <div className="text-[10px] font-black">{e.diabetes.treatment?.type} {e.diabetes.treatment?.insulinType && `(${e.diabetes.treatment.insulinType})`}</div>
                                                            <div className="text-[10px] font-bold text-rose-600">{e.diabetes.treatment?.dose}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                                                    <span className="text-[8px] font-black text-red-600 uppercase block mb-1">Symptoms reported</span>
                                                    <div className="text-[10px] font-bold text-red-900">{e.symptoms?.join(' • ') || 'None'}</div>
                                                    {Object.entries(e.pcos || {}).filter(([_,v])=>v).length > 0 && (
                                                        <div className="text-[8px] font-black text-rose-600 mt-2 bg-white p-1.5 rounded-lg border border-rose-100">
                                                            PCOS: {Object.entries(e.pcos || {}).filter(([_,v])=>v).map(([k])=>k).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase block mb-1">Management Protocol</span>
                                                    <div className="text-[10px] font-black text-rose-900">{e.medicationType?.join(' + ') || 'Lifestyle Only'}</div>
                                                    <div className="text-[9px] text-rose-400 mt-1 uppercase font-bold tracking-tighter">Height: {e.height || '--'}cm | Weight: {e.weight || '--'}kg</div>
                                                </div>
                                            </div>

                                            {e.notes && <div className="mt-4 text-[10px] text-slate-400 italic">Endo Notes: {e.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('DENT') && formData.dentistryData && (() => {
                                    const d = formData.dentistryData;
                                    const findingsLines: string[] = [];
                                    if (d.oralFindings?.caries !== 'None') findingsLines.push(`Caries: ${d.oralFindings?.caries}`);
                                    if (d.oralFindings?.gingivitis !== 'None') findingsLines.push(`Gingivitis: ${d.oralFindings?.gingivitis}`);
                                    if (d.oralFindings?.mobility !== 'None') findingsLines.push(`Mobility: ${d.oralFindings?.mobility}`);
                                    if (d.oralFindings?.abscess) findingsLines.push('Intraoral Abscess Present');

                                    const extraOral: string[] = [];
                                    if (d.extraOral?.facialSwelling) extraOral.push('Facial Swelling');
                                    if (d.extraOral?.lymphNodes) extraOral.push('Lymphadenopathy');
                                    if (d.extraOral?.tmjPain) extraOral.push('TMJ Pain/Tenderness');
                                    
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-teal-100 rounded-[20px] bg-[#f0fdfa] shadow-sm">
                                            <div className="flex justify-between items-center border-b-[2px] border-teal-200 mb-4 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider">Dental Examination & Procedure Plan</span>
                                                    {(d.painScale !== undefined || d.duration) && (
                                                        <span className="text-[9px] font-bold text-teal-600 bg-white px-2 py-0.5 rounded border border-teal-50">
                                                            Pain: {d.painScale}/10 {d.duration ? `• ${d.duration}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                {d.procedure && <span className="text-[10px] font-black text-white bg-teal-600 px-3 py-1 rounded-lg">Plan: {d.procedure}</span>}
                                            </div>
                                            
                                            <div className="mb-4">
                                                <span className="text-[8px] font-black text-teal-600 uppercase block mb-2">Tooth-Level Detailed Assessment</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {(d.teeth || []).map((t: any, idx: number) => (
                                                        <div key={idx} className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm relative overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[12px] font-black text-teal-900">Tooth #{t.toothNumber}</span>
                                                                <div className="flex gap-1">
                                                                    {t.cariesDepth && t.cariesDepth !== 'None' && <span className="text-[7px] font-black px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded border border-violet-100 uppercase">{t.cariesDepth}</span>}
                                                                    <span className="text-[8px] font-black px-2 py-0.5 bg-red-50 text-red-600 rounded uppercase">{t.condition || 'Finding'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-600">{t.diagnosis || 'Clinical evaluation notes...'}</div>
                                                            {(t.mobilityGrade > 0 || t.tenderness) && (
                                                                <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-slate-50">
                                                                    {t.mobilityGrade > 0 && <div className="text-[8px] font-black text-red-700 uppercase">Mobility: G{t.mobilityGrade}</div>}
                                                                    {t.tenderness && <div className="text-[8px] font-black text-orange-600 uppercase">● Percussion Tenderness</div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white p-3 rounded-xl border border-teal-100">
                                                    <span className="text-[8px] font-black text-teal-600 uppercase block mb-1">General Oral Environment</span>
                                                    <div className="text-[10px] font-bold text-slate-700 leading-relaxed">
                                                        Findings: <span className="text-teal-900">{findingsLines.join(' • ') || 'No significant generalized findings'}</span><br/>
                                                        Plaque Index: <span className="text-slate-900">{d.oralFindings?.plaqueIndex || 'Low'}</span>
                                                        {extraOral.length > 0 && (
                                                            <div className="mt-1 pt-1 border-t border-slate-50 text-teal-600">
                                                                Extraoral: <span className="font-black">{extraOral.join(' • ')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`p-3 rounded-xl border ${d.systemicRisks?.onBloodThinners ? 'bg-red-50 border-red-100' : 'bg-white border-teal-100'}`}>
                                                    <span className="text-[8px] font-black text-teal-600 uppercase block mb-1">Systemic Medical Risk</span>
                                                    <div className="text-[10px] font-bold text-slate-700 leading-tight">
                                                        Blood Thinners: <span className={d.systemicRisks?.onBloodThinners ? 'text-red-700 font-black' : 'text-slate-900'}>{d.systemicRisks?.onBloodThinners ? '⚠️ YES' : 'NO'}</span><br/>
                                                        Diabetes: <span className="text-slate-900">{d.systemicRisks?.diabetic ? `Yes (${d.systemicRisks.diabetesControl})` : 'No'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {d.notes && <div className="mt-3 pt-2 border-t border-dashed border-teal-200 text-[9px] text-slate-500 italic">Dental Notes: {d.notes}</div>}
                                        </div>
                                    );
                                })()}


                                {activeSpecialty.toUpperCase().includes('ENT') && !activeSpecialty.toUpperCase().includes('DENT') && !activeSpecialty.toUpperCase().includes('GASTRO') && formData.entData && (() => {
                                    const ent = formData.entData;
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-sky-100 rounded-[16px] bg-sky-50/20">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-sky-200 mb-[14px] pb-[8px]">
                                                <span className="text-[11px] font-[900] uppercase text-sky-800 tracking-[1px]">ENT / Otolaryngology Examination</span>
                                                <span className="text-[10px] font-[900] text-sky-600 bg-sky-100 px-[10px] py-[4px] rounded-[6px]">Ear, Nose, Throat Profile</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
                                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/50 p-3 rounded-xl border border-sky-100">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block mb-1">Left Ear</span>
                                                        <div className="text-[10px] space-y-1">
                                                            <div className="text-slate-700 font-bold">External: <span className="text-slate-900">{ent.ear?.left?.externalEar || 'Normal'}</span></div>
                                                            <div className="text-slate-700 font-bold">Canal: <span className="text-sky-600 font-black">{ent.ear?.left?.earCanal?.join(', ') || 'Normal'}</span></div>
                                                            <div className="text-slate-700 font-bold">TM: <span className="text-rose-600 font-black">{ent.ear?.left?.tympanicMembrane || 'Normal'}</span></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block mb-1">Right Ear</span>
                                                        <div className="text-[10px] space-y-1">
                                                            <div className="text-slate-700 font-bold">External: <span className="text-slate-900">{ent.ear?.right?.externalEar || 'Normal'}</span></div>
                                                            <div className="text-slate-700 font-bold">Canal: <span className="text-rose-600 font-black">{ent.ear?.right?.earCanal?.join(', ') || 'Normal'}</span></div>
                                                            <div className="text-slate-700 font-bold">TM: <span className="text-slate-900 font-black">{ent.ear?.right?.tympanicMembrane || 'Normal'}</span></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block">Nasal Exam</span>
                                                        <div className="text-[10px] font-bold text-slate-700">Mucosa: {ent.nose?.mucosa || 'Normal'} | Septum: {ent.nose?.septum || 'Central'}</div>
                                                        {ent.nose?.discharge && <div className="text-[10px] text-rose-600 font-black">Discharge: {ent.nose.discharge}</div>}
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block">Oral / Throat</span>
                                                        <div className="text-[10px] font-bold text-slate-700">Tonsils: {ent.throat?.tonsils || 'Normal'} | Pharynx: {ent.throat?.pharynx || 'Clear'}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block">Aural Assessment</span>
                                                        <div className="text-[10px] font-bold text-slate-700">Hearing: {ent.hearing?.status || 'Normal'}</div>
                                                        {ent.hearing?.tuningForkTest?.length > 0 && <div className="text-[9px] text-sky-700">Test: {ent.hearing.tuningForkTest.join(', ')}</div>}
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-sky-600 uppercase block">Lymphatic / Voice</span>
                                                        <div className="text-[10px] font-bold text-slate-700">cervical: {ent.lymphNodes?.cervical || 'None'} | Voice: {ent.voice?.quality || 'Normal'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {ent.notes && <div className="mt-3 pt-2 border-t border-dashed border-sky-200 text-[9px] text-slate-500 italic">ENT Notes: {ent.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('HEMA') && formData.hematologyData && (() => {
                                    const hema = formData.hematologyData;
                                    const cbc = hema.cbc || {};
                                    const coagulation = hema.coagulation || {};
                                    const rbci = hema.rbcIndices || {};
                                    const transfusion = hema.transfusion || {};

                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-rose-100 rounded-[16px] bg-rose-50/20">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-rose-200 mb-[14px] pb-[8px]">
                                                <span className="text-[10px] font-[900] uppercase text-rose-800 tracking-[1px]">Hematology Assessment Report</span>
                                                <span className="text-[11px] font-[900] text-rose-700">CBC & Coagulation Status</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                <div className="bg-white p-2 border border-rose-100 rounded-lg">
                                                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Hb</span>
                                                    <span className={`text-sm font-black ${(parseFloat(cbc.hb) < 10) ? 'text-rose-600' : 'text-slate-800'}`}>{cbc.hb || '--'} <small className="text-[9px]">g/dL</small></span>
                                                </div>
                                                <div className="bg-white p-2 border border-rose-100 rounded-lg">
                                                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Platelets</span>
                                                    <span className={`text-sm font-black ${(parseFloat(cbc.platelets) < 150000) ? 'text-rose-600' : 'text-slate-800'}`}>{cbc.platelets || '--'} <small className="text-[9px]">/μL</small></span>
                                                </div>
                                                <div className="bg-white p-2 border border-rose-100 rounded-lg">
                                                    <span className="text-[8px] font-bold text-slate-400 block uppercase">INR</span>
                                                    <span className={`text-sm font-black ${(parseFloat(coagulation.inr) > 1.5) ? 'text-rose-600' : 'text-slate-800'}`}>{coagulation.inr || '--'}</span>
                                                </div>
                                                <div className="bg-white p-2 border border-rose-100 rounded-lg">
                                                    <span className="text-[8px] font-bold text-slate-400 block uppercase">TLC</span>
                                                    <span className="text-sm font-black text-slate-800">{cbc.tlc || '--'}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white/50 p-2 rounded-lg border border-rose-100">
                                                    <span className="text-[8px] font-bold text-rose-600 uppercase block mb-1">RBC Indices</span>
                                                    <div className="text-[10px] font-bold text-slate-700">MCV: {rbci.mcv} | MCH: {rbci.mch} | MCHC: {rbci.mchc}</div>
                                                </div>
                                                <div className="bg-white/50 p-2 rounded-lg border border-rose-100">
                                                    <span className="text-[8px] font-bold text-rose-600 uppercase block mb-1">Transfusion</span>
                                                    <div className="text-[10px] font-bold text-slate-700">{transfusion.product}: {transfusion.units} Units {transfusion.indication && `(${transfusion.indication})`}</div>
                                                </div>
                                            </div>
                                            {hema.diagnosis && (
                                                <div className="mt-2 border-t border-dashed border-rose-200 pt-2">
                                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-1">Impression</span>
                                                    <div className="text-xs font-bold text-rose-900">{hema.diagnosis}</div>
                                                </div>
                                            )}
                                            {hema.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Hema Notes: {hema.notes}</div>}
                                        </div>
                                    );
                                })()}

                                {activeSpecialty.toUpperCase().includes('ONCO') && formData.oncologyData && (() => {
                                    const onco = formData.oncologyData;
                                    const labs = onco.labs || {};
                                    const chemo = onco.chemo || [];
                                    const anc = parseFloat(labs.anc);
                                    const plt = parseFloat(labs.platelets);
                                    
                                    return (
                                        <div className="mb-[25px] p-[18px] border-2 border-indigo-900 rounded-[24px] bg-slate-50">
                                            <div className="flex justify-between items-center border-b-[1.5px] border-slate-200 mb-4 pb-2">
                                                <span className="text-[10px] font-[900] uppercase text-indigo-900 tracking-[1px]">Oncology Treatment Summary</span>
                                                <span className="text-[10px] font-[900] text-white bg-indigo-900 px-3 py-1 rounded-full">BSA: {onco.body?.bsa || '--'} m²</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">Diagnosis & Clinical Stage</span>
                                                    <div className="text-sm font-black text-indigo-900">{onco.diagnosis || 'Solid Tumor'} {onco.tnm?.stage ? `(Stage ${onco.tnm.stage})` : ''}</div>
                                                    <div className="text-[10px] font-bold text-slate-500">Site: {onco.site || 'N/A'} | ECOG: {onco.ecog || '0'}</div>
                                                    {onco.biomarkers?.length > 0 && <div className="text-[9px] font-bold text-indigo-700 mt-1">Biomarkers: {onco.biomarkers.join(' • ')}</div>}
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Pre-Chemo Labs</span>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div><span className="text-[7px] block">ANC</span><span className={`font-black text-[12px] ${anc < 1500 ? 'text-rose-600' : 'text-emerald-600'}`}>{labs.anc}</span></div>
                                                        <div><span className="text-[7px] block">Platelets</span><span className={`font-black text-[12px] ${plt < 100 ? 'text-rose-600' : 'text-emerald-600'}`}>{labs.platelets}k</span></div>
                                                        <div><span className="text-[7px] block">Creat</span><span className={`font-black text-[12px] ${parseFloat(labs.creatinine) > 1.4 ? 'text-amber-600' : 'text-slate-800'}`}>{labs.creatinine}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {chemo.length > 0 && (
                                                <div className="mt-4">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-2">Cytotoxic Regimen</span>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-slate-200 min-w-[400px]">
                                                            <thead>
                                                                <tr className="bg-slate-100">
                                                                    <th className="text-[8px] p-2 text-left text-slate-500 uppercase">Drug</th>
                                                                    <th className="text-[8px] p-2 text-center text-slate-500 uppercase">mg/m²</th>
                                                                    <th className="text-[8px] p-2 text-center text-indigo-600 uppercase">Total</th>
                                                                    <th className="text-[8px] p-2 text-center text-slate-500 uppercase">Route</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {chemo.map((c: any, i: number) => (
                                                                    <tr key={i} className="border-t border-slate-100">
                                                                        <td className="p-2 text-[11px] font-black text-indigo-900">{c.drug}</td>
                                                                        <td className="p-2 text-[10px] text-center text-slate-500">{c.dosePerM2}</td>
                                                                        <td className="p-2 text-[11px] text-center font-black text-indigo-900">{c.totalDose} mg</td>
                                                                        <td className="p-2 text-[10px] text-center text-slate-500">{c.route}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {onco.toxicity?.length > 0 && (
                                                <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                                                    <span className="text-[8px] font-black text-rose-600 uppercase">Toxicities</span>
                                                    <div className="text-[10px] font-bold text-rose-900">{onco.toxicity.join(' • ')}</div>
                                                </div>
                                            )}
                                            {onco.notes && <div className="mt-3 text-[10px] text-slate-400 italic">Onco Notes: {onco.notes}</div>}
                                        </div>
                                    );
                                })()}
                                
                                {formData.medicines.length > 0 && (
                                    <div className="mt-4 sm:mt-6">
                                        <div className="text-[9px] sm:text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[8px] sm:mb-[12px] pb-[4px] border-b-2 border-indigo-600/20 inline-block">Medications & Dosage</div>
                                        <div className="overflow-x-auto -mx-2 px-2 pb-4">
                                            <table className="w-full border-collapse min-w-[500px] sm:min-w-[600px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b-2 border-indigo-600/10">
                                                    <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[10px]" style={{ width: activeSpecialty.toUpperCase().includes('PEDIATRI') ? '30%' : '35%' }}>Medicine Name</th>
                                                    <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[10px]">Dosage</th>
                                                    <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[10px]">Frequency</th>
                                                    <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[10px]">Duration</th>
                                                    {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                                        <>
                                                            <th className="text-left text-[8px] font-[900] text-pink-600 uppercase py-[12px] px-[8px]">mg/kg</th>
                                                            <th className="text-left text-[8px] font-[900] text-pink-600 uppercase py-[12px] px-[8px]">Calc</th>
                                                        </>
                                                    )}
                                                    {(activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) && (
                                                        <th className="text-left text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[10px]">Instillation</th>
                                                    )}
                                                    <th className="text-right text-[9px] font-[900] text-slate-500 uppercase py-[12px] px-[12px]">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.medicines.map((med: Medicine, idx: number) => (
                                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                                        <td className="py-[14px] px-[10px]">
                                                            <div className="text-[13px] font-[800] text-slate-900">{med.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium">{med.form}</div>
                                                        </td>
                                                        <td className="py-[14px] px-[10px] text-[12px] font-[700] text-slate-700">{med.dosage}</td>
                                                        <td className="py-[14px] px-[10px] text-[12px] font-[600] text-slate-500">{formatFrequency(med.freq)}</td>
                                                        <td className="py-[14px] px-[10px] text-[12px] font-[700] text-slate-700">{med.duration}</td>
                                                        {activeSpecialty.toUpperCase().includes('PEDIATRI') && (
                                                            <>
                                                                <td className="py-[14px] px-[5px] text-[11px] font-[700] text-rose-600">{med.mgPerKg || '--'}</td>
                                                                <td className="py-[14px] px-[5px] text-[11px] font-[800] text-slate-900">{med.calculatedDose || '--'} <small className="text-[9px] font-[600]">mg</small></td>
                                                            </>
                                                        )}
                                                        {(activeSpecialty.toUpperCase().includes('OPHTHAL') || activeSpecialty.toUpperCase().includes('EYE') || formData.medicines.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay)) && (
                                                            <td className="py-[14px] px-[10px] text-[12px] font-[700] text-slate-700">
                                                                {(() => {
                                                                    if (!med.eye && !med.dropCount && !med.timesPerDay) return '--';
                                                                    const eyeTag = med.eye ? <span className="text-[10px] font-black text-white bg-sky-500 px-1.5 py-0.5 rounded mr-1.5">{med.eye === 'BE' ? 'BE (Both)' : med.eye === 'RE' ? 'RE (Right)' : med.eye === 'LE' ? 'LE (Left)' : med.eye}</span> : null;
                                                                    const drops = med.dropCount ? (/drop/i.test(med.dropCount) ? med.dropCount : `${med.dropCount} Drop${parseInt(med.dropCount) > 1 ? 's' : ''}`) : '';
                                                                    const times = med.timesPerDay ? (/time|day|daily/i.test(med.timesPerDay) ? med.timesPerDay : `${med.timesPerDay} Times/Day`) : '';
                                                                    const details = [drops, times].filter(Boolean).join(' • ');
                                                                    return <div className="inline-flex items-center">{eyeTag}<span className="text-slate-900 font-bold">{details}</span></div>;
                                                                })()}
                                                            </td>
                                                        )}
                                                        <td className="py-[14px] px-[10px] text-right text-[13px] font-[900] text-slate-900">{med.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                )}

                                {/* Advice Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    {formData.dietAdvice.length > 0 && (
                                        <div>
                                            <div className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[12px]">Clinical Advice</div>
                                            <ul className="space-y-1.5 list-none">
                                                {formData.dietAdvice.filter((i: string) => i.trim()).map((d: string, i: number) => (
                                                    <li key={i} className="text-[12px] text-slate-600 font-[600] flex gap-2">
                                                        <span className="text-indigo-400">●</span> {d}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {formData.suggestedTests.length > 0 && (
                                        <div>
                                            <div className="text-[11px] font-[900] uppercase text-slate-800 tracking-[1.5px] mb-[12px]">Requested Tests</div>
                                            <ul className="space-y-1.5 list-none">
                                                {formData.suggestedTests.filter((i: string) => i.trim()).map((t: string, i: number) => (
                                                    <li key={i} className="text-[12px] text-slate-600 font-[600] flex gap-2">
                                                        <span className="text-indigo-400">●</span> {t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Follow up */}
                                {(formData.followUp || formData.followUpDate) && (
                                    <div className="mt-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <span className="text-[9px] font-[800] text-amber-600 uppercase tracking-widest block mb-1">Follow-up Instructions</span>
                                            <div className="text-sm font-bold text-amber-900">{formData.followUp || 'Follow Standard Protocol'}</div>
                                        </div>
                                        {formData.followUpDate && (
                                            <div className="text-right sm:text-right w-full sm:w-auto">
                                                <span className="text-[9px] font-[800] text-amber-600 uppercase tracking-widest block mb-1">Scheduled Date</span>
                                                <div className="text-sm font-black text-amber-900">{new Date(formData.followUpDate).toLocaleDateString('en-GB')}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
                                    <div className="text-center">
                                        <div className="w-[180px] h-[60px] border-b border-slate-300 mb-2 flex items-center justify-center">
                                            {formData.doctorSignature ? <img src={formData.doctorSignature} className="max-h-full" alt="Signature" /> : <span className="text-slate-300 text-[10px]">Digital Signature</span>}
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authorized Specialist Signature</div>
                                    </div>
                                </div>
                            </div>
                            </div>
                            <div className="mt-10">
                                <MainFooter initialDetails={hospitalBranding} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="sticky bottom-0 w-full bg-slate-900 p-3 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-4 shadow-2xl">
                    <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                        {!sentToPharma && formData.medicines.length > 0 && (
                            <button
                                onClick={handleSendToPharma}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-4 bg-indigo-600 text-white rounded-lg sm:rounded-xl font-black uppercase text-[8px] sm:text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                            >
                                <CheckCircle2 size={16} />
                                <span>Pharma</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-4 bg-slate-800 text-slate-300 rounded-lg sm:rounded-xl font-black uppercase text-[8px] sm:text-[10px] tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
                        >
                            Modify
                        </button>
                        <button
                            onClick={handleFinalizeFromPreview}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-2.5 sm:py-4 bg-teal-600 text-white rounded-lg sm:rounded-xl font-black uppercase text-[8px] sm:text-[10px] tracking-widest hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-600/20"
                        >
                            <Printer size={16} />
                            <span>{sentToPharma ? 'Print' : 'Finalize'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionPreviewModal;
