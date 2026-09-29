"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Mail,
  Phone,
  Briefcase,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { ConfirmModal } from '@/components/admin/Modal';

function HospitalAdminHRManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const { data: hrs = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['hospital-admin-hrs'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getHR();
        return data.hrs || [];
      } catch (error: any) {
        console.error("Failed to fetch HR users:", error);
        toast.error(error.message || "Failed to load HR users");
        return [];
      }
    },
    staleTime: 0,
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'Reactivate' : 'Deactivate';

    setConfirmModal({
      isOpen: true,
      title: `${action} HR Representative`,
      message: `Are you sure you want to ${action.toLowerCase()} this HR node? Operational access will be ${newStatus === 'active' ? 'restored' : 'suspended'}.`,
      onConfirm: async () => {
        try {
          setDeleteLoading(`${id}:toggle`);
          if (newStatus === 'active') {
            await hospitalAdminService.activateHR(id);
          } else {
            await hospitalAdminService.deactivateHR(id);
          }
          toast.success(`HR node ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`);
          refetch();
        } catch (error: any) {
          console.error(`Failed to ${action} HR:`, error);
          toast.error(error.message || "Operation failed");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent HR Node Purge",
      message: `Are you sure you want to permanently delete HR Representative ${name}? This action is irreversible and requires the node to be in an inactive state.`,
      onConfirm: async () => {
        try {
          setDeleteLoading(`${id}:delete`);
          await hospitalAdminService.deleteHR(id);
          toast.success("HR node purged from institutional registry");
          refetch();
        } catch (error: any) {
          console.error("Failed to delete HR:", error);
          toast.error(error.message || "Purge failed — ensure node is inactive first");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredHRs = useMemo(() => hrs.filter((hr) => {
    return hr.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           hr.email?.toLowerCase().includes(searchTerm.toLowerCase());
  }), [hrs, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6 mt-4 md:mt-6">
        
        {/* Top Row: Title, Action Button */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  HR Management
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                  Manage human resource personnel for your hospital
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end w-full xl:w-auto shrink-0 relative">
            <button
              onClick={() => router.push('hr/create')}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all h-[34px] shadow-sm whitespace-nowrap"
            >
              <Plus size={14} strokeWidth={3} className="shrink-0" /> Add HR Manager
            </button>
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
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredHRs.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-slate-200 w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 italic">No HR personnel found</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Add your first HR manager to start managing staff.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredHRs.map((hr) => (
            <div key={hr._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
              <div className="p-2 md:p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Users size={24} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm md:text-lg font-black text-slate-900 truncate">{hr.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${hr.status === 'inactive' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {hr.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 md:p-6 space-y-4 flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Mail size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 truncate">{hr.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 truncate">{hr.mobile}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 truncate">HR Manager</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => router.push(`hr/edit/${hr._id}`)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all font-bold text-xs flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(hr._id, hr.status || 'active')}
                    disabled={!!deleteLoading && deleteLoading.startsWith(hr._id)}
                    className={`p-2.5 rounded-xl border border-slate-200 transition-all font-bold text-xs flex items-center justify-center min-w-[44px] ${hr.status === 'inactive' ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200' : 'text-amber-500 hover:bg-amber-50 hover:border-amber-200'}`}
                    title={hr.status === 'inactive' ? "Reactivate Node" : "Deactivate Node"}
                  >
                    {deleteLoading === `${hr._id}:toggle` ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      hr.status === 'inactive' ? <ShieldCheck size={16} /> : <ShieldOff size={16} />
                    )}
                  </button>

                  {hr.status === 'inactive' && (
                    <button
                      onClick={() => handleDelete(hr._id, hr.name)}
                      disabled={!!deleteLoading && deleteLoading.startsWith(hr._id)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-50"
                      title="Permanent Wipe"
                    >
                      {deleteLoading === `${hr._id}:delete` ? (
                        <div className="h-4 w-4 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

export default React.memo(HospitalAdminHRManagement);
