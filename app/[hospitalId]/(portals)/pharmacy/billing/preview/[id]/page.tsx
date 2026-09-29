'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { PharmacyBill } from '@/lib/integrations/types/pharmacyBilling';
import PharmacyBillPrint, { ShopDetails } from '@/components/pharmacy/billing/PharmacyBillPrint';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { useTenantLink } from '@/hooks/useTenantLink';
import { usePrintStore } from '@/stores/printStore';

const InvoicePreviewPage = () => {
    const params = useParams() as any;
    const router = useRouter();
    const { user } = useAuthStore();
    const { getPath } = useTenantLink();
    const searchParams = useSearchParams() as any;
    const [bill, setBill] = useState<PharmacyBill | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const componentRef = useRef<HTMLDivElement>(null);
    const { printWithHeader, setPrintWithHeader } = usePrintStore();

    const invoiceId = params?.id as string;

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

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: bill ? `Invoice_${bill.invoiceId}` : 'Invoice',
    });

    useEffect(() => {
        const fetchBill = async () => {
            if (!invoiceId) return;
            try {
                const data = await PharmacyBillingService.getBillById(invoiceId);
                setBill(data);
            } catch (error) {
                console.error("Failed to fetch bill", error);
                toast.error("Could not load invoice details");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBill();
    }, [invoiceId]);

    useEffect(() => {
        if (!isLoading && bill && ((searchParams?.get('print') ?? null) ?? null) === 'true') {
            const timer = setTimeout(() => {
                handlePrint();
                // Optional: remove query param after print triggered so page refresh doesn't re-trigger it
                // router.replace(getPath(`/pharmacy/billing/preview/${invoiceId}`), { scroll: false });
            }, 1000); // Small delay to ensure rendering is complete
            return () => clearTimeout(timer);
        }
    }, [isLoading, bill, searchParams, handlePrint]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Invoice Metadata...</p>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-xl font-black text-gray-900 dark:text-white mb-4">Invoice Not Found</p>
                    <button
                        onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                        className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold uppercase tracking-wider"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-2 sm:p-4 md:p-8">
            {/* Top Navigation - Compact Toolbar for Mobile */}
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-1 mb-6 md:mb-8 bg-white dark:bg-gray-800 p-2 md:p-0 rounded-xl md:bg-transparent md:dark:bg-transparent md:rounded-none border border-gray-200 dark:border-gray-700 md:border-none shadow-sm md:shadow-none">
                <button
                    onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                    className="shrink-0 flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg md:rounded-xl font-black uppercase text-[8px] md:text-xs tracking-tighter md:tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                >
                    <ArrowLeft size={12} className="md:w-4 md:h-4" />
                    <span>BACK <span className="hidden sm:inline">TO DASHBOARD</span></span>
                </button>

                <div className="flex items-center gap-1 md:gap-3 min-w-0">
                    <span className="shrink-0 bg-teal-50 text-teal-700 px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest border border-teal-100 flex items-center gap-0.5">
                        <CheckCircle size={10} className="md:w-3 md:h-3" /> GENERATED
                    </span>
                    <p className="text-gray-400 dark:text-gray-500 text-[8px] md:text-xs font-bold truncate max-w-[70px] sm:max-w-none">
                        <span className="hidden md:inline">Filesystem / Invoices / </span>{bill.invoiceId}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* Actions Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 md:sticky md:top-24">
                        <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-0.5">Actions</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 md:mb-6">Manage Document</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                            <label className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-600 cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 transition-all select-none">
                                <input
                                    type="checkbox"
                                    checked={printWithHeader}
                                    onChange={(e) => setPrintWithHeader(e.target.checked)}
                                    className="cursor-pointer w-4 h-4 accent-teal-600"
                                />
                                <span>Header & Footer</span>
                            </label>

                            <button
                                onClick={() => handlePrint()}
                                className="w-full flex items-center justify-between p-3.5 md:p-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 group transition-all active:scale-[0.98] shadow-md shadow-teal-500/10"
                            >
                                <span className="flex items-center gap-3">
                                    <Printer size={18} className="md:w-5 md:h-5" /> <span className="uppercase text-[10px] md:text-xs tracking-wider">Print Invoice</span>
                                </span>
                            </button>

                            <button
                                onClick={() => router.push(getPath('/pharmacy/dashboard'))}
                                className="w-full flex items-center justify-between p-3.5 md:p-4 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 group transition-all active:scale-[0.98]"
                            >
                                <span className="flex items-center gap-3">
                                    <ArrowLeft size={18} className="md:w-5 md:h-5" /> <span className="uppercase text-[10px] md:text-xs tracking-wider">Dashboard</span>
                                </span>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">MetaData</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Date</span>
                                    <span className="text-gray-900 dark:text-white font-mono">{new Date(bill.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Total</span>
                                    <span className="text-gray-900 dark:text-white font-mono">₹{bill.paymentSummary.grandTotal}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-bold">Items</span>
                                    <span className="text-gray-900 dark:text-white font-mono">{bill.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-9">
                    <div className="bg-gray-200/50 dark:bg-gray-900/50 rounded-3xl p-2 md:p-12 flex justify-start md:justify-center items-start min-h-[800px] overflow-x-auto shadow-inner border border-gray-200 dark:border-gray-800">
                        <div className="shadow-2xl hover:scale-[1.005] origin-top">
                            <div ref={componentRef} style={{ width: '210mm', minHeight: '297mm', background: '#ffffff' }}>
                                <PharmacyBillPrint billData={bill} shopDetails={shopDetails} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewPage;
