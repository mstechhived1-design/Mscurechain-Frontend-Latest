'use client';

import React, { useState, useRef, useTransition, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Printer, CheckCircle, X, Check, Search, User, ChevronLeft, Receipt } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillItem, PatientDetails, BillPayload } from '@/lib/integrations/types/labBilling';
import BillPrintView from '@/components/lab/BillPrintView';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { LabTest } from '@/lib/integrations/types/labTest';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { invalidateCachePattern } from '@/lib/integrations/api/apiClient';
import { patientService } from '@/lib/integrations/services/patient.service';
import { useTenantLink } from '@/hooks/useTenantLink';

function HelpdeskLabBillingCheckoutPage() {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [testsLoading, setTestsLoading] = useState(true);
    const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
    const [generatedBill, setGeneratedBill] = useState<(BillPayload & { invoiceId: string; createdAt: string }) | null>(null);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [closing, setClosing] = useState(false);
    const [isNavigating, startNavigation] = useTransition();

    // Patient name autocomplete state
    const [patientSuggestions, setPatientSuggestions] = useState<Array<{ _id: string; name: string; mobile: string; email?: string; age?: number; ageUnit?: string; gender?: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const patientSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionRef = useRef<HTMLDivElement>(null);

    // Debounced patient search
    const handlePatientNameChange = useCallback((value: string) => {
        setPatient(prev => ({ ...prev, name: value }));
        if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
        if (value.trim().length < 2) {
            setPatientSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        patientSearchDebounce.current = setTimeout(async () => {
            setSearchingPatients(true);
            try {
                const res = await patientService.searchPatients(value.trim());
                setPatientSuggestions(res.patients || []);
                setShowSuggestions((res.patients || []).length > 0);
            } catch {
                setPatientSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setSearchingPatients(false);
            }
        }, 350);
    }, []);

    // Select a patient from suggestions and auto-fill fields
    const handleSelectPatient = useCallback((p: { _id: string; name: string; mobile: string; email?: string; age?: number; ageUnit?: string; gender?: string }) => {
        setPatient(prev => ({
            ...prev,
            name: p.name,
            mobile: p.mobile || prev.mobile,
            age: p.age ?? prev.age,
            ageUnit: (p.ageUnit as any) || prev.ageUnit,
            gender: (p.gender as any) || prev.gender,
        }));
        setPatientSuggestions([]);
        setShowSuggestions(false);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch tests on load
    React.useEffect(() => {
        const fetchTests = async () => {
            try {
                const data = await LabTestService.getTests();
                setAvailableTests(data);
            } catch (err) {
                console.error("Failed to load tests", err);
            } finally {
                setTestsLoading(false);
            }
        };
        fetchTests();
    }, []);

    // Helper to add tests from URL
    const searchParams = useSearchParams() as any;

    /* ----------------------------------------
       Patient State
    ----------------------------------------- */
    const [patient, setPatient] = useState<PatientDetails>({
        name: '',
        age: 0,
        ageUnit: 'Years',
        gender: '' as any,
        mobile: '',
        refDoctor: '',
    });
    const [sampleId, setSampleId] = useState<string | null>(null);
    const [displayId, setDisplayId] = useState<string | null>(null);

    // 1. Capture Patient & Sample params immediately
    React.useEffect(() => {
        const name = ((searchParams?.get('name') ?? null) ?? null);
        const mobile = ((searchParams?.get('mobile') ?? null) ?? null);
        const age = ((searchParams?.get('age') ?? null) ?? null);
        const gender = ((searchParams?.get('gender') ?? null) ?? null);
        const refDoctor = ((searchParams?.get('refDoctor') ?? null) ?? null);
        const sampleIdParam = ((searchParams?.get('sampleId') ?? null) ?? null);

        if (sampleIdParam) {
            setSampleId(sampleIdParam);
        }

        const displayIdParam = ((searchParams?.get('displayId') ?? null) ?? null);
        if (displayIdParam) {
            setDisplayId(displayIdParam);
        }

        if (name || mobile) {
            let normalizedGender = gender;
            if (gender) {
                const g = gender.toLowerCase();
                if (g === 'male') normalizedGender = 'Male';
                else if (g === 'female') normalizedGender = 'Female';
                else if (g === 'other') normalizedGender = 'Other';
            }

            setPatient(prev => ({
                ...prev,
                name: name || prev.name,
                mobile: mobile || prev.mobile,
                age: age ? parseInt(age) : prev.age,
                gender: (normalizedGender as any) || prev.gender,
                refDoctor: refDoctor || prev.refDoctor,
            }));
        }
    }, [searchParams]);

    // 2. Map Test Names to Objects (Requires availableTests)
    React.useEffect(() => {
        if (!testsLoading && availableTests.length > 0) {
            const tests = ((searchParams?.get('tests') ?? null) ?? null);
            if (tests) {
                const testList = tests.split(',');
                const testsToAdd: BillItem[] = [];

                testList.forEach((tName: any) => {
                    const found = availableTests.find(at =>
                        (at.testName && at.testName.toLowerCase() === tName.trim().toLowerCase()) ||
                        (at.name && at.name.toLowerCase() === tName.trim().toLowerCase())
                    );
                    if (found) {
                        testsToAdd.push({
                            testName: found.testName || found.name || "Unknown",
                            testId: found._id,
                            price: found.price,
                            discount: 0
                        });
                    }
                });

                if (testsToAdd.length > 0) {
                    setSelectedTests(prev => {
                        const newTests = testsToAdd.filter(newT => !prev.some(existing => existing.testName === newT.testName));
                        return [...prev, ...newTests];
                    });
                }
            }
        }
    }, [testsLoading, availableTests, searchParams]);

    const [selectedTests, setSelectedTests] = useState<BillItem[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'rupees' | 'percent'>('rupees');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Mixed'>('Cash');
    const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, upi: 0 });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!/^\d{10}$/.test(patient.mobile)) newErrors.mobile = "Invalid 10-digit mobile";
        if (patient.age < 0 || !Number.isInteger(Number(patient.age))) newErrors.age = "Invalid Age";
        if (!patient.gender) newErrors.gender = "Gender is mandatory";
        if (discount < 0) newErrors.discount = "Invalid discount";
        else if (discountType === 'percent' && discount > 100) newErrors.discount = "Cannot exceed 100%";
        else if (discountType === 'rupees' && discount > totalAmount) newErrors.discount = "Exceeds total";
        if (paidAmount < 0) newErrors.paidAmount = "Invalid paid amount";

        if (paymentMode === 'Mixed') {
            const totalMixed = Number(mixedPayments.cash) + Number(mixedPayments.card) + Number(mixedPayments.upi);
            if (Math.abs(totalMixed - finalAmount) > 2) newErrors.mixedMatch = "Doesn't match total";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    React.useEffect(() => { validate(); }, [patient, discount, discountType, paidAmount, paymentMode, mixedPayments, selectedTests]);

    const totalAmount = selectedTests.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = discountType === 'percent'
        ? Math.round((totalAmount * Math.min(discount, 100)) / 100)
        : Math.min(discount, totalAmount);
    const finalAmount = Math.max(0, totalAmount - discountAmount);
    const balance = Math.max(0, finalAmount - paidAmount);

    React.useEffect(() => {
        setPaidAmount(finalAmount);
        if (paymentMode === 'Mixed') setMixedPayments({ cash: finalAmount, card: 0, upi: 0 });
    }, [finalAmount, paymentMode]);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: generatedBill ? `Invoice_${generatedBill.invoiceId}` : 'Invoice',
    });

    // Auto-save bill data to localStorage
    const saveToLocal = (billData: BillPayload & { invoiceId: string; createdAt: string }) => {
        try {
            const saved = JSON.parse(localStorage.getItem('lab_saved_bills') || '[]');
            saved.unshift({ ...billData, savedAt: new Date().toISOString() });
            // Keep only last 50 bills
            localStorage.setItem('lab_saved_bills', JSON.stringify(saved.slice(0, 50)));
        } catch (e) {
            console.warn('LocalStorage save failed', e);
        }
    };

    const handleGenerateBill = async (shouldPrint: boolean = true) => {
        if (generatedBill) {
            toast('Invoice already generated. Use "Save Bill" to finish.', { icon: 'ℹ️' });
            if (shouldPrint) setTimeout(() => handlePrint(), 300);
            return;
        }

        if (!patient.name || !patient.mobile || selectedTests.length === 0) {
            toast.error('Fill patient details and select tests');
            return;
        }

        setLoading(true);
        try {
            if (sampleId) {
                const res = await LabSampleService.finalizeOrder(sampleId, {
                    totalAmount: finalAmount,
                    items: selectedTests,
                    patientDetails: patient
                });
                await LabSampleService.payOrder(sampleId, {
                    paymentMode: paymentMode || 'Cash',
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined
                });

                const billData = {
                    patientDetails: patient,
                    items: selectedTests,
                    totalAmount,
                    discount: discountAmount,
                    discountType,
                    discountInput: discount,
                    finalAmount,
                    paidAmount,
                    balance,
                    paymentMode,
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined,
                    invoiceId: res.transaction?._id || res.transaction?.invoiceId || displayId || 'N/A',
                    createdAt: new Date().toISOString(),
                };
                setGeneratedBill(billData);
                saveToLocal(billData);
                toast.success('Bill generated & saved locally!');
            } else {
                const payload: BillPayload = {
                    patientDetails: patient,
                    items: selectedTests,
                    totalAmount,
                    discount: discountAmount,
                    finalAmount,
                    paidAmount,
                    balance,
                    paymentMode,
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined
                };
                const res = await LabBillingService.createBill(payload);
                const billData = { ...payload, invoiceId: res.bill.invoiceId || res.bill._id, createdAt: res.bill.createdAt };
                setGeneratedBill(billData);
                saveToLocal(billData);
                toast.success('Walk-in bill generated & saved locally!');
            }

            if (shouldPrint) setTimeout(() => handlePrint(), 500);

            // Refresh data everywhere
            window.dispatchEvent(new Event('refresh-lab-data'));
        } catch (err: any) {
            toast.error(err.message || 'Billing failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        setClosing(true);
        try {
            // Smart Invalidation and navigation back to lab-billing
            invalidateCachePattern('/lab/orders');
            invalidateCachePattern('/lab/invoices');
            invalidateCachePattern('/lab/dashboard-stats');

            window.dispatchEvent(new Event('refresh-lab-data'));

            startNavigation(() => {
                router.push(getPath('/helpdesk/lab-billing'));
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to close order');
            setClosing(false);
        }
    };

    const filteredTests = availableTests.filter(t =>
        (t.testName || t.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(getPath('/helpdesk/lab-billing'))}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Back to Billing Dashboard"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            Checkout & Payment
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate invoices, collect payments, and print customer bills</p>
                    </div>
                </div>
                {sampleId && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/30 rounded-xl shadow-sm">
                        <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">Active Order: {displayId || sampleId.slice(-6).toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Patient Details Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md">
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/50">
                            <span className="w-1.5 h-5 bg-teal-600 rounded-full" />
                            <h3 className="font-bold text-slate-800 dark:text-white">Patient Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 relative" ref={suggestionRef}>
                                <label className="text-xs font-semibold text-slate-500">Patient Name</label>
                                <div className="relative">
                                    <input
                                        placeholder="Search or enter name..."
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-xs md:text-sm font-medium"
                                        value={patient.name}
                                        onChange={e => handlePatientNameChange(e.target.value)}
                                        onFocus={() => patient.name.length >= 2 && patientSuggestions.length > 0 && setShowSuggestions(true)}
                                        autoComplete="off"
                                        disabled={!!sampleId}
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        {searchingPatients
                                            ? <div className="w-4 h-4 border-2 border-teal-400/40 border-t-teal-500 rounded-full animate-spin" />
                                            : <Search size={15} />}
                                    </div>
                                </div>
                                {showSuggestions && patientSuggestions.length > 0 && (
                                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                                        {patientSuggestions.map(p => (
                                            <button
                                                key={p._id}
                                                type="button"
                                                onMouseDown={() => handleSelectPatient(p)}
                                                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors group border-b border-slate-100 dark:border-slate-700 last:border-0"
                                            >
                                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                                                    <User size={13} className="text-teal-600 dark:text-teal-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.mobile}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Mobile Number</label>
                                <input
                                    placeholder="10-digit mobile"
                                    maxLength={10}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-xs md:text-sm font-medium"
                                    value={patient.mobile}
                                    onChange={e => setPatient({ ...patient, mobile: e.target.value.replace(/\D/g, '') })}
                                    disabled={!!sampleId}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Age Details</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder="Age"
                                        className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-xs md:text-sm font-medium"
                                        value={patient.age || ''}
                                        onChange={e => setPatient({ ...patient, age: parseInt(e.target.value) || 0 })}
                                        disabled={!!sampleId}
                                    />
                                    <select
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-xs md:text-sm font-medium"
                                        value={patient.ageUnit}
                                        onChange={e => setPatient({ ...patient, ageUnit: e.target.value as any })}
                                        disabled={!!sampleId}
                                    >
                                        <option value="Years">Years</option>
                                        <option value="Months">Months</option>
                                        <option value="Days">Days</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Gender</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setPatient({ ...patient, gender: g as any })}
                                            className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${patient.gender === g ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 font-extrabold shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            disabled={!!sampleId}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-500">Ref. Doctor</label>
                                <input
                                    placeholder="Referring Doctor Name"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-xs md:text-sm font-medium"
                                    value={patient.refDoctor}
                                    onChange={e => setPatient({ ...patient, refDoctor: e.target.value })}
                                    disabled={!!sampleId}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Test Selection Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-col min-h-[480px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-teal-600 rounded-full" />
                                <h3 className="font-bold text-slate-800 dark:text-white">Selected Lab Services</h3>
                            </div>
                            {!sampleId && (
                                <input
                                    placeholder="Search catalog..."
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs md:text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-full sm:w-64 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            )}
                        </div>
                        
                        {sampleId ? (
                            // Preselected list (frozen)
                            <div className="space-y-3">
                                {selectedTests.map((test, index) => (
                                    <div key={index} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200">{test.testName}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Lab Order Request</p>
                                        </div>
                                        <p className="font-extrabold text-xs md:text-sm text-slate-800 dark:text-white">₹{test.price}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Catalog Selection View
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-min max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredTests.map((test) => {
                                    const currentName = test.testName || test.name || "Unknown";
                                    const isSelected = selectedTests.some(t => t.testName === currentName);
                                    return (
                                        <div
                                            key={test._id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedTests(selectedTests.filter(t => t.testName !== currentName));
                                                } else {
                                                    setSelectedTests([...selectedTests, { testName: currentName, testId: test._id, price: test.price, discount: 0 }]);
                                                }
                                            }}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all group ${isSelected ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 ring-1 ring-teal-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className={`font-bold text-xs md:text-sm ${isSelected ? 'text-teal-900 dark:text-teal-300' : 'text-slate-900 dark:text-white'}`}>{currentName}</p>
                                                    <p className={`text-[10px] mt-1 ${isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}>{test.sampleType}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold text-xs md:text-sm ${isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>₹{test.price}</p>
                                                    {isSelected && <CheckCircle size={16} className="text-teal-600 fill-teal-100 dark:fill-teal-950" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg sticky top-6">
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/50">
                            <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                            <h3 className="font-bold text-slate-800 dark:text-white">Payment Summary</h3>
                        </div>

                        <div className="space-y-4">
                            {selectedTests.length > 0 && (
                                <div className="max-h-40 overflow-y-auto pr-1 mb-4 space-y-2 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                                    {selectedTests.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                            <span className="truncate max-w-[70%] font-medium">{item.testName}</span>
                                            <span className="font-bold">₹{item.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs md:text-sm">
                                <span className="text-slate-500 font-medium">Subtotal ({selectedTests.length} items)</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">₹{totalAmount}</span>
                            </div>

                            {/* Discount Row */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Discount</label>
                                <div className="flex gap-2 items-center">
                                    {/* Toggle: ₹ / % */}
                                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => { setDiscountType('rupees'); setDiscount(0); }}
                                            className={`px-3 py-2 transition-all ${
                                                discountType === 'rupees'
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >₹</button>
                                        <button
                                            type="button"
                                            onClick={() => { setDiscountType('percent'); setDiscount(0); }}
                                            className={`px-3 py-2 transition-all ${
                                                discountType === 'percent'
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >%</button>
                                    </div>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        max={discountType === 'percent' ? 100 : totalAmount}
                                        placeholder={discountType === 'percent' ? '0–100' : '0'}
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        value={discount || ''}
                                        onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                                        disabled={!!generatedBill}
                                    />
                                    {discountAmount > 0 && (
                                        <span className="text-xs font-bold text-rose-500 shrink-0">-₹{discountAmount}</span>
                                    )}
                                </div>
                                {errors.discount && <p className="text-[10px] text-rose-500">{errors.discount}</p>}
                            </div>

                            <div className="bg-teal-50 dark:bg-teal-950/20 p-5 rounded-2xl border border-teal-100 dark:border-teal-900/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">Net Payable</span>
                                        {discountAmount > 0 && (
                                            <p className="text-[10px] text-teal-600/70 mt-0.5">
                                                {discountType === 'percent' ? `${discount}% off` : `₹${discountAmount} off`} · Saved ₹{discountAmount}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-2xl font-black text-teal-700 dark:text-teal-400">₹{finalAmount}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Cash', 'UPI', 'Card', 'Mixed'].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setPaymentMode(mode as any)}
                                            className={`py-2.5 rounded-xl text-xs font-black transition-all border ${paymentMode === mode ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/10' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>

                                {/* Mixed Payment Breakdown */}
                                {paymentMode === 'Mixed' && (
                                    <div className="mt-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Split Payment Breakdown</p>
                                        {[
                                            { key: 'cash', label: 'Cash', icon: '💵' },
                                            { key: 'upi', label: 'UPI', icon: '📱' },
                                            { key: 'card', label: 'Card', icon: '💳' },
                                        ].map(({ key, label, icon }) => (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="text-base w-6 text-center">{icon}</span>
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 w-9 shrink-0">{label}</label>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                                    <input
                                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                        placeholder="0"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                                        value={mixedPayments[key as keyof typeof mixedPayments] || ''}
                                                        onChange={e => setMixedPayments(prev => ({ ...prev, [key]: Math.max(0, Number(e.target.value)) }))}
                                                        disabled={!!generatedBill}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {/* Mixed total vs net payable */}
                                        {(() => {
                                            const mixedTotal = (mixedPayments.cash || 0) + (mixedPayments.card || 0) + (mixedPayments.upi || 0);
                                            const mixedDiff = finalAmount - mixedTotal;
                                            return (
                                                <div className={`flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold ${Math.abs(mixedDiff) <= 2 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    <span>Total Split</span>
                                                    <span>₹{mixedTotal} {Math.abs(mixedDiff) <= 2 ? '✓ Matched' : mixedDiff > 0 ? `(₹${mixedDiff} short)` : `(₹${Math.abs(mixedDiff)} excess)`}</span>
                                                </div>
                                            );
                                        })()}
                                        {errors.mixedMatch && <p className="text-[10px] text-rose-500">{errors.mixedMatch}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Paid Amount & Due Summary */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500">Amount Paid by Patient (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder={String(finalAmount)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        value={paidAmount || ''}
                                        onChange={e => setPaidAmount(Math.max(0, Number(e.target.value)))}
                                        disabled={!!generatedBill}
                                    />
                                </div>
                                {/* Due Amount */}
                                {balance > 0 && (
                                    <div className="flex justify-between items-center px-4 py-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 rounded-xl">
                                        <span className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Due Amount</span>
                                        <span className="text-sm font-black text-rose-700 dark:text-rose-400">₹{balance}</span>
                                    </div>
                                )}
                                {balance === 0 && paidAmount > 0 && (
                                    <div className="flex justify-between items-center px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">Fully Paid</span>
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">✓ ₹{paidAmount}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 space-y-3">
                                <button
                                    onClick={() => handleGenerateBill(true)}
                                    disabled={loading || selectedTests.length === 0 || !!generatedBill}
                                    className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${generatedBill
                                            ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                                            : 'bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:shadow-none shadow-teal-500/15'
                                        }`}
                                >
                                    {loading
                                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : generatedBill
                                            ? <Check size={18} />
                                            : <Printer size={18} />
                                    }
                                    {loading ? 'Processing...' : generatedBill ? 'Invoice Generated' : 'Generate Invoice'}
                                </button>
                                {generatedBill && (
                                    <button
                                        onClick={handleClose}
                                        disabled={closing}
                                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        {closing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving Bill...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Save Bill
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Hidden Print View */}
            <div className="hidden">
                <div ref={printRef}>
                    {generatedBill && <BillPrintView billData={generatedBill} invoiceId={generatedBill.invoiceId} />}
                </div>
            </div>
        </div>
    );
}

export default React.memo(HelpdeskLabBillingCheckoutPage);
