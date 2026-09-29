'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  ShieldCheck, 
  ArrowLeft, 
  Mail, 
  Timer, 
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Shield,
  Fingerprint,
  Key
} from "lucide-react";
import "./otp_enhancements.css";

// Decorative Background Elements Component
const BackgroundEffects = () => {
  const [stars, setStars] = useState<{top: number, left: number, width: number, height: number, duration: number}[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const generatedStars = [...Array(20)].map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Vignette */}
      <div className="vignette" />
      
      {/* Neon Blobs */}
      <div className="neon-blob" style={{ width: '400px', height: '400px', background: 'var(--primary-glow)', top: '-10%', left: '-10%' }} />
      <div className="neon-blob" style={{ width: '350px', height: '350px', background: 'var(--accent-violet)', bottom: '10%', right: '-5%', animationDelay: '-5s' }} />
      <div className="neon-blob" style={{ width: '300px', height: '300px', background: 'var(--accent-cyan)', top: '40%', left: '15%', animationDelay: '-10s', opacity: 0.1 }} />
      <div className="neon-blob" style={{ width: '250px', height: '250px', background: 'var(--accent-pink)', bottom: '20%', left: '5%', animationDelay: '-15s', opacity: 0.08 }} />

      {/* Floating Stars - Only rendered on client to avoid hydration mismatch */}
      {isMounted && stars.map((star, i) => (
        <div 
          key={`star-${i}`}
          className="star"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.width}px`,
            height: `${star.height}px`,
            '--duration': `${star.duration}s`
          } as any}
        />
      ))}

      {/* ECG Lines */}
      <div className="ecg-container" style={{ top: '20%' }}>
        <svg width="100%" height="100" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path 
            className="ecg-line" 
            d="M0,50 L100,50 L110,30 L120,70 L130,50 L200,50 L210,10 L220,90 L230,50 L500,50 L510,35 L520,65 L530,50 L800,50 L810,20 L820,80 L830,50 L1000,50" 
            fill="none" 
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="ecg-container" style={{ bottom: '20%', transform: 'scaleY(-1)', opacity: 0.05 }}>
        <svg width="100%" height="100" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path 
            className="ecg-line" 
            d="M0,50 L150,50 L160,35 L170,65 L180,50 L400,50 L410,15 L420,85 L430,50 L700,50 L710,40 L720,60 L730,50 L1000,50" 
            fill="none" 
            strokeWidth="1"
            style={{ animationDelay: '-5s' }}
          />
        </svg>
      </div>

      {/* Floating Security Icons */}
      <motion.div 
        animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[10%] text-primary-theme"
      >
        <Shield size={60} strokeWidth={1} />
      </motion.div>
      <motion.div 
        animate={{ y: [0, 20, 0], opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[15%] right-[15%] text-accent-violet"
      >
        <Lock size={80} strokeWidth={1} />
      </motion.div>
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[60%] right-[10%] text-accent-cyan"
      >
        <Fingerprint size={70} strokeWidth={1} />
      </motion.div>

      {/* Edge Security Symbols */}
      <div className="absolute top-10 left-10 opacity-10 rotate-12"><Key size={24} /></div>
      <div className="absolute bottom-10 right-10 opacity-10 -rotate-12"><Shield size={24} /></div>
    </div>
  );
};

export default function SuperAdminVerifyOtp() {
  const router = useRouter();
  const { verifySuperAdminOtp, resendSuperAdminOtp, isLoading } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = React.useMemo(() => [
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
    React.createRef<HTMLInputElement>(),
  ], []);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('msc_2fa_temp_token');
    
    if (!storedToken) {
      router.replace('/auth/login');
      return;
    }
    
    setTempToken(storedToken);
    
    // PERSISTENT TIMER LOGIC
    let expiry = sessionStorage.getItem('msc_2fa_expiry');
    const now = Date.now();
    
    if (!expiry) {
      // If no expiry exists, create one (30 minutes)
      const newExpiry = now + 1800 * 1000;
      sessionStorage.setItem('msc_2fa_expiry', newExpiry.toString());
      expiry = newExpiry.toString();
    }

    const initialTimeLeft = Math.max(0, Math.floor((parseInt(expiry) - now) / 1000));
    setTimeLeft(initialTimeLeft);
    
    if (initialTimeLeft <= 0) {
      setCanResend(true);
    }

    // Focus first input
    inputRefs[0].current?.focus();
    
    // Timer logic
    const timer = setInterval(() => {
      const currentTime = Date.now();
      const remaining = Math.max(0, Math.floor((parseInt(expiry!) - currentTime) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        setCanResend(true);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, inputRefs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    data.split('').forEach((char, i) => {
      if (i < 4) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    if (data.length === 4) {
      inputRefs[3].current?.focus();
    } else {
      inputRefs[data.length].current?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('Please enter all 4 digits');
      return;
    }

    try {
      await verifySuperAdminOtp(otpString, tempToken);
      setSuccess('Verified successfully! Redirecting...');
      sessionStorage.removeItem('msc_2fa_temp_token');
      sessionStorage.removeItem('msc_2fa_email');
      sessionStorage.removeItem('msc_2fa_expiry');
      
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    try {
      await resendSuperAdminOtp(tempToken);
      setSuccess('PIN has been reset');
      
      // Reset expiry in sessionStorage
      const newExpiry = Date.now() + 1800 * 1000;
      sessionStorage.setItem('msc_2fa_expiry', newExpiry.toString());
      
      setTimeLeft(1800);
      setCanResend(false);
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      if (err?.status === 401) {
        setError('Verification session expired. Redirecting to login...');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      } else {
        setError(err?.message || 'Failed to resend OTP');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center premium-otp-container p-4">
      <BackgroundEffects />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md space-y-6 glass-card-premium p-6 sm:p-8 rounded-3xl shine-effect"
      >
        
        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="mx-auto w-14 h-14 bg-primary-theme/10 rounded-2xl flex items-center justify-center text-primary-theme mb-2 hologram-wrapper">
            <ShieldCheck size={28} className="relative z-10" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Security PIN</h1>
          <p className="text-muted text-sm leading-relaxed">
            Enter your 4-digit security PIN to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-6 relative z-10">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className="w-12 h-14 text-center text-xl font-black rounded-xl border-2 border-border bg-muted/5 focus:border-primary-theme focus:bg-background outline-none transition-all disabled:opacity-50 otp-input-premium"
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold"
              >
                <CheckCircle2 size={16} />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 4}
            className="w-full verify-btn-premium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-border/50 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2 text-muted">
              <Timer size={14} />
              <span>Expires in:</span>
            </div>
            <span className={`countdown-glow ${timeLeft < 60 ? "countdown-urgent" : "text-primary-theme"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className="flex items-center justify-center gap-2 text-xs font-bold text-primary-theme hover:opacity-80 disabled:opacity-30 transition-all"
            >
              <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
              Reset PIN
            </button>
            
            <button
              onClick={() => router.push('/auth/login')}
              className="flex items-center justify-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-all"
            >
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted/60 font-medium relative z-10">
          Secure Session provided by MSCureChain Shield. <br />
          Do not share your PIN with anyone.
        </p>
        
        {/* Decorative Micro Particles */}
        <div className="absolute -top-2 -right-2 particle" style={{ animation: 'twinkle 3s infinite' }} />
        <div className="absolute -bottom-2 -left-2 particle" style={{ animation: 'twinkle 4s infinite', animationDelay: '1s' }} />
      </motion.div>
    </div>
  );
}
