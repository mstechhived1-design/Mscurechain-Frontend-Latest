'use client';

import React, { useState } from 'react';

import { IndianRupee, Activity, Microscope, BarChart3, ArrowRight, CheckCircle2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from '@/components/animations/ScrollReveal';

export default function ProblemBasedFeatures() {
    const [activeTab, setActiveTab] = useState(0);

    const features = [
        {
            title: "Appointment Booking",
            icon: Calendar,
            color: "bg-indigo-500",
            gradient: "bg-linear-to-br from-indigo-50 via-white to-indigo-50/20",
            problem: "Long Waiting Times & High No-Shows",
            solution: "Smart scheduling system with automated reminders. Reduces waiting time by 40% and no-shows by 50%.",
            points: ["Online Booking Portal", "WhatsApp/SMS Reminders", "Live Queue Tracking"]
        },
        {
            title: "Billing & Finance",
            icon: IndianRupee,
            color: "bg-green-500",
            gradient: "bg-linear-to-br from-emerald-50 via-white to-emerald-50/20",
            problem: "Revenue Leakage & Delayed Insurance Claims",
            solution: "Automated billing engine that captures every service. Direct TPA integration reduces claim rejections by 35%.",
            points: ["Auto-generated invoices", "TPA/Insurance Management", "Expense Tracking"]
        },
        {
            title: "Clinical Ops",
            icon: Activity,
            color: "bg-blue-500",
            gradient: "bg-linear-to-br from-blue-50 via-white to-blue-50/20",
            problem: "Charting Fatigue & Prescription Errors",
            solution: "AI-assisted EMR that types for you. Drug interaction alerts ensure 100% safety compliance.",
            points: ["Voice-to-Text Notes", "Smart Order Sets", "Vitals Trending"]
        },
        {
            title: "Lab & Diagnostics",
            icon: Microscope,
            color: "bg-purple-500",
            gradient: "bg-linear-to-br from-purple-50 via-white to-purple-50/20",
            problem: "Manual Entry Errors & Lost Reports",
            solution: "Direct machine interfacing (LIS). Reports flow automatically from analyzer to patient portal.",
            points: ["Bi-directional Interfacing", "QR Code Reports", "Sample Tracking"]
        },
        {
            title: "Admin & Analytics",
            icon: BarChart3,
            color: "bg-orange-500",
            gradient: "bg-linear-to-br from-orange-50 via-white to-orange-50/20",
            problem: "Lack of Real-Time Visibility",
            solution: "Live command center showing bed occupancy, revenue pulse, and staff efficiency instantly.",
            points: ["Occupancy Heatmaps", "Revenue Forecasting", "Staff Performance"]
        }
    ];

    return (
        <section className="py-24 bg-white relative overflow-hidden">
        
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-slate-50/50 via-white to-slate-50/30 pointer-events-none" />
            <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary-theme/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-8 lg:px-12 relative z-10">

                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">
                        Solved: <span className="text-primary-theme">Operations</span>
                    </h2>
                    <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
                        We don&apos;t just build features; we eliminate the daily headaches of healthcare management.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                    {/* Tabs */}
                    <div className="lg:w-1/3 flex flex-col gap-3">
                        {features.map((feature, idx) => (
                            <button
                                key={idx}
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setActiveTab(idx)}
                                className={`p-4 rounded-2xl text-left transition-all duration-500 border-2 ${activeTab === idx ? 'border-primary-theme bg-white shadow-[0_20px_50px_-12px_rgba(var(--primary-theme-rgb),0.2)] scale-105' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-lg hover:scale-[1.02]'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 ${activeTab === idx ? 'scale-110' : ''} ${feature.color}`}>
                                        <feature.icon size={22} />
                                    </div>
                                    <div>
                                        <h4 className={`font-bold text-base ${activeTab === idx ? 'text-slate-900' : 'text-slate-500'}`}>{feature.title}</h4>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className={`lg:w-2/3 border border-slate-200 rounded-[1rem] p-8 md:p-12 text-slate-900 relative overflow-hidden min-h-[450px] flex flex-col justify-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] transition-all duration-500 ${features[activeTab].gradient}`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="relative z-10"
                            >
                                <div className="inline-block px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest mb-6 text-slate-400">
                                    The Challenge
                                </div>
                                <h3 className="text-2xl md:text-4xl font-black mb-6 leading-tight text-primary-theme tracking-tight">
                                    {features[activeTab].problem}
                                </h3>

                                <div className="w-full h-px bg-slate-100 my-8" />

                                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary-theme text-[10px] font-black uppercase tracking-widest mb-6">
                                    The Solution
                                </div>
                                <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium mb-10 max-w-2xl">
                                    {features[activeTab].solution}
                                </p>

                                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                                    {features[activeTab].points.map((point, i) => (
                                        <div key={i} className="flex items-center gap-3 group">
                                            <div className="p-1 rounded-full bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide group-hover:text-primary-theme transition-colors">{point}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-linear-to-bl from-primary-theme/5 via-primary-theme/0 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    </div>
                </div>

            </div>
        </section>
    );
}
