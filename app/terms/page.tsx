'use client';

import React from 'react';
import { ShieldCheck, FileText, CheckCircle, X, ChevronRight, Lock, Globe, Server, AlertCircle, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TermsPage = () => {
  const router = useRouter();

  const sections = [
    {
      id: 's1',
      icon: <FileText size={18} className="text-blue-600" />,
      title: '1. Identification & Services',
      content: 'These Terms & Conditions ("Terms") govern your access to and use of MS CureChain, a hospital management software platform owned and operated by MS Tech Hive Private Limited. By accessing, logging into, or using MS CureChain, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.'
    },
    {
      id: 's2',
      icon: <Scale size={18} className="text-blue-600" />,
      title: '2. Eligibility & Authority',
      content: 'The Software is intended for use by hospitals, clinics, healthcare organizations, and individual patients. You represent and warrant that you are legally authorized to access the Software and are acting within your assigned role. Patient users must be at least 18 years of age or have legal guardian consent.'
    },
    {
      id: 's3',
      icon: <AlertCircle size={18} className="text-blue-600" />,
      title: '3. Scope of Services & Disclaimer',
      content: 'MS CureChain provides technology enablement for healthcare operations, including patient registration, appointment booking, and health record management. MS CureChain is NOT a medical provider and does NOT provide medical advice, diagnosis, or treatment. The clinical quality of consultations rests solely with the healthcare provider.'
    },
    {
      id: 's4',
      icon: <CheckCircle size={18} className="text-blue-600" />,
      title: '4. Appointment Booking & Refunds',
      content: 'Fees paid for appointment booking are eligible for a refund only if the cancellation is made at least 24 hours before the scheduled slot. In case of doctor unavailability or hospital-side cancellation, a full refund will be initiated and credited back within 24-48 hours. No-shows are not eligible for refunds.',
      highlight: true
    },
    {
      id: 's5',
      icon: <Lock size={18} className="text-blue-600" />,
      title: '5. Account Security',
      content: 'You are responsible for maintaining the confidentiality of your login credentials. Any unauthorized access must be reported immediately. MS Tech Hive is not responsible for losses caused by compromised credentials resulting from user negligence.'
    },
    {
      id: 's6',
      icon: <Globe size={18} className="text-blue-600" />,
      title: '6. Intellectual Property',
      content: 'MS CureChain, including all source code, UI designs, workflows, and trademarks, is the exclusive intellectual property of MS Tech Hive Pvt. Ltd. No license is granted except for limited use as defined under these Terms.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-700">
      
      {/* Premium Header */}
      <div className="w-full bg-[#1e40af] py-12 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-[1.25rem] flex items-center justify-center border border-white/20 shadow-2xl">
                    <ShieldCheck className="text-white" size={32} strokeWidth={1.5} />
                </div>
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
                        Legal <span className="opacity-60 text-blue-200">&</span> Terms
                    </h1>
                    <p className="text-blue-100/70 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                        Global Service Protocols v4.2
                    </p>
                </div>
            </div>
            
            <button 
                onClick={() => router.push('/')}
                className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-all border border-white/10 px-5 py-2.5 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm"
            >
                Back to Home <X size={14} className="group-hover:rotate-90 transition-transform" />
            </button>
        </div>

        {/* Backdrop patterns */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />
      </div>

      {/* Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12">
        <div className="bg-white rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.02)] border border-slate-100 p-8 md:p-16">
          <div className="mb-12 border-b border-slate-50 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
              <FileText size={12} /> Service Agreement
            </div>
            <h2 className="text-3xl font-black text-slate-900 italic tracking-tight">Terms of Conditions</h2>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed max-w-2xl text-sm italic">
              Last Updated: April 23, 2026. These terms apply to all users of the MS CureChain ecosystem including healthcare providers and patients.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.id} className={`relative pl-14 p-6 rounded-3xl transition-all ${section.highlight ? 'bg-blue-50/50 border border-blue-100 shadow-sm' : ''}`}>
                <div className={`absolute left-4 top-6 w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${section.highlight ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-blue-600'}`}>
                  {section.icon}
                </div>
                <h3 className={`text-lg font-black uppercase italic tracking-tight mb-3 ${section.highlight ? 'text-blue-900' : 'text-slate-900'}`}>
                  {section.title}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed antialiased text-sm">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Footer Statement */}
          <div className="mt-20 pt-10 border-t border-slate-50 text-center">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] italic mb-6">
              MS Tech Hive Pvt. Ltd Â· Legal Department
            </p>
            <div className="flex justify-center gap-8">
              <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Governing Law: India</div>
              <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Version: 2026.04.1</div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action */}
      <div className="p-8 text-center bg-white border-t border-slate-100">
        <p className="text-xs font-medium text-slate-500 mb-4 italic">
          Want to know how we protect your data?
        </p>
        <button 
          onClick={() => router.push('/privacy')}
          className="inline-flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:text-blue-800 transition-colors"
        >
          Read our Privacy Policy <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default TermsPage;
