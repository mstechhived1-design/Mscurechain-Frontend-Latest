"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2,
    Search,
    Plus,
    Edit3,
    Bed,
    DoorOpen,
    Loader2,
    Save,
    X,
    Layers,
    IndianRupee
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ipdService } from '@/lib/integrations/services/ipd.service';

const DepartmentModal = ({ isOpen, onClose, onSave, department = null }: any) => {
    const [name, setName] = useState(department?.name || "");
    const [code, setCode] = useState(department?.code || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setName(department?.name || "");
        setCode(department?.code || "");
    }, [department]);

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({ name, code });
            onClose();
        } catch (error) {
            toast.error("Process failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-5xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tight">
                            {department ? "Edit Department" : "New Department"}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Infrastructure Component</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Department Name</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            placeholder="e.g. CARDIOLOGY"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Department Code</label>
                        <input
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            placeholder="e.g. CARD-01"
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                        <button disabled={loading} type="submit" className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {department ? "Update Unit" : "Deploy Unit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InfrastructureModal = ({ type, isOpen, onClose, onSave, departments, unitTypes, initialData = null }: any) => {
    // Fields for Room: label, type
    // Fields for Bed: bedId, type, floor, room, department, ward, pricePerDay
    const [name, setName] = useState(""); // Used for room.label or bed.bedId
    const [deptName, setDeptName] = useState("");
    const [roomLabel, setRoomLabel] = useState("");
    const [categoryType, setCategoryType] = useState("");
    const [floor, setFloor] = useState("");
    const [ward, setWard] = useState("");
    const [price, setPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [roomsList, setRoomsList] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (unitTypes && unitTypes.length > 0 && !initialData) {
                setCategoryType(unitTypes[0]);
            }
            if (type === 'room') {
                setName(initialData?.label || "");
                setCategoryType(initialData?.type || (unitTypes?.[0] || ""));
                setDeptName(initialData?.department || ""); // String in schema
            } else {
                setName(initialData?.bedId || "");
                setDeptName(initialData?.department || "");
                setRoomLabel(initialData?.room || "");
                setCategoryType(initialData?.type || "");
                setFloor(initialData?.floor || "");
                setWard(initialData?.ward || "");
                setPrice(initialData?.pricePerDay?.toString() || "");
            }
            fetchRooms();
        }
    }, [isOpen, initialData, type]);

    const fetchRooms = async () => {
        try {
            const data = await ipdService.getRooms();
            setRoomsList(data);
        } catch (error) { }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            let payload: any = {};
            if (type === 'room') {
                payload = {
                    label: name,
                    type: categoryType,
                    department: deptName
                };
            } else {
                payload = {
                    bedId: name,
                    type: categoryType,
                    floor: floor,
                    room: roomLabel,
                    department: deptName,
                    ward: ward,
                    pricePerDay: Number(price) || 0
                };
            }
            await onSave(payload);
            onClose();
        } catch (error: any) {
            toast.error(error?.message || "Process failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-5xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tight">
                            {initialData ? `Edit ${type}` : `New ${type}`}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clinical Asset Registry</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                {type === 'bed' ? 'Bed ID / Number' : 'Room Label/Name'}
                            </label>
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                placeholder={type === 'bed' ? "e.g. B-101" : "e.g. WARD A"}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Unit Type</label>
                            <select
                                required
                                value={categoryType}
                                onChange={(e) => setCategoryType(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                            >
                                <option value="">Select...</option>
                                {unitTypes.map((u: string) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Department</label>
                            <select
                                required
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                            >
                                <option value="">Select...</option>
                                {departments.map((d: any) => (
                                    <option key={d._id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {type === 'bed' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Floor</label>
                                    <input
                                        required
                                        value={floor}
                                        onChange={(e) => setFloor(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. 1st Floor"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Room</label>
                                    <select
                                        required
                                        value={roomLabel}
                                        onChange={(e) => setRoomLabel(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                                    >
                                        <option value="">Select...</option>
                                        {roomsList.map((r: any) => (
                                            <option key={r._id} value={r.label}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Ward Name</label>
                                    <input
                                        value={ward}
                                        onChange={(e) => setWard(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. North Wing"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Daily Price (₹)</label>
                                    <input
                                        required
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                        <button disabled={loading} type="submit" className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            {initialData ? "Update Asset" : "Register Asset"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HRHospitalDepartments = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<'depts' | 'rooms' | 'beds'>('depts');

    // Modal states
    const [deptModal, setDeptModal] = useState<{ open: boolean, data: any }>({ open: false, data: null });
    const [infraModal, setInfraModal] = useState<{ open: boolean, type: 'room' | 'bed', data: any }>({ open: false, type: 'room', data: null });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [deptsData, roomsData, bedsData, unitTypesData] = await Promise.all([
                ipdService.getIPDDepartments(),
                ipdService.getRooms(),
                ipdService.getBeds(),
                ipdService.getUnitTypes().catch(() => [])
            ]);
            setDepartments(deptsData || []);
            setRooms(roomsData || []);
            setBeds(bedsData || []);
            setUnitTypes(unitTypesData || []);
        } catch (error) {
            toast.error("Failed to load clinical infrastructure");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDept = async (payload: any) => {
        try {
            if (deptModal.data) {
                await ipdService.updateIPDDepartment(deptModal.data._id, payload);
                toast.success("Department updated");
            } else {
                await ipdService.createIPDDepartment(payload);
                toast.success("Department deployed");
            }
            fetchDashboardData();
        } catch (error: any) {
            toast.error(error?.message || "Operation failed");
        }
    };

    const handleSaveInfra = async (payload: any) => {
        const type = infraModal.type;
        try {
            if (infraModal.data) {
                if (type === 'room') await ipdService.updateRoom(infraModal.data._id, payload);
                else await ipdService.updateBed(infraModal.data._id, payload);
                toast.success(`${type} updated`);
            } else {
                if (type === 'room') await ipdService.createRoom(payload);
                else await ipdService.createBed(payload);
                toast.success(`${type} created`);
            }
            fetchDashboardData();
        } catch (error: any) {
            toast.error(error?.message || "Operation failed");
        }
    };

    const filteredItems = () => {
        if (activeTab === 'depts') {
            return departments.filter(d =>
                d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.code?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } else if (activeTab === 'rooms') {
            return rooms.filter(r =>
                r.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.type?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } else {
            return beds.filter(b =>
                b.bedId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.room?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
    };

    return (
        <div className="space-y-3 sm:space-y-4 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                        <Building2 className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                        Infrastructure
                    </h1>

                    {/* View Tabs Inline */}
                    <div className="flex p-1 bg-slate-100/50 rounded-xl hidden md:flex">
                        {[
                            { id: 'depts', label: 'Departments', icon: Building2, count: departments.length },
                            { id: 'rooms', label: 'Rooms', icon: DoorOpen, count: rooms.length },
                            { id: 'beds', label: 'Beds', icon: Bed, count: beds.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50' : 'bg-slate-200'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="flex-1 lg:flex-none relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full lg:w-48 pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setDeptModal({ open: true, data: null })}
                            className="flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-sm transition-all"
                        >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Unit
                        </button>
                        <button
                            onClick={() => setInfraModal({ open: true, type: 'room', data: null })}
                            className="flex items-center gap-1 sm:gap-1.5 bg-white hover:bg-slate-50 text-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-sm border border-slate-200 transition-all"
                        >
                            <DoorOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Room
                        </button>
                        <button
                            onClick={() => setInfraModal({ open: true, type: 'bed', data: null })}
                            className="flex items-center gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-sm transition-all"
                        >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Bed
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile View Tabs (Shown only on small screens) */}
            <div className="flex p-1 bg-slate-100/50 rounded-xl md:hidden overflow-x-auto custom-scrollbar">
                {[
                    { id: 'depts', label: 'Departments', icon: Building2, count: departments.length },
                    { id: 'rooms', label: 'Rooms', icon: DoorOpen, count: rooms.length },
                    { id: 'beds', label: 'Beds', icon: Bed, count: beds.length },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon size={12} />
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50' : 'bg-slate-200'}`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing...</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    {activeTab === 'depts' && filteredItems().map((dept: any) => (
                        <div key={dept._id} className="group bg-white rounded-[16px] sm:rounded-[20px] border border-slate-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2 sm:mb-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Building2 size={14} className="sm:w-4 sm:h-4" />
                                    </div>
                                    <button
                                        onClick={() => setDeptModal({ open: true, data: dept })}
                                        className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        <Edit3 size={12} />
                                    </button>
                                </div>
                                <h3 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{dept.name}</h3>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Code: {dept.code || "UNCATEGORIZED"}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-300 uppercase">Verified Unit</span>
                                <div className="text-[8px] font-black text-slate-200">ID: {dept._id?.slice(-4).toUpperCase()}</div>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'rooms' && filteredItems().map((room: any) => (
                        <div key={room._id} className="group bg-white rounded-[16px] sm:rounded-[20px] border border-slate-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2 sm:mb-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <DoorOpen size={14} className="sm:w-4 sm:h-4" />
                                </div>
                                <button
                                    onClick={() => setInfraModal({ open: true, type: 'room', data: room })}
                                    className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                >
                                    <Edit3 size={12} />
                                </button>
                            </div>
                            <h3 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{room.label}</h3>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">{room.type || "GENERAL"}</p>
                            {room.department && (
                                <p className="text-[8px] font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase">
                                    <Layers size={8} /> {room.department}
                                </p>
                            )}
                        </div>
                    ))}

                    {activeTab === 'beds' && filteredItems().map((bed: any) => (
                        <div key={bed._id} className="group bg-white rounded-[16px] sm:rounded-[20px] border border-slate-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2 sm:mb-3">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner transition-all ${bed.status === 'Occupied' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    <Bed size={14} className="sm:w-4 sm:h-4" />
                                </div>
                                <button
                                    onClick={() => setInfraModal({ open: true, type: 'bed', data: bed })}
                                    className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                >
                                    <Edit3 size={12} />
                                </button>
                            </div>
                            <h3 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{bed.bedId}</h3>
                            <div className="flex items-center gap-1.5 mb-2 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${bed.status === 'Occupied' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{bed.status}</p>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1"><DoorOpen size={8} /> {bed.room || "N/A"}</span>
                                    <span className="flex items-center gap-1 text-emerald-600"><IndianRupee size={8} /> {bed.pricePerDay || 0}/d</span>
                                </div>
                                <div className="flex items-center justify-between text-[7px] font-bold text-slate-300 uppercase italic">
                                    <span>{bed.floor || "G-Floor"}</span>
                                    <span>{bed.type}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Quick Add Placeholder */}
                    <button
                        onClick={() => {
                            if (activeTab === 'depts') setDeptModal({ open: true, data: null });
                            else setInfraModal({ open: true, type: activeTab === 'rooms' ? 'room' : 'bed', data: null });
                        }}
                        className="group bg-slate-50/50 rounded-[16px] sm:rounded-[20px] border-2 border-dashed border-slate-200 p-3 sm:p-4 flex flex-col items-center justify-center hover:bg-white hover:border-indigo-200 transition-all gap-1.5 sm:gap-2 min-h-[120px] sm:min-h-[140px]"
                    >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 shadow-sm transition-all group-hover:scale-110">
                            <Plus size={16} className="sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Provision Resource</span>
                    </button>
                </div>
            )}

            {/* Modals */}
            <DepartmentModal
                isOpen={deptModal.open}
                onClose={() => setDeptModal({ ...deptModal, open: false })}
                onSave={handleSaveDept}
                department={deptModal.data}
            />

            <InfrastructureModal
                isOpen={infraModal.open}
                type={infraModal.type}
                onClose={() => setInfraModal({ ...infraModal, open: false })}
                onSave={handleSaveInfra}
                departments={departments}
                unitTypes={unitTypes}
                initialData={infraModal.data}
            />
        </div>
    );
};

export default HRHospitalDepartments;
