"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Stethoscope,
  Plus,
  Edit,
  Mail,
  Award,
  Calendar,
  Search,
  Filter,
  Ban,
  UserCheck
} from "lucide-react";
import { InfrastructureCheck } from "../../../hospital-admin/components/InfrastructureCheck";

function HRHospitalDoctors() {
  const router = useRouter();
  const { hospitalId } = useParams() as any;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const { data: doctors = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['hr-doctors'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getDoctors();
        return data.doctors || [];
      } catch (error: any) {
        console.error("Failed to fetch doctors:", error);
        toast.error(error.message || "Failed to load doctors");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate Dr. ${name}?`)) {
      return;
    }

    setDeleteLoading(`${id}:toggle`);
    try {
      const { hrService } = await import("@/lib/integrations");
      await hrService.deactivateStaff(id);
      toast.success(`Dr. ${name} has been deactivated`);
      refetch();
    } catch (error: any) {
      console.error("Failed to deactivate doctor:", error);
      toast.error(error.message || "Failed to deactivate doctor");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleActivate = async (id: string, name: string) => {
    setDeleteLoading(`${id}:toggle`);
    try {
      const { hrService } = await import("@/lib/integrations");
      await hrService.activateStaff(id);
      toast.success(`Dr. ${name} has been activated`);
      refetch();
    } catch (error: any) {
      console.error("Failed to activate doctor:", error);
      toast.error(error.message || "Failed to activate doctor");
    } finally {
      setDeleteLoading(null);
    }
  };


  const specialties = useMemo(() =>
    Array.from(new Set(doctors.flatMap((d) => (d.specialties || []).map((s: string) => String(s || '').trim())))).sort(),
    [doctors]
  );

  const filteredDoctors = useMemo(() => doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.doctorId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      !filterSpecialty ||
      doctor.specialties?.includes(filterSpecialty);

    return matchesSearch && matchesSpecialty;
  }), [doctors, searchTerm, filterSpecialty]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Accessing doctor registry...</p>
        </div>
      </div>
    );
  }

  return (
    <InfrastructureCheck>
      <div className="space-y-6 sm:space-y-8 bg-slate-50/50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">Clinical Consultants</h1>
            <p className="text-[10px] md:text-sm text-slate-500 font-medium mt-1">Registry of {doctors.length} verified medical faculty</p>
          </div>
          <button
            onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors/create`)}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/10"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} /> Onboard Physician
          </button>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by faculty name, physician ID, or clinical email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div className="relative w-full md:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="">Global Specialties</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="text-slate-200 w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 italic">No faculty members detected</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">Recalibrate your search parameters or onboard new faculty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div key={doctor._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
                <div className="p-4 sm:p-6 bg-slate-50 relative border-b border-slate-100">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Stethoscope size={80} className="text-slate-900" />
                  </div>
                  <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 overflow-hidden shadow-sm">
                      {doctor.profilePic ? (
                        <img src={doctor.profilePic} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope size={24} strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">{doctor.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                          {doctor.doctorId || 'ID_PENDING'}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${doctor.status === 'inactive' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                          {doctor.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 flex-1 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(doctor.specialties || []).slice(0, 2).map((s: string, i: number) => (
                      <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {s}
                      </span>
                    ))}
                    {(doctor.specialties || []).length > 2 && (
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                        +{(doctor.specialties || []).length - 2}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <Mail size={12} className="text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 truncate">{doctor.email || "No clinical email"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <Award size={12} className="text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 truncate">{doctor.qualifications?.join(', ') || 'General Physician'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <Calendar size={12} className="text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {doctor.experienceStart
                          ? `${Math.max(0, new Date().getFullYear() - new Date(doctor.experienceStart).getFullYear())} Years Experience`
                          : doctor.experienceYears
                            ? `${doctor.experienceYears} Years Experience`
                            : 'Experience N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/50 p-3 sm:p-4 rounded-xl mb-3 sm:mb-4">
                    <div className="text-center flex-1 border-r border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Consultation</p>
                      <p className="text-sm font-black text-slate-900">₹{doctor.consultationFee || '0'}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Rating</p>
                      <p className="text-sm font-black text-blue-600 flex items-center justify-center gap-1">
                        4.8 <span className="text-[10px] text-slate-300 font-bold">★</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors/${doctor.doctorProfileId || doctor._id}`)}
                      className="flex-1 py-2 sm:py-3 bg-blue-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10"
                    >
                      Full Profile
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => router.push(`/${hospitalId}/hr/hospital/doctors/edit/${doctor._id}`)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-all hover:bg-slate-50"
                        title="Edit Profile"
                      >
                        <Edit size={14} className="sm:w-4 sm:h-4" />
                      </button>

                      <button
                        onClick={() => doctor.status === 'inactive' ? handleActivate(doctor.doctorProfileId || doctor._id, doctor.name) : handleDeactivate(doctor.doctorProfileId || doctor._id, doctor.name)}
                        disabled={!!deleteLoading && deleteLoading.startsWith(doctor.doctorProfileId || doctor._id)}
                        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 transition-all disabled:opacity-50 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 ${doctor.status === 'inactive'
                          ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                          : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                          }`}
                        title={doctor.status === 'inactive' ? "Reactivate Doctor" : "Deactivate Doctor"}
                      >
                        {deleteLoading === `${doctor.doctorProfileId || doctor._id}:toggle` ? (
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          doctor.status === 'inactive' ? <><UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} /> <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Reactivate</span></> : <><Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} /> <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Deactivate</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InfrastructureCheck>
  );
}

export default React.memo(HRHospitalDoctors);
