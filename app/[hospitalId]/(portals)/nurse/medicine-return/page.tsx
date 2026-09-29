"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { useAuthStore } from "@/stores/authStore";
import {
    Search,
    Package,
    RotateCcw,
    LayoutGrid,
    List,
    BedDouble,
    CheckCircle2,
    Clock,
    ArrowLeft,
    User,
    ClipboardList,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function NurseMedicineReturnPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Socket listeners for real-time updates
    useState(() => {
        if (typeof window !== 'undefined') {
            const setupSocket = async () => {
                try {
                    const { subscribeToSocket } = await import('@/lib/integrations/api/socket');
                    const handleRefresh = (data: any) => {
                        console.log("📡 Socket Refresh Event:", data);
                        queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance"] });
                        queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns"] });
                        queryClient.invalidateQueries({ queryKey: ["ipd", "clinical-history"] });
                        queryClient.invalidateQueries({ queryKey: ["ipd", "nurse-active-admissions"] });
                    };

                    subscribeToSocket('medicine_return_requested', handleRefresh);
                    subscribeToSocket('medicine_return_approved', handleRefresh);
                    subscribeToSocket('medicine_return_rejected', handleRefresh);
                    subscribeToSocket('medication_administered', handleRefresh);
                    subscribeToSocket('medication_undo', handleRefresh);
                } catch (e) {
                    console.warn("Socket setup failed in Return Page:", e);
                }
            };
            setupSocket();
        }
        return null;
    });

    // Fetch active admissions
    const { data: admissions = [], isLoading: loadingAdmissions, refetch: refetchAdmissions } = useQuery<any[]>({
        queryKey: ["ipd", "nurse-active-admissions", user?.id],
        queryFn: () => ipdIssuanceService.getNurseActiveAdmissions(),
        refetchInterval: 5000,
    });

    const enrichedAdmissions = useMemo(() => {
        // Deduplicate admissions just in case backend has duplicate data
        const unique = new Map();
        (admissions || []).forEach(a => {
            if (!unique.has(a.admissionId)) {
                unique.set(a.admissionId, a);
            }
        });

        return Array.from(unique.values()).filter((a) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                a.patient?.name?.toLowerCase().includes(q) ||
                a.admissionId?.toLowerCase().includes(q)
            );
        });
    }, [admissions, search]);

    // Fetch issuances for selected admission
    const admId = selectedAdmission?.admissionId || "";
    const { data: issuances = [], isLoading: loadingIssuances } = useQuery<any[]>({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // Fetch existing return requests for this admission to prevent duplicates
    const { data: existingReturns = [] } = useQuery<any[]>({
        queryKey: ["pharmacy", "medicine-returns", admId],
        queryFn: () => ipdIssuanceService.getReturnsByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // Check if there's already a pending (not yet approved/rejected) return request
    const hasPendingReturn = useMemo(() => {
        return (existingReturns || []).some(
            (r: any) => r.status === 'PENDING' || r.status === 'RETURN_REQUESTED' || r.status === 'pending'
        );
    }, [existingReturns]);

    const { data: clinicalHistory } = useQuery<any>({
        queryKey: ["ipd", "clinical-history", admId],
        queryFn: () => ipdService.getClinicalHistory(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const enrichedIssuances = useMemo(() => {
        if (!issuances.length) return [];
        const adminRecords = clinicalHistory?.meds || [];

        // Token matching helper parallel to backend logic
        const getTokens = (str: string) => {
            if (!str) return [];
            return str
                .toLowerCase()
                .replace(/\([^)]*\)/g, " ")
                .replace(/[^\w\s]/g, " ")
                .split(/\s+/)
                .filter((t: string) => t.length > 1);
        };

        const consumedTracker = new Map<string, boolean>();

        return issuances.map((iss) => {
            const newItems = (iss.items ?? []).map((item: any, idx: number) => {
                const issued = item.issuedQty ?? item.qty ?? 0;
                const returned = item.returnedQty ?? 0;
                let leftQty = issued - returned;
                let consumedCount = 0;

                const productId = (item.product?._id || item.product)?.toString();
                const productName = item.productName || "";
                const medTokens = getTokens(productName);

                adminRecords.forEach((rec: any) => {
                    const recId = rec._id?.toString() || JSON.stringify(rec);
                    if (consumedTracker.has(recId)) return;

                    const recMedId = (rec.medicineId?._id || rec.medicineId)?.toString();

                    let isMatch = false;
                    // 1. Exact ID match
                    if (productId && recMedId && productId === recMedId) {
                        isMatch = true;
                    }
                    // 2. Advanced Token Match
                    else if (medTokens.length > 0) {
                        const recTokens = getTokens(rec.drugName || "");
                        const matches = medTokens.filter((mt: string) => recTokens.includes(mt)).length;
                        // ≥ 80% tokens matched either way means it's the same med
                        if (matches / medTokens.length >= 0.8 || (recTokens.length > 0 && matches / recTokens.length >= 0.8)) {
                            isMatch = true;
                        }
                    }

                    if (isMatch && leftQty > 0) {
                        consumedCount++;
                        leftQty--;
                        consumedTracker.set(recId, true);
                    }
                });

                return { ...item, _rawIdx: idx, _leftQty: leftQty, _consumedQty: consumedCount };
            });
            return { ...iss, items: newItems };
        });
    }, [issuances, clinicalHistory]);

    // We flatten the list for simplified return flows
    const allItems = useMemo(() => {
        let items: any[] = [];
        enrichedIssuances.forEach((iss: any) => {
            (iss.items || []).forEach((it: any) => {
                items.push({
                    ...it,
                    issuanceId: iss._id,
                    issuedAt: iss.issuedAt,
                    nurseName: iss.receivedByNurse?.name || iss.nurseNote || null,
                    issStatus: iss.status
                });
            });
        });
        // Sort by most recent first
        return items.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    }, [enrichedIssuances]);

    const hasReturnRequests = allItems.some(i => i.issStatus === 'RETURN_REQUESTED');
    const returnableItems = allItems.filter(i => i._leftQty > 0);

    const [isReturnMode, setIsReturnMode] = useState(false);
    // returnQtys: Map of "issuanceId_rawIdx" -> qty
    const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
    const [globalReturnReason, setGlobalReturnReason] = useState("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    // Track if a return was just submitted in this session to prevent re-click before data refreshes
    const [returnJustSubmitted, setReturnJustSubmitted] = useState(false);

    const handleBack = () => {
        setSelectedAdmission(null);
        setIsReturnMode(false);
        setReturnQtys({});
        setGlobalReturnReason("");
        setReturnJustSubmitted(false);
    };

    const handleReturnQtyChange = (key: string, val: number) => {
        setReturnQtys(prev => ({ ...prev, [key]: Math.max(0, val) }));
    };

    // Determine if the nurse can initiate a new return
    const canInitiateReturn = returnableItems.length > 0 && !isReturnMode && !returnJustSubmitted && !hasPendingReturn && !hasReturnRequests;

    const handleSubmitReturn = async () => {
        // Find which items have >=1 return qty selected
        const itemsToReturn = returnableItems
            .map(item => {
                const key = `${item.issuanceId}_${item._rawIdx}`;
                const qty = returnQtys[key] || 0;
                return { ...item, returnQty: qty };
            })
            .filter(item => item.returnQty > 0);

        if (!itemsToReturn.length) {
            toast.error("Enter return quantity for at least one medicine");
            return;
        }

        setSubmitting(true);
        try {
            // Because backend now accepts multiple issuances per return request, submit as a single payload
            const payloadItems = itemsToReturn.map((i: any) => ({
                issuanceId: i.issuanceId,
                productId: i.productId || i.product?._id || i.product,
                batchId: i.batchId || i.batch?._id || i.batch,
                returnedQty: i.returnQty,
                reason: globalReturnReason || "Patient return",
            }));

            await ipdIssuanceService.submitReturn({
                admissionId: selectedAdmission.admissionId,
                items: payloadItems,
                notes: globalReturnReason || "Submitted by nurse",
            });
            toast.success("Return requests submitted successfully!");
            setIsReturnMode(false);
            setReturnQtys({});
            setGlobalReturnReason("");
            // Mark as just submitted so the button won't reappear before data refreshes
            setReturnJustSubmitted(true);

            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit return request");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 sm:space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="pt-2 sm:pt-4">
                <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2 uppercase">Medicine Return Protocol</h1>
                <p className="text-slate-500 font-bold flex items-center gap-1.5 text-[7px] md:text-[8px] max-w-xl leading-relaxed uppercase tracking-widest mt-0.5">
                    <ClipboardList className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-blue-600" />
                    Select a patient to initiate clinical medicine returns
                </p>
            </div>

            {/* ══ PATIENT LIST VIEW ══════════════════════════════ */}
            {!selectedAdmission ? (
                <div className="space-y-5">
                    {/* Search and Toggle Row */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-between bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-200">
                        <div className="relative w-full sm:max-w-md">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:w-[15px] sm:h-[15px]" />
                            <input
                                className="w-full pl-9 pr-8 py-1.5 sm:py-2.5 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                placeholder="SEARCH NAME / MRN..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-lg"
                                >×</button>
                            )}
                        </div>

                        {/* View Switcher Controls */}
                        <div className="flex bg-slate-50 p-1 rounded-lg sm:rounded-xl border border-slate-100 gap-1 w-full sm:w-auto">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "grid" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <LayoutGrid size={12} className="sm:w-[14px] sm:h-[14px]" />
                                GRID
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "table" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <List size={12} className="sm:w-[14px] sm:h-[14px]" />
                                TABLE
                            </button>
                        </div>
                    </div>

                    {/* Patient Content Rendering */}
                    {loadingAdmissions ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Loading admitted patients...
                        </div>
                    ) : enrichedAdmissions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <BedDouble size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">
                                {search ? `No patients matching "${search}"` : "No active IPD admissions"}
                            </p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {enrichedAdmissions.map((adm: any) => {
                                const issuances = adm.nurseIssuances || [];
                                const totalMedicines = issuances.reduce((sum: number, iss: any) => sum + (iss.items?.length || 0), 0);

                                return (
                                    <button
                                        key={adm._id}
                                        onClick={() => setSelectedAdmission(adm)}
                                        className="w-full text-left bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all relative group overflow-hidden flex flex-col pt-3 sm:pt-6"
                                    >
                                        <div className="px-3 sm:px-6 flex items-start justify-between">
                                            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-600 rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                                                    <User size={14} className="text-white sm:w-[20px] sm:h-[20px]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-[11px] sm:text-base tracking-tight truncate pb-0.5 uppercase">
                                                        {adm.patient?.name || "Unknown"}
                                                    </p>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-[7px] sm:text-[10px] font-black tracking-widest uppercase text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded">
                                                            {adm.admissionId}
                                                        </span>
                                                        {adm.bed?.bedId && (
                                                            <span className="text-[7px] sm:text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1">
                                                                <BedDouble size={8} className="sm:w-[10px] sm:h-[10px]" /> {adm.bed.bedId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pharmacy Status Strip */}
                                        <div className="px-3 sm:px-6 pb-2">
                                            <p className={`text-[7px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 sm:gap-1.5 ${adm.pharmacyClearanceStatus === "CLEARED" ? "text-emerald-500" : "text-amber-500"}`}>
                                                {adm.pharmacyClearanceStatus === "CLEARED" ? (
                                                    <><CheckCircle2 size={10} className="sm:w-[12px] sm:h-[12px]" /> Cleared</>
                                                ) : (
                                                    <><Clock size={10} className="sm:w-[12px] sm:h-[12px]" /> Pending Returns</>
                                                )}
                                            </p>
                                        </div>

                                        {/* Preview of Medicines List for this Nurse */}
                                        <div className="mt-2 grow bg-slate-50/50 p-3 sm:p-6 border-t border-slate-50 relative">
                                            <div className="flex items-center justify-between mb-2 sm:mb-3 text-[7px] sm:text-[10px] uppercase tracking-widest font-black text-slate-400">
                                                <span>Session Brief</span>
                                                <span className="bg-white px-1 sm:px-2 py-0.5 sm:py-1 rounded shadow-sm text-[6px] sm:text-[9px]">{totalMedicines} Items</span>
                                            </div>

                                            {issuances.length > 0 ? (
                                                <div className="space-y-1.5 sm:space-y-3">
                                                    {issuances.slice(0, 2).map((iss: any, idx: number) => (
                                                        <div key={idx} className="bg-white p-1.5 sm:p-3 rounded-lg sm:rounded-2xl shadow-sm border border-slate-100">
                                                            <p className="text-[6px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2 border-b border-slate-50 pb-1 sm:pb-1.5">
                                                                {new Date(iss.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(iss.issuedAt).toLocaleDateString()}
                                                            </p>
                                                            <div className="space-y-0.5 sm:space-y-1.5">
                                                                {iss.items.slice(0, 2).map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center">
                                                                        <span className="text-[8px] sm:text-xs font-bold text-slate-700 truncate pr-1 sm:pr-2 max-w-[70%] uppercase">{item.productName}</span>
                                                                        <span className="text-[7px] sm:text-[10px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{item.issuedQty}</span>
                                                                    </div>
                                                                ))}
                                                                {iss.items.length > 2 && (
                                                                    <p className="text-[6px] sm:text-[10px] font-bold text-slate-300 mt-1 italic uppercase">+ {iss.items.length - 2} Items</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-4 sm:py-8 opacity-40">
                                                    <Package size={18} className="sm:w-[24px] sm:h-[24px] mb-1 sm:mb-2 text-slate-300" />
                                                    <span className="text-[8px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">No Protocol Assigned</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action highlight */}
                                        <div className="bg-blue-600 py-3 sm:py-3.5 px-4 sm:px-6 opacity-0 group-hover:opacity-100 transition-all flex justify-between items-center absolute bottom-0 left-0 w-full translate-y-full group-hover:translate-y-0">
                                            <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest">
                                                Initiate Clinical Return
                                            </span>
                                            <ArrowLeft size={14} className="rotate-180 text-white sm:w-[16px] sm:h-[16px]" />
                                        </div>
                                        <div className="h-0 group-hover:h-10 sm:group-hover:h-12 transition-all duration-300 pointer-events-none" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Patients */
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-3 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Details</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Nurse</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {enrichedAdmissions.map((adm: any) => (
                                        <tr key={adm._id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-sm">
                                                        {adm.patient?.name?.charAt(0) || "P"}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight">{adm.patient?.name || "Unknown"}</p>
                                                        <p className="text-[7px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest">{adm.admissionId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-[9px] sm:text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-600 uppercase">
                                                        {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || <span className="text-slate-300 italic">Not assigned</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-[9px] sm:text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-600 uppercase">
                                                        {adm.assignedNurse?.name || user?.name || <span className="text-slate-300 italic">Unassigned</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                                                <span className={`text-[7px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-widest ${adm.pharmacyClearanceStatus === "CLEARED" ? "bg-emerald-50 text-emerald-600" :
                                                    adm.pharmacyClearanceStatus === "PENDING" ? "bg-amber-50 text-amber-600" :
                                                        "bg-slate-50 text-slate-400"
                                                    }`}>
                                                    {adm.pharmacyClearanceStatus === "CLEARED" ? "Cleared" :
                                                        adm.pharmacyClearanceStatus === "PENDING" ? "Pending" :
                                                            "None"}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedAdmission(adm)}
                                                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl text-[7px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-105 transition-all shadow-md active:scale-95"
                                                >
                                                    Open Portal
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* ══ DETAIL VIEW ══════════════════════════════ */
                <div>
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 mb-5 transition-colors"
                    >
                        <ArrowLeft size={15} /> Back to patients
                    </button>

                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        {/* Selected Patient Header */}
                        <div className="px-3 sm:px-6 py-2 sm:py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-[11px] sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                                    {selectedAdmission.patient?.name}
                                </h2>
                                <p className="text-[7px] sm:text-sm text-slate-400 font-bold mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-3 uppercase tracking-widest">
                                    <span>{selectedAdmission.admissionId}</span>
                                    {selectedAdmission.bed?.bedId && (
                                        <span className="flex items-center gap-1 text-blue-500">
                                            <BedDouble size={10} className="sm:w-[14px] sm:h-[14px]" /> {selectedAdmission.bed.bedId}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Issued Medicines List */}
                        <div className="p-2 sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
                                <h3 className="text-[10px] sm:text-sm font-black text-slate-700 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wide">
                                    <ClipboardList size={14} className="text-blue-500 sm:w-[16px] sm:h-[16px]" />
                                    Prescription History
                                </h3>

                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                                    {hasReturnRequests && (
                                        <span className="text-[7px] sm:text-[10px] text-amber-600 font-black bg-amber-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-amber-100 flex items-center gap-1 sm:gap-1.5 uppercase tracking-widest">
                                            <Clock size={10} className="sm:w-[12px] sm:h-[12px]" /> Approval Pending
                                        </span>
                                    )}

                                    {canInitiateReturn && (
                                        <button
                                            onClick={() => setIsReturnMode(true)}
                                            className="text-[7px] sm:text-[10px] bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-black hover:bg-blue-700 flex items-center gap-1 sm:gap-1.5 transition-colors shadow-lg uppercase tracking-widest"
                                        >
                                            <RotateCcw size={10} className="sm:w-[12px] sm:h-[12px]" />
                                            Initiate Return
                                        </button>
                                    )}
                                    {isReturnMode && (
                                        <button
                                            onClick={() => {
                                                setIsReturnMode(false);
                                                setReturnQtys({});
                                                setGlobalReturnReason("");
                                            }}
                                            className="text-[7px] sm:text-[10px] bg-slate-200 text-slate-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-black hover:bg-slate-300 flex items-center gap-1 sm:gap-1.5 transition-colors uppercase tracking-widest"
                                        >
                                            Abort Cycle
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loadingIssuances ? (
                                <div className="text-center py-10">
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-400">Loading history...</p>
                                </div>
                            ) : allItems.length === 0 ? (
                                <div className="text-center py-8 sm:py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <Package size={24} className="mx-auto text-slate-300 mb-2 sm:w-[32px] sm:h-[32px]" />
                                    <p className="text-[9px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">No Issued Narcotics/Meds Found</p>
                                </div>
                            ) : (
                                /* Fixed Table View for Medicines */
                                <div className="border border-slate-100 rounded-xl sm:rounded-2xl overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-xs min-w-[600px]">
                                        <thead>
                                            <tr className="text-slate-400 uppercase text-[7px] sm:text-[10px] font-black tracking-widest border-b border-slate-50 bg-slate-50/50">
                                                <th className="text-left px-3 sm:px-5 py-2 sm:py-3 w-1/4">Pharma Detail</th>
                                                <th className="text-left px-3 sm:px-5 py-2 sm:py-3">Session Meta</th>
                                                <th className="text-center px-1 sm:px-3 py-2 sm:py-3 text-emerald-600">Administered</th>
                                                <th className="text-center px-1 sm:px-3 py-2 sm:py-3 text-amber-500">Backlog</th>
                                                <th className="text-center px-1 sm:px-3 py-2 sm:py-3 text-blue-500">Residual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {allItems.map((item: any, idx: number) => {
                                                const issued = item.issuedQty ?? item.qty ?? 0;
                                                const returned = item.returnedQty ?? 0;
                                                const isRequested = item.issStatus === 'RETURN_REQUESTED';

                                                return (
                                                    <tr key={idx} className={`hover:bg-blue-50/10 transition-colors ${isRequested ? 'opacity-50' : ''}`}>
                                                        <td className="px-3 sm:px-5 py-2 sm:py-4 font-black text-slate-700 uppercase text-[9px] sm:text-xs">
                                                            {item.productName}
                                                        </td>
                                                        <td className="px-3 sm:px-5 py-2 sm:py-4">
                                                            <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                                                                <span className="text-[7px] sm:text-[10px] font-black tracking-widest bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                                                                    {issued} QTY
                                                                </span>
                                                                <span className="text-[7px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
                                                                    {new Date(item.issuedAt).toLocaleDateString("en-IN", {
                                                                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-1 sm:px-3 py-2 sm:py-4 text-center">
                                                            <span className="text-emerald-600 font-black bg-emerald-50 text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                                                {item._consumedQty}
                                                            </span>
                                                        </td>
                                                        <td className="px-1 sm:px-3 py-2 sm:py-4 text-center">
                                                            {isRequested ? (
                                                                <span className="text-[6px] sm:text-[9px] font-black border border-amber-200 text-amber-500 bg-amber-50 px-1 sm:px-1.5 py-0.5 rounded uppercase">
                                                                    PROC
                                                                </span>
                                                            ) : (
                                                                <span className="text-amber-500 font-black bg-amber-50 text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                                                    {returned}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-1 sm:px-3 py-2 sm:py-4 text-center">
                                                            <span className={`font-black text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${item._leftQty > 0 ? "text-blue-600 bg-blue-50" : "text-slate-300 bg-slate-50"}`}>
                                                                {item._leftQty}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Unified Return Form Overlay (if mode is active) */}
                                    {isReturnMode && (
                                        <div className="bg-slate-50/80 border-t border-slate-100 p-2 sm:p-6 animate-in slide-in-from-bottom-5">
                                            <h4 className="text-[8px] sm:text-xs font-black text-slate-900 mb-2 sm:mb-4 uppercase tracking-[0.2em] flex items-center gap-1.5 sm:gap-2">
                                                <RotateCcw size={12} className="sm:w-[14px] sm:h-[14px]" /> Configuration Matrix
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                                                {allItems.filter((i: any) => ((i.issuedQty ?? i.qty ?? 0) - (i.returnedQty ?? 0)) > 0).map((item: any) => {
                                                    const max = item._leftQty;
                                                    const key = `${item.issuanceId}_${item._rawIdx}`;
                                                    const isConsumed = max <= 0;

                                                    return (
                                                        <div key={key} className={`flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-xl border ${isConsumed ? 'border-slate-50 opacity-60' : 'border-slate-200'} shadow-sm`}>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-[9px] sm:text-xs font-black uppercase tracking-tight ${isConsumed ? 'text-slate-300' : 'text-slate-700'} truncate`}>{item.productName}</p>
                                                                <p className="text-[7px] sm:text-[10px] text-slate-400 font-bold" suppressHydrationWarning>{new Date(item.issuedAt).toLocaleTimeString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                                {isConsumed ? (
                                                                    <span className="text-[7px] font-black text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded grayscale">CONSUMED</span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-[7px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">LIMIT: {max}</span>
                                                                        <input
                                                                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} max={max}
                                                                            value={returnQtys[key] ?? 0}
                                                                            onChange={(e) => handleReturnQtyChange(key, Number(e.target.value))}
                                                                            className="w-10 sm:w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 sm:py-1 text-[10px] sm:text-sm font-black text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="max-w-xl space-y-2 sm:space-y-4">
                                                <input
                                                    type="text"
                                                    placeholder="REASON FOR PROTOCOL RETURN..."
                                                    value={globalReturnReason}
                                                    onChange={(e) => setGlobalReturnReason(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-black uppercase tracking-widest outline-none focus:border-blue-500 shadow-sm"
                                                />
                                                <button
                                                    onClick={handleSubmitReturn}
                                                    disabled={submitting}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 transition-all shadow-xl w-full sm:w-auto uppercase tracking-widest"
                                                >
                                                    {submitting ? (
                                                        <><div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> EXECUTING...</>
                                                    ) : (
                                                        <><RotateCcw size={12} className="sm:w-[14px] sm:h-[14px]" /> COMMIT BULK RETURN</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
