'use client';

import React, { useState, useEffect } from 'react';
import { 
  getWhatsAppStatus, 
  requestPairingCode, 
  refreshQR, 
  logoutWhatsApp, 
  sendWhatsAppMessage,
  updateDepartmentRouting
} from './whatsappApi';
import toast from 'react-hot-toast';
import { 
  Smartphone, LogOut, RefreshCw, CheckCircle2, 
  AlertCircle, Laptop, Send, X, Pill, FlaskConical,
  Building2, Stethoscope, Save, Phone,
  Check, ShieldCheck, Sliders, MessageSquare, QrCode
} from 'lucide-react';

interface Props {
  hospitalId: string;
  hospitalName?: string;
}

interface DepartmentRoutingItem {
  enabled: boolean;
  phoneNumber?: string;
  name: string;
}

const DEFAULT_DEPARTMENTS: Record<string, { name: string; icon: any; desc: string }> = {
  pharma: {
    name: 'Pharmacy & Medicine Bills',
    icon: Pill,
    desc: 'Medicine sales, e-invoices, and pharmacy receipts',
  },
  lab: {
    name: 'Laboratory Diagnostic Reports',
    icon: FlaskConical,
    desc: 'Lab test results, bills, and sample receipts',
  },
  frontdesk: {
    name: 'Front Desk & OPD Receipts',
    icon: Building2,
    desc: 'Patient registrations, token numbers, and OPD/IPD bills',
  },
  doctor: {
    name: 'Doctor Consultations & Prescriptions',
    icon: Stethoscope,
    desc: 'Clinical prescriptions, follow-up advice, and visit summaries',
  },
};

export const WhatsAppSettingsHub: React.FC<Props> = ({ hospitalId, hospitalName = 'Hospital' }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pairing & QR
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [generatingQr, setGeneratingQr] = useState(false);
  
  // Test Message
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Department Toggles
  const [departmentRouting, setDepartmentRouting] = useState<Record<string, DepartmentRoutingItem>>({
    pharma: { enabled: false, name: 'Pharmacy & Medicine Bills' },
    lab: { enabled: false, name: 'Laboratory Diagnostic Reports' },
    frontdesk: { enabled: false, name: 'Front Desk & OPD Receipts' },
    doctor: { enabled: false, name: 'Doctor Consultations & Prescriptions' },
  });
  const [savingRouting, setSavingRouting] = useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const data = await getWhatsAppStatus(hospitalId);
      setStatus(data);
      if (data.connectedNumber && !testPhone) {
        let num = String(data.connectedNumber).replace(/[^0-9]/g, '');
        if (num.length === 12 && num.startsWith('91')) num = num.slice(2);
        setTestPhone(num);
      }
      if (data?.departmentRouting) {
        setDepartmentRouting(prev => ({
          ...prev,
          ...data.departmentRouting,
        }));
      }
    } catch (err) {
      console.error('[WhatsApp Status error]:', err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, testPhone]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (status?.status === 'SCAN_QR' || status?.status === 'CONNECTING' || status?.hasQr || generatingQr) {
        fetchStatus();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [hospitalId, status?.status, status?.hasQr, generatingQr, fetchStatus]);

  const handleToggleDepartment = (deptKey: string) => {
    const current = departmentRouting[deptKey];
    const willEnable = !current?.enabled;

    setDepartmentRouting(prev => ({
      ...prev,
      [deptKey]: {
        ...prev[deptKey],
        enabled: willEnable,
      },
    }));

    if (willEnable) {
      toast.success(`${current?.name || deptKey} will use its own phone. Remember to click "Save Changes".`);
    } else {
      toast(`Switched ${current?.name || deptKey} to Main Hospital WhatsApp.`);
    }
  };

  const handleSaveRouting = async () => {
    setSavingRouting(true);
    const loadId = toast.loading('Saving WhatsApp preferences...');
    try {
      const res = await updateDepartmentRouting(hospitalId, departmentRouting);
      if (res?.success) {
        toast.success('WhatsApp preferences saved successfully!', { id: loadId });
        fetchStatus();
      } else {
        throw new Error(res?.error || 'Failed to update preferences');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to save', { id: loadId });
    } finally {
      setSavingRouting(false);
    }
  };

  const handleRequestPairing = async () => {
    let clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Please enter a valid 10-digit mobile number');

    const loadId = toast.loading('Getting pairing code...');
    try {
      const res = await requestPairingCode(hospitalId, clean);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        toast.success('Pairing code created! Enter this in your phone WhatsApp.', { id: loadId });
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Could not get pairing code', { id: loadId });
    }
  };

  const handleLogout = async () => {
    const loadId = toast.loading('Disconnecting phone...');
    try {
      await logoutWhatsApp(hospitalId);
      toast.success('Phone disconnected successfully', { id: loadId });
      setPairingCode('');
      fetchStatus();
    } catch (err) {
      toast.error('Failed to disconnect phone', { id: loadId });
    }
  };

  const handleSendTest = async () => {
    let clean = testPhone.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Please enter a valid 10-digit mobile number');

    setSendingTest(true);
    const loadId = toast.loading('Sending test message...');
    try {
      await sendWhatsAppMessage(
        hospitalId, 
        clean, 
        `*MsCurechain Healthcare*\nHello! Your automated WhatsApp notification service for ${hospitalName} is connected and ready to send patient bills & reports.`
      );
      toast.success('Test message delivered successfully!', { id: loadId });
    } catch (err: any) {
      toast.error('Failed to send test message. Check phone connection.', { id: loadId });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = status?.status === 'CONNECTED';
  const connectedDisplayNumber = status?.connectedNumber 
    ? `+91 ${String(status.connectedNumber).replace(/[^0-9]/g, '').slice(-10)}` 
    : '';

  const dedicatedCount = Object.values(departmentRouting).filter(d => d.enabled).length;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          COMPACT TRIGGER CARD (In Hospital Profile Page)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-emerald-50/20 rounded-3xl border border-emerald-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <MessageSquare size={28} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                WhatsApp Patient Messaging
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active • {connectedDisplayNumber}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl leading-relaxed">
              Send invoices, lab reports, and prescriptions directly to patients' phones. Configure hospital number and department delivery preferences.
            </p>
            <p className="text-xs text-emerald-700 font-semibold pt-0.5">
              {dedicatedCount > 0 
                ? `✓ ${dedicatedCount} department${dedicatedCount > 1 ? 's' : ''} set to send from separate phone • Others use main hospital phone`
                : '✓ All receipts currently send from Main Hospital WhatsApp'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-600/30 active:scale-95 shrink-0"
        >
          <Sliders size={18} />
          <span>Configure WhatsApp</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SEPARATE POP-UP MODAL (User-Friendly Settings Dialog)
      ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden font-sans my-auto">
            {/* Modal Top Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 sm:p-6 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xs shadow-inner">
                  <Smartphone size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    WhatsApp Settings & Receipts
                  </h3>
                  <p className="text-emerald-100 text-xs font-medium">
                    Link your hospital WhatsApp and choose who sends patient receipts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors active:scale-95"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-gray-800">

              {/* ── SECTION 1: Main Hospital WhatsApp Connection ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      Main Hospital WhatsApp Phone
                      {isConnected && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Connected
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500">
                      The official WhatsApp number used to send alerts, receipts, and reports to patients.
                    </p>
                  </div>
                </div>

                {isConnected ? (
                  /* Connected Box */
                  <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 size={22} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Linked Phone Number</p>
                          <p className="text-base font-bold font-mono text-emerald-900">
                            {connectedDisplayNumber}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <LogOut size={14} /> Disconnect Phone
                      </button>
                    </div>

                    {/* Test Message Row */}
                    <div className="pt-3 border-t border-emerald-100 space-y-2">
                      <label className="text-xs font-bold text-gray-700">
                        Send a test WhatsApp message to check if it's working:
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 flex-1 shadow-xs focus-within:border-emerald-500">
                          <span className="text-xs font-bold text-gray-500 mr-2 select-none">+91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="Enter 10-digit mobile number"
                            className="bg-transparent text-gray-900 font-mono font-bold text-xs focus:outline-none w-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendTest}
                          disabled={sendingTest}
                          className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                        >
                          <Send size={14} className={sendingTest ? 'animate-spin' : ''} />
                          {sendingTest ? "Sending..." : "Send Test"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Disconnected: Link Phone */
                  <div className="bg-gray-50/90 rounded-2xl p-5 border border-gray-200 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                      
                      {/* Option 1: Phone Number & Code */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Option 1: Link with Mobile Number
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Enter your WhatsApp phone number to generate an 8-letter pairing code.
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs active:scale-95"
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

                      {/* Option 2: QR Scanner */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-xs relative">
                        <style>{`
                          @keyframes qrScanBar {
                            0% { top: 2%; opacity: 0.6; }
                            50% { opacity: 1; }
                            100% { top: calc(100% - 4px); opacity: 0.6; }
                          }
                          .qr-modal-laser {
                            position: absolute; left: 0; right: 0; height: 3px;
                            background: linear-gradient(90deg, rgba(16,185,129,0) 0%, #10b981 25%, #34d399 50%, #10b981 75%, rgba(16,185,129,0) 100%);
                            box-shadow: 0 0 12px 3px rgba(16, 185, 129, 0.8);
                            animation: qrScanBar 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                            z-index: 20; pointer-events: none;
                          }
                        `}</style>
                        <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Option 2: Scan QR Code
                        </h5>

                        {generatingQr ? (
                          <div className="w-36 h-36 bg-slate-50 border border-emerald-200 rounded-xl flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={22} className="animate-spin text-emerald-600" />
                            <span className="text-[11px] font-bold text-emerald-700">Loading QR...</span>
                          </div>
                        ) : status?.hasQr && status?.qr ? (
                          <div className="relative p-2 bg-white rounded-xl border border-emerald-300 shadow-sm flex flex-col items-center">
                            <div className="relative w-36 h-36 overflow-hidden bg-white flex items-center justify-center">
                              <img src={status.qr} alt="Scan QR Code" className="w-full h-full object-contain select-none" />
                              <div className="qr-modal-laser" />
                            </div>
                            <span className="mt-1 text-[10px] text-gray-500 font-medium">Scan with WhatsApp camera</span>
                          </div>
                        ) : (
                          <div className="w-36 h-36 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1.5">
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
                              await refreshQR(hospitalId);
                              toast.success('Check for QR code!', { id: loadId });
                              await fetchStatus();
                            } catch (err: any) {
                              toast.error('Failed to generate QR', { id: loadId });
                            } finally {
                              setGeneratingQr(false);
                            }
                          }}
                          disabled={generatingQr}
                          className="mt-2.5 flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition border border-emerald-200 active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw size={13} className={generatingQr ? "animate-spin" : ""} />
                          {status?.hasQr ? 'Refresh QR' : 'Generate QR'}
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: Department WhatsApp Choices ── */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Department Receipt Delivery
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Choose which phone number sends patient receipts for each department.
                  </p>
                </div>

                {/* Friendly Explanation Banner */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-emerald-950 text-xs">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold text-emerald-900">
                      How this works:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                      <li>
                        <strong>When toggle is OFF (Recommended default):</strong> All receipts and bills are sent from the <strong>Main Hospital WhatsApp</strong> number above.
                      </li>
                      <li>
                        <strong>When toggle is ON:</strong> That department will scan their <strong>own WhatsApp phone</strong> from their individual profile page to send receipts directly from their department.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* The 4 Department Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Object.entries(DEFAULT_DEPARTMENTS).map(([key, meta]) => {
                    const dept = departmentRouting[key] || { enabled: false, name: meta.name };
                    const IconComp = meta.icon;

                    return (
                      <div
                        key={key}
                        className={`rounded-2xl p-4 border transition-all ${
                          dept.enabled
                            ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-400/20 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                        }`}
                      >
                        {/* Title & Switch */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                dept.enabled
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <IconComp size={20} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-gray-900 truncate">
                                {meta.name}
                              </h5>
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {meta.desc}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={dept.enabled}
                              onChange={() => handleToggleDepartment(key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                          </label>
                        </div>

                        {/* Status Label */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100">
                          {dept.enabled ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Department's Own Phone (Scanner enabled in their profile)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                              <Check size={12} className="text-emerald-600" />
                              <span>Main Hospital WhatsApp ({connectedDisplayNumber || 'Hospital Main'})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-500 hidden sm:inline">
                Click <strong>Save Changes</strong> to apply your preferences.
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveRouting}
                  disabled={savingRouting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Save size={15} className={savingRouting ? "animate-spin" : ""} />
                  <span>{savingRouting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
