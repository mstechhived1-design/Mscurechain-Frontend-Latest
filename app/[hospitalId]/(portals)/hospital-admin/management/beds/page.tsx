"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, Search, Bed as BedIcon, MapPin, DoorOpen, FileText, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { ConfirmModal } from '@/components/admin/Modal';
import { calculateStayDuration } from '@/lib/utils/date-utils';
import HybridRoomSearch from '@/components/shared/HybridRoomSearch';
import GenericBulkImportModal from '@/components/admin/GenericBulkImportModal';

const BedsManagement = () => {
    const [beds, setBeds] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterRoom, setFilterRoom] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // New Bed State
    const [newBed, setNewBed] = useState({ bedId: "", type: "", floor: "", room: "", department: "", ward: "", pricePerDay: 0, pricePerHalfDay: 0, pricePerHour: 0 });
    const [editingBed, setEditingBed] = useState<any>(null);
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
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [bedsData, roomsData, deptsData, typesData, activeAdmissions] = await Promise.all([
                ipdService.getBeds(),
                ipdService.getRooms(),
                ipdService.getIPDDepartments(),
                ipdService.getUnitTypes(),
                ipdService.getActiveAdmissions()
            ]);

            // Auto-enrich beds with active admission reason if available
            const enriched = bedsData.map(bed => {
                if (bed.status === 'Occupied' && bed.currentOccupancy) {
                    const admission = activeAdmissions.find(a => a.admissionId === bed.currentOccupancy?.admissionId);
                    if (admission) {
                        return {
                            ...bed,
                            currentOccupancy: {
                                ...bed.currentOccupancy,
                                // Strictly use clinical reason and filter out legacy notes
                                reason: (admission.reason && admission.reason !== 'not now.') 
                                    ? admission.reason 
                                    : (admission.reasonForAdmission !== 'not now.' ? admission.reasonForAdmission : 'No specific reason provided.')
                            }
                        };
                    }
                }
                return bed;
            });
            console.log("[HospitalAdmin] ENRICHED BEDS COUNT:", enriched.filter(b => b.status === 'Occupied').length);
            console.log("[HospitalAdmin] SAMPLE OCCUPIED REASON:", enriched.find(b => b.status === 'Occupied' && b.currentOccupancy?.reason)?.currentOccupancy?.reason);
            
            setBeds(enriched);
            setRooms(roomsData);
            setDepartments(deptsData);
            setUnitTypes(typesData);
        } catch (error) {
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!newBed.bedId.trim()) return toast.error("Bed ID is required");
        if (!/^[A-Z0-9-]+$/.test(newBed.bedId.toUpperCase())) return toast.error("Bed ID should be alphanumeric (e.g., ICU-101)");
        if (!newBed.room) return toast.error("Please select a room");
        if (!newBed.floor) return toast.error("Floor is required");
        if (newBed.pricePerDay < 0 || newBed.pricePerHalfDay < 0 || newBed.pricePerHour < 0) return toast.error("Prices cannot be negative");

        try {
            setSubmitting(true);
            await ipdService.createBed({
                ...newBed,
                type: newBed.type.toUpperCase(),
                pricePerHalfDay: newBed.pricePerHalfDay || Math.round((newBed.pricePerDay || 0) / 2),
                pricePerHour: newBed.pricePerHour || Math.round((newBed.pricePerDay || 0) / 24)
            });
            toast.success("Bed registered successfully");
            setShowAddModal(false);
            setNewBed({ bedId: "", type: "", floor: "", room: "", department: "", ward: "", pricePerDay: 0, pricePerHalfDay: 0, pricePerHour: 0 });
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to register bed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, bedId: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Decommission Bed",
            message: `Are you sure you want to decommission bed ${bedId}?`,
            onConfirm: async () => {
                try {
                    await ipdService.deleteBed(id);
                    toast.success("Bed decommissioned");
                    fetchInitialData();
                } catch (error) {
                    toast.error("Failed to delete bed");
                }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBed) return;

        // Validations
        if (!editingBed.bedId.trim()) return toast.error("Bed ID is required");
        if (!/^[A-Z0-9-]+$/.test(editingBed.bedId.toUpperCase())) return toast.error("Bed ID should be alphanumeric");
        if (!editingBed.room) return toast.error("Please select a room");
        if (!editingBed.floor) return toast.error("Floor is required");
        if (editingBed.pricePerDay < 0 || editingBed.pricePerHalfDay < 0 || editingBed.pricePerHour < 0) return toast.error("Prices cannot be negative");

        try {
            setSubmitting(true);
            await ipdService.updateBed(editingBed._id, {
                bedId: editingBed.bedId.toUpperCase(),
                type: editingBed.type,
                floor: editingBed.floor,
                room: editingBed.room,
                department: editingBed.department,
                ward: editingBed.ward,
                pricePerDay: editingBed.pricePerDay,
                pricePerHalfDay: editingBed.pricePerHalfDay || Math.round((editingBed.pricePerDay || 0) / 2),
                pricePerHour: editingBed.pricePerHour || Math.round((editingBed.pricePerDay || 0) / 24)
            });
            toast.success("Bed updated successfully");
            setShowEditModal(false);
            setEditingBed(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update bed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleImportSuccess = () => {
        fetchInitialData();
    };

    const filtered = beds.filter(b => {
        const matchesSearch = b.bedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "" || b.status === filterStatus;
        const matchesType = filterType === "" || b.type.toLowerCase() === filterType.toLowerCase();
        const matchesRoom = filterRoom === "" || b.room === filterRoom;
        return matchesSearch && matchesStatus && matchesType && matchesRoom;
    });

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
                            <BedIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                Bed Inventory
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                                Asset Allocation & Clinical Node Management
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><BedIcon className="w-4 h-4 text-gray-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total</span>
                                <span className="text-sm font-bold text-gray-700 leading-none">{beds.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><BedIcon className="w-4 h-4 text-emerald-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">Vacant</span>
                                <span className="text-sm font-bold text-emerald-700 leading-none">
                                    {beds.filter(b => b.status === 'Vacant').length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 rounded-lg border border-rose-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><BedIcon className="w-4 h-4 text-rose-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600/70">Active</span>
                                <span className="text-sm font-bold text-rose-700 leading-none">
                                    {beds.filter(b => b.status === 'Occupied').length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><BedIcon className="w-4 h-4 text-amber-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/70">Maint</span>
                                <span className="text-sm font-bold text-amber-700 leading-none">
                                    {beds.filter(b => b.status === 'Cleaning').length}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 border-l border-gray-100 pl-2 ml-1">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shrink-0 h-[34px]"
                            >
                                <Upload size={14} className="shrink-0" /> Sync Data
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-3 md:px-6 py-2 bg-primary-theme text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme/80 transition-all shrink-0 h-[34px]"
                            >
                                <Plus size={14} className="shrink-0" /> Deploy Bed
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
                                placeholder="Search by Bed ID, Room, or Type..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <select
                                className="px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:border-teal-200 transition-all outline-none h-[34px]"
                                value={filterStatus}
                                onChange={(e) => {
                                    setFilterStatus(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="">All Status</option>
                                <option value="Vacant">Vacant</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Cleaning">Cleaning</option>
                            </select>

                            <select
                                className="hidden md:block px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:border-teal-200 transition-all outline-none h-[34px]"
                                value={filterType}
                                onChange={(e) => {
                                    setFilterType(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="">All Types</option>
                                {unitTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            
                            <div className="hidden lg:block h-[34px]">
                                <HybridRoomSearch
                                    value={filterRoom}
                                    onSelect={(val: string) => {
                                        setFilterRoom(val);
                                        setCurrentPage(1);
                                    }}
                                    rooms={rooms}
                                    typeFilter={filterType}
                                    className="h-full min-w-[140px]"
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
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-50 shadow-sm gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500/10 border-t-teal-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Inventory Ledger...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-50 shadow-sm text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                        <BedIcon size={40} />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-2">Inventory Empty</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active bed nodes found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
                    {paginated.map((bed) => (
                        <div key={bed._id} className="group bg-white rounded-[20px] border border-slate-100 p-3 shadow-sm hover:shadow-xl hover:shadow-teal-200/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                            <div className="flex flex-col h-full gap-2">
                                <div className="flex justify-between items-start">
                                    <div className={`w-7 h-7 ${bed.status === 'Occupied' ? 'bg-rose-500' : bed.status === 'Cleaning' ? 'bg-amber-500' : 'bg-emerald-500'} text-white rounded-lg flex items-center justify-center shadow-sm relative shrink-0`}>
                                        <BedIcon size={12} />
                                        {bed.status === 'Occupied' && (
                                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-600 rounded-full border border-white animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${bed.status === 'Vacant' ? 'bg-emerald-500 text-white' :
                                            bed.status === 'Occupied' ? 'bg-rose-500 text-white' :
                                                'bg-amber-500 text-white'
                                            }`}>
                                            {bed.status[0]}
                                        </span>
                                        {bed.status === 'Occupied' && bed.currentOccupancy?.admissionDate && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[6px] font-black uppercase tracking-tighter">
                                                <Clock size={8} />
                                                {calculateStayDuration(bed.currentOccupancy.admissionDate)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-1">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{bed.bedId}</h3>
                                     <div className="flex flex-col mt-0.5">
                                         <span className="text-[7px] font-bold text-slate-400 capitalize truncate">
                                             {bed.status === 'Occupied' ? bed.currentOccupancy?.patientName : bed.type}
                                         </span>
                                         {bed.status === 'Occupied' && bed.currentOccupancy?.reason && (
                                             <span className="text-[6px] font-bold text-teal-600 truncate mt-0.5 max-w-[80px]" title={bed.currentOccupancy.reason}>
                                                 {bed.currentOccupancy.reason}
                                             </span>
                                         )}
                                     </div>
                                </div>

                                <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <DoorOpen size={8} className="text-slate-300 shrink-0" />
                                            <span className="text-[7px] font-black text-slate-500 uppercase truncate">R:{bed.room || "?"}</span>
                                        </div>
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <MapPin size={8} className="text-slate-300 shrink-0" />
                                            <span className="text-[7px] font-black text-slate-500 uppercase truncate">F:{bed.floor || "?"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 mt-1.5">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{bed.department || "GEN"}</span>
                                        <div className="flex flex-wrap items-center gap-1 justify-end">
                                            {bed.pricePerHour !== undefined && (
                                                <span className="text-[7px] font-black text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                                                    ₹{bed.pricePerHour}/hr
                                                </span>
                                            )}
                                            {bed.pricePerHalfDay !== undefined && (
                                                <span className="text-[7px] font-black text-teal-600 bg-teal-50/80 px-1 py-0.5 rounded border border-teal-100">
                                                    ₹{bed.pricePerHalfDay}/12h
                                                </span>
                                            )}
                                            {(bed.pricePerDay || 0) > 0 && (
                                                <span className="text-[8px] font-black text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded border border-teal-200">
                                                    ₹{bed.pricePerDay}/day
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Refined Action Buttons - Middle Right Vertical Stack */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10 transition-all">
                                <button
                                    onClick={() => {
                                        setEditingBed(bed);
                                        setShowEditModal(true);
                                    }}
                                    className="w-5 h-5 bg-white shadow-md text-slate-600 rounded-lg flex items-center justify-center hover:bg-teal-50 hover:text-teal-600 transition-all border border-slate-100"
                                    title="Edit Bed"
                                >
                                    <FileText size={10} />
                                </button>
                                <button
                                    onClick={() => handleDelete(bed._id, bed.bedId)}
                                    className="w-5 h-5 bg-white shadow-md text-slate-600 rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
                                    title="Delete Bed"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-3 md:p-6 border-b border-slate-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Deploy Node</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Register new clinical bed unit</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-3 md:p-6 space-y-3 md:space-y-6 max-h-[70vh] md:max-h-none overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed ID</label>
                                        <input
                                            required
                                            value={newBed.bedId}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, bedId: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                            placeholder="E.G. BED-101"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                        <select
                                            value={newBed.type}
                                            onChange={(e: any) => setNewBed(prev => ({ ...prev, type: e.target.value, room: "" }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        >
                                            <option value="">Select Type</option>
                                            {unitTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Floor</label>
                                        <input
                                            required
                                            value={newBed.floor}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, floor: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                            placeholder="E.G 1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Room</label>
                                        <HybridRoomSearch
                                            value={newBed.room}
                                            onSelect={(val) => {
                                                const room = rooms.find(r => r.label === val);
                                                setNewBed(prev => ({ ...prev, room: val, type: room?.type || prev.type }));
                                            }}
                                            rooms={rooms}
                                            typeFilter={newBed.type}
                                            className="py-2.5 md:py-4"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department</label>
                                        <select
                                            value={newBed.department}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, department: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        >
                                            <option value="">Select Dept</option>
                                            {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Ward Section</label>
                                        <input
                                            value={newBed.ward}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, ward: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                            placeholder="E.G A, B, C"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">Hourly (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={newBed.pricePerHour}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, pricePerHour: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">1/2 Day (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={newBed.pricePerHalfDay}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, pricePerHalfDay: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">Full Day (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={newBed.pricePerDay}
                                            onChange={(e) => setNewBed(prev => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={submitting}
                                    className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl"
                                >
                                    {submitting ? "Deploying Node..." : "Authorize Integration"}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                showEditModal && editingBed && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-3 md:p-6 border-b border-slate-50 flex items-center justify-between bg-teal-600 text-white">
                                <div>
                                    <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Refine Node</h2>
                                    <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mt-1">Update clinical bed unit</p>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="w-8 h-8 md:w-10 md:h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-3 md:p-6 space-y-3 md:space-y-6 max-h-[70vh] md:max-h-none overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed ID</label>
                                        <input
                                            required
                                            value={editingBed.bedId}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, bedId: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                        <select
                                            value={editingBed.type}
                                            onChange={(e: any) => setEditingBed((prev: any) => ({ ...prev, type: e.target.value, room: "" }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        >
                                            <option value="">Select Type</option>
                                            {unitTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Floor</label>
                                        <input
                                            required
                                            value={editingBed.floor}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, floor: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Room</label>
                                        <HybridRoomSearch
                                            value={editingBed.room}
                                            onSelect={(val) => {
                                                const room = rooms.find(r => r.label === val);
                                                setEditingBed((prev: any) => ({ ...prev, room: val, type: room?.type || prev.type }));
                                            }}
                                            rooms={rooms}
                                            typeFilter={editingBed.type}
                                            className="py-2.5 md:py-4"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Department</label>
                                        <select
                                            value={editingBed.department}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, department: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        >
                                            <option value="">Select Dept</option>
                                            {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-xs">Ward Section</label>
                                        <input
                                            value={editingBed.ward}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, ward: e.target.value }))}
                                            className="w-full px-3 md:px-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">Hourly (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={editingBed.pricePerHour || Math.round((editingBed.pricePerDay || 0) / 24)}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, pricePerHour: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">1/2 Day (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={editingBed.pricePerHalfDay || Math.round((editingBed.pricePerDay || 0) / 2)}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, pricePerHalfDay: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-1">Full Day (₹)</label>
                                        <input
                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                            value={editingBed.pricePerDay}
                                            onChange={(e) => setEditingBed((prev: any) => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                                            className="w-full px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs font-black focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={submitting}
                                    className="w-full py-3 md:py-4 bg-teal-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50 shadow-xl shadow-teal-200"
                                >
                                    {submitting ? "Updating..." : "Save Changes"}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Bulk Import Modal */}
            <GenericBulkImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                config={{
                    title: "Bed Inventory",
                    entityName: "Bed",
                    templateColumns: ["bedId", "type", "floor", "room", "department", "ward", "pricePerDay"],
                    sampleRows: [
                        ["B-ICU1-01", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-02", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-03", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-04", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-05", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-06", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-07", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-08", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-09", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"],
                        ["B-ICU1-10", "ICU", "1", "ICU-1", "Cardiology", "ICU-A", "5000"]
                    ],
                    onImport: async (data: any[]) => {
                        const existingIds = new Set(beds.map(b => b.bedId.toLowerCase()));
                        const uniqueData = data.filter(row => !existingIds.has(row.bedId?.toLowerCase()));

                        if (uniqueData.length === 0) {
                            return {
                                addedCount: 0,
                                errorCount: 0,
                                errors: [{ message: "All records already exist. Skipping import." }]
                            };
                        }

                        const res = await ipdService.importIPDAssetsJSON('beds', uniqueData);
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

export default BedsManagement;
