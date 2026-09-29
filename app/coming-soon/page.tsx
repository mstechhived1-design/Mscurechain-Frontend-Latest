'use client';

import React from 'react';
import LandingNavbar from '@/components/navbar/LandingNavbar';
import Footer from '@/components/footer/Footer';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Sparkles,
    Brain,
    HeartPulse,
    ShieldPlus,
    CloudLightning
} from 'lucide-react';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

const comingSoonFeatures = [
    {
        icon: Brain,
        title: 'AI Diagnostics',
        desc: 'Advanced machine learning models for early disease detection and diagnostic assistance.'
    },
    {
        icon: HeartPulse,
        title: 'Wearable Integration',
        desc: 'Connecting seamlessly with smartwatches and health bands for real-time patient monitoring.'
    },
    {
        icon: ShieldPlus,
        title: 'Blockchain Security',
        desc: 'Enhanced data protection and smart contracts for clinical trials and insurance claims.'
    },
    {
        icon: CloudLightning,
        title: 'Remote Consultations',
        desc: 'Low-latency, high-definition tele-health platform with integrated clinical tools.'
    }
];

function ComingSoonPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <LandingNavbar />

            <main className="flex-grow relative overflow-hidden flex flex-col items-center justify-center py-20 px-6">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-theme/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-4xl w-full relative z-10 space-y-12">
                    {/* Header */}
                    <ScrollReveal distance="40px" duration={1000}>
                        <div className="text-center space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-theme/5 border border-primary-theme/20 text-primary-theme text-xs font-bold uppercase tracking-widest shadow-sm">
                                <Sparkles size={14} />
                                Coming Soon
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter leading-none uppercase">
                                Building the <br />
                                <span className="text-primary-theme">Future of Care</span>
                            </h1>

                            <p className={`text-2xl md:text-3xl font-medium ${dancingScript.className} text-muted`}>
                                We're crafting the next generation of healthcare modules...
                            </p>
                        </div>
                    </ScrollReveal>

                    {/* Feature Preview Grid */}
                    <ScrollReveal distance="60px" duration={1200} delay={200}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {comingSoonFeatures.map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="p-8 rounded-[1.5rem] bg-card/50 backdrop-blur-md border border-border-theme hover:border-primary-theme/30 group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary-theme/10 text-primary-theme flex items-center justify-center mb-6 group-hover:scale-110">
                                        <feature.icon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2 uppercase tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted text-sm leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>

                    {/* Action Button */}
                    <ScrollReveal distance="30px" duration={1000} delay={400}>
                        <div className="text-center pt-8">
                            <button
                                onClick={() => router.push('/')}
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm uppercase tracking-widest hover:bg-primary-theme shadow-xl hover:shadow-primary-theme/20 group translate-y-0 active:scale-95"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-1" />
                                Back to Dashboard
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default React.memo(ComingSoonPage);
