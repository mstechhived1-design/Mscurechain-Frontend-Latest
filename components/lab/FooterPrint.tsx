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
            {/* ── Contact Banner Row (Table-based: strictly guaranteed never to wrap or stack) ── */}
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '10px',
                    tableLayout: 'fixed',
                    border: 'none',
                }}
                className="lab-footer-banner-table"
            >
                <tbody>
                    <tr>
                        {/* Green phone side — exactly 50% width */}
                        <td
                            style={{
                                width: '50%',
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                verticalAlign: 'middle',
                                border: 'none',
                                boxSizing: 'border-box',
                            }}
                            className="lab-footer-phone-side"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                <Phone size={13} fill="white" strokeWidth={0} style={{ flexShrink: 0 }} />
                                <span>{phones.join('  |  ') || '0000000000'}</span>
                            </div>
                        </td>

                        {/* Blue email side — exactly 50% width */}
                        <td
                            style={{
                                width: '50%',
                                backgroundColor: '#1e3a8a',
                                color: '#ffffff',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                verticalAlign: 'middle',
                                textAlign: 'right',
                                border: 'none',
                                boxSizing: 'border-box',
                            }}
                            className="lab-footer-email-side"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                                <Mail size={13} style={{ flexShrink: 0 }} />
                                <span>{settings.email || 'admin@medilab.com'}</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* ── Disclaimers + Address Row (Table-based for guaranteed 2-column layout) ── */}
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    border: 'none',
                }}
                className="lab-footer-info-table"
            >
                <tbody>
                    <tr>
                        {/* Left: Disclaimers (58% width) */}
                        <td
                            style={{
                                width: '58%',
                                verticalAlign: 'top',
                                border: 'none',
                                padding: '2px 4px 0 0',
                            }}
                            className="lab-footer-disclaimers"
                        >
                            <ul style={{
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                color: '#1e3a8a',
                                fontSize: '11px',
                                lineHeight: '1.6',
                                fontWeight: '700',
                            }}>
                                <li>• Results clinically correlation recommended</li>
                                <li>• Contact lab immediately for alarming results</li>
                                <li>• Not for medico-legal purposes</li>
                                <li>• (*) Tests are not NABL accredited</li>
                            </ul>
                        </td>

                        {/* Right: Address (42% width) */}
                        <td
                            style={{
                                width: '42%',
                                verticalAlign: 'top',
                                textAlign: 'right',
                                border: 'none',
                                padding: '2px 0 0 4px',
                            }}
                            className="lab-footer-address"
                        >
                            <p style={{
                                margin: 0,
                                color: '#1a3c5a',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                lineHeight: '1.6',
                                wordBreak: 'break-word',
                            }}>
                                {settings.address || 'RAM MAIN ROAD, BESIDE APOLLO PHARMACY, RENIGUNTA - 517 520'}
                            </p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default FooterPrint;
