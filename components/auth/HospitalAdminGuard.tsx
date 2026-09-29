"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface HospitalAdminGuardProps {
  children: React.ReactNode;
}

const HospitalAdminGuard: React.FC<HospitalAdminGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname() as string;
  const { user, isAuthenticated, checkAuth, isInitialized, isLoading, initEvents } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Initialize auth events once
  useEffect(() => {
    initEvents();
  }, [initEvents]);

  // Check authentication
  useEffect(() => {
    let isMounted = true;
    
    const verifyAuth = async () => {
      if (!isInitialized) {
        await checkAuth();
      }
      if (isMounted) setIsChecking(false);
    };

    verifyAuth();

    return () => { isMounted = false; };
  }, [isInitialized, checkAuth]);

  // Handle redirects
  useEffect(() => {
    if (isChecking) return; // Wait for check to complete

    if (!isAuthenticated) {
      console.log('[Guard] Not authenticated, redirecting to login');
      router.replace("/auth/login");
      return;
    }

    if (user?.role !== "hospital-admin") {
      console.log(`[Guard] Invalid role ${user?.role}, redirecting`);
      const routeMap: Record<string, string> = {
        'staff': '/staff',
        'doctor': '/doctor',
        'helpdesk': '/helpdesk',
        'lab': '/lab/dashboard',
        'pharma-owner': '/pharmacy/dashboard',
        'pharmacy': '/pharmacy/dashboard',
        'super-admin': '/admin',
        'admin': '/admin',
        'patient': '/patient'
      };
      router.replace(routeMap[user?.role || ''] || "/auth/login");
      return;
    }
  }, [isChecking, isAuthenticated, user, router]);

  // Show loading state
  if (isChecking || (isLoading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            <div className="h-24 w-24 border-8 border-gray-100 border-t-blue-600 rounded-full spin"></div>
          </div>
          <div>
            <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">CureChain</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Authenticating Node...</p>
          </div>
        </div>
      </div>
    );
  }

  // If validated, render children
  if (isAuthenticated && user?.role === "hospital-admin") {
    return <>{children}</>;
  }

  return null; // Will redirect
};

export default HospitalAdminGuard;
