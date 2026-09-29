"use client";

import React, {  useState , useMemo } from 'react';
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import { 
  Users, 
  Search, 
  Filter, 
  User,  
  Activity,
  ArrowUpRight,
  TrendingUp,
  Mail,
  Phone,
  BadgeCheck
} from "lucide-react";

function HospitalAdminPatients() {
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ React Query for instant caching
  const { data: patients = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ['hospital-admin-patients'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getPatients();
        return data.patients || [];
      } catch (error: any) {
        console.error("Failed to fetch patients:", error);
        toast.error(error.message || "Failed to load patients");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobile?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Patient Registry...</p>
      </div>
    );
  }

    return (
        <div className="p-3 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Simple Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Demographics</h1>
                    <p className="text-sm text-slate-500 font-medium">Monitoring {patients.length} active institutional profiles</p>
                </div>
                <div className="px-3 py-1.5 bg-blue-50 rounded-lg flex items-center gap-2 border border-blue-100">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Database Sync</span>
                </div>
            </div>

            {/* Simple Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Total Enrolled", value: patients.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Registry Growth", value: "+12.4%", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Operational Flow", value: "Balanced", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Filter Bar */}
            <div className="bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Search patient name, contact, or ID reference..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                    />
                </div>
                <button className="flex items-center gap-2 px-3 md:px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                    <Filter className="w-3.5 h-3.5" /> Filter Results
                </button>
            </div>

            {/* Clean Patient Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.map((patient) => (
                    <div key={patient._id} className="bg-white rounded-2xl p-3 md:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <User size={24} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm md:text-lg font-black text-slate-900 truncate leading-tight">{patient.name}</h3>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter mt-1 inline-flex items-center gap-1.5">
                                    <BadgeCheck size={10} /> PID: {patient._id.slice(-8).toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pb-6 border-b border-slate-50 mb-6 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    <Mail size={12} className="text-slate-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 truncate">{patient.email || "No clinical email"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    <Phone size={12} className="text-slate-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600">{patient.mobile || "N/A"}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50/50 p-2 md:p-4 rounded-xl mb-4">
                            <div className="text-center flex-1 border-r border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Visits</p>
                                <p className="text-sm font-black text-slate-900">{patient.totalAppointments || 0}</p>
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Active Since</p>
                                <p className="text-[10px] font-black text-blue-600 uppercase">
                                    {patient.lastAppointment ? new Date(patient.lastAppointment).toLocaleDateString() : 'Enrolling'}
                                </p>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                            Clinical Profile <ArrowUpRight size={14} strokeWidth={3} />
                        </button>
                    </div>
                ))}

                {filteredPatients.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="text-slate-200 w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Registry Search Failure</h3>
                        <p className="text-sm text-slate-400 mt-2 font-medium italic">No clinical profiles match your current search parameters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}


// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminPatients);
