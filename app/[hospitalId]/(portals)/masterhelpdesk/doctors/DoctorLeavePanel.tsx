"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import masterDoctorLeaveService, { DoctorLeave } from "@/lib/integrations/masterDoctorLeaveService";
import toast from "react-hot-toast";
import {
  X, Plus, Trash2, CheckCircle2, XCircle, Clock, Loader2, Calendar
} from "lucide-react";

const LEAVE_TYPES = ["sick", "casual", "emergency", "maternity", "vacation", "other"];

const STATUS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending:  { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",  icon: <Clock size={10} /> },
  approved: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200",icon: <CheckCircle2 size={10} /> },
  rejected: { bg: "bg-rose-50",    text: "text-rose-500",    border: "border-rose-200",   icon: <XCircle size={10} /> },
};

// ─── Create Leave Form (inline inside modal) ───────────────────────────────────
function CreateLeaveForm({ doctorId, onClose }: { doctorId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "", leaveType: "sick" });
  const mut = useMutation({
    mutationFn: () => masterDoctorLeaveService.createLeave({ doctorId, ...form }),
    onSuccess: () => { toast.success("Leave request created"); qc.invalidateQueries({ queryKey: ["doctor-leaves", doctorId] }); onClose(); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div className="border border-teal-100 bg-teal-50/40 rounded-2xl p-4 space-y-3 mt-2">
      <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">New Leave Request</p>
      <div className="grid grid-cols-2 gap-2">
        {[{ label: "Start", key: "startDate" }, { label: "End", key: "endDate" }].map(({ label, key }) => (
          <div key={key}>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
            <input type="date" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-[10px] outline-none focus:border-teal-500 bg-white" />
          </div>
        ))}
      </div>
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Type</label>
        <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
          className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-[10px] outline-none focus:border-teal-500 bg-white capitalize">
          {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason</label>
        <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
          placeholder="Reason for leave..."
          className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-[10px] outline-none focus:border-teal-500 resize-none bg-white" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:bg-slate-50">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.startDate || !form.endDate || !form.reason}
          className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
          {mut.isPending ? <Loader2 size={12} className="animate-spin" /> : "Submit"}
        </button>
      </div>
    </div>
  );
}

// ─── Leave Management Modal ────────────────────────────────────────────────────
export default function LeaveManagementModal({
  doctor,
  onClose,
}: {
  doctor: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-leaves", doctor._id],
    queryFn: () => masterDoctorLeaveService.getLeavesByDoctor(doctor._id),
    staleTime: 30000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => masterDoctorLeaveService.deleteLeave(id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["doctor-leaves", doctor._id] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "approved" | "rejected"; note?: string }) =>
      masterDoctorLeaveService.updateStatus(id, status, note !== undefined ? note : (reviewNote || undefined)),
    onSuccess: (_, { status }) => {
      toast.success(`Leave ${status}`);
      qc.invalidateQueries({ queryKey: ["doctor-leaves", doctor._id] });
      setReviewingId(null);
      setReviewNote("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = data || [];
  const leaves = filter === "all" ? all : all.filter(l => l.status === filter);
  const counts = {
    pending:  all.filter(l => l.status === "pending").length,
    approved: all.filter(l => l.status === "approved").length,
    rejected: all.filter(l => l.status === "rejected").length,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-black text-white text-base shrink-0">
                {(doctor.name || "D")[0]}
              </div>
              <div>
                <h2 className="text-sm font-black text-white">{doctor.name}</h2>
                <p className="text-teal-300 text-[9px] font-bold uppercase tracking-widest">
                  {(doctor.specialties || []).slice(0, 2).join(" · ") || "Doctor"} • Leave Management
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
              <X size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 shrink-0">
          {[
            { label: "Pending",  count: counts.pending,  c: "text-amber-600"  },
            { label: "Approved", count: counts.approved, c: "text-emerald-600"},
            { label: "Rejected", count: counts.rejected, c: "text-rose-500"   },
          ].map(({ label, count, c }) => (
            <div key={label} className="py-3 text-center">
              <p className={`text-xl font-black ${c}`}>{count}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Filter + Add button */}
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-1">
              {["all", "pending", "approved", "rejected"].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all capitalize ${
                    filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}>{s === "all" ? `All (${all.length})` : s}</button>
              ))}
            </div>
            <button onClick={() => setShowForm(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                showForm ? "bg-slate-100 text-slate-500" : "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-500/20"
              }`}>
              <Plus size={11} /> {showForm ? "Cancel" : "Add"}
            </button>
          </div>

          {/* Inline create form */}
          {showForm && <CreateLeaveForm doctorId={doctor._id} onClose={() => setShowForm(false)} />}

          {/* Leave list */}
          {isLoading ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Loader2 size={24} className="animate-spin text-teal-500" />
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Loading…</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Calendar size={20} className="text-slate-300" />
              </div>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No leave records</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaves.map(leave => {
                const sc = STATUS[leave.status];
                const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / 86400000) + 1;
                const isReviewing = reviewingId === leave._id;

                return (
                  <div key={leave._id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:border-slate-200">
                    {/* Leave summary row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${sc.bg} ${sc.text} ${sc.border}`}>
                            {sc.icon} {leave.status}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100 capitalize">{leave.leaveType}</span>
                          <span className="text-[8px] font-black text-teal-600">{days}d</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600">
                          {new Date(leave.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → {new Date(leave.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{leave.reason}</p>
                        {leave.reviewNote && <p className="text-[9px] text-slate-400 italic mt-0.5">Note: {leave.reviewNote}</p>}
                      </div>

                      {leave.status === "pending" && !isReviewing && (
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => { setReviewingId(leave._id); setReviewNote(""); }}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase hover:bg-slate-700 transition-all">
                            Review
                          </button>
                          <button onClick={() => deleteMut.mutate(leave._id)} disabled={deleteMut.isPending}
                            className="p-1.5 border border-rose-200 text-rose-400 rounded-xl hover:bg-rose-50 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                      {leave.status === "approved" && (
                        <div className="flex gap-1.5 shrink-0">
                          <button 
                            onClick={() => {
                              if (confirm("Are you sure you want to withdraw this approved leave?")) {
                                reviewMut.mutate({ id: leave._id, status: "rejected", note: "Withdrawn after approval" });
                              }
                            }}
                            disabled={reviewMut.isPending}
                            className="px-3 py-1.5 border border-amber-200 text-amber-600 bg-amber-50 rounded-xl text-[8px] font-black uppercase hover:bg-amber-100 transition-all disabled:opacity-50">
                            Withdraw
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline review row */}
                    {isReviewing && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <input value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                          placeholder="Review note (optional)..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[10px] outline-none focus:border-teal-500 bg-white" />
                        <div className="flex gap-2">
                          <button onClick={() => setReviewingId(null)}
                            className="flex-1 py-2 border border-slate-200 text-slate-400 rounded-xl text-[8px] font-black uppercase hover:bg-slate-50">
                            Cancel
                          </button>
                          <button onClick={() => reviewMut.mutate({ id: leave._id, status: "rejected" })} disabled={reviewMut.isPending}
                            className="flex-1 py-2 border border-rose-200 text-rose-500 bg-rose-50 rounded-xl text-[8px] font-black uppercase hover:bg-rose-100 disabled:opacity-50">
                            Reject
                          </button>
                          <button onClick={() => reviewMut.mutate({ id: leave._id, status: "approved" })} disabled={reviewMut.isPending}
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                            {reviewMut.isPending ? <Loader2 size={10} className="animate-spin" /> : "Approve"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
