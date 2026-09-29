import React from 'react';
import { BillPayload } from '@/lib/integrations/types/labBilling';
import Image from 'next/image';
import { LabSettingsService, LabSettings } from '@/lib/integrations/services/labSettings.service';

import HeaderPrint from './HeaderPrint';
import FooterPrint from './FooterPrint';

interface BillPrintViewProps {
    billData: BillPayload;
    invoiceId?: string; // Optional because previews might not have it yet
    date?: string;
    patientType?: 'opd' | 'ipd' | 'lab';
}

// This component is designed to look like the reference image when printed
// It should be wrapped in a container that typically handles visibility (hidden on screen, visible on print)
// OR used in a modal that is then printed.

const BillPrintView: React.FC<BillPrintViewProps> = ({ billData, invoiceId, date, patientType }) => {
    const currentDate = date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveType = patientType || billData.patientType || 'opd';

    const invoiceLabel = effectiveType === 'ipd'
        ? 'IPD INVOICE'
        : effectiveType === 'lab'
            ? 'LAB-TO-LAB INVOICE'
            : 'OPD INVOICE';

    const invoiceLabelColor = effectiveType === 'ipd'
        ? '#1e3a8a'    // blue for inpatient
        : effectiveType === 'lab'
            ? '#6b21a8' // purple for lab-to-lab
            : '#000000'; // black for walk-in
    const [labSettings, setLabSettings] = React.useState<LabSettings>({
        name: 'MediLab Laboratory',
        address: 'Please set your lab address',
        phone: '0000000000',
        email: 'admin@medilab.com',
        gstin: '0000000000000000'
    });

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await LabSettingsService.getSettings();
                if (settings) {
                    setLabSettings(settings);
                }
            } catch (error) {
                console.error('Failed to load lab settings for invoice:', error);
                // Keep default values
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="p-6 bg-white text-black font-sans max-w-[210mm] mx-auto flex flex-col justify-between" id="printable-bill">
            <div className="w-full">
                {/* Header Component - Replaces static header */}
                <HeaderPrint />

                <div className="flex justify-center mb-3 relative">
                    <h2 className="text-base font-bold border-b-2 pb-1 uppercase absolute top-[-10px] bg-white px-2"
                        style={{ borderColor: invoiceLabelColor, color: invoiceLabelColor }}>
                        {invoiceLabel}
                    </h2>
                    <div className="w-full border-t border-black mt-3"></div>
                </div>


                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-0 border border-black mb-3">

                    {/* Invoice Info */}
                    <div className="border-r border-black p-3">
                        <h3 className="font-bold text-xs uppercase mb-3 text-black">INVOICE INFORMATION</h3>
                        <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
                            <span className="font-semibold text-black">Invoice ID:</span>
                            <span>{(() => {
                                if (!invoiceId) {
                                    return `${effectiveType === 'lab' ? 'L2L' : effectiveType === 'ipd' ? 'IPD' : 'WLK'}-PREVIEW`;
                                }
                                
                                // If it's already a properly formatted invoice (not a raw mongo ID)
                                if (invoiceId.length < 24 && invoiceId.includes('-')) {
                                    return invoiceId;
                                }

                                let cleanId = invoiceId;
                                if (invoiceId.length >= 24) {
                                    cleanId = invoiceId.slice(-6).toUpperCase();
                                } else {
                                    // Strip existing prefixes if we're going to re-prefix
                                    if (invoiceId.startsWith('REC')) cleanId = invoiceId.slice(3);
                                    if (invoiceId.startsWith('OPD-')) cleanId = invoiceId.slice(4);
                                }
                                
                                if (effectiveType === 'ipd') return `IPD-${cleanId}`;
                                if (effectiveType === 'lab') return `L2L-${cleanId}`;
                                return `ORDER-${cleanId}`; // Changed from WLK to ORDER as per user request
                            })()}</span>

                            <span className="font-semibold text-black">Date:</span>
                            <span>{currentDate}</span>
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="p-3">
                        <h3 className="font-bold text-xs uppercase mb-3 text-black">
                            {effectiveType === 'lab' ? 'LAB CLIENT INFORMATION' : 'PATIENT INFORMATION'}
                        </h3>
                        <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
                            {effectiveType === 'lab' ? (
                                <>
                                    <span className="font-semibold text-black">Name Lab:</span>
                                    <span>{billData.patientDetails.refDoctor || billData.patientDetails.name}</span>
                                    <span className="font-semibold text-black">Patient Name:</span>
                                    <span className="font-bold text-black">{billData.patientDetails.refDoctor ? billData.patientDetails.name : (billData.patientDetails.originalPatientName || 'N/A')}</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold text-black">Name:</span>
                                    <span>{billData.patientDetails.name}</span>
                                </>
                            )}

                            <span className="font-semibold text-black">Age / Gender:</span>
                            <span>
                                {(() => {
                                    const age = billData.patientDetails?.age;
                                    const gender = billData.patientDetails?.gender;
                                    const ageUnit = billData.patientDetails?.ageUnit || 'Years';

                                    const ageDisplay =
                                        age === undefined || age === null || String(age) === 'N/A' || String(age) === ''
                                            ? '-'
                                            : `${age} ${ageUnit}`;

                                    const genderDisplay = !gender ? '-' : gender;

                                    return `${ageDisplay} / ${genderDisplay}`;
                                })()}
                            </span>

                            <span className="font-semibold text-black">Mobile:</span>
                            <span>{billData.patientDetails.mobile}</span>

                            <span className="font-semibold text-black">Ref. Doctor:</span>
                            <span>{billData.patientDetails.refDoctor || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-black mb-2 text-xs">
                    <thead>
                        <tr className="bg-gray-200 text-black">
                            <th className="border border-black p-1.5 text-left w-16">S.No</th>
                            <th className="border border-black p-1.5 text-left">Test / Service</th>
                            <th className="border border-black p-1.5 text-right w-24">Price (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billData.items && billData.items.length > 0 ? (
                            billData.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-black p-1.5 text-center">{index + 1}</td>
                                    <td className="border border-black p-1.5 font-medium">{item.testName}</td>
                                    <td className="border border-black p-1.5 text-right font-bold">₹{item.price?.toFixed(2) || '0.00'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="border border-black p-4 text-center text-black">
                                    No tests/items in this invoice
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totals Section - Two Column Layout */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    {/* Left: Payment Summary */}
                    <div className="border border-black text-xs">
                        <div className="flex justify-between p-2 border-b border-black">
                            <span className="font-bold text-black">Payment Mode:</span>
                            <span>
                                {billData.paymentMode === 'Mixed' && billData.paymentDetails ? (
                                    <span className="font-semibold text-[10px]">
                                        Mixed (Cash: ₹{billData.paymentDetails.cash || 0}, Card: ₹{billData.paymentDetails.card || 0}, UPI: ₹{billData.paymentDetails.upi || 0})
                                    </span>
                                ) : (
                                    billData.paymentMode
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between p-2 border-b border-black">
                            <span className="font-bold text-black">Payment Status:</span>
                            <span className="font-bold">{billData.balance > 0 ? "Partially Paid" : "Fully Paid"}</span>
                        </div>

                        <div className="flex justify-between p-2 border-b border-black">
                            <span className="font-bold text-black">Bill Date:</span>
                            <span>{currentDate}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-200">
                            <span className="font-bold text-black">Bill Time:</span>
                            <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Right: Totals Box */}
                    <div className="border border-black text-xs">
                        {(() => {
                            const isAllSame = billData.totalAmount === billData.finalAmount && billData.finalAmount === billData.paidAmount;
                            if (isAllSame) {
                                return (
                                    <>
                                        <div className="flex justify-between p-2 border-b border-black">
                                            <span className="font-bold text-black">Total Amount:</span>
                                            <span className="font-bold">₹{billData.totalAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-gray-200">
                                            <span className="font-bold text-black">Balance Due:</span>
                                            <span className="font-bold text-right">₹{billData.balance.toFixed(2)}</span>
                                        </div>
                                    </>
                                );
                            } else {
                                return (
                                    <>
                                        <div className="flex justify-between p-2 border-b border-black">
                                            <span className="font-bold text-black">Total Amount:</span>
                                            <span className="font-bold">₹{billData.totalAmount.toFixed(2)}</span>
                                        </div>
                                        {billData.discount > 0 && (
                                            <div className="flex justify-between p-2 border-b border-black">
                                                <span className="font-bold text-black">Discount:</span>
                                                <span>- ₹{billData.discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between p-2 border-b border-black">
                                            <span className="font-bold text-black">Final Amount:</span>
                                            <span className="font-bold">₹{billData.finalAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between p-2 border-b border-black">
                                            <span className="font-bold text-black">Paid Amount:</span>
                                            <span className="font-bold">₹{billData.paidAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-gray-200">
                                            <span className="font-bold text-black">Balance Due:</span>
                                            <span className="font-bold text-right">₹{billData.balance.toFixed(2)}</span>
                                        </div>
                                    </>
                                );
                            }
                        })()}
                    </div>
                </div>
            </div>

            {/* Footer Component */}
            <FooterPrint />

            {/* Print Styles Injection */}
            <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #printable-bill, #printable-bill * {
                visibility: visible;
            }
            @page {
                size: A4;
                margin: 0;
            }
            #printable-bill {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 296mm !important;
                margin: 0 !important;
                padding: 15mm !important; /* Standard print padding */
                border: none !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                background-color: white !important;
            }
             /* Small fix to hide Next.js dev overlays if present */
            nextjs-portal, #__next-build-watcher {
                display: none !important;
            }
        }
      `}</style>
        </div>
    );
};

export default BillPrintView;
