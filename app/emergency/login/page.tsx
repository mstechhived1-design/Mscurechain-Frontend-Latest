"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { emergencyService } from "@/lib/integrations/services/emergency.service";
import { useTransition } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

function EmergencyLogin() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isNavigating, setIsNavigating] = useState(false);

    // ✅ SPEED FIX: Prefetch dashboard
    React.useEffect(() => {
        router.prefetch('/ambulance');
    }, [router]);

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Limit to 10 characters (any type: letters, numbers, special chars)
        if (value.length <= 10) {
            setIdentifier(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            console.log("🚑 Initiating login for:", identifier);
            const response = await emergencyService.login(identifier, password) as any;
            console.log("🚑 Login Response Received:", { 
                hasTokens: !!response.tokens, 
                hasAccessTokenRoot: !!response.accessToken,
                userRole: response.user?.role,
                keys: Object.keys(response)
            });

            // Store token in memory (primary for same-tab client-side use)
            // AND in localStorage so apiClient restores it after the page reload
            // Store token robustly (handle both nested and flat responses)
            const accessToken = response.accessToken || response.tokens?.accessToken;
            const refreshToken = response.refreshToken || response.tokens?.refreshToken;

            if (accessToken) {
                console.log("[Login] 🔑 Token acquired. Persisting to Storage...");
                const { setAccessToken } = await import('@/lib/integrations');
                setAccessToken(accessToken);
            } else {
                console.error("[Login] ❌ No access token found in any response field!");
            }

            localStorage.setItem("userRole", "ambulance");
            localStorage.setItem("user", JSON.stringify(response.user));
            localStorage.setItem('lastAuthCheck', Date.now().toString());
            if (response.sessionId) localStorage.setItem("sessionId", response.sessionId);
            localStorage.setItem("tabAuthorized", "true");

            // MULTI-TENANCY: Store hospitalId
            const rawIdVal = (response.user as any).hospital || (response.user as any).hospitalId;
            const hospitalIdStr = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;
            
            // hospitalId cookie is now supplemental for server actions discovery
            if (hospitalIdStr) {
                const hStr = hospitalIdStr.toString();
                localStorage.setItem("activeHospitalId", hStr);
                document.cookie = `hospitalId=${hStr}; path=/; max-age=604800; SameSite=Lax`;
            }

            // OVERWRITE COOKIES: Handled securely via HttpOnly on backend

            // Show navigation feedback
            setIsNavigating(true);

            // Add console logs for auth debugging.
            console.log("🕵️ Auth Check Trace:", {
                hasSessionToken: !!localStorage.getItem("accessToken"),
                hasCookieToken: !!document.cookie.split('; ').find(row => row.startsWith('accessToken=')),
                role: localStorage.getItem("userRole")
            });

            // Redirection: Use location.href for atomic sync across middlewares
            console.log("🚀 Auth Success. Redirecting to Mission Control...");
            window.location.href = "/ambulance";
        } catch (err: any) {
            console.error("❌ Login failed:", err);
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const fillTestCredentials = () => {
        setIdentifier("AMB-001");
        setPassword("AMB123");
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <ProgressBar isPending={isPending} color="#dc2626" />
            <div className="w-full max-w-sm md:max-w-md space-y-6 md:space-y-8">
                {/* Emergency Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full mb-4 shadow-sm hover:scale-105">
                        <svg
                            className="w-8 h-8 md:w-12 md:h-12 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
                        Emergency Login
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">
                        Ambulance Personnel Access
                    </p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 backdrop-blur-sm bg-white/90">
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6" autoComplete="off">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                Employee ID / Mobile
                            </label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={handleIdentifierChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-base placeholder:text-gray-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                placeholder="AMB-001 or 9876543210"
                                maxLength={10}
                                required
                                autoComplete="off"
                                suppressHydrationWarning
                            />
                            <p className="text-[10px] text-muted text-right pr-1 mt-1">{identifier.length}/10</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 pr-12 border border-gray-200 rounded-xl text-gray-900 text-base placeholder:text-gray-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="new-password"
                                    suppressHydrationWarning
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    suppressHydrationWarning
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isNavigating}
                            className="w-full bg-linear-to-r from-red-600 to-orange-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:from-red-700 hover:to-orange-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/30 active:scale-[0.98]"
                            suppressHydrationWarning
                        >
                            {loading || isNavigating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{isNavigating ? "Navigating to ambulance dashboard..." : "Signing In..."}</span>
                                </span>
                            ) : "Secure Login"}
                        </button>


                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wide">
                            Restricted Access • Authorized Personnel Only
                        </p>
                        <p className="text-[10px] text-gray-300 text-center mt-2 font-mono">
                            System ID: EMR-2024-SECURE
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => startTransition(() => router.push("/"))}
                        className="group inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold px-4 py-2 rounded-full hover:bg-white/50"
                        suppressHydrationWarning
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Return to Main Portal
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(EmergencyLogin);
