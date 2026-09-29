import React, { useEffect, useState } from 'react';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';
import { Phone, Mail } from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';

const FooterPrint: React.FC = () => {
    const [settings, setSettings] = useState<LabSettings>({
        name: 'MediLab Laboratory',
        address: 'RAM MAIN ROAD, BESIDE APOLLO PHARMACY, RENIGUNTA - 517 520',
        phone: '9059373238',
        email: 'blueskydiagnostics.scan@gmail.com',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await LabSettingsService.getSettings();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('Error fetching lab settings for footer:', error);
            }
        };
        fetchSettings();
    }, []);

    const phones = settings.phone ? settings.phone.split(',').map(p => p.trim()) : [];
    const { printWithHeader } = usePrintStore();

    if (!printWithHeader) {
        return <div style={{ height: '80px', width: '100%' }}></div>;
    }

    return (
        <div style={{ width: '100%', fontFamily: 'Arial, sans-serif', marginTop: '10px', paddingBottom: '10px' }} className="lab-footer-container">
            <style>
                {`
                @media screen and (max-width: 640px) {
                    .lab-footer-container {
                        margin-top: 12px !important;
                    }
                    .lab-footer-banner-row {
                        flex-direction: column !important;
                        gap: 2px !important;
                        box-shadow: none !important;
                    }
                    .lab-footer-phone-side, .lab-footer-email-side {
                        width: 100% !important;
                        clip-path: none !important;
                        margin-left: 0 !important;
                        justify-content: center !important;
                        padding: 4px 12px !important;
                        font-size: 10px !important;
                        border-radius: 4px !important;
                    }
                    .lab-footer-info-row {
                        flex-direction: column !important;
                        align-items: center !important;
                        gap: 8px !important;
                        text-align: center !important;
                        padding: 8px 0 !important;
                    }
                    .lab-footer-disclaimers, .lab-footer-address {
                        max-width: 100% !important;
                        text-align: center !important;
                        font-size: 9px !important;
                    }
                    .lab-footer-disclaimers li {
                        display: inline-block !important;
                        margin: 0 4px !important;
                    }
                }
                `}
            </style>

            {/* ── Contact Banner Row ── */}
            <div style={{ display: 'flex', width: '100%', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} className="lab-footer-banner-row">

                {/* Green phone side — takes ~50% width */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    width: '50%',
                    clipPath: 'polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%)',
                    boxSizing: 'border-box',
                }} className="lab-footer-phone-side">
                    <Phone size={14} fill="white" strokeWidth={0} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>
                        {phones.join('  |  ') || '0000000000'}
                    </span>
                </div>

                {/* Blue email side — takes remaining space */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flex: 1,
                    marginLeft: '-15px',
                    clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 5% 100%, 0 50%)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }} className="lab-footer-email-side">
                    <Mail size={14} style={{ flexShrink: 0 }} />
                    <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {settings.email || 'admin@medilab.com'}
                    </span>
                </div>
            </div>

            {/* ── Disclaimers + Address Row ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '2px 4px 0 4px',
                gap: '16px',
            }} className="lab-footer-info-row">
                {/* Left: Disclaimers */}
                <ul style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    color: '#1e3a8a',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    fontWeight: '700',
                    flex: '0 0 auto',
                    maxWidth: '58%',
                }} className="lab-footer-disclaimers">
                    <li>• Results clinically correlation recommended</li>
                    <li>• Contact lab immediately for alarming results</li>
                    <li>• Not for medico-legal purposes</li>
                    <li>• (*) Tests are not NABL accredited</li>
                </ul>

                {/* Right: Address */}
                <p style={{
                    margin: 0,
                    color: '#1a3c5a',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'right',
                    flex: '0 0 auto',
                    maxWidth: '40%',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                }} className="lab-footer-address">
                    {settings.address || 'RAM MAIN ROAD, BESIDE APOLLO PHARMACY, RENIGUNTA - 517 520'}
                </p>
            </div>
        </div>
    );
};

export default FooterPrint;
