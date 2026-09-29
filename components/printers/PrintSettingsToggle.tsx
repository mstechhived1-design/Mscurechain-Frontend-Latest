import React from 'react';
import { usePrintStore } from '@/stores/printStore';

const PrintSettingsToggle: React.FC = () => {
    const { printWithHeader, setPrintWithHeader } = usePrintStore();

    return (
        <>
            <style>{`
                @media print {
                    .print-settings-toggle-wrapper {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="print-settings-toggle-wrapper" style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                zIndex: 100,
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                cursor: 'pointer'
            }}>
                <label style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    color: '#334155', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    margin: 0
                }}>
                    <input 
                        type="checkbox" 
                        checked={printWithHeader}
                        onChange={(e) => setPrintWithHeader(e.target.checked)}
                        style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                    />
                    Print with Header & Footer
                </label>
            </div>
        </>
    );
};

export default PrintSettingsToggle;
