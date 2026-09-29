'use client';

import React, { useState, useEffect } from "react";
import {
    Users,
    Stethoscope,
    Building2,
    Beaker,
    Pill,
    ShieldCheck,
    Zap,
    ChevronRight,
    ArrowRight,
    CheckCircle2,
    HeartPulse
} from "lucide-react";
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ProgressBar from "@/components/ui/ProgressBar";

function PortalsPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [hasAgreed, setHasAgreed] = useState(false);

    useEffect(() => {
        const agreed = localStorage.getItem('mscurechain_terms_accepted');
        if (agreed === 'true') {
            setHasAgreed(true);
        }
    }, []);

    const handleProtectedClick = (path: string) => {
        if (hasAgreed) {
            startTransition(() => {
                router.push(path);
            });
        } else {
            // Store the intended portal URL so TermsSection can redirect back after acceptance
            sessionStorage.setItem('mscurechain_pending_portal', path);
            startTransition(() => {
                // Use ?scrollTo=terms param (not hash) so browser won't auto-jump,
                // allowing the landing page to do its own smooth animated scroll
                router.push('/?scrollTo=terms');
            });
        }
    };
    // Theme logic removed - handled by LandingNavbar
    const portals = [
        {
            title: "Helpdesk Portal",
            slug: "helpdesk-reception",
            icon: ShieldCheck,
            desc: "Ultimate governance and security for the entire clinical network.",
            features: ["patient Registration ", "Appointment Booking", "OPD payments ", "Appointment tracking "],
            color: "text-slate-900",
            bg: "bg-slate-100",
            loginUrl: "/auth/login"
        },
        {
            title: "Patient Portal",
            slug: "patient-portal",
            icon: Users,
            desc: "Empowering patients with self-service tools for a streamlined healthcare journey.",
            features: ["View  Appointments", "Lab Report History", "Digital Prescriptions", "Medication History", "Medication History"],
            color: "text-blue-600",
            bg: "bg-blue-50",
            loginUrl: "/auth/login"
        },
        {
            title: "Doctor Portal",
            slug: "doctor-terminal",
            icon: Stethoscope,
            desc: "A clinical command center designed for maximum consultation efficiency.",
            features: ["Smart Patient Queues", "One-Click Consultations", "AI-Suggested Diagnoses", "Digital Prescription Engine", "Patient Clinical History"],
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            loginUrl: "/auth/login"
        },
        {
            title: "Hospital Admin Portal",
            slug: "hospital-admin",
            icon: Building2,
            desc: "Complete operational control over every department and resource.",
            features: ["Staff & Role Management", "Real-time Hospital Analytics", "OPD/IPD Operations", "Centralized Billing Control", ""],
            color: "text-purple-600",
            bg: "bg-purple-50",
            loginUrl: "/auth/login"
        },
        {
            title: "Radiology Portal",
            slug: "radiology-imaging",
            icon: HeartPulse,
            desc: "Advanced imaging and diagnostics management (RIS/PACS integration).",
            features: ["DICOM Image Viewer", "Modality Worklist (MWL)", "Radiology Reporting", "Scan Scheduling"],
            color: "text-cyan-600",
            bg: "bg-cyan-50",
            loginUrl: "/radiology/login"
        },
        {
            title: "Lab Portal",
            slug: "lab-diagnostics",
            icon: Beaker,
            desc: "Precision management for diagnostic workflows and laboratory results.",
            features: ["Manage Test Requests", "Sample Collection Tracking", "Result Analysis Tools", "Automated Report Generation", "Instant Result Notifications"],
            color: "text-rose-600",
            bg: "bg-rose-50",
            loginUrl: "/lab/login"
        },
        {
            title: "Pharmacy Portal",
            slug: "pharmacy-pos",
            icon: Pill,
            desc: "Modernizing medication dispensing and inventory logistics.",
            features: ["Supplier & Batch Management", "Real-time Stock Tracking", "Automated Inventory Alerts", "Point of Sale (POS) Billing", "Supplier & Batch Management"],
            color: "text-amber-600",
            bg: "bg-amber-50",
            loginUrl: "/pharmacy/login"
        },
        {
            title: "HR Portal",
            slug: "hr-management",
            icon: Users,
            desc: "Manage hospital staff, payroll, attendance, and recruitment efficiently.",
            features: ["Staff Management", "Payroll & Attendance", "Recruitment", "Leave Approvals", "Performance Reviews"],
            color: "text-slate-900",
            bg: "bg-slate-100",
            loginUrl: "/hr/login"
        },
        {
            title: "Emergency Portal",
            slug: "emergency-ems",
            icon: ShieldCheck,
            desc: "Ultimate governance and security for the entire clinical network.",
            features: ["Critical care documentation", " Incident Logging", "Live Trauma Feed", "Discharge Instructions", "Discharge Instructions"],
            color: "text-slate-900",
            bg: "bg-slate-100",
            loginUrl: "/emergency/login"
        },
        {
            title: "Nurse Portal",
            slug: "nurse-portal",
            icon: HeartPulse,
            desc: "Real-time nursing dashboard for vitals monitoring, MAR, and ward management.",
            features: ["Medication Administration (MAR)", "Patient Vitals Monitoring", "Nursing Task Queue", "Ward & Bed Management"],
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            loginUrl: "/nurse/login"
        },
        {
            title: "Staff Portal",
            slug: "staff-portal",
            icon: Users,
            desc: "Comprehensive staff management, attendance tracking, and internal communication hub.",
            features: ["Staff Attendance Tracking", "Shift Management", "Internal Messaging System", "Performance Analytics"],
            color: "text-amber-600",
            bg: "bg-amber-50",
            loginUrl: "/auth/login"
        },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <ProgressBar isPending={isPending} color="primary-theme" />
            <LandingNavbar variant="home" />

            {/* Hero Section */}
            <header className="pt-32 pb-20 px-6 bg-muted/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-5 pointer-events-none" />
                <div className="max-w-7xl mx-auto text-center space-y-8 relative">

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter uppercase">
                        One Platform. <br />
                        <span className="text-primary-theme">Infinite Sync.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
                        MSCureChain isn&apos;t just software—it&apos;s a connected clinical universe. Every portal works in perfect harmony, ensuring that data flows instantly from the patient to the doctor, lab, pharmacy, and admin.
                    </p>
                </div>
            </header>

            {/* Portals Grid */}
            <main className="flex-grow py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {portals.map((portal, idx) => {
                            const Icon = portal.icon;
                            return (
                                <div key={idx} className="group flex flex-col bg-white border border-slate-200 rounded-[1.5rem] shadow-sm hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                    
                                    {/* Thematic Header Area */}
                                    <div className={`p-6 sm:p-8 ${portal.bg} border-b border-black/5 relative`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`w-14 h-14 bg-white rounded-[1rem] flex items-center justify-center ${portal.color} shadow-sm border border-black/5`}>
                                                <Icon size={26} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                                            {portal.title}
                                        </h3>
                                    </div>

                                    {/* Content & Action Area */}
                                    <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between bg-white">
                                        <div>
                                            <p className="text-slate-600 text-[15px] font-medium leading-relaxed mb-6">
                                                {portal.desc}
                                            </p>
                                            
                                            <div className="space-y-4">
                                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Capabilities
                                                </div>
                                                <div className="space-y-3">
                                                    {portal.features.slice(0, 3).map((feature, fIdx) => (
                                                        <div key={fIdx} className="flex items-start gap-3">
                                                            <CheckCircle2 size={16} className={`shrink-0 ${portal.color} mt-0.5`} />
                                                            <span className="text-[14px] font-medium text-slate-700 leading-snug">
                                                                {feature}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {portal.features.length > 3 && (
                                                        <button
                                                            onClick={() => handleProtectedClick(`/about/${portal.slug}`)}
                                                            className={`mt-2 ${portal.color} text-[13px] font-bold hover:underline flex items-center gap-1.5 group/link`}
                                                        >
                                                            See all features <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <button
                                                onClick={() => handleProtectedClick(portal.loginUrl || '/auth/login')}
                                                className="relative w-full py-3 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 rounded-[1rem] font-bold text-[14px] flex items-center justify-between px-5 group/btn transition-all duration-500 shadow-sm hover:shadow-md active:scale-95 overflow-hidden"
                                            >
                                                {/* Gentle hover backdrop */}
                                                <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                                
                                                <span className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1">
                                                    Enter Portal
                                                </span>
                                                
                                                {/* Animated Circle Container */}
                                                <div className={`relative z-10 w-8 h-8 rounded-full ${portal.bg} flex items-center justify-center transition-all duration-300 group-hover/btn:w-10 group-hover/btn:shadow-sm border border-transparent group-hover/btn:bg-white group-hover/btn:border-slate-200 overflow-hidden`}>
                                                    {/* Incoming Arrow */}
                                                    <ArrowRight size={16} className={`absolute ${portal.color} -translate-x-6 opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100 transition-all duration-300 ease-out`} />
                                                    
                                                    {/* Outgoing Chevron */}
                                                    <ChevronRight size={16} className={`absolute ${portal.color} translate-x-0 opacity-100 group-hover/btn:translate-x-6 group-hover/btn:opacity-0 transition-all duration-300 ease-out`} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                    {/* Clinical Unified Workspace Section */}
                    <section className="mt-32 p-12 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-border shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-linear-to-br from-primary-theme/5 to-transparent opacity-50 pointer-events-none" />

                        <div className="relative grid lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-theme/10 text-primary-theme rounded-full text-xs font-bold uppercase tracking-widest">
                                    <Zap size={14} /> Unified Architecture
                                </div>
                                <h2 className="text-4xl font-black tracking-tight leading-tight uppercase text-slate-900">
                                    A Complete <br />
                                    <span className="text-primary-theme">Clinical Universe.</span>
                                </h2>
                                <p className="text-slate-500 text-lg leading-relaxed font-medium">
                                    Experience the power of a fully synchronized healthcare ecosystem. From the moment a patient registers at the helpdesk to the final pharmacy dispensing, every action is tracked, secured, and instantly shared across all relevant portals.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Instant cross-portal data synchronization",
                                        "Unified patient medical history access",
                                        "Automated departmental handovers",
                                        "Real-time operational transparency"
                                    ].map((text, i) => (
                                        <li key={i} className="flex items-center gap-3 font-bold uppercase text-xs tracking-widest text-slate-600">
                                            <CheckCircle2 size={16} className="text-primary-theme" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="relative group/image">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary-theme/20 to-blue-500/20 rounded-[2rem] blur opacity-25 group-hover/image:opacity-40 transition"></div>
                                <div className="relative rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-2xl bg-white aspect-[4/3] flex items-center justify-center p-4">
                                    <img
                                        src="/assets/portal.png"
                                        alt="Portal Ecosystem Overview"
                                        className="w-full h-full object-contain transform group-hover/image:scale-[1.03]"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default React.memo(PortalsPage);
