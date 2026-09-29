'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, FileText, Lock, Server, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';

interface TermsSectionProps {
    onAccept: () => void;
    hasAgreed: boolean;
    redirectPath?: string;
}

const TermsSection: React.FC<TermsSectionProps> = ({ onAccept, hasAgreed, redirectPath }) => {
    const [agreed, setAgreed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (hasAgreed) {
            setAgreed(true);
        }
    }, [hasAgreed]);

    const handleContinue = () => {
        if (agreed) {
            onAccept();
            const pendingPortal = typeof window !== 'undefined'
                ? sessionStorage.getItem('mscurechain_pending_portal')
                : null;

            if (pendingPortal) {
                sessionStorage.removeItem('mscurechain_pending_portal');
                router.push(pendingPortal);
            } else if (redirectPath) {
                router.push(redirectPath);
            } else {
                router.push('/auth/login');
            }
        }
    };

    const handleCancel = () => {
        setAgreed(false);
    };

    const terms = [
        {
            icon: FileText,
            title: '1. Service Introduction',
            body: 'Welcome to the MSCureChain Platform. By accessing and using this medical technology website, you agree to abide by the following highly confidential terms.',
        },
        {
            icon: Lock,
            title: '2. Clinical Data & Compliance',
            body: 'Our platform manages critical healthcare data. All clinical modules and records are encrypted. You must maintain adherence to healthcare laws.',
        },
        {
            icon: Server,
            title: '3. Access Authorization',
            body: 'Access is granted exclusively to verified personnel. You are responsible for maintaining credentials. Breaches will result in termination.',
        },
        {
            icon: Globe,
            title: '4. Liability & Responsibility',
            body: 'MSCureChain provides computational assistance. However, the final clinical judgment and patient care responsibility rest solely with the medical practitioner.',
        },
    ];

    /* ── animation variants ── */
    const containerVariants: Variants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
    };

    const headerVariants: Variants = {
        hidden: { opacity: 0, y: -24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 40, scale: 0.96 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        },
    };

    const footerVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.1 } },
    };

    return (
        <section
            id="terms-section"
            className="py-16 bg-gray-50 flex items-center justify-center border-t border-gray-200"
        >
            <motion.div
                className="max-w-3xl w-full mx-auto px-4 sm:px-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
            >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">

                    {/* ── Header ── */}
                    <motion.div
                        variants={headerVariants}
                        className="px-6 py-5 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                            <ShieldCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                                Terms &amp; Conditions
                            </h2>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                                Please review the clinical portal usage terms before proceeding.
                            </p>
                        </div>
                    </motion.div>

                    {/* ── Cards Grid ── */}
                    <div className="p-6 sm:p-8">
                        <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6"
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.1 }}
                        >
                            {terms.map(({ icon: Icon, title, body }, idx) => (
                                <motion.div
                                    key={idx}
                                    variants={cardVariants}
                                    className="space-y-1.5 group"
                                    custom={idx}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            size={14}
                                            className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300"
                                        />
                                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                                            {title}
                                        </h3>
                                    </div>
                                    <p className="text-gray-500 text-xs leading-relaxed pl-5">
                                        {body}
                                    </p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* ── Footer / Actions ── */}
                    <motion.div
                        variants={footerVariants}
                        className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                    >
                        <label
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => {
                                e.preventDefault();
                                setAgreed(!agreed);
                            }}
                        >
                            <motion.div
                                animate={agreed
                                    ? { scale: [1, 1.2, 1], backgroundColor: '#2563eb', borderColor: '#2563eb' }
                                    : { scale: 1, backgroundColor: '#ffffff', borderColor: '#d1d5db' }
                                }
                                transition={{ duration: 0.25 }}
                                className="w-4 h-4 rounded-sm border flex items-center justify-center"
                            >
                                {agreed && <Check size={12} strokeWidth={3} className="text-white" />}
                            </motion.div>
                            <span className="text-sm font-semibold text-gray-700 select-none">
                                I agree to the Terms &amp; Conditions
                            </span>
                        </label>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={handleCancel}
                                className="flex-1 sm:flex-none px-5 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <motion.button
                                type="button"
                                suppressHydrationWarning
                                disabled={!agreed}
                                onClick={handleContinue}
                                whileHover={agreed ? { scale: 1.04 } : {}}
                                whileTap={agreed ? { scale: 0.96 } : {}}
                                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
                                    agreed
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                                }`}
                            >
                                Agree and Continue
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};

export default TermsSection;
