"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import { ConfirmModal } from '@/components/admin/Modal';
import {
    Users,
    Plus,
    Trash2,
    Edit,
    Eye,
    Mail,
    Phone,
    Briefcase,
    Search,
    Filter,
    ShieldCheck,
    ShieldOff,
    Building2,
} from "lucide-react";
import { PageHeader } from "@/components/admin";
import { RegistrySkeleton } from "@/components/admin/Skeletons";
import { useTenantLink } from "@/hooks/useTenantLink";

export default function HospitalAdminNurses() {
    const router = useRouter();
    const params = useParams() as any;
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink();
    const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
    const hospitalId = params.hospitalId as string;
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    const { data: nursesData, isLoading: loading, refetch } = useQuery({
        queryKey: ['hospital-admin-nurses'],
        queryFn: async () => {
            const [nursesResp, typesData] = await Promise.all([
                hospitalAdminService.getNurses(),
                import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => []))
            ]);
            return {
                nurses: nursesResp.nurses || [],
                unitTypes: typesData || []
            };
        },
        staleTime: 30000,
        placeholderData: (previousData) => previousData,
    });

    const nurses = nursesData?.nurses || [];
    const unitTypes = nursesData?.unitTypes || [];

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'Reactivate' : 'Deactivate';
        
        setConfirmModal({
            isOpen: true,
            title: `${action} Nurse`,
            message: `Are you sure you want to ${action.toLowerCase()} this nursing node?`,
            onConfirm: async () => {
                try {
                    setDeleteLoading(id);
                    await hospitalAdminService.updateStaff(id, { status: newStatus });
                    toast.success(`Nursing credentials ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`);
                    refetch();
                } catch (error: any) {
                    console.error(`Failed to ${action} nurse:`, error);
                    toast.error(error.message || "Failed to update status");
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
            title: "Permanent Deletion",
            message: `Are you sure you want to permanently delete ${name}? This action is irreversible and will wipe all credentials and metadata for this clinical node.`,
            onConfirm: async () => {
                try {
                    setDeleteLoading(id);
                    await hospitalAdminService.deleteStaff(id);
                    toast.success("Nursing node permanently deleted");
                    refetch();
                } catch (error: any) {
                    console.error("Failed to delete nurse:", error);
                    toast.error(error.message || "Deletion failed — node might still be active");
                } finally {
                    setDeleteLoading(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const departments = Array.from(new Set(unitTypes.filter(Boolean))).sort();

    const filteredNurses = nurses.filter((nurse) => {
        const matchesSearch =
            nurse.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nurse.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nurse.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment =
            !filterDepartment || 
            (Array.isArray(nurse.department) 
                ? nurse.department.includes(filterDepartment) 
                : nurse.department === filterDepartment);

        return matchesSearch && matchesDepartment;
    });

    return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50 animate-in fade-in duration-500">
        {/* Dynamic Header */}
        <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
            
            {/* Top Row: Title, Action Button */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 xl:gap-4 shrink-0">
                    <div className="shrink-0 flex items-center gap-2 px-1">
                        <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg text-emerald-500">
                            <Users className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                Nursing Registry
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
                                Command & Control for {nurses.length} active clinical nursing nodes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end w-full xl:w-auto shrink-0 relative">
                    <button
                        onClick={() => router.push(`/${hospitalId}${basePath}/nurses/create`)}
                        className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-2 bg-primary-theme text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all h-[34px] shadow-sm whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={3} className="shrink-0" /> Add Nurse
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
                            placeholder="Search by name, email, or ID..."
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
                            <option value="">All Departments</option>
                            {departments.map((dept: any) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>

            {loading && !nursesData ? (
                <RegistrySkeleton count={6} />
            ) : filteredNurses.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Users className="mx-auto mb-4 text-gray-300" size={48} />
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">No personnel found</h3>
                    <p className="text-sm text-gray-500 mt-1">Registry is empty for current criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNurses.map((nurse) => (
                        <div key={nurse._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
                            <div className="p-2 md:p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary-theme/40 dark:bg-primary-theme/20 flex items-center justify-center text-xl font-black text-primary-theme dark:text-primary-theme border border-primary-theme/10 dark:border-primary-theme/80 shadow-sm">
                                            {nurse.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                                                {nurse.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-theme mt-1">
                                                <ShieldCheck className="w-3.5 h-3.5" /> {nurse.employeeId || 'ID PENDING'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            nurse.status === 'active' 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                            : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                            {nurse.status || 'active'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Briefcase size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Designation</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{nurse.designation || 'Clinical Nurse'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Building2 size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Department</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(Array.isArray(nurse.department)
                                                    ? nurse.department
                                                    : String(nurse.department || 'General Facility').split(',').map((d: string) => d.trim()).filter(Boolean)
                                                ).map((dept: string, i: number) => (
                                                    <span key={i} className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase tracking-wide">
                                                        {dept}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Phone size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Phone Number</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{nurse.mobile || nurse.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
                                            <Mail size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email Address</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{nurse.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-700">
                                    <button
                                        onClick={() => router.push(`/${hospitalId}${basePath}/staff/${nurse._id}`)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary-theme/80 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        <Eye size={14} /> Profile
                                    </button>
                                    <button
                                        onClick={() => router.push(`/${hospitalId}${basePath}/staff/edit/${nurse._id}`)}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-blue-500 hover:text-white transition-all"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    
                                    {nurse.status !== 'inactive' ? (
                                        <button
                                            onClick={() => handleToggleStatus(nurse._id, nurse.status || 'active')}
                                            disabled={deleteLoading === nurse._id}
                                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                                            title="Deactivate clinical node"
                                        >
                                            <ShieldOff size={16} />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleToggleStatus(nurse._id, nurse.status)}
                                                disabled={deleteLoading === nurse._id}
                                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                                title="Reactivate clinical node"
                                            >
                                                <ShieldCheck size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(nurse._id, nurse.name)}
                                                disabled={deleteLoading === nurse._id}
                                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-rose-400 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                                title="Permanent purge"
                                            >
                                                {deleteLoading === nurse._id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </>
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
