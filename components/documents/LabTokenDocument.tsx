import React from 'react';
import { Beaker, Clock, QrCode } from 'lucide-react';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';

interface Test {
    name: string;
    category: string;
    instructions?: string;
}

interface LabTokenDocumentProps {
    token: any;
    patient?: any;
    doctor?: any;
    hospital?: any;
}

// Hardcoded safe colors
const colors = {
    purple600: '#9333ea',
    purple500: '#a855f7',
    purple900: '#581c87',
    purple950: '#3b0764',
    purple100: '#f3e8ff',
    purple50: '#faf5ff',
    purple50Translucent: 'rgba(250, 245, 255, 0.5)',
    purple100Translucent: 'rgba(243, 232, 255, 0.5)',
    blue600: '#2563eb',
    red600: '#dc2626',
    orange500: '#f97316',
    gray900: '#111827',
    gray800: '#1f2937',
    gray700: '#374151',
    gray600: '#4b5563',
    gray500: '#6b7280',
    gray400: '#9ca3af',
    gray300: '#d1d5db',
    gray200: '#e5e7eb',
    gray100: '#f3f4f6',
    gray50: '#f9fafb',
    gray50Translucent: 'rgba(249, 250, 251, 0.5)',
    white: '#ffffff',
};

export const LabTokenDocument: React.FC<LabTokenDocumentProps> = ({
    token: propToken,
    patient: propPatient,
    doctor: propDoctor,
    hospital: propHospital
}) => {
    const token = propToken || {};
    const patient = propPatient || token.patient || {};
    const doctor = propDoctor || token.doctor || {};
    const hospital = propHospital || token.hospital || {
        name: 'Our Medical Center',
        logo: ''
    };

    return (
        <div className="relative font-sans print-token-document"
            style={{
                width: '210mm',
                height: '296mm',
                margin: '0 auto',
                padding: '12mm 15mm 12mm 25mm',
                boxSizing: 'border-box',
                backgroundColor: colors.white,
                overflow: 'hidden',
                color: colors.gray900,
                display: 'flex',
                flexDirection: 'column'
            }}>

            {/* Universal Header */}
            <MainHeader
                initialDetails={{
                    name: hospital.name,
                    address: hospital.address || '',
                    phone: hospital.phone || '',
                    email: hospital.email || '',
                    logo: hospital.logo
                }}
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-black uppercase tracking-widest leading-none text-blue-800">LAB REQUISITION</h1>
                <div className="flex items-center gap-3">
                    <div className="p-2 px-4 rounded-lg bg-slate-900 text-white font-mono font-black text-lg">
                        #{token.tokenNumber}
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8 p-6 rounded-2xl"
                style={{ backgroundColor: colors.gray50, border: `1px solid ${colors.gray100}` }}>
                <div className="space-y-1 pr-4" style={{ borderRight: `1px solid ${colors.gray200}` }}>
                    <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: colors.gray400 }}>Patient Identity</p>
                    <p className="text-base font-black leading-tight" style={{ color: colors.gray900 }}>{patient.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: colors.gray500 }}>
                        <span>{patient.age}Y</span>
                        <span>•</span>
                        <span>{patient.gender}</span>
                    </div>
                </div>
                <div className="space-y-1 px-4" style={{ borderRight: `1px solid ${colors.gray200}` }}>
                    <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: colors.gray400 }}>Record MRN</p>
                    <p className="text-base font-black leading-tight" style={{ color: colors.gray900 }}>{patient.mrn || token.appointment?.mrn || 'N/A'}</p>
                    <p className="text-[9px] font-bold" style={{ color: colors.gray400 }}>Electronic Health Record</p>
                </div>
                <div className="space-y-1 pl-4">
                    <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: colors.gray400 }}>Ordering Physician</p>
                    <p className="text-base font-black leading-tight" style={{ color: colors.gray900 }}>Dr. {doctor.user?.name || doctor.name || 'Medical Officer'}</p>
                    <p className="text-[9px] font-bold" style={{ color: colors.gray400 }}>{doctor.specialization || 'Clinical Services'}</p>
                </div>
            </div>

            {/* Tests List */}
            <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 border-b pb-1" style={{ color: colors.gray900, borderColor: colors.gray200 }}>Requested Investigations</h3>
                <ul className="space-y-4">
                    {token.tests?.map((test: Test, idx: number) => (
                        <li key={idx} className="flex justify-between items-start pb-3" style={{ borderBottom: `1px solid ${colors.gray50}` }}>
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[12px] font-bold uppercase" style={{ color: colors.gray900 }}>{idx + 1}. {test.name}</span>
                                    <span className="text-[8px] px-2 py-0.5 rounded font-bold uppercase"
                                        style={{ backgroundColor: colors.gray100, color: colors.gray600 }}>
                                        {test.category}
                                    </span>
                                </div>
                                {test.instructions && (
                                    <p className="text-[9px] mt-1 italic" style={{ color: colors.gray500 }}>
                                        Note: {test.instructions}
                                    </p>
                                )}
                            </div>
                            <div className="text-right pl-4">
                                <p className="text-[9px] font-bold uppercase" style={{ color: colors.gray400 }}>Status</p>
                                <p className="text-[10px] font-black uppercase" style={{ color: colors.gray800 }}>Requested</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Notes */}
            {token.notes && (
                <div className="mb-8 p-5 rounded-2xl border border-dashed"
                    style={{
                        backgroundColor: colors.purple50Translucent,
                        borderColor: colors.purple100
                    }}>
                    <h4 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: colors.purple600 }}>
                        <Clock size={10} /> Physician Remarks
                    </h4>
                    <p className="text-[11px] font-bold leading-relaxed italic" style={{ color: colors.gray700 }}>
                        "{token.notes}"
                    </p>
                </div>
            )}

            {/* Universal Footer */}
            <div className="mt-auto">
                <MainFooter
                    initialDetails={{
                        name: hospital.name,
                        address: hospital.address || '',
                        phone: hospital.phone || '',
                        email: hospital.email || ''
                    }}
                />
            </div>

            {/* Diagonal Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none select-none text-8xl font-black whitespace-nowrap uppercase italic"
                style={{ opacity: 0.03, color: colors.purple950 }}>
                {hospital.name ? hospital.name.split(' ')[0] : 'RIMS'} Govt Hospital
            </div>

            <style jsx>{`
            .font-handwriting {
                font-family: 'Brush Script MT', cursive;
            }
        `}</style>
        </div>
    );
};
