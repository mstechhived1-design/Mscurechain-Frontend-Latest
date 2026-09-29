import React from 'react';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';
import { formatFrequency } from '@/lib/frequencyUtils';
import { Activity, Heart, AlertCircle } from 'lucide-react';

interface CardiologyData {
    bpSystolic: string | number;
    bpDiastolic: string | number;
    heartRate: string | number;
    rhythm: string;
    symptoms: string[];
    riskFactors: string[];
    ecgType: string;
    ecgLeads: string[];
    ecgNotes: string;
    s1: string;
    s2: string;
    murmur: string;
    murmurType: string;
    riskLevel: 'Low' | 'Moderate' | 'High';
    nyhaClass: string;
    notes: string;
}

interface CardiologyPrescriptionDocumentProps {
    prescription: any;
    patient?: any;
    doctor?: any;
    hospital?: any;
    cardiologyData: CardiologyData;
}

const calculateQty = (freqStr: any, durationStr: any) => {
    if (!freqStr || !durationStr) return '-';
    let freq = 1;
    let days = 1;
    const f = String(freqStr).toLowerCase();
    if (f.includes("6 hrs")) freq = 4;
    else if (f.includes("8 hrs")) freq = 3;
    else if (f.includes("12 hrs") || f.includes("twice")) freq = 2;
    else if (f.includes("thrice")) freq = 3;
    else if (f.includes("once")) freq = 1;

    const d = String(durationStr).toLowerCase();
    const dMatch = d.match(/(\d+)/);
    if (dMatch) {
        days = parseInt(dMatch[1]);
        if (d.includes("week")) days *= 7;
        if (d.includes("month")) days *= 30;
    }
    return freq * days;
};

const InfoBlock = ({ label, value, subValue, critical }: { label: string; value: string | number; subValue?: string; critical?: boolean }) => (
    <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '10px', border: critical ? '1px solid #fee2e2' : '1px solid #f1f5f9' }}>
        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 900, color: critical ? '#ef4444' : '#1e293b' }}>{value}</span>
        {subValue && <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>{subValue}</span>}
    </div>
);

export const CardiologyPrescriptionDocument: React.FC<CardiologyPrescriptionDocumentProps> = ({
    prescription,
    patient: propPatient,
    doctor: propDoctor,
    hospital: propHospital,
    cardiologyData: cardio
}) => {
    const rx = prescription || {};
    const patient = propPatient || rx.patient || rx.appointment?.patient || rx.appointment?.patientDetails || {};
    const doctor = propDoctor || rx.doctor || rx.appointment?.doctor || {};
    const hospital = propHospital || rx.hospital || rx.appointment?.hospital || {
        name: 'KADAPA MULTI-SPECIALITY',
        address: 'Kadapa, Andhra Pradesh, India',
        logo: ''
    };

    const patientAge = patient.user?.age || patient.age || rx.appointment?.patientDetails?.age || rx.age || 'N/A';
    const patientGender = patient.user?.gender || patient.gender || rx.appointment?.patientDetails?.gender || rx.gender || 'N/A';
    const patientName = patient.user?.name || patient.name || rx.appointment?.patient?.name || 'NAME';
    const patientMrn = patient.mrn || rx.user?.mrn || rx.appointment?.mrn || rx.mrn || 'N/A';

    const docName = doctor.user?.name || doctor.name || 'Medical Officer';
    const formattedDocName = docName.toLowerCase().startsWith('dr.') ? docName : `Dr. ${docName}`;
    const displayDate = new Date(rx.prescriptionDate || rx.createdAt || new Date()).toLocaleDateString('en-GB');

    const isHighRisk = cardio.riskLevel === 'High' || cardio.ecgType === 'ST Elevation' || parseInt(cardio.bpSystolic as string) > 180;

    return (
        <div style={{ width: '100%', maxWidth: '210mm', height: 'auto', minHeight: '296mm', margin: '0 auto', boxSizing: 'border-box', backgroundColor: 'white', color: '#000', display: 'flex', flexDirection: 'column', padding: '10mm 15mm 10mm 20mm' }} className="font-sans cardiology-print-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
                .cardiology-print-container { font-family: 'Outfit', sans-serif !important; }
                .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                    .cardiology-print-container {
                        min-height: 280mm !important;
                        height: auto !important;
                    }
                }
            `}</style>
            
            {/* Cardiology Header Header */}
            <div style={{ background: '#ef4444', padding: '10px 20px', marginBottom: '15px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 15px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} />
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Cardiology Department</span>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>Advanced Cardiac Assessment</span>
            </div>

            <MainHeader initialDetails={{
                name: hospital.name, address: hospital.address || "",
                phone: hospital.phone || hospital.contact || "", email: hospital.email || "", logo: hospital.logo,
            }} />

            <div style={{ flex: 1, marginTop: '10px' }}>
                {/* Patient / Doctor Info */}
                <div className="grid-3" style={{ borderBottom: '2px solid #ef4444', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Patient Info</span>
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{patientName?.toUpperCase()} ({patientAge}Y/{patientGender?.toUpperCase()})</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>MRN / ID</span>
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{patientMrn}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Consultation Date</span>
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{displayDate}</span>
                    </div>
                </div>

                {isHighRisk && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '8px 15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={16} color="#ef4444" />
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>⚠ High-Risk Cardiac Condition Detected - Immediate Review Recommended</span>
                    </div>
                )}

                {/* HEART Vitals */}
                <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Activity size={12} /> Clinical Assessment (Cardiac)
                </h3>
                
                <div className="grid-3" style={{ marginBottom: '20px' }}>
                    <InfoBlock label="Blood Pressure" value={`${cardio.bpSystolic}/${cardio.bpDiastolic}`} subValue="mmHg" critical={parseInt(cardio.bpSystolic as string) > 160} />
                    <InfoBlock label="Heart Rate / Rhythm" value={`${cardio.heartRate} BPM`} subValue={cardio.rhythm} critical={parseInt(cardio.heartRate as string) > 110} />
                    <InfoBlock label="Risk Assessment" value={`${cardio.riskLevel} RISK`} subValue={cardio.nyhaClass ? `NYHA Class ${cardio.nyhaClass}` : undefined} critical={cardio.riskLevel === 'High'} />
                </div>

                <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <div style={{ padding: '12px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>ECG findings</span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: cardio.ecgType === 'ST Elevation' ? '#ef4444' : '#1e293b' }}>{cardio.ecgType}</span>
                        {cardio.ecgLeads && cardio.ecgLeads.length > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginLeft: '5px' }}>({cardio.ecgLeads.join(', ')})</span>}
                        {cardio.ecgNotes && <p style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{cardio.ecgNotes}</p>}
                    </div>
                    <div style={{ padding: '12px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                        <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>HEART SOUNDS</span>
                        <div style={{ fontSize: '10px', fontWeight: 700 }}>S1: {cardio.s1} | S2: {cardio.s2}</div>
                        {cardio.murmur === 'Present' && <div style={{ fontSize: '10px', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>Murmur Detected: {cardio.murmurType}</div>}
                    </div>
                </div>

                {/* Patient-Friendly Summary */}
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '15px', border: '1px solid #bae6fd' }}>
                    <h4 style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Heart size={12} fill="#bae6fd" /> Heart Condition Summary (For Patient)
                    </h4>
                    <div className="grid-2" style={{ gap: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#0c4a6e' }}>• BP: {parseInt(cardio.bpSystolic as string) > 140 ? 'High' : parseInt(cardio.bpSystolic as string) < 90 ? 'Low' : 'Normal'}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#0c4a6e' }}>• Heart Rate: {parseInt(cardio.heartRate as string) > 100 ? 'Fast' : parseInt(cardio.heartRate as string) < 60 ? 'Slow' : 'Normal'}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#0c4a6e' }}>• Overall Risk: {cardio.riskLevel}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#0c4a6e' }}>• Key Symptoms: {cardio.symptoms && cardio.symptoms.length > 0 ? cardio.symptoms.join(', ') : 'None'}</div>
                    </div>
                </div>

                {(cardio.symptoms?.length > 0 || cardio.riskFactors?.length > 0) && (
                    <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                        <div className="grid-2">
                            {cardio.symptoms?.length > 0 && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Cardiac Symptoms</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {cardio.symptoms.map(s => <span key={s} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px' }}>{s}</span>)}
                                    </div>
                                </div>
                            )}
                            {cardio.riskFactors?.length > 0 && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Risk Profile</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {cardio.riskFactors.map(r => <span key={r} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', background: '#e2e8f0', color: '#475569', borderRadius: '10px' }}>{r}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MEDICATIONS */}
                <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', borderBottom: '1.5px solid #ef4444', paddingBottom: '3px', marginBottom: '8px', marginTop: '15px' }}>Rx: Pharmacological Management</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ background: '#fef2f2' }}>
                            <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', padding: '6px 8px' }}>Medicine</th>
                            <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', padding: '6px 4px' }}>Dosage</th>
                            <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', padding: '6px 4px' }}>Frequency</th>
                            <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', padding: '6px 4px', width: '60px' }}>Days</th>
                            <th style={{ textAlign: 'right', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c', padding: '6px 8px', width: '50px' }}>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rx.medicines?.map((med: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>{med.name}</div>
                                    <div style={{ fontSize: '8px', color: '#ef4444', fontWeight: 700 }}>{med.instructions}</div>
                                </td>
                                <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: 700 }}>
                                    {typeof med.dosage === 'object' ? `${med.dosage.morning}-${med.dosage.afternoon}-${med.dosage.evening}-${med.dosage.night}` : med.dosage}
                                </td>
                                <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: 700 }}>{formatFrequency(med.frequency || med.freq)}</td>
                                <td style={{ padding: '8px 4px', fontSize: '10px', fontWeight: 700 }}>{med.duration}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '10px', fontWeight: 900 }}>{calculateQty(med.frequency || med.freq, med.duration)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="grid-2">
                    <div>
                        <h4 style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', marginBottom: '5px' }}>Lifestyle Advice</h4>
                        <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>
                            {rx.advice && <p>• {rx.advice}</p>}
                            {rx.dietAdvice?.map((a: string, i: number) => <p key={i}>• {a}</p>)}
                        </div>
                    </div>
                    {rx.suggestedTests?.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', marginBottom: '5px' }}>Investigations</h4>
                            <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>
                                {rx.suggestedTests.map((t: string, i: number) => <p key={i}>• {t}</p>)}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                    <div style={{ textAlign: 'center', width: '150px' }}>
                        <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {doctor.signature ? <img src={doctor.signature} style={{ height: '40px' }} /> : <div style={{ height: '40px' }} />}
                        </div>
                        <div style={{ borderTop: '2px solid #ef4444', marginTop: '5px', paddingTop: '5px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 900 }}>{formattedDocName}</div>
                            <div style={{ fontSize: '7px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Cons. Cardiologist</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer-push mt-auto">
                <MainFooter initialDetails={{
                    name: hospital.name, address: hospital.address || "",
                    phone: hospital.phone || hospital.contact || "", email: hospital.email || "",
                }} />
            </div>
        </div>
    );
};
