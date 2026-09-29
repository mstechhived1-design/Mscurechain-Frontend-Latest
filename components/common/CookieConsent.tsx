'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'mscurechain_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      const timer = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setAnimating(true))
        );
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = (status: 'accepted' | 'declined') => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(COOKIE_CONSENT_KEY, status);
    }, 380);
  };

  if (!visible) return null;

  const cookieTypes = [
    {
      icon: '🔒',
      label: 'Essential',
      desc: 'Always active',
      bg: '#f0fdf4',
      iconBg: '#dcfce7',
      color: '#16a34a',
    },
    {
      icon: '⚙️',
      label: 'Functional',
      desc: 'Preferences',
      bg: '#eff6ff',
      iconBg: '#dbeafe',
      color: '#2563eb',
    },
    {
      icon: '📊',
      label: 'Analytics',
      desc: 'Performance',
      bg: '#fffbeb',
      iconBg: '#fef3c7',
      color: '#d97706',
    },
  ];

  return (
    <>
      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie Consent"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          opacity: animating ? 1 : 0,
          transform: animating ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.3,0.64,1)',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e8edf5',
          boxShadow:
            '0 4px 6px -1px rgba(15,23,42,0.04), 0 10px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(37,99,235,0.04)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top gradient bar */}
        <div
          style={{
            height: '4px',
            background:
              'linear-gradient(90deg, #2563eb 0%, #60a5fa 40%, #3b82f6 70%, #2563eb 100%)',
            backgroundSize: '200% 100%',
            animation: 'cookieShimmer 3s linear infinite',
          }}
        />

        <div style={{ padding: '22px 22px 20px' }}>

          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Cookie emoji in styled box */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  lineHeight: 1,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.12)',
                }}
              >
                🍪
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  Cookie Preferences
                </p>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2563eb',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  MSCureChain
                </p>
              </div>
            </div>

            {/* Close ✕ */}
            <button
              id="cookie-close-btn"
              onClick={() => handleClose('declined')}
              aria-label="Close"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#0f172a';
                b.style.color = '#fff';
                b.style.borderColor = '#0f172a';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#f8fafc';
                b.style.color = '#94a3b8';
                b.style.borderColor = '#e2e8f0';
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Description ── */}
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '13px',
              lineHeight: '1.7',
              color: '#64748b',
              fontWeight: 400,
            }}
          >
            We use cookies to enhance your experience, keep you securely signed in,
            and improve our platform. By clicking{' '}
            <strong style={{ color: '#0f172a', fontWeight: 700 }}>Accept All</strong>,
            you agree to our{' '}
            <Link
              href="/terms"
              style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}
            >
              Privacy Policy
            </Link>
            .
          </p>

          {/* ── Cookie type mini-cards (matching landing page card style) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            {cookieTypes.map(tag => (
              <div
                key={tag.label}
                style={{
                  background: tag.bg,
                  borderRadius: '12px',
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  border: `1px solid ${tag.iconBg}`,
                  transition: 'transform 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: tag.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                  }}
                >
                  {tag.icon}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: tag.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {tag.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '10px',
                    color: '#94a3b8',
                    fontWeight: 500,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {tag.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '16px' }} />

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Accept All */}
            <button
              id="cookie-accept-btn"
              onClick={() => handleClose('accepted')}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 800,
                background: '#2563eb',
                color: '#ffffff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 12px rgba(37,99,235,0.30)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#1d4ed8';
                b.style.boxShadow = '0 4px 18px rgba(37,99,235,0.40)';
                b.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#2563eb';
                b.style.boxShadow = '0 2px 12px rgba(37,99,235,0.30)';
                b.style.transform = 'translateY(0)';
              }}
            >
              Accept All
            </button>

            {/* Decline */}
            <button
              id="cookie-decline-btn"
              onClick={() => handleClose('declined')}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: '#ffffff',
                color: '#64748b',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#f1f5f9';
                b.style.borderColor = '#cbd5e1';
                b.style.color = '#0f172a';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#ffffff';
                b.style.borderColor = '#e2e8f0';
                b.style.color = '#64748b';
              }}
            >
              Decline
            </button>
          </div>

          {/* ── Footer note ── */}
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '11px',
              color: '#cbd5e1',
              textAlign: 'center',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            Essential cookies always remain active.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cookieShimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </>
  );
}
