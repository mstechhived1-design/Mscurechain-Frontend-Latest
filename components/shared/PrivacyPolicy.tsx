'use client';

import React from "react";
import { XCircle } from "lucide-react";

export default function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
 const points = [
  "Identity Information: We collect basic details like your name, phone number, and email to create and manage your account.",
  "Secure Login: Your login credentials are protected using secure methods to prevent unauthorized access.",
  "Role-Based Access: Your access to data and features depends on your role (Doctor, Nurse, Admin, etc.).",
  "Hospital Access: You can only view and manage data related to the hospitals you are assigned to.",
  "Patient Records: We store medical information such as history, vitals, and treatments to support healthcare services.",
  "Data Usage: Your information is used only for healthcare operations and system functionality.",
  "Activity Logs: We record actions like viewing or updating records to ensure accountability and system safety.",
  "Data Security: We use standard security practices to protect your data from unauthorized access or misuse.",
  "Session Management: We use essential cookies to keep you signed in and ensure smooth system usage.",
  "No Advertising Use: Your data is not used for advertisements or third-party marketing tracking.",
  "Emergency Access: In critical situations, relevant data may be accessed to provide timely medical care.",
  "System Communication: We may send important messages such as OTPs and security alerts to your registered contact details.",
  "Data Retention: Your data is stored only as long as required for healthcare services and legal obligations.",
  "Legal Compliance: We handle your data in accordance with applicable healthcare laws and regulations.",
  "User Consent: By using the system, you agree to how your data is collected and used as described."
];
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-black tracking-tight">Privacy Policy</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
            <XCircle size={20} className="text-muted" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
          <p className="text-muted text-[10px] sm:text-sm leading-relaxed">
            At MSCureChain, we take your privacy and data security seriously. This policy explains how we handle your information within our healthcare ecosystem.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {points.map((point, i) => {
              const [title, desc] = point.split(": ");
              return (
                <div key={i} className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-muted/5 border border-border/50">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary-theme/10 flex items-center justify-center shrink-0 text-primary-theme font-bold text-[9px] sm:text-xs">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="font-bold text-[10px] sm:text-sm text-foreground">{title}</h3>
                    <p className="text-muted text-[9px] sm:text-[11px] leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-border bg-muted/5">
          <button
            onClick={onClose}
            className="w-full bg-primary-theme py-2.5 sm:py-3 rounded-xl text-white font-bold text-[10px] sm:text-sm transition-all active:scale-[0.98]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
