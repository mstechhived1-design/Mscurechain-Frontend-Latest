import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Healthcare Portals - Live Demo | MSCureChain',
  description: 'Explore all MSCureChain portal modules live: Patient Portal, Doctor Terminal, Hospital Admin, Lab & Diagnostics, Pharmacy POS, Emergency Care, Staff Portal, Discharge Center, and Helpdesk.',
  keywords: [
    'hospital management portal demo',
    'patient portal demo',
    'doctor terminal software',
    'hospital admin portal',
    'lab management portal',
    'pharmacy POS demo',
    'hospital software live demo',
    'MSCureChain portals',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/portals',
  },
  openGraph: {
    title: 'Healthcare Portals - Live Demo | MSCureChain',
    description: 'Explore all 9 MSCureChain portal modules live: Patient, Doctor, Admin, Lab, Pharmacy, Emergency, Staff, Discharge, and Helpdesk.',
    url: 'https://www.mscurechain.com/portals',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Healthcare Portals Live Demo',
      },
    ],
  },
  twitter: {
    title: 'Healthcare Portals - Live Demo | MSCureChain',
    description: 'Explore all 9 MSCureChain portal modules live: Patient, Doctor, Admin, Lab, Pharmacy, Emergency, Staff, Discharge, and Helpdesk.',
    images: ['/assets/logo.png'],
  },
};

export default function PortalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
