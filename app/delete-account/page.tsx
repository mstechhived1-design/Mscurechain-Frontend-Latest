'use client';

import React from 'react';
import { UserX, Trash2, ShieldAlert, Clock, Mail, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * ACCOUNT DELETION REQUEST PAGE
 * 
 * Required for Google Play Store compliance.
 * Provides instructions on how users can delete their accounts and data.
 */

const DeleteAccountPage = () => {
  const router = useRouter();

  const steps = [
    {
      title: 'Via the MS CureChain Mobile App',
      description: 'The fastest way to delete your account is directly through the app.',
      items: [
        'Open the MS CureChain Patient App on your device.',
        'Navigate to the "Profile" tab from the bottom navigation bar.',
        'Scroll down to the bottom of the profile screen.',
        'Tap on the "Delete Account Permanently" button.',
        'Confirm the deletion in the warning dialog.'
      ]
    },
    {
      title: 'Via Email Request',
      description: 'If you no longer have access to the app, you can request deletion via email.',
      items: [
        'Send an email to support@mscurechain.com from your registered email address.',
        'Use the subject line: "Account Deletion Request - [Your Full Name]".',
        'Include your registered mobile number for verification.',
        'Our support team will process your request after verifying your identity.'
      ]
    },
    {
      title: 'Data Deletion Requests',
      description: 'You can also request the deletion of specific data without closing your account.',
      items: [
        'To delete specific health records, you can use the "Delete" icon next to any entry in the app.',
        'To request a complete wipe of specific data categories (e.g., all BMI history), email support@mscurechain.com.',
        'Include "Data Deletion Request" in the subject line.'
      ]
    }
  ];

  const dataPolicy = [
    {
      label: 'Personal Data',
      status: 'Permanently Deleted',
      details: 'Your name, mobile number, email, and authentication credentials are wiped from our servers.'
    },
    {
      label: 'Health & Clinical Data',
      status: 'Permanently Deleted',
      details: 'All BMI records, vitals, symptoms, and clinical profile data are permanently removed.'
    },
    {
      label: 'Medical Records',
      status: 'Anonymized/Deleted',
      details: 'Prescriptions and lab reports associated with your profile are deleted.'
    },
    {
      label: 'Appointment History',
      status: 'Retained for 30 Days',
      details: 'Historical appointment logs are kept for 30 days for hospital billing and reconciliation purposes, then purged.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-red-100 selection:text-red-700">
      
      {/* Premium Header */}
      <div className="w-full bg-[#dc2626] py-12 px-8 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-10 -mb-10 blur-2xl"></div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-[1.25rem] flex items-center justify-center border border-white/20 shadow-2xl">
                    <UserX className="text-white" size={32} strokeWidth={1.5} />
                </div>
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
                        Account <span className="opacity-60 text-red-100">Deletion</span>
                    </h1>
                    <p className="text-red-100/70 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                        Data Sovereignty & Privacy Controls
                    </p>
                </div>
            </div>
            
            <button 
                onClick={() => router.push('/')}
                className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-all border border-white/10 px-5 py-2.5 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
            </button>
        </div>
      </div>

      {/* Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.02)] border border-slate-100 p-8 md:p-16">
          
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 italic tracking-tight mb-4">Request Account Deletion</h2>
            <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
              We value your privacy. If you choose to delete your account, your personal data and health information will be permanently removed from the MS CureChain platform in accordance with our data retention policy.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Steps Section */}
            <div className="space-y-12">
              {steps.map((step, idx) => (
                <div key={idx} className="relative">
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm not-italic border border-red-100">{idx + 1}</span>
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 px-11">{step.description}</p>
                  <ul className="space-y-4 pl-11">
                    {step.items.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed">
                        <ChevronRight size={16} className="text-red-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Policy & Info Section */}
            <div className="space-y-8">
              <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-red-600" />
                  What happens to your data?
                </h3>
                <div className="space-y-6">
                  {dataPolicy.map((data, i) => (
                    <div key={i} className="border-b border-slate-200/50 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{data.label}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${data.status.includes('Deleted') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {data.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{data.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 p-6 rounded-3xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center">
                  <Clock size={24} className="text-blue-600 mb-3" />
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Processing Time</span>
                  <span className="text-sm font-bold text-blue-700">Within 7 Days</span>
                </div>
                <div className="flex-1 p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                  <Mail size={24} className="text-emerald-600 mb-3" />
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-1">Support Email</span>
                  <span className="text-sm font-bold text-emerald-700">support@mscurechain.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">© 2026 MS Tech Hive Pvt. Ltd</div>
            <div className="flex gap-8">
              <button onClick={() => router.push('/privacy-policy')} className="text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline">Privacy Policy</button>
              <button onClick={() => router.push('/terms-of-service')} className="text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline">Terms of Service</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeleteAccountPage;
