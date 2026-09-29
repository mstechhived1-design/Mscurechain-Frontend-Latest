"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Stethoscope, Plus, Trash2, Mail, Phone, Award,
  Calendar, Search, Filter, ShieldCheck, ShieldOff,
  Pencil, CalendarClock
} from "lucide-react";
import { RegistrySkeleton } from "@/components/admin/Skeletons";
import { ConfirmModal } from '@/components/admin/Modal';
import { useTenantLink } from '@/hooks/useTenantLink';
import LeaveManagementModal from "./DoctorLeavePanel";

function MasterHelpdeskDoctors() {
  const router = useRouter();
  const { getPath } = useTenantLink();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  // Which doctor's leave panel to show
  const [leaveDoctor, setLeaveDoctor] = useState<any | null>(null);

  const { data: doctors = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['masterhelpdesk-doctors'],
    queryFn: async () => {
      const data = await hospitalAdminService.getDoctors();
      return data.doctors || [];
    },
    staleTime: 30000,
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const handleDeactivate = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true, title: "Deactivate Doctor",
      message: `Deactivate Dr. ${name}?`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try { await hospitalAdminService.deactivateDoctor(id); toast.success(`Dr. ${name} deactivated`); refetch(); }
        catch (e: any) { toast.error(e.message || "Failed"); }
        finally { setDeleteLoading(null); setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleActivate = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true, title: "Activate Doctor",
      message: `Activate Dr. ${name}?`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:toggle`);
        try { await hospitalAdminService.activateDoctor(id); toast.success(`Dr. ${name} activated`); refetch(); }
        catch (e: any) { toast.error(e.message || "Failed"); }
        finally { setDeleteLoading(null); setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true, title: "Delete Doctor",
      message: `Permanently delete Dr. ${name}? This cannot be undone.`,
      onConfirm: async () => {
        setDeleteLoading(`${id}:delete`);
        try { await hospitalAdminService.deleteDoctor(id); toast.success(`Dr. ${name} deleted`); refetch(); }
        catch (e: any) { toast.error(e.message || "Failed"); }
        finally { setDeleteLoading(null); setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const specialties = useMemo(() =>
    Array.from(new Set(doctors.flatMap(d => (d.specialties || []).map((s: string) => String(s || '').trim())))).sort(),
    [doctors]
  );

  const filteredDoctors = useMemo(() => doctors.filter(d => {
    const q = searchTerm.toLowerCase();
    return (!q || d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.doctorId?.toLowerCase().includes(q))
      && (!filterSpecialty || d.specialties?.includes(filterSpecialty));
  }), [doctors, searchTerm, filterSpecialty]);

  if (loading && !doctors.length) return <div className="pF-6"><RegistrySkeleton gridCol={3} count={6} /></div>;

  return (
    <div className="space-y-6 min-h-screen p-2 md:p-6 pb-28 md:pb-6">

      {/* Leave Management Modal */}
      {leaveDoctor && (
        <LeaveManagementModal doctor={leaveDoctor} onClose={() => setLeaveDoctor(null)} />
      )}

      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">Doctors Registry</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">{doctors.length} registered doctor{doctors.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => router.push(getPath('/masterhelpdesk/doctors/create'))}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-primary-theme text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all  shrink-0">
          <Plus size={14} strokeWidth={3} /> <span className="hidden sm:inline">Add Doctor</span><span className="sm:hidden">Add Doctor</span>
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Search by name, email or ID…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>
        <div className="relative sm:w-52">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none appearance-none cursor-pointer">
            <option value="">All Specialties</option>
            {specialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Stethoscope className="text-slate-200 w-14 h-14 mx-auto mb-3" />
          <p className="font-bold text-slate-900">No doctors found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map(doctor => {
            const isActive = doctor.status !== "inactive";
            return (
              <div key={doctor._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden flex flex-col">

                {/* Card top */}
                <div className="p-5 flex items-start gap-4 border-b border-slate-50">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg group-hover:bg-primary-theme transition-all duration-300 shrink-0 overflow-hidden">
                    {doctor.profilePic
                      ? <img src={doctor.profilePic} className="w-full h-full object-cover" alt="" />
                      : (doctor.name || "D")[0]}
                  </div>

                  {/* Name + specialty */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{doctor.name}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">
                      {(doctor.specialties || []).slice(0, 2).join(" · ") || "Doctor"}
                    </p>
                  </div>

                  {/* Edit icon + status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"
                    }`}>{isActive ? "Active" : "Inactive"}</span>
                    {/* Edit pencil icon */}
                    <button
                      onClick={() => router.push(getPath(`/masterhelpdesk/doctors/edit/${doctor._id}`))}
                      title="Edit doctor"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="px-5 py-3 space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{doctor.mobile || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{doctor.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Award size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{(doctor.qualifications || []).join(", ") || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={11} className="text-slate-400 shrink-0" />
                    <span>{doctor.experienceYears ? `${doctor.experienceYears} yrs exp.` : "N/A"}</span>
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex gap-2">
                  {/* Leave Management button — primary action */}
                  <button
                    onClick={() => setLeaveDoctor(doctor)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-theme text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shadow-md shadow-teal-500/20">
                    <CalendarClock size={12} /> Leave
                  </button>

                  {/* Activate / Deactivate */}
                  <button
                    onClick={() => isActive ? handleDeactivate(doctor._id, doctor.name) : handleActivate(doctor._id, doctor.name)}
                    title={isActive ? "Deactivate" : "Activate"}
                    disabled={!!deleteLoading}
                    className={`px-3 py-2.5 rounded-xl border transition-all ${
                      isActive
                        ? "border-amber-200 text-amber-500 hover:bg-amber-50"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}>
                    {isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(doctor._id, doctor.name)}
                    title="Delete"
                    disabled={!!deleteLoading}
                    className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-400 hover:bg-rose-50 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

export default React.memo(MasterHelpdeskDoctors);
