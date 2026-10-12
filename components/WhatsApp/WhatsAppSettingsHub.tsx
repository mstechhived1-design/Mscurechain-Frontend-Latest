import React, { useState, useEffect } from 'react';
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
  AlertCircle, Laptop, Send, X 
} from 'lucide-react';

interface Props {
  hospitalId: string;
  hospitalName?: string;
}

export const WhatsAppSettingsHub: React.FC<Props> = ({ hospitalId, hospitalName = 'Hospital' }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [generatingQr, setGeneratingQr] = useState(false);
  
  // Test Message
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);


  const fetchStatus = React.useCallback(async () => {
    try {
      const data = await getWhatsAppStatus(hospitalId);
      setStatus(data);
      if (data.connectedNumber && !testPhone) {
        let num = String(data.connectedNumber).replace(/[^0-9]/g, '');
        if (num.length === 12 && num.startsWith('91')) num = num.slice(2);
        setTestPhone(num);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (status?.status === 'SCAN_QR' || status?.status === 'CONNECTING' || status?.hasQr || generatingQr) {
        fetchStatus();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [hospitalId, status?.status, status?.hasQr, generatingQr, fetchStatus]);

  const handleRequestPairing = async () => {
    let clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Enter a valid 10-digit number');

    const loadId = toast.loading('Requesting code...');
    try {
      const res = await requestPairingCode(hospitalId, clean);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        toast.success('Code generated. Enter this in your WhatsApp app.', { id: loadId });
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to request code', { id: loadId });
    }
  };

  const handleLogout = async () => {
    const loadId = toast.loading('Disconnecting...');
    try {
      await logoutWhatsApp(hospitalId);
      toast.success('Disconnected successfully', { id: loadId });
      setPairingCode('');
      fetchStatus();
    } catch (err) {
      toast.error('Failed to disconnect', { id: loadId });
    }
  };


  const handleSendTest = async () => {
    let clean = testPhone.replace(/[^0-9]/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    if (clean.length !== 10) return toast.error('Enter a valid 10-digit number');

    setSendingTest(true);
    const loadId = toast.loading('Sending test message...');
    try {
      await sendWhatsAppMessage(hospitalId, clean, `*MsCurechain Healthcare*\nYour automated WhatsApp service for ${hospitalName} is connected and working perfectly.`);
      toast.success('Test message sent successfully!', { id: loadId });
    } catch (err: any) {
      toast.error('Failed to send test message', { id: loadId });
    } finally {
      setSendingTest(false);
    }
  };


  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-emerald-500" />
        <p className="text-gray-600 font-medium">Loading WhatsApp configuration...</p>
      </div>
    );
  }

  const isConnected = status?.status === 'CONNECTED';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
            <Smartphone size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{hospitalName} WhatsApp Bot</h2>
            <p className="text-emerald-100 text-sm font-medium">Automated Notifications & Reports</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Connection Status Panel */}
        {isConnected ? (
          <div className="bg-gray-50/90 rounded-2xl p-5 border border-emerald-500/30 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <span>Connected & Automated</span>
              </div>
              <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                +91 {String(status.connectedNumber || '').replace(/[^0-9]/g, '').slice(-10)}
              </span>
            </div>

            {/* Linked Device */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Linked Device</span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  24/7 Always Connected Gateway
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{status.deviceName || 'Hospital Server Gateway'}</h4>
                    <p className="text-xs text-gray-500">Platform: WhatsApp Multi-Device • Live</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5">
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            </div>

            {/* Test Send */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <label className="text-xs font-bold text-gray-600">Send Test WhatsApp Message:</label>
              <div className="flex gap-2">
                <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 flex-1 shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                  <span className="text-sm font-bold text-gray-500 mr-2">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="bg-transparent text-gray-900 font-mono font-bold text-sm focus:outline-none w-full"
                  />
                </div>
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Send size={16} className={sendingTest ? 'animate-spin' : ''} />
                  {sendingTest ? "Sending..." : "Test Send"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50/90 rounded-2xl p-6 border border-gray-200 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Disconnected</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Link your WhatsApp</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Connect your hospital's official WhatsApp Business number to automatically send alerts, reports, and bills to patients.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600">Use Pairing Code:</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 flex-1 shadow-sm">
                      <span className="text-sm font-bold text-gray-500 mr-2">+91</span>
                      <input 
                        type="tel" 
                        maxLength={10}
                        placeholder="Phone number" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="bg-transparent text-gray-900 font-mono font-bold text-sm focus:outline-none w-full"
                      />
                    </div>
                    <button 
                      onClick={handleRequestPairing}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"
                    >
                      Get Code
                    </button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs text-blue-700 font-medium">Enter this code in WhatsApp (Linked Devices &gt; Link with phone number):</p>
                    <p className="text-3xl font-mono font-black tracking-widest text-blue-900">{pairingCode}</p>
                  </div>
                )}
              </div>

              {!pairingCode && (
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm relative">
                  <style>{`
                    @keyframes qrLaserScan {
                      0% {
                        top: 2%;
                        opacity: 0.6;
                      }
                      15% {
                        opacity: 1;
                      }
                      85% {
                        opacity: 1;
                      }
                      100% {
                        top: calc(100% - 4px);
                        opacity: 0.6;
                      }
                    }

                    .qr-laser-line {
                      position: absolute;
                      left: 0;
                      right: 0;
                      height: 3px;
                      background: linear-gradient(90deg, rgba(16,185,129,0) 0%, #10b981 25%, #34d399 50%, #10b981 75%, rgba(16,185,129,0) 100%);
                      box-shadow: 0 0 14px 3px rgba(16, 185, 129, 0.8), 0 0 24px 6px rgba(52, 211, 153, 0.45);
                      animation: qrLaserScan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                      z-index: 20;
                      pointer-events: none;
                    }

                    .qr-scan-wash {
                      position: absolute;
                      left: 0;
                      right: 0;
                      height: 48px;
                      background: linear-gradient(180deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 100%);
                      transform: translateY(-100%);
                      pointer-events: none;
                    }

                    .qr-corner-bracket {
                      position: absolute;
                      width: 18px;
                      height: 18px;
                      border-color: #10b981;
                      z-index: 25;
                      pointer-events: none;
                    }
                  `}</style>

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Or scan QR Code</p>
                  
                  {generatingQr ? (
                    <div className="w-52 h-52 bg-slate-50 border-2 border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-inner">
                      <div className="relative flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                        <RefreshCw size={22} className="text-emerald-600 absolute animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-emerald-700 animate-pulse">Generating Secure QR...</span>
                    </div>
                  ) : status?.hasQr && status?.qr ? (
                    <div className="relative p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                      {/* QR Box with Scan Laser Animation */}
                      <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-xl overflow-hidden bg-white flex items-center justify-center p-2 border border-slate-100">
                        {/* 4 Viewfinder Target Corners */}
                        <span className="qr-corner-bracket top-1 left-1 border-t-3 border-l-3 rounded-tl-sm" />
                        <span className="qr-corner-bracket top-1 right-1 border-t-3 border-r-3 rounded-tr-sm" />
                        <span className="qr-corner-bracket bottom-1 left-1 border-b-3 border-l-3 rounded-bl-sm" />
                        <span className="qr-corner-bracket bottom-1 right-1 border-b-3 border-r-3 rounded-br-sm" />

                        {/* QR Image */}
                        <img src={status.qr} alt="Scan QR Code" className="w-full h-full object-contain select-none" />

                        {/* Smooth Scanning Laser Beam */}
                        <div className="qr-laser-line">
                          <div className="qr-scan-wash" />
                        </div>
                      </div>

                      {/* Live Scanning Status */}
                      <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[11px] font-bold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Scan with WhatsApp camera</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-52 h-52 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
                       <Smartphone size={28} className="opacity-40" />
                       <span className="text-xs font-bold">QR not generated</span>
                    </div>
                  )}

                  <button 
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
                    className="mt-4 flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-50 transition border border-emerald-200 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={generatingQr ? "animate-spin" : ""} /> {status?.hasQr ? 'Refresh QR' : 'Generate QR'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
