import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Solutions - Integrated Healthcare Platform | MSCureChain',
  description: "MSCureChain's integrated healthcare solutions cover care delivery, clinical operations, emergency sync, enterprise governance, and AI-powered prescriptions. One platform for complete hospital management.",
  keywords: [
    'healthcare management solutions',
    'hospital operations software',
    'integrated care delivery',
    'clinical operational excellence',
    'emergency care management system',
    'hospital enterprise governance',
    'healthcare AI solutions India',
    'MSCureChain solutions',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/solutions',
  },
  openGraph: {
    title: 'Solutions - Integrated Healthcare Platform | MSCureChain',
    description: 'MSCureChain provides a unified digital infrastructure that transforms hospital operations – from integrated care delivery to enterprise governance.',
    url: 'https://www.mscurechain.com/solutions',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Healthcare Solutions',
      },
    ],
  },
  twitter: {
    title: 'Solutions - Integrated Healthcare Platform | MSCureChain',
    description: 'MSCureChain provides a unified digital infrastructure that transforms hospital operations – from integrated care delivery to enterprise governance.',
    images: ['/assets/logo.png'],
  },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
