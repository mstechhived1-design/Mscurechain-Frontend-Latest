import type { Metadata } from 'next';
import React from 'react';

/**
 * Auth layout - noindex to prevent search engines from indexing login/auth pages.
 * Passes children straight through with zero UI change.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
