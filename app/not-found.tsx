'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-color)' }}
        >
            {/* Main Content Container */}
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left Side - Content & Actions */}
                <div className="space-y-6">
                    {/* Emergency Code Badge */}
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#ef4444' }}>
                        <span>EMERGENCY CODE 404</span>
                    </div>

                    {/* Header */}
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-4 transition-colors duration-300" style={{ color: 'var(--text-color)' }}>
                            Stat! We have a{' '}
                            <span className="transition-colors duration-300" style={{ color: 'var(--primary-color)' }}>missing page!</span>
                        </h1>
                        <p className="text-base md:text-lg transition-colors duration-300" style={{ color: 'var(--secondary-color)' }}>
                            The page you are looking for seems to have been discharged early without completing its paperwork. Don't worry, the rest of the hospital is fully operational.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:opacity-90"
                            style={{ backgroundColor: 'var(--primary-color)', color: '#ffffff' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Return to Lobby
                        </Link>
                        <button
                            onClick={() => router.push('/hospital-admin/appointments')}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:opacity-80"
                            style={{
                                borderColor: 'var(--text-color)',
                                color: 'var(--text-color)',
                                backgroundColor: 'transparent',
                                border: '2px solid'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Book Appointment
                        </button>
                    </div>
                </div>

                {/* Right Side - Error Display Card */}
                <div className="relative flex justify-center items-center">
                    {/* 404 Badge - Positioned at top right */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center z-10 transition-colors duration-300" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">404</div>
                            <div className="text-xs text-white/90">ERROR</div>
                        </div>
                    </div>

                    {/* Main Card with Themed Background */}
                    <div
                        className="relative rounded-3xl p-6 w-full max-w-md transition-colors duration-300"
                        style={{
                            backgroundColor: 'var(--primary-color)',
                            border: 'none'
                        }}
                    >
                        {/* Robot Image - Themed Background */}
                        <div className="flex justify-center items-center">
                            <div
                                className="w-full h-80 rounded-2xl flex items-center justify-center p-6 transition-colors duration-1000 group relative"
                                style={{ backgroundColor: 'var(--card-bg)' }}
                            >
                                <img
                                    src="/assets/error.png"
                                    alt="404 Robot"
                                    className="max-w-full max-h-full object-contain transition-opacity duration-1000 ease-in-out absolute opacity-100 group-hover:opacity-0"
                                />
                                <img
                                    src="/assets/hiirobo.png"
                                    alt="Hi Robot"
                                    className="max-w-full max-h-full object-contain transition-opacity duration-1000 ease-in-out absolute opacity-0 group-hover:opacity-100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Section - Positioned outside bottom-left */}
                    <div
                        className="absolute -bottom-6 -left-6 rounded-full px-6 py-3 flex items-center gap-3 z-10 transition-colors duration-300"
                        style={{ backgroundColor: 'var(--card-bg)' }}
                    >
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="text-sm">
                            <div className="font-semibold text-xs transition-colors duration-300" style={{ color: 'var(--secondary-color)' }}>STATUS</div>
                            <div className="font-semibold transition-colors duration-300" style={{ color: 'var(--text-color)' }}>Page Vital Signs: Flatline</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
