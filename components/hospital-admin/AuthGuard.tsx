"use client";

import React, { useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  
  // ✅ PRIMITIVE SELECTORS - only subscribe to what we need
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const userRole = useAuthStore((state) => state.user?.role);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // ✅ CRITICAL: Only initialize ONCE
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      useAuthStore.getState().initEvents();
      checkAuth();
    }
  }, [checkAuth]);

  // Redirect logic - ONLY when state changes
  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      console.warn(`[AuthGuard: hospital-admin] 🚫 Not authenticated. Redirecting to login.`);
      router.replace("/auth/login");
    } else if (userRole && userRole !== "hospital-admin") {
      const routeMap: Record<string, string> = {
        staff: "/staff",
        doctor: "/doctor",
        helpdesk: "/helpdesk",
        lab: "/lab/dashboard",
        "pharma-owner": "/pharmacy/dashboard",
        pharmacy: "/pharmacy/dashboard",
        "super-admin": "/admin",
        admin: "/admin",
        patient: "/patient",
        nurse: "/nurse",
        emergency: "/emergency",
        hr: "/hr",
        frontdesk: "/frontdesk"
      };
      const redirectPath = routeMap[userRole] || "/auth/login";
      console.warn(`[AuthGuard: hospital-admin] 🔄 Role mismatch (${userRole}). Redirecting to: ${redirectPath}`);
      router.replace(redirectPath);
    } else {
      console.log(`[AuthGuard: hospital-admin] ✅ Access Granted. Role: ${userRole}`);
    }
  }, [isAuthenticated, isInitialized, userRole, router]);

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-4 border-4 border-indigo-600/20 border-b-indigo-600 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">
              MS CureChain
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">
              Verifying Administrator Session
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!isAuthenticated || userRole !== "hospital-admin") {
    return null;
  }

  return <>{children}</>;
}

// ✅ CRITICAL: Memoize auth guard
export default memo(AuthGuard);
