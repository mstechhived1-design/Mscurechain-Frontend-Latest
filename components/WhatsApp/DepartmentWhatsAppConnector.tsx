'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getWhatsAppStatus, 
  requestPairingCode, 
  refreshQR, 
  logoutWhatsApp, 
  sendWhatsAppMessage 
} from './whatsappApi';
import toast from 'react-hot-toast';
import { 
  Smartphone, LogOut, RefreshCw, CheckCircle2, 
  AlertCircle, Laptop, Send, ShieldCheck, QrCode, Phone
} from 'lucide-react';

interface DepartmentWhatsAppConnectorProps {
  hospitalId: string;
  department: 'frontdesk' | 'doctor' | 'pharma' | 'lab';
  portalName: string;
  subtitle?: string;
  className?: string;
}

export const DepartmentWhatsAppConnector: React.FC<DepartmentWhatsAppConnectorProps> = ({
  hospitalId,
  department,
  portalName,
  subtitle = 'Automated Receipts & Direct Patient Messaging',
  className = '',
}) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [generatingQr, setGeneratingQr] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getWhatsAppStatus(hospitalId, department);
      setStatus(data);
      if (data.connectedNumber && !testPhone) {
        let num = String(data.connectedNumber).replace(/[^0-9]/g, '');
        if (num.length === 12 && num.startsWith('91')) num = num.slice(2);
        setTestPhone(num);
      }
    } catch (err) {
      console.error(`[${department} WhatsApp] status fetch error:`, err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, department, testPhone]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (
        status?.dedicatedEnabled &&
        (status?.status === 'SCAN_QR' || status?.status === 'CONNECTING' || status?.hasQr || generatingQr)
      ) {
        fetchStatus();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [status?.dedicatedEnabled, status?.status, status?.hasQr, generatingQr, fetchStatus]);

  // When dedicated is enabled and not connected, auto-generate QR if not already present
  useEffect(() => {
    if (
      status?.dedicatedEnabled &&
      status?.status !== 'CONNECTED' &&
      !status?.hasQr &&
      !status?.qr &&
      !generatingQr
    ) {
      refreshQR(hospitalId, department)
        .then(() => fetchStatus())
        .catch(() => {});
    }
  }, [status?.dedicatedEnabled, status?.status, status?.hasQr, status?.qr, hospitalId, department, fetchStatus]);

  const handleRequestPairing = async () => {
    let clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Enter a valid 10-digit number');

    const loadId = toast.loading('Requesting pairing code...');
    try {
      const res = await requestPairingCode(hospitalId, clean, department);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        toast.success('Pairing code generated! Enter this code in WhatsApp.', { id: loadId });
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to request code', { id: loadId });
    }
  };

  const handleLogout = async () => {
    const loadId = toast.loading('Disconnecting dedicated device...');
    try {
      await logoutWhatsApp(hospitalId, department);
      toast.success('Dedicated WhatsApp device disconnected', { id: loadId });
      setPairingCode('');
      fetchStatus();
    } catch (err: any) {
      toast.error('Failed to disconnect device', { id: loadId });
    }
  };

  const handleSendTest = async () => {
    let clean = testPhone.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Enter a valid 10-digit number');

    setSendingTest(true);
    const loadId = toast.loading('Sending test message...');
    try {
      await sendWhatsAppMessage(
        hospitalId,
        clean,
        `*MsCurechain Healthcare*\nYour dedicated ${portalName} WhatsApp Service is connected and active.`,
        department
      );
      toast.success('Test message delivered successfully!', { id: loadId });
    } catch (err: any) {
      toast.error('Failed to send test message', { id: loadId });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center space-y-3 ${className}`}>
        <RefreshCw size={24} className="animate-spin text-emerald-500" />
        <p className="text-xs text-gray-500 font-medium">Loading WhatsApp device settings...</p>
      </div>
    );
  }

  // 1. If dedicated WhatsApp is NOT enabled by Hospital Admin:
  if (!status?.dedicatedEnabled) {
    return (
      <div className={`bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl border border-gray-200/80 p-5 space-y-3 shadow-sm ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                {portalName} WhatsApp
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Main Hospital Number
                </span>
              </h4>
              <p className="text-xs text-gray-500">Managed centrally by Hospital Admin</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-white text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
            +91 {status?.hospitalMainNumber ? String(status.hospitalMainNumber).replace(/[^0-9]/g, '').slice(-10) : 'Hospital Main'}
          </span>
        </div>

        <div className="p-3 bg-white/90 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1 leading-relaxed">
          <p className="font-semibold text-gray-800">
            ✓ Sending from Main Hospital Phone:
          </p>
          <p className="text-gray-500 text-[11px]">
            All receipts and reports from this portal are sent directly from the hospital's main WhatsApp number. To connect this department's own phone instead, ask the Hospital Admin to turn ON the <strong>{portalName} Toggle</strong> in Hospital Setup.
          </p>
        </div>
      </div>
    );
  }

  // 2. Dedicated WhatsApp IS enabled by Hospital Admin:
  const isConnected = status?.status === 'CONNECTED';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-emerald-200/80 overflow-hidden font-sans ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xs shadow-inner">
            <Smartphone size={22} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold tracking-tight">
              {portalName} WhatsApp Connection
            </h3>
            <p className="text-emerald-100 text-[11px] font-medium">{subtitle}</p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-1 rounded-full border border-white/20">
          Own Phone Active
        </span>
      </div>

      <div className="p-5 space-y-5">
        {isConnected ? (
          /* Connected State */
          <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Phone Connected & Ready</span>
              </div>
              <span className="text-xs font-mono font-bold bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                +91 {String(status.connectedNumber || '').replace(/[^0-9]/g, '').slice(-10)}
              </span>
            </div>

            {/* Linked Device Box */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Laptop size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{status.deviceName || `${portalName} WhatsApp`}</h4>
                  <p className="text-[10px] text-gray-500">Connected via WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <LogOut size={13} /> Disconnect
              </button>
            </div>

            {/* Test Send */}
            <div className="space-y-1.5 pt-2 border-t border-emerald-100">
              <label className="text-[11px] font-bold text-gray-600">Send Test WhatsApp Message:</label>
              <div className="flex gap-2">
                <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-1.5 flex-1 shadow-xs focus-within:border-emerald-500">
                  <span className="text-xs font-bold text-gray-500 mr-2">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="bg-transparent text-gray-900 font-mono font-bold text-xs focus:outline-none w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="px-4 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Send size={14} className={sendingTest ? 'animate-spin' : ''} />
                  {sendingTest ? "Sending..." : "Test Send"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State: Individual QR Code Scanner & Pairing */
          <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-200 space-y-5">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Link {portalName} WhatsApp (QR Code / Pairing Code)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Method 1: Pairing Code */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900">
                  Option 1: Link with Phone Number
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Enter your dedicated WhatsApp mobile number to generate an 8-character pairing code.
                </p>

                <div className="flex gap-2">
                  <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 flex-1 shadow-xs focus-within:border-emerald-500">
                    <span className="text-xs font-bold text-gray-500 mr-2">+91</span>
                    <input 
                      type="tel" 
                      maxLength={10}
                      placeholder="10-digit number" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-transparent text-gray-900 font-mono font-bold text-xs focus:outline-none w-full"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleRequestPairing}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-sm active:scale-95"
                  >
                    Get Code
                  </button>
                </div>

                {pairingCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center space-y-1">
                    <p className="text-[11px] text-blue-700 font-medium">Enter this code in WhatsApp (Linked Devices &gt; Link with phone number):</p>
                    <p className="text-2xl font-mono font-black tracking-widest text-blue-900">{pairingCode}</p>
                  </div>
                )}
              </div>

              {/* Method 2: Live QR Scanner */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-xs relative">
                <style>{`
                  @keyframes qrLaserScan {
                    0% { top: 2%; opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { top: calc(100% - 4px); opacity: 0.6; }
                  }
                  .qr-laser-line {
                    position: absolute;
                    left: 0; right: 0; height: 3px;
                    background: linear-gradient(90deg, rgba(16,185,129,0) 0%, #10b981 25%, #34d399 50%, #10b981 75%, rgba(16,185,129,0) 100%);
                    box-shadow: 0 0 14px 3px rgba(16, 185, 129, 0.8);
                    animation: qrLaserScan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                    z-index: 20; pointer-events: none;
                  }
                `}</style>

                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Option 2: Scan QR Code
                </p>

                {generatingQr ? (
                  <div className="w-44 h-44 bg-slate-50 border border-emerald-200 rounded-xl flex flex-col items-center justify-center gap-2">
                    <RefreshCw size={24} className="animate-spin text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700">Generating Secure QR...</span>
                  </div>
                ) : status?.hasQr && status?.qr ? (
                  <div className="relative p-2 bg-white rounded-xl border border-emerald-400 shadow-md flex flex-col items-center">
                    <div className="relative w-40 h-40 overflow-hidden bg-white flex items-center justify-center">
                      <img src={status.qr} alt="Scan QR Code" className="w-full h-full object-contain select-none" />
                      <div className="qr-laser-line" />
                    </div>
                    <div className="mt-2 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                      Scan with WhatsApp camera
                    </div>
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1.5">
                    <QrCode size={26} className="opacity-40" />
                    <span className="text-[11px] font-bold">QR not generated</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setGeneratingQr(true);
                    const loadId = toast.loading('Generating QR...');
                    try {
                      await refreshQR(hospitalId, department);
                      toast.success('Check for QR code!', { id: loadId });
                      await fetchStatus();
                    } catch (err: any) {
                      toast.error('Failed to generate QR', { id: loadId });
                    } finally {
                      setGeneratingQr(false);
                    }
                  }}
                  disabled={generatingQr}
                  className="mt-3 flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition border border-emerald-200 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={generatingQr ? "animate-spin" : ""} />
                  {status?.hasQr ? 'Refresh QR' : 'Generate QR'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
