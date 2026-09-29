'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PharmacyError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Pharmacy Portal Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" aria-live="assertive">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Pharmacy Portal Error</h2>
          <p className="text-sm text-muted-foreground">
            The pharmacy dashboard encountered an error. Inventory data is safe — retry to restore the view.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-3 p-3 bg-muted rounded-xl text-xs text-left overflow-auto max-h-28 text-red-600 dark:text-red-400">
              {error.message}
            </pre>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
