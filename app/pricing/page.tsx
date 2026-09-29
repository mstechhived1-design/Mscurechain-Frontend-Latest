'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Sun, Moon, Menu, X, Phone, Mail } from 'lucide-react';
import { Bruno_Ace_SC } from 'next/font/google';

const brunoAceSC = Bruno_Ace_SC({
    weight: '400',
    subsets: ['latin'],
    display: 'swap'
});

import LandingNavbar from "@/components/navbar/LandingNavbar";

import Footer from "@/components/footer/Footer";

function PricingPage() {
    const router = useRouter();

    // Theme logic removed - handled by LandingNavbar

    const features = [
        "HOSPITAL ADMIN PORTAL",
        "DOCTOR CONSULTATION TERMINAL",
        "STAFF MANAGEMENT PORTAL",
        "HELPDESK & RECEPTION PORTAL",
        "DISCHARGE STAFF TERMINAL",
        "PATIENT HEALTH PORTAL",
        "LAB & DIAGNOSTICS PORTAL",
        "PHARMACY POS SYSTEM",
        "EMERGENCY & EMS TRACKER"
    ];

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary-theme/30 flex flex-col">
            <LandingNavbar variant="pricing" />

            {/* Hero Section */}
            <section className="relative pt-32 pb-60 text-white overflow-hidden bg-slate-900">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
                    style={{ backgroundImage: "url('/assets/pricebg.jpg')" }}
                ></div>
                <div className="absolut"></div>
                <div className="max-w-7xl mx-auto px-6 relative text-center">
                    <p className="text-sm font-bold uppercase tracking-widest mb-4 opacity-80">The Most Affordable Hospital Management Software</p>
                    <h1 className={`${brunoAceSC.className} text-6xl md:text-8xl font-black tracking-tighter mb-8 italic`}>PRICING</h1>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="relative -mt-40 pb-24 px-6 flex-grow">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row bg-card rounded-[0.5rem] overflow-hidden shadow-2xl border border-primary-theme/30">

                    {/* Left: Info */}
                    <div className="lg:w-1/2 p-12 bg-white flex flex-col justify-between border-r border-border">
                        <div>
                            <h2 className="text-3xl font-black mb-6 tracking-tight uppercase">THE MOST AFFORDABLE HOSPITAL SOFTWARE</h2>
                            <p className="mb-8 leading-relaxed font-medium">
                                Tired of monthly software payments? Never pay monthly again.
                                Hospital Management System is a most affordable self hosted software.
                                We&apos;re offering a pay-once lifetime license.
                            </p>

                            <ul className="grid grid-cols-1 gap-y-4 mb-2">
                                {features.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-xs  dark:text-emerald-400 ">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={4} />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right: Offer Image & Action */}
                    <div className="lg:w-1/2 p-12 bg-slate-50 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="relative group w-full max-w-xs">
                            <div className="absolute -inset-1 bg-linear-to-r from-primary-theme to-emerald-400 rounded-2xl blur-lg opacity-25 group-hover:opacity-50" />
                            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl aspect-square">
                                <img
                                    src="/assets/pricing.jpg"
                                    alt="Special Offer"
                                    className="w-full h-full object-cover transform group-hover:scale-105"
                                />
                            </div>
                        </div>

                        <div className="space-y-6 w-full max-w-sm">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">LIMITED TIME OFFER</h3>
                                <p className="text-slate-500 text-sm font-medium mt-2">Get the full-featured MSCureChain platform for a lifetime.</p>
                            </div>

                            <button type="button" suppressHydrationWarning className="w-full group relative flex flex-col items-center justify-center bg-primary-theme hover:bg-primary-theme/90 text-white rounded-xl py-3 shadow-2xl shadow-primary-theme/30 transform hover:-translate-y-1 active:scale-95 overflow-hidden">
                                <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent"></div>
                                <div className="relative flex flex-col items-center">
                                    <div className={`flex items-baseline gap-1`}>
                                        <span className="text-2xl font-bold opacity-80 ">Rs</span>
                                        <span className="text-7xl font-bold tracking-tighter">333</span>
                                    </div>
                                    <span className={`text-sm font-black  tracking-[0.2em] opacity-90 mt-1`}>per Day</span>
                                </div>
                            </button>


                        </div>



                    </div>

                </div>


            </section>

            {/* Contact Details Card */}
            <section className="pb-24 px-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-card rounded-[0.5rem] overflow-hidden shadow-xl border border-primary-theme/20 p-8">
                        <h2 className={` text-2xl font-black mb-8 tracking-tighter uppercase text-foreground text-center`}>Contact Details</h2>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 justify-center">
                                <div className="w-10 h-10 rounded-full bg-primary-theme/10 flex items-center justify-center text-primary-theme shrink-0">
                                    <Mail size={18} />
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 font-bold">info@mstechhive.com</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary-theme/10 flex items-center justify-center text-primary-theme shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">+91 9032223352</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary-theme/10 flex items-center justify-center text-primary-theme shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">+91 9492321619</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default React.memo(PricingPage);
