'use client';

import React, { useEffect } from "react";
import {
    Heart,
    Activity,
    ShieldCheck,
    Zap,
    TrendingUp,
    Users,
    ArrowRight,
    Command,
    Globe,
    CheckCircle2,
    Brain
} from "lucide-react";
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { useRouter } from "next/navigation";

function SolutionsPage() {
    const router = useRouter();

    // Theme logic removed - handled by LandingNavbar

    const services = [
        {
            title: "Integrated Care Delivery",
            icon: Heart,
            desc: "Ensures seamless coordination between departments by connecting patient data, clinical workflows, and care teams throughout the complete treatment lifecycle.",
            benefits: [
                "Single longitudinal patient record",
                "Cross-department care coordination",
                "Patient-facing digital health access"
            ]
        },
        {
            title: "Clinical Operational Excellence",
            icon: Command,
            desc: "Streamlines day-to-day hospital operations by automating clinical and administrative tasks to improve efficiency and reduce turnaround time.",
            benefits: [
                "OPD and IPD workflow automation",
                "Doctor and staff productivity tracking",
                "Consistent clinical documentation standards"
            ]
        },
        {
            title: "Emergency & Critical Care Sync",
            icon: ShieldCheck,
            desc: "Supports emergency and critical care teams with real-time information, rapid triage tools, and instant access to patient and resource data.",
            benefits: [
                "Priority-based emergency triage",
                "Live bed and ICU availability",
                "Faster emergency admissions and transfers"
            ]
        },
        {
            title: "Enterprise Governance",
            icon: Globe,
            desc: "Provides centralized administrative oversight across hospitals and clinics with secure controls, analytics, and compliance management.",
            benefits: [
                "Hospital-wide billing and revenue control",
                "Role-based access and staff governance",
                "Audit-ready compliance and reporting",
                 "Centralized policy and workflow management",
        "Real-time operational analytics and insights"
            ]
        },
        {
    title: "AI-Powered Prescriptions",
    icon: Brain,
    desc: "Doctors generate AI-assisted prescriptions while patients can access self-prescription guidance, all securely stored as digital medical records.",
    benefits: [
        "Doctor-approved AI prescription generation",
        "Self-prescription support with safety checks",
        "Centralized digital prescription records",
        "Instant access across all connected portals",
        "Patient discharage flow connectivity"
    ]
},
        {
    title: "MScureChain Unified Healthcare",
    icon: Activity,
    desc: "An AI-driven healthcare platform connecting all medical portals to deliver faster care and fully digital workflows.",
    benefits: [
        
        "Digital medical records with real-time access",
        "Interconnected patient, doctor, lab, pharmacy, and admin portals",
        "Reduced treatment and processing time",
        "Seamless end-to-end care coordination"
    ]
}
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <LandingNavbar variant="home" />

            {/* Hero Section */}
            <header className="pt-32 pb-24 px-6 relative overflow-hidden bg-slate-50 dark:bg-slate-900/10">
                <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-5 pointer-events-none" />
                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter uppercase">
                                Empowering <br />
                                <span className="text-primary-theme">Modern Healthcare.</span>
                            </h1>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed">
                                MSCureChain provides a unified digital infrastructure that transforms hospital operations. We replace fragmented systems with a single, intelligent solution designed for clinical efficiency, patient safety, and operational growth.
                            </p>
                        </div>

                        <div className="relative group hidden lg:block">
                            <div className="absolute -inset-4 bg-primary-theme/10 blur-3xl rounded-[0.5rem] opacity-50 group-hover:opacity-75" />
                            <div className="relative rounded-[0.5rem] overflow-hidden border border-border-primary/40 shadow-2xl ">
                                <img
                                    src="/assets/health.png"
                                    alt="Healthcare Solutions"
                                    className="w-full h-auto object-cover transform group-hover:scale-105"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Services Grid */}
            <main className="flex-grow py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Solution Overview */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">The Core of Our Service</h2>
                            <p className="text-[18px] text-slate-500 font-medium leading-relaxed">
                                Our platform is built on the belief that healthcare data should never be in silos. By integrating every touchpoint—from pharmacy to the operating room—we provide a 360-degree view of hospital operations.
                            </p>
                            <ul className="space-y-3 pt-2">
                                {[
                                    "Real-time data synchronization across all departments",
                                    "Interoperable clinical modules with AI assistance",
                                    "Transparent financial and administrative governance"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[17px] font-bold text-slate-700">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: "Safety First", icon: ShieldCheck, color: "text-blue-500" },
                                { label: "High Efficiency", icon: Zap, color: "text-amber-500" },
                                { label: "Data Driven", icon: TrendingUp, color: "text-primary-theme" },
                                { label: "Patient Centric", icon: Users, color: "text-rose-500" }
                            ].map((feature, i) => (
                                <div key={i} className="p-6 bg-card border border-border rounded-xl hover:shadow-lg group text-center">
                                    <feature.icon size={24} className={`${feature.color} mb-3 mx-auto group-hover:scale-110`} />
                                    <div className="font-black text-slate-900 uppercase text-[10px] tracking-wider">{feature.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Services Grid */}
                    <div className="space-y-10">
                        <div className="text-center space-y-3 max-w-2xl mx-auto">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Our Integrated Ecosystem</h2>
                            <p className="text-sm text-slate-500 font-medium">Four core pillars that drive our healthcare transformation platform.</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map((service, idx) => (
                                <div key={idx} className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-primary-theme/30 flex flex-col justify-between shadow-sm">
                                    <div>
                                        <div className="w-12 h-12 bg-primary-theme/10 rounded-xl flex items-center justify-center text-primary-theme mb-6">
                                            <service.icon size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight">{service.title}</h3>
                                        <p className="text-[18px] text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                                            {service.desc}
                                        </p>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100">
                                        <div className="space-y-3">
                                            {service.benefits.map((benefit, bIdx) => (
                                                <div key={bIdx} className="flex items-center gap-2 text-[15px] font-bold text-slate-600">
                                                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                                    </div>
                                                    {benefit}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* CTA Section */}
            <section className="py-24 px-6 bg-slate-900 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-primary-theme/20 to-transparent" />
                <div className="max-w-4xl mx-auto relative space-y-8">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                        Ready to Join the <br />
                        <span className="text-primary-theme">Digital Frontier?</span>
                    </h2>
                    <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto">
                        Experience how MSCureChain can revolutionize your clinical outcomes and operational efficiency.
                    </p>
                    <div className="pt-8">
                        <button
                            onClick={() => router.push('/pricing')}
                            className="bg-primary-theme hover:bg-primary-theme/90 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary-theme/30 hover:-translate-y-1 active:scale-95 flex items-center gap-3 mx-auto"
                        >
                            View Pricing Plan <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default React.memo(SolutionsPage);
