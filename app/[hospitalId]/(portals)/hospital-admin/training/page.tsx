"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    BookOpen, Plus, Search, Filter, Calendar,
    Briefcase, Users, MoreVertical, Edit, Trash2,
    CheckCircle2, Clock, XCircle, FileCheck, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getAllTrainingsAction, deleteTrainingAction } from '@/lib/integrations';
import AddTrainingModal from '@/components/admin/training/AddTrainingModal';
import { ConfirmModal } from '@/components/admin/Modal';
import { useDebounce } from '@/hooks/useDebounce';

export default function TrainingManagementPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [filterStatus, setFilterStatus] = useState("");
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Fetch Trainings
    const { data: trainingData, isLoading } = useQuery({
        queryKey: ['trainings'],
        queryFn: getAllTrainingsAction
    });

    const trainings = trainingData?.data?.trainings || [];

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteTrainingAction,
        onSuccess: () => {
            toast.success("Training record deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete training record");
        }
    });

    const handleDelete = (id: string) => {
        setTrainingToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (trainingToDelete) {
            deleteMutation.mutate(trainingToDelete);
            setDeleteModalOpen(false);
            setTrainingToDelete(null);
        }
    };

    const filteredTrainings = useMemo(() => {
        return trainings.filter((t: any) => {
            const matchesSearch = debouncedSearchTerm.length < 3 ||
                t.trainingName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                t.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesStatus = !filterStatus || t.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [trainings, debouncedSearchTerm, filterStatus]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTrainings.length / itemsPerPage);
    const paginatedTrainings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTrainings.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTrainings, currentPage, itemsPerPage]);

    // Reset page when filter changes
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterStatus]);

    const handleEdit = (training: any) => {
        if (training.status?.toLowerCase() === 'completed') {
            toast.error("Completed trainings cannot be edited");
            return;
        }
        setSelectedTraining(training);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedTraining(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 bg-slate-50/50 min-h-screen">
            {/* Dynamic Header with Advanced Filters */}
            <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
                {/* Top Row: Identification & Action */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
                    <div className="shrink-0 flex items-center gap-2 px-1">
                        <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                Staff Training Records
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                                Manage professional development & compliance
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                            <div className="p-1 bg-white rounded-md shadow-sm"><BookOpen className="w-3.5 h-3.5 text-gray-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Records</span>
                                <span className="text-xs font-bold text-gray-700 leading-none">{trainings.length}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-3 md:px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shrink-0 h-[34px]"
                        >
                            <Plus className="w-4 h-4" strokeWidth={3} /> Log New Training
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Control Center (Filters & Pagination) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
                        
                        {/* Search Bar - Takes remaining width */}
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search training name or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-[34px]"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative shrink-0 sm:w-44">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                            <div
                                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer flex justify-between items-center h-[34px]"
                            >
                                <span className={filterStatus ? 'text-slate-900' : 'text-slate-400'}>
                                    {filterStatus ? `Status: ${filterStatus}` : 'Status: All'}
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isStatusFilterOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[60]"
                                        onClick={() => setIsStatusFilterOpen(false)}
                                    />
                                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] overflow-hidden">
                                        <div className="p-1">
                                            <div
                                                onClick={() => { setFilterStatus(''); setIsStatusFilterOpen(false); }}
                                                className="px-4 py-2.5 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer"
                                            >
                                                Status: All
                                            </div>
                                            {['Scheduled', 'Completed', 'Cancelled'].map(s => (
                                                <div
                                                    key={s}
                                                    onClick={() => { setFilterStatus(s); setIsStatusFilterOpen(false); }}
                                                    className={`px-4 py-2.5 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${filterStatus === s ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                                >
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Pagination inside header */}
                        {!isLoading && totalPages > 1 && (
                            <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200 h-[34px]">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm h-full flex items-center"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-[10px] font-black tracking-widest text-slate-400 px-1">
                                    {currentPage} / {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm h-full flex items-center"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-[0.5rem] border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-2 md:px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Training Name</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Date/Dept</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Participants</th>
                                <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                <th className="px-2 md:px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-2 md:px-6 py-4"><div className="h-8 w-16 bg-slate-100 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : paginatedTrainings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-2 md:px-6 py-12 text-center text-slate-500 font-medium">
                                        No training records found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTrainings.map((training: any) => (
                                    <tr key={training._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-xs md:text-base md:text-lg ${training.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                    training.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    <BookOpen size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{training.trainingName}</p>
                                                    {training.description && (
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[200px]">{training.description}</p>
                                                    )}
                                                    {training.status?.toLowerCase().includes('cancel') && (
                                                        <span className="inline-block mt-1 text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            Reason: {training.cancellationReason || training.reason}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-700">{new Date(training.trainingDate).toLocaleDateString()}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                                                    {training.department}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg inline-flex border border-slate-100">
                                                <Users size={14} />
                                                <span className="text-xs font-bold">{training.participants?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${training.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                training.status?.toLowerCase() === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {training.status?.toLowerCase() === 'completed' ? <CheckCircle2 size={12} /> :
                                                    training.status?.toLowerCase() === 'cancelled' ? <XCircle size={12} /> : <Clock size={12} />}
                                                {training.status}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {training.certificateUrl && (
                                                    <a
                                                        href={training.certificateUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="View Certificate"
                                                    >
                                                        <FileCheck size={16} />
                                                    </a>
                                                )}

                                                {training.status?.toLowerCase() !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleEdit(training)}
                                                        disabled={training.status?.toLowerCase() === 'completed'}
                                                        className={`p-2 rounded-lg transition-colors ${training.status?.toLowerCase() === 'completed'
                                                            ? 'text-slate-200 cursor-not-allowed'
                                                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                            }`}
                                                        title={training.status?.toLowerCase() === 'completed' ? "Completed" : "Edit"}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(training._id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>

            </div>

            {isModalOpen && (
                <AddTrainingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    training={selectedTraining}
                />
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Training Record"
                message="Are you sure you want to delete this training record? This action cannot be undone."
                confirmText="Delete"
                type="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
