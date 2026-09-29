'use client';

import React, { useState, useMemo, useEffect } from "react";
import {
    Search,
    Phone,
    MessageSquare,
    RefreshCw,
    ArrowLeft,
    Activity,
    X
} from "lucide-react";
import { useHelpdeskDoctors } from "@/lib/integrations";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

function DoctorsList() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [selectedDept, setSelectedDept] = useState("all");

    // ⚡ Debounce search term to prevent excessive re-calculating
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // ⚡ Use React Query hook for instant cached data
    const { data: doctorsData, isLoading, isFetching, refetch, isPlaceholderData } = useHelpdeskDoctors();

    // ⚡ Memoized valid doctors list
    const doctors = useMemo(() => {
        if (!doctorsData) return [];
        return doctorsData.filter((doc: any) =>
            (doc.user?.name && doc.user.name !== 'Unknown') ||
            (doc.name && doc.name !== 'Unknown')
        );
    }, [doctorsData]);

    // ⚡ Memoized unique departments list
    const departments = useMemo(() => {
        const depts = new Set(doctors.map((doc: any) => doc.department || doc.specialties?.[0]).filter(Boolean));
        return Array.from(depts).sort() as string[];
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        return doctors.filter((doc: any) => {
            const name = (doc.user?.name || doc.name || "").toLowerCase();
            const specialty = (doc.specialties?.[0] || doc.specialty || doc.department || "").toLowerCase();
            const dept = (doc.department || doc.specialties?.[0] || "").toLowerCase();
            const matchesSearch = name.includes(debouncedSearchTerm.toLowerCase()) || specialty.includes(debouncedSearchTerm.toLowerCase());
            const matchesDept = selectedDept === "all" || dept === selectedDept.toLowerCase();
            return matchesSearch && matchesDept;
        });
    }, [doctors, debouncedSearchTerm, selectedDept]);

    // ⚡ Only show loading on TRUE initial load (no cached data)
    const showSkeleton = isLoading && !doctorsData;
    const showRefreshing = isFetching && !isLoading && doctorsData;

    if (showSkeleton) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* PROFESSIONAL HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 max-w-full mx-auto">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/helpdesk" className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600">
                            <ArrowLeft size={16} />
                        </Link>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medical Personnel / Active Duty Matrix</span>
                    </div>
                    <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Physician Registry Control
                    </h1>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Hospital Node / Provider Management</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
                    <select 
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-tight outline-none shadow-sm focus:border-teal-500 appearance-none cursor-pointer"
                    >
                        <option value="all">ALL DEPARTMENTS</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                        ))}
                    </select>

                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[14px]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SEARCH..."
                            className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-tight outline-none shadow-sm focus:border-teal-500"
                            aria-label="Filter physicians"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => {
                    toast.loading('Refreshing page...', { duration: 1000 });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                  }}
                        disabled={isFetching}
                        className="p-2 sm:p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg sm:rounded-xl hover:text-teal-600 shadow-sm disabled:opacity-50"
                        aria-label="Refresh doctors"
                    >
                        <RefreshCw size={16} className={`${showRefreshing ? 'animate-spin' : ''} sm:size-[18px]`} />
                    </button>
                </div>
            </div>

            {/* DOCTORS GRID */}
            <div className="max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.length > 0 ? filteredDoctors.map((doc: any) => {
                    const name = (doc.user?.name || doc.name || "Dr. Anonymous").toUpperCase();
                    const specialty = (doc.specialties?.[0] || doc.specialty || "General Medicine").toUpperCase();
                    const qualifications = doc.qualifications?.join(", ") || (doc as any).qualification || "MBBS, MD";
                    const status = doc.user?.status || "active";
                    const mobile = doc.user?.mobile || (doc as any).profile?.mobile || "CONTACT N/A";
                    const email = doc.user?.email || (doc as any).profile?.email || "EMAIL-NOT-LISTED";
                    const experienceStart = doc.experienceStart || (doc as any).profile?.experienceStart;
                    const calculatedExp = experienceStart ? Math.max(0, new Date().getFullYear() - new Date(experienceStart).getFullYear()) : null;
                    const experience = calculatedExp !== null 
                        ? `${calculatedExp} YEARS` 
                        : (doc.experienceYears ? `${doc.experienceYears} YEARS` : "EXP N/A");

                    return (
                        <div key={doc._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group flex flex-col gap-5 h-full hover:border-teal-500 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-slate-200 shrink-0">
                                        {name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight truncate max-w-[180px]">{name}</h3>
                                        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.2em] mt-0.5 truncate">{specialty}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {status === 'active' ? 'Active' : 'Offline'}
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-[20px] p-4 border border-slate-100 space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Credentials</p>
                                    <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">{qualifications}</p>
                                </div>
                                <div className="h-px bg-slate-200/50 w-full" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                        <p className="text-[10px] font-black text-slate-700 uppercase">{experience}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Registration</p>
                                        <p className="text-[10px] font-black text-slate-700 uppercase">REG-{doc._id.slice(-6).toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 text-center sm:text-left">
                                <div className="flex items-center gap-3 px-1 text-slate-500 group-hover:text-slate-900 transition-colors">
                                    <Phone size={14} className="shrink-0 text-teal-600" />
                                    <span className="text-[10px] font-bold tracking-tight uppercase leading-none">{mobile}</span>
                                </div>
                                <div className="flex items-center gap-3 px-1 text-slate-500 group-hover:text-slate-900 transition-colors">
                                    <MessageSquare size={14} className="shrink-0 text-teal-600" />
                                    <span className="text-[10px] font-bold tracking-tight lowercase truncate leading-none">{email}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Record Active</span>
                                <div className="flex items-center gap-1 text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                                    Verified
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Physician Object Bound</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoBox({ icon, label, value }: any) {
    return (
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">{icon} {label}</span>
            <span className="text-[10px] font-bold text-slate-700 uppercase">{value}</span>
        </div>
    );
}

export default React.memo(DoctorsList);
