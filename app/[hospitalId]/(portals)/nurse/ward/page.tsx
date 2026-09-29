'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Search,
    User,
    RefreshCw,
    Monitor,
    Bed as BedIcon,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    Heart,
    Clock,
    ShieldAlert,
    LayoutGrid,
    Table as TableIcon,
    X,
    ClipboardList
} from 'lucide-react';
import { ipdService, staffService } from '@/lib/integrations';
import { Bed } from '@/lib/integrations/types';
import toast from 'react-hot-toast';
import { calculateStayDuration } from '@/lib/utils/date-utils';
import HybridRoomSearch from '@/components/shared/HybridRoomSearch';
import MedicationAdministrationModal from '../components/MedicationAdministrationModal';
import LabReportsViewModal from '../components/LabReportsViewModal';
import ClinicalNotesViewModal from '../components/ClinicalNotesViewModal';
import VitalsEntryModal from '../components/VitalsEntryModal';
import { Pill, Beaker } from 'lucide-react';

const MonitoringTimer = ({ lastRecorded, status }: { lastRecorded?: string | Date; status?: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!lastRecorded || status === 'Stable') return;

        const updateTimer = () => {
            const last = new Date(lastRecorded).getTime();
            const now = Date.now();
            const diffMs = now - last;

            // Hardcoded defaults (matching NABH/Backend fallback)
            const intervalHours = status === 'Critical' ? 1 : 8;
            const intervalMs = intervalHours * 60 * 60 * 1000;

            if (diffMs >= intervalMs) {
                setIsOverdue(true);
                const overdueMs = diffMs - intervalMs;
                const hours = Math.floor(overdueMs / (1000 * 60 * 60));
                const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`Overdue ${hours}h ${mins}m`);
            } else {
                setIsOverdue(false);
                const remainingMs = intervalMs - diffMs;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`Due in ${hours}h ${mins}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastRecorded, status]);

    if (!lastRecorded || status === 'Stable') return null;

    return (
        <div className={`flex items-center gap-1 px-1 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest ${isOverdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-600'}`}>
            <Clock size={8} />
            {timeLeft}
        </div>
    );
};

const AnimatedNumber = ({ value, trigger }: { value: number; trigger: any }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const end = value;
        if (end === 0) {
            setTimeout(() => setDisplayValue(0), 0);
            return;
        }

        const duration = 800;
        const frameRate = 1000 / 60;
        const totalFrames = Math.round(duration / frameRate);
        const increment = Math.ceil(end / totalFrames) || 1;

        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(current);
            }
        }, frameRate);

        return () => clearInterval(timer);
    }, [value, trigger]);

    return <>{displayValue}</>;
};

const BedBlock = ({ bed, selectedBedId, handleBedClick, getStatusColor }: any) => {
    return (
        <div className="group">
            <button
                onClick={() => handleBedClick(bed)}
                className={`
                    relative p-2 rounded-[20px] border transition-all duration-500 text-left w-full h-full min-h-[150px] flex flex-col justify-between overflow-hidden
                    ${selectedBedId === bed._id ? 'border-teal-500 bg-white ring-2 ring-teal-500/10 shadow-lg' :
                        bed.currentOccupancy?.condition === 'Critical' ? 'border-rose-200 bg-rose-50/30' :
                            'border-slate-100 bg-white hover:border-teal-400 hover:shadow-md'}
                `}
            >
                <div className="flex justify-between items-start w-full">
                    <div className={`w-7 h-7 rounded-lg ${getStatusColor(bed.status)} flex items-center justify-center text-white shadow-sm relative shrink-0`}>
                        <BedIcon size={12} />
                        {bed.currentOccupancy?.condition === 'Critical' && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-600 rounded-full border border-white animate-pulse" />
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[6px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(bed.status)} text-white tracking-widest`}>
                            {bed.status[0]}
                        </span>
                        {bed.status === 'Occupied' && bed.currentOccupancy?.admissionDate && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[6px] font-black uppercase tracking-tighter">
                                <Clock size={8} />
                                {calculateStayDuration(bed.currentOccupancy.admissionDate)}
                            </div>
                        )}
                        {bed.currentOccupancy && (
                            <MonitoringTimer
                                lastRecorded={bed.currentOccupancy.lastVitalsRecordedAt}
                                status={bed.currentOccupancy.condition}
                            />
                        )}
                    </div>
                </div>

                <div className="mt-1">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-tight">{bed.bedId}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 capitalize">
                            {bed.status === 'Occupied' ? (bed.currentOccupancy?.patientName || 'Loading...') : bed.type}
                        </span>
                    </div>
                    {bed.status === 'Occupied' && bed.currentOccupancy && (() => {
                        const admission = bed.currentOccupancy;
                        const reasonText = admission.reasonForAdmission || admission.reason;
                        if (!reasonText) return null;
                        
                        return (
                            <p className="text-[7.5px] font-bold text-teal-600 mt-1 opacity-90 uppercase tracking-tighter" title={reasonText}>
                                {reasonText}
                            </p>
                        );
                    })()}
                </div>

                <div className="mt-auto space-y-1 pt-2 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1 overflow-hidden">
                            <span className="text-[8px] font-black text-slate-500 uppercase">R:{bed.room || "?"}</span>
                        </div>
                        <div className="flex items-center gap-1 overflow-hidden">
                            <span className="text-[8px] font-black text-slate-500 uppercase">F:{bed.floor || "?"}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">
                            {bed.department || bed.ward || "GEN"}
                        </span>
                        {bed.currentOccupancy?.condition === 'Critical' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[6px] font-black uppercase tracking-widest">
                                <ShieldAlert size={8} /> CRITICAL
                            </div>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );
};

const NoBedsError = () => (
    <div className="col-span-full py-12 sm:py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
            <Activity size={32} />
        </div>
        <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">No Units Detected</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Try adjusting your filters or search query</p>
        </div>
    </div>
);

export default function WardStatus() {
    const [beds, setBeds] = useState<Bed[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '', department: '', room: '' });
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [nurseDept, setNurseDept] = useState<string | string[] | null>(null);
    const [nurseRooms, setNurseRooms] = useState<string[]>([]);
    const [allRooms, setAllRooms] = useState<any[]>([]);
    const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
    const [bedDetails, setBedDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isVitalsOpen, setIsVitalsOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isMedsOpen, setIsMedsOpen] = useState(false);
    const [isLabModalOpen, setIsLabModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const bedsPerPage = 18; // Slightly less for dense nurse view
    const [isAnimating, setIsAnimating] = useState(false);

    const triggerActivityAnimation = () => {
        setIsAnimating(false);
        setTimeout(() => setIsAnimating(true), 10);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Trigger animation on load or interaction
    useEffect(() => {
        triggerActivityAnimation();
    }, [debouncedSearch, filters]);

    const fetchBeds = React.useCallback(async (dept?: string, skipCache: boolean = false) => {
        try {
            setLoading(true);
            // Fetch both beds and active admissions in parallel to enrich data
            const [bedsData, activeAdmissions] = await Promise.all([
                ipdService.getBeds({
                    ...filters,
                    department: dept || filters.department || undefined,
                } as any, skipCache),
                ipdService.getActiveAdmissions(dept || filters.department || undefined, skipCache).catch(() => [])
            ]);

            // Enrich beds with full admission records for exhaustive clinical info (reason, symptoms)
            const enrichedBeds = bedsData.map(bed => {
                if (bed.status === 'Occupied' && bed.currentOccupancy) {
                    const admission = activeAdmissions.find(a => (a.admissionId || a.id || a._id) === bed.currentOccupancy?.admissionId);
                    if (admission) {
                        return {
                            ...bed,
                            currentOccupancy: {
                                ...bed.currentOccupancy,
                                // Strictly use the clinical reason. Strip legacy 'not now.' notes.
                                reason: (admission.reason && admission.reason !== 'not now.') 
                                    ? admission.reason 
                                    : 'No specific reason provided.'
                            }
                        };
                    }
                }
                return bed;
            });

            console.log("[WardPage] Final Enriched Beds (Sample):", enrichedBeds.filter(b => b.status === 'Occupied')[0]?.currentOccupancy);
            console.log("[HospitalAdmin] ENRICHED BEDS COUNT:", enrichedBeds.filter(b => b.status === 'Occupied').length);
            console.log("[HospitalAdmin] SAMPLE OCCUPIED REASON:", enrichedBeds.find(b => b.status === 'Occupied' && b.currentOccupancy?.reason)?.currentOccupancy?.reason);
            setBeds(enrichedBeds);
        } catch (error: any) {
            toast.error(error.message || "Failed to load beds");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchBedDetails = React.useCallback(async (id: string, silent = false) => {
        if (!id) return;
        try {
            if (!silent) setDetailsLoading(true);
            const data = await ipdService.getBedDetails(id);
            
            // Enrich with full admission details for exhaustive clinical information
            if (data.bed.status === 'Occupied' && data.occupancyDetails?.admissionId) {
                console.log("[WardPage] Fetching Full Admission for ID:", data.occupancyDetails?.admissionId);
                try {
                    const fullAdmission = await ipdService.getAdmissionDetails(data.occupancyDetails?.admissionId || '');
                    console.log("[WardPage] Full Admission Detail for Sidebar:", {
                        id: data.occupancyDetails?.admissionId,
                        reason: fullAdmission?.reason,
                        reasonForAdmission: fullAdmission?.reasonForAdmission,
                        clinicalNotes: fullAdmission?.clinicalNotes
                    });
                    if (fullAdmission && data.occupancyDetails) {
                        const bedFromList = beds.find(b => b._id === id);
                        // Strictly take the reason that is correctly showing on the bed card (enriched during list fetch)
                        const existingReason = bedFromList?.currentOccupancy?.reason;
                        const currentDetails = data.occupancyDetails;

                        data.occupancyDetails = {
                            ...currentDetails,
                            ...fullAdmission,
                            // Prioritize the clinical reason from the enriched list (e.g. 'HEART ATTACK')
                            reason: (existingReason && existingReason !== 'not now.') ? existingReason : (fullAdmission.reason && fullAdmission.reason !== 'not now.' ? fullAdmission.reason : 'No specific reason provided.'),
                            // Preserve UI-specific mapped fields from original bed details
                            patient: currentDetails.patient,
                            doctor: currentDetails.doctor
                        };
                        console.log("[WardPage] SIDEBAR FINAL ENRICHED REASON:", data.occupancyDetails?.reason);
                    }
                } catch (admErr) {
                    console.warn("Failed to fetch full admission details for sidebar:", admErr);
                }
            }
            
            setBedDetails(data);
        } catch (error: any) {
            console.error("Bed Details Fetch Error:", error);
            toast.error("Could not load bed details");
        } finally {
            if (!silent) setDetailsLoading(false);
        }
    }, [beds]);

    useEffect(() => {
        const init = async () => {
            try {
                const [profileData, types, fetchedRooms] = await Promise.all([
                    staffService.getProfile(),
                    ipdService.getUnitTypes().catch(() => []),
                    ipdService.getRooms().catch(() => [])
                ]);
                setUnitTypes(types);
                setAllRooms(fetchedRooms);
                if (!profileData?.staff) {
                    throw new Error("Staff profile not found");
                }
                const dept = profileData.staff.department || '';
                // Deduplicate and ensure array
                const deptsArray = Array.isArray(dept) ? [...new Set(dept.filter(Boolean))] : (dept ? [dept] : []);
                setNurseDept(deptsArray);

                const assignedRooms = profileData.staff.assignedRoom || [];
                const roomsArray = Array.isArray(assignedRooms) ? [...new Set(assignedRooms.filter(Boolean))] : [assignedRooms].filter(Boolean);
                setNurseRooms(roomsArray);

                // No more mapping "General Ward" to "General" - backend handles search regex correctly
                const initialFilters: any = { ...filters, department: deptsArray.join(',') };
                if (roomsArray.length > 0) {
                    initialFilters.room = roomsArray.join(',');
                }

                setFilters(initialFilters);
                // No need to call fetchBeds here; the next useEffect handles it once nurseDept is set
            } catch (e) {
                console.error("Failed to load nurse profile or hospital metadata", e);
                setNurseDept(''); // Ensure it's not null to allow fallback fetch
            }
        };
        init();
    }, []); // Only run once on mount

    useEffect(() => {
        if (nurseDept !== null) { // Only fetch after init
            fetchBeds();
        }
    }, [filters.status, filters.type, filters.room, fetchBeds, nurseDept]);

    const filteredBeds = beds.filter(bed =>
        bed.bedId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (bed.room && bed.room.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (bed.floor && bed.floor.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredBeds.length / bedsPerPage);
    const paginatedBeds = filteredBeds.slice((currentPage - 1) * bedsPerPage, currentPage * bedsPerPage);

    const handleBedClick = (bed: Bed) => {
        setSelectedBedId(bed._id);
        fetchBedDetails(bed._id);
        
        if (typeof window !== 'undefined' && window.innerWidth < 1280) {
            setTimeout(() => {
                const detailPanel = document.getElementById('detail-panel');
                if (detailPanel) {
                    const y = detailPanel.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Vacant': return 'bg-emerald-500';
            case 'Occupied': return 'bg-rose-500';
            case 'Cleaning': return 'bg-amber-500';
            default: return 'bg-slate-400';
        }
    };

    const TableView = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Bed / Unit</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Vitals</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedBeds.map((bed: any) => (
                            <tr key={bed._id} className={`hover:bg-slate-50/50 transition-colors ${selectedBedId === bed._id ? 'bg-teal-50/30' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${getStatusColor(bed.status)}`}>
                                            <BedIcon size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{bed.bedId}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">R{bed.room} • {bed.type}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {bed.currentOccupancy ? (
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{bed.currentOccupancy.patientName}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {bed.currentOccupancy.admissionId}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">Vacant Unit</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {bed.currentOccupancy ? (
                                        <div className="max-w-[180px]">
                                            <p className="text-[10px] font-bold text-slate-700 leading-tight">
                                                {bed.currentOccupancy.reasonForAdmission || bed.currentOccupancy.reason || '-'}
                                            </p>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    {bed.currentOccupancy ? (
                                        <div className="flex justify-center items-center gap-2">
                                            {bed.currentOccupancy.condition === 'Critical' ? (
                                                <div className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                                    <ShieldAlert size={10} /> Critical
                                                </div>
                                            ) : (
                                                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                    Stable
                                                </div>
                                            )}
                                            <div className="flex -space-x-1">
                                                <div className="w-4 h-1.5 bg-rose-200 rounded-full border border-white" title="Temp" />
                                                <div className="w-4 h-1.5 bg-blue-200 rounded-full border border-white" title="SpO2" />
                                                <div className="w-4 h-1.5 bg-emerald-200 rounded-full border border-white" title="BP" />
                                            </div>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(bed.status)} text-white`}>
                                        {bed.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => handleBedClick(bed)}
                                            className="p-1.5 bg-white border border-slate-200 hover:border-teal-400 text-slate-400 hover:text-teal-600 rounded-lg transition-all"
                                        >
                                            <Monitor size={12} />
                                        </button>
                                        {bed.status === 'Occupied' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedBedId(bed._id);
                                                    fetchBedDetails(bed._id);
                                                    setIsVitalsOpen(true);
                                                }}
                                                className="p-1.5 bg-white border border-slate-200 hover:border-rose-400 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                            >
                                                <Activity size={12} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-20 text-slate-900">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-2 sm:pb-3 px-2 sm:px-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="shrink-0">
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-2.5 uppercase leading-none">
                            <Activity size={14} className="text-blue-600" strokeWidth={2.5} />
                            Ward Status Hub
                        </h1>
                        <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1 italic">
                            {nurseDept ? `${Array.isArray(nurseDept) ? nurseDept.join(' & ') : nurseDept} Unit Monitoring` : 'All Units Monitoring'}
                        </p>
                    </div>

                    {/* QUICK STATS CARDS BAR */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        {unitTypes.map(type => {
                            const bedsInType = beds.filter(b => b.type === type);
                            const occupiedInType = bedsInType.filter(b => b.status === 'Occupied').length;
                            if (bedsInType.length === 0) return null;

                            return (
                                <div key={type} className="flex flex-col gap-1 p-1.5 px-3 bg-white rounded-lg border border-slate-100 shadow-sm min-w-[100px] hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{type}</span>
                                        <span className="text-[8px] font-extrabold text-slate-900 leading-none">{occupiedInType}/{bedsInType.length}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-rose-500 transition-all duration-1000"
                                            style={{ width: `${(occupiedInType / bedsInType.length) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-1000"
                                            style={{ width: `${((bedsInType.length - occupiedInType) / bedsInType.length) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[6px] font-black text-slate-300 uppercase tracking-tighter leading-none">
                                        {Math.round((occupiedInType / bedsInType.length) * 100)}% OCC RATE
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-0">
                    {/* VIEW TOGGLE */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={10} /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <TableIcon size={10} /> Table
                        </button>
                    </div>

                    <button
                        onClick={() => fetchBeds(undefined, true)}
                        className="p-1.5 sm:p-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                        <RefreshCw size={12} className={`${loading ? 'animate-spin' : ''} sm:size-[14px]`} />
                    </button>
                    <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-900 text-white rounded-lg sm:rounded-xl text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-3 sm:gap-4 shadow-lg overflow-hidden">
                        <div className="flex items-center gap-1.5 sm:gap-2 pr-3 sm:pr-4 border-r border-white/10">
                            <span className="text-slate-400">Total</span>
                            <span className="min-w-[12px] text-center">
                                <AnimatedNumber value={filteredBeds.length} trigger={debouncedSearch + JSON.stringify(filters)} />
                            </span>
                        </div>
                        <div className="flex gap-1 h-3 sm:h-4 items-end">
                            <div className={`w-1 h-full bg-emerald-500 rounded-full transition-all duration-300 ${isAnimating ? 'animate-bar-bounce' : ''}`} />
                            <div className={`w-1 h-full bg-rose-500 rounded-full transition-all duration-300 ${isAnimating ? 'animate-bar-bounce delay-100' : ''}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS AREA MOVED TO HEADER */}

            {/* FILTERS & STATS */}
            <div className="px-2 sm:px-0">
                <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            placeholder="Find Bed or Room..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest outline-none transition-all placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <select
                            className="flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-2 sm:py-3 bg-slate-50 border border-slate-100 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="">All Status</option>
                            <option value="Vacant">Vacant</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Cleaning">Cleaning</option>
                        </select>
                        <select
                            className="flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none sm:min-w-0 px-3 sm:px-6 py-2 sm:py-3 bg-slate-50 border border-slate-100 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                            value={filters.type}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, type: e.target.value, room: '' }));
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">All Types</option>
                            {unitTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <HybridRoomSearch
                            value={filters.room}
                            onSelect={(val) => {
                                setFilters(prev => ({ ...prev, room: val }));
                                setCurrentPage(1);
                            }}
                            rooms={allRooms.filter(r => nurseRooms.length === 0 || nurseRooms.includes(r.label))}
                            typeFilter={filters.type}
                            className="w-full sm:flex-1 sm:w-auto"
                        />
                    </div>

                    {/* PAGINATION */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4 py-1 ml-auto">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-1 px-1.5">
                                <span className="text-[10px] sm:text-[11px] font-black text-slate-900">{currentPage}</span>
                                <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest">of {totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-2 sm:px-0">
                {/* GRID / TABLE VIEW */}
                <div className="xl:col-span-3 order-2 xl:order-1">
                    {loading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                            {Array(12).fill(0).map((_, i) => (
                                <div key={i} className="aspect-square bg-slate-100 rounded-xl sm:rounded-3xl animate-pulse border border-slate-50" />
                            ))}
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-1.5 sm:gap-3 items-start">
                            {paginatedBeds.length > 0 ? (
                                paginatedBeds.map((bed) => (
                                    <BedBlock key={bed._id} bed={bed} selectedBedId={selectedBedId} handleBedClick={handleBedClick} getStatusColor={getStatusColor} />
                                ))
                            ) : <NoBedsError />}
                        </div>
                    ) : (
                        <TableView />
                    )}
                </div>

                {/* DETAIL PANEL */}
                <div id="detail-panel" className="xl:col-span-1 order-1 xl:order-2">
                    <div className="bg-white rounded-[1rem] sm:rounded-[1rem] border border-slate-200 shadow-xl overflow-hidden xl:sticky xl:top-24 h-fit">
                        {!selectedBedId ? (
                            <div className="p-8 sm:p-12 text-center space-y-3 sm:space-y-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                                    <Monitor size={24} className="sm:size-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase">No Bed Selected</p>
                                    <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 mt-1 sm:mt-2 uppercase tracking-widest">Select a bed to view details</p>
                                </div>
                            </div>
                        ) : detailsLoading ? (
                            <div className="p-10 sm:p-20 flex justify-center">
                                <RefreshCw className="animate-spin text-teal-600" size={24} />
                            </div>
                        ) : (
                            bedDetails && (
                                <div className="flex flex-col">
                                    <div className={`p-3 ${getStatusColor(bedDetails.bed.status)} text-white`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-sm font-black uppercase tracking-tighter leading-tight">{bedDetails.bed.bedId}</h2>
                                            <div className="flex items-center gap-2">
                                              <div className="px-1.5 py-0.5 bg-white/20 rounded-lg text-[7px] font-black uppercase  backdrop-blur-md">
                                                  {bedDetails.bed.status}
                                              </div>
                                              <button onClick={() => { setSelectedBedId(null); setBedDetails(null); }} className="p-1 hover:bg-white/20 rounded-md transition-colors xl:hidden">
                                                  <X size={14} />
                                              </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0">
                                                <p className="text-[7px] font-black uppercase tracking-widest opacity-60">Room Node</p>
                                                <p className="text-[10px] font-bold uppercase">{bedDetails.bed.room}</p>
                                            </div>
                                            <div className="space-y-0">
                                                <p className="text-[7px] font-black uppercase tracking-widest opacity-60">Floor Node</p>
                                                <p className="text-[10px] font-bold uppercase">Level {bedDetails.bed.floor}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 space-y-4">
                                        {bedDetails.bed.status === 'Occupied' && bedDetails.occupancyDetails ? (
                                            <>
                                                {/* PATIENT PROFILE */}
                                                <section className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <User size={10} className="text-teal-600" />
                                                        <p className="text-[7px] font-black uppercase tracking-widest">Current Patient</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-none">{bedDetails.occupancyDetails.patient.name}</p>
                                                        <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest leading-none">ID: {bedDetails.occupancyDetails.admissionId}</p>
                                                    </div>
                                                </section>

                                                {/* CLINICAL TRIAGE */}
                                                 <section className="grid grid-cols-2 gap-2">
                                                     <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center text-center gap-1">
                                                         <Stethoscope size={14} className="text-teal-500 mb-1" />
                                                         <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Primary Doctor</p>
                                                         <p className="text-[8px] font-bold text-slate-700 uppercase w-full">{bedDetails.occupancyDetails.doctor?.user?.name || 'N/A'}</p>
                                                     </div>
                                                     <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center text-center gap-1">
                                                         <Activity size={14} className="text-rose-500 mb-1" />
                                                         <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Adm. Since</p>
                                                         <p className="text-[8px] font-bold text-slate-700">
                                                             {new Date(bedDetails.occupancyDetails.admissionDate).toLocaleDateString()}
                                                         </p>
                                                         <p className="text-[7px] font-black text-rose-600 uppercase tracking-tighter mt-0.5">
                                                             STAY: {calculateStayDuration(bedDetails.occupancyDetails.admissionDate)}
                                                         </p>
                                                     </div>
                                                 </section>

                                                 {/* REASON FOR ADMISSION */}
                                                 <section className="space-y-1.5">
                                                     <div className="flex items-center gap-1.5 text-slate-400">
                                                         <ClipboardList size={10} className="text-teal-600" />
                                                         <p className="text-[7px] font-black uppercase tracking-widest">Reason for Admission</p>
                                                     </div>
                                                     <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                                                         <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed" title={bedDetails.occupancyDetails.reason}>
                                                             {bedDetails.occupancyDetails.reason || 'No specific reason provided.'}
                                                         </p>
                                                     </div>
                                                 </section>

                                                {/* VITALS SNAPSHOT */}
                                                <section className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Heart size={10} className="text-rose-500" />
                                                        <p className="text-[7px] font-black uppercase tracking-widest">Health Snapshot</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1.5 text-[7px] font-bold uppercase tracking-tight">
                                                        <div className="flex justify-between p-1 bg-rose-50 text-rose-600 rounded-md">
                                                            <span>BP</span>
                                                            <span>{bedDetails.occupancyDetails.vitals?.bloodPressure || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between p-1 bg-emerald-50 text-emerald-600 rounded-md">
                                                            <span>Temp</span>
                                                            <span>{bedDetails.occupancyDetails.vitals?.temperature || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between p-1 bg-blue-50 text-blue-600 rounded-md">
                                                            <span>SpO2</span>
                                                            <span>{bedDetails.occupancyDetails.vitals?.spO2 || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between p-1 bg-amber-50 text-amber-600 rounded-md">
                                                            <span>Pulse</span>
                                                            <span>{bedDetails.occupancyDetails.vitals?.pulse || 'N/A'}</span>
                                                        </div>
                                                        {bedDetails.occupancyDetails.vitals?.condition && (
                                                            <div className="col-span-2 flex justify-between p-1 bg-slate-50 text-slate-600 rounded-md">
                                                                <span>Condition</span>
                                                                <span>{bedDetails.occupancyDetails.vitals.condition}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </section>

                                                {/* QUICK ACTIONS */}
                                                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                                                    <button
                                                        onClick={() => setIsVitalsOpen(true)}
                                                        className="w-full py-2 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                                    >
                                                        View Vitals
                                                    </button>
                                                    <button
                                                        onClick={() => setIsNotesOpen(true)}
                                                        className="w-full py-2 border border-slate-100 text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                                                    >
                                                        View Clinical Notes
                                                    </button>
                                                    <button
                                                        onClick={() => setIsMedsOpen(true)}
                                                        className="w-full py-2 border border-amber-100 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Pill size={12} />
                                                        Medicine Hub
                                                    </button>
                                                    <button
                                                        onClick={() => setIsLabModalOpen(true)}
                                                        className="w-full py-2 border border-purple-100 text-purple-600 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Beaker size={12} />
                                                        Lab Reports
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="py-6 space-y-4 text-center">
                                                <div className="w-16 h-16 bg-emerald-50 rounded-[30px] flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                                                    <Activity size={32} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Vacant & Ready</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed px-4">This unit is sanitized and available for new admissions.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {bedDetails?.occupancyDetails && (
                <>
                    <VitalsEntryModal
                        isOpen={isVitalsOpen}
                        onClose={() => setIsVitalsOpen(false)}
                        admissionId={bedDetails.occupancyDetails.admissionId}
                        patientName={bedDetails.occupancyDetails.patient.name}
                        onSuccess={() => fetchBedDetails(selectedBedId!, true)}
                        readOnly={true}
                        initialData={bedDetails.occupancyDetails.vitals}
                    />
                    <MedicationAdministrationModal
                        isOpen={isMedsOpen}
                        onClose={() => setIsMedsOpen(false)}
                        admissionId={bedDetails.occupancyDetails.admissionId}
                        patientName={bedDetails.occupancyDetails.patient?.name || 'Unknown Patient'}
                        onSuccess={() => fetchBedDetails(selectedBedId!, true)}
                    />

                    <LabReportsViewModal
                        isOpen={isLabModalOpen}
                        onClose={() => setIsLabModalOpen(false)}
                        admissionId={bedDetails.occupancyDetails.admissionId}
                        patientName={bedDetails.occupancyDetails.patient?.name || 'Unknown Patient'}
                    />

                    <ClinicalNotesViewModal
                        isOpen={isNotesOpen}
                        onClose={() => setIsNotesOpen(false)}
                        admissionId={bedDetails.occupancyDetails.admissionId}
                        patientName={bedDetails.occupancyDetails.patient.name}
                    />
                </>
            )}
        </div>
    );
}
