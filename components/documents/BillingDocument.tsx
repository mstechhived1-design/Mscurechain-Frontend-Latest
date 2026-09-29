import React from 'react';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';

interface Medicine {
    name: string;
    dosage: string;
    price: number;
}

interface BillingDocumentProps {
    patientName: string;
    mrn: string;
    date: string;
    medicines: Medicine[];
    subtotal: number;
    tax: number;
    total: number;
    hospitalName?: string;
    hospitalAddress?: string;
    hospitalPhone?: string;
}
function BillingDocument({
    patientName,
    mrn,
    date,
    medicines,
    subtotal,
    tax,
    total,
    hospitalName = 'RIMS Government General Hospital Kadapa',
    hospitalAddress = 'RIMS Road, Putlampalli, Kadapa, Andhra Pradesh',
    hospitalPhone = '08562-245555'
}: BillingDocumentProps) {
    return (
        <div className="print-block" style={{
            background: 'white',
            width: '210mm',
            height: '296mm',
            margin: '0 auto',
            padding: '10mm 15mm 10mm 25mm',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Universal Header */}
            <MainHeader
                initialDetails={{
                    name: hospitalName,
                    address: hospitalAddress,
                    phone: hospitalPhone,
                    email: '' // Not provided in original props
                }}
            />

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '15px 0' }}>BILLING RECEIPT</h1>
            </div>

            {/* Patient Info */}
            <div style={{ marginBottom: '24px', background: '#f0f9ff', padding: '16px', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong style={{ color: '#1e40af' }}>Patient:</strong> {patientName}</p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong style={{ color: '#1e40af' }}>MRN:</strong> {mrn}</p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong style={{ color: '#1e40af' }}>Date:</strong> {date}</p>
            </div>

            {/* Billing Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #e5e7eb', padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Medicine</th>
                        <th style={{ border: '1px solid #e5e7eb', padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Dosage</th>
                        <th style={{ border: '1px solid #e5e7eb', padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {medicines.map((med, idx) => (
                        <tr key={idx}>
                            <td style={{ border: '1px solid #e5e7eb', padding: '10px', fontSize: '13px' }}>{med.name}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '10px', fontSize: '13px' }}>{med.dosage}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>₹{med.price.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary */}
            <div style={{ marginLeft: 'auto', maxWidth: '300px', background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    <span>Total Amount:</span>
                    <span style={{ color: '#16a34a' }}>₹{total.toFixed(2)}</span>
                </div>
            </div>

            {/* Universal Footer */}
            <div style={{ marginTop: 'auto' }}>
                <MainFooter
                    initialDetails={{
                        name: hospitalName,
                        address: hospitalAddress,
                        phone: hospitalPhone,
                        email: ''
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(BillingDocument);
