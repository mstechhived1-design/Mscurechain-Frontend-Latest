"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Upload,
    Search,
    Building2,
    Users,
    FileText,
    CheckCircle2,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { ConfirmModal } from '@/components/admin/Modal';
import GenericBulkImportModal from '@/components/admin/GenericBulkImportModal';

const DepartmentsManagement = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // New Dept State
    const [newDept, setNewDept] = useState({ name: "", code: "" });
    const [editingDept, setEditingDept] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await ipdService.getIPDDepartments();
            setDepartments(data);
        } catch (error) {
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await ipdService.createIPDDepartment(newDept);
            toast.success("Department created successfully");
            setShowAddModal(false);
            setNewDept({ name: "", code: "" });
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Failed to create department");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Department",
            message: `Are you sure you want to delete the ${name} department?`,
            onConfirm: async () => {
                try {
                    await ipdService.deleteIPDDepartment(id);
                    toast.success("Department removed");
                    fetchDepartments();
                } catch (error) {
                    toast.error("Failed to delete department");
                }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDept) return;
        try {
            setSubmitting(true);
            await ipdService.updateIPDDepartment(editingDept._id, {
                name: editingDept.name,
                code: editingDept.code
            });
            toast.success("Department updated successfully");
            setShowEditModal(false);
            setEditingDept(null);
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || "Failed to update department");
        } finally {
            setSubmitting(false);
        }
    };

    const handleImportSuccess = () => {
        fetchDepartments();
    };

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Dynamic Header with Advanced Filters */}
            <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
                
                {/* Top Row: Identification, Process Button, and Stats */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
                    
                    <div className="shrink-0 flex items-center gap-2 px-1">
                        <div className="p-1.5 md:p-2 bg-teal-50 rounded-lg text-teal-600">
                            <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                Departments
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                                IPD Infrastructure & Resource Mapping
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><Building2 className="w-4 h-4 text-teal-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Active Units</span>
                                <span className="text-sm font-bold text-gray-700 leading-none">{departments.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50/50 rounded-lg border border-blue-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><Users className="w-4 h-4 text-blue-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-blue-600/70">Strategic Codes</span>
                                <span className="text-sm font-bold text-blue-700 leading-none">
                                    {departments.filter(d => d.code).length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">System Health</span>
                                <span className="text-sm font-bold text-emerald-700 leading-none">
                                    100%
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 border-l border-gray-100 pl-2 ml-1">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shrink-0 h-[34px]"
                            >
                                <Upload size={14} className="shrink-0" /> Bulk Import
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-3 md:px-6 py-2 bg-primary-theme text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shrink-0 h-[34px]"
                            >
                                <Plus size={14} className="shrink-0" /> New Dept
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Control Center (Search, Filters, View Toggles) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
                        
                        {/* Search Bar - Takes remaining width */}
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Search departments..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>

                        {/* COMPACT PAGINATION */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-2 h-[34px]">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronLeft size={14} strokeWidth={3} />
                                </button>
                                <span className="text-[10px] font-black w-8 text-center text-gray-700">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-50 shadow-sm gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500/10 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-50 shadow-sm text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                        <Building2 size={40} />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-2">Inventory Empty</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No departments found matching your criteria</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {paginated.map((dept) => (
                        <div key={dept._id} className="group bg-white rounded-[24px] border border-slate-100 p-2 md:p-4 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                            <div>
                                <div className="absolute top-0 right-0 p-3 flex gap-1.5 z-10">
                                    <button
                                        onClick={() => {
                                            setEditingDept(dept);
                                            setShowEditModal(true);
                                        }}
                                        className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <FileText size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dept._id, dept.name)}
                                        className="w-7 h-7 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg">
                                        <FileText size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate pr-12 leading-tight">{dept.name}</h3>
                                    <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest mt-0.5">
                                        REF: {dept.code || "N/A"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-emerald-100">
                                        Active
                                    </span>
                                    <span className="text-[7px] font-bold text-slate-300">
                                        ID {dept._id.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Creation Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-3 md:p-6 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Deploy Unit</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Initiate new clinical department node</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-3 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] md:max-h-none overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department Name</label>
                                <input
                                    required
                                    value={newDept.name}
                                    onChange={(e) => setNewDept(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    placeholder="E.G. NEUROLOGY"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department Code</label>
                                <input
                                    required
                                    value={newDept.code}
                                    onChange={(e) => setNewDept(prev => ({ ...prev, code: e.target.value }))}
                                    className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                    placeholder="E.G. CARD"
                                />
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl"
                            >
                                {submitting ? "Processing..." : "Authorize Creation"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingDept && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-3 md:p-6 border-b border-slate-50 flex items-center justify-between bg-teal-600 text-white">
                            <div>
                                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Refine Unit</h2>
                                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mt-1">Update clinical department node</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="w-8 h-8 md:w-10 md:h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-3 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] md:max-h-none overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department Name</label>
                                <input
                                    required
                                    value={editingDept.name}
                                    onChange={(e) => setEditingDept((prev: any) => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department Code</label>
                                <input
                                    required
                                    value={editingDept.code}
                                    onChange={(e) => setEditingDept((prev: any) => ({ ...prev, code: e.target.value }))}
                                    className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full py-3 md:py-4 bg-teal-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50 shadow-xl shadow-teal-200"
                            >
                                {submitting ? "Saving..." : "Update Department"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            <GenericBulkImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                config={{
                    title: "Department Inventory",
                    entityName: "Department",
                    templateColumns: ["name", "code"],
                    sampleRows: [
                        ["Cardiology", "CARD"],
                        ["Neurology", "NEUR"],
                        ["Orthopedics", "ORTH"],
                        ["Pediatrics", "PEDI"],
                        ["Emergency", "ER"],
                        ["ICU", "ICU"],
                        ["General Medicine", "GEN"],
                        ["Oncology", "ONCO"]
                    ],
                    onImport: async (data: any[]) => {
                        const existingNames = new Set(departments.map(d => d.name.toLowerCase()));
                        const uniqueData = data.filter(row => !existingNames.has(row.name?.toLowerCase()));

                        if (uniqueData.length === 0) {
                            return {
                                addedCount: 0,
                                errorCount: 0,
                                errors: [{ message: "All records already exist. Skipping import." }]
                            };
                        }

                        const res = await ipdService.importIPDAssetsJSON('departments', uniqueData);
                        return {
                            addedCount: res.addedCount || 0,
                            errorCount: res.errorCount || 0,
                            errors: res.errors
                        };
                    }
                }}
                onSuccess={handleImportSuccess}
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
};

export default DepartmentsManagement;
