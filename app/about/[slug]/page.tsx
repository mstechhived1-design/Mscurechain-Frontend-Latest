'use client';

import React, { useEffect } from "react";
import LandingNavbar from "@/components/navbar/LandingNavbar";
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
    ArrowLeft,
    ArrowRightCircle,
    ShieldCheck,
    Activity,
    HeartPulse
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Footer from "@/components/footer/Footer";
import modulesData from "./featuresdata.json";

// Icon mapping to resolve strings from JSON
const iconMap = {
    User,
    Stethoscope,
    Building2,
    Beaker,
    Pill,
    Truck,
    Headset,
    Users,
    FileText,
    HeartPulse
};

function ModuleDetailPage() {
    const router = useRouter();
    const params = useParams() as any;
    const slug = params.slug as string;

    const activeModule = modulesData[slug as keyof typeof modulesData];

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }, []);

    if (!activeModule) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold">Module Not Found</h1>
                    <button onClick={() => router.push('/about')} className="text-blue-600 flex items-center gap-2 mx-auto">
                        <ArrowLeft size={18} /> Back to About
                    </button>
                </div>
            </div>
        );
    }

    const Icon = iconMap[activeModule.icon as keyof typeof iconMap] || Activity;

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans">
            <LandingNavbar variant="detail" title={activeModule.title} />

            {/* Header / Hero */}
            <header className="pt-32 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                    
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                                {activeModule.title}
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                                {activeModule.shortDesc} Access this portal using your <strong>{activeModule.loginWith}</strong>.
                            </p>
                            <div className="flex flex-col gap-4">
                                <button onClick={() => router.push('/auth/login')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-bold text-center">
                                    Login to {activeModule.title}
                                </button>
                                <p className="text-xs text-slate-400 text-center">Protected by MSCureChain Secure Session Logic</p>
                            </div>
                        </div>
                        <div className="rounded-[0.8rem] overflow-hidden shadow-2xl border dark:border-slate-800 aspect-video md:aspect-square">
                            <img src={activeModule.image} alt={activeModule.title} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Detailed Sections */}
            <main className="pb-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-slate-900 dark:text-white">
                        <CheckCircle2 className="text-blue-600" /> Key Features & Capabilities
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-16 text-lg">
                        Comprehensive tools and features designed to streamline your healthcare experience.
                    </p>

                    <div className="space-y-24">
                        {activeModule.sections.map((section: any, idx: number) => {
                            const renderReferenceFeatures = (features?: string[], color: string = "text-blue-600") => {
                                if (!features || features.length === 0) return null;
                                return (
                                    <div className="mt-8 space-y-4">
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Features:</h4>
                                        <div className="space-y-6">
                                            {features.map((feature: string, fIdx: number) => (
                                                <div key={fIdx} className="flex items-start gap-4 group">
                                                    <ArrowRightCircle className={`${color} shrink-0 mt-1 group-hover:scale-110`} size={24} />
                                                    <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                        {feature}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            };

                            const SideBySideLayout = ({ section, isReversed, iconColor = "text-emerald-500" }: { section: any, isReversed?: boolean, iconColor?: string }) => (
                                <div className="grid md:grid-cols-2 gap-16 items-center py-8">
                                    <div className={`space-y-8 ${isReversed ? 'md:order-2' : ''}`}>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                            {idx + 1}. {section.title}
                                        </h3>
                                        <div className="space-y-6">
                                            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {section.text}
                                            </p>
                                        </div>
                                        {renderReferenceFeatures(section.features?.slice(0, 4), iconColor)}
                                    </div>
                                    <div className={`relative group ${isReversed ? 'md:order-1' : ''}`}>
                                        <div className="absolute -inset-4 bg-emerald-600/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100" />
                                        <div className="relative rounded-[1.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 aspect-video md:aspect-square">
                                            <img
                                                src={section.image || activeModule.image}
                                                alt={section.title}
                                                className="w-full h-full object-cover transform group-hover:scale-110"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );

                            if (idx === 0 || idx === 2) {
                                // 1 & 3:
                                return (
                                    <div key={idx} className="max-w-4xl border-b border-slate-100 dark:border-slate-800 pb-20 last:border-0">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">
                                            {idx + 1}. {section.title}
                                        </h3>
                                        <div className="space-y-6 mb-10">
                                            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {section.text}
                                            </p>

                                        </div>
                                        {renderReferenceFeatures(section.features?.slice(0, 4))}
                                    </div>
                                );
                            }

                            if (idx === 1 || idx === 3) {
                                // 2 & 4
                                return (
                                    <SideBySideLayout
                                        key={idx}
                                        section={section}
                                        isReversed={idx === 1} //  points 2 and 4
                                    />
                                );
                            }

                            // Default fallback
                            return (
                                <div key={idx} className="border-t border-slate-100 dark:border-slate-800 pt-12">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                        {idx + 1}. {section.title}
                                    </h3>
                                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {section.text}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Simple Bottom Tip */}
                    <div className="mt-20 p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="text-blue-600" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-lg">Integrated Medical Support</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                This module is part of the larger MSCureChain ecosystem. Every action you take here is automatically reflected across all other departments, ensuring a smooth and error-free patient experience.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default React.memo(ModuleDetailPage);
