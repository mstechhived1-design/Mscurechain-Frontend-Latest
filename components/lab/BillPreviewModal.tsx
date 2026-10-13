'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Printer, X, Eye, LayoutTemplate } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { usePrintStore } from '@/stores/printStore';
import BillPrintView from './BillPrintView';
import { BillPayload } from '@/lib/integrations/types/labBilling';
import { WhatsAppSendButton, WhatsAppSendButtonHandle, READ_MORE, WA_DIVIDER } from '@/components/WhatsApp/WhatsAppSendButton';
import { useParams } from 'next/navigation';

interface BillPreviewModalProps {
    isOpen: boolean;
    billData: Partial<BillPayload> & {
        patientDetails: BillPayload['patientDetails'];
        items: BillPayload['items'];
        totalAmount: number;
        discount: number;
        finalAmount: number;
        paidAmount: number;
        balance: number;
        paymentMode: BillPayload['paymentMode'];
    };
    patientType?: 'opd' | 'ipd' | 'lab';
    invoiceId?: string;
    hospitalId?: string;
    onPrint: () => void;   // Called when user clicks Print — saves + prints
    onClose: () => void;   // Called when user dismisses without printing
    loading?: boolean;
}

const BillPreviewModal: React.FC<BillPreviewModalProps> = ({
    isOpen,
    billData,
    patientType,
    invoiceId,
    hospitalId,
    onPrint,
    onClose,
    loading = false,
}) => {
    const params = useParams() as any;
    const resolvedHospitalId = hospitalId || params?.hospitalId || '';
    const { printWithHeader, setPrintWithHeader } = usePrintStore();
    const printRef = useRef<HTMLDivElement>(null);
    const whatsAppButtonRef = useRef<WhatsAppSendButtonHandle>(null);
    const [isAutoSendingWhatsApp, setIsAutoSendingWhatsApp] = useState(false);

    const [triggerWhatsApp, setTriggerWhatsApp] = useState(false);
    const [autoWhatsApp, setAutoWhatsApp] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('msc_auto_whatsapp') === 'true';
        }
        return false;
    });

    const handleToggleAutoWhatsApp = (val: boolean) => {
        setAutoWhatsApp(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('msc_auto_whatsapp', String(val));
        }
    };

    const patientPhone = useMemo(() => {
        const pd = billData?.patientDetails as any;
        return (
            pd?.mobile ||
            pd?.phone ||
            (billData as any)?.labClient?.mobile ||
            (billData as any)?.mobile ||
            (billData as any)?.phone ||
            ''
        );
    }, [billData]);

    const labInvoiceCaption = useMemo(() => {
        const pd = billData.patientDetails as any;
        const pName = pd?.name || 'Valued Patient';
        const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
        const getValidMrn = (val?: any) => (val && typeof val === 'string' && !isMongoId(val)) ? val : null;
        const mrn = getValidMrn(pd?.mrn) || getValidMrn(pd?.patientId) || 'N/A';
        const docName = pd?.refDoctor ? (pd.refDoctor.startsWith('Dr.') ? pd.refDoctor : `Dr. ${pd.refDoctor}`) : 'Consulting Specialist';
        const invId = invoiceId || 'WLK-PREVIEW';
        const dateStr = new Date().toLocaleDateString('en-GB');
        const totalAmt = billData.finalAmount ?? billData.totalAmount ?? 0;
        const pMode = billData.paymentMode || 'UPI';
        const itemsCount = billData.items?.length || 0;
        const hospName = 'MEDI LAB LABORATORY';

        return `*${hospName.toUpperCase()}*
${WA_DIVIDER}
*DIAGNOSTIC LAB INVOICE & RECEIPT*

*Patient Name:* ${pName}
*MRN / Token ID:* ${mrn}
*Ref. Doctor:* ${docName}
*Invoice No:* ${invId}
*Invoice Date:* ${dateStr}
*Tests Included:* ${itemsCount} Test(s)
*Payment Mode:* ${String(pMode).toUpperCase()}
*Total Amount:* ₹${totalAmt} (PAID)
${WA_DIVIDER}
${READ_MORE}
*Important Patient Instructions:*
• Find your official diagnostic laboratory tax invoice PDF attached above.
• Present this receipt at the Sample Collection Desk.
• You will receive your official test report once analysis is complete.
• Contact ${hospName} Helpdesk for any queries.

Thank you for choosing ${hospName}. Stay Healthy.`;
    }, [billData, invoiceId]);

    const handlePrintAndSave = async () => {
        if (autoWhatsApp && whatsAppButtonRef.current && patientPhone && patientPhone.replace(/\D/g, '').length >= 10) {
            setIsAutoSendingWhatsApp(true);
            try {
                await whatsAppButtonRef.current.send();
            } catch (err) {
                console.warn('[Auto WhatsApp] Failed before printing:', err);
            } finally {
                setIsAutoSendingWhatsApp(false);
            }
        }
        onPrint();
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: invoiceId ? `Invoice_${invoiceId}` : 'Invoice_Preview',
        onAfterPrint: () => {
            // Notify parent that print happened
        },
    });

    if (!isOpen) return null;

    const modeLabel = patientType === 'ipd' ? 'IPD' :
        patientType === 'lab' ? 'Lab-to-Lab' : 'OPD';

    const modeColors = patientType === 'ipd'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : patientType === 'lab'
                ? 'bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200';

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-4 px-2"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 my-auto animate-in fade-in zoom-in-95 duration-200">

                {/* ── Modal Header / Controls Bar ── */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl">

                    {/* Left: Cancel */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all"
                    >
                        <X size={14} />
                        Cancel
                    </button>

                    {/* Center: Title + type badge + header toggle */}
                    <div className="flex items-center gap-2 flex-1 justify-center">
                        <Eye size={15} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Invoice Preview</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${modeColors}`}>
                            {modeLabel}
                        </span>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
                        {/* Header / Footer Toggle */}
                        <button
                            type="button"
                            onClick={() => setPrintWithHeader(!printWithHeader)}
                            title={printWithHeader ? 'Hide header & footer' : 'Show header & footer'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                printWithHeader
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <LayoutTemplate size={13} />
                            {printWithHeader ? 'Header ON' : 'Header OFF'}
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <WhatsAppSendButton
                            ref={whatsAppButtonRef}
                            hospitalId={resolvedHospitalId}
                            department="lab"
                            targetRef={printRef}
                            phoneNumber={patientPhone}
                            documentName={`Invoice_${invoiceId || 'Lab'}.pdf`}
                            caption={labInvoiceCaption}
                            autoSend={autoWhatsApp}
                            onAutoSendChange={handleToggleAutoWhatsApp}
                            triggerSend={triggerWhatsApp}
                            className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs text-xs uppercase tracking-wider"
                        />
                        <button
                            type="button"
                            onClick={handlePrintAndSave}
                            disabled={loading || isAutoSendingWhatsApp}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white border border-indigo-600 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
                        >
                            {loading || isAutoSendingWhatsApp ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Printer size={13} />
                            )}
                            {loading ? 'Saving...' : isAutoSendingWhatsApp ? 'Sending WA...' : 'Print & Save'}
                        </button>
                    </div>
                </div>

                {/* ── Preview Body ── */}
                <div className="p-4 bg-gray-100 dark:bg-gray-950 rounded-b-2xl min-h-[70vh] overflow-y-auto">
                    {/* Scale wrapper — shows A4-ish paper feel */}
                    {/* Hide the floating PrintSettingsToggle inside HeaderPrint — the modal bar already has the toggle */}
                    <style>{`.bill-preview-body .print-settings-toggle-wrapper { display: none !important; }`}</style>
                    <div className="bill-preview-body bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden mx-auto"
                         style={{ maxWidth: '794px' }}>
                        <div ref={printRef}>
                            <BillPrintView
                                billData={billData as BillPayload}
                                invoiceId={invoiceId}
                                patientType={patientType}
                            />
                        </div>
                    </div>

                    {/* Watermark notice */}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-3">
                        This is a preview. Click <strong>Print &amp; Save</strong> to generate and record the invoice.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BillPreviewModal;
