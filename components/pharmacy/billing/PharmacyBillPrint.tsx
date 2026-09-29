import React from 'react';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import { formatFrequency } from '@/lib/frequencyUtils';
import MainHeader from '@/components/printers/MainHeader';
import MainFooter from '@/components/printers/MainFooter';
import { usePrintStore } from '@/stores/printStore';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    dlNo?: string;
    fssai?: string;
    logo?: string;
    pharmacyTerms?: string[];
}

interface PharmacyBillPrintProps {
    billData: PharmacyBill;
    shopDetails: ShopDetails;
}

/**
 * PharmacyBillPrint Component - Fixed & Refined version
 * Matches the requested image styling exactly and fixes the "blank page" print issue.
 */
const PharmacyBillPrint: React.FC<PharmacyBillPrintProps> = ({ billData, shopDetails }) => {
    // Primary Brand Colors from image
    const primaryColor = '#112d42';
    const secondaryColor = '#4b5563';
    const borderColor = '#cbd5e1'; // Darker gray for better match with image borders
    const textMain = '#1e293b';
    const textMuted = '#64748b';

    const styles = {
        container: {
            width: '210mm',
            minHeight: '290mm',
            padding: '10mm',
            boxSizing: 'border-box' as const,
            backgroundColor: '#ffffff',
            color: textMain,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: '11px',
            lineHeight: '1.4',
            margin: '0 auto',
            position: 'relative' as const,
        },
        headerGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: '20px',
            marginBottom: '25px',
            alignItems: 'start',
        },
        brandSection: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '10px',
        },
        brandHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
        },
        logoPlaceholder: {
            width: '48px',
            height: '48px',
            backgroundColor: primaryColor,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '22px',
            fontWeight: 800,
        },
        shopName: {
            fontSize: '24px',
            fontWeight: 800,
            color: primaryColor,
            margin: 0,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
        },
        tagline: {
            fontSize: '10px',
            color: secondaryColor,
            fontWeight: 600,
            margin: 0,
        },
        shopDetails: {
            fontSize: '10px',
            color: textMuted,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '3px',
            fontWeight: 500,
            marginTop: '5px',
        },

        taxInvoiceBox: {
            border: `1.5px solid ${primaryColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
        },
        taxInvoiceHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            textAlign: 'center' as const,
            padding: '6px 0',
            fontWeight: 800,
            fontSize: '13px',
            textTransform: 'uppercase' as const,
        },
        taxInvoiceGrid: {
            padding: '6px 10px',
        },
        metaRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '10px',
        },
        metaLabel: { color: textMuted, fontWeight: 500 },
        metaValue: { fontWeight: 700, color: textMain, textAlign: 'right' as const },

        billToBox: {
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            marginBottom: '20px',
            overflow: 'hidden',
        },
        billToHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '4px 15px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase' as const,
            width: 'fit-content',
        },
        billToContent: {
            padding: '12px 15px',
        },
        patientName: {
            fontSize: '16px',
            fontWeight: 800,
            color: '#000',
            margin: '0 0 5px 0',
        },
        patientMeta: {
            fontSize: '10px',
            color: textMuted,
            fontWeight: 500,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2px',
        },

        table: {
            width: '100%',
            borderCollapse: 'separate' as const,
            borderSpacing: 0,
            marginBottom: '20px',
            border: `1px solid ${borderColor}`,
        },
        th: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '8px 6px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase' as const,
            borderRight: `1px solid rgba(255,255,255,0.2)`,
        },
        td: {
            padding: '8px 6px',
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            fontSize: '10px',
            color: textMain,
            textAlign: 'center' as const,
        },
        tdLeft: { textAlign: 'left' as const, fontWeight: 600 },
        tdRight: { textAlign: 'right' as const },

        bottomGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: '40px',
        },
        calculations: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2px',
        },
        calcRow: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: 600,
            color: textMuted,
            padding: '1px 0',
        },
        calcValue: { color: textMain, fontWeight: 700 },
        grandTotalBar: {
            backgroundColor: primaryColor,
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: '4px',
            marginTop: '15px',
        },
        gtLabel: { fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' as const },
        gtValue: { fontSize: '26px', fontWeight: 900 },

        paymentBox: {
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
        },
        paymentHeader: {
            backgroundColor: primaryColor,
            color: 'white',
            padding: '6px 15px',
            fontSize: '11px',
            fontWeight: 800,
            textAlign: 'center' as const,
        },
        paymentContent: {
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
        },
        payRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '10px',
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '4px',
        },

        footerNote: {
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: '20px',
            alignItems: 'end',
        },
        terms: {
            fontSize: '8px',
            color: textMuted,
            lineHeight: '1.4',
        },
        signatory: {
            textAlign: 'center' as const,
            borderTop: `1px solid ${textMain}`,
            paddingTop: '8px',
            fontSize: '10px',
            fontWeight: 700,
            marginTop: '40px',
        }
    };
    
    const { printWithHeader } = usePrintStore();

    const termsToRender = shopDetails.pharmacyTerms || [];

    // Build per-rate GST breakdown (GST is extracted from the GST-inclusive MRP, not added on top)
    const gstBreakdown: { rate: number; amount: number }[] = (() => {
        const subtotalMRP = billData.paymentSummary.subtotal || 0;
        const totalDiscount = billData.paymentSummary.discount || 0;
        const map = new Map<number, number>();
        (billData.items || []).forEach((item: any) => {
            const itemMRP = item.amount || item.total || (item.qty * (item.rate || item.unitRate || 0));
            const itemWeight = subtotalMRP > 0 ? itemMRP / subtotalMRP : 0;
            const itemDiscount = totalDiscount * itemWeight;
            const itemNetMRP = itemMRP - itemDiscount;
            const rate = item.gstPct || item.gst || 0;
            if (rate > 0) {
                const gstAmt = itemNetMRP - itemNetMRP / (1 + rate / 100);
                map.set(rate, (map.get(rate) || 0) + gstAmt);
            }
        });
        return Array.from(map.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([rate, amount]) => ({ rate, amount }));
    })();

    return (
        <div style={styles.container} id="printable-pharmacy-invoice" className="bg-white">
            {/* Robust CSS for print to guarantee visibility */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                /* Hide embedded header PrintSettingsToggle inside the receipt container preview */
                .main-header-print-container .print-settings-toggle-wrapper {
                    display: none !important;
                }
                .print-settings-toggle-wrapper {
                    display: none !important;
                }
                
                @media print {
                    @page { size: A4; margin: 0; }
                    html, body {
                        height: 100vh;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: white !important;
                    }
                    #printable-pharmacy-invoice { 
                        visibility: visible !important; 
                        display: block !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                    }
                    #printable-pharmacy-invoice * {
                        visibility: visible !important;
                    }
                }
            `}} />

            {/* Header section - Match appointment style */}
            <MainHeader initialDetails={{
                name: shopDetails.name || 'Pharma Store',
                logo: shopDetails.logo,
                address: shopDetails.address || '',
                phone: shopDetails.phone || '',
                email: shopDetails.email || '',
                gstNumber: shopDetails.gstin !== '-' ? shopDetails.gstin : undefined
            }} />

            {/* Invoice metadata & Bill To details on the same row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginBottom: '25px', marginTop: '20px', alignItems: 'stretch' }}>
                {/* Bill To Section */}
                <div style={{ ...styles.billToBox, marginBottom: 0 }}>
                    <div style={styles.billToHeader}>BILL TO</div>
                    <div style={styles.billToContent}>
                        <h3 style={styles.patientName}>{billData.patientName}</h3>
                        <div style={styles.patientMeta}>
                            <span>📞 +91 {billData.customerPhone}</span>
                            {billData.patientAddress ? (
                                <span>📍 {billData.patientAddress}</span>
                            ) : (
                                <span>📍 {shopDetails.address?.split(',').slice(-1)[0].trim() || 'Karnataka'}, India</span>
                            )}
                            <div style={{ display: 'flex', gap: '15px', marginTop: '2px' }}>
                                {billData.mrn && billData.mrn !== 'N/A' && <span style={{ fontWeight: 600 }}>MRN: <span style={{ fontWeight: 800 }}>{billData.mrn}</span></span>}
                                {billData.patientType && <span style={{ fontWeight: 600 }}>Type: <span style={{ fontWeight: 800 }}>{billData.patientType}</span></span>}
                            </div>
                            <span style={{ marginTop: '4px', fontWeight: 800, color: textMain }}>Doctor: <span style={{ fontWeight: 500 }}>{(!billData.doctorName || billData.doctorName === '-') ? 'Self / Walk-in' : billData.doctorName}</span></span>
                        </div>
                    </div>
                </div>

                {/* Tax Invoice details box */}
                <div style={styles.taxInvoiceBox}>
                    <div style={styles.taxInvoiceHeader}>TAX INVOICE</div>
                    <div style={styles.taxInvoiceGrid}>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice No:</span>
                            <span style={styles.metaValue}>{billData.invoiceId}</span>
                        </div>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice Date:</span>
                            <span style={styles.metaValue}>{new Date(billData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Invoice Time:</span>
                            <span style={styles.metaValue}>{new Date(billData.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>

                        <div style={styles.metaRow}>
                            <span style={styles.metaLabel}>Payment Mode:</span>
                            <span style={styles.metaValue}>{billData.paymentSummary.paymentMode || 'Cash'}</span>
                        </div>
                        <div style={{ ...styles.metaRow, marginBottom: 0 }}>
                            <span style={styles.metaLabel}>Status:</span>
                            <span style={{ ...styles.metaValue, color: '#10b981' }}>{(billData.paymentSummary.status || 'PAID').toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={{ ...styles.th, width: '40px' }}>S.No</th>
                        <th style={{ ...styles.th, textAlign: 'left' }}>Item Name</th>
                        <th style={{ ...styles.th, width: '75px' }}>Expiry</th>
                        <th style={{ ...styles.th, width: '40px' }}>Qty</th>
                        <th style={{ ...styles.th, width: '70px' }}>MRP</th>
                        <th style={{ ...styles.th, width: '50px' }}>Disc%</th>
                        <th style={{ ...styles.th, width: '50px' }}>GST%</th>
                        <th style={{ ...styles.th, width: '80px', textAlign: 'right', borderRight: 'none' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(billData.items || []).map((item: any, idx) => {
                        const itemName = item.itemName || item.productName || 'Unknown Item';
                        const batch = item.batchNo || item.batch || item.batchNum || '-';
                        const rawExpiry = item.expiryDate || item.expiry || item.expDate;
                        // Safe date formatting
                        let expiry = '-';
                        if (rawExpiry && rawExpiry !== '-') {
                            try {
                                const d = new Date(rawExpiry);
                                if (!isNaN(d.getTime())) {
                                    expiry = d.toISOString().split('T')[0];
                                }
                            } catch (e) {
                                expiry = String(rawExpiry).split('T')[0];
                            }
                        }
                        const hsn = item.hsn || item.hsnCode || '-';
                        const qty = item.qty || 0;
                        const rate = item.rate || item.unitRate || 0;
                        const mrp = item.mrp || rate;
                        const disc = item.discountPct || item.discount || 0;
                        const gst = item.gstPct || item.gst || 12;
                        const amount = item.amount || item.total || (qty * rate);

                        return (
                            <tr key={idx}>
                                <td style={styles.td}>{idx + 1}</td>
                                <td style={{ ...styles.td, ...styles.tdLeft }}>
                                    <div style={{ fontWeight: 800 }}>{itemName}</div>
                                    {item.frequency && (
                                        <div style={{ fontSize: '7px', color: '#64748b', fontWeight: 600, marginTop: '2px', fontStyle: 'italic' }}>
                                            Freq: {formatFrequency(item.frequency)}
                                        </div>
                                    )}
                                </td>
                                <td style={styles.td}>{expiry}</td>
                                <td style={{ ...styles.td, fontWeight: 700 }}>{qty}</td>
                                <td style={styles.td}>₹{mrp.toFixed(2)}</td>
                                <td style={styles.td}>{disc}%</td>
                                <td style={styles.td}>{gst}%</td>
                                <td style={{ ...styles.td, ...styles.tdRight, borderRight: 'none', fontWeight: 800 }}>₹{amount.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Calculations and Payment Details */}
            <div style={styles.bottomGrid}>
                <div style={styles.calculations}>
                    {/* MRP Total = GST-inclusive gross amount */}
                    <div style={styles.calcRow}>
                        <span>MRP Total:</span>
                        <span style={styles.calcValue}>₹{(billData.paymentSummary.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {/* Discount applied to MRP */}
                    <div style={styles.calcRow}>
                        <span>Discount:</span>
                        <span style={styles.calcValue}>-₹{(billData.paymentSummary.discount || 0).toFixed(2)}</span>
                    </div>
                    {/* Base price = MRP minus extracted GST */}
                    <div style={styles.calcRow}>
                        <span>Base Price (Excl. GST):</span>
                        <span style={styles.calcValue}>₹{(billData.paymentSummary.taxableAmount || 0).toFixed(2)}</span>
                    </div>
                    {/* Per-rate GST breakdown — GST already inside MRP, not added on top */}
                    {gstBreakdown.map(({ rate, amount }) => (
                        <div key={rate} style={styles.calcRow}>
                            <span>GST @{rate}%:</span>
                            <span style={{ ...styles.calcValue, color: '#6366f1' }}>₹{amount.toFixed(2)}</span>
                        </div>
                    ))}

                    <div style={styles.grandTotalBar}>
                        <span style={styles.gtLabel}>Grand Total:</span>
                        <span style={styles.gtValue}>₹{Math.round(billData.paymentSummary.grandTotal || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={styles.paymentBox}>
                        <div style={styles.paymentHeader}>Payment Details</div>
                        <div style={styles.paymentContent}>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Paid Amount:</span>
                                <span style={styles.metaValue}>₹{(billData.paymentSummary.paidAmount || 0).toLocaleString()}</span>
                            </div>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Balance:</span>
                                <span style={styles.metaValue}>₹{(billData.paymentSummary.balanceDue || 0).toLocaleString()}</span>
                            </div>
                            <div style={styles.payRow}>
                                <span style={styles.metaLabel}>Payment Mode:</span>
                                <span style={styles.metaValue}>{billData.paymentSummary.paymentMode || 'Cash'}</span>
                            </div>

                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '15px', background: '#f8fafc', borderRadius: '15px', border: `1px solid ${borderColor}`, marginTop: '10px' }}>
                        <div style={{ color: primaryColor, fontFamily: "'Brush Script MT', cursive", fontSize: '22px', marginBottom: '5px' }}>Get Well Soon!</div>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: primaryColor }}>{shopDetails.name || 'Pharma Store'}</div>
                        <div style={{ fontSize: '9px', color: textMuted }}>Support: {shopDetails.phone || '-'}</div>
                    </div>
                </div>
            </div>

            {/* Footer note using MainFooter component */}
            <div style={{ marginTop: '80px' }}>
                <MainFooter
                    initialDetails={{
                        name: shopDetails.name || 'Pharma Store',
                        address: shopDetails.address || '',
                        phone: shopDetails.phone || '',
                        email: shopDetails.email || ''
                    }}
                    instructions={termsToRender}
                />
            </div>
        </div>
    );
};

export default PharmacyBillPrint;
