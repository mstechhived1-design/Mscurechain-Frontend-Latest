'use client';

import React, { useState, useMemo, useEffect } from "react";
import {
    Search,
    Phone,
    MessageSquare,
    RefreshCw,
    ArrowLeft,
    Activity,
    X,
    ChevronDown
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
        <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-300">

            {/* CONSOLIDATED HEADER & CONTROLS */}
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3.5 max-w-full mx-auto">
                {/* Row 1: Back + Title + Subtitle + Refresh & Doctor Count */}
                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Link href="/helpdesk" className="p-1.5 sm:p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm shrink-0">
                            <ArrowLeft size={18} className="sm:size-[20px]" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap flex items-center gap-2">
                                Physician Registry Control
                            </h1>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                Medical Personnel <span className="hidden sm:inline">• Active Duty Matrix</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-lg hidden sm:flex items-center gap-1.5 shadow-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">
                                {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                toast.loading('Refreshing page...', { duration: 1000 });
                                setTimeout(() => {
                                    window.location.reload();
                                }, 800);
                            }}
                            disabled={isFetching}
                            className="p-1.5 sm:p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-teal-600 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            aria-label="Refresh doctors"
                            title="Refresh Registry"
                        >
                            <RefreshCw size={15} className={`${showRefreshing ? 'animate-spin' : ''} sm:size-[16px]`} />
                        </button>
                    </div>
                </div>

                {/* Row 2: Search Bar AND Department Filter in the SAME ROW */}
                <div className="flex items-center gap-2 w-full">
                    {/* Department Filter */}
                    <div className="relative w-36 sm:w-52 shrink-0">
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="w-full pl-2.5 sm:pl-3.5 pr-7 sm:pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-[9px] sm:text-xs font-bold uppercase tracking-tight outline-none shadow-inner focus:bg-white focus:border-teal-500 appearance-none cursor-pointer truncate transition-all"
                        >
                            <option value="all">ALL DEPARTMENTS</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 group min-w-0">
                        <Search className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-[13px] sm:size-[15px]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Doctor, Specialty..."
                            className="w-full pl-8 sm:pl-10 pr-7 sm:pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-teal-500 shadow-inner transition-all"
                            aria-label="Filter physicians"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-0.5"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* DOCTORS GRID */}
            <div className="max-w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
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
                        <div key={doc._id} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs group flex flex-col gap-3 sm:gap-4 h-full hover:border-teal-500/40 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base sm:text-xl shadow-sm shrink-0">
                                        {name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 uppercase tracking-tight truncate">{name}</h3>
                                        <p className="text-[8.5px] sm:text-[9.5px] font-bold text-teal-600 uppercase tracking-wider mt-0.5 truncate">{specialty}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest border shrink-0 ${status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {status === 'active' ? 'Active' : 'Offline'}
                                </div>
                            </div>

                            <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3 border border-slate-100 space-y-2">
                                <div className="space-y-0.5">
                                    <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest">Credentials</p>
                                    <p className="text-[9.5px] sm:text-[10px] font-black text-slate-700 uppercase leading-snug line-clamp-1">{qualifications}</p>
                                </div>
                                <div className="h-px bg-slate-200/50 w-full" />
                                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                        <p className="text-[9.5px] sm:text-[10px] font-black text-slate-700 uppercase">{experience}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest">Registration</p>
                                        <p className="text-[9.5px] sm:text-[10px] font-black text-slate-700 uppercase truncate">REG-{doc._id.slice(-6).toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                                <div className="flex items-center gap-2 px-0.5 text-slate-600 group-hover:text-slate-900 transition-colors">
                                    <Phone size={13} className="shrink-0 text-teal-600" />
                                    <span className="text-[10px] font-bold tracking-tight uppercase font-mono">{mobile}</span>
                                </div>
                                <div className="flex items-center gap-2 px-0.5 text-slate-500 group-hover:text-slate-900 transition-colors">
                                    <MessageSquare size={13} className="shrink-0 text-teal-600" />
                                    <span className="text-[10px] font-bold tracking-tight lowercase truncate">{email}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-2.5 sm:pt-3 flex items-center justify-between border-t border-slate-100">
                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Record Active</span>
                                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                    Verified
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                        <Activity size={28} className="text-slate-300 mx-auto mb-2" />
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
