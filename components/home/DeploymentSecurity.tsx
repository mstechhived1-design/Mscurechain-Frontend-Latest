'use client';

import React from 'react';
import ScrollReveal from '../animations/ScrollReveal';

const DeploymentSecurity = () => {
    const features = [
        {
            title: "Built for 100% NABH Compliance",
            description: "We follow NABH regulations 100% by deploying the platform on the hospital’s own servers or private cloud. This ensures full control over patient data, system security, availability, and compliance without depending on third-party SaaS platforms.",
            icon: (
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <img
                        src="/assets/NABH.png"
                        alt="NABH Compliance"
                        className="w-full h-full object-contain"
                    />
                </div>
            )
        },
        {
            title: "National Health Authority (NHA) Aligned",
            description: "Designed in accordance with National Health Authority (NHA) standards, the system ensures ABDM readiness, ABHA ID integration, health record interoperability, and secure, consent-driven digital health information exchange.",
            icon: (
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <img
                        src="/assets/NHA.png"
                        alt="NHA Standards"
                        className="w-full h-full object-contain"
                    />
                </div>
            )
        },
        {
            title: "Ayushman Bharat Digital Mission (ABDM) Enabled",
            description: "Fully integrated with Ayushman Bharat Digital Mission (ABDM) framework, the system supports ABHA ID creation & verification, consent-based health record sharing, Health Information Exchange (HIE-CM) connectivity, and interoperability across ABDM-registered healthcare facilities.",
            icon: (
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <img
                        src="/assets/ADMA.png"
                        alt="ABDM Integration"
                        className="w-full h-full object-contain"
                    />
                </div>
            )
        }
    ];

    return (
        <section className="py-12 lg:py-24 bg-white mt-0 lg:mt-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <ScrollReveal key={idx} distance="30px" delay={idx * 150}>
                            <div className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                <div className="p-8 flex flex-col items-center justify-center bg-white border-b border-slate-100 flex-1 min-h-[180px]">
                                    <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 text-center uppercase tracking-tight">
                                        {feature.title}
                                    </h3>
                                </div>
                                <div className="p-6 bg-slate-50/50 flex-[2]">
                                    <p className="text-slate-600 text-[13px] leading-relaxed text-center font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DeploymentSecurity;
