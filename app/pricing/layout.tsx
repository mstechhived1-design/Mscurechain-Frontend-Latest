import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Pricing - Affordable Lifetime HMS License | MSCureChain',
  description: 'MSCureChain offers the most affordable hospital management software with a pay-once lifetime license. No monthly fees. Includes all 9 portals: doctor, patient, lab, pharmacy, admin & more.',
  keywords: [
    'hospital management software pricing',
    'affordable HMS software India',
    'lifetime hospital software license',
    'buy hospital management system',
    'no monthly fee hospital software',
    'hospital software cost',
    'MSCureChain pricing',
    'healthcare software price',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/pricing',
  },
  openGraph: {
    title: 'Pricing - Affordable Lifetime HMS License | MSCureChain',
    description: 'Never pay monthly again. MSCureChain is the most affordable self-hosted Hospital Management Software with a pay-once lifetime license including all 9 portals.',
    url: 'https://www.mscurechain.com/pricing',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Pricing - Lifetime Hospital Software License',
      },
    ],
  },
  twitter: {
    title: 'Pricing - Affordable Lifetime HMS License | MSCureChain',
    description: 'Never pay monthly again. MSCureChain is the most affordable self-hosted Hospital Management Software with a pay-once lifetime license.',
    images: ['/assets/logo.png'],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
