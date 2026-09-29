'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Cookie } from "lucide-react";
import PrivacyPolicyModal from "./PrivacyPolicy";

const COOKIE_CONSENT_KEY = "msc_cookie_consent";

export default function CookieConsent() {
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) setShowCookieModal(true);
  }, []);

  const handleAccept = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShowCookieModal(false);
  }, []);

  const handleDecline = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setShowCookieModal(false);
  }, []);

  if (!showCookieModal) return null;

  return (
    <>
      <div className="fixed top-1 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-lg px-2 sm:px-4">
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-2xl border border-primary-theme/20 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary-theme/10 flex items-center justify-center shrink-0">
                <Cookie size={16} className="text-primary-theme sm:size-20" />
              </div>
              <div>
                <h2 className="text-[11px] sm:text-sm font-black tracking-tight">We Use Cookies 🍪</h2>
              </div>
            </div>
            
            <p className="text-[10px] sm:text-[11px] text-muted leading-relaxed">
             We use cookies to ensure the platform functions properly (e.g., secure login and session management), remember your preferences (such as hospital and role), and improve system performance.With your consent, we may also use analytics cookies to understand usage and enhance the experience. We do not use cookies for advertising purposes.You can accept all cookies, reject non-essential ones, or manage your preferences at any time. For more details, see our Privacy Policy.
            </p>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleAccept}
                className="bg-primary-theme hover:opacity-90 active:scale-[0.96] px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-white font-bold text-[10px] sm:text-xs transition-all w-fit"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                className="bg-muted/10 hover:bg-muted/20 active:scale-[0.96] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-muted text-[10px] sm:text-xs font-bold border border-border/40 transition-all w-fit"
              >
                Decline
              </button>
            </div>

            <p className="text-[9px] sm:text-[10px] text-muted/60 text-center sm:text-left">
              By using MSCureChain, you agree to our{" "}
              <button 
                type="button" 
                onClick={() => setShowPrivacyModal(true)} 
                className="underline hover:text-primary-theme font-bold"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>

      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}
    </>
  );
}
