'use client';

import React, { useState, useEffect } from "react";
// Add Google Font for Cursive
import { Dancing_Script } from 'next/font/google';
const dancingScript = Dancing_Script({ subsets: ['latin'] });
import {
    ShieldCheck,
    Activity,
    Database,
    ChevronRight,
    Globe,
    Zap,
    Lock,
    ArrowRight,
    Network,
    Target,
    Server,
    CheckCircle2,
    Play,
    Pause,
    Mic,
    Volume2,
    Bot,
    FileText,
    Users,
    Bed,
    Pill,
    LayoutGrid,
    CheckCircle,
    ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import PortalGrid from "@/components/home/PortalGrid";
import Footer from "@/components/footer/Footer";
import LandingNavbar from "@/components/navbar/LandingNavbar";
import ScrollReveal from "@/components/animations/ScrollReveal";

import { motion, AnimatePresence } from "framer-motion";
import DeploymentSecurity from "@/components/home/DeploymentSecurity";
import TermsSection from "@/components/home/TermsSection";
import LandingBlogs from "@/components/home/LandingBlogs";
import LandingTestimonials from "@/components/home/LandingTestimonials";
import ProblemBasedFeatures from "@/components/home/ProblemBasedFeatures";
import SecurityComplianceNew from "@/components/home/SecurityComplianceNew";
import Hero from "@/components/home/Hero";


export default function Home() {
    const router = useRouter();
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [progress, setProgress] = useState(0);
    const [showFloatingPlayer, setShowFloatingPlayer] = useState(true);
    // pendingPath removed - redirect is stored in sessionStorage and handled by TermsSection
    const [hasAgreed, setHasAgreed] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Custom smooth scroll with proportional duration (3500ms for full-page distance, scales down for shorter)
    const smoothScrollTo = (targetY: number) => {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const maxScrollable = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
        );
        // Duration scales with distance: full page = 3500ms, half = 1750ms, etc. Min 600ms.
        const duration = Math.max(600, (Math.abs(distance) / maxScrollable) * 3500);
        const startTime = performance.now();

        const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startY + distance * easeInOutCubic(progress));
            if (progress < 1) requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    };

    // Smooth scroll to terms-section when arriving via ?scrollTo=terms param
    // (used by portals page - avoids browser's auto-jump on # hash)
    // Reads window.location.search directly to avoid needing useSearchParams + Suspense
    useEffect(() => {
        if (!isMounted || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('scrollTo') !== 'terms') return;

        let attempts = 0;
        const maxAttempts = 25; // poll up to ~5 seconds

        const poll = setInterval(() => {
            attempts++;
            const el = document.getElementById('terms-section');
            if (el) {
                clearInterval(poll);
                // Settle delay so layout is stable, then distance-proportional smooth scroll
                setTimeout(() => {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                    smoothScrollTo(top);
                }, 150);
                // Clean the URL param after scrolling (keep URL tidy)
                window.history.replaceState(null, '', '/');
            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
            }
        }, 200);

        return () => clearInterval(poll);
    }, [isMounted]);

    useEffect(() => {
        const agreed = localStorage.getItem('mscurechain_terms_accepted');
        if (agreed === 'true') {
            setHasAgreed(true);
        }
    }, []);

    const handleProtectedClick = (path: string) => {
        if (hasAgreed) {
            router.push(path);
        } else {
            // Store intended destination; TermsSection will redirect there after acceptance
            sessionStorage.setItem('mscurechain_pending_portal', path);
            const element = document.getElementById('terms-section');
            if (element) {
                // Already on landing page — distance-proportional smooth scroll, offset for navbar
                const top = element.getBoundingClientRect().top + window.scrollY - 80;
                smoothScrollTo(top);
            } else {
                router.push('/?scrollTo=terms');
            }
        }
    };

    const handleTermsAccept = () => {
        localStorage.setItem('mscurechain_terms_accepted', 'true');
        setHasAgreed(true);
        // Navigation is now handled entirely by TermsSection (reads sessionStorage)
    };
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleEnded = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Attempt Auto-play
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Auto-play started!
            }).catch(error => {
                console.log("Auto-play prevented (normal browser policy):", error);
            });
        }

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => console.log("Audio play failed:", err));
            setShowFloatingPlayer(true);
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const newTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(parseFloat(e.target.value));
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-white" suppressHydrationWarning>
                <div className="h-20" /> {/* Navbar Placeholder */}
                <div className="max-w-7xl mx-auto px-6 py-20 animate-pulse">
                    <div className="h-12 w-64 bg-gray-100 rounded-lg mb-6" />
                    <div className="h-6 w-full max-w-2xl bg-gray-50 rounded-md mb-12" />
                    <div className="h-60 w-full bg-gray-50 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary-theme/30" suppressHydrationWarning>
            <header>
                <LandingNavbar variant="home" onProtectedClick={handleProtectedClick} />
            </header>

            <main>
                {/* Hidden Audio Element */}
                <audio ref={audioRef} src="/assets/voiceMS.mp3" preload="auto" autoPlay aria-hidden="true" />

                {/* Hero Section */}
                <Hero />
                <DeploymentSecurity />
                <ProblemBasedFeatures />
                {/* Voice & Project Information Section */}
                <section className="pb-8 mt-20 relative z-20 ">
                    <div className="max-w-7xl mx-auto rounded-[0.5rem] px-6 border border-primary-theme/40 py-8">
                        <ScrollReveal distance="20px" duration={1000}>
                            <div className="bg-transparent p-2 relative overflow-hidden">
                                <div className="grid lg:grid-cols-2 gap-6 items-stretch">
                                    <div className="bg-card rounded-2xl p-4 shadow-sm flex flex-col md:flex-row lg:grid-col-1 gap-6 group hover:shadow-md transition-all duration-500 overflow-hidden">
                                        <div className="relative rounded-xl overflow-hidden aspect-video md:w-1/3 lg:w-full flex-shrink-0">
                                            <img
                                                src="/assets/voice.jpeg"
                                                alt="MSCureChain Ecosystem Highlights and Features"
                                                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent pointer-events-none" />
                                        </div>
                                        <div className="flex flex-col justify-center px-1">
                                            <h3 className="text-lg font-bold text-foreground mb-1 uppercase tracking-tight">Ecosystem Highlights</h3>
                                            <p className="text-[13px] text-muted leading-relaxed">
                                                Explore the core features that make MSCureChain the leading choice for healthcare excellence.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm flex flex-col justify-center gap-6 group hover:shadow-md transition-all duration-500 relative overflow-hidden">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-xl bg-primary-theme/10 flex items-center justify-center text-primary-theme shrink-0 group-hover:bg-primary-theme group-hover:text-white transition-all duration-300">
                                                {isPlaying ? <Volume2 size={32} className="animate-pulse" /> : <Mic size={32} />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Audio Vision</h3>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <p suppressHydrationWarning className="text-sm text-muted leading-relaxed italic opacity-90">
                                                &quot;Listen to our founder&apos;s vision for revolutionizing healthcare.&quot;
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <button type="button" suppressHydrationWarning onClick={togglePlay} className="w-12 h-12 rounded-xl bg-primary-theme text-white flex items-center justify-center hover:shadow-lg transition-all active:scale-95 shrink-0">
                                                    {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
                                                </button>
                                                <div className="flex-1 space-y-1.5 pt-1">
                                                    <input
                                                        type="range"
                                                        value={progress}
                                                        onChange={handleProgressChange}
                                                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary-theme"
                                                    />
                                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                                                        <span>Live Record</span>
                                                        <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Portals Section */}
                <div id="portals">
                    <ScrollReveal>
                        <PortalGrid onPortalClick={handleProtectedClick} />
                    </ScrollReveal>
                </div>

                {/* AI Powered Prescription Section */}
                <section id="ai-prescription" className="py-24 relative overflow-hidden bg-muted/5">
                    <div className="max-w-7xl mx-auto px-6">
                        <ScrollReveal distance="50px">
                            <div className="flex flex-col lg:flex-row gap-16 items-center">
                                <div className="flex-1 space-y-8">
                                    <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                        AI-Powered <br />
                                        <span className="text-primary-theme italic">Prescriptions.</span>
                                    </h2>
                                    <p className="text-lg text-muted leading-relaxed max-w-xl">
                                        Our advanced AI engine analyzes patient history, symptoms, and clinical guidelines to generate precision-grade prescriptions in seconds.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {[
                                            { icon: Activity, title: "Smart Dosage", desc: "Auto-calculated based on age & weight" },
                                            { icon: ShieldCheck, title: "Safety First", desc: "Real-time drug interaction checks" },
                                            { icon: Database, title: "Global Standards", desc: "Aligned with clinical guidelines" },
                                            { icon: Zap, title: "Instant Draft", desc: "Reduces clinical charting time by 60%" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 group-hover:bg-primary-theme/10 transition-colors">
                                                    <item.icon size={18} className="text-primary-theme" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                                                    <p className="text-xs text-muted">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-4">
                                        <button type="button" suppressHydrationWarning onClick={() => router.push('/features')} className="bg-primary-theme hover:bg-primary-theme/90 text-white px-10 py-5 rounded-2xl font-bold transition-all shadow-xl shadow-primary-theme/25 flex items-center justify-center gap-3 group w-full sm:w-auto hover:scale-105 active:scale-95">
                                            Book a 15-Minute Product Walkthrough
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    <div className="relative bg-card rounded-[0.5rem] p-8 shadow-2xl">
                                        <div className="rounded-[0.5rem] overflow-hidden shadow-inner bg-muted/5 group">
                                            <img
                                                src="../assets/aipre.png"
                                                alt="AI Generated Prescription Preview"
                                                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section >

                {/* Value Proposition */}
                <section className="py-24 bg-background overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6">
                        <ScrollReveal distance="50px">
                            <div className="flex flex-col lg:flex-row gap-16 items-center">
                                <div className="flex-1 space-y-8">
                                    <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                        Integrated Care for the <br />
                                        <span className="text-primary-theme italic">Next Generation.</span>
                                    </h2>
                                    <p className="text-lg text-muted leading-relaxed">
                                        Most systems are siloed. MSCureChain connects every touchpoint of the patient journey, from the first symptom check to the final pharmacy bill.
                                    </p>
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary-theme/10 flex items-center justify-center">
                                                <ChevronRight size={14} className="text-primary-theme" />
                                            </div>
                                            <span className="font-medium">AI-Driven symptom analysis & mapping</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary-theme/10 flex items-center justify-center">
                                                <ChevronRight size={14} className="text-primary-theme" />
                                            </div>
                                            <span className="font-medium">Real-time bed & resource availability</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary-theme/10 flex items-center justify-center">
                                                <ChevronRight size={14} className="text-primary-theme" />
                                            </div>
                                            <span className="font-medium">Blockchain-ready medical records</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-8">
                                        <div className="h-64 sm:h-72 rounded-[2.5rem] bg-[#F5F3FF] border border-purple-100 p-10 flex flex-col justify-start gap-8 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 group">
                                            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shadow-sm">
                                                <Zap size={28} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-3xl text-slate-900 tracking-tight">Efficiency</h4>
                                                <p className="text-slate-500 font-medium">70% faster OPD processing</p>
                                            </div>
                                        </div>
                                        <div className="h-72 sm:h-80 rounded-[2.5rem] bg-[#F0FDF4] border border-emerald-100 p-10 flex flex-col justify-start gap-8 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 group">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm">
                                                <Target size={28} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-3xl text-slate-900 tracking-tight">Precision</h4>
                                                <p className="text-slate-500 font-medium">Zero-error prescription logs</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8 pt-0 sm:pt-16">
                                        <div className="h-72 sm:h-80 rounded-[2.5rem] bg-[#F0F9FF] border border-blue-100 p-10 flex flex-col justify-start gap-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                                <Network size={28} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-3xl text-slate-900 tracking-tight">Connected</h4>
                                                <p className="text-slate-500 font-medium">Omnichannel notifications</p>
                                            </div>
                                        </div>
                                        <div className="h-64 sm:h-72 rounded-[2.5rem] bg-[#FFF7ED] border border-orange-100 p-10 flex flex-col justify-start gap-8 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 group">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform shadow-sm">
                                                <Server size={28} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-3xl text-slate-900 tracking-tight">Scalable</h4>
                                                <p className="text-slate-500 font-medium">Multi-hospital architecture</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Transformation CTA Section */}
                <section className="relative pt-12 pb-12 overflow-visible z-20">
                    <div
                        className="absolute inset-0 z-0 bg-fixed bg-cover bg-center"
                        style={{
                            backgroundImage: "url('/assets/real.jpeg')",
                        }}
                    />
                    <div className="absolute inset-0 bg-[#0a0a0a]/40 z-0" />
                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <ScrollReveal distance="30px" duration={1000}>
                            <div className="text-center space-y-2 mb-12">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white cursor-pointer hover:scale-110 transition-transform mb-4">
                                    <ChevronRight size={20} className="ml-0.5" />
                                </div>
                                <h2 className="flex flex-col items-center text-white drop-shadow-2xl">
                                    <span className={`text-3xl md:text-4xl  max-sm:text-[12px] font-black uppercase tracking-[0.3em] opacity-80 mb-2`}>
                                        Our Mission to
                                    </span>
                                    <span className="text-background max-sm:text-[14px] px-10 py-4 text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none  transform hover:scale-105 transition-transform duration-500">
                                        DIGITALIZE <span className="text-primary-theme max-sm:text-[14px]">CURING PROCESS</span>
                                    </span>
                                    <span className={`text-2xl md:text-4xl font-medium ${dancingScript.className} mt-6 text-white/90`}>
                                        Towards a smarter healthcare ecosystem
                                    </span>
                                </h2>
                            </div>
                        </ScrollReveal>

                        <div className="max-w-6xl mx-auto relative z-30 -mb-80">
                            <ScrollReveal distance="60px" duration={1200} delay={200}>
                                <div className="flex flex-col lg:flex-row rounded-[2rem] overflow-hidden border border-white/5 bg-background">
                                    <div className="lg:w-[45%] bg-primary-theme p-10 lg:p-14 text-white space-y-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <h3 className="text-3xl  max-sm:text-[16px] font-bold uppercase leading-tight relative">
                                            The Most Affordable <br /> Hospital Software
                                        </h3>
                                        <p className="text-white/80 leading-relaxed text-sm relative">
                                            Tired of monthly software payments? Never pay monthly again. Hospital Management System is a most affordable self-hosted software.
                                        </p>
                                        <ul className="space-y-4 relative">
                                            {[
                                                "Portals for Doctors",
                                                "Portals for Patients and Staff",
                                                "Appointment Booking",
                                                "Lab & Pharmacy Integrated",
                                                "AI  Prescriptions"
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <div className="mt-1 flex-shrink-0">
                                                        <CheckCircle2 size={18} className="text-white" />
                                                    </div>
                                                    <span className="text-sm font-semibold uppercase tracking-wide">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                     
                                    </div>
                                    <div className="lg:w-[55%] bg-background p-10 lg:p-14 space-y-10 border-l border-border-theme">
                                        <div className="space-y-6">
                                            <div className="flex gap-6 items-start group/feature">
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0 group-hover/feature:bg-primary-theme group-hover/feature:text-white transition-all duration-300">
                                                    <Activity size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl  max-sm:text-[16px] font-bold text-foreground uppercase">Seamless Appointment Booking</h4>
                                                    <p className="text-muted text-sm leading-relaxed">
                                                        Automated scheduling system that reduces wait times by 40%.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 items-start group/feature">
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0 group-hover/feature:bg-primary-theme group-hover/feature:text-white transition-all duration-300">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl max-sm:text-[16px] font-bold text-foreground uppercase">In patinet Bedmanagement system</h4>
                                                    <p className="text-muted text-sm leading-relaxed">
                                                        Ward-wise and category-wise bed management
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 items-start group/feature">
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0 group-hover/feature:bg-primary-theme group-hover/feature:text-white transition-all duration-300">
                                                    <Network size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl max-sm:text-[16px] font-bold text-foreground uppercase">Multiportal Interconnectivity</h4>
                                                    <p className="text-muted text-sm leading-relaxed">
                                                        Integration with multiple portals for seamless access
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-6 items-start group/feature">
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0 group-hover/feature:bg-primary-theme group-hover/feature:text-white transition-all duration-300">
                                                    <Lock size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl max-sm:text-[16px] font-bold text-foreground uppercase">AI-Powered Digital Prescriptions</h4>
                                                    <p className="text-muted text-sm leading-relaxed">
                                                        Cloud-stored prescriptions accessible via QR.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 items-start group/feature">
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0 group-hover/feature:bg-primary-theme group-hover/feature:text-white transition-all duration-300">
                                                    <Database size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl max-sm:text-[16px] font-bold text-foreground uppercase">Integrated Lab & Pharmacy</h4>
                                                    <p className="text-muted text-sm leading-relaxed">
                                                        Seamless integration between clinical diagnosis and diagnostic reports.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-8 border-t border-border-theme">
                                            <button type="button" suppressHydrationWarning onClick={() => router.push('/portals')} className="w-full bg-primary-theme text-background py-6 rounded-2xl font-black text-sm uppercase hover:bg-primary-theme/90 hover:text-white transition-all tracking-[0.2em] shadow-xl hover:shadow-primary-theme/20 active:scale-[0.98] flex items-center justify-center gap-3 group">
                                                Talk to a Healthcare Solutions Expert
                                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* Enterprise Security Section */}
                <section className="pt-80 pb-24 mt-20 bg-muted/5 relative overflow-visible z-10">
                    <div className="max-w-7xl mx-auto px-6">
                        <ScrollReveal distance="60px" duration={1200}>
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                <div className="relative order-2 lg:order-1">
                                    <div className="absolute inset-0 bg-primary-theme/20 blur-[100px] -z-10" />
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50", label: "Reliability" },
                                            { icon: Lock, color: "text-purple-500", bg: "bg-purple-50", label: "Encryption" },
                                            { icon: Database, color: "text-emerald-500", bg: "bg-emerald-50", label: "Residency" },
                                            { icon: Activity, color: "text-orange-500", bg: "bg-orange-50", label: "Monitoring" }
                                        ].map((box, idx) => (
                                            <div key={idx} className={`p-8 rounded-[2rem] ${box.bg} border border-white shadow-sm flex flex-col items-center gap-4 group hover:shadow-xl transition-all duration-500 ${idx % 2 === 1 ? 'mt-8' : ''}`}>
                                                <div className={`${box.color} group-hover:scale-110 transition-transform`}>
                                                    <box.icon size={48} />
                                                </div>
                                                <span className="font-bold text-sm text-slate-600 uppercase tracking-widest">{box.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-8 order-1 lg:order-2">
                                    <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                        Trusted by Leading <br />
                                        <span className="text-primary-theme italic">Health Institutions.</span>
                                    </h2>
                                    <p className="text-lg text-muted leading-relaxed">
                                        We prioritize patient privacy and data integrity above all else.
                                    </p>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section >



                {/* Unified Healthcare Solution Section */}
                <section className="py-24 bg-background relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-theme/5 rounded-full blur-[120px] -mr-64 -mt-32 -z-10" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -ml-64 -mb-32 -z-10" />
                    <div className="max-w-7xl mx-auto px-6">
                        <ScrollReveal distance="40px" duration={1000}>
                            <div className="flex flex-col items-center text-center space-y-6 mb-20">
                                <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase relative unified-section-title">
                                    our  MSCureChain
                                </h2>
                                <p className="max-w-2xl text-slate-500 font-medium leading-relaxed">
                                    Digitalize the curing process with our next-generation healthcare platform.
                                </p>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                                {[
                                    { id: "01", title: "AI Prescriptions", desc: "Intelligent AI-powered prescriptions.", icon: Bot, iconBg: "bg-teal-500", iconColor: "text-white" },
                                    { id: "02", title: "Digital Records & Labs", desc: "Comprehensive digital records.", icon: FileText, iconBg: "bg-purple-500", iconColor: "text-white" },
                                    { id: "03", title: "Staff Attendance", desc: "Smart staff management.", icon: Users, iconBg: "bg-orange-500", iconColor: "text-white" },
                                    { id: "04", title: "Bed Management", desc: "Intelligent bed allocation.", icon: Bed, iconBg: "bg-rose-500", iconColor: "text-white" },
                                    { id: "05", title: "Pharmacy & Lab Integration", desc: "Seamless pharmacy connectivity.", icon: Pill, iconBg: "bg-blue-600", iconColor: "text-white" },
                                    { id: "06", title: "Connected Portals", desc: "Unified platform connecting all.", icon: LayoutGrid, iconBg: "bg-indigo-600", iconColor: "text-white" }
                                ].map((card, idx) => (
                                    <div key={idx} className="group relative p-10 unified-card overflow-hidden">
                                        <span className="absolute top-8 right-10 text-4xl text-gray-200 select-none unified-card-number">{card.id}</span>
                                        <div className={`w-14 h-14 ${card.iconBg} ${card.iconColor} rounded-2xl flex items-center justify-center shadow-lg mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                            <card.icon size={28} />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-theme transition-colors">{card.title}</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary-theme/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center">
                                <button type="button" suppressHydrationWarning onClick={() => handleProtectedClick('/pricing')} className="inline-flex items-center gap-4 px-12 py-6 font-bold group overflow-hidden relative bg-primary-theme text-background rounded-2xl tracking-[0.2em] hover:bg-primary-theme/90 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95">
                                    <span className="relative z-10 uppercase">Get Started with MSCureChain</span>
                                    <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Bed Management Marvel Hero Section */}
                <BedManagementMarvel />

                {/* Security & Compliance */}

                <SecurityComplianceNew />


                {/* FAQ Section */}
                <section id="faq" className="py-24 bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary-theme/10 to-transparent" />
                    <div className="max-w-4xl mx-auto px-6">
                        <ScrollReveal distance="30px" duration={1000}>
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">
                                    Frequently Asked <span className="text-primary-theme">Questions</span>
                                </h2>
                                <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                                    Everything you need to know about MSCureChain and how it transforms healthcare delivery.
                                </p>
                            </div>
                        </ScrollReveal>

                        <div className="space-y-4">
                            {[
                                {
                                    q: "What is MSCureChain?",
                                    a: "MSCureChain is a comprehensive, AI-powered hospital management system (HMS) designed to digitalize the recovery process. It connects patients, doctors, labs, and pharmacies on a single, secure platform for seamless healthcare delivery."
                                },
                                {
                                    q: "How does the AI Prescription feature work?",
                                    a: "Our AI engine analyzes patient history, symptoms, and clinical guidelines to assist doctors in generating precision-grade prescriptions. It includes built-in safety checks for drug interactions and dosage accuracy."
                                },
                                {
                                    q: "Is my medical data secure?",
                                    a: "Yes, security is our top priority. We use AES-256 encryption and follow strict NABH-compliant data handle practices to ensure that all patient and clinical data remain private and tamper-proof."
                                },
                                {
                                    q: "Can I book appointments online?",
                                    a: "Absolutely. Patients can browse doctor availability and book appointments instantly through our Frontdesk portal. The system automatically synchronizes with the doctor's schedule and sends real-time notifications."
                                },
                                {
                                    q: "Does MSCureChain support multi-hospital networks?",
                                    a: "Yes, MSCureChain is built with a scalable multi-hospital architecture, allowing healthcare groups to manage multiple branches, resources, and departments from a centralized administrative dashboard."
                                },
                                {
                                    q: "What is the Inpatient Bed Management System?",
                                    a: "The Inpatient Bed Management System is an intelligent, hospital-wide solution designed to efficiently manage patient admissions, bed allocation, transfers, and discharges. It provides real-time visibility of bed availability, patient status, and ward utilization, enabling hospitals to optimize resources, reduce wait times, and ensure smooth inpatient care across departments."
                                }
                            ].map((faq, idx) => (
                                <ScrollReveal key={idx} distance="20px" delay={idx * 100}>
                                    <div
                                        className="group bg-white rounded-2xl border border-slate-200 hover:border-primary-theme/30 hover:shadow-xl hover:shadow-primary-theme/5 transition-all duration-300 cursor-pointer"
                                        onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    >
                                        <div className="p-6">
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-lg bg-primary-theme/10 text-primary-theme flex items-center justify-center font-bold text-sm shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-theme transition-colors">
                                                            {faq.q}
                                                        </h3>
                                                        <ChevronDown
                                                            className={`text-primary-theme transition-transform duration-300 shrink-0 ${openFaqIndex === idx ? 'rotate-180' : ''}`}
                                                            size={20}
                                                        />
                                                    </div>
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ${openFaqIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                                    >
                                                        <p className="text-slate-500 leading-relaxed font-medium pt-2">
                                                            {faq.a}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>

                        <div className="mt-16 text-center">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => router.push('/contact')}
                                className="inline-flex items-center gap-3 bg-primary-theme text-white px-10 py-5 rounded-2xl font-bold shadow-xl shadow-primary-theme/20 hover:scale-105 transition-all active:scale-95"
                            >
                                GET STARTED NOW <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Latest Blogs */}
                <ScrollReveal>
                    <LandingBlogs />
                </ScrollReveal>

                {/* What People Say (Testimonials) */}
                <ScrollReveal>
                    <LandingTestimonials />
                </ScrollReveal>

                <TermsSection
                    onAccept={handleTermsAccept}
                    hasAgreed={hasAgreed}
                />
            </main>

            <Footer />
        </div >
    );
}

const BedManagementMarvel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const steps = [
        {
            title: "Bed Allocation",
            category: "Assignment",
            desc: "Room 203 assigned, Bed 1 secured. Surgery scheduled and synchronized with clinical teams for instant readiness.",
            icon: Bed,
            image: "/assets/bed.png",
            bgText: "ALLOCATE",
            color: "#3b82f6"
        },
        {
            title: "Pre-Op Prep",
            category: "Preparation",
            desc: "Nursing staff completes surgical prep. Patient stabilized and ready for the procedure with full history sync.",
            icon: Activity,
            image: "/assets/preparation.png",
            bgText: "PREPARE",
            color: "#10b981"
        },
        {
            title: "Continuous Tracking",
            category: "Monitoring",
            desc: "Live vitals tracking with real-time SpO2, Heart Rate, and BP monitoring. Instant alerts for clinical teams.",
            icon: Zap,
            image: "/assets/mointaing.png",
            bgText: "MONITOR",
            color: "#f59e0b"
        },
        {
            title: "Discharge Ready",
            category: "Finalization",
            desc: "Final medical summary generated. Home care instructions provided for seamless post-hospital recovery.",
            icon: FileText,
            image: "/assets/discharge.png",
            bgText: "DISCHARGE",
            color: "#8b5cf6"
        }
    ];

    const nextStep = () => setCurrentIndex((prev) => (prev + 1) % steps.length);

    useEffect(() => {
        const timer = setInterval(nextStep, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative min-h-screen bg-white overflow-hidden py-16 px-6 lg:px-20">
            {/* Background Layered Text - Desktop */}
            <div className="hidden lg:block">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 0.05, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <span className="text-[20vw] font-black tracking-tighter text-slate-900 select-none">
                            {steps[currentIndex].bgText}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Main Stage */}
            <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center">

                {/* Mobile and Tablet View: Vertical Cards */}
                <div className="flex flex-col gap-10 lg:hidden text-slate-900">
                    <div className="text-center space-y-3 mb-4">
                        <span className="bg-primary-theme text-white px-4 py-1 text-xs font-black uppercase tracking-widest rounded-full">Inpatient Care</span>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Bed Management System</h2>
                    </div>

                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col"
                        >
                            {/* Image Section */}
                            <div className="relative h-64 md:h-96 w-full">
                                <div
                                    className="absolute inset-0 z-10 opacity-10"
                                    style={{ backgroundColor: step.color }}
                                />
                                <div className="absolute top-4 left-6 z-30">
                                    <span className="bg-primary-theme text-white px-3 py-1 text-lg font-black uppercase">CURE</span>
                                </div>
                                <img
                                    src={step.image}
                                    alt={step.title}
                                    className="w-full h-full object-cover p-4 md:p-8 rounded-[2.5rem] relative z-20"
                                />
                            </div>

                            {/* Content Section */}
                            <div className="p-8 md:p-12 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary-theme animate-pulse" />
                                    <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                                        {step.category}
                                    </span>
                                </div>
                                <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">{step.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                                    {step.desc}
                                </p>

                                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                                    {[Users, ShieldCheck, Database, Globe].map((Icon, i) => (
                                        <Icon key={i} size={20} className="text-slate-300" />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Desktop View: Interactive Carousel */}
                <div className="hidden lg:block h-full">
                    <div className="relative group/card bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2.5rem] border border-slate-100 overflow-hidden min-h-[500px] flex flex-row">

                        {/* Content Section (Left) */}
                        <div className="flex-1 p-16 flex flex-col justify-between relative z-20">
                            <div className="space-y-8">
                                <motion.div
                                    key={`cat-${currentIndex}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-primary-theme animate-pulse" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                                        {steps[currentIndex].category}
                                    </span>
                                </motion.div>

                                <motion.h2
                                    key={`title-${currentIndex}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none"
                                >
                                    {steps[currentIndex].title}
                                </motion.h2>

                                <motion.p
                                    key={`desc-${currentIndex}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-lg text-slate-500 leading-relaxed max-w-md font-medium"
                                >
                                    {steps[currentIndex].desc}
                                </motion.p>
                            </div>

                            <div className="flex items-center gap-6 pt-10 border-t border-slate-100 mt-10">
                                {[Users, ShieldCheck, Database, Globe].map((Icon, i) => (
                                    <Icon key={i} size={18} className="text-slate-300 hover:text-primary-theme cursor-pointer transition-colors" />
                                ))}
                            </div>
                        </div>

                        {/* Image Section / Slanted Panel (Right) */}
                        <div className="flex-1 relative overflow-hidden bg-slate-50">
                            <motion.div
                                animate={{ backgroundColor: steps[currentIndex].color }}
                                className="absolute inset-0 z-10 transition-colors duration-1000"
                                style={{ clipPath: "polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
                            />

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`img-${currentIndex}`}
                                    initial={{ opacity: 0, scale: 0.8, x: 50, rotate: 5 }}
                                    animate={{ opacity: 1, scale: 1.1, x: 0, rotate: -2 }}
                                    exit={{ opacity: 0, scale: 0.5, x: -50, rotate: -10 }}
                                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                    className="absolute inset-0 z-20 flex items-center justify-center p-10 mt-10 pointer-events-none"
                                >
                                    <img
                                        src={steps[currentIndex].image}
                                        alt={steps[currentIndex].title}
                                        className="w-full h-full object-cover rounded-[2rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] border-4 border-white/20"
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Badge Positioning */}
                        <div className="absolute top-5 left-10 z-30">
                            <span className="bg-primary-theme text-white px-3 py-1 text-2xl font-black uppercase tracking-tighter shadow-lg">CURE</span>
                        </div>

                        {/* Progress Dots */}
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
                            {steps.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    suppressHydrationWarning
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-1 h-6 transition-all duration-500 rounded-full cursor-pointer ${i === currentIndex ? 'bg-white scale-y-150 shadow-md' : 'bg-white/30 hover:bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
