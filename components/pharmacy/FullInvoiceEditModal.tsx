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
  Coins
} from "lucide-react";
import { toast } from "react-hot-toast";
import { pharmacyService } from "@/lib/integrations/services/pharmacy.service";
import { PharmacyBillingService } from "@/lib/integrations/services/pharmacyBilling.service";
import { cleanHonorificPrefix, getHospitalHonorificItems } from "@/lib/utils/name-utils";

interface FullInvoiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  hospitalId: string;
  onSuccess: () => void;
}

export default function FullInvoiceEditModal({
  isOpen,
  onClose,
  bill,
  hospitalId,
  onSuccess,
}: FullInvoiceEditModalProps) {
  const [submitting, setSubmitting] = useState(false);

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
  }>>([]);

  // Medicine live search states
  const [medSearchQuery, setMedSearchQuery] = useState("");
  const [medSearchResults, setMedSearchResults] = useState<any[]>([]);
  const [searchingMeds, setSearchingMeds] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing bill data when modal opens
  useEffect(() => {
    if (bill && isOpen) {
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

      // Items - extract medicine name correctly from all possible properties with empty string fallback
      const billItems = (bill.items || []).map((it: any) => {
        const qty = Number(it.qty ?? it.issuedQty ?? it.quantity ?? 1);
        const rawRate = Number(it.unitRate ?? it.rate ?? it.mrp ?? it.unitPrice ?? 0);
        const unitRate = Math.round(rawRate * 100) / 100;
        const mrp = Math.round(Number(it.mrp ?? rawRate) * 100) / 100;
        const rawAmt = Number(it.amount ?? it.total ?? (qty * rawRate));
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
        };
      });
      setItems(billItems);
      setMedSearchQuery("");
      setMedSearchResults([]);
      setShowMedDropdown(false);
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
  };

  // Live database medicine search autocomplete
  const handleMedicineSearch = (query: string) => {
    setMedSearchQuery(query);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!query || query.trim().length < 2) {
      setMedSearchResults([]);
      setShowMedDropdown(false);
      return;
    }

    searchDebounce.current = setTimeout(async () => {
      setSearchingMeds(true);
      try {
        const res = await pharmacyService.getProducts({
          search: query.trim(),
          limit: 8,
          hospitalId,
        });
        setMedSearchResults(res.data || []);
        setShowMedDropdown(true);
      } catch (err) {
        console.error("Medicine search failed", err);
        setMedSearchResults([]);
      } finally {
        setSearchingMeds(false);
      }
    }, 250);
  };

  const handleAddMedicineFromDb = (product: any) => {
    const brand = product.brandName || product.name || product.brand || "";
    const rate = Number(product.mrp ?? product.unitPrice ?? product.unitRate ?? 0);
    const batch = product.batchNumber || product.batchNo || "";
    const expiry = product.expiryDate || "";

    const newItem = {
      drug: product._id || "",
      batch: product.batchId || product.batch?._id || product.batch || undefined,
      productName: brand,
      batchNo: batch,
      expiryDate: expiry,
      qty: 1,
      unitRate: rate,
      mrp: rate,
      amount: rate,
    };

    setItems(prev => [...prev, newItem]);
    setMedSearchQuery("");
    setShowMedDropdown(false);
    toast.success(brand ? `Added ${brand}` : "Added medicine");
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
      };

      const res = await PharmacyBillingService.updateFullInvoice(bill._id, payload);
      if (res && res.success !== false) {
        toast.success("Invoice, medicines & payment split updated successfully!");
        onSuccess();
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                Full Invoice Edit
              </span>
              <span className="text-xs font-mono font-bold text-teal-100">
                #{bill.invoiceId || bill.invoiceNo || bill._id}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
              Edit Payment Mode, Status & Medicines
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Financial & Payment Status Controls */}
          <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-teal-600" />
              <h3 className="text-xs font-black text-teal-900 dark:text-teal-200 uppercase tracking-wider">
                Payment Mode & Settlement Status
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500 ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : paymentStatus === "CHARGED TO IPD"
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300"
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
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Balance Due (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  disabled
                  value={Math.round(balanceDue * 100) / 100}
                  onWheel={preventWheelScroll}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Mixed Payment Split Breakdown Options (Cash, UPI, Card / Bank Transfer) */}
            {paymentMode === "MIXED" && (
              <div className="bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-700 rounded-2xl p-4 space-y-3 mt-3 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-teal-600" />
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
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Patient & Prescribing Doctor Information */}
          <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
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
                    className="w-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-2 text-xs font-bold shrink-0 outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Doctor name / Outside clinic..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medicines Breakdown & Database Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-purple-600" />
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Medicines & Line Items
                </h3>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  {items.length} Items
                </span>
              </div>

              {/* Live Database Search Input */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={medSearchQuery}
                  onChange={(e) => handleMedicineSearch(e.target.value)}
                  onFocus={() => medSearchQuery.length >= 2 && setShowMedDropdown(true)}
                  placeholder="Search database to add medicine..."
                  className="w-full pl-8 pr-8 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchingMeds && (
                  <Loader2 size={12} className="animate-spin text-teal-600 absolute right-3 top-1/2 -translate-y-1/2" />
                )}

                {/* Dropdown Suggestions */}
                {showMedDropdown && medSearchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                    {medSearchResults.map((prod) => (
                      <button
                        key={prod._id}
                        type="button"
                        onClick={() => handleAddMedicineFromDb(prod)}
                        className="w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-teal-950/40 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white">
                            {prod.brandName || prod.name || prod.brand || ""}
                          </p>
                          <p className="text-[10px] font-semibold text-gray-400">
                            Batch: {prod.batchNumber || prod.batchNo || ""} • Stock: {prod.currentStock ?? prod.stock ?? 0}
                          </p>
                        </div>
                        <span className="text-xs font-black text-teal-600">
                          ₹{prod.mrp || prod.unitPrice || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medicines Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-3 py-3 w-28">Batch</th>
                    <th className="px-3 py-3 w-24">Qty</th>
                    <th className="px-3 py-3 w-28">Rate (₹)</th>
                    <th className="px-4 py-3 text-right w-32">Total (₹)</th>
                    <th className="px-3 py-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemNameChange(idx, e.target.value)}
                          placeholder=""
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 font-black text-gray-900 dark:text-white outline-none px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={item.batchNo}
                          onChange={(e) => handleItemBatchChange(idx, e.target.value)}
                          placeholder=""
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 font-mono text-[11px] text-gray-600 dark:text-gray-300 outline-none px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={item.qty}
                          onWheel={preventWheelScroll}
                          onKeyDown={preventNegativeInput}
                          onChange={(e) => handleItemQtyChange(idx, Math.max(1, Number(e.target.value)))}
                          className="w-16 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-black text-center outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unitRate}
                          onWheel={preventWheelScroll}
                          onKeyDown={preventNegativeInput}
                          onChange={(e) => handleItemRateChange(idx, Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-teal-600 dark:text-teal-400">
                        ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
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

            {/* Financial Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 text-white rounded-2xl p-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Net Calculated Total
                </span>
                <span className="text-xl font-black tracking-tight text-teal-400">
                  ₹{netPayable.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                <span>Paid: <strong className="text-white font-black">₹{paidAmount.toLocaleString()}</strong></span>
                <span>Balance: <strong className="text-rose-400 font-black">₹{balanceDue.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving & Synchronizing...</span>
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
      </div>
    </div>
  );
}
