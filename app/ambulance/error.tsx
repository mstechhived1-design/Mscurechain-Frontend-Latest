'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Phone } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AmbulanceError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Ambulance Portal Error]', error);
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
          <h2 className="text-xl font-semibold text-foreground">Emergency Portal Error</h2>
          <p className="text-sm text-muted-foreground">
            The emergency dashboard had a display error. Emergency operations are unaffected — use your direct communication channels and retry here.
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Emergency View
          </button>
        </div>
      </div>
    </div>
  );
}
