import React from 'react';
import { format } from 'date-fns';
import MainHeader from '../printers/MainHeader';
import MainFooter from '../printers/MainFooter';

interface IPDLedgerDocumentProps {
    summary: any;
    hospitalDetails?: any;
    admission?: any;
}

const IPDLedgerDocument: React.FC<IPDLedgerDocumentProps> = ({ summary, hospitalDetails, admission }) => {
    // Determine components
    const patientName = admission?.patient?.name || summary?.patientName || "Unknown Patient";
    const admissionId = admission?.admissionId || summary?.admissionId || "N/A";
    const mrn = admission?.patientProfile?.mrn || admission?.patient?.mrn || summary?.mrn || "N/A";
    // Extract Age
    let age = admission?.patient?.age || admission?.patientProfile?.age || summary?.patientAge || '';
    if (!age && (admission?.patient?.dateOfBirth || admission?.patientProfile?.dateOfBirth)) {
        const dob = new Date(admission?.patient?.dateOfBirth || admission?.patientProfile?.dateOfBirth);
        const diff = Date.now() - dob.getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
    }
    const ageDisplay = age && !isNaN(Number(age)) ? `${age}Y` : age || 'N/A';
    const gender = admission?.patient?.gender || admission?.patientProfile?.gender || summary?.gender || '';
    const address = admission?.patientProfile?.address || 'N/A';
    const doctorName = admission?.primaryDoctor?.name || admission?.primaryDoctor?.user?.name || summary?.primaryDoctor?.name || 'N/A';
    const department = admission?.primaryDoctor?.department || 'General Medicine & Critical Care';
    
    // Extract items by category
    const extraItems = summary?.extraCharges?.items || [];
    const doctorCharges = extraItems.filter((i: any) => i.category === 'Doctor Fee' || i.category === 'Consultation');
    const labCharges = extraItems.filter((i: any) => i.category === 'Lab' || i.category === 'Diagnostics');
    const pharmaCharges = extraItems.filter((i: any) => i.category === 'Pharmacy' || i.category === 'Medicine');
    const otherCharges = extraItems.filter((i: any) => !['Doctor Fee', 'Consultation', 'Lab', 'Diagnostics', 'Pharmacy', 'Medicine'].includes(i.category));

    const bedItems = summary?.bedCharges?.items || [];
    const advanceItems = summary?.advances || [];

    const financials = summary?.financials || { totalAdvance: 0, balance: 0, discount: 0 };
    
    // Calculate Totals
    const doctorTotal = doctorCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const labTotal = labCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const pharmaTotal = pharmaCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const otherTotal = otherCharges.reduce((sum: number, item: any) => sum + (item.status === 'Reversed' ? 0 : item.amount), 0);
    const bedTotal = summary?.bedCharges?.total || 0;

    const totalCharges = doctorTotal + labTotal + pharmaTotal + otherTotal + bedTotal;
    const totalDeposits = financials.totalAdvance || 0;
    const discount = financials.discount || 0;
    const returnCredits = financials.returnCredits || 0;
    
    // Use the backend's exact balance if available, otherwise fallback to calculation
    const balanceDue = summary?.financials?.balance !== undefined ? summary.financials.balance : Math.max(0, totalCharges - returnCredits - discount - totalDeposits);
    const refundDue = balanceDue < 0 ? Math.abs(balanceDue) : 0;
    const displayBalance = Math.max(0, balanceDue);

    // Breakdown of Payments for Summary
    const admissionAdvance = advanceItems
        .filter((a: any) => a.isVirtual || a.description?.toLowerCase().includes("opening advance") || a.description?.toLowerCase().includes("admission fee"))
        .reduce((sum: number, a: any) => sum + (a.transactionType === 'Refund' ? -a.amount : a.amount), 0);

    const labPaid = advanceItems
        .filter((a: any) => a.description?.toLowerCase().includes("lab payment"))
        .reduce((sum: number, a: any) => sum + (a.transactionType === 'Refund' ? -a.amount : a.amount), 0);

    const pharmaPaid = advanceItems
        .filter((a: any) => a.description?.toLowerCase().includes("pharmacy payment"))
        .reduce((sum: number, a: any) => sum + (a.transactionType === 'Refund' ? -a.amount : a.amount), 0);

    const totalSettlement = financials.totalSettlement || 0;
    const otherAdvances = Math.max(0, totalDeposits - admissionAdvance - labPaid - pharmaPaid);

    return (
        <div className="print-block bg-white relative flex flex-col overflow-hidden text-[#1e293b] text-[11px] leading-relaxed mx-auto box-border" style={{
            width: '210mm',
            minHeight: '296mm',
            padding: '10mm 15mm 10mm 25mm'
        }}>
            {/* Universal Header */}
            <MainHeader
                initialDetails={{
                    name: hospitalDetails?.name || 'Hospital Name',
                    address: hospitalDetails?.address || 'Hospital Address',
                    phone: hospitalDetails?.phone || 'Phone Number',
                    email: hospitalDetails?.email || 'Email'
                }}
            />

            <div className="text-right mb-5">
                <h2 className="m-0 text-[18px] text-[#334155] uppercase tracking-[1px] font-bold">Inpatient Ledger</h2>
                <p className="mt-1 mb-0 text-[10px] text-[#64748b]">Printed on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>

            {/* Patient Details */}
            <div className="mb-5">
                <div className="text-[13px] font-extrabold text-[#0f172a] mb-3">Patient Details</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-10 text-[11px]">
                    {/* Left Column */}
                    <div className="flex flex-col gap-2">
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Patient Name :</span><span className="uppercase text-[#0f172a]">{patientName}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Age & Gender :</span><span className="uppercase text-[#0f172a]">{ageDisplay} {gender ? `& ${gender}` : ''}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Address :</span><span className="uppercase text-[#0f172a]">{address}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Doctor Name :</span><span className="uppercase text-[#0f172a]">{doctorName}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Department :</span><span className="uppercase text-[#0f172a]">{department}</span></div>
                    </div>
                    {/* Right Column */}
                    <div className="flex flex-col gap-2">
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Patient ID :</span><span className="uppercase text-[#0f172a]">{mrn}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Bill No :</span><span className="uppercase text-[#0f172a]">{admissionId}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Bill Date :</span><span className="uppercase text-[#0f172a]">{format(new Date(), 'dd/MM/yyyy hh:mm a')}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Admission No :</span><span className="uppercase text-[#0f172a]">{admissionId}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Admission Date :</span><span className="uppercase text-[#0f172a]">{summary?.admissionDate || admission?.admissionDate ? format(new Date(summary?.admissionDate || admission?.admissionDate), 'dd/MM/yyyy hh:mm a') : 'N/A'}</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Type :</span><span className="uppercase text-[#0f172a]">Cash</span></div>
                        <div className="flex"><span className="font-bold w-[120px] shrink-0 text-[#334155]">Discharge Date :</span><span className="uppercase text-[#0f172a]">{(summary?.status === 'Discharged' || admission?.status === 'Discharged') ? format(new Date(summary?.updatedAt || admission?.updatedAt || new Date()), 'dd/MM/yyyy hh:mm a') : ''}</span></div>
                    </div>
                </div>
            </div>

            {/* Admission & ICU Charges */}
            <div className="break-inside-avoid mb-6">
                <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mb-2 pb-1 border-b border-[#cbd5e1]">Admission & ICU Charges</div>
                {bedItems.length > 0 ? (
                    <>
                        <table className="w-full border-collapse mb-1 text-left">
                            <thead>
                                <tr>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Charge Type</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Rate</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-center">No of Days</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bedItems.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.type} {item.room ? `(${item.room})` : ''}</td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.rate.toLocaleString()}</td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-center">{item.readableDuration || Number(item.days || 1).toFixed(2)}</td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-right">{item.charge.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="text-center p-4 text-[#94a3b8] italic text-[10px] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-md">No admission & ICU charges recorded.</div>
                )}
            </div>

            {/* Doctor Charges */}
            <div className="break-inside-avoid mb-6">
                <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mb-2 pb-1 border-b border-[#cbd5e1]">Doctor Charges</div>
                {doctorCharges.length > 0 ? (
                    <>
                        <table className="w-full border-collapse mb-1 text-left">
                            <thead>
                                <tr>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Doctor Name</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Specialization</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {doctorCharges.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">
                                            <div className="font-semibold text-[#0f172a]">{doctorName}</div>
                                            {item.description && <div className="text-[9px] text-[#64748b]">{item.description}</div>}
                                        </td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{department}</td>
                                        <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626] line-through' : 'text-[#334155]'}`}>{item.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="text-center p-4 text-[#94a3b8] italic text-[10px] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-md">No doctor charges recorded.</div>
                )}
            </div>

            {/* Medication Charges */}
            <div className="break-inside-avoid mb-6">
                <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mb-2 pb-1 border-b border-[#cbd5e1]">Medication Charges</div>
                {pharmaCharges.length > 0 ? (
                    <>
                        <table className="w-full border-collapse mb-1 text-left">
                            <thead>
                                <tr>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Medicine Name</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Rate</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-center">Quantity</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pharmaCharges.map((item: any, idx: number) => {
                                    if (item.medicines && item.medicines.length > 0) {
                                        return item.medicines.map((med: any, mIdx: number) => (
                                            <tr key={`${idx}-${mIdx}`}>
                                                <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">
                                                    <div className="font-semibold text-[#0f172a]">{med.medicineName}</div>
                                                    <div className="text-[9px] text-[#64748b]">{item.description}</div>
                                                </td>
                                                <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{med.rate || ''}</td>
                                                <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-center">{med.quantity || 1}</td>
                                                <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626] line-through' : 'text-[#334155]'}`}>{med.amount || ''}</td>
                                            </tr>
                                        ));
                                    }
                                    return (
                                        <tr key={idx}>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.description}</td>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.rate || item.amount}</td>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-center">{item.quantity || 1}</td>
                                            <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626] line-through' : 'text-[#334155]'}`}>{item.amount.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="text-center p-4 text-[#94a3b8] italic text-[10px] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-md">No medication charges recorded.</div>
                )}
            </div>

            {/* Diagnostics & Lab Tests */}
            <div className="break-inside-avoid mb-6">
                <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mb-2 pb-1 border-b border-[#cbd5e1]">Diagnostics & Lab Tests</div>
                {labCharges.length > 0 ? (
                    <>
                        <table className="w-full border-collapse mb-1 text-left">
                            <thead>
                                <tr>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Test Name</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Rate</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-center">Quantity</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {labCharges.map((item: any, idx: number) => {
                                    if (item.tests && item.tests.length > 0) {
                                        return item.tests.map((rawTest: any, tIdx: number) => {
                                            const testName = typeof rawTest === 'object'
                                                ? (rawTest?.testName || rawTest?.name || 'Lab Test')
                                                : (String(rawTest).trim() === '[object Object]' ? 'Lab Test' : String(rawTest));
                                            const itemDesc = typeof item.description === 'string' && item.description.trim() !== '[object Object]'
                                                ? item.description
                                                : '';
                                            return (
                                                <tr key={`${idx}-${tIdx}`}>
                                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">
                                                        <div className="font-semibold text-[#0f172a]">{testName}</div>
                                                        {itemDesc && <div className="text-[9px] text-[#64748b]">{itemDesc}</div>}
                                                    </td>
                                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{tIdx === 0 ? (item.rate || item.amount) : ''}</td>
                                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-center">1</td>
                                                    <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626] line-through' : 'text-[#334155]'}`}>{tIdx === 0 ? item.amount?.toLocaleString() : ''}</td>
                                                </tr>
                                            );
                                        });
                                    }
                                    const itemDesc = typeof item.description === 'string' && item.description.trim() !== '[object Object]'
                                        ? item.description
                                        : (typeof item.description === 'object' ? (item.description.testName || item.description.name || 'Lab Test') : 'Lab Test');
                                    return (
                                        <tr key={idx}>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{itemDesc}</td>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.rate || item.amount}</td>
                                            <td className="p-2 border-b border-[#e2e8f0] text-[#334155] text-center">{item.quantity || 1}</td>
                                            <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626] line-through' : 'text-[#334155]'}`}>{item.amount?.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="text-center p-4 text-[#94a3b8] italic text-[10px] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-md">No diagnostic charges recorded.</div>
                )}
            </div>

            {/* Other Charges */}
            {otherCharges.length > 0 && (
                <div className="break-inside-avoid">
                    <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mt-5 mb-2 pb-1 border-b border-[#cbd5e1]">Other Miscellaneous Charges</div>
                    <table className="w-full border-collapse mb-1 text-left">
                        <thead>
                            <tr>
                                <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Date</th>
                                <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Category</th>
                                <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Description</th>
                                <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Status</th>
                                <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {otherCharges.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{format(new Date(item.date), 'dd MMM yyyy')}</td>
                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.category}</td>
                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.description}</td>
                                    <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">
                                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[8px] uppercase ${item.status === 'Reversed' ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] line-through' : 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'}`}>{item.status}</span>
                                    </td>
                                    <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.status === 'Reversed' ? 'text-[#dc2626]' : 'text-[#334155]'}`}>{item.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-right text-[11px] font-bold p-2 text-[#0f172a]">Other Charges Total: ₹ {otherTotal.toLocaleString()}</div>
                </div>
            )}

            {/* Net Payments */}
            <div className="break-inside-avoid mb-6">
                <div className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-[0.5px] mb-2 pb-1 border-b border-[#cbd5e1]">Payment & Receipts History</div>
                {advanceItems.length > 0 ? (
                    <>
                        <table className="w-full border-collapse mb-1 text-left">
                            <thead>
                                <tr>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Transaction ID / Receipt No</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Description</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0]">Payment Mode</th>
                                    <th className="bg-[#f1f5f9] text-[9px] uppercase tracking-[0.5px] text-[#475569] font-bold p-2 border-b border-[#e2e8f0] text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advanceItems.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.reference || item.transactionId || item._id}</td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.description || 'General Payment'}</td>
                                        <td className="p-2 border-b border-[#e2e8f0] text-[#334155]">{item.mode}</td>
                                        <td className={`p-2 border-b border-[#e2e8f0] text-right ${item.transactionType === 'Refund' ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
                                            {item.transactionType === 'Refund' ? '-' : ''} {item.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="text-center p-4 text-[#94a3b8] italic text-[10px] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-md">No payments recorded.</div>
                )}
            </div>

            {/* Summary Section */}
            <div className="mt-8 flex justify-end break-inside-avoid">
                <div className="w-[300px] border border-[#cbd5e1] rounded-lg overflow-hidden">
                    <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                        <span className="text-[#475569] font-semibold">Total Clinical Charges</span>
                        <span className="text-[#0f172a] font-bold">₹ {totalCharges.toLocaleString()}</span>
                    </div>
                    {returnCredits > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Return Credits</span>
                            <span className="text-[#dc2626] font-bold">₹ {returnCredits.toLocaleString()}</span>
                        </div>
                    )}
                    {discount > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Discount Amount</span>
                            <span className="text-[#dc2626] font-bold">₹ {discount.toLocaleString()}</span>
                        </div>
                    )}
                    {admissionAdvance > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Advance at Admission</span>
                            <span className="text-[#059669] font-bold">₹ {admissionAdvance.toLocaleString()}</span>
                        </div>
                    )}
                    {labPaid > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Lab Counter Payments</span>
                            <span className="text-[#059669] font-bold">₹ {labPaid.toLocaleString()}</span>
                        </div>
                    )}
                    {pharmaPaid > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Pharmacy Counter Payments</span>
                            <span className="text-[#059669] font-bold">₹ {pharmaPaid.toLocaleString()}</span>
                        </div>
                    )}
                    {otherAdvances > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Other Advances</span>
                            <span className="text-[#059669] font-bold">₹ {otherAdvances.toLocaleString()}</span>
                        </div>
                    )}
                    {totalSettlement > 0 && (
                        <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Final Settlement Paid</span>
                            <span className="text-[#059669] font-bold">₹ {totalSettlement.toLocaleString()}</span>
                        </div>
                    )}
                    {totalSettlement === 0 && otherAdvances === 0 && labPaid === 0 && pharmaPaid === 0 && admissionAdvance === 0 && (
                         <div className="flex justify-between p-2.5 border-b border-[#e2e8f0] text-[11px]">
                            <span className="text-[#475569] font-semibold">(-) Total Paid</span>
                            <span className="text-[#059669] font-bold">₹ {totalDeposits.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between p-2.5 bg-[#f8fafc] text-[14px]">
                        <span className="font-black text-[#0f172a]">Final Balance Amount</span>
                        <span className={`font-black ${displayBalance > 0 ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
                            ₹ {displayBalance > 0 ? displayBalance.toLocaleString() : refundDue > 0 ? refundDue.toLocaleString() + ' (Refund)' : '0 (Settled)'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Universal Footer */}
            <div className="mt-auto pt-8">
                <MainFooter
                    initialDetails={{
                        name: hospitalDetails?.name || 'Hospital Name',
                        address: hospitalDetails?.address || 'Hospital Address',
                        phone: hospitalDetails?.phone || 'Phone Number',
                        email: hospitalDetails?.email || 'Email'
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(IPDLedgerDocument);
