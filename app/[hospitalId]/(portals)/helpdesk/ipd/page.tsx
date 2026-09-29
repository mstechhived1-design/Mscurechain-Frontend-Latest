'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Activity,
    Search,
    LogOut,
    ArrowRightLeft,
    User,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Monitor,
    Plus,
    Bed as BedIcon,
    ChevronLeft,
    ChevronRight,
    Receipt,
    Clock,
    ClipboardList,
    X,
} from 'lucide-react';
import { joinSocketRoom, getSocket } from '@/lib/integrations/api/socket';
import { useRouter, useParams } from 'next/navigation';
import { ipdService } from '@/lib/integrations';
import { helpdeskService } from '@/lib/integrations/services/helpdesk.service';
import { apiClient } from '@/lib/integrations/api';
import { Bed } from '@/lib/integrations/types';
import toast from 'react-hot-toast';
import { calculateStayDuration } from '@/lib/utils/date-utils';
import HybridRoomSearch from '@/components/shared/HybridRoomSearch';
import { IPDBillingModal } from '@/components/helpdesk/IPDBillingModal';
import { format } from 'date-fns';

const AnimatedNumber = ({ value, trigger }: { value: number; trigger: any }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const start = 0;
        const end = value;
        if (end === 0) {
            setTimeout(() => setDisplayValue(0), 0);
            return;
        }

        const duration = 800; // ms
        const frameRate = 1000 / 60; // 60 fps
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

export default function IPDCenter() {
    const router = useRouter();
    const [beds, setBeds] = useState<Bed[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '', room: '' });
    const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
    const [bedDetails, setBedDetails] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [activeRequestFilter, setActiveRequestFilter] = useState<'discharge' | 'transfer' | null>(null);
    const params = useParams();
    const hospitalIdParam = params?.hospitalId as string;
    const [patientSearchStatus, setPatientSearchStatus] = useState<{loading: boolean, text: string | null}>({loading: false, text: null});

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const bedsPerPage = 20;

    // Modal States
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [selectedNewBedId, setSelectedNewBedId] = useState<string>('');
    const [vacantBeds, setVacantBeds] = useState<Bed[]>([]);
    const [vacantLoading, setVacantLoading] = useState(false);
    const [transferBedTypeFilter, setTransferBedTypeFilter] = useState<string>('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [dischargeLoading, setDischargeLoading] = useState(false);
    const [isCleaningFilterLoading, setIsCleaningFilterLoading] = useState(false);
    const [hospitalRooms, setHospitalRooms] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [transferBedRoomFilter, setTransferBedRoomFilter] = useState<string>('');
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [billingSummary, setBillingSummary] = useState<any>(null);
    const [billingLoading, setBillingLoading] = useState(false);
    const [pharmacyError, setPharmacyError] = useState<string | null>(null);
    const detailPanelRef = useRef<HTMLDivElement>(null);
    const [pharmacySignoffLoading, setPharmacySignoffLoading] = useState(false);

    const triggerActivityAnimation = () => {
        setIsAnimating(false);
        setTimeout(() => setIsAnimating(true), 10);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Join Notification Room
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const hospitalStr = localStorage.getItem('hospital');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const hospital = hospitalStr ? JSON.parse(hospitalStr) : null;
                const hospitalId = hospital?._id || user.hospital;

                joinSocketRoom({
                    userId: user._id,
                    role: user.role,
                    hospitalId
                });
            } catch (e) {
                console.error("Failed to join socket room:", e);
            }
        }
    }, []);

    // Fetch hospital rooms and unit types for filtering
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [rooms, types] = await Promise.all([
                    ipdService.getRooms(),
                    ipdService.getUnitTypes().catch(() => [])
                ]);
                setHospitalRooms(rooms);
                setUnitTypes(types);
            } catch (error) {
                console.error("Failed to fetch hospital initial data:", error);
            }
        };
        fetchInitialData();
    }, []);

    // Trigger animation on load or user interaction
    useEffect(() => {
        triggerActivityAnimation();
    }, [debouncedSearch, filters]);

    // Trigger vacant beds fetch on filter change in modal
    useEffect(() => {
        if (showTransferModal) {
            fetchVacantBeds(transferBedTypeFilter, transferBedRoomFilter);
        }
    }, [showTransferModal, transferBedTypeFilter, transferBedRoomFilter]);

    // ✅ AUTO-SELECT DOCTOR'S TARGET BED & FILTERS
    useEffect(() => {
        if (showTransferModal && bedDetails?.bed?._id) {
            const request = pendingRequests.find(r => r.bedId === bedDetails.bed._id && r.requestType === 'transfer');
            if (request?.instructions) {
                // Auto-fill filters from instructions
                if (request.instructions.roomType) setTransferBedTypeFilter(request.instructions.roomType);
                if (request.instructions.room) setTransferBedRoomFilter(request.instructions.room);

                // Auto-select ID if present
                if (request.instructions.targetBedId) {
                    setSelectedNewBedId(request.instructions.targetBedId);
                } else if (request.instructions.bed) {
                    // Try to find bed ID by label if we have vacant beds already
                    const match = vacantBeds.find(b => 
                        b.bedId.toLowerCase() === request.instructions.bed.toLowerCase() &&
                        (!request.instructions.room || b.room?.toLowerCase() === request.instructions.room.toLowerCase())
                    );
                    if (match) setSelectedNewBedId(match._id);
                } else {
                    setSelectedNewBedId('');
                }
            }
        }
    }, [showTransferModal, bedDetails, pendingRequests, vacantBeds]);

    const fetchPendingRequests = async (skipCache: boolean = false) => {
        try {
            const data = await ipdService.getPendingRequests(skipCache);
            setPendingRequests(data || []);
        } catch (error) {
            console.error("Failed to fetch pending requests:", error);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
        const interval = setInterval(fetchPendingRequests, 15000); // Fallback polling
        return () => clearInterval(interval);
    }, []);

    // ✅ REAL-TIME SYNC: Listen for hospital-wide IPD updates
    useEffect(() => {
        let socketInstance: any;

        const setupSocket = async () => {
            socketInstance = await getSocket();
            if (socketInstance) {
                socketInstance.on('ipd:bed_updated', (data: any) => {
                    console.log('📡 [Helpdesk] IPD Update Sync:', data);
                    fetchPendingRequests();
                    fetchBeds();
                });

                socketInstance.on('ipd:request_updated', (data: any) => {
                    console.log('📡 [Helpdesk] IPD Request Sync:', data);

                    // INSTANT SYNC: If it's a cancellation, remove from queue locally first
                    if (data.type.endsWith('_cancelled')) {
                        setPendingRequests(prev => prev.filter(r => r.admissionId !== data.admissionId));
                        toast(`Request Revoked for ${data.patientName || data.admissionId}`, { icon: '🚫' });
                    } else {
                        // For new requests, toast with doctor name
                        toast(`${data.type.toUpperCase()} requested by ${data.requestedBy || 'Doctor'}`, { icon: '🔔' });
                    }

                    fetchPendingRequests(true); // Bypass cache for real-time sync
                    fetchBeds();

                    // If the updated request matches the currently selected bed, refresh its details too
                    if (selectedBedId && bedDetails) {
                        fetchBedDetails(selectedBedId, true); // Bypass cache for real-time sidebar sync
                    }
                });
            }
        };

        setupSocket();
        return () => {
            const cleanup = async () => {
                const socket = await getSocket();
                if (socket) {
                    socket.off('ipd:bed_updated');
                    socket.off('ipd:request_updated');
                }
            };
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // fetchBeds and fetchPendingRequests are stable if defined outside or as useCallback

    const fetchBeds = async () => {
        try {
            setLoading(true);
            const [bedsData, activeAdmissions] = await Promise.all([
                ipdService.getBeds({
                    ...filters,
                    room: filters.room || undefined,
                    type: filters.type || undefined
                }),
                ipdService.getActiveAdmissions().catch(() => [])
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

            console.log("[Helpdesk IPD] ENRICHED BEDS COUNT:", enrichedBeds.filter(b => b.status === 'Occupied').length);
            console.log("[Helpdesk IPD] SAMPLE OCCUPIED REASON:", enrichedBeds.find(b => b.status === 'Occupied' && b.currentOccupancy?.reason)?.currentOccupancy?.reason);
            setBeds(enrichedBeds);
        } catch (error: any) {
            toast.error(error.message || "Failed to load beds");
        } finally {
            setLoading(false);
        }
    };

    const fetchBedDetails = async (id: string, skipCache: boolean = false) => {
        if (!id) return;
        try {
            setDetailsLoading(true);
            const data = await ipdService.getBedDetails(id, skipCache);
            
            // Enrich with full admission Details for exhaustive clinical information
            if (data.bed.status === 'Occupied' && data.occupancyDetails?.admissionId) {
                console.log("[Helpdesk IPD] Fetching Full Admission for ID:", data.occupancyDetails?.admissionId);
                try {
                    const fullAdmission = await ipdService.getAdmissionDetails(data.occupancyDetails?.admissionId || '');
                    console.log("[Helpdesk IPD] Full Admission Detail for Sidebar:", {
                        id: data.occupancyDetails?.admissionId,
                        reason: fullAdmission?.reason,
                        reasonForAdmission: fullAdmission?.reasonForAdmission,
                        clinicalNotes: fullAdmission?.clinicalNotes
                    });
                    if (fullAdmission && data.occupancyDetails) {
                        const bedFromList = beds.find(b => b._id === id);
                        const existingReason = bedFromList?.currentOccupancy?.reason;
                        const currentDetails = data.occupancyDetails;

                        data.occupancyDetails = {
                            ...currentDetails,
                            ...fullAdmission,
                            // Strictly prioritize the 'HEART ATTACK' style reason from the enriched list
                            reason: existingReason || (fullAdmission.reason && fullAdmission.reason !== 'not now.' ? fullAdmission.reason : 'No specific reason provided.'),
                            // Preserve UI-specific mapped fields from original bed details
                            patient: currentDetails.patient,
                            doctor: currentDetails.doctor
                        };
                        console.log("[Helpdesk IPD] SIDEBAR FINAL ENRICHED REASON:", data.occupancyDetails?.reason);
                    }
                } catch (admErr) {
                    console.warn("Failed to fetch full admission details for helpdesk sidebar:", admErr);
                }
            }
            
            setBedDetails(data);
        } catch (error: any) {
            console.error("Bed Details Fetch Error:", error);
            toast.error("Could not load bed details");
        } finally {
            setDetailsLoading(false);
        }
    };

    const fetchBillingSummary = async (admissionId: string) => {
        if (!admissionId) return;
        try {
            setBillingLoading(true);
            const data = await ipdService.getBillSummary(admissionId);
            setBillingSummary(data);
        } catch (error: any) {
            console.error("Billing Summary Fetch Error:", error);
            toast.error("Could not verify payment status");
        } finally {
            setBillingLoading(false);
        }
    };

    useEffect(() => {
        fetchBeds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const filteredBeds = beds.filter(bed => {
        const matchesSearch = bed.bedId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (bed.currentOccupancy?.patientName && bed.currentOccupancy.patientName.toLowerCase().includes(debouncedSearch.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeRequestFilter) {
            const hasRequest = pendingRequests.some(req =>
                req.bedId === bed._id && req.requestType === activeRequestFilter
            );
            return hasRequest;
        }

        return true;
    });

    const totalPages = Math.ceil(filteredBeds.length / bedsPerPage);

    // Global Patient Search Fallback when local beds are empty
    useEffect(() => {
        if (debouncedSearch && debouncedSearch.trim().length >= 2 && filteredBeds.length === 0 && hospitalIdParam) {
            setPatientSearchStatus({ loading: true, text: null });
            helpdeskService.searchPatients(debouncedSearch.trim())
                .then((res: any) => {
                    // apiClient returns the JSON body directly. The backend returns { data: [...], pagination: ... }
                    const patients = Array.isArray(res.data) ? res.data : (res.data?.data || res.data || []);
                    if (patients.length === 0) {
                        setPatientSearchStatus({ loading: false, text: `No patient or bed found matching "${debouncedSearch}".` });
                    } else {
                        const patient = patients[0];
                        if (patient.isIPD || patient.activeAdmission) {
                            setPatientSearchStatus({ loading: false, text: `The patient "${patient.name}" is currently admitted, but couldn't be located in your current view filters.` });
                        } else {
                            // Check for past admissions
                            helpdeskService.getPatientIPDAdmissions(patient._id)
                                .then((admissionsRes: any) => {
                                    const admissions = Array.isArray(admissionsRes?.data) ? admissionsRes.data : (admissionsRes?.data?.data || admissionsRes || []);
                                    if (admissions && admissions.length > 0) {
                                        const lastAdmission = admissions[0]; // Assuming descending order
                                        setPatientSearchStatus({ loading: false, text: `The patient "${patient.name}" was already discharged on ${new Date(lastAdmission.dischargeDate || lastAdmission.updatedAt).toLocaleDateString()}.` });
                                    } else {
                                        setPatientSearchStatus({ loading: false, text: `The patient "${patient.name}" is a registered outpatient but has never been admitted to IPD.` });
                                    }
                                })
                                .catch(() => {
                                    setPatientSearchStatus({ loading: false, text: `The patient "${patient.name}" is registered but not currently admitted.` });
                                });
                        }
                    }
                })
                .catch(() => {
                    setPatientSearchStatus({ loading: false, text: `Could not find matching bed or patient for "${debouncedSearch}".` });
                });
        } else {
            setPatientSearchStatus({ loading: false, text: null });
        }
    }, [debouncedSearch, filteredBeds.length, hospitalIdParam]);
    const paginatedBeds = filteredBeds.slice((currentPage - 1) * bedsPerPage, currentPage * bedsPerPage);

    const handleBedClick = (bed: Bed) => {
        setSelectedBedId(bed._id);
        fetchBedDetails(bed._id);
        
        // Auto-scroll to details for better mobile/tablet UX
        setTimeout(() => {
            detailPanelRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest' 
            });
        }, 100);
    };

    const fetchVacantBeds = async (type?: string, room?: string) => {
        try {
            setVacantLoading(true);
            const data = await ipdService.getBeds({
                status: 'Vacant',
                type: type || undefined,
                room: room || undefined
            });
            setVacantBeds(data);
        } catch (error: any) {
            toast.error("Failed to load vacant beds");
        } finally {
            setVacantLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!bedDetails || !selectedNewBedId) return;
        try {
            setTransferLoading(true);
            await ipdService.transferBed(bedDetails.occupancyDetails.admissionId, selectedNewBedId);
            toast.success("Bed transfer successful");
            setShowTransferModal(false);
            fetchBeds();
            fetchBedDetails(selectedBedId!);
            fetchPendingRequests(); // ✅ Instant sync for badges
        } catch (error: any) {
            toast.error(error.message || "Transfer failed");
        } finally {
            setTransferLoading(false);
        }
    };

    const handleDischarge = async () => {
        if (!bedDetails) return;

        const admissionId = bedDetails.occupancyDetails.admissionId || bedDetails.occupancyDetails.admissionOID;
        setPharmacyError(null);

        try {
            setDischargeLoading(true);
            console.log('[IPD] Confirming discharge for admission:', admissionId);

            const response = await ipdService.confirmDischarge(admissionId);

            console.log('[IPD] Discharge confirmed:', response);

            toast.success(
                `Discharge confirmed! Patient moved to Discharge Queue.`,
                { duration: 4000, icon: '📋' }
            );

            // Close modal and set filter to Cleaning with a skeleton state
            setShowDischargeModal(false);
            setIsCleaningFilterLoading(true);
            setFilters({ status: 'Cleaning', type: '', room: '' });
            setSelectedBedId(null);
            setBedDetails(null);
            setPharmacyError(null);

            // Brief delay to simulate/show cleaning beds animation
            setTimeout(() => {
                setIsCleaningFilterLoading(false);
                fetchBeds();
                fetchPendingRequests(); // ✅ Instant sync for badges
            }, 1500);

        } catch (error: any) {
            console.error('[IPD] Discharge confirmation failed:', error);

            // ✅ PHARMACY CLEARANCE BLOCK — show inline sign-off option
            if (error.message && error.message.includes('Pharmacy clearance is pending')) {
                setPharmacyError(admissionId);
                // Don't toast — the modal UI will show actions
                return;
            }

            // Handle specific case where admission is missing but bed is occupied
            if (error.message && (error.message.includes('Active admission not found') || error.message.includes('not found'))) {
                toast.error("Admission not found. Force cleaning bed.", { icon: '🧹' });

                if (bedDetails?.bed?._id) {
                    await handleQuickStatusUpdate(bedDetails.bed._id, 'Cleaning');
                    setShowDischargeModal(false);
                    setIsCleaningFilterLoading(true);
                    setFilters({ status: 'Cleaning', type: '', room: '' });
                    setSelectedBedId(null);
                    setBedDetails(null);

                    setTimeout(() => {
                        setIsCleaningFilterLoading(false);
                        fetchBeds();
                    }, 1500);
                }
                setLoading(false);
                return;
            }

            toast.error(error.message || "Discharge confirmation failed");
        } finally {
            setDischargeLoading(false);
        }
    };

    const handlePharmacySignoff = async () => {
        const admissionId = bedDetails?.occupancyDetails?.admissionId || bedDetails?.occupancyDetails?.admissionOID;
        if (!admissionId) return;
        try {
            setPharmacySignoffLoading(true);
            await apiClient(`/pharmacy/signoff/${admissionId}`, { method: 'POST' });
            toast.success('Pharmacy cleared! Retrying discharge...');
            setPharmacyError(null);
            // Now immediately retry the discharge
            await handleDischarge();
        } catch (err: any) {
            toast.error(err?.message || 'Pharmacy sign-off failed');
        } finally {
            setPharmacySignoffLoading(false);
        }
    };

    const handleQuickStatusUpdate = async (bedId: string, newStatus: string) => {
        try {
            setLoading(true);
            await ipdService.updateBedStatus(bedId, newStatus);
            toast.success(`Bed status updated to ${newStatus}`);
            fetchBeds();
            if (selectedBedId === bedId) {
                fetchBedDetails(bedId);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to update bed status");
        } finally {
            setLoading(false);
        }
    };

    const bedsidePatientAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age.toString() + " Years";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Vacant': return 'bg-emerald-500';
            case 'Occupied': return 'bg-rose-500';
            case 'Cleaning': return 'bg-amber-500';
            case 'Blocked': return 'bg-slate-500';
            default: return 'bg-slate-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'Vacant': return 'bg-emerald-50 border-emerald-100';
            case 'Occupied': return 'bg-rose-50 border-rose-100';
            case 'Cleaning': return 'bg-amber-50 border-amber-100';
            case 'Blocked': return 'bg-slate-50 border-slate-100';
            default: return 'bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* HEADER */}
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-slate-100 pb-2">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
                        <Activity size={24} className="text-teal-600 sm:size-[28px]" strokeWidth={2.5} />
                        IPD ADMISSION CENTER
                    </h1>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1 sm:mt-2">Real-time Bed Occupancy & Patient Monitoring</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* UNIQUE PREMIUM REQUEST TOGGLE */}
                    <div className="flex bg-slate-200/50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200/60 items-center gap-0.5 sm:gap-1 shadow-sm h-10 sm:h-12">
                        <button
                            onClick={() => setActiveRequestFilter(null)}
                            className={`px-2 sm:px-4 h-full rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${!activeRequestFilter ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            All<span className="hidden sm:inline"> Beds</span>
                        </button>
                        <div className="w-[1px] h-3 sm:h-4 bg-slate-300/50 mx-0.5 sm:mx-1" />
                        <button
                            onClick={() => setActiveRequestFilter('discharge')}
                            className={`px-2 sm:px-4 h-full rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-2 transition-all duration-300 ${activeRequestFilter === 'discharge' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
                        >
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">Disch</span>
                            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full leading-none ${activeRequestFilter === 'discharge' ? 'bg-emerald-500/50 text-white' : 'bg-slate-300/50 text-slate-600'}`}>
                                {pendingRequests.filter(r => r.requestType === 'discharge').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveRequestFilter('transfer')}
                            className={`px-2 sm:px-4 h-full rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-2 transition-all duration-300 ${activeRequestFilter === 'transfer' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'}`}
                        >
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">Trans</span>
                            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full leading-none ${activeRequestFilter === 'transfer' ? 'bg-amber-400/50 text-white' : 'bg-slate-300/50 text-slate-600'}`}>
                                {pendingRequests.filter(r => r.requestType === 'transfer').length}
                            </span>
                        </button>
                    </div>

                    <button
                        onClick={() => router.push('/helpdesk/patient-registration?type=IPD')}
                        className="px-3 sm:px-6 py-2 sm:py-2.5 bg-teal-600 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 flex items-center gap-1 sm:gap-2"
                    >
                        <Plus size={14} className="sm:size-[16px]" /> <span className="hidden sm:inline">New Admission</span><span className="sm:hidden">New Adm</span>
                    </button>
                    <button
                        onClick={() => { fetchBeds(); fetchPendingRequests(); }}
                        className="p-2 sm:p-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''} sm:size-[18px]`} />
                    </button>
                </div>
            </div>

            {/* FILTERS & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white p-2 sm:p-3 rounded-xl sm:rounded-[24px] border border-slate-200 shadow-sm flex flex-row flex-wrap items-center gap-2 sm:gap-3">
                    <div className="w-full sm:flex-1 sm:min-w-[200px] relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-[12px] sm:size-[14px]" />
                        <input
                            placeholder="SEARCH BED, PATIENT NAME..."
                            className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-teal-500/10 outline-none transition-all placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <X size={10} className="sm:size-[12px]" strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                        <select
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl !text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer shadow-sm appearance-none"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="">STATUS</option>
                            <option value="Vacant">Vacant</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Cleaning">Cleaning</option>
                        </select>
                        <select
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl !text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer shadow-sm appearance-none"
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        >
                            <option value="">TYPES</option>
                            {unitTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <HybridRoomSearch
                        value={filters.room}
                        onSelect={(val) => {
                            setFilters(prev => ({ ...prev, room: val }));
                            setCurrentPage(1);
                        }}
                        rooms={hospitalRooms}
                        typeFilter={filters.type}
                        className="w-full sm:w-auto sm:min-w-[160px]"
                    />

                    {/* COMPACT PAGINATION */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-4 py-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-black w-6 text-center text-slate-900">{currentPage}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-[24px] flex items-center justify-between text-white shadow-xl shadow-slate-200">
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Beds</p>
                        <p className="text-lg sm:text-xl font-black">
                            <AnimatedNumber value={filteredBeds.length} trigger={debouncedSearch + JSON.stringify(filters)} />
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className={`w-1.5 h-8 bg-emerald-500 rounded-full transition-all duration-300 ${isAnimating ? 'animate-bar-bounce' : ''}`} title="Vacant" />
                        <div className={`w-1.5 h-8 bg-rose-500 rounded-full transition-all duration-300 ${isAnimating ? 'animate-bar-bounce delay-100' : ''}`} title="Occupied" />
                        <div className={`w-1.5 h-8 bg-amber-500 rounded-full transition-all duration-300 ${isAnimating ? 'animate-bar-bounce delay-200' : ''}`} title="Cleaning" />
                    </div>
                </div>
            </div>

            {/* BED GRID AREA */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-8">
                {/* GRID */}
                <div className="xl:col-span-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 items-start">
                    {loading || isCleaningFilterLoading ? (
                        Array(15).fill(0).map((_, i) => (
                            <div key={i} className="aspect-[4/3] bg-slate-100 rounded-2xl animate-pulse flex flex-col p-4 space-y-3">
                                <div className="flex justify-between">
                                    <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                                    <div className="w-12 h-3 bg-slate-200 rounded-full"></div>
                                </div>
                                <div className="w-3/4 h-3 bg-slate-200 rounded-md"></div>
                                <div className="w-1/2 h-2 bg-slate-200 rounded-sm"></div>
                                <div className="mt-auto border-t border-slate-50 pt-3 flex justify-between">
                                    <div className="w-8 h-2 bg-slate-200 rounded-sm"></div>
                                    <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                                </div>
                            </div>
                        ))
                    ) : paginatedBeds.length === 0 ? (
                        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
                            {patientSearchStatus.loading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <RefreshCw size={24} className="animate-spin text-teal-500" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Searching Hospital Records...</p>
                                </div>
                            ) : patientSearchStatus.text ? (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-2xl shadow-sm flex flex-col items-center max-w-md animate-in zoom-in-95 duration-500">
                                    <User size={32} className="mb-2 opacity-80" />
                                    <p className="font-black uppercase tracking-tight text-sm text-center">{patientSearchStatus.text}</p>
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="mt-4 px-4 py-1.5 bg-amber-100 hover:bg-amber-200 transition-colors rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-800"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            ) : (
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No beds found matching filters</p>
                            )}
                        </div>
                    ) : paginatedBeds.map((bed) => (
                        <div
                            key={bed._id}
                            onClick={() => handleBedClick(bed)}
                            className={`
                                relative p-3 rounded-[20px] border transition-all duration-300 text-left w-full cursor-pointer flex flex-col justify-between h-[140px] overflow-hidden
                                ${selectedBedId === bed._id ? 'border-teal-500 bg-white ring-4 ring-teal-500/5 shadow-lg' : 'border-slate-100 bg-white hover:border-teal-400 hover:shadow-md'}
                            `}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`w-7 h-7 rounded-lg ${getStatusColor(bed.status)} flex items-center justify-center text-white shadow-sm relative shrink-0`}>
                                        <BedIcon size={12} />
                                        {bed.status === 'Occupied' && (
                                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-600 rounded-full border border-white animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full ${getStatusColor(bed.status)} text-white tracking-widest`}>
                                            {bed.status[0]}
                                        </span>
                                        {bed.status === 'Occupied' && bed.currentOccupancy?.admissionDate && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[6px] font-black uppercase tracking-tighter">
                                                <Clock size={8} className="shrink-0" />
                                                {calculateStayDuration(bed.currentOccupancy.admissionDate)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-1">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{bed.bedId}</h3>
                                    <div className="flex flex-col mt-0.5">
                                        <span className="text-[7px] font-bold text-slate-400 capitalize truncate">
                                            {bed.status === 'Occupied' ? bed.currentOccupancy?.patientName : 'Available'}
                                        </span>
                                        {bed.status === 'Occupied' && bed.currentOccupancy?.reason && (
                                            <p className="text-[7px] font-bold text-teal-600 line-clamp-1 mt-1 opacity-90 uppercase tracking-tighter" title={bed.currentOccupancy.reason}>
                                                {bed.currentOccupancy.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-50">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <span className="text-[7px] font-black text-slate-500 uppercase truncate">R:{bed.room || "?"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <span className="text-[7px] font-black text-slate-500 uppercase truncate">F:{bed.floor || "?"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 mt-1.5">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                                        Dept: {bed.status === 'Occupied' ? (bed.department || "GEN") : "GEN"}
                                    </span>
                                    {bed.status === 'Cleaning' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuickStatusUpdate(bed._id, 'Vacant');
                                            }}
                                            className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all shadow-sm"
                                            title="Mark as Vacant"
                                        >
                                            <CheckCircle2 size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SIDE DETAIL PANEL */}
                <div 
                    ref={detailPanelRef}
                    className="xl:col-span-1 bg-white rounded-2xl sm:rounded-[32px] border border-slate-200 shadow-xl overflow-hidden xl:sticky xl:top-24 h-fit scroll-mt-24"
                >
                    {!selectedBedId ? (
                        <div className="p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                                <Monitor size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-900 uppercase">No Bed Selected</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Select a bed to view patient details and manage occupancy</p>
                            </div>
                        </div>
                    ) : detailsLoading ? (
                        <div className="p-20 flex justify-center">
                            <RefreshCw className="animate-spin text-teal-600" size={32} />
                        </div>
                    ) : (
                        bedDetails && (
                            <div className="flex flex-col">
                                <div className={`p-3 ${getStatusColor(bedDetails.bed.status)} text-white`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-sm font-black uppercase tracking-tighter leading-tight">{bedDetails.bed.bedId}</h2>
                                        <div className="px-1.5 py-0.5 bg-white/20 rounded-lg text-[7px] font-black uppercase tracking-widest backdrop-blur-md">
                                            {bedDetails.bed.status}
                                        </div>
                                    </div>
                                    <div className="space-y-0">
                                        <p className="text-[7px] font-bold uppercase tracking-[0.1em] opacity-80">Location</p>
                                        <p className="text-[10px] font-bold truncate">FL {bedDetails.bed.floor} • RM {bedDetails.bed.room} • {bedDetails.bed.ward}</p>
                                    </div>
                                </div>

                                <div className="p-3 space-y-4">
                                    {bedDetails.bed.status === 'Occupied' && bedDetails.occupancyDetails ? (
                                        <>
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

                                            <section className="grid grid-cols-2 gap-2">
                                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Doctor</p>
                                                    <p className="text-[8px] font-bold text-slate-700 uppercase truncate leading-tight">{bedDetails.occupancyDetails.doctor?.user?.name || 'N/A'}</p>
                                                </div>
                                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Adm Date</p>
                                                    <p className="text-[8px] font-bold text-slate-700 uppercase leading-tight">
                                                        {format(new Date(bedDetails.occupancyDetails.admissionDate), 'dd-MMM-yyyy, hh:mm a')}
                                                    </p>
                                                    <p className="text-[7px] font-black text-teal-600 uppercase tracking-tighter mt-0.5">
                                                        Stay: {calculateStayDuration(
                                                            bedDetails.occupancyDetails.admissionDate,
                                                            bedDetails.occupancyDetails?.isBillLocked && bedDetails.occupancyDetails?.billLockedAt ? bedDetails.occupancyDetails.billLockedAt : undefined
                                                        )}
                                                        {bedDetails.occupancyDetails?.isBillLocked && " (Locked)"}
                                                    </p>
                                                </div>
                                            </section>

                                            <section className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <ClipboardList size={10} className="text-teal-600" />
                                                    <p className="text-[7px] font-black uppercase tracking-widest">Reason for Admission</p>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                                                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-1" title={bedDetails.occupancyDetails.reason}>
                                                        {bedDetails.occupancyDetails.reason || 'No specific reason provided.'}
                                                    </p>
                                                </div>
                                            </section>

                                            <section className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Monitor size={10} className="text-teal-600" />
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
                                                </div>
                                            </section>

                                            {/* Bed Transfer History */}
                                            {bedDetails.occupancyDetails?.bedHistory && bedDetails.occupancyDetails.bedHistory.length > 0 && (
                                                <section className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Activity size={10} className="text-teal-600" />
                                                        <p className="text-[7px] font-black uppercase tracking-widest">Bed Transfer History</p>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                                                        <table className="w-full text-[8px] border-collapse">
                                                            <thead>
                                                                <tr className="bg-slate-100/50 border-b border-slate-100">
                                                                    <th className="px-2 py-1.5 text-left font-black text-slate-400 uppercase tracking-widest">Bed/Room</th>
                                                                    <th className="px-2 py-1.5 text-left font-black text-slate-400 uppercase tracking-widest">Stay Duration</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {bedDetails.occupancyDetails.bedHistory.map((item: any, idx: number) => {
                                                                    const start = new Date(item.startDate);
                                                                    let endMs = Date.now();
                                                                    if (item.endDate && item.endDate !== 'null' && item.endDate !== 'undefined') {
                                                                        const parsed = new Date(item.endDate).getTime();
                                                                        if (!isNaN(parsed)) endMs = parsed;
                                                                    } else if (bedDetails.occupancyDetails?.isBillLocked && bedDetails.occupancyDetails?.billLockedAt) {
                                                                        const lockTime = new Date(bedDetails.occupancyDetails.billLockedAt).getTime();
                                                                        if (!isNaN(lockTime)) endMs = lockTime;
                                                                    }
                                                                    
                                                                    const exactDays = (endMs - start.getTime()) / (1000 * 60 * 60 * 24);
                                                                    let displayDays = Math.ceil(exactDays);
                                                                    if (displayDays < 1) displayDays = 1;
                                                                    
                                                                    const rate = item.pricePerDay ?? item.rate ?? item.dailyRateAtTime ?? item.bed?.pricePerDay ?? 0;
                                                                    const hourlyRate = (item.pricePerHour && item.pricePerHour > 0)
                                                                        ? item.pricePerHour
                                                                        : (rate > 0 ? (rate / 24) : 0);
                                                                    
                                                                    const diffMs = Math.max(0, endMs - start.getTime());
                                                                    const diffHours = diffMs / (1000 * 60 * 60);
                                                                    const fullDays = Math.floor(diffHours / 24);
                                                                    const remainingHours = diffHours % 24;
                                                                    const ceilRemainingHours = Math.ceil(remainingHours);
                                                                    
                                                                    let charge: number;
                                                                    if (diffHours < 1) {
                                                                        const chargeableHours = Math.max(1, ceilRemainingHours);
                                                                        charge = Math.round(chargeableHours * hourlyRate);
                                                                    } else {
                                                                        if (ceilRemainingHours === 24) {
                                                                            charge = (fullDays + 1) * rate;
                                                                        } else {
                                                                            const remainderCharge = Math.min(rate, Math.round(ceilRemainingHours * hourlyRate));
                                                                            charge = (fullDays * rate) + remainderCharge;
                                                                        }
                                                                    }
                                                                    
                                                                    return (
                                                                        <tr key={idx} className="hover:bg-white/50 transition-colors">
                                                                            <td className="px-2 py-2">
                                                                                <div className="font-bold text-slate-900 uppercase">{item.bedId}</div>
                                                                                <div className="text-[7px] font-medium text-slate-500 uppercase">{item.room} • {item.type}</div>
                                                                            </td>
                                                                            <td className="px-2 py-2">
                                                                                <div className="font-black text-teal-600 uppercase tracking-tighter flex justify-between items-center">
                                                                                    <span>{calculateStayDuration(item.startDate, item.endDate)}</span>
                                                                                    {rate > 0 && <span className="text-slate-900">₹ {charge.toLocaleString()}</span>}
                                                                                </div>
                                                                                <div className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Rate: {rate > 0 ? `₹${rate.toLocaleString()}/day` : 'N/A'} {item.pricePerHour ? `• ₹${item.pricePerHour}/hr` : `• ₹${Math.round(rate / 24)}/hr`}</div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </section>
                                            )}

                                            {(() => {
                                                const request = pendingRequests.find(r => r.bedId === bedDetails.bed._id);
                                                if (!request) return null;

                                                return (
                                                    <div className="p-2.5 bg-slate-900 text-white rounded-xl mb-3 border-l-4 border-teal-500 animate-in slide-in-from-right-4 duration-300">
                                                        <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Request Details</p>
                                                        <div className="flex justify-between items-start mb-2.5">
                                                            <div>
                                                                <p className="text-[10px] font-black tracking-tight">{request.requestType === 'discharge' ? '🏁 Discharge' : '🔄 Transfer'} Requested</p>
                                                                <p className="text-[8px] font-bold text-teal-400 mt-0.5">By {request.requestedBy}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-black opacity-60">{new Date(request.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>

                                                        {request.requestType === 'transfer' && request.instructions && (
                                                            <div className="space-y-2 border-t border-white/10 pt-2.5">
                                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                                                    <ArrowRightLeft size={10} /> Target Destination
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {request.instructions.roomType && (
                                                                        <div className="bg-white/5 p-1.5 rounded-md">
                                                                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Type</p>
                                                                            <p className="text-[9px] font-bold uppercase truncate">{request.instructions.roomType}</p>
                                                                        </div>
                                                                    )}
                                                                    {request.instructions.room && (
                                                                        <div className="bg-white/5 p-1.5 rounded-md">
                                                                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Room</p>
                                                                            <p className="text-[9px] font-bold uppercase truncate">{request.instructions.room}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {request.instructions.notes && (
                                                                    <div className="bg-white/5 p-1.5 rounded-md">
                                                                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Instructions</p>
                                                                        <p className="text-[9px] font-bold text-slate-300 italic line-clamp-2 leading-tight">"{request.instructions.notes}"</p>
                                                                    </div>
                                                                ) || (request.instructions.bed && (
                                                                    <div className="bg-white/5 p-1.5 rounded-md">
                                                                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Bed</p>
                                                                        <p className="text-[9px] font-bold uppercase truncate">{request.instructions.bed}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="pt-1.5 space-y-1.5">
                                                {(() => {
                                                    const hasTransferRequest = pendingRequests.some(r => r.bedId === bedDetails.bed._id && r.requestType === 'transfer');
                                                    const hasDischargeRequest = pendingRequests.some(r => r.bedId === bedDetails.bed._id && r.requestType === 'discharge');

                                                    return (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    if (!hasTransferRequest) {
                                                                        toast.error("Waiting for doctor's transfer request", { icon: '👨‍⚕️' });
                                                                        return;
                                                                    }
                                                                    setShowTransferModal(true);
                                                                    fetchVacantBeds();
                                                                }}
                                                                className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 ${hasTransferRequest ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                                                            >
                                                                <ArrowRightLeft size={12} /> {hasTransferRequest ? 'Transfer' : 'Wait for Doctor'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (!hasDischargeRequest) {
                                                                        toast.error("Waiting for doctor's discharge request", { icon: '👨‍⚕️' });
                                                                        return;
                                                                    }
                                                                    fetchBillingSummary(bedDetails?.occupancyDetails?.admissionId || bedDetails?.occupancyDetails?.admissionOID);
                                                                    setShowDischargeModal(true);
                                                                }}
                                                                className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 ${hasDischargeRequest ? 'border-2 border-rose-500 text-rose-500 hover:bg-rose-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                                                            >
                                                                <LogOut size={12} /> {hasDischargeRequest ? 'Discharge' : 'Wait for Doctor'}
                                                            </button>
                                                            <button
                                                                onClick={() => setShowBillingModal(true)}
                                                                className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 border border-emerald-100 hover:bg-emerald-100"
                                                            >
                                                                <Receipt size={12} /> Billing & Account
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    ) : bedDetails.bed.status === 'Cleaning' ? (
                                        <div className="space-y-6">
                                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl text-center space-y-3">
                                                <AlertCircle className="text-amber-500 mx-auto" size={32} />
                                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Bed Under Cleaning</p>
                                            </div>
                                            <button
                                                onClick={() => handleQuickStatusUpdate(bedDetails.bed._id, 'Vacant')}
                                                disabled={loading}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 disabled:opacity-50"
                                            >
                                                <CheckCircle2 size={16} /> Mark as Vacant
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center space-y-3">
                                                <CheckCircle2 className="text-emerald-500 mx-auto" size={32} />
                                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ready for Admission</p>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/helpdesk/patient-registration?type=IPD&bedId=${bedDetails.bed.bedId}`)}
                                                className="w-full py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-100"
                                            >
                                                <User size={16} /> Admit Patient
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* TRANSFER MODAL */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Transfer Bed</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 mb-3">Select a new vacant bed for the patient</p>
                                    
                                    {bedDetails?.bed && (
                                        <div className="inline-flex items-center gap-2 bg-slate-200/50 px-3 py-1.5 rounded-lg border border-slate-200">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">From:</span>
                                            <span className="text-[11px] font-black text-slate-900 uppercase">{bedDetails.bed.bedId}</span>
                                            <span className="text-[10px] font-bold text-slate-500 capitalize">• Room {bedDetails.bed.room} • {bedDetails.bed.type}</span>
                                        </div>
                                    )}
                                </div>
                            <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <Plus size={24} className="rotate-45 text-slate-400" />
                            </button>
                        </div>

                        {(() => {
                            const request = pendingRequests.find(r => r.bedId === bedDetails?.bed?._id && r.requestType === 'transfer');
                            if (!request?.instructions) return null;

                            return (
                                <div className="px-8 py-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
                                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
                                        <ArrowRightLeft size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                            <span>Doctor's Instructions</span>
                                            <span className="opacity-40 text-[8px]">By {request.requestedBy}</span>
                                        </p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            {request.instructions.roomType && (
                                                <p className="text-[9px] font-bold text-amber-800 uppercase">
                                                    <span className="opacity-50 text-[7px] font-black mr-1">TYPE:</span> {request.instructions.roomType}
                                                </p>
                                            )}
                                            {request.instructions.room && (
                                                <p className="text-[9px] font-bold text-amber-800 uppercase">
                                                    <span className="opacity-50 text-[7px] font-black mr-1">ROOM:</span> {request.instructions.room}
                                                </p>
                                            )}
                                            {request.instructions.bed && (
                                                <p className="text-[9px] font-bold text-amber-800 uppercase">
                                                    <span className="opacity-50 text-[7px] font-black mr-1">BED:</span> {request.instructions.bed}
                                                </p>
                                            )}
                                        </div>
                                        {request.instructions.notes && (
                                            <p className="text-[9px] font-medium text-amber-700 bg-white/40 p-2 rounded-lg mt-2 border border-amber-200/30 italic">
                                                "{request.instructions.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}


                        {(() => {
                            const request = pendingRequests.find(r => r.bedId === bedDetails?.bed?._id && r.requestType === 'transfer');
                            
                            // A target is "sufficient" if we have a resolved ID, or enough info to likely match
                            const isDoctorPreSelected = !!request?.instructions?.targetBedId || !!(request?.instructions?.room && request?.instructions?.bed);
                            const hasTargetBed = !!(selectedNewBedId || isDoctorPreSelected);
                            const targetBedIdToUse = selectedNewBedId || request?.instructions?.targetBedId;
                            
                            // Check vacantBeds first as they are freshly fetched for this modal
                            const targetBedObj = vacantBeds.find((b: Bed) => b._id === targetBedIdToUse) || beds.find((b: Bed) => b._id === targetBedIdToUse);

                            // If manually selected, prefer the actual bed object details over the doctor's original rough instructions
                            const displayBedName = (selectedNewBedId ? targetBedObj?.bedId : request?.instructions?.bed) || targetBedObj?.bedId || 'SELECTED BED';
                            const displayRoom = (selectedNewBedId ? targetBedObj?.room : request?.instructions?.room) || targetBedObj?.room || 'N/A';
                            const displayRoomType = (selectedNewBedId ? targetBedObj?.type : request?.instructions?.roomType) || targetBedObj?.type || 'Standard';

                            return (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {hasTargetBed ? (
                                            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="text-center space-y-2">
                                                    <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                                                        <CheckCircle2 size={40} />
                                                    </div>
                                                    <h4 className="text-lg font-black text-slate-900 uppercase">Transfer Confirmed</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {selectedNewBedId ? 'New Destination Selected' : 'Doctor Has Pre-Selected the destination'}
                                                    </p>
                                                </div>

                                                <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                                                        <ArrowRightLeft size={80} />
                                                    </div>
                                                    <div className="relative z-10 space-y-6">
                                                        <div>
                                                            <p className="text-[9px] font-black text-teal-400 uppercase tracking-[0.2em] mb-4">Patient Destination</p>
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white shrink-0">
                                                                    <BedIcon size={28} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-2xl font-black uppercase tracking-tight">{displayBedName}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Room: {displayRoom}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 pb-2 border-t border-white/10 pt-5">
                                                            <div>
                                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Unit Type</p>
                                                                <p className="text-xs font-bold uppercase">{displayRoomType}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Requested By</p>
                                                                <p className="text-xs font-bold uppercase">{request?.requestedBy || 'Helpdesk'}</p>
                                                            </div>
                                                        </div>

                                                        {request?.instructions?.notes && (
                                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 italic">
                                                                <p className="text-[10px] font-medium text-slate-300">"{request.instructions?.notes}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                                                    <AlertCircle className="text-amber-500 shrink-0" size={16} />
                                                    <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                                                        The helpdesk will complete this transfer with a single tap. All patient records will be migrated to the new bed instantly.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="px-8 pt-4 pb-2 border-b border-slate-100 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Room Type</label>
                                                        <select
                                                            value={transferBedTypeFilter}
                                                            onChange={(e) => {
                                                                setTransferBedTypeFilter(e.target.value);
                                                                setTransferBedRoomFilter('');
                                                            }}
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-widest bg-white hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-mono"
                                                        >
                                                            <option value="">All Types</option>
                                                            {unitTypes.map(type => (
                                                                <option key={type} value={type}>{type}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Room Name</label>
                                                        <select
                                                            value={transferBedRoomFilter}
                                                            onChange={(e) => setTransferBedRoomFilter(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-widest bg-white hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-mono"
                                                        >
                                                            <option value="">All Rooms</option>
                                                            {hospitalRooms
                                                                .filter(room => !transferBedTypeFilter || room.type === transferBedTypeFilter)
                                                                .map(room => (
                                                                    <option key={room._id} value={room.label}>{room.label}</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="p-8 space-y-3">
                                                    {vacantLoading ? (
                                                        <div className="py-20 flex flex-col items-center gap-3">
                                                            <RefreshCw className="animate-spin text-teal-600" size={32} />
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finding Vacant Beds...</p>
                                                        </div>
                                                    ) : vacantBeds.map(bed => (
                                                        <button
                                                            key={bed._id}
                                                            onClick={() => setSelectedNewBedId(bed._id)}
                                                            className={`
                                                                w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all relative
                                                                ${selectedNewBedId === bed._id ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-500/5' : 'border-slate-100 hover:border-slate-200'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm">
                                                                    <BedIcon size={20} />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-sm font-black text-slate-900 uppercase">{bed.bedId}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 capitalize">Floor {bed.floor} • Room {bed.room} • {bed.type}</p>
                                                                </div>
                                                            </div>
                                                            {selectedNewBedId === bed._id && <CheckCircle2 className="text-teal-600" size={20} />}
                                                        </button>
                                                    ))}
                                                    {!vacantLoading && vacantBeds.length === 0 && (
                                                        <div className="py-12 text-center space-y-3">
                                                            <AlertCircle className="mx-auto text-slate-300" size={40} />
                                                            <p className="text-xs font-bold text-slate-500 uppercase">No vacant beds available</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                                        <button
                                            onClick={() => setShowTransferModal(false)}
                                            className="flex-1 py-4 border border-slate-200 bg-white text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={!selectedNewBedId || transferLoading}
                                            onClick={handleTransfer}
                                            className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 flex items-center justify-center gap-2"
                                        >
                                            {transferLoading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
                                            {hasTargetBed ? 'Complete Transfer' : 'Confirm Transfer'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* DISCHARGE MODAL */}
            {showDischargeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                                <LogOut size={40} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Send to Nurse</h3>
                                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                    Are you sure you want to send <span className="text-slate-900">{bedDetails?.occupancyDetails?.patient?.name}</span>'s discharge file to the nurse?
                                </p>
                            </div>

                            {/* ✅ Pharmacy Clearance Block Banner */}
                            {pharmacyError && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Pharmacy Clearance Required</p>
                                            <p className="text-[9px] text-amber-700 mt-0.5 leading-relaxed">
                                                Medicines were issued to this patient. Pharmacy must sign off before discharge.
                                                Since the bill is fully paid, you can clear this now.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handlePharmacySignoff}
                                        disabled={pharmacySignoffLoading}
                                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                                    >
                                        {pharmacySignoffLoading ? (
                                            <><RefreshCw size={13} className="animate-spin" /> Clearing...</>) : (
                                            <><CheckCircle2 size={13} /> Clear Pharmacy & Send to Nurse</>)}
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowDischargeModal(false);
                                        setBillingSummary(null);
                                        setPharmacyError(null);
                                    }}
                                    className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={dischargeLoading || billingLoading}
                                    onClick={handleDischarge}
                                    className="flex-2 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/10 flex items-center justify-center gap-2 disabled:opacity-50 px-8"
                                >
                                    {dischargeLoading ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={16} />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send to Nurse'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* BILLING MODAL */}
            <IPDBillingModal
                isOpen={showBillingModal}
                onClose={() => {
                    setShowBillingModal(false);
                    if (selectedBedId) {
                        fetchBedDetails(selectedBedId, true);
                    }
                }}
                admissionId={bedDetails?.occupancyDetails?.admissionId || bedDetails?.occupancyDetails?.admissionOID}
                onTransferRequest={() => {
                    setShowBillingModal(false);
                    setShowTransferModal(true);
                }}
            />
        </div>
    );
}