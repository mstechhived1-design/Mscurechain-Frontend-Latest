"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { apiClient } from "@/lib/integrations/api";
import {
    Search, User, BedDouble, CheckCircle2,
    AlertTriangle, Pill, ClipboardList, IndianRupee, Wallet,
    UserCheck, ArrowLeft, Pencil, RotateCcw, Check, X, Fingerprint
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTenantLink } from "@/hooks/useTenantLink";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IPDPatient {
    _id: string;
    admissionId: string;
    patient: { _id: string; name: string; mobile?: string };
    primaryDoctor?: { user?: { name: string } };
    bed?: { bedId?: string; type?: string };
    status: string;
    pharmacyClearanceStatus?: string;
}

interface IssuanceItem {
    productId: string;
    batchId: string;
    productName: string;
    issuedQty: number;
    unitPrice?: number;
}

interface ProductResult {
    _id: string;
    brandName: string;
    genericName: string;
    strength?: string;
    form?: string;
    mrp: number;
    currentStock: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IPDIssuancePage() {
    const router = useRouter();
    const params = useParams() as any;
    const searchParams = useSearchParams() as any;
    const hospitalId = params?.hospitalId as string;
    const urlAdmissionId = ((searchParams?.get("admissionId") ?? null) ?? null);
    const pName = ((searchParams?.get("patientName") ?? null) ?? null);
    const queryClient = useQueryClient();
    const { getPath } = useTenantLink();

    // ── Patient list state ──────────────────────────────────────────────────
    const [patientSearch, setPatientSearch] = useState("");
    const [manualSelectionId, setManualSelectionId] = useState<string | null>(null);

    // ── Issue form state ────────────────────────────────────────────────────
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [overrideMismatch, setOverrideMismatch] = useState<{ missingItems: any[] } | null>(null);
    const [overrideReason, setOverrideReason] = useState("");
    const [notes, setNotes] = useState("");
    const [selectedNurseId, setSelectedNurseId] = useState("");
    const [items, setItems] = useState<IssuanceItem[]>([
        { productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 },
    ]);
    const [medSearches, setMedSearches] = useState<string[]>([""]);
    const [medResults, setMedResults] = useState<ProductResult[][]>([[]]);

    // ── Fetch active admissions ─────────────────────────────────────────────
    const { data: admissions = [], isLoading: loadingAdmissions } = useQuery({
        queryKey: ["ipd", "active-admissions"],
        queryFn: () => ipdService.getActiveAdmissions(),
        refetchInterval: 30000,
    });

    // Fetch specific admission if urlAdmissionId is provided but not in the active list
    const { data: specificAdmission } = useQuery({
        queryKey: ["ipd", "admission", urlAdmissionId],
        queryFn: () => ipdService.getAdmissionDetails(urlAdmissionId!),
        enabled: !!urlAdmissionId && !admissions.some((a: any) => a.admissionId === urlAdmissionId),
    });

    // Derive selected admission from URL or manual state
    const selectedAdmission = useMemo(() => {
        const id = urlAdmissionId || manualSelectionId;
        if (!id) return null;

        // Try active list first
        const active = (admissions as any[]).find((a: any) => a.admissionId === id);
        if (active) return active;

        // Try specifically fetched admission (supports discharged/inactive records)
        const fetched = (specificAdmission as any)?.data || specificAdmission;
        if (fetched && (fetched.admissionId === id || fetched._id === id)) {
            // Apply fallback name from URL if name is not in the object (e.g. unpopulated patient)
            const obj = { ...fetched };
            if (!obj.patient || typeof obj.patient === 'string') {
                obj.patient = { _id: obj.patient || "", name: pName || "Patient" };
            } else if (!obj.patient.name && pName) {
                obj.patient.name = pName;
            }
            return obj;
        }

        return null;
    }, [urlAdmissionId, manualSelectionId, admissions, specificAdmission, pName]);

    const filteredAdmissions = (admissions as IPDPatient[]).filter((a) => {
        if (!patientSearch.trim()) return true;
        const q = patientSearch.toLowerCase().trim();
        return (
            a.patient?.name?.toLowerCase().includes(q) ||
            a.admissionId?.toLowerCase().includes(q) ||
            a.patient?.mobile?.includes(q)
        );
    });

    // ── Fetch nurses ────────────────────────────────────────────────────────
    const { data: nursesData } = useQuery({
        queryKey: ["hospital-admin", "nurses"],
        queryFn: () => apiClient<any>("/hospital-admin/nurses"),
        staleTime: 60000,
    });
    const nurses: any[] = nursesData?.nurses || nursesData?.data || nursesData || [];

    // ── Fetch issuances & summary for selected patient ──────────────────────
    const admId = selectedAdmission?.admissionId || "";

    const { data: issuances = [], isLoading: loadingIssuances } = useQuery({
        queryKey: ["pharmacy", "ipd-issuance", admId],
        queryFn: () => ipdIssuanceService.getIssuancesByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const { data: summary } = useQuery({
        queryKey: ["pharmacy", "ipd-issuance-summary", admId],
        queryFn: () => ipdIssuanceService.getIssuanceSummary(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    const { data: returns = [], isLoading: loadingReturns } = useQuery({
        queryKey: ["pharmacy", "medicine-returns", admId],
        queryFn: () => ipdIssuanceService.getReturnsByAdmission(admId),
        enabled: !!admId,
        refetchInterval: 5000,
    });

    // ── Issue mutation ──────────────────────────────────────────────────────
    const issueMutation = useMutation({
        mutationFn: ipdIssuanceService.issueForIPD,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            setShowIssueForm(false);
            resetForm();
            toast.success("Medicines issued successfully!");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to issue medicines"),
    });

    const signoffMutation = useMutation({
        mutationFn: (payload: { admissionId: string, forceOverride?: boolean, overrideReason?: string }) =>
            ipdIssuanceService.signoffPharmacy(payload),
        onSuccess: (res: any) => {
            // Invalidate both the summary AND the admissions list so the badge flips
            // from PENDING → CLEARED instantly without needing a manual page refresh
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            queryClient.invalidateQueries({ queryKey: ["ipd", "active-admissions"] });
            toast.success(res?.message || "Pharmacy cleared!");
            setOverrideMismatch(null);
            setOverrideReason("");
        },
        onError: (err: any) => {
            if (err?.mismatch && err?.data?.missingItems) {
                setOverrideMismatch({ missingItems: err.data.missingItems });
                toast.error(err.message || "Medicine mismatch detected!");
            } else {
                toast.error(err?.message || "Failed to sign-off");
            }
        }
    });

    const approveReturnMutation = useMutation({
        mutationFn: ipdIssuanceService.approveReturn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            toast.success("Return approved successfully!");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to approve return"),
    });

    const rejectReturnMutation = useMutation({
        mutationFn: (id: string) => ipdIssuanceService.rejectReturn(id, "Rejected by pharmacist"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "medicine-returns", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance-summary", admId] });
            queryClient.invalidateQueries({ queryKey: ["pharmacy", "ipd-issuance", admId] });
            toast.success("Return request rejected");
        }
    });

    // ── Helpers ─────────────────────────────────────────────────────────────

    const resetForm = () => {
        setItems([{ productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 }]);
        setMedSearches([""]);
        setMedResults([[]]);
        setNotes("");
        setSelectedNurseId("");
    };

    const handleSelectAdmission = (adm: IPDPatient) => {
        router.push(getPath(`/pharmacy/ipd-issuance?admissionId=${adm.admissionId}`));
        setManualSelectionId(adm.admissionId);
        setShowIssueForm(false);
        resetForm();
    };

    const handleBack = () => {
        router.push(getPath("/pharmacy/ipd-issuance"));
        setManualSelectionId(null);
        setShowIssueForm(false);
        resetForm();
    };

    const handleAddItem = () => {
        setItems([...items, { productId: "", batchId: "", productName: "", issuedQty: 1, unitPrice: 0 }]);
        setMedSearches([...medSearches, ""]);
        setMedResults([...medResults, []]);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
        setMedSearches(medSearches.filter((_, i) => i !== idx));
        setMedResults(medResults.filter((_, i) => i !== idx));
    };

    const handleItemChange = (idx: number, field: keyof IssuanceItem, value: any) => {
        setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
    };

    const handleSelectProduct = (idx: number, product: ProductResult) => {
        setItems(items.map((item, i) =>
            i === idx ? {
                ...item,
                productId: product._id,
                productName: `${product.brandName} ${product.strength || ""} ${product.form || ""}`.trim(),
                batchId: "",
                unitPrice: product.mrp,
            } : item
        ));
        const s = [...medSearches];
        s[idx] = `${product.brandName} ${product.strength || ""}`.trim();
        setMedSearches(s);
        const r = [...medResults];
        r[idx] = [];
        setMedResults(r);
    };

    // Debounced medicine search
    useEffect(() => {
        const timers = medSearches.map((q, idx) => {
            if (q.length < 2 || items[idx]?.productId) return null;
            return setTimeout(async () => {
                try {
                    const results = await ProductService.getProducts({ search: q });
                    setMedResults(prev => { const n = [...prev]; n[idx] = (results || []) as ProductResult[]; return n; });
                } catch {
                    setMedResults(prev => { const n = [...prev]; n[idx] = []; return n; });
                }
            }, 300);
        });
        return () => timers.forEach(t => t && clearTimeout(t));
    }, [medSearches, items]);

    const handleIssue = () => {
        const filled = items.filter(i => i.productId && i.issuedQty > 0);
        if (!filled.length) return toast.error("Add at least one medicine");
        const selectedNurse = nurses.find((n: any) => n._id === selectedNurseId);
        issueMutation.mutate({
            admissionId: admId,
            items: filled,
            notes,
            ...(selectedNurseId ? {
                receivedByNurse: selectedNurseId,
                nurseNote: selectedNurse?.name || selectedNurse?.user?.name || "Nurse",
            } : {}),
        });
    };

    const getClearanceColor = (s?: string) => {
        if (s === "CLEARED") return "bg-green-100 text-green-700 border border-green-200";
        if (s === "PENDING") return "bg-red-100 text-red-700 border border-red-200";
        return "bg-gray-100 text-gray-500 border border-gray-200";
    };

    const getStatusBadge = (s: string) => ({
        ISSUED: "bg-blue-100 text-blue-700",
        RETURN_REQUESTED: "bg-yellow-100 text-yellow-700",
        RETURN_APPROVED: "bg-green-100 text-green-700",
        RETURN_REJECTED: "bg-red-100 text-red-700",
    }[s] || "bg-gray-100 text-gray-600");

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4 md:space-y-6 pb-10">
            {/* Unified Top Action Bar */}
            <div className="flex flex-col gap-2 mx-1">
                <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3">
                    
                    {/* Heading */}
                    <div className="shrink-0 flex flex-col justify-center px-1">
                        <h1 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">IPD Medicine Issuance</h1>
                        <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider mt-1 md:mt-0.5">
                            Select an admitted patient to issue medicines.
                        </p>
                    </div>

                    {/* Actions Row */}
                    <div className="w-full md:w-auto flex flex-1 items-center gap-2 md:gap-3 justify-between md:justify-end">
                        
                        <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

                        {/* Clear Button */}
                        <button 
                            onClick={() => {
                                setPatientSearch('');
                                setManualSelectionId(null);
                                setShowIssueForm(false);
                                resetForm();
                            }}
                            className="px-2 py-1 md:py-1.5 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[9px] font-bold text-rose-600 hover:bg-rose-100 uppercase tracking-wider transition-colors shrink-0 whitespace-nowrap"
                        >
                            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            Clear Form
                        </button>

                        <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

                        {/* Search Bar - Flex 1 */}
                        {!selectedAdmission && (
                            <div className="relative flex-1 min-w-[120px] md:min-w-[200px] max-w-md">
                                <Search className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Find records..."
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    className="w-full pl-6 pr-6 py-1 md:py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-[9px] md:text-[10px] font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm"
                                />
                                {patientSearch && (
                                    <button
                                        onClick={() => setPatientSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ PATIENT LIST VIEW (no patient selected) ══════════════════════════════ */}
            {!selectedAdmission && (
                <div className="space-y-4">

                    {/* Table View */}
                    <div className="bg-white dark:bg-[#111] rounded-2xl md:rounded-4xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Patient / Reference</th>
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Bed Info</th>
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Primary Doctor</th>
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Dept Status</th>
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Clearance</th>
                                        <th className="px-6 py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {loadingAdmissions ? (
                                        <tr>
                                            <td colSpan={6} className="py-16 md:py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching Admissions...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredAdmissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-16 md:py-20 text-center italic text-gray-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">
                                                No clinical records match your search
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAdmissions.map((adm) => (
                                            <tr key={adm._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all group cursor-pointer" onClick={() => handleSelectAdmission(adm)}>
                                                <td className="px-4 md:px-6 py-3 md:py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800/50 font-black text-xs">
                                                            {adm.patient?.name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] md:text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{adm.patient?.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Fingerprint size={10} className="text-gray-400" />
                                                                <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                    MRN: {(adm.patient as any)?.mrn || 'N/A'}
                                                                    <span className="mx-1 opacity-30">|</span>
                                                                    ADM: {adm.admissionId}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 md:py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                        <BedDouble size={10} className="text-blue-500" />
                                                        <span className="text-[9px] md:text-[10px] font-black text-gray-600 dark:text-gray-400">{adm.bed?.bedId || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                                    <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                                        {adm.primaryDoctor?.user?.name || 'Not Assigned'}
                                                    </p>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                                    <span className="text-[9px] md:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.05em]">
                                                        {adm.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                                    <span className={`px-2 py-0.5 md:py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${adm.pharmacyClearanceStatus === "CLEARED"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                        : adm.pharmacyClearanceStatus === "PENDING"
                                                            ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                                            : "bg-gray-50 text-gray-400 border-gray-200"
                                                        }`}>
                                                        {adm.pharmacyClearanceStatus === "CLEARED" ? "CLEARED" : adm.pharmacyClearanceStatus || "NOT REQUIRED"}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(getPath(`/pharmacy/ipd-billing?admissionId=${adm.admissionId}`));
                                                            }}
                                                            className="px-2.5 md:px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-all border border-teal-100 dark:border-teal-800/30 text-[8px] md:text-[9px] font-black uppercase flex items-center gap-1.5 md:gap-2 shadow-sm"
                                                        >
                                                            <Pencil size={10} />
                                                            Edit Bill
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PATIENT DETAIL VIEW (patient selected) ════════════════════════════ */}
            {selectedAdmission && (
                <div className="animate-in slide-in-from-bottom-2 duration-500">
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-[10px] md:text-sm font-bold text-gray-400 hover:text-gray-600 mb-4 md:mb-5 uppercase tracking-widest transition-colors px-1"
                    >
                        <ArrowLeft size={14} className="md:w-[15px]" /> Back to all patients
                    </button>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                        {/* LEFT col */}
                        <div className="xl:col-span-2 space-y-4 md:space-y-5">

                            {/* ── Patient Card ── */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-5 md:p-8 text-white relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-32 md:w-64 h-32 md:h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 shadow-lg backdrop-blur-sm border border-white/10">
                                                <User size={24} className="md:w-8 md:h-8" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white/70 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-1">Selected Patient Registry</p>
                                                <h2 className="text-xl md:text-3xl font-black leading-none uppercase tracking-tight truncate">{selectedAdmission.patient?.name}</h2>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <p className="text-white/60 text-[10px] md:text-xs font-black uppercase tracking-widest">{selectedAdmission.admissionId}</p>
                                                    {selectedAdmission.patient?.mobile && (
                                                        <>
                                                            <span className="w-1 h-1 bg-white/30 rounded-full" />
                                                            <p className="text-white/60 text-[10px] md:text-xs font-black uppercase tracking-widest">📞 {selectedAdmission.patient.mobile}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center md:text-right gap-3 border-t border-white/10 md:border-0 pt-4 md:pt-0">
                                            {selectedAdmission.bed?.bedId && (
                                                <div className="bg-white text-indigo-600 rounded-xl px-4 py-2 flex items-center gap-2 shadow-xl shadow-indigo-900/20">
                                                    <BedDouble size={14} />
                                                    <span className="font-black text-[11px] md:text-sm uppercase tracking-widest">{selectedAdmission.bed.bedId}</span>
                                                </div>
                                            )}
                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border backdrop-blur-sm ${getClearanceColor(selectedAdmission.pharmacyClearanceStatus).replace('bg-green-100', 'bg-white/10').replace('bg-red-100', 'bg-white/10').replace('text-green-700', 'text-white').replace('text-red-700', 'text-white').replace('border-green-200', 'border-white/20').replace('border-red-200', 'border-white/20')}`}>
                                                {selectedAdmission.pharmacyClearanceStatus || "NOT_REQUIRED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary stats */}
                                {summary && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 dark:divide-gray-700 border-b border-gray-50 dark:border-gray-700">
                                        {[
                                            { label: "Issued", val: (summary as any).totalIssued ?? 0, color: "text-blue-600" },
                                            { label: "Returned", val: (summary as any).totalReturned ?? 0, color: "text-orange-500" },
                                            { label: "Consumed", val: (summary as any).totalConsumed ?? 0, color: "text-green-600" },
                                            { label: "Net Bill", val: `₹${((summary as any).netBillableAmount ?? 0).toFixed(2)}`, color: "text-purple-600" },
                                        ].map((s) => (
                                            <div key={s.label} className="p-3 md:p-4 text-center">
                                                <p className="text-[9px] md:text-xs text-gray-400 uppercase font-black tracking-widest mb-1">{s.label}</p>
                                                <p className={`text-base md:text-lg font-bold tabular-nums ${s.color}`}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Warning */}
                                {(summary as any)?.pendingReturnRequests > 0 && (
                                    <div className="mx-4 md:mx-5 mb-4 mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-xl md:rounded-2xl px-3 py-2 md:px-4 md:py-2.5 flex items-start md:items-center gap-2 text-[10px] md:text-xs text-amber-700">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5 md:mt-0" />
                                        <span className="font-bold">{(summary as any).pendingReturnRequests} pending return request(s) require action.</span>
                                    </div>
                                )}

                                {(summary as any)?.pharmacyClearanceStatus === "PENDING" && (
                                    <div className="px-4 md:px-5 pb-4 md:pb-5 pt-1">
                                        {!overrideMismatch ? (
                                            <button
                                                onClick={() => signoffMutation.mutate({ admissionId: admId })}
                                                disabled={signoffMutation.isPending}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-60 w-full justify-center shadow-lg shadow-green-100 dark:shadow-none active:scale-95"
                                            >
                                                <CheckCircle2 size={16} />
                                                {signoffMutation.isPending ? "Verifying Ledger..." : "Sign-Off Pharmacy Clearance"}
                                            </button>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl md:rounded-3xl p-4 md:p-5 mb-4">
                                                <h4 className="text-red-700 dark:text-red-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-xs md:text-sm">
                                                    <AlertTriangle size={18} />
                                                    Discrepancy Detected
                                                </h4>
                                                <p className="text-red-600 dark:text-red-300 text-[10px] md:text-xs mb-4 leading-relaxed font-semibold">
                                                    The system found medicines that were issued but neither consumed nor physically returned. Verify stock or submit return requests.
                                                </p>

                                                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl border border-red-100 dark:border-red-900 overflow-hidden mb-4 shadow-sm">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-[10px] md:text-xs text-left min-w-[500px]">
                                                            <thead className="bg-red-100/50 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                                                                <tr>
                                                                    <th className="px-4 py-2 font-bold uppercase tracking-wider">Medicine</th>
                                                                    <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Issued</th>
                                                                    <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Cons.</th>
                                                                    <th className="px-2 py-2 text-center font-bold uppercase tracking-wider">Ret.</th>
                                                                    <th className="px-2 py-2 text-center text-red-600 font-bold uppercase tracking-wider">Variance</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-red-100 dark:divide-red-900/50">
                                                                {overrideMismatch.missingItems.map((m: any, i: number) => (
                                                                    <tr key={`${m.medicine}-${i}`} className="dark:text-gray-300 hover:bg-red-50/50 dark:hover:bg-red-900/20">
                                                                        <td className="px-4 py-2.5 font-bold">{m.medicine}</td>
                                                                        <td className="px-2 py-2.5 text-center text-blue-600 font-bold tabular-nums">{m.issued}</td>
                                                                        <td className="px-2 py-2.5 text-center text-green-600 font-bold tabular-nums">{m.consumed}</td>
                                                                        <td className="px-2 py-2.5 text-center text-orange-500 font-bold tabular-nums">{m.returned}</td>
                                                                        <td className="px-2 py-2.5 text-center text-red-600 font-black tabular-nums bg-red-100/30 dark:bg-red-900/30">{m.missing}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <label className="block text-[10px] md:text-xs font-bold text-red-800 dark:text-red-300 mb-1.5 uppercase tracking-widest">Override Reason (Required)</label>
                                                <textarea
                                                    value={overrideReason}
                                                    onChange={e => setOverrideReason(e.target.value)}
                                                    placeholder="Specify why you are clearing this physically missing stock..."
                                                    className="w-full text-xs md:text-sm p-3 rounded-xl md:rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500 mb-4 h-20 shadow-sm"
                                                />

                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setOverrideMismatch(null);
                                                            setOverrideReason("");
                                                        }}
                                                        className="flex-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => signoffMutation.mutate({ admissionId: admId, forceOverride: true, overrideReason })}
                                                        disabled={signoffMutation.isPending || !overrideReason.trim()}
                                                        className="flex-1 bg-red-600 text-white py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-100 dark:shadow-none active:scale-95 transition-all"
                                                    >
                                                        {signoffMutation.isPending ? "Forcing..." : "Force Sign-Off"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Return Requests ── */}
                            {(returns as any[]).length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-orange-200 dark:border-orange-800/40 shadow-sm p-4 md:p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl">
                                            <RotateCcw size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Return Requests</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting pharmacist verification</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        {(returns as any[]).map((ret: any) => (
                                            <div key={ret._id} className="border border-orange-100 dark:border-orange-900/40 rounded-2xl md:rounded-3xl overflow-hidden bg-orange-50/10 dark:bg-orange-900/5 hover:border-orange-300 transition-all shadow-sm">
                                                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-100 dark:border-orange-900/20">
                                                    <div>
                                                        <p className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                                            Unit: <span className="text-orange-600">{ret.returnedBy?.name || "WARD staff"}</span>
                                                        </p>
                                                        <p className="text-[9px] md:text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">
                                                            📅 {new Date(ret.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {ret.status === "PENDING" ? (
                                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                <button
                                                                    onClick={() => approveReturnMutation.mutate(ret._id)}
                                                                    disabled={approveReturnMutation.isPending}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-teal-500/10"
                                                                >
                                                                    <Check size={14} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectReturnMutation.mutate(ret._id)}
                                                                    disabled={rejectReturnMutation.isPending}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
                                                                >
                                                                    <X size={14} /> Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${ret.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                                                }`}>
                                                                {ret.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto p-2">
                                                    <table className="w-full text-[11px] md:text-xs min-w-[500px]">
                                                        <thead className="text-gray-400 uppercase text-[9px] md:text-[10px] font-black tracking-widest border-b dark:border-gray-800">
                                                            <tr>
                                                                <th className="px-5 py-3 text-left">Medicine Registry</th>
                                                                <th className="px-4 py-3 text-center">Qty</th>
                                                                <th className="px-5 py-3 text-left">Internal Reason</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-orange-100/30 dark:divide-orange-900/20">
                                                            {(ret.items || []).map((item: any, i: number) => (
                                                                <tr key={`${item.productName}-${i}`} className="hover:bg-orange-100/20 transition-colors">
                                                                    <td className="px-5 py-4 font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.productName}</td>
                                                                    <td className="px-4 py-4 text-center font-black text-orange-600 tabular-nums">
                                                                        <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-[10px]">{item.returnedQty}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 text-gray-500 font-bold italic">{item.reason || "—"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Issuance History ── */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 md:p-8 mb-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl">
                                        <ClipboardList size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Medicine Issuance Ledger</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full chronological history</p>
                                    </div>
                                </div>

                                {loadingIssuances ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing nodes...</span>
                                    </div>
                                ) : (issuances as any[]).length === 0 ? (
                                    <div className="text-center py-20 bg-gray-50/30 dark:bg-gray-900/10 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                        <Pill size={40} className="mx-auto mb-4 text-gray-200" />
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">No issuance records</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {(issuances as any[]).map((iss: any) => (
                                            <div key={iss._id} className="border border-gray-100 dark:border-gray-700/50 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                                <div className="bg-gray-50/50 dark:bg-gray-800/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm">
                                                            <User size={16} className="text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                                                Operator: <span className="text-indigo-600">{iss.issuedBy?.name || "STAFF"}</span>
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                                🕒 {new Date(iss.issuedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border self-start sm:self-center shadow-lg shadow-gray-100 dark:shadow-none ${getStatusBadge(iss.status)}`}>
                                                        {iss.status?.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto p-2">
                                                    <table className="w-full text-[11px] md:text-xs min-w-[800px]">
                                                        <thead className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-gray-800">
                                                            <tr>
                                                                <th className="px-5 py-4 text-left">SKU Description</th>
                                                                <th className="px-4 py-4 text-center">Node Batch</th>
                                                                <th className="px-4 py-4 text-center">Issued</th>
                                                                <th className="px-4 py-4 text-center text-orange-600">Ret.</th>
                                                                <th className="px-4 py-4 text-right">Cycle Rate</th>
                                                                <th className="px-4 py-4 text-right">Aggregate</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                                            {iss.items?.map((item: any, i: number) => {
                                                                const returnedAmt = (item.returnedQty || 0) * (item.unitRate || item.totalAmount / item.issuedQty);
                                                                return (
                                                                    <tr key={`${item.productName}-${i}`} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/10 transition-colors">
                                                                        <td className="px-5 py-5">
                                                                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.productName}</p>
                                                                            {iss.issuedToNurse?.name && (
                                                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                                                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                                                                    <p className="text-[10px] text-teal-600 font-black uppercase tracking-widest">Chain: {iss.issuedToNurse.name}</p>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-5 text-center text-gray-500 font-black font-mono text-[10px] uppercase">{item.batchNo || "—"}</td>
                                                                        <td className="px-4 py-5 text-center font-black text-indigo-600 tabular-nums">
                                                                            <span className="bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">{item.issuedQty}</span>
                                                                        </td>
                                                                        <td className={`px-4 py-5 text-center font-black tabular-nums ${item.returnedQty > 0 ? "text-orange-500" : "text-gray-200"}`}>
                                                                            {item.returnedQty > 0 ? (
                                                                                <span className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">{item.returnedQty}</span>
                                                                            ) : "0"}
                                                                        </td>
                                                                        <td className="px-4 py-5 text-right text-gray-500 font-bold tabular-nums">₹{(item.unitRate || item.totalAmount / item.issuedQty).toFixed(2)}</td>
                                                                        <td className="px-4 py-5 text-right">
                                                                            <p className="font-black text-gray-900 dark:text-white tabular-nums">₹{item.totalAmount.toFixed(2)}</p>
                                                                            {item.returnedQty > 0 && (
                                                                                <p className="text-[10px] text-rose-500 font-black mt-0.5">-₹{returnedAmt.toFixed(2)}</p>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50/30 dark:bg-gray-900/20">
                                                            <tr className="border-t border-gray-100 dark:border-gray-800">
                                                                <td colSpan={5} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase text-right tracking-[0.2em]">Gross Cycle Value</td>
                                                                <td className="px-6 py-3 text-right font-black text-gray-900 dark:text-white tabular-nums">₹{iss.totalAmount.toFixed(2)}</td>
                                                            </tr>
                                                            {iss.items?.some((it: any) => it.returnedQty > 0) && (
                                                                <tr>
                                                                    <td colSpan={5} className="px-6 py-3 text-[10px] font-black text-rose-500 uppercase text-right tracking-[0.2em]">Liquidated Return</td>
                                                                    <td className="px-6 py-3 text-right font-black text-rose-500 tabular-nums">
                                                                        - ₹{iss.items.reduce((sum: number, it: any) => sum + ((it.returnedQty || 0) * (it.unitRate || it.totalAmount / it.issuedQty)), 0).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            <tr className="bg-indigo-600 text-white shadow-xl">
                                                                <td colSpan={5} className="px-6 py-4 text-[11px] font-black uppercase text-right tracking-[0.3em]">Final Settled Ledger</td>
                                                                <td className="px-6 py-4 text-right font-black text-sm md:text-base tabular-nums">
                                                                    ₹{(iss.totalAmount - iss.items.reduce((sum: number, it: any) => sum + ((it.returnedQty || 0) * (it.unitRate || it.totalAmount / it.issuedQty)), 0)).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                                {iss.notes && (
                                                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/40 border-t dark:border-gray-700">
                                                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                                            <span className="text-indigo-600 font-black uppercase tracking-widest mr-2">Audit Comment:</span> {iss.notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Financials & Staff */}
                        <div className="space-y-4 md:space-y-6">
                            {/* Nurse quick-pick */}
                            {nurses.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 md:p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <UserCheck size={12} className="text-blue-500" /> Authorized Staff
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                        {nurses.slice(0, 10).map((nurse: any) => (
                                            <button
                                                key={nurse._id}
                                                onClick={() => setSelectedNurseId(n => n === nurse._id ? "" : nurse._id)}
                                                className={`flex items-center gap-3 p-2 md:p-2.5 rounded-xl transition-all border ${selectedNurseId === nurse._id
                                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                                                    : "bg-white dark:bg-gray-800 border-gray-50 dark:border-gray-700 hover:border-gray-200 shadow-xs"}`}
                                            >
                                                <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 font-black text-xs">
                                                    {nurse.name?.[0] || 'N'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black text-gray-700 dark:text-gray-200 truncate uppercase">{nurse.name || nurse.user?.name}</p>
                                                    {nurse.department && <p className="text-[9px] text-gray-400 font-bold">{nurse.department}</p>}
                                                </div>
                                                {selectedNurseId === nurse._id && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedNurseId && (
                                        <div className="mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-tight">Active: {nurses.find(n => n._id === selectedNurseId)?.name || "Nurse"}</p>
                                                <button onClick={() => setSelectedNurseId("")} className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase transition-colors">Clear</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Financial Summary ── */}
                            {summary && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden shadow-blue-50 dark:shadow-none">
                                    <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                            Bill Summary
                                        </span>
                                        <Wallet size={14} className="text-blue-500" />
                                    </div>

                                    {/* Patient Info Section */}
                                    <div className="px-5 py-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Statement For</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm md:text-base font-black text-gray-800 dark:text-white leading-tight uppercase tracking-tight">{selectedAdmission.patient?.name}</p>
                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                                    <div className="flex flex-col">
                                                        <p className="text-[7px] font-black text-gray-400 uppercase">MRN Number</p>
                                                        <p className="text-[9px] font-bold text-gray-600 dark:text-gray-300">{(selectedAdmission.patient as any)?.mrn || "N/A"}</p>
                                                    </div>
                                                    <div className="w-[1px] h-6 bg-gray-100 dark:bg-gray-800 hidden sm:block"></div>
                                                    <div className="flex flex-col">
                                                        <p className="text-[7px] font-black text-gray-400 uppercase">Admission ID</p>
                                                        <p className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400">{selectedAdmission.admissionId}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-center text-xs md:text-sm">
                                            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Issued</span>
                                            <span className="font-black text-gray-800 dark:text-white tabular-nums">₹{((summary as any).totalIssuedAmount ?? 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs md:text-sm">
                                            <span className="text-orange-500 font-bold uppercase tracking-widest text-[10px]">Return Credit</span>
                                            <span className="font-black text-orange-600 tabular-nums">-₹{((summary as any).totalReturnedAmount ?? 0).toFixed(2)}</span>
                                        </div>
                                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                    <IndianRupee size={10} />
                                                    Net Payable
                                                </p>
                                                <p className="text-[8px] md:text-[9px] text-gray-400 italic font-bold leading-none uppercase tracking-tighter">Verified Pharmacy Ledger</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl md:text-2xl font-black text-blue-700 dark:text-blue-400 leading-none tabular-nums">
                                                    ₹{((summary as any).netBillableAmount ?? 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
