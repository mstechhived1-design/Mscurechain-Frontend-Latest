import React, { useEffect, useState } from 'react';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { Mail, Phone } from 'lucide-react';
import { usePrintStore } from '@/stores/printStore';

export interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
}

interface MainFooterProps {
    initialDetails?: ShopDetails;
    instructions?: string[];
}

const MainFooter: React.FC<MainFooterProps> = ({ initialDetails, instructions }) => {
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
                    }));
                }
            } catch (error) {
                console.error('Error fetching hospital details for footer:', error);
            }
        };
        fetchHospital();
    }, []);

    const defaultInstructions = [
        'clinical correlation required',
        'Contact helpdesk for alarms',
        'Not for medico-legal use',
        '* non-NABL accredited'
    ];

    const { printWithHeader, footerTerms } = usePrintStore.getState();
    
    // Parse footerTerms into an array of lines, falling back to instructions prop or defaultInstructions
    const customInstructions = footerTerms 
        ? footerTerms.split('\n').filter(t => t.trim() !== '') 
        : null;
    const displayInstructions = customInstructions || instructions || defaultInstructions;

    if (!printWithHeader) {
        return <div style={{ height: '80px', width: '100%' }}></div>;
    }

    return (
        <div style={{
            width: '100%',
            fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
        }}>
            {/* Top separator line */}
            <div style={{ width: '100%', height: '3px', backgroundColor: '#10b981', borderRadius: '2px', marginBottom: '6px' }} />

            {/* Footer content */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: '6px',
                marginBottom: '6px',
            }}>
                {details.phone && details.phone !== 'N/A' && details.phone !== 'Phone Number' && (
                    <div style={{
                        flex: '1',
                        background: '#22c55e',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontWeight: '900',
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                        gap: '6px',
                    }}>
                        <Phone size={12} color="white" fill="white" />
                        {details.phone}
                    </div>
                )}
                {details.email && details.email !== 'N/A' && details.email !== 'Email Address' && (
                    <div style={{
                        flex: '2',
                        background: '#1e3a8a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '11px',
                        gap: '6px',
                    }}>
                        <Mail size={11} color="white" />
                        {details.email}
                    </div>
                )}
            </div>

            {/* Address & name row */}
            {details.address && details.address !== 'N/A' && details.address !== 'Hospital Address' && (
                <div style={{
                    textAlign: 'center',
                    fontSize: '9px',
                    color: '#64748b',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    paddingBottom: '4px',
                }}>
                    {details.name && <span style={{ fontWeight: '700', color: '#1e3a8a' }}>{details.name} &mdash; </span>}
                    {details.address}
                </div>
            )}

            {/* Print spacing */}
            <div style={{ height: '6px' }} />
        </div>
    );
};


export default MainFooter;