import React from 'react';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';
import { formatFrequency } from '@/lib/frequencyUtils';

interface DermatologyData {
    lesionType?: string;
    lesionCount?: number;
    size?: string;
    location?: string[];
    distribution?: string;
    color?: string[];
    surfaceChanges?: string[];
    itchingSeverity?: string;
    painSeverity?: string;
    burning?: boolean;
    duration?: string;
    onset?: string;
    progression?: string;
    provisionalDiagnosis?: string;
    notes?: string;
}

interface DermatologyPrescriptionDocumentProps {
    prescription: any;
    patient?: any;
    doctor?: any;
    hospital?: any;
    dermatologyData: DermatologyData;
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

const Chip = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
        fontSize: '8px', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.5px', marginRight: '4px', marginBottom: '3px',
        background: bg, color,
    }}>
        {label}
    </span>
);

const severityStyle = (level?: string): { bg: string; color: string } => {
    switch (level) {
        case 'Severe': return { bg: '#fee2e2', color: '#b91c1c' };
        case 'Moderate': return { bg: '#ffedd5', color: '#c2410c' };
        case 'Mild': return { bg: '#fef9c3', color: '#92400e' };
        default: return { bg: '#f1f5f9', color: '#475569' };
    }
};

export const DermatologyPrescriptionDocument: React.FC<DermatologyPrescriptionDocumentProps> = ({
    prescription,
    patient: propPatient,
    doctor: propDoctor,
    hospital: propHospital,
    dermatologyData,
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

    return (
        <div
            className="relative font-sans print-prescription-document prescription-responsive-container"
            style={{
                width: '100%', maxWidth: '210mm', height: 'auto', minHeight: '296mm',
                margin: '0 auto', boxSizing: 'border-box', backgroundColor: 'white',
                color: '#000', display: 'flex', flexDirection: 'column', overflow: 'visible',
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                .prescription-responsive-container { padding: 5mm; }
                @media (min-width: 640px) { .prescription-responsive-container { padding: 10mm 15mm 10mm 20mm; } }
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                    .prescription-responsive-container {
                        padding: 10mm 15mm 10mm 20mm !important;
                        width: 210mm !important;
                        min-height: 280mm !important;
                        height: auto !important;
                    }
                }
                .print-prescription-document { font-family: 'Outfit', 'Segoe UI', Roboto, sans-serif !important; }
                .rx-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #ec4899; }
                @media (min-width: 640px) {
                    .rx-info-grid { grid-template-columns: repeat(4, 1fr); gap: 15px; }
                }
            `}</style>

            {/* Specialty Header Flair */}
            <div style={{ background: '#fdf2f8', padding: '10px 20px', marginBottom: '15px', borderRadius: '0 0 20px 20px', borderBottom: '2px solid #ec4899', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#ec4899', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>★</div>
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '1px' }}>Dermatology Department</span>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Skin Care & Prescription Module</span>
            </div>

            <MainHeader initialDetails={{
                name: hospital.name, address: hospital.address || "",
                phone: hospital.phone || hospital.contact || "", email: hospital.email || "", logo: hospital.logo,
            }} />

            <div style={{ flex: '1' }}>
                {/* Patient Info */}
                <div className="rx-info-grid">
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#ec4899', marginBottom: '2px' }}>Patient Name</span>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{patientName?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#ec4899', marginBottom: '2px' }}>Age / Gender</span>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{patientAge} Y / {patientGender?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#ec4899', marginBottom: '2px' }}>MRN Number</span>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{patientMrn}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#ec4899', marginBottom: '2px' }}>Date</span>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{displayDate}</span>
                    </div>
                </div>

                {/* ── Dermatology Assessment (Specific Part) ── */}
                <div style={{ marginBottom: '20px', padding: '15px', border: '2px solid #fbcfe8', borderRadius: '15px', background: '#fff1f280' }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#db2777', letterSpacing: '1px', borderBottom: '1px solid #fbcfe8', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>◌</span> Clinical Examination (Skin)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Lesion Type</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#1f2937' }}>
                                {dermatologyData.lesionType || '—'}
                                {dermatologyData.lesionCount && <span style={{ color: '#db2777' }}> ×{dermatologyData.lesionCount}</span>}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Distribution</div>
                            <div style={{ fontSize: '11px', fontWeight: 800 }}>{dermatologyData.distribution || '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Progression</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: dermatologyData.progression === 'Worsening' ? '#be123c' : '#047857' }}>{dermatologyData.progression || 'Stable'}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Sites Involved</div>
                        <div>{(dermatologyData.location ?? []).map(l => <Chip key={l} label={l} bg="#fce7f3" color="#9d174d" />)}</div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dermatologyData.itchingSeverity && dermatologyData.itchingSeverity !== 'None' && <Chip label={`Itching: ${dermatologyData.itchingSeverity}`} {...severityStyle(dermatologyData.itchingSeverity)} />}
                        {dermatologyData.painSeverity && dermatologyData.painSeverity !== 'None' && <Chip label={`Pain: ${dermatologyData.painSeverity}`} {...severityStyle(dermatologyData.painSeverity)} />}
                        {dermatologyData.burning && <Chip label="Burning +ve" bg="#fee2e2" color="#b91c1c" />}
                    </div>

                    {dermatologyData.provisionalDiagnosis && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #fbcfe8' }}>
                            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#9ca3af' }}>Provisional Diagnosis: </span>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#be123c', marginLeft: '6px' }}>{dermatologyData.provisionalDiagnosis}</span>
                        </div>
                    )}
                </div>

                {/* Common Diagnosis (if any) */}
                {rx.diagnosis && rx.diagnosis !== dermatologyData.provisionalDiagnosis && (
                    <div style={{ marginBottom: '15px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#777' }}>General Diagnosis:</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', marginLeft: '5px' }}>{rx.diagnosis}</span>
                    </div>
                )}

                {/* ── Medications (Common Part) ── */}
                <div style={{ marginTop: '10px' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#ec4899', borderBottom: '2px solid #ec4899', paddingBottom: '4px', marginBottom: '10px' }}>Rx: Prescribed Medications</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                        <thead>
                            <tr style={{ background: '#fdf2f8' }}>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#db2777', padding: '6px 8px', width: '45%' }}>MEDICINE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#db2777', padding: '6px 4px', width: '15%' }}>DOSAGE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#db2777', padding: '6px 4px', width: '20%' }}>FREQUENCY</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#db2777', padding: '6px 4px', width: '10%' }}>DAYS</th>
                                <th style={{ textAlign: 'right', fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#db2777', padding: '6px 8px', width: '10%' }}>QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rx.medicines?.map((med: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #fdf2f8' }}>
                                    <td style={{ padding: '10px 8px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#1f2937' }}>{med.name}</div>
                                        {med.instructions && <div style={{ fontSize: '8px', color: '#ec4899', fontWeight: 600, marginTop: '2px' }}>{med.instructions}</div>}
                                    </td>
                                    <td style={{ padding: '10px 4px', fontSize: '10px', fontWeight: 700 }}>
                                        {typeof med.dosage === 'object' && med.dosage !== null
                                            ? `${med.dosage.morning || 0}-${med.dosage.afternoon || 0}-${med.dosage.evening || 0}-${med.dosage.night || 0}`
                                            : med.dosage}
                                    </td>
                                    <td style={{ padding: '10px 4px', fontSize: '10px', color: '#4b5563' }}>{formatFrequency(med.frequency)}</td>
                                    <td style={{ padding: '10px 4px', fontSize: '10px', fontWeight: 700 }}>{med.duration}</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '11px', fontWeight: 900 }}>
                                        {calculateQty(typeof med.frequency === 'object' ? '1-1-1' : med.frequency, med.duration)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Common Advice */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#ec4899', borderBottom: '1px solid #fbcfe8', paddingBottom: '4px', marginBottom: '8px' }}>Advice & Skincare</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {rx.advice && <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: '600' }}>• {rx.advice}</div>}
                            {rx.dietAdvice?.map((item: string, idx: number) => (
                                <div key={idx} style={{ fontSize: '10px', color: '#4b5563', fontWeight: '600' }}>• {item}</div>
                            ))}
                        </div>
                    </div>
                    {rx.suggestedTests?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#ec4899', borderBottom: '1px solid #fbcfe8', paddingBottom: '4px', marginBottom: '8px' }}>Investigations</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rx.suggestedTests?.map((item: string, idx: number) => (
                                    <div key={idx} style={{ fontSize: '10px', color: '#4b5563', fontWeight: '600' }}>• {item}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Follow-up */}
                <div style={{ marginTop: '15px', padding: '12px', background: '#fdf2f8', borderRadius: '12px', fontSize: '10px', border: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between' }}>
                    <div><span style={{ fontWeight: '800', color: '#db2777', textTransform: 'uppercase', fontSize: '8px' }}>Follow-up:</span> {rx.instructions || 'As advised'}</div>
                    {rx.followUpDate && (
                        <div style={{ fontWeight: '900', color: '#db2777' }}>
                            Next Review: {new Date(rx.followUpDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    )}
                </div>

                {/* Signature */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                    <div style={{ textAlign: 'center', width: '160px' }}>
                        <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {doctor.signature
                                ? <img src={doctor.signature} alt="Signature" style={{ height: '40px', objectFit: 'contain' }} />
                                : <div style={{ height: '20px' }} />
                            }
                        </div>
                        <div style={{ borderTop: '2px solid #ec4899', paddingTop: '6px', marginTop: '4px' }}>
                            <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#1f2937' }}>{formattedDocName}</div>
                            <div style={{ fontSize: '7px', color: '#ec4899', fontWeight: '800', letterSpacing: '1px' }}>CONSULTANT DERMATOLOGIST</div>
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
