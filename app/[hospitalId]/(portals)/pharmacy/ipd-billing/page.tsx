"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Pill,
    User,
    Users,
    ShoppingCart,
    CreditCard,
    Calculator,
    AlertCircle,
    Search,
    Plus,
    Trash2,
    Save,
    ArrowLeft,
    ChevronDown,
    UserCheck,
    X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { ProductService } from "@/lib/integrations/services/product.service";
import { hospitalAdminService } from "@/lib/integrations";
import { apiClient } from "@/lib/integrations/api/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { useTenantLink } from "@/hooks/useTenantLink";
import { ipdService } from "@/lib/integrations/services/ipd.service";
import { ipdIssuanceService } from "@/lib/integrations/services/pharmacy.service";
import { ClipboardList, Clock } from "lucide-react";
import { Frequency, FoodTiming, StandardFrequency, INITIAL_FREQUENCY, mapFrequency, formatFrequency } from "@/lib/frequencyUtils";

const FrequencySelector = ({ value, onChange }: { value: Frequency, onChange: (val: Frequency) => void }) => {
    const freq = mapFrequency(value);

    const toggleStandard = (slot: keyof StandardFrequency) => {
        const current = freq.standard[slot];
        const nextMap: Record<string, FoodTiming | 'off'> = {
            off: 'after',
            after: 'before',
            before: 'with',
            with: 'anytime',
            anytime: 'off'
        };
        onChange({
            ...freq,
            standard: {
                ...freq.standard,
                [slot]: nextMap[current] || 'anytime'
            }
        });
    };

    const setCustomInterval = (hours: number) => {
        onChange({
            ...freq,
            type: 'custom',
            custom: {
                ...freq.custom,
                interval: hours
            }
        });
    };

    const setCustomTiming = (timing: FoodTiming) => {
        onChange({
            ...freq,
            type: 'custom',
            custom: {
                ...freq.custom,
                timing
            }
        });
    };

    const timingColors: Record<string, string> = {
        anytime: 'bg-slate-500',
        before: 'bg-amber-500',
        after: 'bg-emerald-500',
        with: 'bg-blue-500'
    };

    const timingLabels: Record<string, string> = {
        anytime: 'Anytime',
        before: 'Before Food',
        after: 'After Food',
        with: 'With Food'
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg w-full max-w-full min-w-0 flex-1 h-8 shadow-sm transition-all relative overflow-visible">
            {/* Type Toggle */}
            <div className="flex p-0.5 bg-slate-100 rounded-md shrink-0">
                <button
                    onClick={() => onChange({ ...INITIAL_FREQUENCY, type: 'standard' })}
                    className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter rounded transition-all ${freq.type === 'standard' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Std
                </button>
                <button
                    onClick={() => onChange({ ...INITIAL_FREQUENCY, type: 'custom' })}
                    className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter rounded transition-all ${freq.type === 'custom' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Cst
                </button>
            </div>

            <div className="w-[1px] h-3 bg-slate-200 mx-0.5 shrink-0" />

            {freq.type === 'standard' ? (
                <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar scroll-smooth px-0.5">
                    {(['morning', 'afternoon', 'evening', 'night'] as const).map((slot) => {
                        const timing = freq.standard[slot];
                        const isActive = timing !== 'off';
                        const slotLabels = {
                            morning: 'Morning',
                            afternoon: 'Afternoon',
                            evening: 'Evening',
                            night: 'Night'
                        };
                        return (
                            <div key={slot} className="relative group/tooltip shrink-0">
                                <button
                                    onClick={() => toggleStandard(slot)}
                                    className={`h-6 px-1.5 rounded-md border text-[7px] font-black uppercase transition-all flex items-center gap-1 whitespace-nowrap ${isActive ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    <span className={isActive ? 'text-teal-600' : 'text-slate-300'}>{slotLabels[slot]}</span>
                                    {isActive && (
                                        <span className={`px-1 rounded-[2px] text-white text-[6px] py-0 font-bold ${timingColors[timing]}`}>
                                            {timingLabels[timing].split(' ')[0]}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center gap-1.5 flex-1 px-0.5 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                        <Clock size={8} className="text-slate-400" />
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Every</span>
                        <input
                            type="text"
                            value={freq.custom.interval === 0 ? '' : freq.custom.interval}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) {
                                    setCustomInterval(val === '' ? 0 : parseInt(val));
                                }
                            }}
                            placeholder="8"
                            className="w-5 bg-transparent text-[8px] font-black text-teal-600 outline-none text-center"
                        />
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Hrs</span>
                    </div>
                    <select
                        value={freq.custom.timing}
                        onChange={(e) => setCustomTiming(e.target.value as any)}
                        className="h-6 px-1 bg-slate-50 border border-slate-200 rounded text-[7px] font-black uppercase focus:outline-none"
                    >
                        <option value="anytime">Anytime</option>
                        <option value="before">Before Food</option>
                        <option value="after">After Food</option>
                        <option value="with">With Food</option>
                    </select>
                </div>
            )}
        </div>
    );
};

const IPDBillingPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams() as any;
    const orderId = ((searchParams?.get("orderId") ?? null) ?? null);
    const admissionId = ((searchParams?.get("admissionId") ?? null) ?? null);
    // const { user } = useAuthStore();
    const { getPath } = useTenantLink();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [previousIssuances, setPreviousIssuances] = useState<any[]>([]);
    const [hospitalSettings, setHospitalSettings] = useState<any>(null);

    // Nurse State
    const [nurses, setNurses] = useState<any[]>([]);
    const [loadingNurses, setLoadingNurses] = useState(false);
    const [selectedNurse, setSelectedNurse] = useState<any>(null);
    const [nurseSearch, setNurseSearch] = useState("");
    const [showNurseDropdown, setShowNurseDropdown] = useState(false);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);
    const [prescribedMedicines, setPrescribedMedicines] = useState<any[]>([]);
    const [processingMedIndex, setProcessingMedIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [frequency, setFrequency] = useState<Frequency>(INITIAL_FREQUENCY);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const p_admissionId = orderId ? null : admissionId; // if we have order we already process it, but if no order, get by admission

                const [settingsRes, orderRes, admissionRes, issuancesRes] = await Promise.all([
                    hospitalAdminService.getHospitalMetadata({ skipCache: true }).catch(err => {
                        console.error('Failed to load settings', err);
                        return { success: false, data: null };
                    }),
                    orderId ? PharmacyBillingService.getPharmacyOrder(orderId).catch(err => {
                        console.error('Failed to load order', err);
                        return null;
                    }) : Promise.resolve(null),
                    p_admissionId ? ipdService.getAdmissionDetails(p_admissionId).catch(err => {
                        console.error('Failed to load admission details', err);
                        return null;
                    }) : Promise.resolve(null),
                    admissionId ? ipdIssuanceService.getIssuancesByAdmission(admissionId).catch(err => {
                        console.error('Failed to load previous issuances', err);
                        return [];
                    }) : Promise.resolve([])
                ]);

                if (settingsRes.success) {
                    setHospitalSettings(settingsRes.data);
                }

                if (issuancesRes && Array.isArray(issuancesRes)) {
                    setPreviousIssuances(issuancesRes);
                }

                if (orderRes) {
                    const o = orderRes.pharmacyOrder || orderRes;
                    setOrder(o);

                    if (o.medicines) {
                        setPrescribedMedicines(o.medicines.map((m: any) => ({ ...m, processed: false })));
                    }
                } else if (admissionRes) {
                    // Create mock order so billing logic works seamlessly (map flattened discharge response)
                    setOrder({
                        _id: null,
                        tokenNumber: "Direct IPD Billing",
                        patient: {
                            name: admissionRes.patientName || admissionRes.patient?.name, // Fallbacks just in case
                            age: admissionRes.age,
                            gender: admissionRes.gender,
                        },
                        admission: {
                            _id: admissionRes.admissionId || admissionRes._id,
                            admissionId: admissionRes.admissionId,
                            wardType: admissionRes.roomType || admissionRes.wardType,
                            bedDetails: {
                                wardType: admissionRes.roomType || admissionRes.wardType,
                                room: admissionRes.roomNo,
                                bedId: admissionRes.bedNo,
                                department: admissionRes.department
                            }
                        },
                        doctor: {
                            name: admissionRes.primaryDoctor || admissionRes.doctor?.name
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to fetch billing data", error);
                toast.error("Failed to load details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId, admissionId]);

    // Fetch nurses for this hospital
    useEffect(() => {
        const fetchNurses = async () => {
            try {
                setLoadingNurses(true);
                const res: any = await apiClient("/hospital-admin/nurses");
                const list = res?.nurses || res?.users || res?.data || res || [];
                const parsedNurses = Array.isArray(list) ? list : [];
                setNurses(parsedNurses);

                // Auto-select nurse from previous issuances if available
                if (previousIssuances && previousIssuances.length > 0 && parsedNurses.length > 0 && !selectedNurse) {
                    const lastNurseId = previousIssuances[0]?.receivedByNurse?._id || previousIssuances[0]?.receivedByNurse;
                    if (lastNurseId) {
                        const nurseMatch = parsedNurses.find((n: any) => n._id === lastNurseId);
                        if (nurseMatch) {
                            setSelectedNurse(nurseMatch);
                        }
                    }
                }

            } catch (err) {
                console.error("Failed to fetch nurses:", err);
            } finally {
                setLoadingNurses(false);
            }
        };
        fetchNurses();
    }, [previousIssuances, selectedNurse]);

    // Close nurse dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".nurse-dropdown-container")) {
                setShowNurseDropdown(false);
            }
        };
        if (showNurseDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showNurseDropdown]);

    /* 
    const filteredNurses = nurses.filter(n => {
        const q = nurseSearch.toLowerCase();
        return !q || n.name?.toLowerCase().includes(q) || n.email?.toLowerCase().includes(q);
    });
    */

    // Product search logic
    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                setIsSearching(true);
                const results = await ProductService.getProducts({ search: searchTerm });
                const meds = results || [];

                // Prioritize results starting with searchTerm
                const q = searchTerm.toLowerCase();
                const sortedResults = [...meds].sort((a, b) => {
                    const aBrand = (a.brandName || '').toLowerCase();
                    const bBrand = (b.brandName || '').toLowerCase();
                    const aGen = (a.genericName || '').toLowerCase();
                    const bGen = (b.genericName || '').toLowerCase();

                    const getScore = (brand: string, gen: string) => {
                        if (brand.startsWith(q) || gen.startsWith(q)) return 1;
                        const words = [...brand.split(/\s+/), ...gen.split(/\s+/)];
                        if (words.some(word => word.startsWith(q))) return 2;
                        if (brand.includes(q) || gen.includes(q)) return 3;
                        return 4;
                    };

                    const scoreA = getScore(aBrand, aGen);
                    const scoreB = getScore(bBrand, bGen);

                    if (scoreA !== scoreB) return scoreA - scoreB;
                    return aBrand.localeCompare(bBrand);
                });

                setSearchResults(sortedResults);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setSearchTerm(product.brandName);
        const unitsPerPack = product.unitsPerPack || 1;
        setPrice(product.mrp / unitsPerPack);
        setSearchResults([]);
    };

    const handleAddItem = () => {
        if (!selectedProduct) return toast.error("Select a product first");
        if (quantity <= 0) return toast.error("Quantity must be greater than 0");

        const newItem = {
            productId: selectedProduct._id,
            productName: `${selectedProduct.brandName} ${selectedProduct.strength}`,
            qty: quantity,
            unitRate: price,
            frequency: frequency,
            total: quantity * price
        };

        setCart([...cart, newItem]);

        // If we were processing a prescribed med, mark it as done
        if (processingMedIndex !== null) {
            const updatedMeds = [...prescribedMedicines];
            updatedMeds[processingMedIndex].processed = true;
            setPrescribedMedicines(updatedMeds);
            setProcessingMedIndex(null);
        }

        setSelectedProduct(null);
        setSearchTerm("");
        setQuantity(1);
        setPrice(0);
        setFrequency(INITIAL_FREQUENCY);
    };

    const removeItem = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleChargeToIPD = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!order?.admission) return toast.error("No admission linked to this order");

        // Nurse is optional but recommended
        if (!selectedNurse) {
            const confirm = window.confirm("No nurse selected. The medicines won't appear in any nurse's return portal. Proceed anyway?");
            if (!confirm) return;
        }

        // Check if ward/room/department allows IPD billing
        const bedInfo = order?.admission?.bedDetails || {};
        const wardType = bedInfo.wardType || order?.admission?.wardType;
        const room = bedInfo.room;
        const department = bedInfo.department;

        const enabledWards = hospitalSettings?.ipdPharmaSettings?.enabledWards || [];
        const isEnabled = enabledWards.includes(wardType) ||
            (room && enabledWards.includes(room)) ||
            (department && enabledWards.includes(department)) ||
            (bedInfo.wardName && enabledWards.includes(bedInfo.wardName));

        if (!isEnabled && enabledWards.length > 0) {
            toast.error(`IPD Pharmacy Billing is disabled for ${bedInfo.wardName || wardType}${room ? ` [Room: ${room}]` : ''}. Please use Retail Flow.`);
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                admissionId: order.admission.admissionId || order.admission._id,
                orderId: order._id,
                items: cart.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    issuedQty: item.qty,
                    unitRate: item.unitRate,
                    frequency: item.frequency,
                    totalAmount: item.total
                })),
                // ✅ Nurse assignment — drives the return portal filtering
                receivedByNurse: selectedNurse?._id || null,
                nurseNote: selectedNurse?.name || null,
                notes: `Billed from order ${order.tokenNumber}${selectedNurse ? ` | Assigned to Nurse: ${selectedNurse.name}` : ""}`
            };

            await PharmacyBillingService.chargeIPDBill(payload);
            toast.success(
                selectedNurse
                    ? `Medicines charged to IPD & assigned to ${selectedNurse.name}'s return portal!`
                    : "Medicines charged to IPD bill successfully!"
            );
            router.push(getPath("/pharmacy/orders"));
        } catch (error: any) {
            console.error("Charge failed", error);
            toast.error(error.message || "Failed to charge medicines to IPD");
        } finally {
            setSubmitting(false);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary-theme/10 border-t-primary-theme rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Patient Context...</p>
        </div>
    );

    const handleClear = () => {
        setCart([]);
        setSearchTerm('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setPrice(0);
        setFrequency(INITIAL_FREQUENCY);
        if (orderId || admissionId) {
            router.push(getPath("/pharmacy/ipd-billing"));
        }
        setOrder(null);
        setPreviousIssuances([]);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 sm:pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => router.back()} className="p-2.5 md:p-3 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:bg-slate-50 transition-all shadow-sm shrink-0">
                        <ArrowLeft size={18} className="md:w-5 md:h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3 uppercase">
                            <CreditCard className="text-blue-600 w-5 h-5 md:w-7 md:h-7 shrink-0" />
                            IPD BILLING
                        </h1>
                        <p className="text-[10px] md:text-xm font-black text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1 italic">Deferred pharmaceutical Billing System</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClear}
                        className="px-3 py-1.5 md:px-5 md:py-2.5 bg-rose-50 rounded-xl md:rounded-2xl border border-rose-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-rose-600 hover:bg-rose-100 uppercase tracking-wider transition-colors"
                    >
                        <Trash2 size={14} className="md:w-4 md:h-4" />
                        Clear Form
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                <div className="xl:col-span-2 space-y-4 md:space-y-6">
                    {/* Patient Card */}
                    <div className="bg-white rounded-2xl md:rounded-4xl border border-slate-100 p-5 md:p-8 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary-theme/10 text-primary-theme rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                <User size={24} className="md:w-8 md:h-8" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs md:text-lg font-black text-slate-900 uppercase tracking-tight">{order?.patient?.name || "Unknown Patient"}</h3>
                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-relaxed">
                                    {order?.patient?.age && `${order.patient.age}Y • `} {order?.patient?.gender && `${order.patient.gender} • `}
                                    <span className="hidden sm:inline">ADMISSION: </span>{order?.admission?.admissionId || "N/A"}
                                    <br className="sm:hidden" />
                                    <span className="hidden sm:inline"> • </span>WARD: {order?.admission?.bedDetails?.wardType || order?.admission?.wardType || "N/A"} {order?.admission?.bedDetails?.bedId && `[BED: ${order.admission.bedDetails.bedId}]`}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-4xl border border-slate-100">
                            <div>
                                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Physician</p>
                                <p className="text-[10px] md:text-xs font-black text-slate-700 uppercase">
                                    {(() => {
                                        const docName = order?.doctor?.user?.name || order?.doctor?.name || "N/A";
                                        return docName.toLowerCase().startsWith("dr.") ? docName : `Dr. ${docName}`;
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Identifier</p>
                                <p className="text-[10px] md:text-xs font-black text-slate-700 uppercase">{order?.tokenNumber || "Direct IPD Flow"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Prescribed Medicines List */}
                    {prescribedMedicines.length > 0 && (
                        <div className="bg-primary-theme/5 rounded-2xl md:rounded-4xl border border-primary-theme/10 p-5 md:p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-5 md:mb-6">
                                <div className="p-2 bg-primary-theme/10 text-primary-theme rounded-lg md:rounded-xl">
                                    <Pill size={16} className="md:w-[18px] md:h-[18px]" />
                                </div>
                                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">Prescribed Formulations</h3>
                            </div>
                            <div className="space-y-3">
                                {prescribedMedicines.map((med, i) => {
                                    // const prescribedFreq = med.freq || med.frequency || "1-1-1";
                                    return (
                                        <div key={`${med.name}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[11px] md:text-xs font-black text-slate-700 uppercase">{med.name}</p>
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {med.dosage} • Freq: <span className="text-primary-theme">{formatFrequency(med.freq || med.frequency)}</span> • qty: {med.quantity}
                                                </p>
                                            </div>
                                            <button
                                                disabled={med.processed}
                                                onClick={() => {
                                                    setSearchTerm(med.name.split(' (')[0]);
                                                    setQuantity(Number(med.quantity) || 1);
                                                    setFrequency(mapFrequency(med.freq || med.frequency));
                                                    setProcessingMedIndex(i);
                                                }}
                                                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${med.processed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary-theme text-white hover:bg-primary-theme/90 active:scale-95'}`}
                                            >
                                                {med.processed ? "Processed" :
                                                    processingMedIndex === i ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            Processing...
                                                        </div>
                                                    ) : "Issue Now"
                                                }
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Previous Issuances / Medicines List */}
                    {previousIssuances.length > 0 && (
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl md:rounded-4xl border border-amber-100 dark:border-amber-900/30 p-5 md:p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-5 md:mb-6">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg md:rounded-xl">
                                    <ClipboardList size={16} className="md:w-[18px] md:h-[18px]" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Admission Billing History</h3>
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Prior pharmaceutical distributions</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {previousIssuances.map((iss) => (
                                    <div key={iss._id} className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl border border-amber-100/50 dark:border-amber-900/30 shadow-sm overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-50 dark:border-slate-700 pb-3 mb-3 gap-2">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-mono">
                                                {new Date(iss.issuedAt).toLocaleString()}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-[8px] md:text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                                                    Receiv: {iss.nurseNote || (iss.receivedByNurse?.name) || "Direct"}
                                                </p>
                                                <p className="text-[8px] md:text-[9px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded">
                                                    ₹{Math.round(iss.totalAmount || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {iss.items.map((item: any, i: number) => (
                                                <div key={`${item.productName}-${i}`} className="flex justify-between items-center text-[10px] md:text-xs bg-slate-50/50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase pr-4">{item.productName}</span>
                                                    <div className="flex items-center gap-3 md:gap-4 shrink-0 font-black">
                                                        <span className="text-blue-600 dark:text-blue-400">{item.issuedQty} QTY</span>
                                                        <span className="text-slate-500 min-w-[60px] text-right">₹{Math.round(item.totalAmount || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entry Section */}
                    <div className="bg-white rounded-2xl md:rounded-4xl border border-slate-100 p-5 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-5 md:mb-6">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg md:rounded-xl">
                                <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                            </div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">Item Acquisition</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 md:gap-3 items-center">
                            <div className="sm:col-span-1 md:col-span-4 relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none z-10">
                                    <Search className="w-3 md:w-3.5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="SEARCH PHARMA INVENTORY..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 md:pl-10 pr-3 py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase outline-none focus:border-primary-theme focus:bg-white focus:ring-2 focus:ring-primary-theme/20 transition-all shadow-sm"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        {searchResults.map((p) => (
                                            <button
                                                key={p._id}
                                                onClick={() => handleSelectProduct(p)}
                                                className="w-full px-4 md:px-5 py-2.5 md:py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-center justify-between gap-4 transition-colors"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase leading-tight">{p.brandName}</p>
                                                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        {p.strength} • Units: {p.unitsPerPack || 1}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] md:text-[11px] font-black text-primary-theme">₹{p.mrp}</p>
                                                    <p className="text-[7px] md:text-[8px] font-bold text-teal-600">₹{Math.round(p.mrp / (p.unitsPerPack || 1))} / unit</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <input
                                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                    placeholder="QTY"
                                    value={quantity || ""}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black outline-none focus:border-primary-theme focus:bg-white focus:ring-2 focus:ring-primary-theme/20 transition-all uppercase shadow-sm"
                                />
                            </div>
                            <div className="sm:col-span-1 md:col-span-4">
                                <FrequencySelector value={frequency} onChange={setFrequency} />
                            </div>
                            <button
                                onClick={handleAddItem}
                                className="w-full sm:col-span-1 md:col-span-2 px-3 py-2 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                                <ShoppingCart size={12} className="md:w-3 md:h-3" />
                                Queue Item
                            </button>
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="bg-white rounded-2xl md:rounded-4xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-left text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-center text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Freq</th>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-center text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-right text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Rate</th>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-right text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                        <th className="px-4 md:px-6 xl:px-8 py-3 md:py-5 text-center text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">X</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {cart.map((item, i) => (
                                        <tr key={`${item.productId}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-[11px] md:text-xs font-black text-slate-700 uppercase tracking-tight">{item.productName}</td>
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-center">
                                                <span className="px-2 py-1 bg-primary-theme/10 text-primary-theme rounded text-[10px] md:text-[11px] font-black">{formatFrequency(item.frequency)}</span>
                                            </td>
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-center text-[11px] md:text-xs font-extrabold text-slate-700 tabular-nums">{item.qty}</td>
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-right text-[11px] md:text-xs font-bold text-slate-500 tabular-nums">₹{Number(item.unitRate || 0).toLocaleString()}</td>
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-right text-[11px] md:text-xs font-black text-primary-theme tabular-nums">₹{Number(item.total || 0).toLocaleString()}</td>
                                            <td className="px-4 md:px-6 xl:px-8 py-4 md:py-5 text-center">
                                                <button onClick={() => removeItem(i)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-16 md:py-24 text-center">
                                                <ShoppingCart className="w-10 h-10 md:w-12 md:h-12 text-slate-100 mx-auto mb-4" />
                                                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Billing queue is currently empty</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl md:rounded-4xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6 md:space-y-8 sticky top-24">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-2.5 md:p-3 bg-blue-600/10 text-blue-600 rounded-xl md:rounded-2xl">
                                <Calculator size={20} />
                            </div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">Ledger Summary</h3>
                        </div>

                        {order?.admission?.bedHistory && order.admission.bedHistory.length > 0 && (
                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Bed Assignment Log</h4>
                                    <Clock size={12} className="text-slate-400" />
                                </div>
                                <div className="space-y-3">
                                    {order.admission.bedHistory.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">{item.bedId}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{item.room} / {item.type}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[8px] font-black text-blue-600 uppercase">
                                                    {new Date(item.startDate).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                    {item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : ' (Current)'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ✅ NURSE SELECTION */}
                        <div className="space-y-3">
                            <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-4 flex items-center gap-1.5">
                                <UserCheck size={12} className="text-teal-500" /> Authorized Receiver
                            </h4>
                            <div className="relative nurse-dropdown-container">
                                {selectedNurse ? (
                                    <div className="flex flex-col gap-2 bg-teal-50 border border-teal-200 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm shadow-teal-100/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-600 text-white rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm shrink-0 shadow-lg shadow-teal-600/20">
                                                {selectedNurse.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] md:text-xs font-black text-teal-800 uppercase leading-tight">{selectedNurse.name}</p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-teal-500 uppercase tracking-widest">{selectedNurse.email || "AUTHORIZED STAFF"}</p>
                                            </div>
                                            <button
                                                onClick={() => { setSelectedNurse(null); setNurseSearch(""); }}
                                                className="p-1.5 text-teal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0 active:scale-90"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNurseDropdown(!showNurseDropdown)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-left hover:border-teal-300 hover:bg-teal-50/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-200 group-hover:bg-teal-100 text-slate-400 group-hover:text-teal-600 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-colors">
                                                <User size={14} />
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 group-hover:text-teal-600 uppercase tracking-widest">
                                                {loadingNurses ? "SEARCHING..." : "SELECT NURSE..."}
                                            </span>
                                        </div>
                                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${showNurseDropdown ? "rotate-180" : ""}`} />
                                    </button>
                                )}

                                {showNurseDropdown && !selectedNurse && (
                                    <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="max-h-52 overflow-y-auto">
                                            {nurses.length === 0 ? (
                                                <div className="py-8 text-center bg-slate-50/50">
                                                    <Users size={20} className="mx-auto text-slate-200 mb-2" />
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Authorized Staff Found</p>
                                                </div>
                                            ) : (
                                                nurses.map((nurse) => (
                                                    <button
                                                        key={nurse._id}
                                                        onClick={() => {
                                                            setSelectedNurse(nurse);
                                                            setShowNurseDropdown(false);
                                                            toast.success(`Context assigned to ${nurse.name.split(' ')[0]}`);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-none text-left"
                                                    >
                                                        <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-teal-400 to-teal-600 text-white rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                                            {nurse.name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] md:text-xs font-black text-slate-800 uppercase truncate leading-tight font-mono">{nurse.name}</p>
                                                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{nurse.email || "Nursing Staff"}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!selectedNurse && (
                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1 mt-1.5 font-mono">
                                    <AlertCircle size={10} />
                                    Meds will not appear in return queue if unassigned
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            {previousIssuances.length > 0 && (
                                <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                    <span>Previously Settled</span>
                                    <span className="text-rose-600 font-mono tracking-tighter tabular-nums text-xs md:text-sm">₹{Math.round(previousIssuances.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Cart Item Count</span>
                                <span className="text-slate-900 font-mono text-xs md:text-sm">{cart.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Current Payable</span>
                                <span className="text-slate-900 font-mono tracking-tighter tabular-nums text-xs md:text-sm">₹{Math.round(subtotal).toLocaleString()}</span>
                            </div>
                            <div className="pt-5 border-t border-dashed border-slate-200">
                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Cumulative Discharge Balance</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                    ₹{Math.round(subtotal + previousIssuances.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleChargeToIPD}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-primary-theme text-white py-4 md:py-6 rounded-2xl md:rounded-4xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-primary-theme/90 transition-all shadow-xl shadow-primary-theme/20 disabled:opacity-50 flex items-center justify-center gap-2.5 active:scale-95 group"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={20} className="group-hover:rotate-12 transition-transform" />
                            )}
                            {selectedNurse ? `Settle & Assign` : "Finalize IPD Charge"}
                        </button>

                        <div className="bg-amber-50/50 border border-amber-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[8px] md:text-[9px] font-bold text-amber-700 uppercase leading-relaxed tracking-tight">
                                Settlement will append these items to the master admission statement. Stock deductions are immediate and non-reversible from this interface.
                                {selectedNurse && <span className="text-teal-600 ml-1">Assigned receiver protocol activated.</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IPDBillingPage;
