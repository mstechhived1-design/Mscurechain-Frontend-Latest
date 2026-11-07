'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionState = 'connected' | 'disconnected' | 'checking';

interface HealthResponse {
  connected: boolean;
  status?: number;
  latency?: number;
  backendUrl?: string;
  error?: string;
}

export default function BackendStatusIndicator() {
  const [state, setState] = useState<ConnectionState>('checking');
  const isCheckingRef = useRef<boolean>(false);

  const checkHealth = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const res = await fetch(`/api/backend-health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const data: HealthResponse = await res.json().catch(() => ({
        connected: res.ok,
        status: res.status,
      }));

      if (res.ok && data.connected) {
        setState('connected');
      } else {
        setState('disconnected');
      }
    } catch {
      // Direct ping fallback
      try {
        const directRes = await fetch(
          `https://mscurechain-backend-latest-production.up.railway.app/api/health?t=${Date.now()}`,
          { method: 'GET', mode: 'cors', cache: 'no-store' }
        );
        if (directRes.ok) {
          setState('connected');
        } else {
          setState('disconnected');
        }
      } catch {
        setState('disconnected');
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);

    const onOnline = () => checkHealth();
    const onOffline = () => setState('disconnected');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [checkHealth]);

  const isConnected = state === 'connected';
  const isChecking = state === 'checking';

  return (
    <div
      className="fixed top-0.5 right-3 z-[99999] select-none pointer-events-auto"
      onClick={() => {
        setState('checking');
        checkHealth();
      }}
    >
      <div className="relative flex items-center justify-center p-0.5 cursor-pointer">
        {/* Glow halo */}
        <span
          className={`absolute inset-0 rounded-full opacity-35 blur-[1.5px] transition-colors duration-300 ${
            isConnected
              ? 'bg-emerald-500'
              : isChecking
              ? 'bg-amber-400'
              : 'bg-rose-500 animate-ping'
          }`}
        />

        {/* Small rounded ball symbol positioned exactly on the top border line */}
        <span
          className={`relative block w-2 h-2 rounded-full border border-white/70 shadow-sm transition-all duration-300 ${
            isConnected
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
              : isChecking
              ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.9)] animate-pulse'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
          }`}
        />
      </div>
    </div>
  );
}
