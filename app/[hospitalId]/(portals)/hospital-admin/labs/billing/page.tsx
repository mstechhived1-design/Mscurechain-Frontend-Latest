'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LabBillingService } from '@/lib/integrations/services/labBilling.service';
import { BillItem, PatientDetails, BillPayload } from '@/lib/integrations/types/labBilling';
import BillPrintView from '@/components/lab/BillPrintView';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { LabTestService } from '@/lib/integrations/services/labTest.service';
import { LabTest } from '@/lib/integrations/types/labTest';
import {
    User,
    Phone,
    FlaskConical,
    Calculator,
    ChevronRight,
    Printer,
    Activity,
    Stethoscope
} from 'lucide-react';

function HospitalAdminLabBillingPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [testsLoading, setTestsLoading] = useState(true);
    const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
    const [generatedBill, setGeneratedBill] = useState<(BillPayload & { invoiceId: string; createdAt: string }) | null>(null);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const data = await LabTestService.getTests();
                setAvailableTests(data);
            } catch (err) {
                console.error("Failed to load tests", err);
                toast.error("Test catalog initialization failed");
            } finally {
                setTestsLoading(false);
            }
        };
        fetchTests();
    }, []);

    const [patient, setPatient] = useState<PatientDetails>({
        name: '',
        age: 0,
        ageUnit: 'Years',
        gender: '' as any,
        mobile: '',
        refDoctor: '',
    });

    const [selectedTests, setSelectedTests] = useState<BillItem[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Mixed'>('Cash');
    const [mixedPayments, setMixedPayments] = useState({ cash: 0, card: 0, upi: 0 });

    const totalAmount = selectedTests.reduce((sum, item) => sum + item.price, 0);
    const finalAmount = Math.max(0, totalAmount - discount);
    const balance = Math.max(0, finalAmount - paidAmount);

    useEffect(() => {
        setPaidAmount(finalAmount);
        if (paymentMode === 'Mixed') {
            setMixedPayments({ cash: finalAmount, card: 0, upi: 0 });
        }
    }, [finalAmount, paymentMode]);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: generatedBill ? `Invoice_${generatedBill.invoiceId}` : 'Invoice',
    });

    const handleAddTest = (test: LabTest) => {
        const nameToUse = test.testName || test.name || "Unknown Test";
        if (!selectedTests.find(t => t.testName === nameToUse)) {
            setSelectedTests([...selectedTests, { testName: nameToUse, price: test.price, discount: 0 }]);
        } else {
            setSelectedTests(selectedTests.filter(t => t.testName !== nameToUse));
        }
    };

    const handleGenerateBill = async () => {
        if (!patient.name || !patient.mobile || selectedTests.length === 0) {
            toast.error('Patient identity and protocol selection required');
            return;
        }

        setLoading(true);
        try {
            const payload: BillPayload = {
                patientDetails: patient,
                items: selectedTests,
                totalAmount,
                discount,
                finalAmount,
                paidAmount,
                balance,
                paymentMode,
                paymentDetails: paymentMode === 'Mixed' ? mixedPayments : undefined
            };

            const res = await LabBillingService.createBill(payload);
            setGeneratedBill({ ...payload, invoiceId: res.bill.invoiceId, createdAt: res.bill.createdAt });
            toast.success('Billing sequence synchronized');

            setTimeout(() => {
                handlePrint();
                router.push('/hospital-admin/labs/samples');
            }, 600);
        } catch (err: any) {
            toast.error(err.message || 'Billing terminal error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 ">
            {/* Header Tier */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">Billing Terminal</h1>
                <p className="text-gray-500 dark:text-gray-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px] ml-1 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-500" />
                    Strategic Revenue Acquisition & Protocol Sync
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left Column: Input Modules */}
                <div className="xl:col-span-8 space-y-8">
                    {/* Patient Registry Module */}
                    <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Patient Identity</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Primary Biological Subject Data</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Subject Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        placeholder="NOMENCLATURE..."
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl pl-11 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold dark:text-white"
                                        value={patient.name}
                                        onChange={e => setPatient({ ...patient, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Contact Terminal</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        placeholder="MOBILE_ID..."
                                        maxLength={10}
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl pl-11 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold dark:text-white"
                                        value={patient.mobile}
                                        onChange={e => setPatient({ ...patient, mobile: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Age Chronology</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder="UNIT_VAL"
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold dark:text-white text-center"
                                        value={patient.age || ''}
                                        onChange={e => setPatient({ ...patient, age: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Biological Gender</label>
                                    <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl">
                                        {['Male', 'Female'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setPatient({ ...patient, gender: g as any })}
                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${patient.gender === g ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}
                                            >
                                                {g.substring(0, 1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Referral Node</label>
                                <div className="relative">
                                    <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        placeholder="DOCTOR_REFERENCE..."
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl pl-11 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold dark:text-white"
                                        value={patient.refDoctor}
                                        onChange={e => setPatient({ ...patient, refDoctor: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Catalog Gateway */}
                    <div className="bg-white dark:bg-gray-800 p-2 md:p-4 md:p-8 rounded-4xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                    <FlaskConical className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Protocol Registry</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Diagnostic catalog Acquisition</p>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                {availableTests.length} NODES
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {testsLoading ? (
                                [...Array(6)].map((_, i) => (
                                    <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900/50 rounded-3xl opacity-50"></div>
                                ))
                            ) : (
                                availableTests.map((test) => {
                                    const isSelected = selectedTests.some(t => t.testName === (test.testName || test.name));
                                    return (
                                        <button
                                            key={test._id}
                                            onClick={() => handleAddTest(test)}
                                            className={`p-5 rounded-3xl border-2 text-left flex flex-col justify-between h-28 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-50 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-200 dark:hover:border-blue-900/30'}`}
                                        >
                                            <div>
                                                <p className={`text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2 ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {test.testName || test.name}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">S: {test.sampleType || 'LAB_UNIT'}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400">₹{test.price}</span>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full "></div>}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Financial Hub */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="bg-gray-900 dark:bg-black p-10 rounded-[0.5rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl -mr-32 -mt-32"></div>

                        <div className="flex items-center gap-4 mb-10">
                            <Calculator className="w-8 h-8 text-blue-500" />
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-blue-500 decoration-4 underline-offset-8">Economic Hub</h3>
                        </div>

                        <div className="space-y-6 pb-10 border-b border-gray-800">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Gross Quantum</span>
                                <span className="text-xl font-black tracking-tighter text-gray-400">₹{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Incentive Discount</span>
                                <div className="relative">
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        placeholder="VALUE"
                                        className="w-full bg-gray-800/50 border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base md:text-lg font-black italic tracking-tighter text-right text-blue-400"
                                        value={discount || ''}
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="py-10 space-y-8">
                            <div className="flex justify-between items-center text-blue-500">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Net Payable</span>
                                <span className="text-4xl font-black italic tracking-tighter">₹{finalAmount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Gateway Selection</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Cash', 'UPI', 'Card', 'Mixed'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setPaymentMode(mode as any)}
                                            className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 ${paymentMode === mode ? 'border-blue-500 bg-blue-500 text-white shadow-lg' : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-700'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-center text-emerald-500">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Quantum Paid</span>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        className="bg-transparent border-none text-right text-3xl font-black italic tracking-tighter outline-none focus:text-white w-32"
                                        value={paidAmount || ''}
                                        onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-rose-500 p-5 bg-rose-500/5 rounded-3xl border border-rose-500/20">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Arrears</span>
                                    <span className="text-2xl font-black italic tracking-tighter">₹{balance.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateBill}
                            disabled={loading || selectedTests.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <Activity className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Printer className="w-5 h-5" />
                                    Synchronize & Print
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-indigo-600 rounded-[0.5rem] p-2 md:p-4 md:p-8 text-white flex items-center justify-between group cursor-pointer hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none"
                        onClick={() => router.push('/hospital-admin/labs/transactions')}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black italic uppercase tracking-tighter">Audit Logs</h4>
                                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Review Billing History</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-2" />
                    </div>
                </div>
            </div>

            {/* Hidden Print Anchor */}
            <div className="hidden">
                <div ref={printRef}>
                    {generatedBill && <BillPrintView billData={generatedBill} invoiceId={generatedBill.invoiceId} />}
                </div>
            </div>
        </div>
    );
}

// ✅ OPTIMIZED: Memoized component
export default React.memo(HospitalAdminLabBillingPage);
