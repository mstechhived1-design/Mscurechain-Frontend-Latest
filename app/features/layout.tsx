import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Features - AI-Powered Hospital Management System',
  description: 'Explore MSCureChain features: AI-powered prescriptions, unified hospital operations, integrated lab & pharmacy, real-time bed management, and enterprise analytics. All in one platform.',
  keywords: [
    'hospital management features',
    'AI prescription system',
    'integrated lab and pharmacy software',
    'hospital analytics dashboard',
    'bed management system',
    'OPD IPD management software',
    'automated clinical workflows',
    'MSCureChain features',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/features',
  },
  openGraph: {
    title: 'Features - AI-Powered Hospital Management System',
    description: 'MSCureChain combines AI with robust security to deliver the most advanced hospital management ecosystem available – from OPD to pharmacy.',
    url: 'https://www.mscurechain.com/features',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Features - Hospital Management System',
      },
    ],
  },
  twitter: {
    title: 'Features - AI-Powered Hospital Management System',
    description: 'MSCureChain combines AI with robust security to deliver the most advanced hospital management ecosystem available.',
    images: ['/assets/logo.png'],
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
