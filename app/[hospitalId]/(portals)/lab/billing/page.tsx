'use client';

import React, { useState, useRef, useTransition, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Printer, CheckCircle, X, Check, Search, User, Building2, ArrowLeftRight, Eye, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillItem, PatientDetails, BillPayload } from '@/lib/integrations/types/labBilling';
import BillPreviewModal from '@/components/lab/BillPreviewModal';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { usePrintStore } from '@/stores/printStore';

import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { LabTest } from '@/lib/integrations/types/labTest';
import { LabSampleService } from '@/lib/integrations/services/labSample.service';
import { apiClient, clearApiCache, invalidateCachePattern } from '@/lib/integrations/api/apiClient';
import { patientService } from '@/lib/integrations/services/patient.service';
import BillPrintView from '@/components/lab/BillPrintView';

function LabBillingPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [testsLoading, setTestsLoading] = useState(true);
    const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
    const [generatedBill, setGeneratedBill] = useState<(BillPayload & { invoiceId: string; createdAt: string }) | null>(null);

    // Billing mode: 'opd' | 'ipd' | 'lab'
    const [billingMode, setBillingMode] = useState<'opd' | 'ipd' | 'lab'>('opd');

    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);

    // Lab-to-Lab client details
    const [labClient, setLabClient] = useState({
        labName: '',
        contactPerson: '',
        mobile: '',
        referenceDoctor: '',   // ADD THIS
        gstin: '',
        address: '',
        originalPatientName: '',
        patientAge: 0,
        patientAgeUnit: 'Years' as 'Years' | 'Months' | 'Days',
        patientGender: '' as 'Male' | 'Female' | 'Other',
    });

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
        if (value.trim().length < 2 || billingMode === 'opd') {
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
    }, [billingMode]);

    // Clear suggestions when billing mode changes
    useEffect(() => {
        setPatientSuggestions([]);
        setShowSuggestions(false);
    }, [billingMode]);

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
        const patientType = ((searchParams?.get('patientType') ?? null) ?? null) as 'opd' | 'ipd' | 'lab' | null;
        const originalPatientName = ((searchParams?.get('originalPatientName') ?? null) ?? null);

        if (sampleIdParam) {
            setSampleId(sampleIdParam);
        }

        const displayIdParam = ((searchParams?.get('displayId') ?? null) ?? null);
        if (displayIdParam) {
            setDisplayId(displayIdParam);
        }

        if (patientType) {
            setBillingMode(patientType);
        }

        if (name || mobile) {
            let normalizedGender = gender;
            if (gender) {
                const g = gender.toLowerCase();
                if (g === 'male') normalizedGender = 'Male';
                else if (g === 'female') normalizedGender = 'Female';
                else if (g === 'other') normalizedGender = 'Other';
            }

            if (patientType === 'lab') {
                setLabClient(prev => ({
                    ...prev,
                    labName: name || prev.labName,
                    mobile: mobile || prev.mobile,
                    referenceDoctor: refDoctor || prev.referenceDoctor,
                    originalPatientName: originalPatientName || prev.originalPatientName,
                    patientAge: age ? parseInt(age) : prev.patientAge,
                    patientGender: (normalizedGender as any) || prev.patientGender,
                }));
            } else {
                setPatient(prev => ({
                    ...prev,
                    name: name || prev.name,
                    mobile: mobile || prev.mobile,
                    age: age ? parseInt(age) : prev.age,
                    gender: (normalizedGender as any) || prev.gender,
                    refDoctor: refDoctor || prev.refDoctor,
                }));
            }
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
                            price: billingMode === 'lab' && found.labPrice !== undefined ? found.labPrice : found.price,
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

    const getAgeGroup = () => {
        const { age, ageUnit } = patient;
        if (!age) return 'N/A';

        if (ageUnit === 'Days') return age <= 28 ? 'Newborn' : 'Infant';
        if (ageUnit === 'Months') return age <= 12 ? 'Infant' : 'Child';
        if (age <= 1) return 'Infant';
        if (age <= 12) return 'Child';
        if (age >= 60) return 'Geriatric';
        return 'Adult';
    };

    const [selectedTests, setSelectedTests] = useState<BillItem[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Mixed'>('Cash');
    const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, upi: 0 });
    const [billingStatus, setBillingStatus] = useState<'Paid' | 'Due'>('Paid');

    // Draft persistence
    const [isInitialized, setIsInitialized] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // If query parameters are present, skip loading draft and clear draft
        const urlParams = new URLSearchParams(window.location.search);
        const hasQueryParams = urlParams.get('name') || urlParams.get('sampleId') || urlParams.get('patientType');
        if (hasQueryParams) {
            localStorage.removeItem('curechain_lab_billing_draft');
            setIsInitialized(true);
            return;
        }

        const draft = localStorage.getItem('curechain_lab_billing_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                if (parsed.billingMode) setBillingMode(parsed.billingMode);
                if (parsed.patient) setPatient(parsed.patient);
                if (parsed.labClient) setLabClient(prev => ({
                    ...prev,
                    ...parsed.labClient,
                }));
                if (parsed.selectedTests) setSelectedTests(parsed.selectedTests);
                if (parsed.discount) setDiscount(parsed.discount);
                if (parsed.paidAmount) setPaidAmount(parsed.paidAmount);
                if (parsed.paymentMode) setPaymentMode(parsed.paymentMode);
                if (parsed.mixedPayments) setMixedPayments(parsed.mixedPayments);
                if (parsed.billingStatus) setBillingStatus(parsed.billingStatus);
            } catch (e) {
                console.error("Error loading billing draft:", e);
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized || typeof window === 'undefined') return;
        const draftData = {
            billingMode,
            patient,
            labClient,
            selectedTests,
            discount,
            paidAmount,
            paymentMode,
            mixedPayments,
            billingStatus,
        };
        localStorage.setItem('curechain_lab_billing_draft', JSON.stringify(draftData));
    }, [isInitialized, billingMode, patient, labClient, selectedTests, discount, paidAmount, paymentMode, mixedPayments, billingStatus]);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

    const markTouched = (field: string) => {
        setTouchedFields(prev => {
            const next = new Set(prev);
            next.add(field);
            return next;
        });
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (billingMode === 'lab') {
            if (!labClient.labName) newErrors.labName = "Lab name is mandatory";
            if (!labClient.originalPatientName) newErrors.originalPatientName = "Patient name is mandatory";
            if (labClient.patientAge < 0 || !Number.isInteger(Number(labClient.patientAge))) newErrors.patientAge = "Invalid Age";
            if (!labClient.patientGender) newErrors.patientGender = "Gender is mandatory";
            if (labClient.mobile && !/^\d{10}$/.test(labClient.mobile)) newErrors.labMobile = "Invalid 10-digit mobile";
        } else {
            if (!patient.name) newErrors.name = "Patient name is mandatory";
            if (!/^\d{10}$/.test(patient.mobile)) newErrors.mobile = "Invalid 10-digit mobile";
            if (patient.age < 0 || !Number.isInteger(Number(patient.age))) newErrors.age = "Invalid Age";
            if (!patient.gender) newErrors.gender = "Gender is mandatory";
        }

        if (discount < 0) newErrors.discount = "Invalid discount";
        else if (discount > totalAmount) newErrors.discount = "Exceeds total";
        if (paidAmount < 0) newErrors.paidAmount = "Invalid paid amount";
 
        if (paymentMode === 'Mixed') {
            const totalMixed = Number(mixedPayments.cash) + Number(mixedPayments.card) + Number(mixedPayments.upi);
            if (Math.abs(totalMixed - finalAmount) > 2) newErrors.mixedMatch = "Doesn't match total";
        }
 
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    React.useEffect(() => { validate(); }, [patient, discount, paidAmount, paymentMode, mixedPayments, selectedTests]);

    const totalAmount = selectedTests.reduce((sum, item) => sum + item.price, 0);
    const finalAmount = Math.max(0, totalAmount - discount);
    const balance = Math.max(0, finalAmount - paidAmount);

    React.useEffect(() => {
        if (billingStatus === 'Paid') {
            setPaidAmount(finalAmount);
        }
        if (paymentMode === 'Mixed') setMixedPayments({ cash: finalAmount, card: 0, upi: 0 });
    }, [finalAmount, paymentMode, billingStatus]);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: generatedBill ? `Invoice_${generatedBill.invoiceId}` : 'Invoice',
    });

    const handleAddTest = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const test = availableTests.find(t => t._id === e.target.value);
        if (!test) return;
        const nameToUse = test.testName || test.name || "Unknown Test";
        if (!selectedTests.find(t => t.testName === nameToUse)) {
            // Use labPrice for Lab-to-Lab billing if set, otherwise fallback to standard price
            const effectivePrice = billingMode === 'lab' && test.labPrice !== undefined
                ? test.labPrice
                : test.price;
            setSelectedTests([...selectedTests, {
                testName: nameToUse,
                testId: test._id,
                price: effectivePrice,
                discount: 0
            }]);
        }
    };

    const removeTest = (index: number) => {
        const updated = [...selectedTests];
        updated.splice(index, 1);
        setSelectedTests(updated);
    };

    // ── Build patient details for the payload ────────────────────────────────
    const getEffectivePatient = (): PatientDetails => {
        if (billingMode === 'lab') {
            return {
                name: labClient.originalPatientName || 'Patient Client',
                age: Number(labClient.patientAge) || 0,
                ageUnit: labClient.patientAgeUnit || 'Years',
                gender: labClient.patientGender || 'Other',
                mobile: labClient.mobile || '0000000000',
                refDoctor: labClient.referenceDoctor || 'Lab Client' ||labClient.labName,
                originalPatientName: labClient.originalPatientName || '',
                patientType: 'lab',
            };
        }
        return {
            ...patient,
            patientType: billingMode,
        };
    };

    // ── Build preview bill object (no API call) ───────────────────────────────
    const buildPreviewBill = () => ({
        patientDetails: getEffectivePatient(),
        patientType: billingMode as 'opd' | 'ipd' | 'lab',
        items: selectedTests,
        totalAmount,
        discount,
        finalAmount,
        paidAmount: billingStatus === 'Paid' ? finalAmount : paidAmount,
        balance: billingStatus === 'Paid' ? 0 : Math.max(0, finalAmount - paidAmount),
        paymentMode,
        paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined,
    });

    // ── Validate then open preview modal ─────────────────────────────────────
    const handleOpenPreview = () => {
        if (billingMode === 'lab') {
            if (!labClient.labName || !labClient.originalPatientName || selectedTests.length === 0) {
                toast.error('Fill lab name, patient name, and select at least one test');
                return;
            }
        } else if (!patient.name || !patient.mobile || selectedTests.length === 0) {
            toast.error('Fill patient details and select at least one test');
            return;
        }
        setShowPreview(true);
    };

    // ── Save bill & trigger print (called from preview modal) ────────────────
    const handleGenerateBill = async (shouldPrint: boolean = true) => {
        // Duplicate prevention
        if (generatedBill) {
            toast('Invoice already generated. Use "Save Bill" to finish.', { icon: 'ℹ️' });
            return;
        }

        const effectivePatient = getEffectivePatient();
        const paidAmt = billingStatus === 'Paid' ? finalAmount : paidAmount;
        const bal = billingStatus === 'Paid' ? 0 : Math.max(0, finalAmount - paidAmount);

        setLoading(true);
        try {
            if (sampleId) {
                // Pre-update patientDetails on the order so it persists correctly
                try {
                    await apiClient(`/lab/orders/${sampleId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ patientDetails: effectivePatient })
                    });
                } catch (err) {
                    console.warn("Failed to pre-update order patientDetails:", err);
                }

                const res = await LabSampleService.finalizeOrder(sampleId, {
                    totalAmount: finalAmount,
                    items: selectedTests,
                    patientDetails: effectivePatient
                });
                await LabSampleService.payOrder(sampleId, {
                    paymentMode: paymentMode || 'Cash',
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined,
                    paidAmount: paidAmt,
                    balance: bal
                });
                setGeneratedBill({
                    patientDetails: effectivePatient,
                    patientType: billingMode as any,
                    items: selectedTests,
                    totalAmount,
                    discount,
                    finalAmount,
                    paidAmount: paidAmt,
                    balance: bal,
                    paymentMode,
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined,
                    invoiceId: res.transaction?._id || res.transaction?.invoiceId || displayId || 'N/A',
                    createdAt: new Date().toISOString(),
                });
                toast.success('Bill generated from order!');
            } else {
                const payload: BillPayload = {
                    patientDetails: effectivePatient,
                    patientType: billingMode as any,
                    items: selectedTests,
                    totalAmount,
                    discount,
                    finalAmount,
                    paidAmount: paidAmt,
                    balance: bal,
                    paymentMode,
                    paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined
                };
                const res = await LabBillingService.createBill(payload);
                setGeneratedBill({ ...payload, invoiceId: res.bill.invoiceId || res.bill._id, createdAt: res.bill.createdAt });
                const modeLabel = billingMode === 'ipd' ? 'IPD' : billingMode === 'lab' ? 'Lab-to-Lab' : 'OPD';
                toast.success(`${modeLabel} bill generated!`);
            }

            // Clear draft
            if (typeof window !== 'undefined') {
                localStorage.removeItem('curechain_lab_billing_draft');
            }

            // Close preview, refresh data
            setShowPreview(false);
            window.dispatchEvent(new Event('refresh-lab-data'));

            if (shouldPrint) {
                setTimeout(() => {
                    handlePrint();
                }, 500);
            }
        } catch (err: any) {
            toast.error(err.message || 'Billing failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        setClosing(true);
        try {
            if (sampleId && !generatedBill) {
                // Only complete if not billed? Or if billed? 
                // Assuming user marks complete after print/bill
                await LabSampleService.updateResults(sampleId, { status: 'Completed' });
                toast.success('Sample marked as Completed');
            }
            // Smart Invalidation instead of nuking everything
            invalidateCachePattern('/lab/orders');
            invalidateCachePattern('/lab/invoices');
            invalidateCachePattern('/lab/dashboard-stats');

            // Global refresh notification
            window.dispatchEvent(new Event('refresh-lab-data'));

            startNavigation(() => {
                router.push('/lab/billing/transactions');
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
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-700 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 lg:gap-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Save className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Lab Billing
                    </h1>
                    <p className="text-xs md:text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-1 ml-12">Process transactions and generate invoices</p>
                </div>
                <div className="flex items-center gap-3">
                    {sampleId && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-500">Active Order: {displayId || sampleId}</span>
                        </div>
                    )}
                    {/* Billing Mode Toggle — 3 tabs */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setBillingMode('opd')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                billingMode === 'opd'
                                    ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <User size={13} />
                            OPD
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingMode('ipd')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                billingMode === 'ipd'
                                    ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Stethoscope size={13} />
                            IPD
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingMode('lab')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                billingMode === 'lab'
                                    ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Building2 size={13} />
                            Lab to Lab
                        </button>
                    </div>
                </div>
            </div>

            {/* Mode banners */}
            {billingMode === 'ipd' && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl">
                    <Stethoscope size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        <span className="font-bold">Inpatient Billing</span> — Uses IPD rates. Tests without a separate inpatient price will fall back to the standard walk-in price.
                    </p>
                </div>
            )}
            {billingMode === 'lab' && (
                <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl">
                    <ArrowLeftRight size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        <span className="font-bold">Lab-to-Lab Billing</span> — Bill a referring lab or external partner. Invoice will be generated under the lab's name.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                <div className="lg:col-span-8 space-y-4 lg:space-y-6">
                    {/* Patient / Inpatient Details Card — shown for walkin and inpatient modes */}
                    {(billingMode === 'opd' || billingMode === 'ipd') ? (
                    <div className={`bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl border shadow-sm ${
                        billingMode === 'ipd'
                            ? 'border-blue-200 dark:border-blue-800/40'
                            : 'border-gray-200 dark:border-gray-700'
                    }`}>
                        <div className={`flex items-center gap-2 mb-4 lg:mb-6 border-b pb-3 lg:pb-4 ${
                            billingMode === 'ipd'
                                ? 'border-blue-100 dark:border-blue-800/30'
                                : 'border-gray-100 dark:border-gray-700'
                        }`}>
                            <span className={`w-1 h-5 rounded-full ${
                                billingMode === 'ipd' ? 'bg-blue-600' : 'bg-indigo-600'
                            }`} />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Patient Information</h3>
                            {billingMode === 'ipd' && (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                                    IPD
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 relative" ref={suggestionRef}>
                                <label className="text-xs font-medium text-gray-500">Patient Name</label>
                                <div className="relative">
                                    <input
                                        placeholder={billingMode === 'opd' ? "Enter patient name..." : "Search registered patient..."}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                        value={patient.name}
                                        onChange={e => handlePatientNameChange(e.target.value)}
                                        onFocus={() => billingMode !== 'opd' && patient.name.length >= 2 && patientSuggestions.length > 0 && setShowSuggestions(true)}
                                        autoComplete="off"
                                    />
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        {searchingPatients
                                            ? <div className="w-4 h-4 border-2 border-indigo-400/40 border-t-indigo-500 rounded-full animate-spin" />
                                            : <Search size={15} />}
                                    </div>
                                </div>
                                {showSuggestions && patientSuggestions.length > 0 && (
                                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                                        {patientSuggestions.map(p => (
                                            <button
                                                key={p._id}
                                                type="button"
                                                onMouseDown={() => handleSelectPatient(p)}
                                                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group border-b border-gray-100 dark:border-gray-700 last:border-0"
                                            >
                                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                    <User size={13} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.mobile}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Mobile Number</label>
                                <input
                                    placeholder="10-digit number"
                                    maxLength={10}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                    value={patient.mobile}
                                    onChange={e => setPatient({ ...patient, mobile: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Age Details</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder="Age"
                                        className="w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                        value={patient.age || ''}
                                        onChange={e => setPatient({ ...patient, age: parseInt(e.target.value) || 0 })}
                                    />
                                    <select
                                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                        value={patient.ageUnit}
                                        onChange={e => setPatient({ ...patient, ageUnit: e.target.value as any })}
                                    >
                                        <option value="Years">Years</option>
                                        <option value="Months">Months</option>
                                        <option value="Days">Days</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Gender</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setPatient({ ...patient, gender: g as any })}
                                            className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${patient.gender === g ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Ref. Doctor</label>
                                <input
                                    placeholder="Referring doctor name"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                    value={patient.refDoctor}
                                    onChange={e => setPatient({ ...patient, refDoctor: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    ) : (
                    /* Lab-to-Lab Client Details Card */
                    <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl border border-purple-200 dark:border-purple-800/40 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 lg:mb-6 border-b border-purple-100 dark:border-purple-800/30 pb-3 lg:pb-4">
                            <span className="w-1 h-5 bg-purple-600 rounded-full" />
                            <Building2 size={16} className="text-purple-600 dark:text-purple-400" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Referral Lab Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500">Lab / Organisation Name <span className="text-red-500">*</span></label>
                                <input
                                    placeholder="e.g. City Diagnostics Pvt. Ltd."
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    value={labClient.labName}
                                    onChange={e => setLabClient(prev => ({ ...prev, labName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500">Patient Name <span className="text-red-500">*</span></label>
                                <input
                                    placeholder="Patient's Full Name"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    value={labClient.originalPatientName}
                                    onChange={e => setLabClient(prev => ({ ...prev, originalPatientName: e.target.value }))}
                                />
                                {errors.originalPatientName && <p className="text-[10px] font-bold text-red-500">{errors.originalPatientName}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Patient Age <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder="Age"
                                        className="w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                        value={labClient.patientAge || ''}
                                        onChange={e => setLabClient(prev => ({ ...prev, patientAge: parseInt(e.target.value) || 0 }))}
                                    />
                                    <select
                                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                        value={labClient.patientAgeUnit}
                                        onChange={e => setLabClient(prev => ({ ...prev, patientAgeUnit: e.target.value as any }))}
                                    >
                                        <option value="Years">Years</option>
                                        <option value="Months">Months</option>
                                        <option value="Days">Days</option>
                                    </select>
                                </div>
                                {errors.patientAge && <p className="text-[10px] font-bold text-red-500">{errors.patientAge}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Patient Gender <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setLabClient(prev => ({ ...prev, patientGender: g as any }))}
                                            className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${labClient.patientGender === g ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                                {errors.patientGender && <p className="text-[10px] font-bold text-red-500">{errors.patientGender}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Contact Person (optional)</label>
                                <input
                                    placeholder="Contact person name"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    value={labClient.contactPerson}
                                    onChange={e => setLabClient(prev => ({ ...prev, contactPerson: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Mobile / Phone (optional)</label>
                                <input
                                    placeholder="Contact number"
                                    maxLength={10}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    value={labClient.mobile}
                                    onChange={e => setLabClient(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                                />
                                {errors.labMobile && <p className="text-[10px] font-bold text-red-500">{errors.labMobile}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">GSTIN (optional)</label>
                                <input
                                    placeholder="e.g. 22AAAAA0000A1Z5"
                                    maxLength={15}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium uppercase"
                                    value={labClient.gstin}
                                    onChange={e => setLabClient(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                                />
                            </div>
                            <div className="space-y-1.5">
    <label className="text-xs font-medium text-gray-500">
        Reference Doctor (optional)
    </label>

    <input
        type="text"
        placeholder="Dr. John Smith"
        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
        value={labClient.referenceDoctor || ''}
        onChange={(e) =>
            setLabClient(prev => ({
                ...prev,
                referenceDoctor: e.target.value
            }))
        }
    />
</div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500">Address (optional)</label>
                                <input
                                    placeholder="Lab address"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    value={labClient.address}
                                    onChange={e => setLabClient(prev => ({ ...prev, address: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Test Selection Card */}
                    <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[500px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4 lg:mb-6 pb-3 lg:pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-5 bg-indigo-600 rounded-full" />
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Select Services</h3>
                            </div>
                            <input
                                placeholder="Search tests..."
                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 w-full sm:w-64 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-min max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredTests.map((test) => {
                                const currentName = test.testName || test.name || "Unknown";
                                const isSelected = selectedTests.some(t => t.testName === currentName);
                                const effectivePrice = billingMode === 'lab' && test.labPrice !== undefined
                                    ? test.labPrice
                                    : test.price;
                                return (
                                    <div
                                        key={test._id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedTests(selectedTests.filter(t => t.testName !== currentName));
                                            } else {
                                                setSelectedTests([...selectedTests, { testName: currentName, testId: test._id, price: effectivePrice, discount: 0 }]);
                                            }
                                        }}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all group ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`font-semibold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{currentName}</p>
                                                <p className={`text-xs mt-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500'}`}>{test.sampleType}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {billingMode === 'lab' && test.labPrice !== undefined ? (
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm text-purple-700 dark:text-purple-400">₹{test.labPrice}</p>
                                                        <p className="text-[10px] text-gray-400 line-through">₹{test.price}</p>
                                                    </div>
                                                ) : (
                                                    <p className={`font-semibold text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>₹{test.price}</p>
                                                )}
                                                {isSelected && <CheckCircle size={16} className="text-indigo-600 fill-indigo-100 dark:fill-indigo-900" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-4 lg:space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg sticky top-6">
                        <div className="flex items-center gap-2 mb-4 lg:mb-6 pb-3 lg:pb-4 border-b border-gray-100 dark:border-gray-700">
                            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Payment Summary</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Selected Items List (Optional, or just count) */}
                            {selectedTests.length > 0 && (
                                <div className="max-h-40 overflow-y-auto pr-1 mb-4 space-y-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                                    {selectedTests.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span className="truncate max-w-[70%]">{item.testName}</span>
                                            <span>₹{item.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Subtotal ({selectedTests.length} items)</span>
                                <span className="font-semibold text-gray-900 dark:text-white">₹{totalAmount}</span>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Net Payable</span>
                                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{finalAmount}</span>
                                </div>
                            </div>

                            {/* Billing Status */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">Billing Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Paid', 'Due'].map((st) => (
                                        <button
                                            key={st}
                                            onClick={() => {
                                                setBillingStatus(st as any);
                                                if (st === 'Paid') setPaidAmount(finalAmount);
                                                if (st === 'Due') setPaidAmount(0);
                                            }}
                                            className={`py-2 rounded-lg text-xs font-semibold transition-all border ${billingStatus === st
                                                ? st === 'Paid'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none'
                                                    : 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200 dark:shadow-none'
                                                : 'bg-slate-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-white'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paid Amount - only editable when Due */}
                            {billingStatus === 'Due' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">Paid Amount</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        max={finalAmount}
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(Math.min(Number(e.target.value) || 0, finalAmount))}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Enter paid amount"
                                    />
                                </div>
                            )}

                            {/* Balance Due */}
                            {billingStatus === 'Due' && balance > 0 && (
                                <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Balance Due</span>
                                        <span className="text-xl font-bold text-rose-600 dark:text-rose-400">₹{balance}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Cash', 'UPI', 'Card', 'Mixed'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setPaymentMode(mode as any)}
                                            className={`py-2 rounded-lg text-xs font-semibold transition-all border ${paymentMode === mode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-slate-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-white'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {paymentMode === 'Mixed' && (
                                <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Mixed Payment Split (Total: ₹{finalAmount})</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Cash</label>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                value={mixedPayments.cash || ''}
                                                onChange={e => {
                                                    const val = Number(e.target.value) || 0;
                                                    setMixedPayments(prev => ({ ...prev, cash: val }));
                                                }}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-950 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Card</label>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                value={mixedPayments.card || ''}
                                                onChange={e => {
                                                    const val = Number(e.target.value) || 0;
                                                    setMixedPayments(prev => ({ ...prev, card: val }));
                                                }}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-950 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">UPI</label>
                                            <input
                                                type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                                value={mixedPayments.upi || ''}
                                                onChange={e => {
                                                    const val = Number(e.target.value) || 0;
                                                    setMixedPayments(prev => ({ ...prev, upi: val }));
                                                }}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-950 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    {errors.mixedMatch && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.mixedMatch}</p>}
                                    <p className="text-[10px] text-gray-400">Sum: ₹{Number(mixedPayments.cash) + Number(mixedPayments.card) + Number(mixedPayments.upi)} / ₹{finalAmount}</p>
                                </div>
                            )}

                            <div className="pt-2 space-y-3">
                                {/* Preview Invoice button — opens modal before saving */}
                                <button
                                    onClick={handleOpenPreview}
                                    disabled={selectedTests.length === 0 || !!generatedBill}
                                    className={`w-full py-3 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 ${
                                        generatedBill
                                            ? 'bg-green-600 cursor-not-allowed opacity-90 shadow-green-100 dark:shadow-none'
                                            : 'bg-primary-theme hover:bg-primary-theme/80 disabled:opacity-50 disabled:shadow-none shadow-indigo-100 dark:shadow-none'
                                    }`}
                                >
                                    {generatedBill ? <Check size={18} /> : <Eye size={18} />}
                                    {generatedBill ? 'Invoice Generated' : 'Preview Invoice'}
                                </button>
                                {generatedBill && (
                                    <button
                                        onClick={handleClose}
                                        disabled={closing}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold shadow-lg shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
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
            {/* Bill Preview Modal */}
            <BillPreviewModal
                isOpen={showPreview}
                billData={buildPreviewBill()}
                patientType={billingMode as any}
                invoiceId={generatedBill?.invoiceId}
                loading={loading}
                onPrint={() => handleGenerateBill(true)}
                onClose={() => setShowPreview(false)}
            />
            {/* Hidden print ref for post-save print (used by BillPreviewModal internally) */}
            <div className="hidden">
                <div ref={printRef}>
                    {generatedBill && <BillPrintView billData={generatedBill} invoiceId={generatedBill.invoiceId} patientType={billingMode as any} />}
                </div>
            </div>
        </div>
    );
}

export default React.memo(LabBillingPage);
