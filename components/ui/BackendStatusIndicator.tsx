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
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const checkHealth = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Fast check via local Next.js proxy route /api/backend-health
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
        setLatency(data.latency ?? null);
        setErrorMsg('');
      } else {
        setState('disconnected');
        setLatency(data.latency ?? null);
        setErrorMsg(data.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      // Fallback check: Try direct fetch to Railway backend if proxy had network issue
      try {
        const directRes = await fetch(
          `https://mscurechain-backend-latest-production.up.railway.app/api/health?t=${Date.now()}`,
          { method: 'GET', mode: 'cors', cache: 'no-store' }
        );
        if (directRes.ok) {
          setState('connected');
          setErrorMsg('');
        } else {
          setState('disconnected');
          setErrorMsg(`Backend status: ${directRes.status}`);
        }
      } catch (directErr: any) {
        setState('disconnected');
        setErrorMsg(err?.message || 'Server unreachable');
      }
    } finally {
      setLastChecked(new Date());
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Regular interval: poll every 15 seconds
    const interval = setInterval(checkHealth, 15000);

    const onOnline = () => checkHealth();
    const onOffline = () => {
      setState('disconnected');
      setErrorMsg('No internet connection');
    };

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
      className="fixed top-2 right-2.5 z-[99999] select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        onClick={() => {
          setState('checking');
          checkHealth();
        }}
        role="button"
        tabIndex={0}
        aria-label={
          isConnected
            ? 'Backend Connected (Operational)'
            : 'Backend Disconnected (Click to re-check)'
        }
        className="group relative flex items-center justify-center p-1 cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95"
      >
        {/* Outer subtle glow/halo ring */}
        <span
          className={`absolute inset-0 rounded-full opacity-40 blur-[2px] transition-colors duration-300 ${
            isConnected
              ? 'bg-emerald-500'
              : isChecking
              ? 'bg-amber-400'
              : 'bg-rose-500 animate-ping'
          }`}
        />

        {/* The clean small rounded ball symbol */}
        <span
          className={`relative block w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm transition-all duration-300 ${
            isConnected
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              : isChecking
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse'
              : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
          }`}
        />
      </div>

      {/* Floating Tooltip details on hover */}
      {isHovered && (
        <div
          className="absolute right-0 top-6 w-56 rounded-lg bg-slate-900/95 backdrop-blur-sm text-white px-3 py-2 text-xs shadow-xl border border-slate-700/80 pointer-events-none animate-in fade-in zoom-in-95 duration-150 z-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isConnected
                  ? 'bg-emerald-400'
                  : isChecking
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-100">
              {isConnected
                ? 'Backend Connected'
                : isChecking
                ? 'Checking Backend...'
                : 'Backend Disconnected'}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-tight">
            {isConnected
              ? `Railway deployment operational${latency ? ` (${latency}ms)` : ''}`
              : errorMsg || 'Unable to connect to Railway/Render deployment'}
          </p>

          <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              {lastChecked
                ? `Checked ${lastChecked.toLocaleTimeString()}`
                : 'Checking...'}
            </span>
            <span className="text-emerald-400 text-[9px] font-medium">Click to retry</span>
          </div>
        </div>
      )}
    </div>
  );
}
