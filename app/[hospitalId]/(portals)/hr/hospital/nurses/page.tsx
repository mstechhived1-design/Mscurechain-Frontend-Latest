"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { hospitalAdminService } from "@/lib/integrations";
import { ConfirmModal } from '@/components/admin/Modal';
import {
    Users,
    Plus,
    Edit,
    Eye,
    Briefcase,
    Search,
    Filter,
    ShieldCheck,
    Building2,
    Ban,
    UserCheck
} from "lucide-react";
import { PageHeader } from "@/components/admin";
import { InfrastructureCheck } from "../../../hospital-admin/components/InfrastructureCheck";

export default function HRHospitalNurses() {
    const router = useRouter();
    const { hospitalId } = useParams() as any;
    const [nurses, setNurses] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [nursesData, typesData] = await Promise.all([
                hospitalAdminService.getNurses(),
                import('@/lib/integrations/services/ipd.service').then(m => m.ipdService.getUnitTypes().catch(() => []))
            ]);
            setNurses(nursesData.nurses || []);
            setUnitTypes(typesData);
        } catch (error: any) {
            console.error("Failed to fetch data:", error);
            toast.error(error.message || "Failed to load registry");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, name: string, currentStatus: string) => {
        const isActivating = currentStatus === 'inactive';
        setConfirmModal({
            isOpen: true,
            title: `${isActivating ? 'Reactivate' : 'Deactivate'} Nurse`,
            message: `Are you sure you want to ${isActivating ? 'reactivate' : 'deactivate'} ${name}? ${isActivating ? 'Login access will be restored.' : 'Login access will be suspended.'}`,
            onConfirm: async () => {
                try {
                    setDeleteLoading(id);
                    const { hrService } = await import("@/lib/integrations");
                    if (isActivating) {
                        await hrService.activateStaff(id);
                    } else {
                        await hrService.deactivateStaff(id);
                    }
                    toast.success(`${name} ${isActivating ? 'reactivated' : 'deactivated'} successfully`);
                    fetchInitialData();
                } catch (error: any) {
                    console.error("Failed to update nurse status:", error);
                    toast.error(error.message || "Failed to update status");
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
            !filterDepartment || (
                Array.isArray(nurse.department)
                    ? nurse.department.includes(filterDepartment)
                    : nurse.department === filterDepartment
            );

        return matchesSearch && matchesDepartment;
    });

    return (
        <InfrastructureCheck>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageHeader
                        icon={<Users className="text-emerald-500" />}
                        title="Nursing Registry"
                        subtitle={`Governance view of ${nurses.length} active clinical nursing nodes`}
                    />
                    <button
                        onClick={() => router.push(`/${hospitalId}/hr/hospital/nurses/create`)}
                        className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all "
                    >
                        <Plus className="w-4 h-4" /> Add Nurse
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full lg:w-auto">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-48">
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept: any) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-500">Accessing secure nodes...</p>
                    </div>
                ) : filteredNurses.length === 0 ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <Users className="mx-auto mb-4 text-gray-300" size={48} />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No personnel found</h3>
                        <p className="text-sm text-gray-500 mt-1">Registry is empty for current criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNurses.map((nurse) => (
                            <div key={nurse._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shadow-sm">
                                                {nurse.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                                                    {nurse.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-1">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> {nurse.employeeId || 'ID PENDING'}
                                                </div>
                                            </div>
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
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                                <Building2 size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2.5">Active Departments</p>
                                                {Array.isArray(nurse.department) && nurse.department.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {nurse.department.filter(Boolean).map((dept: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100/50 dark:border-blue-800/50 text-[10px] font-bold uppercase tracking-tight shadow-sm transition-all hover:scale-105 active:scale-95"
                                                            >
                                                                {dept}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-tight">
                                                        {typeof nurse.department === 'string' && nurse.department ? nurse.department : 'General Staff'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-700">
                                        <button
                                            onClick={() => router.push(`/${hospitalId}/hr/staff/${nurse._id}`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                                        >
                                            <Eye size={14} /> Profile
                                        </button>
                                        <button
                                            onClick={() => router.push(`/${hospitalId}/hr/staff/edit/${nurse._id}`)}
                                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(nurse._id, nurse.name, nurse.status)}
                                            disabled={deleteLoading === nurse._id}
                                            className={`p-3 rounded-xl transition-all disabled:opacity-50 ${nurse.status === 'inactive'
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-900/20 dark:text-emerald-400'
                                                : 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white dark:bg-amber-900/20 dark:text-amber-400'
                                                }`}
                                            title={nurse.status === 'inactive' ? "Reactivate Nurse" : "Deactivate Nurse"}
                                        >
                                            {deleteLoading === nurse._id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                nurse.status === 'inactive' ? <UserCheck size={16} /> : <Ban size={16} />
                                            )}
                                        </button>
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
        </InfrastructureCheck>
    );
}
