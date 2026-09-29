import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'About MSCureChain - How It Works',
  description: 'Learn how MSCureChain unifies hospital operations across doctors, patients, labs, and pharmacies on a single secure platform. AES-256 encryption, instant relay, and unified ledger.',
  keywords: [
    'about MSCureChain',
    'hospital management system architecture',
    'unified healthcare platform',
    'clinical workflow system',
    'multi-portal hospital software',
    'how hospital software works',
    'healthcare technology India',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/about',
  },
  openGraph: {
    title: 'About MSCureChain - How It Works',
    description: 'Discover MSCureChain – a clinical ecosystem connecting doctors, patients, labs, and pharmacies on one unified, secure digital platform.',
    url: 'https://www.mscurechain.com/about',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'About MSCureChain - Hospital Management System',
      },
    ],
  },
  twitter: {
    title: 'About MSCureChain - How It Works',
    description: 'Discover MSCureChain – a clinical ecosystem connecting doctors, patients, labs, and pharmacies on one unified, secure digital platform.',
    images: ['/assets/logo.png'],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
