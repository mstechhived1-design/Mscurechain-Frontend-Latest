'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Search, Plus, Trash2, Printer, User, ShoppingCart, CreditCard, Calculator, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { ProductService } from '@/lib/integrations/services/product.service';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { PharmacyProduct } from '@/lib/integrations/types/product';
import { BillItem, PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import { toast } from 'react-hot-toast';
import PharmacyBillPrint, { ShopDetails } from '@/components/pharmacy/billing/PharmacyBillPrint';
import { useAuthStore } from '@/stores/authStore';
import { useTenantLink } from '@/hooks/useTenantLink';
import { patientService } from '@/lib/integrations/services/patient.service';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';
import { usePrintStore } from '@/stores/printStore';

const BillingPage = () => {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const { printWithHeader, setPrintWithHeader } = usePrintStore();

    // State
    const [patientName, setPatientName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [patientType, setPatientType] = useState<'IPD' | 'OPD' | ''>('');
    const [patientMrn, setPatientMrn] = useState('');
    const [patientAddress, setPatientAddress] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<PharmacyProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<PharmacyProduct | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState<BillItem[]>([]);
    
    // Substitutes State
    const [substitutes, setSubstitutes] = useState<PharmacyProduct[]>([]);
    const [isFetchingSubstitutes, setIsFetchingSubstitutes] = useState(false);
    const [outOfStockProduct, setOutOfStockProduct] = useState<PharmacyProduct | null>(null);

    // Payment State
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Mixed'>('Cash');
    const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, upi: 0 });
    const [status, setStatus] = useState<'Paid' | 'Partial' | 'Due'>('Paid');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'%' | '₹'>('%');
    const [paidAmount, setPaidAmount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [tempBill, setTempBill] = useState<PharmacyBill | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [prescribedMedicines, setPrescribedMedicines] = useState<any[]>([]);
    const [processingMedIndex, setProcessingMedIndex] = useState<number | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const hasLoadedPrescription = React.useRef(false);

    const searchParams = useSearchParams() as any;
    const orderId = ((searchParams?.get('orderId') ?? null) ?? null);

    // Autocomplete & Validation States
    const [recentPatients, setRecentPatients] = useState<{ name: string; phone: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMobileTouched, setIsMobileTouched] = useState(false);

    // Hospital Patient Search States
    const [hospitalPatients, setHospitalPatients] = useState<Array<{ _id: string; name: string; mobile: string; email?: string; mrn?: string; patientType?: string; doctorName?: string; address?: string }>>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const patientSearchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePatientNameSearch = (value: string) => {
        if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
        if (value.trim().length < 2) {
            setHospitalPatients([]);
            return;
        }
        patientSearchDebounce.current = setTimeout(async () => {
            setSearchingPatients(true);
            try {
                const res = await patientService.searchPatients(value.trim(), hospitalId);
                setHospitalPatients(res.patients || []);
            } catch (err) {
                console.error("Failed to search hospital patients", err);
                setHospitalPatients([]);
            } finally {
                setSearchingPatients(false);
            }
        }, 350);
    };

    // Fetch recent patients for autocomplete
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await PharmacyBillingService.getBills(1, 100);
                if (res.bills) {
                    const patients = res.bills.reduce((acc: any[], bill) => {
                        if (bill.patientName && bill.customerPhone && bill.customerPhone !== '-') {
                            const exists = acc.find(p => p.name.toLowerCase() === bill.patientName.toLowerCase());
                            if (!exists) {
                                acc.push({ name: bill.patientName, phone: bill.customerPhone });
                            }
                        }
                        return acc;
                    }, []);
                    setRecentPatients(patients);
                }
            } catch (error) {
                console.error("Failed to fetch patient history", error);
            }
        };
        fetchHistory();
    }, []);

    const loadedOrderRef = React.useRef<string | null>(null);

    useEffect(() => {
        if (orderId && loadedOrderRef.current !== orderId) {
            const fetchOrder = async () => {
                // Prevent race conditions or double creates by marking as loading immediately
                loadedOrderRef.current = orderId;
                const toastId = toast.loading("Loading prescription order...");

                try {
                    const res = await PharmacyBillingService.getPharmacyOrder(orderId);
                    console.log("Order Fetch Response:", res);

                    // Fallback to handling response as direct order object if pharmacyOrder is missing
                    const order = res.pharmacyOrder || res;

                    if (order && (order.medicines || order.patient)) {

                        // Force update state from API
                        localStorage.removeItem('pharmacy_billing_draft'); // Clear stale draft

                        setPatientName(order.patient?.name || '');
                        setMobileNumber(order.patient?.mobile || '');
                        setDoctorName(order.doctor?.user?.name || '');
                        setPatientMrn(order.patient?.mrn || order.mrn || '');
                        setPatientAddress(order.patient?.address || '');
                        setPatientType(order.patient?.patientType || order.patientType || '');

                        const meds = (order.medicines || []).map((m: any) => ({ ...m, processed: false }));
                        setPrescribedMedicines(meds);

                        if (meds.length === 0) {
                            toast.error("No medicines found in this order", { id: toastId });
                        } else {
                            toast.success(`Loaded ${meds.length} medicines from prescription`, { id: toastId });
                            hasLoadedPrescription.current = true;
                        }
                    } else {
                        // Only error if we really couldn't find an order structure
                        console.error("Invalid Order Structure:", res);
                        toast.error("Order data structure invalid", { id: toastId });
                        loadedOrderRef.current = null; // Allow retry if failed invalid structure
                    }
                } catch (error) {
                    console.error("Order Fetch Error:", error);
                    toast.error("Failed to load prescription order", { id: toastId });
                    loadedOrderRef.current = null; // Allow retry on error
                }
            };
            fetchOrder();
        }
    }, [orderId]);

    // --- PERSISTENCE LOGIC ---
    // 1. Load draft on mount
    useEffect(() => {
        const loadDraft = async () => {
            const savedDraft = localStorage.getItem('pharmacy_billing_draft');

            // If there's an orderId in URL, we wait for the order fetch logic unless the draft matches
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);

                    // If draft matches the order, or there is NO order, load the draft
                    if (!orderId || (orderId && draft.orderId === orderId)) {
                        setPatientName(draft.patientName || '');
                        setMobileNumber(draft.mobileNumber || '');
                        setDoctorName(draft.doctorName || '');
                        setPatientMrn(draft.patientMrn || '');
                        setPatientAddress(draft.patientAddress || '');
                        if (draft.patientType) setPatientType(draft.patientType);
                        setCart(draft.cart || []);
                        setPaymentMode(draft.paymentMode || 'Cash');
                        setMixedPayments(draft.mixedPayments || { cash: 0, card: 0, upi: 0 });
                        setStatus(draft.status || 'Paid');
                        setDiscount(draft.discount || 0);
                        setDiscountType(draft.discountType || '%');
                        setPrescribedMedicines(draft.prescribedMedicines || []);
                    }
                } catch (err) {
                    console.error("Failed to load bill draft", err);
                }
            }

            // If we are coming from a prescription and have no matching draft, 
            // the fetchOrder hook will populate the state. 
            // We set isInitialized to true to start tracking changes.
            setIsInitialized(true);
        };

        loadDraft();
    }, [orderId]);

    // 2. Save draft on changes - ONLY after initialization
    useEffect(() => {
        if (!isInitialized) return;

        const draft = {
            patientName,
            mobileNumber,
            doctorName,
            patientMrn,
            patientAddress,
            patientType,
            cart,
            paymentMode,
            mixedPayments,
            status,
            discount,
            discountType,
            prescribedMedicines,
            orderId: orderId || undefined
        };
        localStorage.setItem('pharmacy_billing_draft', JSON.stringify(draft));
    }, [isInitialized, patientName, mobileNumber, doctorName, patientMrn, patientAddress, patientType, cart, paymentMode, mixedPayments, status, discount, discountType, prescribedMedicines, orderId]);

    const clearDraft = () => {
        setIsInitialized(false);
        localStorage.removeItem('pharmacy_billing_draft');
    };
    // --- END PERSISTENCE ---

    const handleClear = () => {
        setPatientName('');
        setMobileNumber('');
        setDoctorName('');
        setPatientType('');
        setPatientMrn('');
        setPatientAddress('');
        setSearchTerm('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setPrice(0);
        setCart([]);
        setSubstitutes([]);
        setOutOfStockProduct(null);
        setPaymentMode('Cash');
        setMixedPayments({ cash: 0, card: 0, upi: 0 });
        setStatus('Paid');
        setDiscount(0);
        setDiscountType('%');
        setPaidAmount(0);
        clearDraft();
    };

    const filteredPatients = patientName.length > 0
        ? recentPatients.filter(p => p.name.toLowerCase().includes(patientName.toLowerCase())).slice(0, 5)
        : [];

    // MRP stored in products is GST-INCLUSIVE.
    // subtotalMRP = sum of (qty × MRP per unit) — the gross amount before any discount.
    const subtotalMRP = cart.reduce((sum, item: any) => sum + (item.total || 0), 0);

    // Apply discount to the MRP total
    const totalDiscount = discountType === '%' ? (subtotalMRP * discount / 100) : discount;
    const grandTotal = Math.max(0, subtotalMRP - totalDiscount);

    // Extract GST from the discounted MRP total (GST is INSIDE the price, not added on top)
    // For each item: GST share = itemWeight × totalDiscount, then extract GST from net MRP.
    const taxGST = cart.reduce((sum, item: any) => {
        const itemMRP = item.total || 0;
        const itemWeight = itemMRP / (subtotalMRP || 1);
        const itemDiscount = totalDiscount * itemWeight;
        const itemNetMRP = itemMRP - itemDiscount; // discounted MRP (still GST-inclusive)
        const gstPct = item.gstPct || item.gst || 0;
        // GST extracted = NetMRP - (NetMRP / (1 + gst%))  i.e. the tax portion inside MRP
        const itemTax = itemNetMRP - (itemNetMRP / (1 + gstPct / 100));
        return sum + itemTax;
    }, 0);

    // taxableAmount = base price (excluding GST) = grandTotal - extracted GST
    const taxableAmount = Math.max(0, grandTotal - taxGST);

    useEffect(() => {
        const roundedTotal = Math.round(grandTotal);
        setPaidAmount(roundedTotal);
        if (paymentMode === 'Mixed') {
            setMixedPayments({ cash: roundedTotal, card: 0, upi: 0 });
        }
    }, [grandTotal, paymentMode]);

    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                const results = await ProductService.getProducts({ search: searchTerm });
                const adjustedResults = (results || []).map((p: any) => {
                    const unitsPerPack = p.unitsPerPack || 1;
                    const availableUnits = p.currentStock * unitsPerPack;
                    const cartItem = cart.find((item: any) => item.drug === p._id || item.productId === p._id);
                    return cartItem ? { ...p, availableUnits: availableUnits - cartItem.qty } : { ...p, availableUnits };
                });

                // Prioritize results starting with searchTerm
                const q = searchTerm.toLowerCase();
                const sortedResults = [...adjustedResults].sort((a, b) => {
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
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, cart]);

    const handleSelectProduct = async (product: any) => {
        if ((product.availableUnits || 0) <= 0) {
            setOutOfStockProduct(product);
            setSearchTerm(product.brandName);
            setSearchResults([]);
            
            // Fetch substitutes
            try {
                setIsFetchingSubstitutes(true);
                const alts = await pharmacyService.getGenericSubstitutes(product._id);
                setSubstitutes(alts as any);
            } catch (err) {
                console.error("Failed to fetch substitutes", err);
                toast.error("Failed to load generic alternatives");
            } finally {
                setIsFetchingSubstitutes(false);
            }
            return;
        }

        setSelectedProduct(product);
        setSearchTerm(product.brandName);
        const unitsPerPack = product.unitsPerPack || 1;
        setPrice(Math.round((product.mrp / unitsPerPack) * 100) / 100);
        setSearchResults([]);
        setOutOfStockProduct(null);
        setSubstitutes([]);
    };


    const handleAddItem = () => {
        if (!selectedProduct) {
            toast.error('Please select a product');
            return;
        }

        const safeQty = Number(quantity) || 0;
        const safePrice = Number(price) || 0;

        if (safeQty <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        if (safeQty > (selectedProduct as any).availableUnits) {
            toast.error(`Only ${(selectedProduct as any).availableUnits} units available in stock`);
            return;
        }


        // safePrice is the per-unit MRP (GST-inclusive). total = qty × MRP.
        const total = safeQty * safePrice;
        const gstPct = selectedProduct.gst || 0;
        // Extract base price and GST per unit from the GST-inclusive MRP
        const basePerUnit = safePrice / (1 + gstPct / 100);
        const gstPerUnit = safePrice - basePerUnit;

        const newItem: BillItem = {
            drug: selectedProduct._id,
            productId: selectedProduct._id,
            productName: `${selectedProduct.brandName} ${selectedProduct.strength} ${selectedProduct.form}`,
            itemName: `${selectedProduct.brandName} ${selectedProduct.strength} ${selectedProduct.form}`,
            qty: safeQty,
            unitRate: safePrice,   // MRP per unit (GST-inclusive)
            rate: safePrice,        // MRP per unit (GST-inclusive) — used for total
            mrp: safePrice,         // explicit MRP field for print receipt
            hsn: selectedProduct.hsnCode,
            gstPct,
            amount: total,          // qty × MRP (GST-inclusive)
            total: total,           // same — GST is extracted at summary level, not added
            batch: selectedProduct.batchNumber,
            expiry: selectedProduct.expiryDate
        } as any;

        setCart([...cart, newItem]);

        // If we were processing a prescribed medicine, mark it as done
        if (processingMedIndex !== null) {
            setPrescribedMedicines(prev => prev.map((m, idx) => idx === processingMedIndex ? { ...m, processed: true } : m));
            setProcessingMedIndex(null);
        }

        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity(1);
        setPrice(0);
        setOutOfStockProduct(null);
        setSubstitutes([]);
    };

    const removeItem = (index: number) => {
        const itemToRemove = cart[index];
        const updatedSearchResults = searchResults.map(p =>
            p._id === itemToRemove.productId || p._id === itemToRemove.drug ? { ...p, currentStock: p.currentStock + itemToRemove.qty } : p
        );
        setSearchResults(updatedSearchResults);
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleSaveAndPrint = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        if (!patientName || !mobileNumber) {
            toast.error('Please enter patient details');
            return;
        }

        if (paymentMode === 'Mixed') {
            const totalMixed = Number(mixedPayments.cash) + Number(mixedPayments.card) + Number(mixedPayments.upi);
            if (Math.abs(totalMixed - Math.round(grandTotal)) > 1) {
                toast.error(`Mixed payments (₹${totalMixed}) must match Grand Total (₹${Math.round(grandTotal)})`);
                return;
            }
        }

        setIsGenerating(true);
        try {
            const payload: any = {
                patientName,
                customerPhone: mobileNumber,
                patientAddress: patientAddress || undefined,
                mrn: patientMrn || undefined,
                patientType: patientType || undefined,
                doctorName: doctorName || 'Self / Walk-in',
                items: cart,
                mode: paymentMode.toUpperCase(),
                status: status.toUpperCase(),
                paymentSummary: {
                    subtotal: Number(subtotalMRP) || 0,
                    taxableAmount: Number(taxableAmount) || 0,
                    taxGST: Number(taxGST) || 0,
                    discount: Number(totalDiscount) || 0,
                    grandTotal: Number(Math.round(grandTotal)) || 0,
                    paidAmount: Number(paidAmount) || 0,
                    balanceDue: status === 'Paid' ? 0 : Math.round(grandTotal) - paidAmount,
                    paymentMode: paymentMode.toUpperCase()
                },
                orderId: orderId || undefined
            };

            // If it's a specific payment mode, helper fields for backend legacy/stats
            if (paymentMode.toUpperCase() === 'CASH') payload.paymentDetails = { cash: Math.round(grandTotal), card: 0, upi: 0 };
            if (paymentMode.toUpperCase() === 'CARD') payload.paymentDetails = { cash: 0, card: Math.round(grandTotal), upi: 0 };
            if (paymentMode.toUpperCase() === 'UPI') payload.paymentDetails = { cash: 0, card: 0, upi: Math.round(grandTotal) };
            if (paymentMode.toUpperCase() === 'MIXED') payload.paymentDetails = mixedPayments;


            const res = await PharmacyBillingService.createBill(payload);
            toast.success('Invoice generated successfully');
            clearDraft();
            router.push(getPath(`/pharmacy/billing/preview/${res.bill._id}?print=true`));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to generate invoice');
        } finally {
            setIsGenerating(false);
        }
    };

    const shopDetails: ShopDetails = {
        name: (user as any)?.shopName || user?.name || 'Pharmacy Store',
        address: (user as any)?.address || 'No Address Provided',
        phone: (user as any)?.mobile || (user as any)?.phone || '-',
        email: (user as any)?.email || '-',
        gstin: (user as any)?.gstin || '-',
        dlNo: (user as any)?.licenseNo || '',
        logo: (user as any)?.image || (user as any)?.logo || (user as any)?.avatar || (user as any)?.profilePic,
        pharmacyTerms: user?.pharmacyTerms || []
    };

    const handlePreview = () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (!patientName || !mobileNumber) return toast.error('Please enter patient details');

        // Generate a realistic-looking preview invoice number (not saved to DB)
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const previewInvoiceId = `PRV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        const bill: PharmacyBill = {
            _id: 'PREVIEW',
            invoiceId: previewInvoiceId,
            items: cart,
            patientName,
            customerPhone: mobileNumber,
            mrn: patientMrn || undefined,
            patientType: patientType || undefined,
            patientAddress: patientAddress || undefined,
            doctorName: doctorName || 'Self / Walk-in',
            paymentSummary: {
                subtotal: Number(subtotalMRP) || 0,
                taxableAmount: Number(taxableAmount) || 0,
                taxGST: Number(taxGST) || 0,
                discount: Number(totalDiscount) || 0,
                grandTotal: Number(Math.round(grandTotal)) || 0,
                paidAmount: Number(paidAmount) || 0,
                balanceDue: status === 'Paid' ? 0 : Math.round(grandTotal) - paidAmount,
                paymentMode: paymentMode.toUpperCase() as any,
                status: status.toUpperCase() as any,
                paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined
            },
            createdAt: new Date().toISOString() as any,
            updatedAt: new Date().toISOString() as any,
            pharmacyId: (user as any)?._id || 'PREVIEW_PHARMACY'
        };

        setTempBill(bill);
        setIsPreviewOpen(true);
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        setTempBill(null);
    };

    return (
        <div className="space-y-4 md:space-y-6 lg:space-y-8 text-gray-900 dark:text-white pb-20 pt-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 text-black dark:text-white px-1">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold tracking-tight">Billing & POS</h1>
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">Invoices & Sales Management</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                        onClick={handleClear}
                        className="px-3 py-1.5 md:px-5 md:py-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl md:rounded-2xl border border-rose-100 dark:border-rose-800/30 flex items-center gap-2 text-[10px] md:text-xs font-bold text-rose-600 hover:bg-rose-100 uppercase tracking-wider transition-colors"
                    >
                        <Trash2 size={14} className="md:w-4 md:h-4" />
                        Clear Form
                    </button>
                    <div className="px-3 py-1.5 md:px-5 md:py-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl md:rounded-2xl border border-teal-100 dark:border-teal-800/30 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-teal-500" />
                        <span className="text-[10px] md:text-xs font-bold text-teal-600 uppercase tracking-wider">Active Device</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
                <div className="xl:col-span-2 space-y-4 md:space-y-8">
                    {/* Patient Context */}
                    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl md:rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                            <div className="p-2 md:p-3 bg-teal-50 text-teal-600 rounded-xl md:rounded-2xl">
                                <User size={18} className="md:w-5 md:h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Details</p>
                                <h2 className="text-base md:text-lg font-bold uppercase tracking-tight">Patient Information</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 flex justify-between items-center">
                                    <span>Patient Name</span>
                                    {searchingPatients && <Loader2 size={12} className="animate-spin text-teal-600" />}
                                </label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                    value={patientName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                                            setPatientName(val);
                                            handlePatientNameSearch(val);
                                        }
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => {
                                        setShowSuggestions(true);
                                        if (patientName) handlePatientNameSearch(patientName);
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Enter name..."
                                    autoComplete="off"
                                />
                                {showSuggestions && (hospitalPatients.length > 0 || filteredPatients.length > 0) && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                        {(() => {
                                            // Deduplicate suggestions by mobile number
                                            const combined: Array<{ name: string; phone: string; source: string; mrn?: string; patientType?: string; doctorName?: string; address?: string }> = [];
                                            hospitalPatients.forEach(p => {
                                                combined.push({ name: p.name, phone: p.mobile, source: 'Hospital', mrn: p.mrn, patientType: p.patientType, doctorName: p.doctorName, address: p.address });
                                            });
                                            filteredPatients.forEach(p => {
                                                if (!combined.some(c => c.phone === p.phone)) {
                                                    combined.push({ name: p.name, phone: p.phone, source: 'Recent' });
                                                }
                                            });

                                            return combined.map((p, i) => (
                                                <div
                                                    key={`${p.phone}-${i}`}
                                                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-none flex justify-between items-center transition-colors"
                                                    onClick={() => {
                                                        setPatientName(p.name);
                                                        setMobileNumber(p.phone);
                                                        if (p.mrn && p.mrn !== 'N/A') setPatientMrn(p.mrn);
                                                        else setPatientMrn('');
                                                        if (p.doctorName) setDoctorName(p.doctorName);
                                                        if (p.patientType) setPatientType(p.patientType as any);
                                                        if (p.address) setPatientAddress(p.address);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-xs uppercase tracking-tight text-gray-900 dark:text-white">{p.name}</p>
                                                            {p.mrn && p.mrn !== 'N/A' && (
                                                                <span className="text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                                    MRN: {p.mrn}
                                                                </span>
                                                            )}
                                                            {p.patientType && (
                                                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                                                    p.patientType === 'IPD'
                                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                                                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                                                                }`}>
                                                                    {p.patientType}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-semibold text-gray-400 mt-0.5">{p.phone}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                        p.source === 'Hospital' 
                                                            ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400' 
                                                            : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400'
                                                    }`}>
                                                        {p.source}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Mobile Number</label>
                                <input
                                    className={`w-full bg-gray-50 dark:bg-gray-700/50 border rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 ${isMobileTouched && mobileNumber.length > 0 && mobileNumber.length < 10 ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:ring-teal-500'}`}
                                    value={mobileNumber}
                                    onChange={e => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    onBlur={() => setIsMobileTouched(true)}
                                    placeholder="10 digits..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">MRN Number</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                    value={patientMrn}
                                    onChange={e => setPatientMrn(e.target.value)}
                                    placeholder="e.g. MRN-12345"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Doctor Name</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                    value={doctorName}
                                    onChange={e => setDoctorName(e.target.value)}
                                    placeholder="Self / Walk-in"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Patient Type</label>
                                <div className="flex gap-2">
                                    {['IPD', 'OPD'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setPatientType(type as any)}
                                            className={`flex-1 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                                patientType === type
                                                    ? type === 'IPD'
                                                        ? 'bg-rose-500 text-white border-rose-500'
                                                        : 'bg-blue-500 text-white border-blue-500'
                                                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 border-transparent hover:border-gray-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Address</label>
                                <input
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                    value={patientAddress}
                                    onChange={e => setPatientAddress(e.target.value)}
                                    placeholder="Patient address..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Prescription Conversion */}
                    {prescribedMedicines.length > 0 && (
                        <div className="bg-teal-50 dark:bg-teal-950/20 p-6 md:p-8 rounded-3xl border border-teal-100 dark:border-teal-900/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white dark:bg-gray-800 text-teal-600 rounded-2xl">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-teal-500 uppercase tracking-wider">Prescription Order</p>
                                    <h2 className="text-lg font-bold text-teal-900 dark:text-teal-100 uppercase tracking-tight">Prescribed List</h2>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {prescribedMedicines.map((med: any, i) => (
                                    <div key={`${med.name}-${i}`} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-teal-100 dark:border-gray-700">
                                        <div>
                                            <p className="font-bold text-xs text-teal-900 dark:text-teal-300">{med.name}</p>
                                            <p className="text-xs text-gray-400 font-medium">{med.dosage} • {med.quantity} Units</p>
                                        </div>
                                        <button
                                            disabled={med.processed}
                                            onClick={() => {
                                                setSearchTerm(med.name.split(' (')[0]);
                                                setQuantity(Number(med.quantity) || 1);
                                                setProcessingMedIndex(i);
                                            }}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${med.processed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (processingMedIndex === i ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95')}`}
                                        >
                                            {med.processed ? 'Processed' : (processingMedIndex === i ? 'Filling...' : 'Process')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entry Section */}
                    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl md:rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                            <div className="p-2 md:p-3 bg-teal-50 text-teal-600 rounded-xl md:rounded-2xl">
                                <Plus size={18} className="md:w-5 md:h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Entry Mode</p>
                                <h2 className="text-base md:text-lg font-bold uppercase tracking-tight">Add Medicine</h2>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="relative">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block px-1">Search Medicine</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-12 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500" placeholder="Type medicine name..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedProduct(null); setOutOfStockProduct(null); setSubstitutes([]); }} />
                                </div>
                                {searchTerm.length >= 2 && searchResults.length === 0 && !selectedProduct && !outOfStockProduct && !isSearching && (
                                    <p className="text-xs font-black text-rose-500  tracking-widest mt-3 px-1.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <AlertCircle size={12} className="shrink-0" />
                                        Medicine not indexed. Please select an alternate formulation.
                                    </p>
                                )}
                                {searchResults && searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                                        {searchResults.map(product => (
                                            <div key={product._id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center border-b dark:border-gray-700 last:border-none" onClick={() => handleSelectProduct(product)}>
                                                <div className="flex-1 pr-4">
                                                    <p className="font-bold text-xs uppercase tracking-tight">{product.brandName}</p>
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider line-clamp-1">{product.genericName} • {product.strength}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-bold text-xs text-teal-600">₹{product.mrp}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available: {(product as any).availableUnits} Units</p>
                                                    <p className="text-[9px] font-bold text-indigo-500">₹{Math.round(product.mrp / ((product as any).unitsPerPack || 1)).toLocaleString()} / unit</p>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}
                                {outOfStockProduct && (
                                    <div className="mt-4 p-4 md:p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="w-5 h-5 text-rose-500" />
                                                <div>
                                                    <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100 uppercase tracking-tight">{outOfStockProduct.brandName} is Out of Stock</h3>
                                                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 uppercase tracking-wider">{outOfStockProduct.genericName}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => { setOutOfStockProduct(null); setSearchTerm(''); }}
                                                className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider px-2 py-1"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        
                                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-rose-100/50 dark:border-rose-900/10">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Available Generic Substitutes</p>
                                            
                                            {isFetchingSubstitutes ? (
                                                <div className="flex items-center gap-2 text-teal-600 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span className="text-xs font-bold uppercase">Finding substitutes...</span>
                                                </div>
                                            ) : substitutes.length > 0 ? (
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                    {substitutes.map(sub => (
                                                        <div key={sub._id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer border border-transparent hover:border-teal-100 dark:hover:border-teal-800 transition-all active:scale-[0.98]" onClick={() => {
                                                            setSelectedProduct(sub);
                                                            setSearchTerm(sub.brandName);
                                                            const unitsPerPack = (sub as any).unitsPerPack || 1;
                                                            setPrice(Math.round((sub.mrp / unitsPerPack) * 100) / 100);
                                                            setOutOfStockProduct(null);
                                                            setSubstitutes([]);
                                                        }}>
                                                            <div>
                                                                <p className="font-bold text-xs uppercase text-gray-900 dark:text-white">{sub.brandName}</p>
                                                                <p className="text-[10px] font-semibold text-gray-500 mt-0.5 uppercase">{sub.strength} • {sub.form}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-xs text-teal-600">₹{sub.mrp}</p>
                                                                <p className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded uppercase tracking-widest inline-block mt-1">{(sub as any).availableUnits || sub.currentStock} In Stock</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs font-semibold text-gray-400 uppercase py-2">No substitutes found in stock.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Quantity</label>
                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[12px]">₹</span>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.01" className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl pl-10 pr-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500" value={price || ''} onChange={e => setPrice(Math.round(Math.max(0, Number(e.target.value)) * 100) / 100)} />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button className="w-full bg-teal-600 text-white rounded-2xl py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-teal-700 active:scale-95" onClick={handleAddItem}>
                                        <Plus className="w-5 h-5 font-bold" /> Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-black/10 px-8 py-5 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={18} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Cart</span>
                            </div>
                            <span className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-xs font-bold text-gray-500 uppercase border border-gray-100 dark:border-gray-600">{cart.length} items</span>
                        </div>
                        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider border-b dark:border-gray-700">
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-left">No.</th>
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-left">Medicine Name</th>
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-center">Qty</th>
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-right">Price</th>
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-right">Total</th>
                                        <th className="px-4 md:px-8 py-3 md:py-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700/50">
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <ShoppingCart className="w-12 h-12 opacity-10" />
                                                    <p className="text-xs font-bold uppercase tracking-wider">No items in cart</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map((item, index) => (
                                            <tr key={`${item.productId}-${index}`} className="text-xs hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                <td className="px-8 py-5 font-bold text-gray-400">{(index + 1).toString().padStart(2, '0')}</td>
                                                <td className="px-8 py-5 font-bold uppercase tracking-tight line-clamp-1">{item.itemName}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className="w-16 bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-2 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-teal-500" value={item.qty} onChange={e => {
                                                        const newQty = Math.max(1, Number(e.target.value));
                                                        const newTotal = newQty * ((item as any).rate || 0); // rate = MRP per unit (GST-inclusive)
                                                        const newCart = [...cart];
                                                        newCart[index] = { ...item, qty: newQty, total: newTotal, amount: newTotal };
                                                        setCart(newCart);
                                                    }} />
                                                </td>
                                                <td className="px-8 py-5 text-right font-semibold text-gray-500">₹{Math.round(item.rate || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right font-bold text-teal-600 text-sm">₹{Math.round(item.total || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <button className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="space-y-4 md:space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Summary</p>
                                <h2 className="text-lg font-bold uppercase tracking-tight">Final Details</h2>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Cash', 'UPI', 'Card', 'Mixed'].map(mode => (
                                    <button key={mode} onClick={() => setPaymentMode(mode as any)} className={`py-3 rounded-2xl text-xs font-bold border ${paymentMode === mode ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-none'}`}>{mode.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>

                        {paymentMode === 'Mixed' && (
                            <div className="space-y-4 p-5 bg-gray-50 dark:bg-black/20 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">Payment Split</p>
                                {['CASH', 'CARD', 'UPI'].map(type => (
                                    <div key={type} className="flex justify-between items-center gap-4">
                                        <span className="text-xs font-bold text-gray-500 w-12">{type}</span>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} className="w-full bg-white dark:bg-gray-700 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500" value={mixedPayments[type.toLowerCase() as keyof typeof mixedPayments] || ''} onChange={e => {
                                            const val = Math.max(0, Number(e.target.value));
                                            setMixedPayments({ ...mixedPayments, [type.toLowerCase()]: val });
                                        }} />
                                    </div>
                                ))}
                                <div className="pt-3 border-t dark:border-gray-700 flex justify-between text-xs font-bold uppercase">
                                    <span className="text-gray-400">Split Total:</span>
                                    <span className={Math.abs(mixedPayments.cash + mixedPayments.card + mixedPayments.upi - Math.round(grandTotal)) > 2 ? 'text-red-500' : 'text-teal-500'}>₹{mixedPayments.cash + mixedPayments.card + mixedPayments.upi} / {Math.round(grandTotal)}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Status</label>
                                <select className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none" value={status} onChange={e => setStatus(e.target.value as any)}>
                                    <option>Paid</option>
                                    <option>Partial</option>
                                    <option>Due</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Discount</label>
                                <div className="flex bg-gray-50 dark:bg-gray-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                                    <input className="w-full bg-transparent border-none px-4 py-3 text-xs font-bold outline-none" type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} placeholder="0" value={discount || ''} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} />
                                    <select className="bg-gray-100 dark:bg-gray-600 border-none px-2 text-xs font-bold outline-none" value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                                        <option>%</option>
                                        <option>₹</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Paid Amount</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-teal-600 font-bold text-lg">₹</span>
                                <input className="w-full bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-3xl pl-11 pr-5 py-5 text-2xl font-bold text-teal-600 outline-none focus:ring-2 focus:ring-teal-500" type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={paidAmount || ''} onChange={e => setPaidAmount(Math.max(0, Number(e.target.value)))} />
                            </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-dashed dark:border-gray-700">
                            {/* MRP Total (GST-inclusive) */}
                            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <span>MRP Total</span>
                                <span className="text-gray-900 dark:text-white">₹{subtotalMRP.toFixed(2)}</span>
                            </div>
                            {/* Discount on MRP */}
                            {totalDiscount > 0 && (
                                <div className="flex justify-between items-center text-xs font-bold text-red-400 uppercase tracking-wider">
                                    <span>Discount</span>
                                    <span>− ₹{totalDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {/* Taxable base (extracted from discounted MRP) */}
                            <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>Base Price (excl. GST)</span>
                                <span>₹{taxableAmount.toFixed(2)}</span>
                            </div>
                            {/* GST extracted — already inside MRP */}
                            <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>GST (incl. in MRP)</span>
                                <span>₹{taxGST.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-1 py-4 border-y border-dashed border-teal-100 dark:border-gray-700 mt-2">
                                <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">Total Amount</span>
                                <div className="flex items-center justify-between">
                                    <Calculator size={24} className="text-teal-200" />
                                    <span className="text-3xl md:text-4xl font-bold tracking-tighter">₹{Math.round(grandTotal).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button className="w-full bg-teal-600 text-white py-4 md:py-5 rounded-3xl font-bold uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 hover:bg-teal-700" disabled={isGenerating} onClick={handleSaveAndPrint}>
                                <Printer size={18} />
                                {isGenerating ? 'Generating...' : 'Save & Print'}
                            </button>
                            <button className="w-full bg-teal-50 text-teal-600 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs border border-teal-100 hover:bg-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30 flex items-center justify-center gap-2" disabled={isGenerating || cart.length === 0} onClick={handlePreview}>
                                <Eye size={18} />
                                Preview Bill
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-auto relative">
                        <div className="sticky top-0 bg-white border-b z-10 p-4 flex justify-between items-center text-black">
                            <h3 className="font-bold uppercase tracking-wider text-sm">Invoice Preview</h3>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all select-none">
                                    <input
                                        type="checkbox"
                                        checked={printWithHeader}
                                        onChange={(e) => setPrintWithHeader(e.target.checked)}
                                        className="cursor-pointer w-3.5 h-3.5 accent-teal-600"
                                    />
                                    <span>Header & Footer</span>
                                </label>
                                <button onClick={closePreview} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold uppercase text-black">Close</button>
                                <button onClick={handleSaveAndPrint} disabled={isGenerating} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50">
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Printer size={14} /> Print Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="p-1 md:p-8 flex justify-start md:justify-center bg-gray-50 overflow-x-auto">
                            <div className="min-w-fit bg-white shadow-lg">
                                {tempBill && <PharmacyBillPrint billData={tempBill as PharmacyBill} shopDetails={shopDetails} />}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPage;
