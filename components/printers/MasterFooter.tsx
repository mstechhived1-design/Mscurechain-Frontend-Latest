import React from 'react';
import { usePrintStore } from '@/stores/printStore';

interface MasterFooterProps {
    initialDetails: {
        name: string;
    };
}

const MasterFooter: React.FC<MasterFooterProps> = ({ initialDetails }) => {
    const { printWithHeader } = usePrintStore();

    if (!printWithHeader) {
        return <div style={{ height: '80px', width: '100%' }}></div>;
    }

    return (
        <div style={{
            width: '100%',
            marginTop: '30px',
            paddingTop: '15px',
            borderTop: '1px dashed #e5e7eb',
            fontFamily: "'Inter', sans-serif",
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                width: '100%'
            }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        color: '#111827',
                        textTransform: 'uppercase'
                    }}>
                        Terms & Conditions
                    </h4>
                    <p style={{ 
                        margin: 0, 
                        fontSize: '9px', 
                        color: '#6b7280', 
                        lineHeight: '1.4',
                        maxWidth: '80%'
                    }}>
                        1. Please arrive 15 minutes before your appointment time.<br />
                        2. Carry this receipt for verification at the reception.<br />
                        3. This receipt is valid only for the date and time mentioned.
                    </p>
                </div>

                <div style={{ 
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '10px'
                }}>
                    <div style={{
                        width: '120px',
                        height: '40px',
                        borderBottom: '1px solid #111827'
                    }}></div>
                    <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '700', 
                        color: '#111827',
                        textTransform: 'uppercase'
                    }}>
                        Authorized Signatory
                    </span>
                </div>
            </div>

            <div style={{
                marginTop: '20px',
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
            }}>
                <p style={{ 
                    margin: 0, 
                    fontSize: '10px', 
                    fontWeight: '700', 
                    color: '#0d9488' 
                }}>
                    Thank you for choosing {initialDetails.name || 'our Healthcare Services'}.
                </p>
                <p style={{ 
                    margin: '2px 0 0 0', 
                    fontSize: '8px', 
                    color: '#9ca3af' 
                }}>
                    
                </p>
            </div>
        </div>
    );
};

export default MasterFooter;
