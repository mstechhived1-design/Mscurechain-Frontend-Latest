'use client';

import React, { useState, useEffect } from "react";
import {
    Zap,
    ChevronRight,
    Lock,
    Globe,
    Cpu,
    Microscope,
    HeartPulse,
    BedDouble,
    Brain
} from "lucide-react";
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { useRouter } from "next/navigation";

function FeaturesPage() {
    const router = useRouter();

    // Theme logic removed - handled by LandingNavbar

    const mainFeatures = [
        {
            icon: Zap,
            title: "Unified Hospital Operations",
            desc: "Centralized control of OPD, IPD, billing, pharmacy, lab, and administration workflows from a single platform.",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            icon: Lock,
            title: "Secure Medical Records",
            desc: "Patient records are securely stored with tamper-proof access control, ensuring data privacy and compliance.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            icon: Cpu,
            title: "Automated Clinical Workflows",
            desc: "Automates patient registration, appointments, prescriptions, discharge summaries, and billing processes.",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            icon: Globe,
            title: "Multi-Portal Access",
            desc: "Seamless access for patients, doctors, labs, pharmacies, and administrators across web and mobile devices.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            icon: Microscope,
            title: "Integrated Lab & Pharmacy",
            desc: "End-to-end lab test management and pharmacy dispensing fully connected with doctor prescriptions.",
            color: "text-rose-500",
            bg: "bg-rose-500/10"
        },
        {
            icon: HeartPulse,
            title: "Hospital Analytics & Insights",
            desc: "Real-time dashboards for patient flow, bed occupancy, revenue tracking, and operational performance.",
            color: "text-cyan-500",
            bg: "bg-cyan-500/10"
        }
        ,
        {
            icon: BedDouble,
            title: "Patient Bed Management",
            desc: "Smart allocation of rooms and beds for admissions, surgeries, and recovery with real-time availability tracking.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        }, {
            icon: Brain,
            title: "AI Prescription",
            desc: "AI-assisted prescriptions based on patient history, diagnosis, and lab results to reduce errors and improve care.",
            color: "text-violet-500",
            bg: "bg-violet-500/10"
        }

    ];


    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <LandingNavbar variant="home" />

            {/* Hero Section */}
            <header className="pt-32 pb-20 px-6 relative overflow-hidden bg-muted/5">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-primary-theme/5 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">

                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                                Advanced Healthcare <br />
                                <span className="text-primary-theme">Redefined.</span>
                            </h1>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed">
                                MSCureChain combines next-generation AI with robust blockchain security to create the most advanced hospital management ecosystem available today.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button onClick={() => router.push('/auth/login')} className="bg-primary-theme hover:bg-primary-theme/90 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-primary-theme/25 hover:-translate-y-1">
                                    Get Started Now
                                </button>
                                <button className="bg-card border border-border hover:bg-muted/10 text-foreground px-8 py-4 rounded-2xl font-bold shadow-lg hover:-translate-y-1">
                                    View Documentation
                                </button>
                            </div>
                        </div>

                        <div className="relative group lg:mt-0 mt-12">

                            <div className="relative  rounded-[0.5rem] overflow-hidden  shadow-2xl bg-white aspect-[4/3] flex items-center justify-center p-8">
                                <img
                                    src="/assets/lan5.png"
                                    alt="Platform Showcase"
                                    className="w-full h-full  object-contain hover:scale-[1.05]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Feature Grid */}
            <main className="flex-grow py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {mainFeatures.map((feature, idx) => (
                            <div key={idx} className="group p-8 bg-card border rounded-[1rem] border-primary-theme/50 shadow-sm hover:shadow-2xl hoverShadow-primary-theme/5 cursor-default">
                                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110`}>
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight uppercase">{feature.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    {feature.desc}
                                </p>
                                <div className="pt-6 mt-6 border-t border-border/50 opacity-0 group-hover:opacity-100">
                                    <span className="text-primary-theme text-sm font-bold flex items-center gap-2">
                                        Learn more <ChevronRight size={16} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Secondary Highlight Section */}
                    <div className="mt-32 p-12 bg-slate-900 rounded-[0.5rem] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-10 pointer-events-none" />
                        <div className="absolute inset-0 bg-linear-to-br from-primary-theme/20 to-transparent opacity-0 group-hover:opacity-100" />

                        <div className="relative grid lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8 text-white">
                                <h2 className="text-4xl font-black tracking-tight leading-tight uppercase">Built for the future of <br /> clinical excellence.</h2>
                                <p className="text-slate-400 text-lg leading-relaxed font-medium">
                                    Our multi-role support system ensures that every department in your hospital is connected, synchronized, and optimized for maximum patient care.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Real-time resource allocation",
                                        "Integrated financial accounting",
                                        "Automated regulatory compliance",

                                    ].map((text, i) => (
                                        <li key={i} className="flex items-center gap-3 font-bold uppercase text-xs tracking-widest text-primary-theme">
                                            <div className="w-2 h-2 rounded-full bg-primary-theme shadow-lg shadow-primary-theme" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="relative">
                                <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-3xl">
                                    <img src="/assets/piechart.png" alt="Clinical Interface" className="w-full h-full object-cover" />
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 6s-out infinite;
                }
            `}</style>
        </div>
    );
}

export default React.memo(FeaturesPage);
