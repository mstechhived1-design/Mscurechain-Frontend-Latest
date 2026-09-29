'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Search, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/integrations/api/apiClient';

interface HospitalApiResponse {
    hospitals?: Hospital[];
    data?: Hospital[];
}

interface Hospital {
    _id: string;
    name: string;
    city?: string;
    state?: string;
    isActive?: boolean;
}

/**
 * HospitalSwitcher — SuperAdmin only
 * Allows SuperAdmin to jump into any hospital's admin context.
 * Navigates to /{hospitalId}/hospital-admin and sets the X-Hospital-Id header.
 */
export default function HospitalSwitcher() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [filtered, setFiltered] = useState<Hospital[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Only render for super-admin
    const isSuperAdmin = user?.role === 'super-admin' || user?.role === 'admin';

    // Load hospitals when dropdown opens
    useEffect(() => {
        if (!isSuperAdmin) return;
        if (isOpen && hospitals.length === 0) {
            fetchHospitals();
        }
    }, [isOpen, isSuperAdmin, hospitals.length]);

    // Filter hospitals by search query
    useEffect(() => {
        if (!search.trim()) {
            setFiltered(hospitals);
        } else {
            const q = search.toLowerCase();
            setFiltered(hospitals.filter(h =>
                h.name.toLowerCase().includes(q) ||
                h.city?.toLowerCase().includes(q) ||
                h.state?.toLowerCase().includes(q)
            ));
        }
    }, [search, hospitals]);

    // Detect active hospital from URL
    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const maybeId = pathParts[1];
        if (/^[a-f\d]{24}$/i.test(maybeId)) {
            setActiveHospitalId(maybeId);
        }
    }, []);

    if (!isSuperAdmin) return null;

    const fetchHospitals = async () => {
        try {
            setLoading(true);
            const res = await apiClient<HospitalApiResponse>('/hospital/hospital');
            const data = (res as any)?.hospitals || (res as any)?.data || res || [];
            setHospitals(Array.isArray(data) ? data : []);
            setFiltered(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[HospitalSwitcher] Failed to fetch hospitals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = (hospital: Hospital) => {
        const hospitalId = hospital._id;

        // Store in localStorage and cookie for tenant context
        localStorage.setItem('activeHospitalId', hospitalId);
        document.cookie = `hospitalId=${hospitalId}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

        setActiveHospitalId(hospitalId);
        setIsOpen(false);
        setSearch('');

        // Navigate to hospital-admin portal in tenant context
        router.push(`/${hospitalId}/hospital-admin`);
    };

    const activeHospital = hospitals.find(h => h._id === activeHospitalId);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                    isOpen
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600'
                }`}
                title="Switch Hospital Context"
            >
                <Building2 size={15} className={isOpen ? 'text-white' : 'text-blue-500'} />
                <span className="hidden sm:inline max-w-[120px] truncate">
                    {activeHospital ? activeHospital.name : 'Switch Hospital'}
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                            SuperAdmin — Hospital Context
                        </p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                            Select a hospital to manage
                        </p>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search hospitals..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Hospital List */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-sm">Loading hospitals...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400">
                                {search ? 'No hospitals match your search' : 'No hospitals found'}
                            </div>
                        ) : (
                            filtered.map(hospital => {
                                const isActive = hospital._id === activeHospitalId;
                                return (
                                    <button
                                        key={hospital._id}
                                        onClick={() => handleSwitch(hospital)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                                            isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {/* Hospital Icon */}
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            <Building2 size={16} />
                                        </div>

                                        {/* Hospital Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${
                                                isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'
                                            }`}>
                                                {hospital.name}
                                            </p>
                                            {(hospital.city || hospital.state) && (
                                                <p className="text-xs text-gray-400 truncate">
                                                    {[hospital.city, hospital.state].filter(Boolean).join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Active indicator or arrow */}
                                        {isActive ? (
                                            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                                        ) : (
                                            <ExternalLink size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] text-gray-400 text-center">
                            Switching hospital sets the <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">X-Hospital-Id</code> context
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
