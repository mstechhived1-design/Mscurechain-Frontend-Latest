"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Upload,
    Search,
    DoorOpen,
    MapPin,
    Building2,
    FileText,
    X,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Settings2,
    Edit3,
    Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { ConfirmModal } from '@/components/admin/Modal';
import GenericBulkImportModal from '@/components/admin/GenericBulkImportModal';

const RoomsManagement = () => {
    const [rooms, setRooms] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // New Room State
    const [newRoom, setNewRoom] = useState({ label: "", type: "" });
    const [editingRoom, setEditingRoom] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionType, setActionType] = useState<string>("");

    // Unit Type Management State
    const [isManagingUnitTypes, setIsManagingUnitTypes] = useState(false);
    const [newUnitType, setNewUnitType] = useState("");
    const [editingUnitType, setEditingUnitType] = useState<{ old: string; new: string } | null>(null);

    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const [pendingUnitAction, setPendingUnitAction] = useState<{
        type: 'delete' | 'update';
        oldValue: string;
        newValue?: string;
    } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [roomsData, unitTypesData] = await Promise.all([
                ipdService.getRooms().catch(() => []),
                ipdService.getUnitTypes().catch((err) => {
                    console.warn("Unit types fetch failed:", err);
                    return [];
                })
            ]);
            setRooms(roomsData);

            if (unitTypesData && unitTypesData.length > 0) {
                setUnitTypes(unitTypesData);
                if (!newRoom.type) {
                    setNewRoom(prev => ({ ...prev, type: unitTypesData[0] }));
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load clinical assets");
        } finally {
            setLoading(false);
        }
    };

    const handleAddUnitType = async () => {
        const typeToAdd = newUnitType.trim();
        if (!typeToAdd) return;

        if (unitTypes.some(t => t.toLowerCase() === typeToAdd.toLowerCase())) {
            toast.error(`Error: Unit type "${typeToAdd}" already exists`);
            return;
        }

        const prevTypes = [...unitTypes];
        // Optimistic update
        setUnitTypes(prev => [...prev, typeToAdd]);
        setNewUnitType("");

        try {
            setActionType("adding");
            setSubmitting(true);
            const normalizedType = typeToAdd.toUpperCase();
            const updated = await ipdService.addUnitType(normalizedType);
            setUnitTypes(updated.map((t: string) => t.toUpperCase()));
            toast.success("Unit type added");
        } catch (error: any) {
            setUnitTypes(prevTypes);
            toast.error(error.message || "Failed to add unit type");
        } finally {
            setSubmitting(false);
            setActionType("");
        }
    };

    const handleUpdateUnitType = async () => {
        if (!editingUnitType || !editingUnitType.new.trim()) return;
        const newTypeName = editingUnitType.new.trim();
        const oldTypeName = editingUnitType.old;

        if (unitTypes.some(t => t.toLowerCase() === newTypeName.toLowerCase() && t !== oldTypeName)) {
            toast.error(`Error: Unit type "${newTypeName}" already exists`);
            return;
        }

        setPendingUnitAction({
            type: 'update',
            oldValue: oldTypeName,
            newValue: newTypeName
        });
    };

    const confirmUnitUpdate = async () => {
        if (!pendingUnitAction || !pendingUnitAction.newValue) return;
        const oldValue = pendingUnitAction.oldValue.toUpperCase();
        const newValue = pendingUnitAction.newValue.toUpperCase();

        const prevTypes = [...unitTypes];
        const prevRooms = [...rooms];

        // Optimistic update
        setUnitTypes(prev => prev.map(t => t.toUpperCase() === oldValue ? newValue : t));
        setRooms(prev => prev.map(r => r.type?.toUpperCase() === oldValue ? { ...r, type: newValue } : r));

        try {
            setActionType("updating");
            setSubmitting(true);
            const updated = await ipdService.updateUnitType(oldValue, newValue);
            setUnitTypes(updated);
            setEditingUnitType(null);
            setPendingUnitAction(null);
            toast.success(`Unit type "${oldValue}" updated to "${newValue}"`);
        } catch (error: any) {
            setUnitTypes(prevTypes);
            setRooms(prevRooms);
            toast.error(error.message || "Failed to update unit type");
        } finally {
            setSubmitting(false);
            setActionType("");
        }
    };

    const handleDeleteUnitType = async (type: string) => {
        setPendingUnitAction({
            type: 'delete',
            oldValue: type
        });
    };

    const confirmUnitDelete = async () => {
        if (!pendingUnitAction) return;
        const type = pendingUnitAction.oldValue;

        const prevTypes = [...unitTypes];
        // Optimistic update
        setUnitTypes(prev => prev.filter(t => t !== type));

        try {
            setActionType("deleting");
            setSubmitting(true);
            const updated = await ipdService.deleteUnitType(type);
            setUnitTypes(updated);
            setPendingUnitAction(null);
            toast.success("Unit type removed");
        } catch (error: any) {
            setUnitTypes(prevTypes);
            toast.error(error.message || "Failed to delete unit type");
        } finally {
            setSubmitting(false);
            setActionType("");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const prevRooms = [...rooms];
        const tempRoom = { ...newRoom, _id: "temp-" + Date.now(), hospital: "" }; // tempId for unique key

        // Optimistic update
        setRooms(prev => [tempRoom, ...prev]);

        try {
            setActionType("deploying");
            setSubmitting(true);
            await ipdService.createRoom({ ...newRoom, type: newRoom.type.toUpperCase() });
            toast.success("Room registered successfully");
            setShowAddModal(false);
            setNewRoom({ label: "", type: "" });
            fetchInitialData(); // Background refresh to get real ID and full data
        } catch (error: any) {
            setRooms(prevRooms);
            toast.error(error.message || "Failed to register room");
        } finally {
            setSubmitting(false);
            setActionType("");
        }
    };

    const handleDelete = async (id: string, label: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Decommission Room",
            message: `Are you sure you want to decommission room ${label}?`,
            onConfirm: async () => {
                const prevRooms = [...rooms];
                // Optimistic update
                setRooms(prev => prev.filter(r => r._id !== id));

                try {
                    await ipdService.deleteRoom(id);
                    toast.success("Room decommissioned");
                    // No need to fetchInitialData here if optimistic was successful
                } catch {
                    setRooms(prevRooms);
                    toast.error("Failed to delete room");
                }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;

        const prevRooms = [...rooms];
        // Optimistic update
        setRooms(prev => prev.map(r => r._id === editingRoom._id ? editingRoom : r));

        try {
            setActionType("saving");
            setSubmitting(true);
            await ipdService.updateRoom(editingRoom._id, {
                label: editingRoom.label,
                type: editingRoom.type
            });
            toast.success("Room updated successfully");
            setShowEditModal(false);
            setEditingRoom(null);
            fetchInitialData();
        } catch (error: any) {
            setRooms(prevRooms);
            toast.error(error.message || "Failed to update room");
        } finally {
            setSubmitting(false);
            setActionType("");
        }
    };

    const handleImportSuccess = () => {
        fetchInitialData();
    };

    const filtered = rooms.filter(r => {
        const matchesSearch = r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === "" || r.type === filterType;
        return matchesSearch && matchesFilter;
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
                        <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
                            <DoorOpen className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                Room Inventory
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                                Facility Mapping & Occupancy Planning
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><DoorOpen className="w-4 h-4 text-gray-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Capacity</span>
                                <span className="text-sm font-bold text-gray-700 leading-none">{rooms.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 rounded-lg border border-rose-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><Building2 className="w-4 h-4 text-rose-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600/70">ICU Suites</span>
                                <span className="text-sm font-bold text-rose-700 leading-none">
                                    {rooms.filter(r => r.type === 'ICU').length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-teal-50/50 rounded-lg border border-teal-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><DoorOpen className="w-4 h-4 text-teal-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-teal-600/70">General Wards</span>
                                <span className="text-sm font-bold text-teal-700 leading-none">
                                    {rooms.filter(r => r.type === 'General').length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><DoorOpen className="w-4 h-4 text-amber-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/70">Private Wings</span>
                                <span className="text-sm font-bold text-amber-700 leading-none">
                                    {rooms.filter(r => r.type === 'Private').length}
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
                                <Plus size={14} className="shrink-0" /> Initialize Room
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
                                placeholder="Search by Room Label or Type..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <select
                                className="px-3 md:px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:border-blue-200 transition-all outline-none h-[34px]"
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
                            
                            {/* COMPACT PAGINATION */}
                            {!loading && totalPages > 1 && (
                                <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-2 h-[34px]">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={14} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] font-black w-8 text-center text-gray-700">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
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
                    <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Secure Vault...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-50 shadow-sm text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                        <DoorOpen size={40} />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-2">Facility Empty</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No rooms recorded in system</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {paginated.map((room) => (
                        <div key={room._id} className="group bg-white rounded-[24px] border border-slate-100 p-2 md:p-4 shadow-sm hover:shadow-xl hover:shadow-blue-200/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                            <div>
                                <div className="absolute top-0 right-0 p-3 flex gap-1.5 z-10">
                                    <button
                                        onClick={() => {
                                            setEditingRoom(room);
                                            setShowEditModal(true);
                                        }}
                                        className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <FileText size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(room._id, room.label)}
                                        className="w-7 h-7 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <div className={`w-9 h-9 ${room.type === 'ICU' ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900'} text-white rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                                        <MapPin size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate pr-12 leading-tight">{room.label}</h3>
                                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                                        {room.type}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-50">
                                    <Building2 size={10} className="text-slate-400 shrink-0" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">
                                        {room.department || ""}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-emerald-100">
                                        Open
                                    </span>
                                    <span className="text-[7px] font-bold text-slate-300">
                                        #{room._id.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-3 md:p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Initialize Asset</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Register new clinical room node</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsManagingUnitTypes(!isManagingUnitTypes);
                                        setEditingUnitType(null);
                                    }}
                                    className={`w-10 h-10 ${isManagingUnitTypes ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400'} rounded-xl flex items-center justify-center hover:opacity-80 transition-all`}
                                    title="Manage Unit Types"
                                >
                                    <Settings2 size={20} />
                                </button>
                                <button onClick={() => {
                                    setShowAddModal(false);
                                    setIsManagingUnitTypes(false);
                                }} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {isManagingUnitTypes ? (
                            <div className="p-3 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4 min-h-[300px] flex flex-col">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        {pendingUnitAction ? "Configuration Confirmation" : "Unit Types Library"}
                                    </h3>

                                    {pendingUnitAction ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 animate-in zoom-in-95 duration-200">
                                            <div className={`w-12 h-12 ${pendingUnitAction.type === 'delete' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'} rounded-2xl flex items-center justify-center mb-4`}>
                                                {pendingUnitAction.type === 'delete' ? <Trash2 size={24} /> : <Edit3 size={24} />}
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                                                {pendingUnitAction.type === 'delete' ? `Delete ${pendingUnitAction.oldValue}?` : `Update ${pendingUnitAction.oldValue}?`}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed px-4">
                                                If you {pendingUnitAction.type === 'delete' ? 'delete' : 'update'} "{pendingUnitAction.oldValue}" the related data will {pendingUnitAction.type === 'delete' ? 'delete' : 'update'} if only linked with already old data if new one not need
                                            </p>

                                            <div className="flex gap-2 mt-8 w-full">
                                                <button
                                                    onClick={() => setPendingUnitAction(null)}
                                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={pendingUnitAction.type === 'delete' ? confirmUnitDelete : confirmUnitUpdate}
                                                    disabled={submitting}
                                                    className={`flex-1 py-3 ${pendingUnitAction.type === 'delete' ? 'bg-rose-600 shadow-rose-200' : 'bg-blue-600 shadow-blue-200'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                                                >
                                                    {submitting ? "Processing..." : "Confirm"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                                {unitTypes.map((type, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all border border-transparent hover:border-slate-100">
                                                        {editingUnitType?.old === type ? (
                                                            <input
                                                                autoFocus
                                                                value={editingUnitType.new}
                                                                onChange={(e) => setEditingUnitType({ ...editingUnitType, new: e.target.value })}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateUnitType()}
                                                                className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{type}</span>
                                                        )}

                                                        <div className="flex items-center gap-1">
                                                            {editingUnitType?.old === type ? (
                                                                <button onClick={handleUpdateUnitType} disabled={submitting} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50">
                                                                    {submitting && actionType === 'updating' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setEditingUnitType({ old: type, new: type })}
                                                                    disabled={submitting}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteUnitType(type)}
                                                                disabled={submitting}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                                            >
                                                                {submitting && actionType === 'deleting' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 border-t border-slate-50 flex gap-2">
                                                <input
                                                    placeholder="NEW UNIT TYPE NAME..."
                                                    value={newUnitType}
                                                    onChange={(e) => setNewUnitType(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddUnitType()}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-blue-500 outline-none transition-all"
                                                />
                                                <button
                                                    onClick={handleAddUnitType}
                                                    disabled={submitting}
                                                    className="px-2 md:px-6 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    {submitting && actionType === 'adding' ? "ADDING..." : "ADD"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsManagingUnitTypes(false)}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Return to Registration
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="p-3 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] md:max-h-none overflow-y-auto custom-scrollbar animate-in slide-in-from-left-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Label/ID</label>
                                    <input
                                        required
                                        value={newRoom.label}
                                        onChange={(e) => setNewRoom(prev => ({ ...prev, label: e.target.value }))}
                                        className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all placeholder:opacity-50"
                                        placeholder="E.G. ICU-1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Type</label>
                                    </div>
                                    <select
                                        required
                                        value={newRoom.type}
                                        onChange={(e: any) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Select Type</option>
                                        {unitTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    disabled={submitting}
                                    className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 active:scale-[0.98] duration-200"
                                >
                                    {submitting ? "Deploying..." : "Finalize Registration"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingRoom && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-3 md:p-6 border-b border-slate-50 flex items-center justify-between bg-blue-600 text-white">
                            <div>
                                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Edit Asset</h2>
                                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Update clinical room node</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsManagingUnitTypes(!isManagingUnitTypes);
                                        setEditingUnitType(null);
                                    }}
                                    className={`w-10 h-10 ${isManagingUnitTypes ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/10 text-white'} rounded-xl flex items-center justify-center hover:opacity-80 transition-all`}
                                    title="Manage Unit Types"
                                >
                                    <Settings2 size={20} />
                                </button>
                                <button onClick={() => {
                                    setShowEditModal(false);
                                    setIsManagingUnitTypes(false);
                                }} className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {isManagingUnitTypes ? (
                            <div className="p-3 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4 min-h-[300px] flex flex-col">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        {pendingUnitAction ? "Configuration Confirmation" : "Unit Types Library"}
                                    </h3>

                                    {pendingUnitAction ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 animate-in zoom-in-95 duration-200">
                                            <div className={`w-12 h-12 ${pendingUnitAction.type === 'delete' ? 'bg-rose-500' : 'bg-blue-600'} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                                                {pendingUnitAction.type === 'delete' ? <Trash2 size={24} /> : <Edit3 size={24} />}
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight text-center mb-2">
                                                {pendingUnitAction.type === 'delete' ? `Delete ${pendingUnitAction.oldValue}?` : `Update ${pendingUnitAction.oldValue}?`}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed px-4">
                                                If you {pendingUnitAction.type === 'delete' ? 'delete' : 'update'} "{pendingUnitAction.oldValue}" the related data will {pendingUnitAction.type === 'delete' ? 'delete' : 'update'} if only linked with already old data if new one not need
                                            </p>
                                            <div className="flex gap-2 mt-8 w-full">
                                                <button
                                                    onClick={() => setPendingUnitAction(null)}
                                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={pendingUnitAction.type === 'delete' ? confirmUnitDelete : confirmUnitUpdate}
                                                    disabled={submitting}
                                                    className={`flex-1 py-3 ${pendingUnitAction.type === 'delete' ? 'bg-rose-500' : 'bg-blue-600'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                                                >
                                                    {submitting ? "Processing..." : "Confirm"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                                {unitTypes.map((type, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-white hover:shadow-md hover:shadow-slate-100 transition-all border border-transparent hover:border-slate-100">
                                                        {editingUnitType?.old === type ? (
                                                            <input
                                                                autoFocus
                                                                value={editingUnitType.new}
                                                                onChange={(e) => setEditingUnitType({ ...editingUnitType, new: e.target.value })}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateUnitType()}
                                                                className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-xs font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{type}</span>
                                                        )}

                                                        <div className="flex items-center gap-1">
                                                            {editingUnitType?.old === type ? (
                                                                <button onClick={handleUpdateUnitType} disabled={submitting} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50">
                                                                    {submitting && actionType === 'updating' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setEditingUnitType({ old: type, new: type })}
                                                                    disabled={submitting}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteUnitType(type)}
                                                                disabled={submitting}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                                            >
                                                                {submitting && actionType === 'deleting' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 flex gap-2">
                                                <input
                                                    placeholder="NEW UNIT TYPE NAME..."
                                                    value={newUnitType}
                                                    onChange={(e) => setNewUnitType(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddUnitType()}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-900 placeholder:text-slate-400 tracking-widest focus:border-blue-500 outline-none transition-all"
                                                />
                                                <button
                                                    onClick={handleAddUnitType}
                                                    disabled={submitting}
                                                    className="px-2 md:px-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    {submitting && actionType === 'adding' ? "ADDING..." : "ADD"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsManagingUnitTypes(false)}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                                >
                                    Return to Master
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdate} className="p-3 md:p-8 space-y-6 animate-in slide-in-from-left-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Label/ID</label>
                                    <input
                                        required
                                        value={editingRoom.label}
                                        onChange={(e) => setEditingRoom((prev: any) => ({ ...prev, label: e.target.value }))}
                                        className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Type</label>
                                    </div>
                                    <select
                                        required
                                        value={editingRoom.type}
                                        onChange={(e: any) => setEditingRoom((prev: any) => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] md:text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Select Type</option>
                                        {unitTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    disabled={submitting}
                                    className="w-full py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-200 active:scale-[0.98] duration-200"
                                >
                                    {submitting ? "Saving..." : "Update Asset"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}



            {/* Bulk Import Modal */}
            <GenericBulkImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                config={{
                    title: "Room Inventory",
                    entityName: "Room",
                    templateColumns: ["label", "type"],
                    sampleRows: [
                        ["ICU-A", "ICU"],
                        ["ICU-B", "ICU"],
                        ["G-201", "GENERAL"],
                        ["G-202", "GENERAL"],
                        ["P-301", "PRIVATE"],
                        ["P-302", "PRIVATE"],
                        ["D-401", "DELUXE"],
                        ["D-402", "DELUXE"]
                    ],
                    onImport: async (data: any[]) => {
                        const existingLabels = new Set(rooms.map(r => r.label.toLowerCase()));
                        const uniqueData = data.filter(row => !existingLabels.has(row.label?.toLowerCase()));

                        if (uniqueData.length === 0) {
                            return {
                                addedCount: 0,
                                errorCount: 0,
                                errors: [{ message: "All records already exist. Skipping import." }]
                            };
                        }

                        const res = await ipdService.importIPDAssetsJSON('rooms', uniqueData);
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

export default RoomsManagement;
