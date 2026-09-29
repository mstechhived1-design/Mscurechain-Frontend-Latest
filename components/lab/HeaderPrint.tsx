import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { Phone, Mail } from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';
import PrintSettingsToggle from '@/components/printers/PrintSettingsToggle';

const HeaderPrint: React.FC = () => {
    const [settings, setSettings] = useState<LabSettings>({
        name: 'Lifeline Diagnostic Labs',
        address: 'Shop No. B-97, Near Vyom Hospital\nOkhla, New Delhi-110025',
        phone: '+91 85xxxxxx20, +91 85xxxxxx20',
        email: 'lifelinelabofflabs@gmail.com',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await LabSettingsService.getSettings();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('Error fetching lab settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const phones = settings.phone ? settings.phone.split(',').map(p => p.trim()) : [];
    const { printWithHeader } = usePrintStore();

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        marginBottom: '20px',
    };

    const topSectionStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '8px 0 15px 0',
        gap: '20px', 
    };

    const logoContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        backgroundColor: '#ffffff',
        minWidth: '100px',
        maxWidth: '150px',
    };

    const logoStyle: React.CSSProperties = {
        width: 'auto',
        maxWidth: '100%',
        maxHeight: '100px',
        objectFit: 'contain',
    };

    const dividerStyle: React.CSSProperties = {
        height: '80px',
        width: '2px',
        background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)',
        flexShrink: 0,
    };

    const rightSectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
        gap: '2px',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '38px', 
        fontWeight: '900',
        fontFamily: '"Exo 2", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: '#1e3a8a',
        margin: '0',
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
        lineHeight: '1',
    };

    const phoneBannerStyle: React.CSSProperties = {
        display: 'flex',
        backgroundColor: '#15803d', // Professional forest green
        color: '#ffffff',
        padding: '4px 12px',
        borderRadius: '4px',
        alignItems: 'center',
        fontSize: '14px',
        fontWeight: '700',
        marginBottom: '6px',
        width: 'fit-content',
    };

    const phoneItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    };

    const emailStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#1e3a8a',
        fontSize: '13px',
        fontWeight: '700',
        marginBottom: '2px',
    };

    const addressStyle: React.CSSProperties = {
        color: '#475569',
        fontSize: '13px',
        margin: 0,
        fontWeight: '600',
        lineHeight: '1.3',
    };

    const bottomLineStyle: React.CSSProperties = {
        width: '100%',
        height: '4px',
        backgroundColor: '#15803d',
        borderRadius: '2px',
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <PrintSettingsToggle />
            {printWithHeader ? (
                <div style={containerStyle} className="lab-header-container">
                    <style>
                        {`
                        @media screen and (max-width: 640px) {
                            .lab-header-container {
                                margin-bottom: 10px !important;
                            }
                            .lab-header-top-section {
                                flex-direction: column !important;
                                align-items: center !important;
                                gap: 8px !important;
                                padding: 8px 0 !important;
                                text-align: center !important;
                            }
                            .lab-header-logo-container {
                                min-width: unset !important;
                                max-width: 110px !important;
                                margin-bottom: 2px !important;
                            }
                            .lab-header-logo {
                                max-height: 55px !important;
                                width: auto !important;
                            }
                            .lab-header-divider {
                                display: none !important;
                            }
                            .lab-header-right-section {
                                align-items: center !important;
                                width: 100% !important;
                                gap: 4px !important;
                            }
                            .lab-header-title {
                                font-size: 18px !important;
                                margin-bottom: 4px !important;
                                line-height: 1.1 !important;
                                white-space: normal !important;
                                max-width: 90% !important;
                            }
                            .lab-header-email, 
                            .lab-header-address, 
                            .lab-header-phone-container {
                                font-size: 10px !important;
                                justify-content: center !important;
                                text-align: center !important;
                                line-height: 1.2 !important;
                            }
                            .lab-header-email svg, 
                            .lab-header-phone-container svg {
                                width: 10px !important;
                                height: 10px !important;
                            }
                            .lab-header-contact-row {
                                flex-direction: column !important;
                                gap: 4px !important;
                                align-items: center !important;
                                width: 100% !important;
                            }
                            .lab-header-divider-small {
                                display: none !important;
                            }
                            .lab-header-bottom-line {
                                height: 2px !important;
                            }
                        }
                        @media print {
                            .lab-header-container, .lab-header-top-section {
                                display: table !important;
                                width: 100% !important;
                            }
                            .lab-header-logo-container {
                                display: table-cell !important;
                                width: 130px !important;
                                vertical-align: middle !important;
                            }
                            .lab-header-divider {
                                display: table-cell !important;
                                width: 15px !important;
                            }
                            .lab-header-right-section {
                                display: table-cell !important;
                                vertical-align: middle !important;
                                padding-left: 10px !important;
                            }
                            .lab-header-right-section *,
                            .lab-header-contact-row,
                            .lab-header-phone-container,
                            .lab-header-email {
                                display: block !important;
                                position: static !important;
                            }
                        }
                        `}
                    </style>
                    {/* Top section with Logo and Contact Info */}
                    <div style={topSectionStyle} className="lab-header-top-section">

                        {/* Left Side: Logo */}
                        <div style={logoContainerStyle} className="lab-header-logo-container">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Lab Logo" style={logoStyle} className="lab-header-logo" />
                            ) : (
                                <div className="lab-header-logo" style={{ ...logoStyle, width: '120px', height: '80px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 'bold', borderRadius: '8px' }}>
                                    {settings.name || 'LOGO'}
                                </div>
                            )}
                        </div>

                        <div style={dividerStyle} className="lab-header-divider" />

                        {/* Right Side: Contact Details */}
                        <div style={rightSectionStyle} className="lab-header-right-section">
                            <h1 style={titleStyle} className="lab-header-title">{settings.name}</h1>

                            <div style={emailStyle} className="lab-header-email">
                                <Mail size={12} fill="#1e3a8a" color="#ffffff" strokeWidth={1} />
                                <span>{settings.email || 'lifelinelabofflabs@gmail.com'}</span>
                            </div>

                            <div className="lab-header-contact-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                                <p style={addressStyle} className="lab-header-address">
                                    {settings.address ? settings.address.replace(/\n/g, ', ') : 'Shop No. B-97, Near Vyom Hospital, Okhla, New Delhi-110025'}
                                </p>
                                
                                <div className="lab-header-divider-small" style={{ height: '12px', width: '1px', backgroundColor: '#cbd5e1' }} />

                                <div className="lab-header-phone-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '13px', fontWeight: '700' }}>
                                    <Phone size={12} fill="#15803d" strokeWidth={0} />
                                    <span>
                                        {phones.length > 0 ? phones.join(' | ') : '+91 85xxxxxx20'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Border Line */}
                    <div style={bottomLineStyle} className="lab-header-bottom-line"></div>
                </div>
            ) : (
                <div style={{ height: '120px', width: '100%' }}></div>
            )}
        </div>
    );
};

export default HeaderPrint;
