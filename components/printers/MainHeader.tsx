import React, { useEffect, useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    gstNumber?: string;
}

interface MainHeaderProps {
    initialDetails?: ShopDetails;
}

const MainHeader: React.FC<MainHeaderProps> = ({ initialDetails }) => {
    const [details, setDetails] = useState<ShopDetails>(initialDetails || {
        name: 'Hospital Name',
        address: 'Hospital Address',
        phone: 'Phone Number',
        email: 'Email Address',
    });

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const response = await hospitalAdminService.getHospital();
                if (response?.hospital) {
                    const h = response.hospital;
                    setDetails(prev => ({
                        name: (prev.name === 'Hospital Name' || prev.name === 'CureChain Hospital' || prev.name === ' Hospital' || !prev.name) ? (h.name || prev.name) : prev.name,
                        address: (prev.address === 'Hospital Address' || prev.address === 'Hospital Address details here' || !prev.address) ? (h.address || prev.address) : prev.address,
                        phone: (prev.phone === 'Phone Number' || prev.phone === '+91-XXXXXXXXXX' || !prev.phone || prev.phone === 'N/A') ? (h.phone || prev.phone) : prev.phone,
                        email: (prev.email === 'Email Address' || !prev.email || prev.email === 'N/A') ? (h.email || prev.email) : prev.email,
                        logo: !prev.logo ? (h.logo || prev.logo) : prev.logo,
                        gstNumber: !prev.gstNumber ? (h.gstNumber || prev.gstNumber) : prev.gstNumber
                    }));
                }
            } catch (error) {
                console.error('Error fetching hospital details for header:', error);
            }
        };
        fetchHospital();
    }, []);

    const { printWithHeader } = usePrintStore();

    return (
        <div style={{ position: 'relative', width: '100%' }} className="main-header-print-container">
            <PrintSettingsToggle />
            {printWithHeader ? (
                <div style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    marginBottom: '12px',
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact',
                    padding: '0',
                    boxSizing: 'border-box'
                }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '20px',
                padding: '8px 0',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Logo Section */}
                <div style={{
                    flex: '0 0 auto',
                    paddingRight: '15px',
                }}>
                    {details.logo ? (
                        <img
                            src={details.logo}
                            alt="Hospital Logo"
                            style={{
                                width: '100px',
                                height: '100px',
                                objectFit: 'contain',
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '90px',
                            height: '90px',
                            border: '1.5px solid #1e3a8a',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1e3a8a',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>LOGO</div>
                    )}
                </div>

                {/* Vertical Divider Line */}
                <div style={{
                    width: '2px',
                    height: '70px',
                    backgroundColor: '#1e3a8a',
                    opacity: 0.1,
                    display: 'block'
                }}></div>

                {/* Details Section */}
                <div style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    paddingLeft: '5px'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontWeight: '900',
                        color: '#1e3a8a',
                        lineHeight: '1.1',
                        fontSize: 'clamp(18px, 3vw, 24px)',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.5px'
                    }}>
                        {details.name}
                    </h1>

                    {/* Email Row with Icon */}
                    {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#1e40af',
                            fontSize: 'clamp(11px, 1.8vw, 15px)',
                            fontWeight: '700',
                            marginTop: '2px'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#1e3a8a',
                                borderRadius: '2px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Mail size={8} color="white" />
                            </div>
                            <span>{details.email}</span>
                        </div>
                    )}

                    {/* Address & Phone Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: 'clamp(10px, 1.6vw, 14px)',
                        color: '#475569',
                        fontWeight: '600',
                        marginTop: '2px',
                        width: '100%'
                    }}>
                        {details.address && details.address !== 'N/A' && details.address !== 'Hospital Address' && (
                            <span style={{ color: '#64748b' }}>{details.address}</span>
                        )}
                        
                        {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: details.address ? '8px' : '0' }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    backgroundColor: '#22c55e',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Phone size={10} color="white" fill="white" />
                                </div>
                                <span style={{ color: '#16a34a', fontWeight: '800' }}>{details.phone}</span>
                            </div>
                        )}
                        
                        {details.gstNumber && details.gstNumber !== 'N/A' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: (details.address || details.phone) ? '8px' : '0' }}>
                                <span style={{ color: '#1e3a8a', fontWeight: '900', fontSize: 'clamp(9px, 1.4vw, 13px)' }}>
                                    GST No: {details.gstNumber}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Accent line */}
            <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#10b981', // Solid teal/green like Image 2
                marginTop: '10px',
                borderRadius: '2px'
            }}></div>
        </div>
            ) : (
                <div style={{ height: '120px', width: '100%' }}></div>
            )}
        </div>
    );
};


export default MainHeader;
