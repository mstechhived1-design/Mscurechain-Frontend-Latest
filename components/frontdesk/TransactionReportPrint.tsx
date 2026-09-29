'use client';

import React, { useEffect, useState } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import Image from 'next/image';
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';

interface DoctorCharge    { id: string; doctorName: string; specialization: string; rate: number; visits: number; }
interface AdmissionCharge { id: string; chargeType: string; description: string; rate: number; days: number; }
interface MedCharge       { id: string; medicineName: string; rate: number; quantity: number; }
interface ServiceCharge   { id: string; serviceName: string; rate: number; quantity: number; }
interface DiagCharge      { id: string; testName: string; rate: number; quantity: number; }
interface Payment         { id: string; receiptNo: string; date: string; mode: string; status: string; amount: number; }

export interface PrintData {
    doctors: DoctorCharge[];
    admissions: AdmissionCharge[];
    meds: MedCharge[];
    services: ServiceCharge[];
    diags: DiagCharge[];
    payments: Payment[];
}

const fmt = (n: any) => {
    const val = Number(n);
    if (isNaN(val)) return '₹0.00';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const cleanString = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '[object Object]' || trimmed === 'object Object') return fallback;
        return trimmed;
    }
    if (typeof val === 'object') {
        return (
            cleanString(val.testName) ||
            cleanString(val.name) ||
            cleanString(val.title) ||
            cleanString(val.description) ||
            cleanString(val.serviceName) ||
            cleanString(val.medicineName) ||
            cleanString(val.doctorName) ||
            cleanString(val.chargeType) ||
            fallback
        );
    }
    return String(val);
};

const THead = ({ cols }: { cols: string[] }) => (
    <thead>
        <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
            {cols.map((c, i) => (
                <th key={i} style={{ padding: '6px 8px', textAlign: i === cols.length - 1 ? 'right' : 'left', fontSize: 11, fontWeight: 700, borderRight: '1px solid #3b5fc0' }}>{c}</th>
            ))}
        </tr>
    </thead>
);

const SectionTitle = ({ title, color }: { title: string; color: string }) => (
    <div style={{ backgroundColor: color, color: '#fff', padding: '5px 10px', fontWeight: 700, fontSize: 12, marginBottom: 4, borderRadius: 3 }}>
        {title}
    </div>
);

const AmtRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <tr>
        <td style={{ padding: '4px 8px', fontSize: 11, fontWeight: bold ? 700 : 400 }}>{label}</td>
        <td style={{ padding: '4px 8px', fontSize: 11, fontWeight: bold ? 700 : 400, textAlign: 'right' }}>{value}</td>
    </tr>
);

export default function TransactionReportPrint({ data }: { data: PrintData }) {
    const [hospital, setHospital] = useState<any>(null);
    const { doctors, admissions, meds, services, diags, payments } = data;
    const { printWithHeader } = usePrintStore();

    useEffect(() => {
        hospitalAdminService.getHospital().then(setHospital).catch(() => {});
    }, []);

    const totDoc  = doctors.reduce((s, r) => s + r.rate * r.visits, 0);
    const totAdm  = admissions.reduce((s, r) => s + r.rate * r.days, 0);
    const totMed  = meds.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totSvc  = services.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totDiag = diags.reduce((s, r) => s + r.rate * r.quantity, 0);
    const totPaid = payments.filter(p => p.status === 'Paid').reduce((s, r) => s + r.amount, 0);
    const grand   = totDoc + totAdm + totMed + totSvc + totDiag;
    const balance = grand - totPaid;

    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11 };
    const td: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e5e7eb' };
    const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontWeight: 600 };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', padding: '15mm', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', background: '#fff', position: 'relative' }}>
            <PrintSettingsToggle />
            {/* ── Hospital Header ── */}
            {printWithHeader ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderBottom: '3px solid #1e3a8a', paddingBottom: 15, marginBottom: 20 }}>
                {hospital?.logo && (
                    <img src={hospital.logo} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', letterSpacing: 1, textTransform: 'uppercase' }}>{hospital?.name || 'Hospital Name'}</div>
                    <div style={{ fontSize: 12, color: '#333', marginTop: 3, fontWeight: 500 }}>{hospital?.address || ''}</div>
                    <div style={{ fontSize: 12, color: '#333', display: 'flex', gap: 20, marginTop: 4 }}>
                        {hospital?.phone && <span><strong>Ph:</strong> {hospital.phone}</span>}
                        {hospital?.email && <span><strong>Email:</strong> {hospital.email}</span>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: 1.5 }}>TRANSACTION REPORT</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 6, fontWeight: 600 }}>
                        Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                </div>
            </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 15, marginBottom: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: 1.5 }}>TRANSACTION REPORT</div>
                        <div style={{ fontSize: 12, color: '#555', marginTop: 6, fontWeight: 600 }}>
                            Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── 1. Doctor Charges ── */}
            {doctors.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="1. Doctor Charges" color="#3730a3" />
                    <table style={tableStyle}>
                        <THead cols={['Doctor Name', 'Specialization', 'Rate (₹)', 'Visits', 'Amount (₹)']} />
                        <tbody>
                            {doctors.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={td}>{cleanString(r.doctorName, '—')}</td>
                                    <td style={td}>{cleanString(r.specialization, '—')}</td>
                                    <td style={td}>{fmt(r.rate)}</td>
                                    <td style={td}>{r.visits}</td>
                                    <td style={tdR}>{fmt(r.rate * r.visits)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#eff6ff' }}>
                                <td colSpan={4} style={{ ...td, fontWeight: 700, color: '#1e3a8a' }}>Subtotal</td>
                                <td style={{ ...tdR, color: '#1e3a8a' }}>{fmt(totDoc)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 2. Admission & ICU ── */}
            {admissions.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="2. Admission & ICU Charges" color="#5b21b6" />
                    <table style={tableStyle}>
                        <THead cols={['Type', 'Description', 'Rate/Day (₹)', 'Days', 'Amount (₹)']} />
                        <tbody>
                            {admissions.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={td}>{cleanString(r.chargeType, 'Admission')}</td>
                                    <td style={td}>{cleanString(r.description, '—')}</td>
                                    <td style={td}>{fmt(r.rate)}</td>
                                    <td style={td}>{r.days}</td>
                                    <td style={tdR}>{fmt(r.rate * r.days)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#f5f3ff' }}>
                                <td colSpan={4} style={{ ...td, fontWeight: 700, color: '#5b21b6' }}>Subtotal</td>
                                <td style={{ ...tdR, color: '#5b21b6' }}>{fmt(totAdm)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 3. Medications ── */}
            {meds.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="3. Medication Charges" color="#9f1239" />
                    <table style={tableStyle}>
                        <THead cols={['Medicine Name', 'Rate (₹)', 'Quantity', 'Amount (₹)']} />
                        <tbody>
                            {meds.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={td}>{cleanString(r.medicineName, '—')}</td>
                                    <td style={td}>{fmt(r.rate)}</td>
                                    <td style={td}>{r.quantity}</td>
                                    <td style={tdR}>{fmt(r.rate * r.quantity)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#fff1f2' }}>
                                <td colSpan={3} style={{ ...td, fontWeight: 700, color: '#9f1239' }}>Subtotal</td>
                                <td style={{ ...tdR, color: '#9f1239' }}>{fmt(totMed)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 4. Services ── */}
            {services.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="4. Services & Procedures" color="#92400e" />
                    <table style={tableStyle}>
                        <THead cols={['Service Name', 'Rate (₹)', 'Quantity', 'Amount (₹)']} />
                        <tbody>
                            {services.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={td}>{cleanString(r.serviceName, '—')}</td>
                                    <td style={td}>{fmt(r.rate)}</td>
                                    <td style={td}>{r.quantity}</td>
                                    <td style={tdR}>{fmt(r.rate * r.quantity)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#fffbeb' }}>
                                <td colSpan={3} style={{ ...td, fontWeight: 700, color: '#92400e' }}>Subtotal</td>
                                <td style={{ ...tdR, color: '#92400e' }}>{fmt(totSvc)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 5. Diagnostics ── */}
            {diags.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="5. Diagnostics" color="#065f46" />
                    <table style={tableStyle}>
                        <THead cols={['Test Name', 'Rate (₹)', 'Quantity', 'Amount (₹)']} />
                        <tbody>
                            {diags.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={td}>{cleanString(r.testName, '—')}</td>
                                    <td style={td}>{fmt(r.rate)}</td>
                                    <td style={td}>{r.quantity}</td>
                                    <td style={tdR}>{fmt(r.rate * r.quantity)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#ecfdf5' }}>
                                <td colSpan={3} style={{ ...td, fontWeight: 700, color: '#065f46' }}>Subtotal</td>
                                <td style={{ ...tdR, color: '#065f46' }}>{fmt(totDiag)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 6. Payments ── */}
            {payments.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <SectionTitle title="6. Net Payments (Clear Payments)" color="#047857" />
                    <table style={tableStyle}>
                        <THead cols={['Receipt No.', 'Date', 'Mode', 'Status', 'Amount (₹)']} />
                        <tbody>
                            {payments.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{r.receiptNo}</td>
                                    <td style={td}>{r.date}</td>
                                    <td style={td}>{r.mode}</td>
                                    <td style={td}>
                                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: r.status === 'Paid' ? '#dcfce7' : r.status === 'Failed' ? '#fee2e2' : '#fef9c3', color: r.status === 'Paid' ? '#15803d' : r.status === 'Failed' ? '#b91c1c' : '#854d0e' }}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td style={tdR}>{fmt(r.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Grand Total Summary ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <table style={{ width: 280, borderCollapse: 'collapse', border: '1px solid #1e3a8a', fontSize: 11 }}>
                    <tbody>
                        <AmtRow label="Doctor Charges"     value={fmt(totDoc)} />
                        <AmtRow label="Admission / ICU"    value={fmt(totAdm)} />
                        <AmtRow label="Medications"        value={fmt(totMed)} />
                        <AmtRow label="Services"           value={fmt(totSvc)} />
                        <AmtRow label="Diagnostics"        value={fmt(totDiag)} />
                        <tr style={{ borderTop: '2px solid #1e3a8a' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 800, fontSize: 13, color: '#1e3a8a' }}>Grand Total</td>
                            <td style={{ padding: '6px 8px', fontWeight: 800, fontSize: 13, color: '#1e3a8a', textAlign: 'right' }}>{fmt(grand)}</td>
                        </tr>
                        <AmtRow label="Total Paid" value={fmt(totPaid)} />
                        <tr style={{ background: balance > 0 ? '#fee2e2' : '#dcfce7' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: balance > 0 ? '#b91c1c' : '#15803d' }}>Balance Due</td>
                            <td style={{ padding: '6px 8px', fontWeight: 800, textAlign: 'right', color: balance > 0 ? '#b91c1c' : '#15803d' }}>{fmt(balance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Footer ── */}
            {printWithHeader ? (
            <>
            <div style={{ borderTop: '2px solid #1e3a8a', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 10, color: '#555', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 2 }}>TERMS & CONDITIONS</div>
                    <div>• This is a computer-generated document.</div>
                    <div>• All charges are subject to final verification.</div>
                    <div>• For queries, contact the billing department.</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#555' }}>
                    <div style={{ height: 40, borderBottom: '1px solid #333', marginBottom: 4, minWidth: 140 }} />
                    <div style={{ fontWeight: 700 }}>Authorised Signatory</div>
                    <div>{hospital?.name || 'Hospital'}</div>
                </div>
            </div>

            {/* ── Hospital Address Footer Bar ── */}
            <div style={{ marginTop: 12, background: '#1e3a8a', color: '#fff', padding: '6px 14px', borderRadius: 4, textAlign: 'center', fontSize: 10 }}>
                {hospital?.address || ''} {hospital?.phone ? `| ☎ ${hospital.phone}` : ''} {hospital?.email ? `| ✉ ${hospital.email}` : ''}
            </div>
            </>
            ) : (
                <div style={{ height: '80px', width: '100%' }}></div>
            )}
        </div>
    );
}
