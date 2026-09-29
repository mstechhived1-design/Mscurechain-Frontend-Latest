import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';

export interface MasterShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
}

interface MasterHeaderProps {
    initialDetails: MasterShopDetails;
}

const MasterHeader: React.FC<MasterHeaderProps> = ({ initialDetails }) => {
    const { printWithHeader } = usePrintStore();

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <PrintSettingsToggle />
            {printWithHeader ? (
                <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            marginBottom: '15px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            boxSizing: 'border-box'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                gap: '20px',
                padding: '10px 0',
                width: '100%',
                borderBottom: '4px solid #0d9488'
            }}>
                {/* Logo Section */}
                <div style={{ flexShrink: 0 }}>
                    {initialDetails.logo ? (
                        <img
                            src={initialDetails.logo}
                            alt="Logo"
                            style={{
                                height: '70px',
                                width: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '70px',
                            height: '70px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        }}>LOGO</div>
                    )}
                </div>

                {/* Info Section */}
                <div style={{
                    flex: '1',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '900',
                        color: '#111827',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.025em',
                        lineHeight: '1'
                    }}>
                        {initialDetails.name || 'Hospital Name'}
                    </h1>
                    
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        color: '#4b5563',
                        fontSize: '11px',
                        fontWeight: '600'
                    }}>
                        {initialDetails.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{initialDetails.address}</span>
                                <MapPin size={12} color="#0d9488" />
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {initialDetails.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{initialDetails.email}</span>
                                    <Mail size={12} color="#0d9488" />
                                </div>
                            )}
                            {initialDetails.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{initialDetails.phone}</span>
                                    <Phone size={12} color="#0d9488" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#0d9488',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}>
                    Official Appointment Receipt
                </div>
                <div style={{
                    fontSize: '9px',
                    color: '#9ca3af',
                    fontWeight: '500'
                }}>
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
            ) : (
                <div style={{ height: '120px', width: '100%' }}></div>
            )}
        </div>
    );
};

export default MasterHeader;
