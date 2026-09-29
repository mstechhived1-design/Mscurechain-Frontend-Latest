'use client';

import React, { useState, Suspense, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from '@/stores/authStore';
import {
  Eye, EyeOff, Loader2, User as UserIcon, Lock,
  ArrowLeft, ShieldCheck, Timer, ShieldX,
} from "lucide-react";
import { useTransition } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

// ─── Lockout Helpers ─────────────────────────────────────────────────────────
const LOCKOUT_KEY = "msc_login_lockout";
// Remove hardcoded 15m duration — now controlled progressively by backend (1, 5, 10, 30 mins)

const fmtCountdown = (secs: number) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const saveLockout = (identifier: string, durationSeconds: number) => {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
    data[identifier] = Date.now() + (durationSeconds * 1000);
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
  } catch (_) {}
};

const getLockoutSecsRemaining = (identifier: string): number => {
  if (typeof window === 'undefined' || !identifier) return 0;
  try {
    const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
    const until = data[identifier];
    if (!until) return 0;
    const remaining = Math.ceil((until - Date.now()) / 1000);
    if (remaining <= 0) {
      delete data[identifier];
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
      return 0;
    }
    return remaining;
  } catch (_) { return 0; }
};



// ─── Lockout Banner (replaces Sign In button) ───────────────────────────────────
function LockoutBanner({ secondsLeft }: { secondsLeft: number }) {
  return (
    <div className="rounded-2xl border border-red-500/30 overflow-hidden" style={{ background: 'rgba(239,68,68,0.04)' }}>
      <div className="h-0.5 w-full bg-red-500/40" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <ShieldX size={18} className="shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider">Account Temporarily Locked</span>
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          Too many failed login attempts. For security, this account is locked. Please wait before trying again.
        </p>
        <div className="flex items-center justify-between bg-red-500/10 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-muted">
            <Timer size={16} className="text-red-400" />
            <span className="text-xs font-bold">Time remaining</span>
          </div>
          <span className="text-red-500 font-black text-xl tracking-widest tabular-nums">
            {fmtCountdown(secondsLeft)}
          </span>
        </div>
        <p className="text-[10px] text-muted/60 text-center">
          Sign In will re-enable automatically when timer reaches 00:00.
        </p>
      </div>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROLE_DISPLAY_MAP: Record<string, string> = {
  'super-admin': 'Super Admin',
  'admin': 'Admin Portal',
  'patient': 'Patient Portal',
  'doctor': 'Doctor Portal',
  'hospital-admin': 'Hospital Admin',
  'helpdesk': 'Helpdesk Portal',
  'masterhelpdesk': 'Master Helpdesk Portal',
  'frontdesk': 'Front Desk Portal',
  'staff': 'Staff Portal',
  'nurse': 'Nurse Portal',
  'pharma': 'Pharmacy Portal',
  'pharma-owner': 'Pharmacy Portal',
  'pharmacist': 'Pharmacy Portal',
  'lab': 'Lab Portal',
  'emergency': 'Emergency Portal',
  'ambulance': 'Ambulance Portal',
  'hr': 'HR Portal',
  'discharge': 'Discharge Portal',
};

const ROLE_PATH_MAP: Record<string, string> = {
  'admin': '/admin',
  'super-admin': '/admin',
  'patient': '/patient/dashboard',
  'doctor': 'doctor',
  'hospital-admin': 'hospital-admin',
  'helpdesk': 'helpdesk',
  'masterhelpdesk': 'masterhelpdesk',
  'frontdesk': 'frontdesk',
  'staff': 'staff',
  'nurse': 'nurse',
  'pharma': 'pharmacy/dashboard',
  'pharma-owner': 'pharmacy/dashboard',
  'pharmacist': 'pharmacy/dashboard',
  'lab': 'lab/dashboard',
  'emergency': '/ambulance',
  'ambulance': '/ambulance',
  'hr': 'hr',
  'discharge': 'discharge',
};

// ─── Main Login Form ───────────────────────────────────────────────────────────
const LoginForm = () => {
  const { login, isAuthenticated, user, isInitialized, isLoading, isTabAuthorized } = useAuthStore();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams() as any;
  const redirectPath = ((searchParams?.get('redirect') ?? null) ?? null);

  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  // ── Lockout countdown ─────────────────────────────────────────────────────
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((initialSeconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setLockoutSeconds(initialSeconds);
    countdownRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // ── Credentials form ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMsg, setServerMsg] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpForm, setFpForm] = useState({ email: '' });
  const [fpLoading, setFpLoading] = useState(false);
  const [fpServerMsg, setFpServerMsg] = useState('');


  // ── Check lockout whenever identifier changes ───────────────────────────────
  useEffect(() => {
    const secs = getLockoutSecsRemaining(form.identifier);
    if (secs > 0) {
      startCountdown(secs);
    } else {
      // Clear any running timer if identifier changed to an unlocked one
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setLockoutSeconds(0);
    }
  }, [form.identifier, startCountdown]);

  const isLocked = lockoutSeconds > 0;

  // ── Redirect guard (tab-isolated) ───────────────────────────────────────────
  useEffect(() => {
    if (isInitialized && isAuthenticated && user && isTabAuthorized && !isNavigating) {
      const role = user.role?.toLowerCase() || '';
      const rawIdVal = (user as any).hospitalId || (user as any).hospital;
      const hosp = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;
      let target = redirectPath ? decodeURIComponent(redirectPath) : null;
      if (!target || target === '/auth/login') {
        const portal = ROLE_PATH_MAP[role] || 'hospital-admin';
        
        // ✅ SECURITY: Prevent patients from accessing staff portals, even via redirect
        if (role === 'patient' && target && !target.includes('/patient')) {
          console.log("[Auth] 🛡️ Blocking patient redirect to staff portal:", target);
          target = '/patient/dashboard';
        } else {
          target = target || (portal.startsWith('/') ? portal : (hosp ? `/${hosp}/${portal}` : `/${portal}`));
        }

        // ✅ SYNC: Sanitize "global" prefix from redirect paths to avoid 404 loops
        if (target && target.startsWith('/global')) {
          console.log("[Auth] 🧹 Sanitizing global redirect path:", target);
          target = target.replace(/^\/global/, '');
          if (!target.startsWith('/')) target = '/' + target;
        }
      }
      if (target && target !== window.location.pathname) {
        const roleLabel = ROLE_DISPLAY_MAP[role] || 'Portal';
        setDashboardName(roleLabel);
        setIsNavigating(true);
        router.replace(target);
        setTimeout(() => { if (window.location.pathname === '/auth/login') window.location.href = target!; }, 3000);
      }
    }
  }, [isInitialized, isAuthenticated, user, isTabAuthorized, redirectPath, router, isNavigating, setDashboardName, setIsNavigating]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const err: Record<string, string> = {};
    if (!form.identifier.trim()) err.identifier = 'Enter mobile number or doctor ID.';
    else if (/^\d/.test(form.identifier) && form.identifier.trim().length < 10)
      err.identifier = 'Enter a valid 10-digit mobile number.';
    if (!form.password || form.password.length < 6) err.password = 'Password must be at least 6 characters.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // ── Input handlers ───────────────────────────────────────────────────────
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (errors.identifier) setErrors({ ...errors, identifier: '' });
    if (serverMsg) setServerMsg('');
    if (/^\d/.test(value)) setForm({ ...form, identifier: value.replace(/\D/g, '').slice(0, 10) });
    else setForm({ ...form, identifier: value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (errors.password) setErrors({ ...errors, password: '' });
    if (serverMsg) setServerMsg('');
    setForm({ ...form, password: e.target.value });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return; // Belt-and-suspenders: form guard
    if (!validate()) return;
    setServerMsg('');
    setErrors({});

    try {
      const response = await login(form.identifier, form.password);
      
      // ✅ SuperAdmin 2FA Flow
      if (response?.require2FA) {
        sessionStorage.setItem('msc_2fa_temp_token', response.tempToken);
        sessionStorage.setItem('msc_2fa_email', response.email);
        sessionStorage.setItem('msc_2fa_expiry', (Date.now() + 300 * 1000).toString());
        if (response.sessionId) {
          sessionStorage.setItem('sessionId', response.sessionId);
        }
        setDashboardName('Super Admin Verification');
        setIsNavigating(true);
        router.push('/auth/superadmin/verify-otp');
        return;
      }

      const { user: freshUser } = useAuthStore.getState();

      const ALLOWED_ROLES = [
        'admin', 'super-admin', 'doctor', 'hospital-admin',
        'helpdesk', 'masterhelpdesk', 'frontdesk', 'staff', 'patient',
        'nurse', 'pharma', 'lab', 'emergency', 'ambulance', 'hr', 'pharma-owner', 'pharmacist', 'discharge',
      ];
      const role = freshUser?.role?.toLowerCase() || '';
      if (freshUser && !ALLOWED_ROLES.includes(role)) {
        useAuthStore.getState().logout();
        setServerMsg(`Access Denied: The "${freshUser.role}" role must use its dedicated login page.`);
        return;
      }

      const rawIdVal = (freshUser as any)?.hospitalId || (freshUser as any)?.hospital;
      const hosp = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;
      const portal = ROLE_PATH_MAP[role] || 'hospital-admin';

      let finalPath = redirectPath ? decodeURIComponent(redirectPath) : null;
      
      // ✅ SECURITY: Prevent patients from accessing staff portals, even via redirect
      if (role === 'patient' && finalPath && !finalPath.includes('/patient')) {
        console.log("[Auth] 🛡️ Blocking patient redirect to staff portal:", finalPath);
        finalPath = '/patient/dashboard';
      } else if (!finalPath) {
        finalPath = portal.startsWith('/') ? portal : (hosp ? `/${hosp}/${portal}` : `/${portal}`);
      }

      // ✅ SYNC: Sanitize "global" prefix from redirect paths
      if (finalPath && finalPath.startsWith('/global')) {
        console.log("[Auth] 🧹 Sanitizing global final path:", finalPath);
        finalPath = finalPath.replace(/^\/global/, '');
        if (!finalPath.startsWith('/')) finalPath = '/' + finalPath;
      }

      const roleLabel = ROLE_DISPLAY_MAP[role] || 'Portal';
      setDashboardName(roleLabel);
      setIsNavigating(true);
      router.replace(finalPath);
      setTimeout(() => { if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') window.location.href = finalPath; }, 2500);

    } catch (err: any) {
      const msg: string = err?.message || err?.response?.data?.message || '';

      // ── LOCKOUT: 429 too many attempts ───────────────────────────────────
      const isLockoutError =
        err?.status === 429 ||
        msg.toLowerCase().includes('temporarily locked') ||
        msg.toLowerCase().includes('too many failed');

      if (isLockoutError) {
        // Use the progressive duration from the backend (1m, 5m, 10m, 30m)
        // Note: apiClient.ts maps raw data to 'err.error'
        const durationSeconds = err?.error?.retryAfterSeconds || err?.response?.data?.retryAfterSeconds || 60;
        
        saveLockout(form.identifier, durationSeconds);
        startCountdown(durationSeconds);
        
        setServerMsg(''); // Clear — the LockoutBanner tells the story
        return;
      }

      if (msg.includes('Cannot connect') || msg.includes('Failed to fetch')) {
        setServerMsg('Cannot connect to server. Please ensure the backend is running.');
        return;
      }

      const fieldErrors: Record<string, string> = {};
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('password') && msgLower.includes('wrong')) {
        fieldErrors.password = 'Incorrect password. Please try again.';
      } else if (msgLower.includes('mobile') && msgLower.includes('wrong')) {
        fieldErrors.identifier = 'Mobile number not found. Please check and try again.';
      } else if (msgLower.includes('doctor id') && msgLower.includes('wrong')) {
        fieldErrors.identifier = 'Doctor ID not found. Please check and try again.';
      } else if (msgLower.includes('invalid doctor id')) {
        fieldErrors.identifier = 'Invalid Doctor ID.';
      } else if (msgLower.includes('invalid credentials') || msg.toLowerCase().includes('invalid credential')) {
        setServerMsg('Invalid credentials. Please check your details and try again.');
        return;
      } else if (msg) {
        setServerMsg(msg);
        return;
      } else {
        setServerMsg('Login failed. Please check your credentials.');
        return;
      }
      setErrors(fieldErrors);
    }
  };

  const handleFpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpLoading(true);
    try { setFpServerMsg("Reset link sent to your email."); }
    catch (err: any) { setFpServerMsg(err?.message || "Server error"); }
    finally { setFpLoading(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ProgressBar isPending={isPending} color="primary-theme" />



      <div className="flex w-full max-w-6xl bg-card sm:rounded-[0.5rem] overflow-hidden shadow-2xl border-0 sm:border border-primary-theme/30 min-h-screen sm:min-h-[600px] lg:min-h-[700px]">

        {/* Left Side */}
        <div className="hidden lg:flex w-5/12 flex-col justify-between p-12 relative overflow-hidden bg-muted/5 border-r border-border/50">
          <div className="absolute top-0 left-0 w-full h-full -z-10">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary-theme/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-400/5 rounded-full blur-[80px]" />
          </div>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => startTransition(() => router.push('/'))}>
            <span className="text-2xl absolute top-15 left-40 font-bold bg-linear-to-r from-primary-theme to-blue-400 bg-clip-text text-transparent">
              MSCureChain
            </span>
          </div>
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary-theme/10 rounded-3xl blur-xl group-hover:bg-primary-theme/20" />
              <img src="/assets/image.png" className="relative w-full rounded-2xl border border-primary-theme/30" alt="Health Portal" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Secure. Patient Centric. <br />
                <span className="text-primary-theme">Future Ready.</span>
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-sm">
                Empowering healthcare providers with real-time data insights and seamless patient management workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative bg-card">

          <div className="flex lg:hidden items-center gap-2 mb-8 absolute top-6 left-6">
            <div onClick={() => startTransition(() => router.push('/'))} className="p-2 rounded-xl bg-muted/10 text-muted flex items-center justify-center cursor-pointer">
              <ArrowLeft size={18} />
            </div>
            <img src="/assets/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-black tracking-tighter text-primary-theme uppercase">MSCureChain</span>
          </div>

          <button onClick={() => startTransition(() => router.push('/'))} className="hidden lg:flex absolute top-8 left-8 p-2 rounded-xl hover:bg-muted/10 text-muted items-center gap-2 text-xs font-bold">
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div className="w-full max-w-[400px] space-y-8 mt-12 lg:mt-0">
            {!showForgotPassword ? (
              <>
                <div className="text-center lg:text-left space-y-2">
                  <h1 className="text-3xl font-black tracking-tight">Login Portal</h1>
                  <p className="text-muted text-[10px] sm:text-xs">
                    Staff: Use Password • Patients: Use Date of Birth (DDMMYYYY)
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

                  {/* User Identifier */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">User Identifier</label>
                    <div className={`group flex items-center bg-muted/5 border rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background ${errors.identifier ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
                      <UserIcon size={20} className={`mr-3 shrink-0 ${errors.identifier ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                      <input
                        id="user-identifier-input"
                        type="text"
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-sm"
                        placeholder="Mobile or Doctor ID"
                        value={form.identifier}
                        onChange={handleIdentifierChange}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        disabled={isLocked}
                        suppressHydrationWarning
                      />
                    </div>
                    {errors.identifier && (
                      <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.identifier}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">Password</label>
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] font-bold text-primary-theme hover:opacity-80" suppressHydrationWarning>
                        Forgot Password?
                      </button>
                    </div>
                    <div className={`group flex items-center bg-muted/5 border-1 rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background relative ${errors.password ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
                      <Lock size={20} className={`mr-3 shrink-0 ${errors.password ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-sm"
                        placeholder="Password or DOB (DDMMYYYY)"
                        value={form.password}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        disabled={isLocked}
                        suppressHydrationWarning
                      />
                      <button type="button" className="p-1 text-muted hover:text-foreground" onClick={() => setShowPassword(!showPassword)} suppressHydrationWarning>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.password}</p>
                    )}
                  </div>

                  {/* Server error message (not shown when locked — banner handles it) */}
                  {serverMsg && !isLocked && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold text-center">
                      {serverMsg}
                    </div>
                  )}

                  {/* ── LOCKOUT BANNER or SIGN IN BUTTON ── */}
                  {isLocked ? (
                    <LockoutBanner secondsLeft={lockoutSeconds} />
                  ) : (
                    <button
                      type="submit"
                      id="login-submit-btn"
                      disabled={isLoading || isNavigating}
                      className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 hover:shadow-primary-theme/30 active:scale-[0.98] flex items-center justify-center gap-3 transition-all"
                      suppressHydrationWarning
                    >
                      {isLoading || isNavigating
                        ? <Loader2 size={20} className="animate-spin" />
                        : "Sign In Account"}
                    </button>
                  )}

                  {isNavigating && (
                    <div className="flex items-center justify-center gap-2 text-primary-theme animate-pulse py-2">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic ml-1">
                        Navigating to {dashboardName}...
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 py-2 sm:py-4">
                    <div className="grow h-px bg-border/50" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-1">
                      <ShieldCheck size={10} /> Secure Login
                    </span>
                    <div className="grow h-px bg-border/50" />
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center lg:text-left space-y-2">
                  <h1 className="text-3xl font-black tracking-tight">Recovery</h1>
                  <p className="text-muted text-sm">Recover access via your registered email.</p>
                </div>
                <form onSubmit={handleFpSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Email Address</label>
                    <div className="group flex items-center bg-muted/5 border-2 rounded-2xl px-4 py-3.5 focus-within:border-primary-theme border-border">
                      <input
                        type="email"
                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-sm"
                        placeholder="doctor@example.com"
                        value={fpForm.email}
                        onChange={(e) => setFpForm({ email: e.target.value })}
                      />
                    </div>
                  </div>
                  {fpServerMsg && (
                    <div className={`p-3.5 rounded-2xl text-[11px] font-bold text-center border ${fpServerMsg.includes('sent') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {fpServerMsg}
                    </div>
                  )}
                  <div className="space-y-3">
                    <button type="submit" disabled={fpLoading} className="w-full bg-primary-theme py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98]">
                      {fpLoading ? <Loader2 size={20} className="animate-spin" /> : "Request Reset Link"}
                    </button>
                    <button type="button" className="w-full py-2 text-xs font-bold text-muted hover:text-foreground" onClick={() => setShowForgotPassword(false)}>
                      Back to Secure Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const LoginPage = () => {
  return (
    <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 lg:p-8 bg-background">
      <Suspense fallback={
        <div className="flex h-full w-full justify-center items-center">
          <Loader2 className="animate-spin text-primary-theme" size={40} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
};

export default LoginPage;
