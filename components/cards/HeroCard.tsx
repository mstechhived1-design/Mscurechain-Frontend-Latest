import React from 'react';
import { Zap, CheckCircle, Stethoscope, Smartphone, Building, ShieldCheck, Calendar, Brain, Clock, FileText, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

const HeroCard = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] md:py-24 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-500 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex mt-5 items-center gap-2 bg-[var(--card-bg)]/50 backdrop-blur-sm rounded-full px-5 py-2 mb-8 border border-[var(--border-color)] shadow-sm">
                        <span className="text-sm font-medium text-[var(--secondary-color)]">AI-Powered Healthcare Platform</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        <span className="text-blue-500 dark:text-blue-400">MS</span>
                        <span className="text-green-500">CureChain</span>
                    </h1>

                    <p className="text-2xl md:text-3xl text-[var(--secondary-color)] mb-8 max-w-4xl mx-auto font-light">
                        Revolutionizing Healthcare with AI-Powered OPD & Appointment Management
                    </p>

                    <p className="text-lg text-[var(--secondary-color)]/80 mb-12 max-w-3xl mx-auto">
                        Join thousands of hospitals, doctors, and patients experiencing seamless digital healthcare across India
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => router.push("/auth/login")}
                            className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-lg text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-blue-900/50">
                            <Building className="w-5 h-5" />
                            Start Free Trial for Hospitals
                        </button>

                        <button
                            onClick={() => document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group bg-[var(--card-bg)]/80 hover:bg-[var(--card-bg)] backdrop-blur-sm text-[var(--text-color)] font-semibold py-4 px-8 rounded-lg text-lg border border-[var(--border-color)] hover:border-[var(--secondary-color)] flex items-center justify-center gap-3 shadow-sm hover:shadow-md">
                            <Smartphone className="w-5 h-5 text-[var(--text-color)]" />
                            Book Appointment as Patient
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    <FeatureCard
                        icon={<Calendar className="w-8 h-8" />}
                        title="Smart Appointment Booking"
                        description="Book doctor appointments online, choose available slots, and receive instant confirmation"
                        color="blue"
                    />
                    <FeatureCard
                        icon={<Brain className="w-8 h-8" />}
                        title="AI-Powered Prescriptions"
                        description="AI suggests prescriptions based on symptoms, saving doctors time and improving accuracy"
                        color="purple"
                    />
                    <FeatureCard
                        icon={<Clock className="w-8 h-8" />}
                        title="Queue Management"
                        description="Intelligent OPD flow prediction reduces waiting time and organizes patient flow"
                        color="green"
                    />
                    <FeatureCard
                        icon={<FileText className="w-8 h-8" />}
                        title="Digital Prescriptions"
                        description="No more lost papers. All prescriptions stored digitally and accessible anytime"
                        color="teal"
                    />
                    <FeatureCard
                        icon={<ShieldCheck className="w-8 h-8" />}
                        title="Secure Medical History"
                        description="Complete treatment history in one place, accessible to authorized doctors only"
                        color="red"
                    />
                    <FeatureCard
                        icon={<Users className="w-8 h-8" />}
                        title="Unified Platform"
                        description="One system for patients, doctors, and hospitals - seamless healthcare experience"
                        color="orange"
                    />
                </div>

                {/* Stats Section */}
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-sm rounded-2xl p-8 mb-16 border border-[var(--border-color)] shadow-2xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-[var(--text-color)] mb-2">
                            Transforming Indian Healthcare
                        </h2>
                        <p className="text-[var(--secondary-color)]">Trusted by healthcare providers across the country</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <StatCard
                            number="90%"
                            label="Reduction in Waiting Time"
                            icon={<Clock className="w-8 h-8 text-green-500" />}
                            isComponent={true}
                        />
                        <StatCard
                            number="100+"
                            label="Hospitals Trust Us"
                            icon={<Building className="w-8 h-8 text-blue-500" />}
                            isComponent={true}
                        />
                        <StatCard
                            number="50K+"
                            label="Patients Served"
                            icon={<Users className="w-8 h-8 text-purple-500" />}
                            isComponent={true}
                        />
                        <StatCard
                            number="24/7"
                            label="AI Support Available"
                            icon={<Brain className="w-8 h-8 text-orange-500" />}
                            isComponent={true}
                        />
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-wrap justify-center gap-6 mt-10 pt-8 border-t border-[var(--border-color)]">
                        <div className="flex items-center gap-3 bg-[var(--bg-color)]/50 rounded-lg px-4 py-2 border border-[var(--border-color)]">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-[var(--secondary-color)]">HIPAA Compliant</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-color)]/50 rounded-lg px-4 py-2 border border-[var(--border-color)]">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                            <span className="text-[var(--secondary-color)]">100% Data Secure</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[var(--bg-color)]/50 rounded-lg px-4 py-2 border border-[var(--border-color)]">
                            <Stethoscope className="w-5 h-5 text-purple-500" />
                            <span className="text-[var(--secondary-color)]">Medical Grade Security</span>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-[var(--text-color)] mb-4">
                        Ready to Transform Your Healthcare Experience?
                    </h3>
                    <p className="text-[var(--secondary-color)] mb-15 max-w-2xl mx-auto text-lg">
                        Join MSCureChain today and be part of India's digital healthcare revolution.
                        Perfect for Tier-2 and Tier-3 cities expanding nationwide.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) => {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        green: 'bg-green-500/10 text-green-500 border-green-500/20',
        teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    };

    return (
        <div className="bg-[var(--card-bg)] backdrop-blur-sm rounded-xl p-6 border border-[var(--border-color)] hover:border-[var(--secondary-color)] hover:bg-[var(--card-bg)]/90 shadow-sm hover:shadow-md group">
            <div className={`w-14 h-14 rounded-xl ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-5 border group-hover:scale-110`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-[var(--text-color)] mb-3">{title}</h3>
            <p className="text-[var(--secondary-color)]">{description}</p>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ number, label, icon, isComponent = false }: { number: string; label: string; icon: string | React.ReactNode; isComponent?: boolean }) => (
    <div className="text-center bg-[var(--bg-color)]/40 rounded-xl p-6 border border-[var(--border-color)] hover:border-[var(--secondary-color)] shadow-sm">
        <div className="flex justify-center mb-3">
            {isComponent ? icon : <img src={icon as string} alt={label} className="w-8 h-8 object-contain" />}
        </div>
        <div className="text-4xl font-bold text-[var(--text-color)] mb-2">{number}</div>
        <div className="text-[var(--secondary-color)] font-medium">{label}</div>
    </div>
);

export default HeroCard;
