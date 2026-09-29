import React from 'react';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';
import { formatFrequency } from '@/lib/frequencyUtils';

// Common interfaces
interface Medicine {
    name: string;
    instructions?: string;
    dosage: string;
    frequency: string;
    duration: string;
    freq?: string;
    eye?: string;
    dropCount?: string;
    timesPerDay?: string;
}

interface PrescriptionDocumentProps {
    prescription: any;
    patient?: any;
    doctor?: any;
    hospital?: any;
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

export const PrescriptionDocument: React.FC<PrescriptionDocumentProps> = ({
    prescription,
    patient: propPatient,
    doctor: propDoctor,
    hospital: propHospital
}) => {
    const rx = prescription || {};

    const patient =
        propPatient ||
        rx.patient ||
        rx.appointment?.patient ||
        rx.appointment?.patientDetails ||
        {};

    const doctor =
        propDoctor ||
        rx.doctor ||
        rx.appointment?.doctor ||
        {};

    const hospital =
        propHospital ||
        rx.hospital ||
        rx.appointment?.hospital ||
        {
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
        <div className="relative font-sans print-prescription-document prescription-responsive-container"
            style={{
                width: '100%',
                maxWidth: '210mm',
                height: 'auto',
                minHeight: '296mm',
                margin: '0 auto',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                color: '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible'
            }}>

            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                .prescription-responsive-container {
                    padding: 5mm;
                }

                @media (min-width: 640px) {
                    .prescription-responsive-container {
                        padding: 10mm 15mm 10mm 20mm;
                    }
                }

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

                .print-prescription-document {
                    font-family: 'Inter', 'Segoe UI', Roboto, sans-serif !important;
                }

                .rx-info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #eee;
                }

                @media (min-width: 640px) {
                    .rx-info-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                    }
                    .rx-advice-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 30px !important;
                    }
                }

                @media print {
                    .rx-info-grid {
                        grid-template-columns: repeat(4, 1fr) !important;
                    }
                    .rx-advice-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 30px !important;
                    }
                }
                `}
            </style>

            {/* --- MainHeader --- */}
            <MainHeader
                initialDetails={{
                    name: hospital.name,
                    address: hospital.address || "",
                    phone: hospital.phone || hospital.contact || "",
                    email: hospital.email || "",
                    logo: hospital.logo
                }}
            />

            <div style={{ flex: '1' }}>
                {/* Info Row */}
                <div className="rx-info-grid">
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Patient Name</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientName?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Age / Gender</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientAge} Y / {patientGender?.toUpperCase()}</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>MRN Number</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{patientMrn}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', marginBottom: '2px', letterSpacing: '0.5px' }}>Date</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{displayDate}</span>
                    </div>
                </div>

                {/* Diagnosis */}
                <div style={{ marginBottom: '15px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#777', letterSpacing: '0.5px' }}>Provisional Diagnosis:</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', marginLeft: '5px', color: '#000' }}>{rx.diagnosis || 'General Consultation'}</span>
                </div>

                {/* Medicines Table */}
                <div style={{ marginTop: '10px' }}>
                    <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Prescribed Medications</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '45%' }}>MEDICINE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '15%' }}>DOSAGE</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '20%' }}>FREQUENCY</th>
                                <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '10%' }}>DAYS</th>
                                {rx.medicines?.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay) && (
                                    <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '15%' }}>INSTILLATION</th>
                                )}
                                <th style={{ textAlign: 'right', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', color: '#777', padding: '0 0 6px 0', width: '10%' }}>QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rx.medicines?.map((med: Medicine, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700' }}>{med.name}</div>
                                    </td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>
                                        {typeof med.dosage === 'object' && med.dosage !== null 
                                            ? `${(med.dosage as any).morning || 0}-${(med.dosage as any).afternoon || 0}-${(med.dosage as any).evening || 0}-${(med.dosage as any).night || 0}` 
                                            : med.dosage}
                                    </td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>
                                        {formatFrequency(med.frequency)}
                                    </td>
                                    <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>{med.duration}</td>
                                    {rx.medicines?.some((m: Medicine) => m.eye || m.dropCount || m.timesPerDay) && (
                                        <td style={{ padding: '8px 0', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>
                                            {med.eye && <span style={{ fontWeight: '700', color: '#4f46e5', marginRight: '4px' }}>{med.eye}</span>}
                                            {med.dropCount && <span style={{ marginRight: '4px' }}>{med.dropCount}</span>}
                                            {med.timesPerDay && <span>{med.timesPerDay}</span>}
                                            {(!med.eye && !med.dropCount && !med.timesPerDay) && '--'}
                                        </td>
                                    )}
                                    <td style={{ padding: '8px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '10px', color: '#444' }}>
                                        {calculateQty(typeof med.frequency === 'object' && med.frequency !== null ? '1-1-1' : med.frequency, med.duration)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Advice Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }} className="rx-advice-grid">
                    {(rx.advice || rx.dietAdvice?.length > 0) && (
                        <div>
                            <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Dietary & Lifestyle Advice</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rx.advice && <div style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {rx.advice}</div>}
                                {rx.dietAdvice?.map((item: string, idx: number) => (
                                    <div key={idx} style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    {rx.suggestedTests?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#000', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Suggested Investigations</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rx.suggestedTests?.map((item: string, idx: number) => (
                                    <div key={idx} style={{ fontSize: '10px', color: '#000', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {rx.avoid?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#dc2626', borderBottom: '1px solid #dc2626', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>Contraindications / Things to Avoid</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                            {rx.avoid?.map((item: string, idx: number) => (
                                <div key={idx} style={{ fontSize: '10px', color: '#dc2626', fontWeight: '600', paddingLeft: '10px', position: 'relative' }}>• {item}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Follow-up */}
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div><span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '8px', color: '#64748b', marginRight: '4px' }}>Special Instructions:</span> {rx.instructions || 'N/A'}</div>
                    {rx.followUpDate ? (
                        <div>
                            <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '8px', color: '#64748b', marginRight: '4px' }}>Next Review On:</span>
                            <span style={{ fontWeight: '700', color: '#1e40af' }}>{new Date(rx.followUpDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <div style={{ textAlign: 'center', width: '150px' }}>
                        <div style={{ height: '35px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {doctor.signature ? (
                                <img src={doctor.signature} alt="Signature" style={{ height: '35px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ height: '20px' }} />
                            )}
                        </div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                            <div style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>{formattedDocName}</div>
                            <div style={{ fontSize: '7px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>AUTHORISED SIGNATORY</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MainFooter --- */}
            <div className="footer-push mt-auto">
                <MainFooter
                    initialDetails={{
                        name: hospital.name,
                        address: hospital.address || "",
                        phone: hospital.phone || hospital.contact || "",
                        email: hospital.email || "",
                    }}
                />
            </div>

        </div>
    );
};
