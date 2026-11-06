'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[MSCureChain GlobalError Caught]:', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#f8fafc',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                padding: '24px',
                textAlign: 'center'
            }}>
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '36px',
                    maxWidth: '460px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: '#fef2f2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>!</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
                        System Display Error
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px' }}>
                        {error?.message || "A rendering issue prevented the workspace from displaying correctly."}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}

