'use client';

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { authService } from '@/lib/integrations/services/auth.service';
import toast from "react-hot-toast";
import {
    Lock,
    Smartphone,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2
} from "lucide-react";
import { useTransition } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

function PharmacyLogin() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { setUser } = useAuthStore();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // ✅ AUTO-REDIRECT
    React.useEffect(() => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        const user = useAuthStore.getState().user;
        const rawId = (user as any)?.hospital || (user as any)?.hospitalId;
        const userHospitalId = (rawId && typeof rawId === 'object') ? ((rawId as any)._id || (rawId as any).id) : rawId;

        if (isAuth && userHospitalId && (user?.role === 'pharmacy' || user?.role === 'pharmacist' || user?.role === 'pharma-owner' || user?.role === 'pharma')) {
            router.replace(`/${userHospitalId}/pharmacy/dashboard`);
        }
    }, [router]);
    const [loading, setLoading] = useState(false);
    const [mobileError, setMobileError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMobileError(""); // Clear error on change
        // Only allow numbers
        if (/^\d*$/.test(value)) {
            // Limit to 10 digits
            if (value.length <= 10) {
                setIdentifier(value);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (identifier.length !== 10) {
            setMobileError("Mobile number must be exactly 10 digits");
            return;
        }

        setLoading(true);
        setMobileError("");
        setPasswordError("");

        try {
            // ✅ Calls dedicated pharmacy-only endpoint — server enforces role server-side
            const response = await authService.loginPharmacy({ identifier, password });

            if (!response) {
                toast.error("Invalid credentials or server error.");
                setLoading(false);
                return;
            }

            const { accessToken, user, sessionId } = response as any;

            if (accessToken) {
                const { setAccessToken } = await import('@/lib/integrations');
                setAccessToken(accessToken);
            }

            // Normalize _id → id
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

            // Success Redirect
            toast.success("Login successful!", {
                icon: '💊',
                style: {
                    borderRadius: '1rem',
                    background: '#1e293b',
                    color: '#fff',
                    fontWeight: 'bold'
                }
            });

            // ✅ REDIRECT FIX: Include hospitalId in path to avoid 404
            const rawIdVal = (user as any).hospital || (user as any).hospitalId;
            const userHospitalId = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;
            if (userHospitalId) {
                startTransition(() => {
                    router.push(`/${userHospitalId}/pharmacy/dashboard`);
                });
            } else {
                startTransition(() => {
                    router.push("/pharmacy/dashboard");
                });
            }

        } catch (err: any) {
            console.error("❌ Login failed:", err);
            const errorMessage = err.message || "Login failed. Please check your credentials.";

            if (errorMessage === "Mobile number is wrong" || errorMessage.toLowerCase().includes("mobile number is wrong")) {
                setMobileError("Mobile number is wrong");
                toast.error("Mobile number is wrong");
            } else if (errorMessage === "Password is wrong" || errorMessage.toLowerCase().includes("password is wrong")) {
                setPasswordError("Password is wrong");
                toast.error("Password is wrong");
            } else {
                // Only show generic error if it's NOT one of the specific ones
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 lg:p-8 bg-background">
            <ProgressBar isPending={isPending} color="#fbbf24" /> 
            <div className="flex w-full max-w-5xl bg-card sm:rounded-lg overflow-hidden shadow-2xl border-0 sm:border border-primary-theme/30 min-h-screen sm:min-h-[600px] lg:min-h-[700px]">

                {/* Left Side: Illustration & Branding - Hidden on touch devices/small screens */}
                <div className="hidden lg:flex w-5/12 flex-col justify-center items-center gap-10 p-12 relative overflow-hidden bg-muted/5 border-r border-border/50">
                    <div className="flex items-center justify-center gap-3 cursor-pointer" onClick={() => startTransition(() => router.push('/'))}>
                        <span className="text-2xl font-bold bg-linear-to-r from-primary-theme to-blue-400 bg-clip-text text-transparent">
                            MScurechain
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-primary-theme/10 rounded-3xl blur-xl group-hover:bg-primary-theme/20" />
                            <img
                                src="/assets/image.png"
                                className="relative w-full rounded-2xl  border  border-primary-theme/30 "
                                alt="Health Portal"
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-black tracking-tight leading-tight">
                                Secure Patient Centric. <br />
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
                    {/* Header for mobile only */}
                    <div className="flex lg:hidden items-center gap-2 mb-8 absolute top-6 left-6">
                        <div
                            onClick={() => startTransition(() => router.push('/'))}
                            className="p-2 rounded-xl bg-muted/10 text-muted flex items-center justify-center"
                        >
                            <ArrowLeft size={18} />
                        </div>
                        <img src="/assets/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        <span className="text-sm font-black tracking-tighter text-primary-theme uppercase">Pharma Login</span>
                    </div>

                    <button
                        onClick={() => startTransition(() => router.push('/'))}
                        className="hidden lg:flex absolute top-8 left-8 p-2 rounded-xl hover:bg-muted/10 text-muted items-center gap-2 text-xs font-bold"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </button>

                    <div className="w-full max-w-[400px] space-y-8 mt-12 lg:mt-0">
                        <div className="text-center lg:text-left space-y-2">
                            <h1 className="text-3xl font-black tracking-tight underline decoration-primary-theme/30 underline-offset-8">Pharmacy Portal Login</h1>
                            <p className="text-muted text-sm">Sign in to manage pharmacy operations.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">
                                    Mobile Number
                                </label>
                                <div className={`group flex items-center bg-muted/5 border rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background ${mobileError ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                                    }`}>
                                    <Smartphone size={20} className={`mr-3 ${mobileError ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                                    <input
                                        type="tel"
                                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                                        placeholder="Enter mobile number"
                                        value={identifier}
                                        onChange={handleIdentifierChange}
                                        suppressHydrationWarning
                                    />
                                </div>
                                {mobileError && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{mobileError}</p>
                                )}
                                <p className="text-[10px] text-muted text-right pr-1">{identifier.length}/10</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted">
                                        Password
                                    </label>
                                </div>
                                <div className={`group flex items-center bg-muted/5 border rounded-[0.4rem] px-4 py-3.5 sm:py-4 focus-within:border-primary-theme focus-within:bg-background relative ${passwordError ? 'border-red-500/50 bg-red-500/5' : 'border-border'
                                    }`}>
                                    <Lock size={20} className={`mr-3 ${passwordError ? 'text-red-500' : 'text-muted group-focus-within:text-primary-theme'}`} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full bg-transparent outline-none placeholder:text-muted/50 text-foreground font-medium text-base sm:text-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordError("");
                                        }}
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
                                {passwordError && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1 ml-1">{passwordError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-theme hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-4 sm:py-4.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-theme/20 hover:shadow-primary-theme/30 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    "Sign In Pharma Portal"
                                )}
                            </button>

                            <div className="flex items-center gap-4 py-2 sm:py-4">
                                <div className="grow h-px bg-border/50" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Secure Login</span>
                                <div className="grow h-px bg-border/50" />
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(PharmacyLogin);
