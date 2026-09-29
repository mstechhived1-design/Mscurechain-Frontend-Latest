import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Optimized Inter font with display swap and preload
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mscurechain.com'),
  title: {
    default: "MSCureChain - Modern Hospital Management System",
    template: "%s | MSCureChain"
  },
  description: "Comprehensive digital healthcare platform providing seamless patient care, appointment booking, electronic health records, and integrated hospital management. Transform your healthcare experience with MSCureChain.",
  keywords: [
    "hospital management system",
    "healthcare software",
    "patient portal",
    "doctor terminal",
    "electronic health records",
    "EHR system",
    "hospital administration",
    "medical records",
    "appointment booking",
    "digital prescriptions",
    "lab management",
    "pharmacy POS",
    "hospital software",
    "healthcare technology",
    "MSCureChain",
    "clinical management system"
  ],
  authors: [{ name: "MS Tech Hive", url: "https://mstechhive.com" }],
  creator: "MS Tech Hive",
  publisher: "MS Tech Hive",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/assets/logo.png', sizes: 'any' },
      { url: '/assets/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/logo.png' },
    ],
    shortcut: ['/assets/logo.png'],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.mscurechain.com',
    siteName: 'MSCureChain',
    title: 'MSCureChain - Modern Hospital Management System',
    description: 'Comprehensive digital healthcare platform providing seamless patient care, appointment booking, electronic health records, and integrated hospital management.',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'MSCureChain Hospital Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MSCureChain - Modern Hospital Management System',
    description: 'Comprehensive digital healthcare platform providing seamless patient care, appointment booking, and integrated hospital management.',
    creator: '@MSTECHHIVE',
    site: '@MSTECHHIVE',
    images: ['/assets/logo.png'],
  },
  verification: {
    google: 'googleb74881dd0fd5597a',
  },
  category: 'Healthcare',
  alternates: {
    canonical: 'https://www.mscurechain.com',
  },
};

import SwipeableToaster from '@/components/ui/SwipeableToaster';
import FloatingChat from '@/components/chat/FloatingChat';
import Providers from './providers';
import ProgressBar from '@/components/ui/ProgressBar';
import { Suspense } from 'react';
import CookieConsent from '@/components/shared/CookieConsent';
import OfflineDetector from '@/components/layout/OfflineDetector';
import OfflineBanner from '@/components/ui/OfflineBanner';
import MainContentWrapper from '@/components/layout/MainContentWrapper';

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data: SoftwareApplication schema for Google rich results */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "MSCureChain",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web",
              "url": "https://www.mscurechain.com",
              "description": "MSCureChain is a comprehensive AI-powered Hospital Management System (HMS) that connects patients, doctors, labs, pharmacies, and administrators on a single secure digital platform.",
              "offers": {
                "@type": "Offer",
                "price": "333",
                "priceCurrency": "INR",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "333",
                  "priceCurrency": "INR",
                  "referenceQuantity": {
                    "@type": "QuantitativeValue",
                    "value": "1",
                    "unitCode": "DAY"
                  }
                }
              },
              "publisher": {
                "@type": "Organization",
                "name": "MS Tech Hive",
                "url": "https://mstechhive.com",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+91-9032223352",
                  "contactType": "sales",
                  "email": "info@mstechhive.com"
                }
              },
              "featureList": [
                "AI-Powered Prescription Generation",
                "Patient Portal & Health Records",
                "Doctor Consultation Terminal",
                "Hospital Administration Dashboard",
                "Lab & Diagnostics Management",
                "Pharmacy POS System",
                "Emergency & EMS Tracking",
                "Inpatient Bed Management",
                "Multi-tenant Hospital Architecture",
                "Role-based Access Control"
              ],
              "screenshot": "https://www.mscurechain.com/assets/dashboard.png",
              "image": "https://www.mscurechain.com/assets/logo.png",
              "sameAs": [
                "https://mstechhive.com"
              ]
            })
          }}
        />
        <Script
          id="theme-detector"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
               (function() {
                 try {
                   var path = window.location.pathname;
                   var isLanding = path === '/' || 
                                   path.startsWith('/about') || 
                                   path.startsWith('/features') || 
                                   path.startsWith('/pricing') || 
                                   path.startsWith('/solutions') || 
                                   path.startsWith('/portals');
                                   
                   if (isLanding) {
                     document.documentElement.classList.remove('dark');
                     document.documentElement.style.colorScheme = 'light';
                     document.documentElement.setAttribute('data-theme', 'light');
                     document.documentElement.setAttribute('data-force-light', 'true');
                     // Dark Reader Lock
                     var meta = document.createElement('meta');
                     meta.name = 'darkreader-lock';
                     meta.content = 'yes';
                     document.head.appendChild(meta);
                     return;
                   }

                   var storage = localStorage.getItem('theme-storage');
                   var theme = 'light';
                   if (storage) {
                     var parsed = JSON.parse(storage);
                     if (parsed && parsed.state && parsed.state.theme) {
                       theme = parsed.state.theme;
                     }
                   }
                   document.documentElement.setAttribute('data-theme', theme);
                   if (theme === 'dark') {
                     document.documentElement.classList.add('dark');
                   } else {
                     document.documentElement.classList.remove('dark');
                   }
                 } catch (e) {}
               })();
             `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >

        <Providers>
          <OfflineDetector />
          <OfflineBanner />
          <Suspense fallback={null}>
            <ProgressBar />
          </Suspense>
          <SwipeableToaster />
          <CookieConsent />
          <MainContentWrapper>
            {children}
          </MainContentWrapper>
          <FloatingChat />
        </Providers>
      </body>
    </html>
  );
}

export default RootLayout;
