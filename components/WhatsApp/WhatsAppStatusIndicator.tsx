'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { getWhatsAppStatus } from './whatsappApi';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface Props {
  hospitalId?: string;
  department?: string;
  variant?: 'navbar' | 'profile-dropdown';
  className?: string;
}

// Clean official WhatsApp brand SVG
const WhatsAppIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-4 h-4', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.76-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.59.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.18-.48-.3" />
  </svg>
);

export const WhatsAppStatusIndicator: React.FC<Props> = ({
  hospitalId: propHospitalId,
  department: propDepartment,
  variant = 'navbar',
  className = '',
}) => {
  const params = useParams() as any;
  const pathname = usePathname() || '';
  const { user } = useAuthStore();
  const effectiveHospitalId =
    propHospitalId ||
    params?.hospitalId ||
    (user as any)?.hospital ||
    (user as any)?.hospitalId ||
    (user as any)?.hospital?._id;

  // Resolve canonical department key ('pharma' | 'lab' | 'frontdesk' | 'doctor')
  const resolveDepartment = (rawDept?: string, path?: string): string | undefined => {
    // 1. Path cues (highest fidelity based on current active portal)
    if (path) {
      const p = path.toLowerCase();
      if (p.includes('/pharmacy') || p.includes('/pharma')) return 'pharma';
      if (p.includes('/lab')) return 'lab';
      if (p.includes('/helpdesk') || p.includes('/frontdesk')) return 'frontdesk';
      if (p.includes('/doctor')) return 'doctor';
    }
    // 2. Department or user role cues
    if (rawDept) {
      const d = rawDept.toLowerCase().trim();
      if (d.includes('pharma') || d.includes('pharmacy')) return 'pharma';
      if (d.includes('lab')) return 'lab';
      if (d.includes('helpdesk') || d.includes('frontdesk')) return 'frontdesk';
      if (d.includes('doctor')) return 'doctor';
      return d;
    }
    return undefined;
  };

  const effectiveDepartment = resolveDepartment(propDepartment || user?.role, pathname);

  const [status, setStatus] = useState<string>('CHECKING');
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (!effectiveHospitalId) return;
    if (isManual) setIsRefreshing(true);
    try {
      const data = await getWhatsAppStatus(effectiveHospitalId, effectiveDepartment);
      if (data && data.success !== false) {
        const isDedicated = Boolean(data.dedicatedEnabled || data.isDedicated);
        const activeNumber = isDedicated
          ? (data.connectedNumber || data.activeNumber)
          : (data.connectedNumber || data.hospitalMainNumber);
        const hasNumber = Boolean(activeNumber);
        const isLive = data.status === 'CONNECTED' || (hasNumber && data.status !== 'DISCONNECTED');
        setStatus(isLive ? 'CONNECTED' : (data.status || 'DISCONNECTED'));
        setConnectedNumber(activeNumber || null);
        setDeviceName(data.deviceName || (isDedicated ? `${data.departmentName || 'Pharmacy Portal'} Gateway` : null));
      } else {
        setStatus('DISCONNECTED');
        setConnectedNumber(null);
      }
    } catch {
      setStatus('DISCONNECTED');
      setConnectedNumber(null);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  }, [effectiveHospitalId, effectiveDepartment]);

  useEffect(() => {
    fetchStatus();

    // Check periodically (every 20s)
    const interval = setInterval(() => fetchStatus(), 20000);

    // Refresh immediately whenever user tabs back into the app
    const handleFocus = () => fetchStatus();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStatus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsTooltipOpen(false);
      }
    };
    if (isTooltipOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTooltipOpen]);

  const isConnected = status === 'CONNECTED' || Boolean(connectedNumber && status !== 'DISCONNECTED');
  const formatPhoneNumber = (num: string | null) => {
    if (!num) return null;
    let clean = num.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = `91${clean}`;
    if (clean.length === 12 && clean.startsWith('91')) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    return `+${clean}`;
  };
  const formattedNumber = formatPhoneNumber(connectedNumber);

  // 1. Mobile Profile Dropdown Section Variant
  if (variant === 'profile-dropdown') {
    return (
      <div className={`p-4 bg-slate-50/80 rounded-2xl border border-slate-100 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isConnected
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'bg-rose-100 text-rose-500'
              }`}
            >
              <WhatsAppIcon size={16} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight text-slate-800">
                WhatsApp Gateway
              </p>
              <p className="text-[9px] font-bold text-slate-400">
                {isConnected ? formattedNumber || 'Connected' : 'Offline / Disconnected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isConnected
                  ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300/60'
                  : 'bg-rose-100/90 text-rose-800 border border-rose-300/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {isConnected ? 'Active' : 'Offline'}
            </span>

            <button
              onClick={() => fetchStatus(true)}
              disabled={isRefreshing}
              title="Refresh WhatsApp Status"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Desktop Navbar Icon Variant (Clean icon without outer box or status dot)
  return (
    <div className={`relative inline-flex items-center ${className}`} ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsTooltipOpen((prev) => !prev)}
        title={
          isConnected
            ? `WhatsApp Gateway Connected: ${formattedNumber || connectedNumber}`
            : 'WhatsApp Gateway: Disconnected'
        }
        aria-label="WhatsApp Connection Status"
        className={`p-1 transition-transform hover:scale-110 active:scale-90 focus:outline-none ${
          isConnected
            ? 'text-[#25D366] hover:opacity-85'
            : 'text-rose-500 hover:opacity-85'
        }`}
      >
        <WhatsAppIcon size={22} />
      </button>

      {/* Modern Status Tooltip Popover */}
      {isTooltipOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className={isConnected ? 'text-[#25D366]' : 'text-rose-500'}>
                <WhatsAppIcon size={16} />
              </span>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                WhatsApp Status
              </p>
            </div>
            <button
              onClick={() => fetchStatus(true)}
              disabled={isRefreshing}
              title="Refresh connection"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-teal-600' : ''} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Link Status:</span>
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  isConnected ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 size={13} />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle size={13} />
                    Disconnected
                  </>
                )}
              </span>
            </div>

            {isConnected && formattedNumber && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Active Number:</span>
                <span className="font-bold text-slate-800 font-mono text-[11px]">
                  {formattedNumber}
                </span>
              </div>
            )}

            {deviceName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Gateway:</span>
                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                  {deviceName}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[9px] text-slate-400 font-medium text-center">
            {isConnected
              ? ''
              : '⚠️ Scanner disconnected. Messages cannot be sent.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(WhatsAppStatusIndicator);
