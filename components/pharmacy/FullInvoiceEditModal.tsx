"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  CreditCard,
  User,
  Package,
  Plus,
  Trash2,
  Save,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  Calendar,
  Clock,
  Sparkles,
  Pill,
  Eye,
  ZoomIn
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ProductService } from "@/lib/integrations/services/product.service";
import { doctorService } from "@/lib/integrations/services/doctor.service";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { cleanHonorificPrefix, getHospitalHonorificItems } from "@/lib/utils/name-utils";
import { clearApiCache } from "@/lib/integrations/api/apiClient";

interface FullInvoiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  hospitalId: string;
  onSuccess: (updatedBill?: any) => void;
}

export default function FullInvoiceEditModal({
  isOpen,
  onClose,
  bill,
  hospitalId,
  onSuccess,
}: FullInvoiceEditModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // 12-Hour AM/PM Date & Time states
  const [billDateOnly, setBillDateOnly] = useState<string>("");
  const [billHour12, setBillHour12] = useState<string>("12");
  const [billMinute, setBillMinute] = useState<string>("00");
  const [billAmPm, setBillAmPm] = useState<"AM" | "PM">("AM");

  // Image Preview Modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [honorific, setHonorific] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [mrn, setMrn] = useState("");
  const [patientType, setPatientType] = useState("OPD");

  // Payment states
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [balanceDue, setBalanceDue] = useState<number>(0);

  // Mixed Payments Breakdown state
  const [mixedPayments, setMixedPayments] = useState<{ cash: number; upi: number; card: number }>({
    cash: 0,
    upi: 0,
    card: 0,
  });

  // Medicines line items state
  const [items, setItems] = useState<Array<{
    drug?: string;
    batch?: string;
    productName: string;
    batchNo: string;
    expiryDate?: string;
    qty: number;
    unitRate: number;
    mrp: number;
    amount: number;
    image?: string;
    strength?: string;
    form?: string;
    unitsPerPack?: number;
  }>>([]);

  // Top Medicine Live Search states
  const [medSearchQuery, setMedSearchQuery] = useState("");
  const [medSearchResults, setMedSearchResults] = useState<any[]>([]);
  const [searchingMeds, setSearchingMeds] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medSearchQueryRef = useRef<string>("");

  // Table Row Medicine Autocomplete states
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [rowSearchResults, setRowSearchResults] = useState<any[]>([]);
  const [rowSearching, setRowSearching] = useState(false);
  const rowSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRowQueryRef = useRef<string>("");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper: compute ISO 8601 string from Date + 12-hour AM/PM values
  const getComputedIsoDate = () => {
    if (!billDateOnly) return new Date().toISOString();
    let h24 = Number(billHour12) || 12;
    if (billAmPm === "PM" && h24 < 12) h24 += 12;
    if (billAmPm === "AM" && h24 === 12) h24 = 0;
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoLocal = `${billDateOnly}T${pad(h24)}:${pad(Number(billMinute) || 0)}:00`;
    const parsed = new Date(isoLocal);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  // Close table row dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableContainerRef.current && !tableContainerRef.current.contains(e.target as Node)) {
        setActiveRowIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load existing bill data when modal opens
  useEffect(() => {
    if (bill && isOpen) {
      const initialDate = bill.createdAt || bill.date || bill.invoiceDate || (bill as any).issuedAt || new Date().toISOString();
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setBillDateOnly(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        const rawH = d.getHours();
        setBillAmPm(rawH >= 12 ? "PM" : "AM");
        const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
        setBillHour12(pad(h12));
        setBillMinute(pad(d.getMinutes()));
      }

      setPatientName(bill.patientName || bill.patientDetails?.name || "");
      setHonorific(cleanHonorificPrefix(bill.honorific || bill.patientDetails?.honorific || ""));
      setCustomerPhone(bill.customerPhone && bill.customerPhone !== "-" ? bill.customerPhone : "");
      setPatientAddress(bill.patientAddress || "");
      setDoctorName(bill.doctorName && bill.doctorName !== "-" ? bill.doctorName : "");
      setMrn(bill.mrn && bill.mrn !== "N/A" ? bill.mrn : "");
      setPatientType(bill.isIPD || (bill.patientType && bill.patientType.toUpperCase().includes("IPD")) ? "IPD" : (bill.isWalkIn ? "Walk-in" : "OPD"));

      const modeVal = (bill.paymentSummary?.paymentMode || bill.mode || "CASH").toUpperCase();
      setPaymentMode(modeVal);

      const statusVal = (bill.paymentSummary?.status || bill.status || "PAID").toUpperCase();
      setPaymentStatus(statusVal === "CHARGED TO IPD" ? "CHARGED TO IPD" : (statusVal === "PAID" ? "PAID" : "PENDING"));

      const grandTotal = Math.round(Number(bill.paymentSummary?.grandTotal ?? bill.netPayable ?? 0) * 100) / 100;
      const paidVal = Math.round(Number(bill.paymentSummary?.paidAmount ?? bill.paid ?? (statusVal === "PAID" ? grandTotal : 0)) * 100) / 100;
      setPaidAmount(paidVal);
      setBalanceDue(Math.round(Math.max(0, grandTotal - paidVal) * 100) / 100);

      // Mixed payments split
      const pd = bill.paymentSummary?.paymentDetails || (bill as any).paymentDetails || {};
      setMixedPayments({
        cash: Math.round(Number(pd.cash || (modeVal === "MIXED" ? paidVal : 0)) * 100) / 100,
        upi: Math.round(Number(pd.upi || 0) * 100) / 100,
        card: Math.round(Number(pd.card || 0) * 100) / 100,
      });

      // Items - extract medicine name correctly and ensure per-tablet/unit MRP & rate
      const billItems = (bill.items || []).map((it: any) => {
        const qty = Number(it.qty ?? it.issuedQty ?? it.quantity ?? 1);
        const rawRate = Number(it.unitRate ?? it.rate ?? it.unitPrice ?? 0);
        const unitsPerPack = Math.max(1, Number(it.unitsPerPack || it.product?.unitsPerPack || 1));
        let rawMrp = Number(it.mrp ?? rawRate);
        if (unitsPerPack > 1 && rawMrp > rawRate * 1.5) {
          rawMrp = Math.round((rawMrp / unitsPerPack) * 100) / 100;
        } else if (rawRate > 0 && rawMrp > rawRate * 2) {
          rawMrp = rawRate;
        }
        const unitRate = Math.round((rawRate || rawMrp) * 100) / 100;
        const mrp = Math.round((rawMrp || unitRate) * 100) / 100;
        const rawAmt = Number(it.amount ?? it.total ?? (qty * unitRate));
        const amount = Math.round(rawAmt * 100) / 100;
        const isMongoId = (val?: any) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
        const resolvedBatch = isMongoId(it.batch) ? it.batch : (isMongoId(it.batchId) ? it.batchId : (typeof it.batch === "object" ? it.batch?._id : undefined));

        return {
          drug: it.drug || it.productId || it.product || it._id || "",
          batch: resolvedBatch,
          productName: it.itemName || it.productName || it.name || it.medicineName || it.brand || it.brandName || "",
          batchNo: it.batchNo || (typeof it.batch === "string" ? it.batch : it.batch?.batchNo) || it.batchNumber || "",
          expiryDate: it.expiryDate || it.expiry || it.expDate || "",
          qty,
          unitRate,
          mrp,
          amount,
          image: it.image || it.product?.image || (Array.isArray(it.product?.images) && it.product?.images[0]) || "",
          strength: it.strength || it.product?.strength || "",
          form: it.form || it.product?.form || it.formFactor || "",
          unitsPerPack,
        };
      });
      setItems(billItems);
      setMedSearchQuery("");
      setMedSearchResults([]);
      setShowMedDropdown(false);
      setActiveRowIndex(null);
      setRowSearchResults([]);
    }
  }, [bill, isOpen]);

  // Live calculation of totals
  const subTotal = Math.round(items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0) * 100) / 100;
  const netPayable = Math.round(subTotal);

  // Prevent mouse wheel from changing input values while scrolling
  const preventWheelScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Prevent negative inputs, plus, and scientific notation (e, E, -, +)
  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
    }
  };

  // Recalculate balance when paid amount or items change
  const handlePaidAmountChange = (val: number) => {
    const positiveVal = isNaN(val) ? 0 : Math.round(Math.max(0, val) * 100) / 100;
    setPaidAmount(positiveVal);
    setBalanceDue(Math.round(Math.max(0, netPayable - positiveVal) * 100) / 100);
    if (positiveVal >= netPayable && netPayable > 0) {
      setPaymentStatus("PAID");
    } else if (positiveVal > 0) {
      setPaymentStatus("PENDING");
    }
  };

  // Status toggle handler
  const handleStatusChange = (newStatus: string) => {
    setPaymentStatus(newStatus);
    if (newStatus === "PAID") {
      setPaidAmount(netPayable);
      setBalanceDue(0);
      if (paymentMode === "MIXED") {
        setMixedPayments(prev => ({
          ...prev,
          cash: netPayable - (prev.upi + prev.card)
        }));
      }
    } else if (newStatus === "PENDING" || newStatus === "CHARGED TO IPD") {
      setPaidAmount(0);
      setBalanceDue(netPayable);
    }
  };

  // Mixed Payment Split Breakdown Change
  const handleMixedSplitChange = (field: 'cash' | 'upi' | 'card', value: number) => {
    const val = isNaN(value) ? 0 : Math.max(0, value);
    const updated = { ...mixedPayments, [field]: val };
    setMixedPayments(updated);
    const totalSplit = Math.round((updated.cash + updated.upi + updated.card) * 100) / 100;
    handlePaidAmountChange(totalSplit);
  };

  // Medicine line items modification
  const handleItemQtyChange = (index: number, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setItems(prev => {
      const next = [...prev];
      const item = next[index];
      const newAmount = Math.round(validQty * item.unitRate * 100) / 100;
      next[index] = { ...item, qty: validQty, amount: newAmount };
      return next;
    });
  };

  const handleItemRateChange = (index: number, newRate: number) => {
    const validRate = Math.max(0, newRate);
    setItems(prev => {
      const next = [...prev];
      const item = next[index];
      const newAmount = Math.round(item.qty * validRate * 100) / 100;
      next[index] = { ...item, unitRate: validRate, mrp: validRate, amount: newAmount };
      return next;
    });
  };

  const handleItemNameChange = (index: number, newName: string) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], productName: newName };
      return next;
    });
  };

  const handleItemBatchChange = (index: number, newBatch: string) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], batchNo: newBatch };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Invoice must have at least one medicine");
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
    if (activeRowIndex === index) {
      setActiveRowIndex(null);
    }
  };

  // Add a new blank medicine line item row
  const handleAddEmptyLineItem = () => {
    const newIndex = items.length;
    setItems(prev => [
      ...prev,
      {
        drug: "",
        productName: "",
        batchNo: "",
        expiryDate: "",
        qty: 1,
        unitRate: 0,
        mrp: 0,
        amount: 0,
        image: "",
      }
    ]);
    setActiveRowIndex(newIndex);
    setRowSearchResults([]);
  };

  // Core medicine search helper with debouncing and multi-service search
  const executeMedicineSearch = async (query: string): Promise<any[]> => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    let products: any[] = [];
    try {
      // 1. Primary search via ProductService (Pharmacy Inventory)
      const res = await ProductService.getProducts({ search: q, limit: 25 });
      if (Array.isArray(res) && res.length > 0) {
        products = res.map((p: any) => {
          const unitsPerPack = Math.max(1, Number(p.unitsPerPack || p.packSize || 1));
          const packMrp = Number(p.mrp ?? p.unitPrice ?? p.unitCost ?? 0);
          const unitRate = unitsPerPack > 1 ? Math.round((packMrp / unitsPerPack) * 100) / 100 : packMrp;
          const strength = p.strength || p.dosage || p.potency || p.dose || "";
          const form = p.formFactor || p.form || "";

          return {
            _id: p._id,
            brandName: p.brandName || p.brand || p.name || "",
            genericName: p.genericName || p.generic || "",
            strength,
            form,
            unitsPerPack,
            packMrp,
            unitRate,
            mrp: unitRate, // Always per tablet / unit price
            currentStock: p.currentStock ?? p.stock ?? 0,
            batchNo: p.batchNo || p.batchNumber || (p.batches && p.batches[0]?.batchNo) || "",
            expiryDate: p.expiryDate || "",
            image: p.image || (Array.isArray(p.images) && p.images[0]) || "",
          };
        });
      }
    } catch (err) {
      console.warn("ProductService search error, trying fallback:", err);
    }

    // 2. Fallback to doctor medicines search if inventory returned few or empty results
    if (products.length < 5) {
      try {
        const docRes: any = await doctorService.searchMedicines(q);
        const docList = docRes?.data || (Array.isArray(docRes) ? docRes : []);
        for (const item of docList) {
          const brand = item.brand || item.brandName || item.name || "";
          const already = products.some(p => (p.brandName || "").toLowerCase() === brand.toLowerCase());
          if (!already && brand) {
            const unitsPerPack = Math.max(1, Number(item.unitsPerPack || 1));
            const packMrp = Number(item.mrp || item.unitPrice || item.rate || 0);
            const unitRate = unitsPerPack > 1 ? Math.round((packMrp / unitsPerPack) * 100) / 100 : packMrp;
            const strength = item.strength || item.dosage || item.dose || "";
            const form = item.formFactor || item.form || "";

            products.push({
              _id: item._id || item.productId,
              brandName: brand,
              genericName: item.generic || item.genericName || "",
              strength,
              form,
              unitsPerPack,
              packMrp,
              unitRate,
              mrp: unitRate, // Always per tablet / unit price
              currentStock: item.currentStock ?? item.stock ?? 0,
              batchNo: item.batchNo || item.batchNumber || "",
              expiryDate: item.expiryDate || "",
              image: item.image || (Array.isArray(item.images) && item.images[0]) || "",
            });
          }
        }
      } catch {
        // Silently continue
      }
    }

    // Sort results: exact / prefix matches on brand or generic appear first
    return products.sort((a, b) => {
      const aBrand = (a.brandName || "").toLowerCase();
      const bBrand = (b.brandName || "").toLowerCase();
      const aGen = (a.genericName || "").toLowerCase();
      const bGen = (b.genericName || "").toLowerCase();

      const getScore = (brand: string, gen: string) => {
        if (brand.startsWith(q)) return 1;
        if (gen.startsWith(q)) return 2;
        const words = [...brand.split(/\s+/), ...gen.split(/\s+/)];
        if (words.some(w => w.startsWith(q))) return 3;
        if (brand.includes(q) || gen.includes(q)) return 4;
        return 5;
      };

      const scoreA = getScore(aBrand, aGen);
      const scoreB = getScore(bBrand, bGen);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return aBrand.localeCompare(bBrand);
    });
  };

  // Top search bar handler with 300ms debounce
  const handleMedicineSearch = (query: string) => {
    setMedSearchQuery(query);
    medSearchQueryRef.current = query.trim();

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!query || query.trim().length < 1) {
      setMedSearchResults([]);
      setShowMedDropdown(false);
      return;
    }

    setSearchingMeds(true);
    searchDebounce.current = setTimeout(async () => {
      const currentQ = query.trim();
      try {
        const results = await executeMedicineSearch(currentQ);
        if (medSearchQueryRef.current === currentQ) {
          setMedSearchResults(results);
          setShowMedDropdown(true);
        }
      } catch (err) {
        console.error("Top medicine search failed", err);
        setMedSearchResults([]);
      } finally {
        setSearchingMeds(false);
      }
    }, 300);
  };

  // Add medicine from top search bar
  const handleAddMedicineFromDb = (product: any) => {
    const brand = product.brandName || product.name || product.brand || "";
    const fullDisplayName = product.strength && !brand.toLowerCase().includes(product.strength.toLowerCase())
      ? `${brand} ${product.strength}`
      : brand;
    const unitRate = Number(product.unitRate ?? product.mrp ?? product.unitPrice ?? 0);
    const batch = product.batchNo || product.batchNumber || "";
    const expiry = product.expiryDate || "";

    const newItem = {
      drug: product._id || "",
      batch: product.batchId || product.batch?._id || product.batch || undefined,
      productName: fullDisplayName,
      batchNo: batch,
      expiryDate: expiry,
      qty: 1,
      unitRate: unitRate,
      mrp: unitRate, // Always per tablet rate
      amount: unitRate,
      image: product.image || (Array.isArray(product.images) && product.images[0]) || "",
      strength: product.strength || "",
      form: product.form || "",
      unitsPerPack: product.unitsPerPack || 1,
    };

    setItems(prev => [...prev, newItem]);
    setMedSearchQuery("");
    setShowMedDropdown(false);
    toast.success(fullDisplayName ? `Added ${fullDisplayName}` : "Added medicine");
  };

  // Table row medicine typing handler with 300ms debounce
  const handleRowMedicineTyping = (index: number, newName: string) => {
    handleItemNameChange(index, newName);
    setActiveRowIndex(index);
    activeRowQueryRef.current = newName.trim();

    if (rowSearchDebounce.current) clearTimeout(rowSearchDebounce.current);

    if (!newName || newName.trim().length < 1) {
      setRowSearchResults([]);
      return;
    }

    setRowSearching(true);
    rowSearchDebounce.current = setTimeout(async () => {
      const currentQ = newName.trim();
      try {
        const results = await executeMedicineSearch(currentQ);
        if (activeRowQueryRef.current === currentQ) {
          setRowSearchResults(results);
        }
      } catch (err) {
        console.error("Row medicine search failed", err);
        setRowSearchResults([]);
      } finally {
        setRowSearching(false);
      }
    }, 300);
  };

  // Table row medicine selection from dropdown
  const handleSelectRowMedicine = (index: number, product: any) => {
    const brand = product.brandName || product.name || product.brand || "";
    const fullDisplayName = product.strength && !brand.toLowerCase().includes(product.strength.toLowerCase())
      ? `${brand} ${product.strength}`
      : brand;
    const unitRate = Number(product.unitRate ?? product.mrp ?? product.unitPrice ?? items[index]?.unitRate ?? 0);
    const batch = product.batchNo || product.batchNumber || items[index]?.batchNo || "";
    const expiry = product.expiryDate || items[index]?.expiryDate || "";

    setItems(prev => {
      const next = [...prev];
      const item = next[index];
      const validRate = unitRate > 0 ? unitRate : item.unitRate;
      const validAmount = Math.round(item.qty * validRate * 100) / 100;

      next[index] = {
        ...item,
        drug: product._id || item.drug,
        productName: fullDisplayName || item.productName,
        batchNo: batch,
        expiryDate: expiry,
        unitRate: validRate,
        mrp: validRate, // Always per tablet rate
        amount: validAmount,
        image: product.image || (Array.isArray(product.images) && product.images[0]) || item.image || "",
        strength: product.strength || item.strength || "",
        form: product.form || item.form || "",
        unitsPerPack: product.unitsPerPack || item.unitsPerPack || 1,
      };
      return next;
    });

    setActiveRowIndex(null);
    setRowSearchResults([]);
    toast.success(fullDisplayName ? `Selected ${fullDisplayName}` : "Medicine updated");
  };

  // Submit full updated invoice to backend
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill?._id) return;

    if (items.length === 0) {
      toast.error("Invoice must contain at least one medicine");
      return;
    }

    // Validation for mixed payments
    if (paymentMode === "MIXED") {
      const splitSum = mixedPayments.cash + mixedPayments.upi + mixedPayments.card;
      if (Math.abs(splitSum - paidAmount) > 2) {
        toast.error(`Mixed payments sum (₹${splitSum}) must equal paid amount (₹${paidAmount})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const isoDate = getComputedIsoDate();

      const payload: any = {
        patientName: patientName.trim(),
        honorific: honorific.trim() || undefined,
        customerPhone: customerPhone.trim() || "-",
        patientAddress: patientAddress.trim(),
        doctorName: doctorName.trim() || "-",
        mrn: mrn.trim() || undefined,
        patientType,
        mode: paymentMode,
        status: paymentStatus === "CHARGED TO IPD" ? "PENDING" : paymentStatus,
        paid: Number(paidAmount) || 0,
        balance: Number(balanceDue) || 0,
        paymentDetails: paymentMode === "MIXED" ? mixedPayments : undefined,
        items,
        subTotal,
        netPayable,
        date: isoDate,
        createdAt: isoDate,
        invoiceDate: isoDate,
      };

      const res = await PharmacyBillingService.updateFullInvoice(bill._id, payload);
      if (res && res.success !== false) {
        toast.success("Invoice, medicines & date/time updated successfully!");

        // Immediate Cross-Portal Synchronisation without page refresh
        clearApiCache();

        const syncDetail = {
          billId: bill._id,
          invoiceId: bill.invoiceId || bill.invoiceNo || bill._id,
          bill: {
            ...bill,
            ...payload,
            createdAt: isoDate,
            date: isoDate,
            invoiceDate: isoDate,
            paymentSummary: {
              ...(bill.paymentSummary || {}),
              grandTotal: netPayable,
              paidAmount: Number(paidAmount) || 0,
              balanceDue: Number(balanceDue) || 0,
              paymentMode,
              status: paymentStatus,
            }
          },
          timestamp: Date.now(),
        };

        // 1. Dispatch custom events locally
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("billUpdated", { detail: syncDetail }));
          window.dispatchEvent(new CustomEvent("refresh-transaction-data", { detail: syncDetail }));
          window.dispatchEvent(new CustomEvent("refresh-pharmacy-bills", { detail: syncDetail }));
          window.dispatchEvent(new CustomEvent("refresh-hospital-transactions", { detail: syncDetail }));
          window.dispatchEvent(new CustomEvent("refresh-helpdesk-transactions", { detail: syncDetail }));

          // 2. Broadcast across open tabs and portal windows
          try {
            const channel = new BroadcastChannel("msc_billing_channel");
            channel.postMessage({ type: "BILL_UPDATED", ...syncDetail });
            channel.close();
          } catch {
            // Ignore if BroadcastChannel not available in environment
          }
        }

        onSuccess(syncDetail.bill);
        onClose();
      } else {
        toast.error(res?.message || "Failed to update invoice");
      }
    } catch (err: any) {
      console.error("Failed to update invoice:", err);
      toast.error(err.message || "Failed to update invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !bill) return null;

  const totalSplitSum = mixedPayments.cash + mixedPayments.upi + mixedPayments.card;
  const isSplitMatching = Math.abs(totalSplitSum - paidAmount) <= 1;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-blue-100 dark:border-gray-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header: MSCureChain Theme (Blue, White, Green) */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
                Full Invoice Edit
              </span>
              <span className="text-xs font-mono font-bold text-blue-100">
                #{bill.invoiceId || bill.invoiceNo || bill._id}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
              Edit Payment Mode, Status, Date & Medicines
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Financial & Date/Time Settlement Controls */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                  Payment Mode, Bill Date & Settlement Status
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} /> Real-Time Cross-Portal Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Date & 12-Hour AM/PM Time Change Option */}
              <div className="sm:col-span-2 md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-blue-600" />
                      Bill Date & Time (12-Hr AM/PM)
                    </span>
                  </label>
                  {billDateOnly && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {billHour12}:{billMinute} {billAmPm}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  {/* Date Input */}
                  <div className="col-span-6">
                    <input
                      type="date"
                      value={billDateOnly}
                      onChange={(e) => setBillDateOnly(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl px-2 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Hour Select (01-12) */}
                  <div className="col-span-2">
                    <select
                      value={billHour12}
                      onChange={(e) => setBillHour12(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl px-1 py-1.5 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      title="Hour (12-hour format)"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  {/* Minute Select */}
                  <div className="col-span-2">
                    <select
                      value={billMinute}
                      onChange={(e) => setBillMinute(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl px-1 py-1.5 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      title="Minute"
                    >
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  {/* AM/PM Toggle Button */}
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => setBillAmPm(prev => prev === "AM" ? "PM" : "AM")}
                      className={`w-full py-1.5 rounded-xl text-xs font-black uppercase transition-all shadow-xs flex items-center justify-center ${
                        billAmPm === "AM"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      title="Toggle AM / PM"
                    >
                      {billAmPm}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="MIXED">Mixed Payments</option>
                  <option value="CREDIT">Credit</option>
                  <option value="IPD BILLING">IPD Billing (Post to Bed)</option>
                  <option value="IPD SETTLED">IPD Settled (Discharged)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : paymentStatus === "CHARGED TO IPD"
                      ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300"
                      : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300"
                  }`}
                >
                  <option value="PAID">PAID (Settled)</option>
                  <option value="PENDING">PENDING (Unpaid / Due)</option>
                  <option value="CHARGED TO IPD">CHARGED TO IPD (Folio)</option>
                  <option value="RETURN">RETURN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={paidAmount}
                  onWheel={preventWheelScroll}
                  onKeyDown={preventNegativeInput}
                  onChange={(e) => handlePaidAmountChange(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Balance Due Notification Strip */}
            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-blue-100/60 dark:border-blue-900/40">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Calculated Balance Due:
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg border font-black ${
                balanceDue > 0
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}>
                ₹{Math.round(balanceDue * 100) / 100}
              </span>
            </div>

            {/* Mixed Payment Split Breakdown Options */}
            {paymentMode === "MIXED" && (
              <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3 mt-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-blue-600" />
                    <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      Mixed Payment Split Breakdown
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSplitMatching ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 size={12} /> Split Matches Paid Total (₹{totalSplitSum.toLocaleString()})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200">
                        <AlertCircle size={12} /> Split Sum (₹{totalSplitSum.toLocaleString()}) ≠ Paid (₹{paidAmount.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Cash Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={mixedPayments.cash || ""}
                      onWheel={preventWheelScroll}
                      onKeyDown={preventNegativeInput}
                      onChange={(e) => handleMixedSplitChange('cash', Math.max(0, Number(e.target.value)))}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      UPI / Online Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={mixedPayments.upi || ""}
                      onWheel={preventWheelScroll}
                      onKeyDown={preventNegativeInput}
                      onChange={(e) => handleMixedSplitChange('upi', Math.max(0, Number(e.target.value)))}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Card / Bank Transfer (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={mixedPayments.card || ""}
                      onWheel={preventWheelScroll}
                      onKeyDown={preventNegativeInput}
                      onChange={(e) => handleMixedSplitChange('card', Math.max(0, Number(e.target.value)))}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Patient & Prescribing Doctor Information */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Patient & Prescriber Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Title & Name
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={cleanHonorificPrefix(honorific)}
                    onChange={(e) => setHonorific(cleanHonorificPrefix(e.target.value))}
                    className="w-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-2 text-xs font-bold shrink-0 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Title</option>
                    {getHospitalHonorificItems(hospitalId).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Patient name..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10 digits..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doctor name / Outside clinic..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medicines Breakdown & Database Search */}
          <div className="space-y-3" ref={tableContainerRef}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-emerald-600" />
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Medicines & Line Items
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {items.length} Items
                </span>
              </div>

              {/* Live Database Search Input (Top) */}
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                <input
                  type="text"
                  value={medSearchQuery}
                  onChange={(e) => handleMedicineSearch(e.target.value)}
                  onFocus={() => medSearchQuery.length >= 1 && setShowMedDropdown(true)}
                  placeholder="Search database to add medicine..."
                  className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                {searchingMeds && (
                  <Loader2 size={12} className="animate-spin text-blue-600 absolute right-3 top-1/2 -translate-y-1/2" />
                )}

                {/* Dropdown Suggestions (Top) */}
                {showMedDropdown && medSearchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                    {medSearchResults.map((prod) => (
                      <button
                        key={prod._id || prod.brandName}
                        type="button"
                        onClick={() => handleAddMedicineFromDb(prod)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt=""
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage({ url: prod.image, title: prod.brandName || "Medicine" });
                              }}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-50 dark:bg-gray-800 p-0.5 border border-blue-100 dark:border-gray-700 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                              title="Click to view packaging"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-gray-700 text-blue-500 flex items-center justify-center shrink-0">
                              <Pill size={14} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-gray-900 dark:text-white">
                                {prod.brandName || prod.name || prod.brand || ""}
                              </span>
                              {prod.strength && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                  {prod.strength}
                                </span>
                              )}
                              {prod.form && (
                                <span className="text-[9px] font-bold text-gray-400 uppercase">
                                  {prod.form}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-semibold text-gray-400">
                              {prod.genericName ? `${prod.genericName} • ` : ""}Batch: {prod.batchNo || prod.batchNumber || "N/A"} • Stock: {prod.currentStock ?? 0}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                            ₹{prod.unitRate} <span className="text-[9px] font-semibold text-gray-500">/ tab</span>
                          </span>
                          {prod.unitsPerPack > 1 && (
                            <span className="text-[9px] text-gray-400 font-semibold block">
                              Pack: ₹{prod.packMrp}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medicines Table */}
            <div className="border border-blue-100 dark:border-gray-700 rounded-2xl overflow-visible bg-white dark:bg-gray-800 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-blue-50/60 dark:bg-gray-700/50 border-b border-blue-100 dark:border-gray-700 text-[10px] font-black text-blue-900/70 uppercase tracking-wider rounded-t-2xl">
                  <tr>
                    <th className="px-4 py-3">Medicine Name & Packaging</th>
                    <th className="px-3 py-3 w-28">Batch</th>
                    <th className="px-3 py-3 w-24">Qty (Tabs)</th>
                    <th className="px-3 py-3 w-28">Rate (₹/Tab)</th>
                    <th className="px-4 py-3 text-right w-32">Total (₹)</th>
                    <th className="px-3 py-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30">
                      {/* Medicine Name with Live Autocomplete Dropdown */}
                      <td className="px-4 py-2.5 relative">
                        <div className="flex items-center gap-2">
                          {/* Image Thumbnail with Click-to-Zoom */}
                          {item.image ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: item.image!, title: item.productName || "Medicine Packaging" })}
                              className="relative group shrink-0"
                              title="Click to preview medicine image"
                            >
                              <img
                                src={item.image}
                                alt=""
                                className="w-8 h-8 rounded-lg object-contain bg-slate-50 dark:bg-gray-800 p-0.5 border border-blue-200 dark:border-gray-700 hover:border-blue-500 hover:scale-105 transition-all shadow-xs cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={12} className="text-white drop-shadow" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-gray-700 text-blue-400 flex items-center justify-center shrink-0">
                              <Pill size={14} />
                            </div>
                          )}
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleRowMedicineTyping(idx, e.target.value)}
                              onFocus={() => {
                                setActiveRowIndex(idx);
                                if (item.productName.trim().length >= 1) {
                                  handleRowMedicineTyping(idx, item.productName);
                                }
                              }}
                              placeholder="Type medicine name..."
                              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 hover:border-blue-300 focus:border-blue-500 font-black text-gray-900 dark:text-white outline-none px-1 py-1 transition-colors"
                            />
                            {rowSearching && activeRowIndex === idx && (
                              <Loader2 size={12} className="animate-spin text-blue-600 absolute right-1 top-1/2 -translate-y-1/2" />
                            )}

                            {/* Row-specific Autocomplete Dropdown */}
                            {activeRowIndex === idx && rowSearchResults.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto min-w-[320px]">
                                <div className="px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/50 text-[10px] font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider border-b border-blue-100 dark:border-blue-900 flex justify-between items-center">
                                  <span>Matching Medicines ({rowSearchResults.length})</span>
                                  <span className="text-[9px] text-gray-400 font-normal">Click to select</span>
                                </div>
                                {rowSearchResults.map((prod) => (
                                  <button
                                    key={prod._id || prod.brandName}
                                    type="button"
                                    onClick={() => handleSelectRowMedicine(idx, prod)}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      {prod.image ? (
                                        <img
                                          src={prod.image}
                                          alt=""
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage({ url: prod.image, title: prod.brandName || "Medicine" });
                                          }}
                                          className="w-7 h-7 rounded-md object-contain bg-slate-50 dark:bg-gray-800 p-0.5 border border-blue-100 dark:border-gray-700 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-gray-700 text-blue-500 flex items-center justify-center shrink-0">
                                          <Pill size={12} />
                                        </div>
                                      )}
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-black text-gray-900 dark:text-white">
                                            {prod.brandName || prod.name || prod.brand || ""}
                                          </span>
                                          {prod.strength && (
                                            <span className="text-[10px] font-black px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                              {prod.strength}
                                            </span>
                                          )}
                                          {prod.form && (
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">
                                              {prod.form}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] font-semibold text-gray-400">
                                          {prod.genericName ? `${prod.genericName} • ` : ""}Batch: {prod.batchNo || prod.batchNumber || "N/A"} • Stock: {prod.currentStock ?? 0}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                        ₹{prod.unitRate} <span className="text-[9px] font-semibold text-gray-500">/ tab</span>
                                      </span>
                                      {prod.unitsPerPack > 1 && (
                                        <span className="text-[9px] text-gray-400 font-semibold block">
                                          Pack: ₹{prod.packMrp}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={item.batchNo}
                          onChange={(e) => handleItemBatchChange(idx, e.target.value)}
                          placeholder="Batch..."
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 font-mono text-[11px] text-gray-600 dark:text-gray-300 outline-none px-1 py-0.5"
                        />
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={item.qty}
                          onWheel={preventWheelScroll}
                          onKeyDown={preventNegativeInput}
                          onChange={(e) => handleItemQtyChange(idx, Math.max(1, Number(e.target.value)))}
                          className="w-16 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-black text-center outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* Rate (per tablet/unit) */}
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unitRate}
                          onWheel={preventWheelScroll}
                          onKeyDown={preventNegativeInput}
                          onChange={(e) => handleItemRateChange(idx, Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* Line Total */}
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* + Add Another Medicine Button & Helpful Hint */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddEmptyLineItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-98"
              >
                <Plus size={15} className="font-black" />
                <span>Add Another Medicine</span>
              </button>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                Rate &amp; MRP calculate per tablet / unit automatically
              </span>
            </div>

            {/* + Add Another Medicine Button & Helpful Hint */}
          

            {/* Financial Summary Strip - Clean MSCureChain Theme (Blue, White, Green ONLY - Black background removed) */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-50 via-white to-emerald-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border border-blue-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-blue-900/80 dark:text-blue-300 uppercase tracking-widest block">
                  Net Calculated Total
                </span>
                <span className="text-2xl font-black tracking-tight text-blue-700 dark:text-blue-400">
                  ₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">Paid:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800 px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">Balance Due:</span>
                  <strong className={`font-black text-sm ${balanceDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: MSCureChain Theme */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving & Synchronizing Across Portals...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Invoice Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* High-Resolution Medicine Image Zoom & Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative bg-white dark:bg-gray-900 rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600">
                    <Package size={16} />
                  </div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[280px]">
                    {previewImage.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="w-full max-h-[60vh] flex items-center justify-center bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-xs"
                />
              </div>

              <div className="flex items-center justify-between w-full text-[11px] font-semibold text-gray-400">
                <span>Product Packaging Preview</span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
