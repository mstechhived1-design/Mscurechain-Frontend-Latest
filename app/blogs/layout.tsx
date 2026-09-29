import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Medical Insights & Research Blogs | MSCureChain',
  description: 'Stay updated with the latest medical breakthroughs, clinical studies, and healthcare technology insights from the MSCureChain research team. Knowledge for better patient care.',
  keywords: [
    'medical insights blog',
    'healthcare technology articles',
    'clinical research blog India',
    'hospital management blog',
    'MSCureChain medical blog',
    'healthcare news',
    'clinical studies',
    'medical breakthroughs blog',
  ],
  alternates: {
    canonical: 'https://www.mscurechain.com/blogs',
  },
  openGraph: {
    title: 'Medical Insights & Research Blogs | MSCureChain',
    description: 'Latest medical breakthroughs, clinical studies, and healthcare technology insights from the MSCureChain global research team.',
    url: 'https://www.mscurechain.com/blogs',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Medical Insights & Research Blog',
      },
    ],
  },
  twitter: {
    title: 'Medical Insights & Research Blogs | MSCureChain',
    description: 'Latest medical breakthroughs, clinical studies, and healthcare technology insights from the MSCureChain global research team.',
    images: ['/assets/logo.png'],
  },
};

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
