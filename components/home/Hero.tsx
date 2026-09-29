'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const Hero = () => {
    const router = useRouter();

    const handlePortalsClick = () => {
        router.push('/portals');
    };

    const handleContactClick = () => {
        router.push('/contact');
    };

    return (
        <section className="relative min-h-[85vh] lg:min-h-screen flex items-center pt-24 pb-16 lg:pt-32 lg:pb-32 overflow-hidden bg-white">
            {/* ADVANCED BLUE BACKGROUND SHADES */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Dynamic Blue Slope Layers */}
                <div className="absolute top-0 right-0 w-full lg:w-[65%] h-full bg-[#f0f7ff] lg:skew-x-[-15deg] transform origin-top lg:translate-x-1/4" />
                <div className="absolute top-0 right-0 lg:right-[25%] w-full lg:w-[12%] h-full bg-[#e0efff] lg:skew-x-[-15deg] transform origin-top opacity-70" />
                
                {/* Depth Blue Shades & Highlights */}
                <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] lg:w-[800px] lg:h-[800px] bg-blue-500/10 rounded-full blur-[100px] lg:blur-[160px]" />
                <div className="absolute bottom-[-15%] left-[-5%] w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-blue-600/5 rounded-full blur-[80px] lg:blur-[140px]" />
                
                {/* Structural Accents */}
                <div className="absolute top-1/2 left-[50%] lg:left-[55%] -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] border border-blue-500/5 rounded-full" />
                <div className="absolute top-1/2 left-[50%] lg:left-[55%] -translate-y-1/2 w-[400px] h-[400px] lg:w-[800px] lg:h-[800px] border border-blue-500/2 rounded-full" />
            </div>
            
            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    
                    {/* STRIKING CONTENT SECTION - RESPONSIVE DESIGN */}
                    <div className="space-y-8 lg:space-y-10 text-center lg:text-left order-2 lg:order-1">
                        <div className="space-y-6">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.2rem] font-black text-slate-900 leading-[1.0] lg:leading-[0.92] tracking-tighter uppercase">
                                Digitalize the <br /> 
                                <span className="text-blue-600">Curing Process.</span>
                            </h1>
                            
                            <div className="max-w-xl mx-auto lg:mx-0 space-y-6">
                                <p className="text-lg lg:text-xl text-slate-500 font-medium leading-relaxed">
                                    The definitive operating system for modern medical institutions. Synchronizing care, data, and precision in one unified ecosystem.
                                </p>
                                
                                <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 lg:gap-x-10">
                                    {[
                                        { label: "SECURE", value: "AES-256" },
                                        { label: "CONNECTED", value: "OMNI-PORTAL" },
                                        { label: "COMPLIANT", value: "NABH READY" }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col gap-1 items-center lg:items-start text-center lg:text-left">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                            <span className="text-[12px] lg:text-[13px] font-black text-slate-900 uppercase">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* REFINED WORKABLE BUTTONS (BALANCED SIZE) */}
                        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 pt-2 justify-center lg:justify-start">
                            <button
                                onClick={handlePortalsClick}
                                className="px-9 py-4.5 lg:px-11 lg:py-5 bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-slate-900 transition-all active:scale-[0.98] rounded-full"
                            >
                                EXPLORE PORTALS
                            </button>
                            
                            <button
                                onClick={handleContactClick}
                                className="px-9 py-4.5 lg:px-11 lg:py-5 bg-white text-slate-900 border-2 border-slate-900 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all active:scale-[0.98] rounded-full"
                            >
                                BOOK DEMO
                            </button>
                        </div>
                    </div>

                    {/* OVERLAPPING IMAGE COMPOSITION - STANDARDIZED FRAMING */}
                    <div className="relative w-full h-[350px] sm:h-[450px] lg:h-[600px] flex items-center justify-center order-1 lg:order-2 mb-10 lg:mb-0">
                        {/* hero1.png - Has built-in frame */}
                        <div className="relative z-20 w-[95%] lg:w-full transform lg:-rotate-1 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] rounded-xl lg:rounded-2xl overflow-hidden pointer-events-none">
                            <img src="/hero1.png" alt="Admin Analytics" className="w-full h-auto" />
                        </div>

                        {/* hero2.png - Has built-in frame */}
                        <div className="absolute z-30 w-1/2 sm:w-2/3 right-[-5%] lg:right-[-8%] -top-8 lg:-top-16 transform lg:rotate-3 shadow-[0_40px_100px_-25px_rgba(37,99,235,0.25)] rounded-xl lg:rounded-2xl overflow-hidden pointer-events-none">
                            <img src="/hero2.png" alt="Clinical Indicators" className="w-full h-auto" />
                        </div>

                        {/* hero3.png - Lacks frame, so we simulate the MacBook-style bezel for consistency */}
                        <div className="absolute z-40 w-1/2 sm:w-[60%] left-[-5%] lg:left-[-12%] -bottom-8 lg:-bottom-16 transform lg:-rotate-6 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.25)] rounded-xl lg:rounded-2xl border-[5px] sm:border-[8px] lg:border-[10px] border-slate-900 bg-slate-900 overflow-hidden pointer-events-none">
                            <img src="/hero3.png" alt="Doctor Portal" className="w-full h-auto" />
                        </div>
                        
                        {/* Responsive Decorative Elements */}
                        <div className="absolute -top-10 -left-10 w-32 lg:w-48 h-32 lg:h-48 bg-blue-500/5 rounded-full blur-[60px] lg:blur-[80px] -z-10" />
                        <div className="absolute -bottom-10 -right-10 w-40 lg:w-64 h-40 lg:h-64 bg-blue-600/8 rounded-full blur-[80px] lg:blur-[100px] -z-10" />
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
