"use client";

import React, { useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Headphones, Plus, Edit2, Trash2, Phone, Mail, Search,
  Copy, Check, KeyRound, Eye, EyeOff, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Modal, ConfirmModal } from "@/components/admin";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Helpdesk {
  _id: string; name?: string; email?: string; mobile?: string;
  loginId?: string; status?: string; additionalNotes?: string;
  assignedStaff?: { user?: { name: string } };
}
interface Credentials { name: string; loginId: string; password: string; }
type Errs = Partial<Record<string, string>>;

// ─── Validators ──────────────────────────────────────────────────────────────
const V: Record<string, (v: string) => string> = {
  name:          v => !v.trim() ? "Full name is required" : !/^[a-zA-Z\s.'-]+$/.test(v.trim()) ? "Only letters, spaces, dots & hyphens" : "",
  email:         v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email — e.g. user@hospital.com" : "",
  mobile:        v => !v ? "Mobile is required" : v.length !== 10 ? `${v.length}/10 digits — must be exactly 10` : "",
  password:      v => !v ? "Password is required" : v.length < 6 ? `Too short — ${v.length}/6 chars minimum` : "",
  designation:   v => !v.trim() ? "Designation is required" : "",
  panNumber:     v => v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()) ? "Invalid PAN — e.g. ABCDE1234F" : "",
  aadharNumber:  v => v && v.length !== 12 ? `${v.length}/12 digits — must be exactly 12` : "",
  accountNumber: v => v && (v.length < 9 || v.length > 18) ? "Must be 9–18 digits" : "",
  ifscCode:      v => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? "Invalid IFSC — e.g. HDFC0001234" : "",
};
const vld = (f: string, v: string) => V[f] ? V[f](v) : "";

// ─── Tiny inline components ───────────────────────────────────────────────────
function FErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={11}/>{msg}</p>;
}

interface IFProps {
  label: string; name: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  error?: string; touched?: boolean; type?: string;
  placeholder?: string; required?: boolean; extraCls?: string;
}
function IField({ label, name, value, onChange, onBlur, error, touched, type = "text", placeholder, required, extraCls = "" }: IFProps) {
  const hasErr = touched && !!error;
  const isOk   = touched && !error && value.trim() !== "";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type} name={name} value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-8 border rounded-lg text-sm outline-none transition-all ${extraCls}
            ${hasErr ? "border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-400/20"
              : isOk  ? "border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-400/20"
              : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10"}`}
        />
        {isOk && <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>}
      </div>
      <FErr msg={hasErr ? error : undefined}/>
    </div>
  );
}

// ─── Default form data ────────────────────────────────────────────────────────
const EMPTY_FORM = () => ({
  honorific: "Mr",
  name: "", email: "", mobile: "", password: "", gender: "", dateOfBirth: "",
  designation: "Helpdesk", employeeId: "", employmentType: "full-time",
  joiningDate: new Date().toISOString().split('T')[0],
  shift: "", startTime: "09:00", endTime: "17:00",
  weeklyOff: ["Saturday", "Sunday"] as string[],
  baseSalary: "0", panNumber: "", aadharNumber: "",
  pfNumber: "", esiNumber: "", uanNumber: "",
  accountName: "", accountNumber: "", bankName: "", ifscCode: "",
  notes: "",
});

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TAB_ORDER = ["basic", "employment", "schedule", "financial", "bank"] as const;


// ─── Component ────────────────────────────────────────────────────────────────
export default function HelpdeskManagement() {
  const router = useRouter();
  const pathname = usePathname() as string;
  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";
  const params = useParams() as any;
  const hospitalId = params.hospitalId as string;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCredModalOpen,   setIsCredModalOpen]   = useState(false);

  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk | null>(null);
  const [createdCreds,     setCreatedCreds]      = useState<Credentials | null>(null);
  const [showPassword,     setShowPassword]      = useState(false);
  const [activeTab,        setActiveTab]         = useState("basic");
  const [copiedField,      setCopiedField]       = useState<string | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM());
  const [errors,   setErrors]   = useState<Errs>({});
  const [touched,  setTouched]  = useState<Record<string,boolean>>({});
  const [loading,  setLoading]  = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: helpdesks = [], isLoading: isHelpdesksLoading } = useQuery({
    queryKey: ['helpdesks'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getHelpdesks();
      return (resp.helpdesks || []).map((h: any) => ({
        ...h, loginId: h.loginId || h.logid || `HELP-${h._id?.slice(-4)}`
      }));
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['hospital-shifts'],
    queryFn: () => hospitalAdminService.getShifts()
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (field: string, value: string) => {
    // Input-level guards
    if (field === 'mobile'        && !/^\d{0,10}$/.test(value)) return;
    if (field === 'aadharNumber'  && !/^\d{0,12}$/.test(value)) return;
    if (field === 'accountNumber' && !/^\d{0,18}$/.test(value)) return;
    if (field === 'panNumber'     && value.length > 10)          return;
    if (field === 'ifscCode'      && value.length > 11)          return;
    if (field === 'baseSalary'    && !/^\d*$/.test(value))       return;
    if (['pfNumber','esiNumber','uanNumber'].includes(field) && value.length > 30) return;
    if (field === 'name'          && value.length > 100)          return;
    if (field === 'employeeId'    && value.length > 20)           return;

    if (field === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [field]: value, gender }));
      if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
      return;
    }

    setFormData(p => ({ ...p, [field]: value }));
    if (touched[field]) setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const blur = (field: string, value: string) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(p => ({ ...p, [field]: vld(field, value) }));
  };

  const touchAll = () => {
    const fields = ["name","email","mobile","password","designation","panNumber","aadharNumber","accountNumber","ifscCode"];
    const nt: Record<string,boolean> = {}, ne: Errs = {};
    fields.forEach(f => { nt[f] = true; ne[f] = vld(f, (formData as any)[f] ?? ""); });
    setTouched(p => ({ ...p, ...nt }));
    setErrors(p => ({ ...p, ...ne }));
    return Object.values(ne).every(e => !e);
  };

  const toggleDay = (day: string) =>
    setFormData(p => ({ ...p, weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d => d !== day) : [...p.weeklyOff, day] }));

  // ── Clipboard ──────────────────────────────────────────────────────────────
  const copyToClipboard = useCallback((val?: string, label = "Copied", fieldKey?: string) => {
    if (!val) return;
    const afterCopy = () => {
      toast.success(label);
      if (fieldKey) { setCopiedField(fieldKey); setTimeout(() => setCopiedField(null), 2000); }
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = val;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? afterCopy() : toast.error('Copy failed — please copy manually');
      } catch { toast.error('Copy not supported in this browser'); }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(val).then(afterCopy).catch(fallback);
    } else { fallback(); }
  }, []);

  // ── Edit / Delete / Reset ──────────────────────────────────────────────────
  const handleEditClick = (h: Helpdesk) => {
    router.push(`/${hospitalId}${basePath}/helpdesks/${h._id}/edit`);
  };


  const handleToggleStatus = async (h: Helpdesk) => {
    const isActivating = h.status === 'inactive';
    const action = isActivating ? 'Reactivate' : 'Deactivate';

    setConfirmModal({
      isOpen: true,
      title: `${action} Hub Account`,
      message: isActivating 
        ? `Ready to restore operational status for ${h.name || 'this personnel'}?` 
        : `Are you sure you want to deactivate ${h.name || 'this personnel'}? Dashboard access will be suspended but credentials will be preserved.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await hospitalAdminService.updateHelpdesk(h._id, { status: isActivating ? 'active' : 'inactive' });
          toast.success(isActivating ? "Account reactivated" : "Account suspended");
          queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
        } catch (err: any) {
          toast.error(err.message || "Status change failed");
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const onDeleteConfirm = async () => {
    if (!selectedHelpdesk) return;
    if (selectedHelpdesk.status !== 'inactive') {
      toast.error("Account must be deactivated (status: inactive) before permanent deletion.");
      setIsDeleteModalOpen(false);
      return;
    }
    try {
      await hospitalAdminService.deleteHelpdesk(selectedHelpdesk._id);
      toast.success("Staff removed permanently"); 
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['helpdesks'] });
    } catch (err: any) { 
      toast.error(err.message || "Delete failed"); 
    }
  };

  const onResetPassword = async (h: Helpdesk) => {
    if (!window.confirm(`Reset password for ${h.name || 'this staff'}?`)) return;
    try {
      const newPass = Math.random().toString(36).slice(-8).toUpperCase();
      await hospitalAdminService.updateHelpdesk(h._id, { password: newPass });
      setCreatedCreds({ name: h.name||"Helpdesk Staff", loginId: h.loginId||"", password: newPass });
      setShowPassword(false); setIsCredModalOpen(true);
    } catch { toast.error("Reset failed"); }
  };

  const filtered = helpdesks.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.loginId?.toLowerCase().includes(search.toLowerCase()) ||
    h.mobile?.includes(search)
  );

  const atCapacity = helpdesks.length >= 2;

  // ── Field helpers ──────────────────────────────────────────────────────────
  const f = (field: string): IFProps => ({
    label: "", name: field,
    value: (formData as any)[field] ?? "",
    onChange: v => set(field, v),
    onBlur:   () => blur(field, (formData as any)[field] ?? ""),
    error:   errors[field],
    touched: touched[field],
  });

  const bCls = (field: string, val: string) =>
    touched[field] && errors[field]  ? "border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-400/20"
    : touched[field] && !errors[field] && val ? "border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-400/20"
    : "border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mt-4 md:mt-6">
        
        {/* Top Row: Title, Action Button */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <Headphones className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Helpdesk Staff
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                  Manage support hub personnel and credentials
                </p>
                {/* Capacity indicator */}
                <div className="flex items-center gap-2 mt-1.5 hidden md:flex">
                  {[0,1].map(i => (
                    <span key={i} className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      helpdesks[i]
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {helpdesks[i] ? `● Desk ${i+1}: ${helpdesks[i].name?.split(' ')[0] || 'Active'}` : `○ Desk ${i+1}: Empty`}
                    </span>
                  ))}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    atCapacity ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}>
                    {helpdesks.length}/2 slots used
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center w-full xl:w-auto shrink-0 relative">
            <button
              disabled={atCapacity}
              onClick={() => {
                if (atCapacity) return;
                router.push(`/${hospitalId}${basePath}/helpdesks/create`);
              }}
              title={atCapacity ? "Maximum 2 helpdesk accounts allowed per hospital" : "Add new helpdesk staff"}
              className={`w-full xl:w-auto flex items-center justify-center gap-2 px-3 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all h-[34px] shadow-sm whitespace-nowrap ${
                atCapacity
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Plus size={14} strokeWidth={3} className="shrink-0" /> Add Hub Staff
            </button>
            {atCapacity && (
              <p className="text-[9px] text-amber-600 font-semibold mt-1.5 text-right w-full">
                ⚠ Max 2 helpdesk pairs allowed per hospital
              </p>
            )}
          </div>
        </div>

        {/* Bottom Row: Control Center (Search, Filters) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-gray-50 pt-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
            
            {/* Search Bar */}
            <div className="relative flex-1 w-full lg:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, login ID, or mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">NAME</th>
                <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONTACT</th>
                <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">LOGIN ID</th>
                <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">STATUS</th>
                <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isHelpdesksLoading ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">Loading personnel records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-sm italic">No helpdesk accounts found.</td></tr>
              ) : filtered.map(h => (
                <tr key={h._id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-2 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        {(h.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{h.name || h.assignedStaff?.user?.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-2 md:px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={13} className="text-slate-400"/>{h.mobile||"—"}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><Mail size={13} className="text-slate-400"/>{h.email||"—"}</div>
                    </div>
                  </td>
                  <td className="px-2 md:px-6 py-4">
                    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-700">{h.loginId||"—"}</span>
                      {h.loginId && (
                        <button type="button" onClick={() => copyToClipboard(h.loginId, "Login ID copied!", h._id)}
                          className="text-slate-300 hover:text-blue-500 transition-colors" title="Copy Login ID">
                          <Copy size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 md:px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      h.status === 'inactive' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {h.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-2 md:px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => onResetPassword(h)} className="text-orange-400 hover:text-orange-600 transition-colors" title="Reset Password"><KeyRound size={17}/></button>
                      <button type="button" onClick={() => handleEditClick(h)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit"><Edit2 size={17}/></button>
                      
                      {/* Toggle Status */}
                      <button type="button" onClick={() => handleToggleStatus(h)} className={`${h.status === 'inactive' ? 'text-emerald-500 hover:text-emerald-700' : 'text-amber-400 hover:text-amber-600'} transition-colors`} title={h.status === 'inactive' ? "Activate" : "Deactivate"}>
                        {h.status === 'inactive' ? <ShieldCheck size={17}/> : <ShieldOff size={17}/>}
                      </button>

                      {/* Delete - Only enabled if inactive */}
                      <button 
                        type="button" 
                        onClick={() => { setSelectedHelpdesk(h); setIsDeleteModalOpen(true); }} 
                        className={`${h.status === 'inactive' ? 'text-red-400 hover:text-red-600' : 'text-slate-300 cursor-not-allowed'} transition-colors`} 
                        title={h.status === 'inactive' ? "Permanently Remove" : "Deactivate before deleting"}
                        disabled={h.status !== 'inactive'}
                      >
                        <Trash2 size={17}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      {/* ─── Credentials Modal ────────────────────────────────────────────── */}
      <Modal isOpen={isCredModalOpen} onClose={()=>setIsCredModalOpen(false)} title="Helpdesk Credentials" maxWidth="max-w-md">
        <div className="pt-2 space-y-5">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <ShieldCheck size={22} className="text-emerald-500 shrink-0"/>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Account ready!</p>
              <p className="text-xs text-emerald-600">Save these credentials — the password won't be shown again.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
              {(createdCreds?.name||"H").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Staff Member</p>
              <p className="text-sm font-semibold text-slate-700">{createdCreds?.name}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 md:p-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs md:text-base font-mono font-bold text-slate-800 tracking-wider select-all">{createdCreds?.loginId}</span>
              <button type="button" onClick={()=>copyToClipboard(createdCreds?.loginId,"Login ID copied!","loginId")}
                className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 bg-white transition-all ${copiedField==='loginId'?'text-emerald-600 border-emerald-300 bg-emerald-50':'text-blue-600 hover:text-blue-700 border-blue-200'}`}>
                {copiedField==='loginId'?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy</>}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 md:p-4 space-y-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Password (one-time visible)</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs md:text-base font-mono font-bold text-slate-800 tracking-wider">
                {showPassword ? createdCreds?.password : "••••••••"}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {showPassword?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
                <button type="button" onClick={()=>copyToClipboard(createdCreds?.password,"Password copied!","password")}
                  className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 bg-white transition-all ${copiedField==='password'?'text-emerald-600 border-emerald-300 bg-emerald-50':'text-amber-700 hover:text-amber-800 border-amber-300'}`}>
                  {copiedField==='password'?<><Check size={13}/>Copied!</>:<><Copy size={13}/>Copy</>}
                </button>
              </div>
            </div>
          </div>

          <button type="button"
            onClick={()=>{const t=`Name: ${createdCreds?.name}\nLogin ID: ${createdCreds?.loginId}\nPassword: ${createdCreds?.password}`;copyToClipboard(t,"All credentials copied!","both");}}
            className={`w-full border rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${copiedField==='both'?'border-emerald-300 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {copiedField==='both'?<><Check size={14}/>All Credentials Copied!</>:<><Copy size={14}/>Copy All Credentials</>}
          </button>

          <div className="flex justify-end pt-1">
            <button type="button" onClick={()=>setIsCredModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-2 rounded-lg text-sm font-medium transition-all">
              Done
            </button>
          </div>
        </div>
      </Modal>


      {/* ─── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={()=>setIsDeleteModalOpen(false)}
        onConfirm={onDeleteConfirm}
        title="Remove Hub Staff"
        message="Are you sure? This will immediately revoke their dashboard access and credentials. This action cannot be undone."
        confirmText="Remove Access"
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
