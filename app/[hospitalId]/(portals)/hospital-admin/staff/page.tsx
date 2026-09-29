"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from '@tanstack/react-query';
import { hospitalAdminService } from "@/lib/integrations";
import {
  Users,
  Trash2,
  Edit,
  Mail,
  Phone,
  Search,
  Filter,
  UserPlus,
  Briefcase,
  Building2,
  ShieldCheck,
  ShieldOff,
  Shield
} from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmModal } from '@/components/admin/Modal';

// ============================================================================
// PERFORMANCE: Pagination Settings
// ============================================================================
const ITEMS_PER_PAGE = 21; // 3 items per row, 7 rows

// ============================================================================
// PERFORMANCE: Memoized Staff Card
// ============================================================================
const StaffCard = React.memo(({
  member,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  deleteLoading
}: {
  member: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (status: string) => void;
  deleteLoading: boolean;
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
      <div className="p-2 md:p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              {member.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-lg font-black text-slate-900 leading-tight wrap-break-word">
                {member.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-md border border-slate-100">
                  {member.employeeId || 'NO_ID'}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${member.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                  {member.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Briefcase size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Designation</p>
              <p className="text-xs font-bold text-slate-700">{member.designation || 'Specialist'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
              <Building2 size={14} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
              <p className="text-xs font-bold text-slate-700">{member.department || 'General Admin'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 px-1 border-t border-slate-50 pt-4">
          <div className="flex-1 flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate">
            <Phone size={12} className="text-slate-400" />
            <span>{member.mobile || member.phone || 'N/A'}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate">
            <Mail size={12} className="text-slate-400" />
            <span className="truncate">{member.email || 'N/A'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 py-3 rounded-xl bg-primary-theme text-white hover:bg-primary-theme/80 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            Profile
          </button>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="px-4 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onToggleStatus(member.status || 'active')}
              disabled={deleteLoading}
              className={`px-4 rounded-xl bg-white border border-slate-200 transition-all disabled:opacity-50 ${
                member.status === 'inactive' 
                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200' 
                : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'
              }`}
              title={member.status === 'inactive' ? "Reactivate Personnel" : "Deactivate Personnel"}
            >
              {member.status === 'inactive' ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
            </button>
            {member.status === 'inactive' && (
              <button
                onClick={onDelete}
                disabled={deleteLoading}
                className="px-4 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all disabled:opacity-50"
                title="Permanent Master Delete"
              >
                {deleteLoading ? (
                  <div className="h-4 w-4 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

StaffCard.displayName = 'StaffCard';

function HospitalAdminStaff() {
  const router = useRouter();
  const params = useParams() as any;
  const pathname = usePathname() as string;
  const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
  const hospitalId = params.hospitalId as string;
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });

  const { data: staff = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['hospital-admin-staff'],
    queryFn: async () => {
      try {
        const data = await hospitalAdminService.getStaff();
        return data.staff || [];
      } catch (error: any) {
        console.error("Failed to fetch staff:", error);
        toast.error(error.message || "Failed to load staff");
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 15 * 60 * 1000,
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'Reactivate' : 'Deactivate';

    setConfirmModal({
      isOpen: true,
      title: `${action} Personnel`,
      message: `Are you sure you want to ${action.toLowerCase()} this personnel node?`,
      onConfirm: async () => {
        try {
          setDeleteLoading(id);
          await hospitalAdminService.updateStaff(id, { status: newStatus });
          toast.success(`Personnel node ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`);
          refetch();
        } catch (error: any) {
          console.error(`Failed to ${action} staff:`, error);
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
      title: "Permanent Node Purge",
      message: `Are you sure you want to permanently delete ${name}? This action is irreversible and will wipe all credentials and metadata for this clinical node.`,
      onConfirm: async () => {
        try {
          setDeleteLoading(id);
          await hospitalAdminService.deleteStaff(id);
          toast.success("Personnel node permanently deleted");
          refetch();
        } catch (error: any) {
          console.error("Failed to delete staff:", error);
          toast.error(error.message || "Deletion failed — node might still be active");
        } finally {
          setDeleteLoading(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((member: any) => {
      const matchesSearch =
        member.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        member.employeeId?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        member.email?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesDept = !filterDepartment || member.department === filterDepartment;

      return matchesSearch && matchesDept;
    });
  }, [staff, debouncedSearch, filterDepartment]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    staff.forEach((member: any) => {
      if (member.department) {
        const dArray = Array.isArray(member.department) 
            ? member.department 
            : String(member.department).split(',').map(d => d.trim()).filter(Boolean);
        dArray.forEach((d: string) => depts.add(d));
      }
    });
    return Array.from(depts);
  }, [staff]);

  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredStaff.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStaff, page]);

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterDepartment]);

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        {/* Top Row: Title, Action Button */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-1">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                  Staff Management
                </h1>
                <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                  {filteredStaff.length} active institutional nodes
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end w-full xl:w-auto shrink-0 relative">
            <button
              onClick={() => router.push(`/${hospitalId}${basePath}/staff/create`)}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all h-[34px] shadow-sm whitespace-nowrap"
            >
              <UserPlus size={14} strokeWidth={3} className="shrink-0" /> Add Staff
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
                placeholder="Search name, employee ID, or secure email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Filter */}
            <div className="relative w-full lg:w-48 shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 uppercase tracking-widest outline-none h-[34px] cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Global Filter</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Users className="mx-auto mb-6 text-slate-200" size={64} strokeWidth={1} />
          <h3 className="text-xl font-black text-slate-900 italic">No personnel detected</h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">Try recalibrating your search parameters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedStaff.map((member) => (
              <StaffCard
                key={member._id || member.staffProfileId}
                member={member}
                onView={() => router.push(`/${hospitalId}${basePath}/staff/${member._id || member.staffProfileId}`)}
                onEdit={() => router.push(`/${hospitalId}${basePath}/staff/edit/${member._id || member.staffProfileId}`)}
                onDelete={() => handleDelete(member._id || member.staffProfileId, member.name)}
                onToggleStatus={(status) => handleToggleStatus(member._id || member.staffProfileId, status)}
                deleteLoading={deleteLoading === (member._id || member.staffProfileId)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-2 md:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all"
              >
                Prev
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Layer {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Registry Information Footer */}
      <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 px-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm italic">
          <Shield size={16} />
          <span>Personnel Registry compliant with HMS-P Master Control Protocols</span>
        </div>
      </div>

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

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminStaff);
