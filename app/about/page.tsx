'use client';

import React, { useState, useEffect } from "react";
import {
    User,
    Stethoscope,
    Building2,
    Beaker,
    Pill,
    Truck,
    Headset,
    Users,
    FileText,
    CheckCircle2,
    Lock,
    ArrowRight,
    Sun,
    Moon,
    Smartphone,
    ShieldCheck,
    Layers,
    Network
} from "lucide-react";
import { useRouter } from "next/navigation";
import Footer from "@/components/footer/Footer";
import LandingNavbar from "@/components/navbar/LandingNavbar";

// Definitive metadata with verified Unsplash IDs to prevent broken images
const modulesSummary = [
    {
        title: "Patient Portal",
        slug: "patient-portal",
        icon: User,
        image: "../assets/paportal.avif",
        desc: "Complete health dashboard for patients to manage appointments and reports."
    },
    {
        title: "Doctor Terminal",
        slug: "doctor-terminal",
        icon: Stethoscope,
        image: "../assets/doc3.jpg",
        desc: "Professional consultation interface for medical staff to manage clinical care."
    },
    {
        title: "Hospital Admin",
        slug: "hospital-admin",
        icon: Building2,
        image: "../assets/admin1.jpg",
        desc: "Main command center for hospital operations, finances, and oversight."
    },
    {
        title: "Lab & Diagnostics",
        slug: "lab-diagnostics",
        icon: Beaker,
        image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=600&auto=format&fit=crop",
        desc: "Precision sample tracking and automated digital report generation."
    },
    {
        title: "Pharmacy POS",
        slug: "pharmacy-pos",
        icon: Pill,
        image: "https://images.unsplash.com/photo-1547489432-cf93fa6c71ee?q=80&w=600&auto=format&fit=crop",
        desc: "Intelligent inventory and medication dispensing system."
    },
    {
        title: "Emergency Care",
        slug: "emergency-ems",
        icon: Truck,
        image: "../assets/eme.png",
        desc: "Rapid response and trauma management for critical emergency cases."
    },
    {
        title: "Reception Desk",
        slug: "helpdesk-reception",
        icon: Headset,
        image: "../assets/repction.jpeg",
        desc: "Registration, onboarding, and routing patients across departments."
    },
    {
        title: "Staff Portal",
        slug: "staff-portal",
        icon: Users,
        image: "../assets/staff.avif",
        desc: "Self-service management for non-clinical hospital employees."
    },
    {
        title: "Discharge Center",
        slug: "discharge-center",
        icon: FileText,
        image: "../assets/dis.jpeg",
        desc: "Streamlined exit protocols and final medical summary generation."
    }
];

function AboutPage() {
    const router = useRouter();

    // Theme logic removed - handled by LandingNavbar

    return (
        <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100">
            <LandingNavbar variant="about" />

            {/* Simple Hero */}
            <section className="pt-40 pb-20 px-6 text-center bg-slate-50 border-b border-slate-100">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                        Clinical Flow. <br />
                        <span className="text-blue-600">Perfectly Synced.</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                        A clinical ecosystem designed to be professional, fast, and easy to use.
                        Explore how MSCureChain connects doctors and patients.
                    </p>
                </div>
            </section>

            {/* Simple Architecture Grid */}
            <section id="architecture" className="py-24 px-6 border-b border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-20 items-center">
                        <div className="space-y-8">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">01. How We Work</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-normal">
                                MSCureChain uses a **Singular Data Source** model. This means that instead of every department having its own computer system, everyone works on one unified platform.
                            </p>
                            <div className="space-y-6">
                                <FeatureLine icon={Layers} title="Unified Ledger" text="All medical records are stored in one safe, synchronized place for every branch." />
                                <FeatureLine icon={Network} title="Instant Relay" text="Reports and prescriptions reach you as soon as they are signed by the clinician." />
                                <FeatureLine icon={ShieldCheck} title="AES-256 Security" text="Your data is protected by enterprise-grade clinical encryption standards." />
                            </div>
                        </div>
                        <div className="rounded-[0.5rem] overflow-hidden shadow-2xl border border-slate-100 bg-slate-50">
                            <img src="../assets/about.png" alt="Hospital Technology" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Simple Login Section */}
            <section id="login" className="py-24 px-6 bg-slate-50 border-b border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900">02.Unified Access Points</h2>
                        <p className="text-slate-500 font-medium">Two simple ways to access your healthcare dashboard.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-10 rounded-[0.5rem] border border-slate-100 shadow-sm hover:border-blue-500 group">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110">
                                <Smartphone size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-4 text-slate-900 uppercase tracking-tight">Patient Entry</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed font-medium">Simple and secure. Log in with your registered mobile number and get an instant OTP code sent to your phone.</p>
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-4">Features:</label>
                            <ul className="space-y-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-green-500" /> Password-free login</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-green-500" /> Instant health history</li>
                            </ul>
                        </div>
                        <div className="bg-white p-10 rounded-[0.5rem] border border-slate-100 shadow-sm hover:border-blue-500 group">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110">
                                <Lock size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-4 text-slate-900 uppercase tracking-tight">Clinical Entry</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed font-medium">Log in with your unique DocID or StaffID provided by the hospital admin along with your secure password.</p>
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-4">Features:</label>
                            <ul className="space-y-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-blue-500" /> Multi-Role dashboard</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-blue-500" /> Audit-ready logging</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Resusable Module Cards Section */}
            <section id="portals" className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16 text-center space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">03. Support Portals</h2>
                        <p className="text-slate-500 font-medium">Select a module to view its specific clinical capabilities.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {modulesSummary.map((item, idx) => (
                            <ModulePreviewCard key={idx} item={item} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 px-6 bg-slate-950 text-white text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl font-bold leading-tight tracking-tight">Modernizing Healthcare, One Hospital at a Time.</h2>
                    <p className="text-slate-400 text-lg font-medium">Join thousands of clinical professionals on the MSCureChain ecosystem.</p>
                    <button onClick={() => router.push('/auth/login')} className="bg-blue-600 text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20">
                        Enter Platform
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}

const FeatureLine = ({ icon: Icon, title, text }: { icon: any, title: string, text: string }) => (
    <div className="flex gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white">
            <Icon size={20} />
        </div>
        <div>
            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-1">{title}</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{text}</p>
        </div>
    </div>
);

const ModulePreviewCard = ({ item }: { item: any }) => {
    const router = useRouter();
    const Icon = item.icon;
    return (
        <div
            onClick={() => router.push(`/about/${item.slug}`)}
            className="group cursor-pointer bg-white rounded-[0.5rem] border border-slate-100 hover:border-blue-600 shadow-sm overflow-hidden flex flex-col"
        >
            <div className="aspect-16/10 overflow-hidden relative border-b border-slate-100 bg-slate-50">
                <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 grayscale-[0.2] group-hover:grayscale-0"
                    onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1519494140681-8917ad18a0c2?q=80&w=600&auto=format&fit=crop";
                    }}
                />
            </div>
            <div className="p-8 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white">
                        <Icon size={18} />
                    </div>
                    <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium flex-1">{item.desc}</p>
                <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1">
                    Portal Details <ArrowRight size={14} />
                </div>
            </div>
        </div>
    );
}

export default React.memo(AboutPage);
