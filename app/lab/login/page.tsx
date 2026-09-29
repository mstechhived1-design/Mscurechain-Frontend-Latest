'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/lib/integrations/services/auth.service';
import toast from "react-hot-toast";

import {
    Eye,
    EyeOff,
    Smartphone,
    Loader2,
    Lock,
    ArrowLeft,
    ChevronRight,
    Beaker
} from "lucide-react";
import { useTransition } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

/**
 * ROOT-LEVEL LAB LOGIN PAGE
 * Useful as a generic entry point before hospital ID is known.
 */
const LabLoginPage = () => {
    const { setUser } = useAuthStore();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // ✅ SPEED FIX: Prefetch dashboard & AUTO-REDIRECT
    React.useEffect(() => {
        // Only redirect if fully initialized and authenticated
        const isAuth = useAuthStore.getState().isAuthenticated;
        const user = useAuthStore.getState().user;
        const rawId = (user as any)?.hospital || (user as any)?.hospitalId;
        const userHospitalId = (rawId && typeof rawId === 'object') ? ((rawId as any)._id || (rawId as any).id) : rawId;

        if (isAuth && userHospitalId && user?.role === 'lab') {
            router.replace(`/${userHospitalId}/lab/dashboard`);
        }
        
        router.prefetch('/lab/dashboard');
    }, [router]);

    const [form, setForm] = useState({
        identifier: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverMsg, setServerMsg] = useState("");

    const validate = () => {
        const err: Record<string, string> = {};

        if (!form.identifier || !form.identifier.trim()) {
            err.identifier = "Enter mobile number.";
        } else if (!/^\d{10}$/.test(form.identifier)) {
            err.identifier = "Enter valid 10-digit mobile number.";
        }

        if (!form.password || form.password.length < 6) {
            err.password = "Password must be at least 6 characters.";
        }

        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (errors.identifier) setErrors({ ...errors, identifier: '' });
        if (serverMsg) setServerMsg('');

        // Enforce numeric only and max 10 chars
        const numericValue = value.replace(/\D/g, '').slice(0, 10);
        setForm({ ...form, identifier: numericValue });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (errors.password) setErrors({ ...errors, password: '' });
        if (serverMsg) setServerMsg('');
        setForm({ ...form, password: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setServerMsg("");
        setErrors({});
        setIsLoading(true);

        try {
            // ✅ Calls dedicated lab-only endpoint — server enforces role server-side
            const response = await authService.loginLab({
                identifier: form.identifier,
                password: form.password,
            });

            const { accessToken, user, sessionId } = response as any;

            if (accessToken) {
                const { setAccessToken } = await import('@/lib/integrations');
                setAccessToken(accessToken);
            }

            // Normalize _id â†’ id
            if ((user as any)._id && !(user as any).id) {
                (user as any).id = (user as any)._id;
            }

            // Store user session (mirrors authStore.login pattern)
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("lastAuthCheck", Date.now().toString());
            if (sessionId) localStorage.setItem("sessionId", sessionId);
            localStorage.setItem("tabAuthorized", "true");

            // hospitalId cookie for server actions discovery
            const rawId = (user as any).hospital || (user as any).hospitalId;
            const userHospitalIdStr = (rawId && typeof rawId === 'object') ? (rawId._id || rawId.id) : rawId;
            if (userHospitalIdStr) {
                const hospitalIdStr = userHospitalIdStr.toString();
                localStorage.setItem("activeHospitalId", hospitalIdStr);
                document.cookie = `hospitalId=${hospitalIdStr}; path=/; max-age=604800; SameSite=Lax`;
            }

            // Update store
            setUser(user as any);

            toast.success("Welcome to Lab Portal!", {
                icon: '🧪',
                style: {
                    borderRadius: '1rem',
                    background: '#1e293b',
                    color: '#fff',
                    fontWeight: 'bold'
                }
            });

            // Redirect to dashboard (middleware will handle tenant prefixing)
            const rawIdVal = (user as any).hospital || (user as any).hospitalId;
            const userHospitalId = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;
            if (userHospitalId) {
                startTransition(() => {
                    router.replace(`/${userHospitalId}/lab/dashboard`);
                });
            } else {
                startTransition(() => {
                    router.replace('/lab/dashboard');
                });
            }
        } catch (err: any) {
            const errorMessage = err?.message || err?.response?.data?.message || 'Login failed. Please check your credentials.';
            setServerMsg(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 lg:p-8 bg-background">
            <ProgressBar isPending={isPending} color="#e11d48" />
            <div className="flex w-full max-w-6xl bg-card sm:rounded-lg overflow-hidden shadow-2xl border-0 sm:border border-primary-theme/30 min-h-screen sm:min-h-[600px] lg:min-h-[700px]">

                {/* Left Side: Illustration & Branding */}
                <div className="hidden lg:flex w-5/12 flex-col justify-between p-12 relative overflow-hidden bg-muted/5 border-r border-border/50">
                    <div className="absolute top-0 left-0 w-full h-full -z-10">
                        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary-theme/5 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-400/5 rounded-full blur-[80px]" />
                    </div>

                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => startTransition(() => router.push('/'))}>
                        <div className="w-10 h-10 bg-primary-theme/10 rounded-xl flex items-center justify-center p-2">
                            <Beaker size={24} className="text-primary-theme" />
                        </div>
                        <span className="text-xl font-bold bg-linear-to-r from-primary-theme to-blue-400 bg-clip-text text-transparent">
                            MSCureChain
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-primary-theme/10 rounded-3xl blur-xl group-hover:bg-primary-theme/20" />
                            <img
                                src="/assets/image.png"
                                className="relative w-full rounded-2xl shadow-xl border border-primary-theme/30 shadow-primary-theme/5"
                                alt="Laboratory Portal"
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight leading-tight">
                                Precision Diagnostics. <br />
                                <span className="text-primary-theme">Secure & Rapid.</span>
                            </h2>
                            <p className="text-muted text-sm leading-relaxed max-w-sm">
                                Managing samples, tests, and reports with clinical accuracy and real-time data transparency.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative bg-card">
                    {/* Header for mobile only */}
                    <div className="flex lg:hidden items-center gap-2 mb-8 absolute top-6 left-6">
                        <div
                            onClick={() => startTransition(() => router.push('/'))}
                            className="p-2 rounded-xl bg-muted/10 text-muted flex items-center justify-center"
                        >
                            <ArrowLeft size={18} />
                        </div>
                        <img src="/assets/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        <span className="text-sm font-black tracking-tighter text-primary-theme uppercase">MSCureChain</span>
                    </div>

                    <button
                        onClick={() => startTransition(() => router.push('/'))}
                        className="hidden lg:flex absolute top-8 left-8 p-2 rounded-xl hover:bg-muted/10 text-muted items-center gap-2 text-xs font-bold"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </button>

                    <div className="w-full max-w-[400px] space-y-8 mt-12 lg:mt-0">
                        <div className="text-center lg:text-left space-y-2">
                            <h1 className="text-3xl font-black tracking-tight underline decoration-primary-theme/30 underline-offset-8 text-rose-600">Lab Portal Login</h1>
                            <p className="text-muted text-sm">Access the laboratory management systems.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">
                                    Mobile Number
                                </label>
                                <div className={`group flex items-center bg-muted/5 border rounded-lg px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background ${errors.identifier ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                                    }`}>
                                    <Smartphone size={20} className={`mr-3 ${errors.identifier ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                                    <input
                                        type="tel"
                                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                                        placeholder="Enter mobile number"
                                        value={form.identifier}
                                        onChange={handleIdentifierChange}
                                        suppressHydrationWarning
                                    />
                                </div>
                                {errors.identifier && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.identifier}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted">
                                        Password
                                    </label>
                                </div>
                                <div className={`group flex items-center bg-muted/5 border rounded-lg px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background relative ${errors.password ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                                    }`}>
                                    <Lock size={20} className={`mr-3 ${errors.password ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={handlePasswordChange}
                                        suppressHydrationWarning
                                    />
                                    <button
                                        type="button"
                                        className="p-1 text-muted hover:text-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{errors.password}</p>
                                )}
                            </div>

                            {serverMsg && (
                                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold text-center">
                                    {serverMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 hover:shadow-primary-theme/30 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In Lab Portal</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-4 py-2 sm:py-4">
                                <div className="grow h-px bg-border/50" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Laboratory Access</span>
                                <div className="grow h-px bg-border/50" />
                            </div>

                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-relaxed">
                                    Restricted Access • Precision Authorized Lab Technicians Only
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(LabLoginPage);
