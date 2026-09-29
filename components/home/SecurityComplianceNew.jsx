'use client';

import React from 'react';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { ShieldCheck, Lock, Database, Server, FileKey, Eye } from 'lucide-react';

export default function SecurityComplianceNew() {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/assets/grid-pattern.svg')] opacity-[0.03]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <ScrollReveal distance="30px">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">
                            Bank-Grade <span className="text-primary-theme">Security</span>
                        </h2>
                        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
                            Your data doesn't just sit there; it's fortified. We meet the highest national and international standards for healthcare data protection.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Compliance Standards */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">ABDM & NHA Ready</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                Fully compliant with Ayushman Bharat Digital Mission standards. Generate ABHA IDs and link health records seamlessly.
                            </p>
                            <div className="flex gap-4">
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">ABHA Linked</span>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">Unified Health Interface</span>
                            </div>
                        </div>

                        {/* Encryption */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">AES-256 Encryption</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                Military-grade encryption for data at rest and in transit. Your patient records are indecipherable to unauthorized entities.
                            </p>
                            <div className="flex gap-4">
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">End-to-End</span>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">SSL/TLS 1.3</span>
                            </div>
                        </div>

                        {/* Cloud hosting */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                                <Server size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase mb-4">Sovereign Hosting</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                Choose where your data lives. We support secure local server deployments or Indian data center cloud hosting (AWS/Azure).
                            </p>
                            <div className="flex gap-4">
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">Data Sovereignty</span>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">Daily Backups</span>
                            </div>
                        </div>
                    </div>

                   
                </ScrollReveal>
            </div>
        </section>
    );
}
