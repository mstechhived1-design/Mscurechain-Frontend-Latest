"use client";

import React, { useState } from 'react';
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import {
  Phone,
  Mail,
  Search,
  Copy,
  Info
} from "lucide-react";
import { InfrastructureCheck } from "../../../hospital-admin/components/InfrastructureCheck";

export default function HRHospitalHelpdesk() {
  const [search, setSearch] = useState("");

  const { data: helpdesks = [], isLoading: isHelpdesksLoading } = useQuery({
    queryKey: ['helpdesks'],
    queryFn: async () => {
      const resp = await hospitalAdminService.getHelpdesks();
      return (resp.helpdesks || []).map((h: any) => ({
        ...h,
        loginId: h.loginId || h.logid || `HELP-${h._id?.slice(-4)}`
      }));
    }
  });

  const copyToClipboard = (val?: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success("Copied to clipboard");
  };

  const filtered = helpdesks.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.loginId?.toLowerCase().includes(search.toLowerCase()) ||
    h.mobile?.includes(search)
  );

  return (
    <InfrastructureCheck>
      <div className="space-y-6 bg-slate-50/50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">Helpdesk Staff Directory</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Personnel overview of support hub accounts (Read-Only)</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Mode</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Filter by name, ID, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none transition-all text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PERSONNEL NAME</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTACT INFO</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">LOGIN ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ACCOUNT STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isHelpdesksLoading ? (
                  <tr><td colSpan={4} className="py-20 text-center text-slate-400 text-xs italic">Syncing support hub records...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-slate-400 text-xs italic">No matching personnel records detected.</td></tr>
                ) : filtered.map((h) => (
                  <tr key={h._id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{h.name || h.assignedStaff?.user?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          {h.mobile}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                          <Mail size={12} className="text-slate-400" />
                          {h.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-mono font-black text-slate-700">{h.loginId}</span>
                        <button onClick={() => copyToClipboard(h.loginId)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {h.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </InfrastructureCheck>
  );
}
