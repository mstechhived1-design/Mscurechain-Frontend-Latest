"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import { 
  AlertTriangle, 
  Settings, 
  ArrowRight, 
  Layers, 
  Clock, 
  Home, 
  Bed, 
  Activity,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ReadinessData {
  isReady: boolean;
  counts: {
    departments: number;
    shifts: number;
    rooms: number;
    beds: number;
    vitalsThresholds: number;
  };
}

export function InfrastructureCheck({ children }: { children: React.ReactNode }) {
  const params = useParams() as any;
  const hospitalId = params?.hospitalId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["infrastructure-readiness", hospitalId],
    queryFn: () => hospitalAdminService.getInfrastructureReadiness(),
    enabled: !!hospitalId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If there's an error fetching readiness, we show a warning banner but let them see children
  if (error || !data?.success) {
    console.error("Infrastructure readiness check failed:", error);
    return (
      <div className="relative">
        <div className="mb-6 flex items-center justify-between px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">Infrastructure Status Unknown</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium italic">Unable to verify hospital readiness. Onboarding may be restricted.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-black text-amber-600 uppercase hover:underline"
          >
            Retry Check
          </button>
        </div>
        {children}
      </div>
    );
  }

  const readiness = data.data;

  if (readiness.isReady) {
    return (
      <div className="relative">
        {/* Success Banner when Infrastructure is Validated */}
        <div className="mb-6 flex items-center justify-between px-6 py-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Hospital Infrastructure Validated</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium italic">All mandatory setup components are initialized and active.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">System Ready</span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  const requirements = [
    { 
      label: "Departments", 
      count: readiness.counts.departments, 
      icon: <Layers size={18} />, 
      link: `/${hospitalId}/hospital-admin/management/departments` 
    },
    { 
      label: "Shifts", 
      count: readiness.counts.shifts, 
      icon: <Clock size={18} />, 
      link: `/${hospitalId}/hospital-admin/attendance/schedules` 
    },
    { 
      label: "Rooms", 
      count: readiness.counts.rooms, 
      icon: <Home size={18} />, 
      link: `/${hospitalId}/hospital-admin/management/rooms` 
    },
    { 
      label: "Beds", 
      count: readiness.counts.beds, 
      icon: <Bed size={18} />, 
      link: `/${hospitalId}/hospital-admin/management/beds` 
    },
    { 
      label: "Vitals Thresholds", 
      count: readiness.counts.vitalsThresholds, 
      icon: <Activity size={18} />, 
      link: `/${hospitalId}/hospital-admin/management/vitals-thresholds` 
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all hover:shadow-blue-500/10">
        <div className="p-8 md:p-12">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-8 animate-pulse">
            <AlertTriangle size={40} className="text-amber-600 dark:text-amber-500" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Hospital Infrastructure Required
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl">
            To maintain medical accuracy and operational integrity, you must set up the core hospital infrastructure before adding clinical team members.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {requirements.map((req) => (
              <Link 
                key={req.label}
                href={req.link}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group ${
                  req.count > 0 
                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50" 
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${
                    req.count > 0 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  }`}>
                    {req.icon}
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900 dark:text-slate-100">
                      {req.label}
                    </span>
                    <span className={`text-xs ${req.count > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                      {req.count > 0 ? `${req.count} Created` : "Setup Pending"}
                    </span>
                  </div>
                </div>
                {req.count === 0 && (
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                )}
                {req.count > 0 && (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href={`/${hospitalId}/hospital-admin/hospital/details`}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <Settings size={20} />
              Hospital Profile Setup
            </Link>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-all active:scale-95"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
